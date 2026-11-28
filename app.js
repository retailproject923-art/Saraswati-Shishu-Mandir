const SUPABASE_URL="https://gnyhushvxqquvxepkinw.supabase.co";
const SUPABASE_KEY="sb_publishable_lrP4onruHeKnZwgkeBjUPg_Yk3ik6-7";
const client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=id=>document.getElementById(id);
$("year").textContent=new Date().getFullYear();
let currentAds=[],adIndex=0,slideTimer=null,editingId=null;
const cachedAds=()=>{try{return JSON.parse(localStorage.getItem("school_ads_cache")||"[]")}catch{return []}};
function renderAds(ads){currentAds=ads||[];const section=$("adsSection"),slider=$("adSlider"),dots=$("adDots");if(!currentAds.length){section.classList.add("hidden");return}section.classList.remove("hidden");adIndex=0;showAd();dots.innerHTML=currentAds.map((_,i)=>`<span class="${i===0?"active":""}"></span>`).join("");}
function showAd(){if(!currentAds.length)return;const a=currentAds[adIndex];$("adSlider").innerHTML=`<article class="ad-card"><img src="${escapeAttr(a.image_path)}" alt="${escapeAttr(a.title)}" loading="lazy"><div class="ad-copy"><h3>${escapeHtml(a.title)}</h3><p>${escapeHtml(a.message||"")}</p>${a.target_url?'<a class="primary" rel="noopener" target="_blank" href="'+escapeAttr(a.target_url)+'">अधिक जानें</a>':""}</div></article>`;[...$("adDots").children].forEach((d,i)=>d.classList.toggle("active",i===adIndex));clearTimeout(slideTimer);slideTimer=setTimeout(()=>{adIndex=(adIndex+1)%currentAds.length;showAd()},Math.max(3,Number(a.duration_seconds)||5)*1000);}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}const escapeAttr=escapeHtml;
async function loadAds(){if(!client){renderAds(cachedAds());return}try{const {data,error}=await client.from("app_advertisements").select("id,title,message,image_path,target_url,display_order,duration_seconds,is_active,starts_at,ends_at").eq("is_active",true).order("display_order");if(error)throw error;const now=Date.now();const valid=(data||[]).filter(a=>(!a.starts_at||new Date(a.starts_at).getTime()<=now)&&(!a.ends_at||new Date(a.ends_at).getTime()>=now));localStorage.setItem("school_ads_cache",JSON.stringify(valid));renderAds(valid)}catch(e){console.warn("Ads offline/unavailable",e);renderAds(cachedAds())}}
async function openAdmin(){if(!client){alert("लॉगिन सेवा अभी उपलब्ध नहीं है।");return}const {data:{session}}=await client.auth.getSession();if(!session){$("loginDialog").showModal();return}await showAdmin(session)}
async function showAdmin(session){const {data:profile,error}=await client.from("profiles").select("full_name,role,is_active").eq("id",session.user.id).single();if(error||!profile||!profile.is_active){$("loginStatus").textContent="यह अकाउंट सक्रिय नहीं है।";await client.auth.signOut();return}if(profile.role==="parent"){await openStorePage();return}if(!["owner","principal","management"].includes(profile.role)){$("roleDashboardTitle").textContent=profile.full_name||"विद्यालय यूजर";$("roleDashboardRole").textContent="आपकी भूमिका: "+profile.role;$("roleDashboard").classList.remove("hidden");$("roleDashboard").scrollIntoView({behavior:"smooth"});return} $("adminPanel").classList.remove("hidden");$("adminPanel").scrollIntoView({behavior:"smooth"});loadAdminAds();loadPaymentAccountsAdmin();loadProductsAdmin();loadStoreOrdersAdmin();loadSchoolUsers();loadFeesAdmin()}

async function loadSchoolUsers(){
 const host=$("schoolUserList");if(!host||!client)return;
 const {data,error}=await client.from("profiles").select("id,full_name,phone,login_id,role,is_active,created_at").order("created_at",{ascending:false}).limit(150);
 if(error){host.textContent="यूजर सूची नहीं खुली: "+error.message;return}
 host.innerHTML=(data||[]).map(u=>'<div class="admin-record"><b>'+escapeHtml(u.full_name||"नाम नहीं")+'</b> — '+escapeHtml(u.role)+'<small>User ID: '+escapeHtml(u.login_id||"—")+' | फोन: '+escapeHtml(u.phone||"—")+' | स्थिति: '+(u.is_active?"Active":"Pending/Blocked")+'</small>'+((["owner","principal"].includes(u.role))?"":'<div class="record-actions"><button class="outline" data-user-toggle="'+u.id+'" data-active="'+u.is_active+'">'+(u.is_active?"लॉगिन बंद करें":"अप्रूव / चालू करें")+'</button></div>')+'</div>').join("")||"अभी कोई यूजर रिकॉर्ड नहीं है।";
}
$("schoolUserList")?.addEventListener("click",async e=>{
 const id=e.target.dataset.userToggle;if(!id)return;
 const active=e.target.dataset.active==="true";
 const {error}=await client.from("profiles").update({is_active:!active}).eq("id",id);
 $("schoolUserStatus").textContent=error?"स्थिति नहीं बदली: "+error.message:"यूजर स्थिति अपडेट हो गई。";
 loadSchoolUsers();
});
$("schoolUserForm")?.addEventListener("submit",async e=>{
 e.preventDefault();const status=$("schoolUserStatus");status.textContent="अकाउंट बनाया जा रहा है…";
 const {data:{session}}=await client.auth.getSession();if(!session){status.textContent="पहले Management लॉगिन करें।";return}
 let phone=$("newUserPhone").value.trim().replace(/[\s()-]/g,"");if(/^\d{10}$/.test(phone))phone="+91"+phone;
 try{
  const response=await fetch("/api/school-users",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({action:"create",full_name:$("newUserName").value.trim(),phone,login_id:$("newUserLoginId").value.trim(),password:$("newUserPassword").value,role:$("newUserRole").value})});
  const data=await response.json();if(!response.ok)throw new Error(data.error||"अकाउंट नहीं बना।");
  status.textContent="अकाउंट सक्रिय हो गया। User ID: "+data.user_id+" | फोन: "+data.phone;
  $("schoolUserForm").reset();loadSchoolUsers();
 }catch(error){status.textContent=error.message}
});
async function loadClassAndStudentManagement(){
 const classes=await client.from("classes").select("id,class_name,section,academic_year").order("class_name");
 const classSelect=$("newStudentClass");
 if(classSelect)classSelect.innerHTML='<option value="">कक्षा चुनें</option>'+(classes.data||[]).map(c=>'<option value="'+c.id+'">'+escapeHtml(c.class_name)+' - '+escapeHtml(c.section)+'</option>').join("");
 const list=$("classManagementList");
 if(list)list.innerHTML=(classes.data||[]).map(c=>'<div class="admin-record"><b>'+escapeHtml(c.class_name)+' - '+escapeHtml(c.section)+'</b><small>'+escapeHtml(c.academic_year)+'</small></div>').join("")||"अभी कक्षा नहीं जोड़ी गई है।";
 const students=await client.from("students").select("id,student_name,admission_no,parent_name,parent_phone,classes(class_name,section)").eq("is_active",true).order("student_name");
 const sh=$("studentManagementList");
 if(sh)sh.innerHTML=(students.data||[]).map(s=>'<div class="admin-record"><b>'+escapeHtml(s.student_name)+'</b><small>'+escapeHtml(s.admission_no)+' | '+escapeHtml(s.classes?.class_name||"कक्षा तय नहीं")+' | '+escapeHtml(s.parent_name||"")+' | '+escapeHtml(s.parent_phone||"")+'</small></div>').join("")||"अभी विद्यार्थी नहीं जोड़े गए हैं।";
}
$("classManagementForm")?.addEventListener("submit",async e=>{
 e.preventDefault();const status=$("classManagementStatus");status.textContent="कक्षा सेव हो रही है…";
 const payload={class_name:$("newClassName").value.trim(),section:$("newClassSection").value.trim()||"A",academic_year:$("newClassYear").value.trim()};
 const {error}=await client.from("classes").insert(payload);
 status.textContent=error?"कक्षा सेव नहीं हुई: "+error.message:"कक्षा सेव हो गई।";
 if(!error){e.target.reset();$("newClassSection").value="A";$("newClassYear").value="2026-27";loadClassAndStudentManagement()}
});
$("studentManagementForm")?.addEventListener("submit",async e=>{
 e.preventDefault();const status=$("studentManagementStatus");status.textContent="विद्यार्थी सेव हो रहा है…";
 const payload={student_name:$("newStudentName").value.trim(),admission_no:$("newStudentAdmission").value.trim(),class_id:$("newStudentClass").value,parent_name:$("newStudentParent").value.trim()||null,parent_phone:$("newStudentPhone").value.trim()||null,address:$("newStudentAddress").value.trim()||null,is_active:true};
 const {error}=await client.from("students").insert(payload);
 status.textContent=error?"विद्यार्थी सेव नहीं हुआ: "+error.message:"विद्यार्थी सेव हो गया।";
 if(!error){e.target.reset();loadClassAndStudentManagement();loadFeesAdmin()}
});
async function loadFeesAdmin(){
 if(!client)return;
 await loadClassAndStudentManagement();
 const [rates,students]=await Promise.all([
  client.from("fee_class_rates").select("*").order("class_name"),
  client.from("students").select("id,student_name,admission_no,class_id,classes(class_name,section)").eq("is_active",true).order("student_name")
 ]);
 if(rates.error)$("feeRateList").textContent="कक्षा फीस नहीं खुली: "+rates.error.message;
 else $("feeRateList").innerHTML=(rates.data||[]).map(r=>'<div class="admin-record"><b>'+escapeHtml(r.class_name)+' — '+escapeHtml(r.academic_year)+'</b><small>Admission ₹'+Number(r.admission_fee).toFixed(2)+' | Monthly ₹'+Number(r.monthly_fee).toFixed(2)+' | Annual ₹'+Number(r.annual_fee).toFixed(2)+' | Other ₹'+Number(r.other_fee).toFixed(2)+'</small><small>'+escapeHtml(r.notes||"")+'</small></div>').join("")||"अभी कक्षा फीस दर्ज नहीं है।";
 const select=$("feeStudent");
 if(students.error){select.innerHTML='<option value="">विद्यार्थी सूची नहीं खुली</option>'}
 else select.innerHTML='<option value="">विद्यार्थी चुनें</option>'+(students.data||[]).map(s=>'<option value="'+s.id+'">'+escapeHtml(s.student_name)+' — '+escapeHtml(s.admission_no)+' — '+escapeHtml(s.classes?.class_name||"कक्षा तय नहीं")+'</option>').join("");
 await loadStudentFeeCards();
}
$("feeRateForm")?.addEventListener("submit",async e=>{
 e.preventDefault();const status=$("feeRateStatus");status.textContent="फीस सेव हो रही है…";
 const name=$("feeClassName").value.trim(),year=$("feeAcademicYear").value.trim();
 const {data:userData}=await client.auth.getUser();
 const payload={class_name:name,academic_year:year,admission_fee:Number($("feeAdmission").value)||0,monthly_fee:Number($("feeMonthly").value)||0,annual_fee:Number($("feeAnnual").value)||0,other_fee:Number($("feeOther").value)||0,notes:$("feeNotes").value.trim()||null,created_by:userData.user?.id};
 const {data:existing,error:findError}=await client.from("fee_class_rates").select("id").ilike("class_name",name).eq("academic_year",year).maybeSingle();
 if(findError){status.textContent="जाँच नहीं हुई: "+findError.message;return}
 const result=existing?await client.from("fee_class_rates").update(payload).eq("id",existing.id):await client.from("fee_class_rates").insert(payload);
 status.textContent=result.error?"फीस सेव नहीं हुई: "+result.error.message:"कक्षा की फीस सेव हो गई।";
 if(!result.error){e.target.reset();$("feeAcademicYear").value="2026-27";["feeAdmission","feeMonthly","feeAnnual","feeOther"].forEach(id=>$(id).value="0");loadFeesAdmin()}
});
$("studentFeeForm")?.addEventListener("submit",async e=>{
 e.preventDefault();const status=$("studentFeeStatus");const studentId=$("feeStudent").value;if(!studentId){status.textContent="विद्यार्थी चुनें।";return}
 status.textContent="फीस कार्ड बनाया जा रहा है…";
 const payload={student_id:studentId,invoice_no:"SSM-"+Date.now(),fee_month:$("feeInvoiceMonth").value,amount:Number($("feeInvoiceAmount").value),due_date:$("feeDueDate").value||null,status:"pending",description:$("feeInvoiceNote").value.trim()||null};
 const {error}=await client.from("fee_invoices").insert(payload);
 status.textContent=error?"फीस कार्ड नहीं बना: "+error.message:"बच्चे का फीस कार्ड बन गया।";
 if(!error){e.target.reset();loadStudentFeeCards()}
});
async function loadStudentFeeCards(){
 const host=$("studentFeeCards");if(!host)return;
 const {data,error}=await client.from("fee_invoices").select("id,invoice_no,fee_month,amount,due_date,status,description,students(student_name,admission_no,classes(class_name,section)),fee_payments(amount,payment_status)").order("fee_month",{ascending:false}).limit(200);
 if(error){host.textContent="फीस कार्ड नहीं खुले: "+error.message;return}
 host.innerHTML=(data||[]).map(i=>{
  const paid=(i.fee_payments||[]).filter(p=>p.payment_status==="verified").reduce((n,p)=>n+Number(p.amount),0),due=Math.max(0,Number(i.amount)-paid);
  const payControls=due>0?'<div class="record-actions"><input type="number" min="1" max="'+due+'" step="0.01" placeholder="जमा रकम ₹" id="pay-'+i.id+'" style="max-width:140px"><select id="mode-'+i.id+'" style="max-width:130px"><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank">Bank</option></select><button class="outline" data-fee-pay="'+i.id+'" data-total="'+i.amount+'">भुगतान दर्ज करें</button></div>':"";
  return '<div class="admin-record"><b>'+escapeHtml(i.students?.student_name||"विद्यार्थी")+' — '+escapeHtml(i.students?.admission_no||"")+'</b><small>'+escapeHtml(i.students?.classes?.class_name||"कक्षा")+' | '+escapeHtml(i.description||i.invoice_no)+' | तारीख: '+escapeHtml(i.fee_month)+'</small><small>कुल फीस ₹'+Number(i.amount).toFixed(2)+' | जमा ₹'+paid.toFixed(2)+' | बाकी ₹'+due.toFixed(2)+' | स्थिति: '+(due===0?"Paid":paid>0?"Partial":"Pending")+'</small>'+payControls+'</div>';
 }).join("")||"अभी कोई फीस कार्ड नहीं बना है।";
}
$("studentFeeCards")?.addEventListener("click",async e=>{
 const id=e.target.dataset.feePay;if(!id)return;
 const amount=Number($("pay-"+id)?.value),mode=$("mode-"+id)?.value||"cash";if(!(amount>0)){alert("जमा रकम भरें।");return}
 const {error}=await client.from("fee_payments").insert({invoice_id:id,amount,payment_mode:mode,payment_status:"verified",paid_at:new Date().toISOString()});
 if(error){alert("भुगतान दर्ज नहीं हुआ: "+error.message);return}
 const {data:payments}=await client.from("fee_payments").select("amount,payment_status").eq("invoice_id",id);
 const paid=(payments||[]).filter(p=>p.payment_status==="verified").reduce((n,p)=>n+Number(p.amount),0);
 const total=Number(e.target.dataset.total||0);
 await client.from("fee_invoices").update({status:paid>=total?"paid":paid>0?"partial":"pending"}).eq("id",id);
 loadStudentFeeCards();
});

async function loadAdminAds(){const {data,error}=await client.from("app_advertisements").select("*").order("display_order");$("adminAds").innerHTML=error?"विज्ञापन सूची लोड नहीं हुई।":(data||[]).map(a=>`<div class="ad-row"><b>${escapeHtml(a.title)}</b> — ${a.is_active?"प्रकाशित":"बंद"} <button class="outline" data-edit="${a.id}">बदलें</button> <button class="outline" data-toggle="${a.id}" data-active="${a.is_active}">${a.is_active?"बंद करें":"चालू करें"}</button></div>`).join("");}
$("adminAds").addEventListener("click",async e=>{const edit=e.target.dataset.edit,toggle=e.target.dataset.toggle;if(edit){const {data}=await client.from("app_advertisements").select("*").eq("id",edit).single();if(data){editingId=data.id;$("adTitle").value=data.title;$("adMessage").value=data.message||"";$("adImage").value=data.image_path;$("adTarget").value=data.target_url||"";$("adOrder").value=data.display_order;$("adDuration").value=data.duration_seconds;$("adActive").checked=data.is_active;$("adForm").scrollIntoView({behavior:"smooth"})}}if(toggle){const active=e.target.dataset.active==="true";const {error}=await client.from("app_advertisements").update({is_active:!active}).eq("id",toggle);$("adminStatus").textContent=error?error.message:"स्थिति अपडेट हो गई।";loadAdminAds();loadAds()}});
$("adForm").addEventListener("submit",async e=>{e.preventDefault();const payload={title:$("adTitle").value.trim(),message:$("adMessage").value.trim(),image_path:$("adImage").value.trim(),target_url:$("adTarget").value.trim()||null,display_order:Number($("adOrder").value)||0,duration_seconds:Math.min(30,Math.max(3,Number($("adDuration").value)||5)),is_active:$("adActive").checked};let q=editingId?client.from("app_advertisements").update(payload).eq("id",editingId):client.from("app_advertisements").insert(payload);const {error}=await q;$("adminStatus").textContent=error?"सेव नहीं हुआ: "+error.message:"विज्ञापन सेव हो गया।";if(!error){e.target.reset();editingId=null;$("adDuration").value=5;loadAdminAds();loadAds()}});
$("loginOpen").addEventListener("click",openAdmin);$("closeLogin").addEventListener("click",()=>$("loginDialog").close());
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginStatus").textContent="जाँच हो रही है…";const login=$("loginEmail").value.trim(),password=$("loginPassword").value;let session=null;if(login.includes("@")){const {data,error}=await client.auth.signInWithPassword({email:login,password});if(error){$("loginStatus").textContent="लॉगिन नहीं हुआ: "+error.message;return}session=data.session}else{try{const r=await fetch("/api/school-users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"login",login_id:login,password})});const d=await r.json();if(!r.ok)throw new Error(d.error||"लॉगिन नहीं हुआ।");const {data,error}=await client.auth.setSession(d.session);if(error)throw error;session=data.session}catch(error){$("loginStatus").textContent="लॉगिन नहीं हुआ: "+error.message;return}}$("loginDialog").close();await showAdmin(session)});
$("forgotPasswordBtn").addEventListener("click",async()=>{const email=$("loginEmail").value.trim();if(!email){$("loginStatus").textContent="पहले अपना Owner ईमेल लिखें।";$("loginEmail").focus();return}if(!client){$("loginStatus").textContent="लॉगिन सेवा उपलब्ध नहीं है।";return}$("loginStatus").textContent="रीसेट लिंक भेजा जा रहा है…";const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:"https://saraswati-shishu-mandir-retailproject923-6937.vercel.app"});$("loginStatus").textContent=error?("लिंक नहीं भेजा गया: "+error.message):"यदि यह ईमेल पंजीकृत है, तो उस पर पासवर्ड रीसेट लिंक भेज दिया गया है। Gmail का Inbox/Spam देखें।"});
client?.auth.onAuthStateChange((event)=>{if(event==="PASSWORD_RECOVERY"){$("resetDialog").showModal();$("resetStatus").textContent="सुरक्षित लिंक सत्यापित है। नया पासवर्ड बनाएँ।"}});
$("resetForm").addEventListener("submit",async e=>{e.preventDefault();const p=$("newPassword").value;if(p!==$("confirmPassword").value){$("resetStatus").textContent="दोनों पासवर्ड एक जैसे नहीं हैं।";return}if(p.length<8){$("resetStatus").textContent="कम-से-कम 8 अक्षर का पासवर्ड रखें।";return}$("resetStatus").textContent="पासवर्ड सेव हो रहा है…";const {error}=await client.auth.updateUser({password:p});if(error){$("resetStatus").textContent="पासवर्ड सेव नहीं हुआ: "+error.message;return}$("resetDialog").close();$("loginDialog").showModal();$("loginStatus").textContent="नया पासवर्ड सेव हो गया। अब नए पासवर्ड से लॉगिन करें।";$("loginPassword").value="";$("newPassword").value="";$("confirmPassword").value="";await client.auth.signOut()});
$("logoutBtn").addEventListener("click",async()=>{await client.auth.signOut();$("adminPanel").classList.add("hidden")});
$("roleLogoutBtn")?.addEventListener("click",async()=>{await client.auth.signOut();$("roleDashboard").classList.add("hidden")});
window.addEventListener("online",loadAds);loadAds();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(console.warn));
let deferredPrompt;$("installBtn").addEventListener("click",async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();deferredPrompt=null;$("installBtn").classList.add("hidden")});window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBtn").classList.remove("hidden")});


// Bilingual Help Center and first-stage FAQ assistant.
const uiText={
hi:{helpEyebrow:"सहायता केंद्र",helpTitle:"Help / User Manual",helpIntro:"ऐप और वेबसाइट चलाने की आसान जानकारी। अपनी भाषा चुनें।",ownerGuide:"मालिक / Owner",ownerStep1:"अपने अधिकृत ईमेल और पासवर्ड से लॉगिन करें।",ownerStep2:"प्रबंधन पैनल में उपलब्ध सेटिंग देखें।",ownerStep3:"विज्ञापन जोड़ें, बदलें या बंद करें।",teacherGuide:"शिक्षक / Teacher",teacherStep1:"अपने दिए गए लॉगिन से प्रवेश करें।",teacherStep2:"अपनी कक्षा और विषय चुनें।",teacherStep3:"होमवर्क, उपस्थिति और परिणाम के विकल्प उपयोग करें।",parentGuide:"अभिभावक / Parent & Student",parentStep1:"विद्यालय से मिली ID और पासवर्ड से लॉगिन करें।",parentStep2:"होमवर्क, सूचना, फीस और परिणाम देखें।",parentStep3:"समस्या होने पर सहायता चैट या विद्यालय से संपर्क करें।",quickHelp:"त्वरित सहायता",faqLogin:"लॉगिन समस्या: अपनी ID/पासवर्ड की पुष्टि करें; पासवर्ड रीसेट के लिए विद्यालय प्रबंधन से संपर्क करें।",faqPrivacy:"डेटा सुरक्षा: हर यूजर को केवल अपनी अनुमति के अनुसार जानकारी दिखनी चाहिए।",faqOffline:"इंटरनेट न हो: उपलब्ध ऑफलाइन सुविधाएँ डिवाइस में सेव रहेंगी और कनेक्शन लौटने पर सिंक होंगी (जहाँ सुविधा सक्रिय हो)।",assistantEyebrow:"डिजिटल सहायता",assistantTitle:"रीसीका मिश्रा AI",assistantIntro:"हिंदी या English में कोई भी सवाल पूछें। रीसीका मिश्रा आपकी मदद करेंगी।",chatWelcome:"नमस्ते! मैं रीसीका मिश्रा हूँ। आप फीस, होमवर्क, लॉगिन या अटेंडेंस के बारे में पूछ सकते हैं।",send:"भेजें",aiNotice:"यह AI सहायता सर्वर से जवाब देती है। निजी छात्र रिकॉर्ड देखने के लिए अधिकृत लॉगिन जरूरी है।",helpLink:"Help / सहायता",chatPlaceholder:"अपना सवाल लिखें…",chatLogin:"लॉगिन के लिए विद्यालय से मिली अधिकृत ID और पासवर्ड डालें। समस्या बनी रहे तो प्रबंधन से पासवर्ड रीसेट करवाएँ।",chatFees:"फीस और बकाया देखने के लिए अपने Parent/Student खाते में Fees विकल्प खोलें। भुगतान सुविधा सक्रिय न हो तो विद्यालय कार्यालय से संपर्क करें।",chatHomework:"होमवर्क देखने के लिए अपने खाते में Homework विकल्प खोलें और कक्षा/विषय चुनें।",chatAttendance:"उपस्थिति देखने के लिए Attendance विकल्प खोलें। गलत उपस्थिति दिखे तो संबंधित शिक्षक या कार्यालय को सूचित करें।",chatResult:"रिजल्ट प्रकाशित होने के बाद Results विकल्प में दिखाई देगा। अभी न दिखे तो कक्षा शिक्षक से पूछें।",chatTeacher:"शिक्षक अपने अधिकृत खाते में लॉगिन करके निर्धारित कक्षा/विषय के विकल्प देखेंगे।",chatHuman:"इस प्रश्न के लिए कृपया विद्यालय कार्यालय या अधिकृत प्रबंधन से संपर्क करें।"},
en:{helpEyebrow:"HELP CENTER",helpTitle:"Help / User Manual",helpIntro:"Simple instructions for using the app and website. Choose your language.",ownerGuide:"Owner / School Admin",ownerStep1:"Sign in with your authorised email and password.",ownerStep2:"Review the settings available in the management panel.",ownerStep3:"Add, edit, publish or disable advertisements.",teacherGuide:"Teacher",teacherStep1:"Sign in using the account issued by the school.",teacherStep2:"Choose your assigned class and subject.",teacherStep3:"Use the homework, attendance and results options.",parentGuide:"Parent & Student",parentStep1:"Sign in with the ID and password issued by the school.",parentStep2:"View homework, notices, fees and results.",parentStep3:"If you need help, use the assistant or contact the school.",quickHelp:"Quick Help",faqLogin:"Login issue: check your ID and password. Contact school management for a password reset.",faqPrivacy:"Data privacy: each user should only see information permitted for their account.",faqOffline:"Offline use: supported offline data stays on the device and syncs when connectivity returns, where that feature is enabled.",assistantEyebrow:"DIGITAL SUPPORT",assistantTitle:"Reesika Mishra AI",assistantIntro:"Ask any question in Hindi or English. Reesika Mishra is here to help.",chatWelcome:"Hello! I am Reesika Mishra. Ask me about fees, homework, login or attendance.",send:"Send",aiNotice:"This AI assistant responds through the server. Authorised login is required for private student records.",helpLink:"Help / User Manual",chatPlaceholder:"Type your question…",chatLogin:"Use the authorised ID and password issued by the school. If login still fails, ask management to reset your password.",chatFees:"Open Fees in your Parent/Student account to view fees and dues. If online payment is not enabled, contact the school office.",chatHomework:"Open Homework in your account and choose your class or subject to view assignments.",chatAttendance:"Open Attendance in your account. If a record looks incorrect, inform the class teacher or school office.",chatResult:"Results appear under Results after the school publishes them. If unavailable, contact your class teacher.",chatTeacher:"Teachers should sign in to their authorised account to view assigned class and subject options.",chatHuman:"Please contact the school office or authorised management for help with this question."}
};
function setLanguage(lang){lang=lang==="en"?"en":"hi";const dict=uiText[lang]||uiText.hi;document.documentElement.lang=lang;document.querySelectorAll("[data-i18n]").forEach(el=>{const key=el.dataset.i18n;if(dict[key])el.textContent=dict[key]});$("chatInput").placeholder=dict.chatPlaceholder;$("langHi").setAttribute("aria-pressed",String(lang==="hi"));$("langEn").setAttribute("aria-pressed",String(lang==="en"));localStorage.setItem("school_ui_language",lang);window.schoolAiVoiceLanguage=lang==="en"?"en-IN":"hi-IN";const voiceLangButton=document.getElementById("aiVoiceLang");if(voiceLangButton)voiceLangButton.textContent=lang==="en"?"Language: English":"भाषा: हिंदी";}
$("langHi").addEventListener("click",()=>setLanguage("hi"));$("langEn").addEventListener("click",()=>setLanguage("en"));
setLanguage(localStorage.getItem("school_ui_language")==="en"?"en":"hi");
function assistantAnswer(question){const q=String(question||"").toLowerCase();const dict=uiText[document.documentElement.lang==="en"?"en":"hi"];if(/login|लॉग.?इन|पासवर्ड|password|id/.test(q))return dict.chatLogin;if(/fee|फीस|शुल्क|payment|भुगतान|dues|बकाया/.test(q))return dict.chatFees;if(/homework|होम.?वर्क|गृहकार्य|assignment|असाइन/.test(q))return dict.chatHomework;if(/attendance|उपस्थिति|हाजिरी/.test(q))return dict.chatAttendance;if(/result|रिजल्ट|परिणाम|marks|अंक/.test(q))return dict.chatResult;if(/teacher|शिक्षक|अध्यापक|class|कक्षा|subject|विषय/.test(q))return dict.chatTeacher;return dict.chatHuman}
let aiHistory=[];
$("chatForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const field=$("chatInput"),question=field.value.trim();
 if(!question)return;
 const box=$("chatMessages"),send=$("chatForm").querySelector('button[type="submit"]');
 const user=document.createElement("div");user.className="chat-bubble user";user.textContent=question;box.appendChild(user);
 field.value="";field.disabled=true;if(send)send.disabled=true;
 const reply=document.createElement("div");reply.className="chat-bubble bot";reply.textContent="जवाब तैयार हो रहा है…";box.appendChild(reply);box.scrollTop=box.scrollHeight;
 aiHistory.push({role:"user",content:question});
 try{
  const activePage=document.querySelector(".nav-item.active")?.dataset.page||"home";
  const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:aiHistory.slice(-12),preferredLanguage:localStorage.getItem("school_ui_language")==="en"?"en":"hi",pageContext:{page:activePage,visiblePageContent:"Saraswati Shishu Mandir public website and school ERP help."}})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||"AI सेवा अभी उपलब्ध नहीं है।");
  const answer=cleanAIAnswer(data.answer);if(!answer)throw new Error("AI ने खाली जवाब दिया।");
  reply.textContent=answer;aiHistory.push({role:"assistant",content:answer});
 }catch(err){reply.textContent="अभी AI जवाब नहीं दे पाया: "+(err.message||"कृपया थोड़ी देर बाद प्रयास करें।");aiHistory.pop();}
 finally{field.disabled=false;if(send)send.disabled=false;field.focus();box.scrollTop=box.scrollHeight;}
});

// ERP navigation: module cards open descriptive detail screens.
const moduleData=[
{id:"overview",group:"management",title:"मुख्य डैशबोर्ड",en:"Main Dashboard",desc:"विद्यालय की कुल स्थिति, आज की गतिविधियाँ और जरूरी अलर्ट।",what:["कुल विद्यार्थी और स्टाफ का सारांश","आज की उपस्थिति और फीस स्थिति","नए नोटिस और जरूरी अलर्ट"],status:"डैशबोर्ड डेटा कनेक्ट होना बाकी है",img:"https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900"},
{id:"users",group:"management",title:"यूजर एवं लॉगिन प्रबंधन",en:"User & Login Management",desc:"शिक्षक, कर्मचारी, विद्यार्थी और अभिभावक के अकाउंट।",what:["नया यूजर और भूमिका चुनना","ID/पासवर्ड जारी करना","अकाउंट चालू या बंद करना"],status:"Management से स्वीकृत यूजर अकाउंट और लॉगिन ID प्रबंधन",ready:true,img:"https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=900"},
{id:"classes",group:"management",title:"कक्षा, सेक्शन एवं विषय",en:"Classes & Subjects",desc:"कक्षाएँ, सेक्शन, विषय और कक्षा-शिक्षक व्यवस्था।",what:["कक्षा और सेक्शन जोड़ना","विषय तय करना","शिक्षक को कक्षा/विषय देना"],status:"फॉर्म और डेटा कनेक्शन बाकी",img:"https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900"},
{id:"students",group:"students",title:"विद्यार्थी रिकॉर्ड",en:"Student Records",desc:"प्रत्येक विद्यार्थी का सुरक्षित प्रोफाइल और रिकॉर्ड।",what:["नया विद्यार्थी जोड़ना","कक्षा/सेक्शन और अभिभावक लिंक","प्रोफाइल और दस्तावेज देखना"],status:"विद्यार्थी फॉर्म और रिकॉर्ड जोड़ना बाकी",img:"https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900"},
{id:"parents",group:"students",title:"अभिभावक पोर्टल",en:"Parent Portal",desc:"अभिभावक अपने बच्चे की जानकारी देख सकेंगे।",what:["बच्चे की उपस्थिति","होमवर्क और नोटिस","फीस और परिणाम"],status:"अभिभावक लॉगिन/लिंकिंग बाकी",img:"https://images.unsplash.com/photo-1491013516836-7db643ee125a?w=900"},
{id:"homework",group:"students",title:"होमवर्क एवं असाइनमेंट",en:"Homework & Assignments",desc:"कक्षा और विषय के अनुसार होमवर्क और नोट्स।",what:["शिक्षक होमवर्क अपलोड करें","विद्यार्थी/अभिभावक देखें","जमा करने की स्थिति ट्रैक"],status:"यूजर स्क्रीन और अपलोड फॉर्म बाकी",img:"https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900"},
{id:"teacher",group:"teachers",title:"शिक्षक डैशबोर्ड",en:"Teacher Dashboard",desc:"शिक्षक को निर्धारित कक्षाएँ और विषय दिखेंगे।",what:["अपनी कक्षा/विषय देखना","होमवर्क और नोटिस देना","उपस्थिति और अंक दर्ज करना"],status:"शिक्षक लॉगिन और डैशबोर्ड बाकी",img:"https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=900"},
{id:"timetable",group:"teachers",title:"टाइमटेबल",en:"Class Timetable",desc:"कक्षा, विषय और शिक्षक के अनुसार समय-सारणी।",what:["पीरियड और समय सेट करना","कक्षा का टाइमटेबल देखना","बदलाव प्रकाशित करना"],status:"टाइमटेबल स्क्रीन बाकी",img:"https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=900"},
{id:"fees",group:"fees",title:"फीस एवं रसीद",en:"Fees & Receipts",desc:"फीस संरचना, भुगतान, बकाया और रसीद।",what:["विद्यार्थी की फीस तय करना","भुगतान दर्ज करना","रसीद और बकाया रिपोर्ट"],status:"कक्षा फीस, एडमिशन फीस और विद्यार्थी फीस कार्ड उपलब्ध",ready:true,img:"https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=900"},
{id:"paymentinfo",group:"fees",title:"बैंक अकाउंट एवं QR",en:"Bank Account & QR",desc:"अभिभावक स्कूल फीस जमा करने के लिए वर्तमान बैंक अकाउंट और QR देख सकते हैं।",what:["वर्तमान सक्रिय बैंक अकाउंट देखना","UPI ID और QR से भुगतान करना","भुगतान से पहले स्कूल के निर्देश पढ़ना"],status:"सक्रिय भुगतान विवरण लोड होगा",img:"https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=900",ready:true},
{id:"store",group:"store",title:"विद्यालय स्टोर",en:"School Store",desc:"यूनिफॉर्म, किताबें और अन्य सामान देखें और बच्चे के लिए ऑर्डर करें।",what:["सामान की फोटो और कीमत देखना","बच्चे के लिए सामान ऑर्डर करना","UPI/QR से भुगतान विवरण देखना"],status:"स्टोर कैटलॉग और ऑर्डर मॉड्यूल",img:"https://images.unsplash.com/photo-1544816155-12df9643f363?w=900",ready:true},
{id:"expenses",group:"fees",title:"खर्च एवं लेखा",en:"Expenses & Accounts",desc:"विद्यालय के खर्च, आय और लेखा रिकॉर्ड।",what:["खर्च की एंट्री","श्रेणी और तारीख के अनुसार रिकॉर्ड","मासिक आय-व्यय सारांश"],status:"लेखा फॉर्म और रिपोर्ट बाकी",img:"https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900"},
{id:"salary",group:"fees",title:"वेतन एवं पेरोल",en:"Salary & Payroll",desc:"स्टाफ वेतन और भुगतान रिकॉर्ड।",what:["स्टाफ वेतन तय करना","मासिक भुगतान रिकॉर्ड","वेतन स्टेटमेंट"],status:"पेरोल स्क्रीन बाकी",img:"https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=900"},
{id:"attendance",group:"attendance",title:"विद्यार्थी उपस्थिति",en:"Student Attendance",desc:"कक्षा/सेक्शन के अनुसार दैनिक उपस्थिति।",what:["Present/Absent दर्ज करना","महीने के अनुसार रिपोर्ट","अभिभावक को सूचना"],status:"उपस्थिति स्क्रीन बाकी",img:"https://images.unsplash.com/photo-1577896851231-70ef18881754?w=900"},
{id:"staffattendance",group:"attendance",title:"शिक्षक एवं स्टाफ उपस्थिति",en:"Staff Attendance",desc:"शिक्षक और कर्मचारियों की उपस्थिति।",what:["दैनिक उपस्थिति","मासिक रिपोर्ट","वेतन से संबंधित सारांश"],status:"स्टाफ उपस्थिति स्क्रीन बाकी",img:"https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=900"},
{id:"results",group:"reports",title:"परीक्षा एवं परिणाम",en:"Exams & Results",desc:"परीक्षा, विषयवार अंक और रिपोर्ट कार्ड।",what:["परीक्षा/टेस्ट बनाना","विषयवार अंक दर्ज करना","रिपोर्ट कार्ड प्रकाशित करना"],status:"परिणाम फॉर्म और प्रिंट टेम्पलेट बाकी",img:"https://images.unsplash.com/photo-1513258496099-48168024d0e5?w=900"},
{id:"notices",group:"reports",title:"नोटिस एवं घोषणाएँ",en:"Notices & Announcements",desc:"विद्यालय की सामान्य और जरूरी सूचनाएँ।",what:["नोटिस लिखना","कक्षा/सभी यूजर को भेजना","पुराने नोटिस देखना"],status:"नोटिस मैनेजमेंट स्क्रीन बाकी",img:"https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900"},
{id:"grievance",group:"reports",title:"शिकायत एवं सुझाव",en:"Complaints & Suggestions",desc:"अभिभावक/विद्यार्थी की शिकायतों का प्रबंधन।",what:["शिकायत दर्ज करना","प्रबंधन को असाइन करना","स्थिति और जवाब अपडेट करना"],status:"शिकायत पोर्टल बाकी",img:"https://images.unsplash.com/photo-1521791136064-7986c2920216?w=900"},
{id:"ads",group:"management",title:"विज्ञापन प्रबंधन",en:"Advertisement Manager",desc:"मुख्य पेज के विज्ञापन नियंत्रित करना।",what:["विज्ञापन जोड़ना/बदलना","चालू या बंद करना","क्रम और अवधि सेट करना"],status:"मौजूदा मालिक विज्ञापन पैनल उपलब्ध",img:"https://images.unsplash.com/photo-1558655146-d09347e92766?w=900",ready:true}
];
const navGroups={home:null,management:"management",students:"students",teachers:"teachers",fees:"fees",store:"store",attendance:"attendance",reports:"reports"};
const navLabels={management:"Management",students:"Students",teachers:"Teachers",fees:"Fees & Accounts",attendance:"Attendance",reports:"Reports",store:"School Store"};
async function renderDonationPage(){
 const host=$("donationPaymentOptions");
 host.innerHTML="<p>भुगतान विवरण लोड हो रहा है…</p>";
 const {data,error}=await client.from("school_payment_accounts").select("account_holder,bank_name,account_number,ifsc_code,upi_id,qr_image_url,payment_instructions").eq("is_active",true).order("updated_at",{ascending:false});
 if(error){host.textContent="भुगतान विवरण अभी उपलब्ध नहीं हैं। विद्यालय प्रबंधन से संपर्क करें।";return}
 if(!data?.length){host.textContent="विद्यालय ने अभी दान के लिए बैंक/UPI विवरण प्रकाशित नहीं किए हैं।";return}
 host.innerHTML=data.map(a=>`<article class="payment-public-card"><h3>${escapeHtml(a.bank_name)}</h3><p><b>खाताधारक:</b> ${escapeHtml(a.account_holder)}</p><p><b>अकाउंट नंबर:</b> ${escapeHtml(a.account_number)}</p><p><b>IFSC:</b> ${escapeHtml(a.ifsc_code||"—")}</p><p><b>UPI ID:</b> ${escapeHtml(a.upi_id||"—")}</p>${a.qr_image_url?`<img class="payment-qr" src="${escapeAttr(a.qr_image_url)}" alt="विद्यालय दान QR" loading="lazy">`:""}<p>${escapeHtml(a.payment_instructions||"दान करने से पहले प्राप्तकर्ता विवरण की पुष्टि करें।")}</p><div class="donation-upi-link" data-upi="${escapeAttr(a.upi_id||"")}" data-holder="${escapeAttr(a.account_holder)}"></div></article>`).join("");
}
$("donationForm")?.addEventListener("submit",async e=>{
 e.preventDefault();
 const amount=Number($("donationAmount").value),purpose=$("donationPurpose").value,name=$("donorName").value.trim();
 if(!Number.isFinite(amount)||amount<1){$("donationStatus").textContent="कृपया सही राशि भरें।";return}
 const phone=$("donorPhone")?.value.trim()||null;
 $("donationStatus").textContent="दान अनुरोध सेव हो रहा है…";
 const {data:donation,error:saveError}=await client.from("school_donations").insert({donor_name:name||"गुमनाम दानदाता",donor_phone:phone,purpose,amount,payment_status:"pending",payment_method:"UPI"}).select("id").single();
 if(saveError){$("donationStatus").textContent="दान अनुरोध सेव नहीं हुआ: "+(saveError.message||"कृपया दोबारा प्रयास करें");return}
 const links=$("donationPaymentOptions").querySelectorAll(".donation-upi-link");let count=0;
 links.forEach(el=>{
  const upi=el.dataset.upi;if(!upi)return;
  const params=new URLSearchParams({pa:upi,pn:el.dataset.holder||"Saraswati Shishu Mandir",am:amount.toFixed(2),cu:"INR",tn:"Donation - "+purpose+" - Ref "+donation.id.slice(0,8)});
  const a=document.createElement("a");a.className="primary donation-pay";a.href="upi://pay?"+params.toString();a.textContent="UPI ऐप से ₹"+amount+" दान करें";a.target="_blank";el.append(a);count++;
 });
 $("donationStatus").textContent=count?"दान अनुरोध दर्ज हो गया है। अब UPI लिंक/QR से भुगतान करें। भुगतान की पुष्टि विद्यालय प्रबंधन करेगा।":"दान अनुरोध दर्ज हो गया है, लेकिन UPI ID नहीं मिली। बैंक/QR विवरण से भुगतान करें और प्रबंधन से पुष्टि कराएँ।";
});
function showPortal(page){
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 const home=page==="home";
 const donation=page==="donation";
 $("donationPage")?.classList.toggle("hidden",!donation);
 $("modulePortal").classList.toggle("hidden",home||page==="help");
 $("helpPortal").classList.toggle("hidden",page!=="help");
 ["adsSection","notices","help","assistant","adminPanel"].forEach(id=>{const el=$(id);if(el)el.classList.add("hidden")});
 if(home){$("adsSection").classList.remove("hidden");$("notices").classList.remove("hidden");$("help").classList.add("hidden");}
 if(page==="help"){renderHelpOptions();$("helpPortal").scrollIntoView({behavior:"smooth"});return}
 if(donation){renderDonationPage();$("donationPage").scrollIntoView({behavior:"smooth"});return}
 if(!home){$("portalTitle").textContent=navLabels[page]||"School Systems";$("portalIntro").textContent="किसी सिस्टम पर टैप करें। उसकी जानकारी, उपयोग और उपलब्धता खुलेगी।";renderModules(moduleData.filter(m=>m.group===navGroups[page]));$("modulePortal").scrollIntoView({behavior:"smooth"})}
}
function renderModules(items){
 const grid=$("moduleGrid");grid.innerHTML="";
 items.forEach(m=>{const b=document.createElement("button");b.className="module-card";b.dataset.module=m.id;const img=document.createElement("img");img.src=m.img;img.alt=m.title;img.loading="lazy";img.onerror=()=>img.style.display="none";const body=document.createElement("div");body.className="module-card-body";const h=document.createElement("h3");h.textContent=m.title;const p=document.createElement("p");p.textContent=m.desc;const s=document.createElement("span");s.className="module-status"+(m.ready?" ready":"");s.textContent=m.ready?"उपलब्ध: सीमित कार्य":"निर्माणाधीन — अभी सक्रिय नहीं";body.append(h,p,s);b.append(img,body);grid.append(b)})
}
function openModule(id){
 const m=moduleData.find(x=>x.id===id);if(!m)return;
 const host=$("detailContent");host.innerHTML="";
 const eyebrow=document.createElement("span");eyebrow.className="eyebrow";eyebrow.textContent="SCHOOL ERP MODULE";
 const title=document.createElement("h2");title.textContent=m.title+" / "+m.en;
 const desc=document.createElement("p");desc.textContent=m.desc;
 const img=document.createElement("img");img.className="detail-hero";img.src=m.img;img.alt=m.title;img.onerror=()=>img.style.display="none";
 const h=document.createElement("h3");h.textContent="इस सिस्टम को खोलने से क्या होगा?";
 const ul=document.createElement("ul");m.what.forEach(x=>{const li=document.createElement("li");li.textContent=x;ul.append(li)});
 const status=document.createElement("p");status.textContent="वर्तमान स्थिति: "+m.status+".";
 const note=document.createElement("p");note.textContent="यह पेज अभी मॉड्यूल की जानकारी दिखाता है। वास्तविक रिकॉर्ड जोड़ने/बदलने की सुविधा तैयार और टेस्ट होने के बाद ही सक्रिय होगी।";
 const close=document.createElement("button");close.className="outline";close.textContent="वापस जाएँ";close.addEventListener("click",closeModule);
 host.append(eyebrow,title,desc,img,h,ul,status,note,close);
 if(m.id==="ads"){const open=document.createElement("button");open.className="primary";open.textContent="विज्ञापन प्रबंधन खोलें";open.style.marginLeft="10px";open.addEventListener("click",()=>{closeModule();openAdmin()});host.append(open)}
 $("moduleDetail").classList.remove("hidden")
}
function closeModule(){$("moduleDetail").classList.add("hidden")}
const helpItems=[
{id:"manual",title:"पूरा User Manual",en:"Complete User Manual",desc:"सभी यूजर के लिए चरण-दर-चरण गाइड।",body:"पहले अपनी भूमिका चुनें। विद्यालय द्वारा जारी ID और पासवर्ड से लॉगिन करें। लॉगिन के बाद केवल आपकी अनुमति वाले मेन्यू दिखने चाहिए। किसी जानकारी में गलती हो तो विद्यालय कार्यालय से संपर्क करें।"},
{id:"ownerhelp",title:"Owner / मालिक गाइड",en:"Owner Guide",desc:"यूजर, कक्षाएँ, सेटिंग और विज्ञापन।",body:"मालिक यूजर अकाउंट, कक्षा, विषय, स्टाफ भूमिका, विज्ञापन और रिपोर्ट नियंत्रित करेगा। अकाउंट प्रबंधन सुविधा सुरक्षित रूप से तैयार होने के बाद लाइव होगी।"},
{id:"teacherhelp",title:"Teacher / शिक्षक गाइड",en:"Teacher Guide",desc:"उपस्थिति, होमवर्क, नोटिस और अंक।",body:"शिक्षक अपने अधिकृत अकाउंट से प्रवेश करें। निर्धारित कक्षा और विषय चुनें। फिर होमवर्क, नोटिस, उपस्थिति और अंक विकल्प उपयोग करें।"},
{id:"studenthelp",title:"Student / विद्यार्थी गाइड",en:"Student Guide",desc:"होमवर्क, टाइमटेबल, नोटिस और रिजल्ट।",body:"विद्यार्थी अपनी ID से लॉगिन करके होमवर्क, विषय, टाइमटेबल, नोटिस और प्रकाशित परिणाम देख सकेगा।"},
{id:"parenthelp",title:"Parent / अभिभावक गाइड",en:"Parent Guide",desc:"बच्चे की फीस, उपस्थिति और पढ़ाई।",body:"अभिभावक अपने खाते से जुड़े बच्चे की फीस, रसीद, उपस्थिति, होमवर्क और परिणाम देख सकेंगे।"},
{id:"feeshelp",title:"Fees / फीस सहायता",en:"Fees Help",desc:"फीस, भुगतान और रसीद की जानकारी।",body:"फीस मॉड्यूल में विद्यार्थी चुनकर फीस विवरण, भुगतान और बकाया देखा जा सकेगा। ऑनलाइन भुगतान तभी उपलब्ध होगा जब सुरक्षित भुगतान गेटवे जोड़ा जाएगा।"},
{id:"attendancehelp",title:"Attendance / उपस्थिति सहायता",en:"Attendance Help",desc:"विद्यार्थी और स्टाफ उपस्थिति।",body:"उपस्थिति में तारीख और कक्षा चुनकर रिकॉर्ड दर्ज/देखा जाएगा। गलत एंट्री के सुधार के लिए अधिकृत शिक्षक या प्रबंधन से संपर्क करें।"},
{id:"chathelp",title:"AI Assistant",en:"AI Assistant",desc:"सामान्य सवालों के तुरंत जवाब।",body:"AI Assistant अब स्कूल वेबसाइट के सामान्य सवालों का जवाब देने के लिए सर्वर API से जुड़ा है। निजी फीस/छात्र रिकॉर्ड अभी नहीं दिखाता।"},
{id:"accounthelp",title:"Login और सुरक्षा",en:"Login & Security",desc:"पासवर्ड, अकाउंट और डेटा सुरक्षा।",body:"अपना पासवर्ड साझा न करें। लॉगिन न हो तो ID जाँचें और विद्यालय प्रबंधन से पासवर्ड रीसेट करवाएँ। काम पूरा होने के बाद लॉगआउट करें।"}
];
function renderHelpOptions(){
 const box=$("helpOptions");box.innerHTML="";
 helpItems.forEach(h=>{const b=document.createElement("button");b.className="help-option";b.dataset.help=h.id;const strong=document.createElement("strong");strong.textContent=h.title+" / "+h.en;const span=document.createElement("span");span.textContent=h.desc;b.append(strong,span);box.append(b)});
 $("helpDetail").classList.add("hidden");$("helpDetail").innerHTML=""
}
function openHelp(id){
 const h=helpItems.find(x=>x.id===id);if(!h)return;
 const box=$("helpDetail");box.innerHTML="";const title=document.createElement("h3");title.textContent=h.title+" / "+h.en;const p=document.createElement("p");p.textContent=h.body;box.append(title,p);
 if(id==="chathelp"){const b=document.createElement("button");b.className="primary";b.textContent="Assistant खोलें";b.addEventListener("click",()=>{$("helpPortal").classList.add("hidden");$("assistant").classList.remove("hidden");$("assistant").scrollIntoView({behavior:"smooth"})});box.append(b)}
 box.classList.remove("hidden");box.scrollIntoView({behavior:"smooth",block:"nearest"})
}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showPortal(b.dataset.page)));
$("moduleGrid").addEventListener("click",e=>{const card=e.target.closest("[data-module]");if(card)openModule(card.dataset.module)});
$("helpOptions").addEventListener("click",e=>{const card=e.target.closest("[data-help]");if(card)openHelp(card.dataset.help)});
$("closeDetail").addEventListener("click",closeModule);
$("moduleDetail").addEventListener("click",e=>{if(e.target===$("moduleDetail"))closeModule()});
showPortal("home");

/* School bank account and QR management */
let editingPaymentId=null;
function resetPaymentForm(){editingPaymentId=null;["payHolder","payBank","payNumber","payIfsc","payUpi","payQr","payInstructions"].forEach(id=>$(id).value="");$("payActive").checked=true}
async function loadPaymentAccountsAdmin(){
 if(!client)return;
 const {data,error}=await client.from("school_payment_accounts").select("*").order("updated_at",{ascending:false});
 $("paymentAccountList").innerHTML=error?"अकाउंट सूची लोड नहीं हुई: "+escapeHtml(error.message):(data||[]).map(a=>`<div class="ad-row"><b>${escapeHtml(a.account_holder)}</b> — ${escapeHtml(a.bank_name)} — ${a.is_active?"Active":"Inactive"} <button class="outline" data-pay-edit="${a.id}">बदलें</button> <button class="outline" data-pay-toggle="${a.id}" data-active="${a.is_active}">${a.is_active?"बंद करें":"चालू करें"}</button></div>`).join("");
}
$("paymentAccountForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const payload={account_holder:$("payHolder").value.trim(),bank_name:$("payBank").value.trim(),account_number:$("payNumber").value.trim(),ifsc_code:$("payIfsc").value.trim()||null,upi_id:$("payUpi").value.trim()||null,qr_image_url:$("payQr").value.trim()||null,payment_instructions:$("payInstructions").value.trim()||null,is_active:$("payActive").checked,created_by:(await client.auth.getUser()).data.user?.id};
 const q=editingPaymentId?client.from("school_payment_accounts").update(payload).eq("id",editingPaymentId):client.from("school_payment_accounts").insert(payload);
 const {error}=await q;
 $("paymentAdminStatus").textContent=error?"सेव नहीं हुआ: "+error.message:"बैंक अकाउंट विवरण सेव हो गया।";
 if(!error){resetPaymentForm();await loadPaymentAccountsAdmin()}
});
$("payReset").addEventListener("click",resetPaymentForm);
$("paymentAccountList").addEventListener("click",async e=>{
 const id=e.target.dataset.payEdit||e.target.dataset.payToggle;if(!id)return;
 if(e.target.dataset.payEdit){
  const {data,error}=await client.from("school_payment_accounts").select("*").eq("id",id).single();
  if(error||!data){$("paymentAdminStatus").textContent="रिकॉर्ड नहीं खुला।";return}
  editingPaymentId=id;$("payHolder").value=data.account_holder;$("payBank").value=data.bank_name;$("payNumber").value=data.account_number;$("payIfsc").value=data.ifsc_code||"";$("payUpi").value=data.upi_id||"";$("payQr").value=data.qr_image_url||"";$("payInstructions").value=data.payment_instructions||"";$("payActive").checked=data.is_active;
  $("paymentAccountForm").scrollIntoView({behavior:"smooth"});
 }else{
  const active=e.target.dataset.active==="true";
  const {error}=await client.from("school_payment_accounts").update({is_active:!active}).eq("id",id);
  $("paymentAdminStatus").textContent=error?"स्थिति नहीं बदली: "+error.message:"स्थिति अपडेट हो गई।";
  await loadPaymentAccountsAdmin();
 }
});
async function renderParentPaymentInfo(host){
 host.innerHTML="<h2>स्कूल फीस भुगतान / School Fee Payment</h2><p>अभिभावक वर्तमान सक्रिय बैंक अकाउंट या QR से भुगतान कर सकते हैं। भुगतान करने से पहले विवरण की पुष्टि विद्यालय कार्यालय से कर लें।</p><div class='payment-public-list'>लोड हो रहा है…</div>";
 const list=host.querySelector(".payment-public-list");
 const {data,error}=await client.from("school_payment_accounts").select("account_holder,bank_name,account_number,ifsc_code,upi_id,qr_image_url,payment_instructions").eq("is_active",true).order("updated_at",{ascending:false});
 if(error){list.textContent="भुगतान विवरण अभी उपलब्ध नहीं हैं। कृपया विद्यालय कार्यालय से संपर्क करें।";return}
 if(!data?.length){list.textContent="अभी विद्यालय ने बैंक अकाउंट/QR प्रकाशित नहीं किया है।";return}
 list.innerHTML=data.map(a=>`<article class="payment-public-card"><h3>${escapeHtml(a.bank_name)}</h3><p><b>खाताधारक:</b> ${escapeHtml(a.account_holder)}</p><p><b>अकाउंट नंबर:</b> <span class="account-number">${escapeHtml(a.account_number)}</span></p><p><b>IFSC:</b> ${escapeHtml(a.ifsc_code||"—")}</p><p><b>UPI ID:</b> ${escapeHtml(a.upi_id||"—")}</p>${a.qr_image_url?`<img class="payment-qr" src="${escapeAttr(a.qr_image_url)}" alt="School fee payment QR code" loading="lazy">`:""}<p>${escapeHtml(a.payment_instructions||"भुगतान के बाद रसीद के लिए स्कूल कार्यालय से संपर्क करें।")}</p></article>`).join("");
}
const originalOpenModule=openModule;
openModule=function(id){
 if(id!=="paymentinfo")return originalOpenModule(id);
 const host=$("detailContent");host.innerHTML="";
 const title=document.createElement("h2");title.textContent="बैंक अकाउंट एवं QR / Bank Account & QR";
 const intro=document.createElement("p");intro.textContent="अभिभावक यहाँ विद्यालय द्वारा प्रकाशित वर्तमान भुगतान विवरण देख सकते हैं।";
 const img=document.createElement("img");img.className="detail-hero";img.src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=900";img.alt="Digital payment";
 host.append(title,intro,img);renderParentPaymentInfo(host);$("moduleDetail").classList.remove("hidden");
};

/* School Store: catalogue, parent ordering, manual UPI verification */
let editingProductId=null,storeCart=[];
function resetProductForm(){editingProductId=null;["productName","productCategory","productDescription","productClass","productSize","productPrice","productStock","productImage"].forEach(id=>$(id).value="");$("productActive").checked=true}
async function loadProductsAdmin(){
 const {data,error}=await client.from("store_products").select("*").order("created_at",{ascending:false});
 $("productAdminList").innerHTML=error?escapeHtml(error.message):(data||[]).map(p=>`<div class="ad-row"><b>${escapeHtml(p.product_name)}</b> ₹${p.price} | स्टॉक: ${p.stock_quantity} | ${p.is_active?"Active":"Inactive"} <button class="outline" data-product-edit="${p.id}">बदलें</button><button class="outline" data-product-toggle="${p.id}" data-active="${p.is_active}">${p.is_active?"बंद करें":"चालू करें"}</button></div>`).join("");
}
$("productForm").addEventListener("submit",async e=>{
 e.preventDefault();const payload={product_name:$("productName").value.trim(),category:$("productCategory").value.trim()||null,description:$("productDescription").value.trim()||null,class_applicable:$("productClass").value.trim()||null,size_label:$("productSize").value.trim()||null,price:Number($("productPrice").value),stock_quantity:Number($("productStock").value),image_path:$("productImage").value.trim()||null,is_active:$("productActive").checked};
 const q=editingProductId?client.from("store_products").update(payload).eq("id",editingProductId):client.from("store_products").insert(payload);
 const {error}=await q;$("productStatus").textContent=error?"सेव नहीं हुआ: "+error.message:"सामान सेव हो गया।";if(!error){resetProductForm();loadProductsAdmin()}
});
$("productReset").addEventListener("click",resetProductForm);
$("productAdminList").addEventListener("click",async e=>{
 const id=e.target.dataset.productEdit||e.target.dataset.productToggle;if(!id)return;
 if(e.target.dataset.productEdit){const {data,error}=await client.from("store_products").select("*").eq("id",id).single();if(error||!data)return;editingProductId=id;$("productName").value=data.product_name;$("productCategory").value=data.category||"";$("productDescription").value=data.description||"";$("productClass").value=data.class_applicable||"";$("productSize").value=data.size_label||"";$("productPrice").value=data.price;$("productStock").value=data.stock_quantity;$("productImage").value=data.image_path||"";$("productActive").checked=data.is_active;$("productForm").scrollIntoView({behavior:"smooth"})}
 else{const active=e.target.dataset.active==="true";const {error}=await client.from("store_products").update({is_active:!active}).eq("id",id);$("productStatus").textContent=error?error.message:"स्थिति अपडेट हुई।";loadProductsAdmin()}
});
async function loadStoreOrdersAdmin(){
 const {data,error}=await client.from("store_orders").select("id,parent_user_id,student_id,total_amount,payment_status,order_status,payment_reference,created_at").order("created_at",{ascending:false}).limit(100);
 if(error){$("storeAdminOrders").textContent=error.message;return}
 $("storeAdminOrders").innerHTML=(data||[]).map(o=>`<div class="store-order"><b>ऑर्डर #${o.id.slice(0,8)}</b> — ₹${o.total_amount} — ${o.payment_status} — ${o.order_status}<p>Payment Ref: ${escapeHtml(o.payment_reference||"नहीं दिया")}</p><div class="store-controls"><select data-order-payment="${o.id}"><option value="pending" ${o.payment_status==="pending"?"selected":""}>Pending</option><option value="paid" ${o.payment_status==="paid"?"selected":""}>Paid</option><option value="failed" ${o.payment_status==="failed"?"selected":""}>Failed</option><option value="refunded" ${o.payment_status==="refunded"?"selected":""}>Refunded</option></select><select data-order-status="${o.id}"><option value="placed">Placed</option><option value="processing">Processing</option><option value="ready_for_pickup">Ready for pickup</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select><button class="outline" data-order-save="${o.id}">अपडेट</button></div></div>`).join("")||"अभी कोई ऑर्डर नहीं है।";
}
$("storeAdminOrders").addEventListener("click",async e=>{const id=e.target.dataset.orderSave;if(!id)return;const pay=$("storeAdminOrders").querySelector(`[data-order-payment="${id}"]`).value;const status=$("storeAdminOrders").querySelector(`[data-order-status="${id}"]`).value;const {error}=await client.from("store_orders").update({payment_status:pay,order_status:status}).eq("id",id);alert(error?"अपडेट नहीं हुआ: "+error.message:"ऑर्डर अपडेट हो गया।");loadStoreOrdersAdmin()});
async function openStorePage(){
 const {data:{session}}=await client.auth.getSession();
 const host=$("detailContent");host.innerHTML="";
 const heading=document.createElement("h2");heading.textContent="सरस्वती शिशु मंदिर स्टोर / School Store";
 const intro=document.createElement("p");intro.textContent="किताबें, यूनिफॉर्म और विद्यालय का अन्य सामान यहाँ देखें। अपने बच्चे के लिए ऑर्डर करने हेतु Parent लॉगिन जरूरी है।";
 const grid=document.createElement("div");grid.id="storeCatalog";grid.className="store-grid";
 const status=document.createElement("p");status.id="storeStatus";status.className="store-note";status.textContent=session?"आप लॉगिन हैं। सामान चुनें और बच्चे के लिए ऑर्डर करें।":"ऑर्डर करने के लिए Parent ID और Password से लॉगिन करें।";
 const login=document.createElement("button");login.className="primary";login.textContent=session?"अकाउंट बदलें / लॉगआउट":"Parent Login";login.addEventListener("click",async()=>{if(session){await client.auth.signOut();openStorePage()}else $("loginDialog").showModal()});
 const cart=document.createElement("div");cart.id="storeCart";cart.className="store-order";cart.innerHTML="<h3>आपका कार्ट</h3><div id='storeCartLines'>अभी कार्ट खाली है।</div>";
 host.append(heading,intro,status,login,grid,cart);
 if(session){const {data:profile}=await client.from("profiles").select("role,is_active").eq("id",session.user.id).single();if(profile?.role!=="parent"||!profile.is_active){status.textContent="स्टोर ऑर्डर के लिए सक्रिय Parent अकाउंट से लॉगिन करें।";}else{const {data:children}=await client.from("students").select("id,student_name,admission_no,class_id,section").eq("parent_user_id",session.user.id).eq("is_active",true);const select=document.createElement("select");select.id="storeChild";select.innerHTML="<option value=''>बच्चे का चयन करें</option>"+(children||[]).map(s=>`<option value="${s.id}">${escapeHtml(s.student_name)} — ${escapeHtml(s.admission_no||"")}</option>`).join("");cart.prepend(select);const ref=document.createElement("input");ref.id="storePaymentRef";ref.placeholder="UPI Transaction ID / UTR (भुगतान के बाद)";cart.append(ref);const checkout=document.createElement("button");checkout.className="primary";checkout.textContent="ऑर्डर भेजें";checkout.addEventListener("click",placeStoreOrder);cart.append(checkout);const payment=document.createElement("div");payment.id="storePaymentInfo";cart.append(payment);renderParentPaymentInfo(payment)}}
 const {data:products,error}=await client.from("store_products").select("*").eq("is_active",true).order("product_name");
 if(error){grid.textContent="स्टोर लोड नहीं हुआ: "+error.message;return}
 grid.innerHTML=(products||[]).map(p=>`<article class="store-card">${p.image_path?`<img src="${escapeAttr(p.image_path)}" alt="${escapeAttr(p.product_name)}" loading="lazy">`:""}<div class="store-card-body"><h3>${escapeHtml(p.product_name)}</h3><p>${escapeHtml(p.description||p.category||"विद्यालय स्टोर")}</p><p class="store-price">₹${Number(p.price).toFixed(2)}</p><small>स्टॉक: ${p.stock_quantity}</small><div class="store-controls"><input type="number" min="1" max="${p.stock_quantity}" value="1" id="qty-${p.id}" aria-label="Quantity"><button class="primary" data-add-cart="${p.id}" ${p.stock_quantity<=0?"disabled":""}>कार्ट में जोड़ें</button></div></div></article>`).join("")||"अभी स्टोर में कोई सामान उपलब्ध नहीं है।";
 grid.addEventListener("click",e=>{const id=e.target.dataset.addCart;if(!id)return;const p=products.find(x=>x.id===id);const qty=Math.max(1,Math.min(p.stock_quantity,Number($("qty-"+id).value)||1));const old=storeCart.find(x=>x.id===id);if(old)old.qty=Math.min(p.stock_quantity,old.qty+qty);else storeCart.push({id,name:p.product_name,price:Number(p.price),qty,stock:p.stock_quantity});renderStoreCart()});
 renderStoreCart();
}
function renderStoreCart(){const lines=$("storeCartLines");if(!lines)return;const total=storeCart.reduce((s,x)=>s+x.price*x.qty,0);lines.innerHTML=storeCart.map(x=>`<p>${escapeHtml(x.name)} × ${x.qty} = ₹${(x.price*x.qty).toFixed(2)} <button class="outline" data-remove-cart="${x.id}">हटाएँ</button></p>`).join("")+`<b>कुल: ₹${total.toFixed(2)}</b>`;lines.onclick=e=>{const id=e.target.dataset.removeCart;if(id){storeCart=storeCart.filter(x=>x.id!==id);renderStoreCart()}}}
async function placeStoreOrder(){
 const {data:{session}}=await client.auth.getSession();if(!session){$("loginDialog").showModal();return}
 const studentId=$("storeChild")?.value;if(!studentId){$("storeStatus").textContent="कृपया बच्चे का चयन करें।";return}
 if(!storeCart.length){$("storeStatus").textContent="कार्ट खाली है।";return}
 const items=storeCart.map(x=>({product_id:x.id,quantity:x.qty}));
 const {data:orderId,error}=await client.rpc("place_school_store_order",{p_student_id:studentId,p_items:items,p_payment_reference:$("storePaymentRef")?.value.trim()||null});
 if(error){$("storeStatus").textContent="ऑर्डर नहीं बना: "+error.message;return}
 $("storeStatus").textContent="ऑर्डर #"+String(orderId).slice(0,8)+" भेज दिया गया। स्टॉक अपडेट हो गया है। भुगतान स्कूल के QR/UPI से करें और Transaction ID ऑफिस को दें। ऑफिस सत्यापन के बाद Paid स्थिति करेगा।";
 storeCart=[];renderStoreCart();
}

const priorOpenModule=openModule;
openModule=function(id){if(id==="store"){openStorePage();$("moduleDetail").classList.remove("hidden");return}if(id==="users"||id==="fees"){openAdmin().then(()=>{const target=$(id==="users"?"userApprovalSection":"feeManagementSection");target?.scrollIntoView({behavior:"smooth",block:"start"})});return}priorOpenModule(id)};




// Floating AI chatbot wiring: connects the visible chat widget to the secure server endpoint.
const floatingAIHistory=[];
const aiWindow=$("aiWindow"),aiMessages=$("aiMessages"),aiForm=$("aiForm"),aiInput=$("aiInput");
function addFloatingAIMessage(role,text){
 if(!aiMessages)return;
 const node=document.createElement("div");
 node.className=role==="user"?"ai-msg ai-user":"ai-msg ai-bot";
 node.textContent=text;
 aiMessages.appendChild(node);
 aiMessages.scrollTop=aiMessages.scrollHeight;
 return node;
}
function cleanAIAnswer(text){
 return String(text||"")
  .replace(/\[([^\]]+)\]\((?:https?:\/\/[^)]+)\)/g,"$1")
  .replace(/(^|\s)#{1,6}\s*/g,"$1")
  .replace(/\*{1,3}([^*]+)\*{1,3}/g,"$1")
  .replace(/_{1,2}([^_]+)_{1,2}/g,"$1")
  .replace(/[\*_\x60~]/g,"")
  .replace(/^[\s•▪◦*-]+/gm,"")
  .replace(/\s{2,}/g," ")
  .trim();
}
function speakSaraswatiAnswer(text){
 if(!("speechSynthesis" in window)){if(aiVoiceStatus)aiVoiceStatus.textContent="इस ब्राउज़र में बोलकर सुनाने की सुविधा उपलब्ध नहीं है।";return}
 window.speechSynthesis.cancel();
 const spoken=cleanAIAnswer(text);
 if(!spoken)return;
 const utterance=new SpeechSynthesisUtterance(spoken);
 utterance.lang=localStorage.getItem("school_ui_language")==="en"?"en-IN":"hi-IN";
 utterance.rate=0.95;
 window.speechSynthesis.speak(utterance);
}
const aiVoiceStatus=$("aiVoiceStatus");
const aiMic=$("aiMic");
const aiVoiceLang=$("aiVoiceLang");
let aiMediaRecorder=null,aiAudioChunks=[],aiMicStream=null,aiRecordingTimer=null;
let aiVoiceLanguage=window.schoolAiVoiceLanguage||"hi-IN";
if(aiVoiceLang)aiVoiceLang.addEventListener("click",()=>{setLanguage(localStorage.getItem("school_ui_language")==="en"?"hi":"en");aiVoiceLanguage=window.schoolAiVoiceLanguage;});
async function sendVoiceToAI(blob){
 if(!blob||!blob.size){if(aiVoiceStatus)aiVoiceStatus.textContent="आवाज़ रिकॉर्ड नहीं हुई। फिर से प्रयास करें।";return}
 if(blob.size>1800000){if(aiVoiceStatus)aiVoiceStatus.textContent="रिकॉर्डिंग बड़ी है। कृपया 10–12 सेकंड में बोलें।";return}
 const pending=addFloatingAIMessage("assistant","आपकी आवाज़ समझी जा रही है…");
 addFloatingAIMessage("user","🎙️ आवाज़ से पूछा गया सवाल");
 try{
  const audioBase64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");reader.onerror=reject;reader.readAsDataURL(blob)});
  const activePage=document.querySelector(".nav-item.active")?.dataset.page||"home";
  const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:floatingAIHistory.slice(-10),preferredLanguage:localStorage.getItem("school_ui_language")==="en"?"en":"hi",audioBase64,mimeType:blob.type||"audio/webm",voiceLanguage:aiVoiceLanguage,pageContext:{page:activePage,visiblePageContent:"Saraswati Shishu Mandir, Rasulpur, Mau school website."}})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||"Voice AI अभी जवाब नहीं दे सका।");
  const answer=cleanAIAnswer(data.answer);if(!answer)throw new Error("आवाज़ का जवाब खाली मिला।");
  if(pending){pending.textContent=answer;const b=document.createElement("button");b.type="button";b.className="ai-speak-button";b.textContent="🔊 जवाब सुनें";b.addEventListener("click",()=>speakSaraswatiAnswer(answer));pending.append(document.createElement("br"),b)}
  floatingAIHistory.push({role:"assistant",content:answer});
  if(aiVoiceStatus)aiVoiceStatus.textContent="जवाब मिल गया। नीचे 🔊 जवाब सुनें दबाएँ।";
 }catch(error){if(pending)pending.textContent="आवाज़ का जवाब नहीं मिला: "+(error.message||"फिर प्रयास करें।");if(aiVoiceStatus)aiVoiceStatus.textContent="आवाज़ भेजने में समस्या हुई।"}
 finally{if(aiMessages)aiMessages.scrollTop=aiMessages.scrollHeight}
}
async function startVoiceRecording(){
 const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(SpeechRecognition){
  try{
   const recognition=new SpeechRecognition();
   recognition.lang=aiVoiceLanguage;
   recognition.continuous=false;
   recognition.interimResults=false;
   recognition.maxAlternatives=1;
   aiMic.classList.add("listening");aiMic.textContent="■";
   if(aiVoiceStatus)aiVoiceStatus.textContent="सुन रहा हूँ… अब अपना सवाल बोलें।";
   recognition.onresult=event=>{
    const transcript=event.results?.[0]?.[0]?.transcript?.trim()||"";
    aiMic.classList.remove("listening");aiMic.textContent="🎙️";
    if(!transcript){if(aiVoiceStatus)aiVoiceStatus.textContent="आवाज़ समझ नहीं आई। फिर से माइक दबाएँ।";return}
    if(aiInput){aiInput.value=transcript;if(aiVoiceStatus)aiVoiceStatus.textContent="आपका सवाल भेजा जा रहा है…";aiForm?.requestSubmit()}
   };
   recognition.onerror=event=>{
    aiMic.classList.remove("listening");aiMic.textContent="🎙️";
    if(aiVoiceStatus)aiVoiceStatus.textContent=event.error==="not-allowed"?"माइक की अनुमति दें: Chrome → Site settings → Microphone → Allow.":"आवाज़ पहचान नहीं हुई। फिर से प्रयास करें या सवाल टाइप करें।";
   };
   recognition.onend=()=>{aiMic.classList.remove("listening");aiMic.textContent="🎙️"};
   recognition.start();
   return;
  }catch(error){if(aiVoiceStatus)aiVoiceStatus.textContent="Voice recognition शुरू नहीं हुआ; रिकॉर्डिंग विकल्प आज़मा रहे हैं…"}
 }
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
  aiInput?.focus();
  if(aiVoiceStatus)aiVoiceStatus.textContent="इस ब्राउज़र में voice recognition उपलब्ध नहीं है। Chrome में खोलें या कीबोर्ड का 🎙️ दबाएँ।";
  return;
 }
 try{
  aiMicStream=await navigator.mediaDevices.getUserMedia({audio:true});
  const preferred=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":(MediaRecorder.isTypeSupported("audio/mp4")?"audio/mp4":"");
  aiMediaRecorder=new MediaRecorder(aiMicStream,preferred?{mimeType:preferred}:{});
  aiAudioChunks=[];
  aiMediaRecorder.ondataavailable=e=>{if(e.data?.size)aiAudioChunks.push(e.data)};
  aiMediaRecorder.onstop=()=>{
   const blob=new Blob(aiAudioChunks,{type:aiMediaRecorder.mimeType||"audio/webm"});
   aiMicStream?.getTracks().forEach(t=>t.stop());aiMicStream=null;
   aiMic.classList.remove("listening");aiMic.textContent="🎙️";
   if(aiVoiceStatus)aiVoiceStatus.textContent="रिकॉर्डिंग भेजी जा रही है…";
   sendVoiceToAI(blob);
  };
  aiMediaRecorder.start();
  aiMic.classList.add("listening");aiMic.textContent="■";
  if(aiVoiceStatus)aiVoiceStatus.textContent="सुन रहा हूँ… बोलने के बाद माइक फिर दबाएँ। अधिकतम 12 सेकंड।";
  aiRecordingTimer=setTimeout(()=>{if(aiMediaRecorder?.state==="recording")aiMediaRecorder.stop()},12000);
 }catch(error){
  aiMicStream?.getTracks().forEach(t=>t.stop());aiMicStream=null;
  if(aiVoiceStatus)aiVoiceStatus.textContent=error.name==="NotAllowedError"?"माइक की अनुमति दें: Chrome → Site settings → Microphone → Allow.":"माइक शुरू नहीं हुआ। Chrome में वेबसाइट खोलकर दोबारा प्रयास करें।";
 }
}
if(aiMic)aiMic.addEventListener("click",()=>{
 if(aiMediaRecorder?.state==="recording"){clearTimeout(aiRecordingTimer);aiMediaRecorder.stop();return}
 startVoiceRecording();
});
function openFloatingAI(){
 if(!aiWindow)return;
 aiWindow.classList.remove("hidden");
 aiInput?.focus();
}
$("aiLauncher")?.addEventListener("click",openFloatingAI);
$("aiMinimize")?.addEventListener("click",()=>aiWindow?.classList.add("hidden"));
$("aiClear")?.addEventListener("click",()=>{
 floatingAIHistory.length=0;
 if(aiMessages)aiMessages.innerHTML='<div class="ai-msg ai-bot"><b>नमस्ते! 🙏</b><br>मैं रीसीका मिश्रा हूँ। स्कूल और वेबसाइट से जुड़े सवाल पूछें।</div>';
});
document.querySelectorAll("[data-ai-prompt]").forEach(button=>button.addEventListener("click",()=>{
 if(!aiInput||!aiForm)return;
 aiInput.value=button.dataset.aiPrompt||"";
 openFloatingAI();
 aiForm.requestSubmit();
}));
aiForm?.addEventListener("submit",async event=>{
 event.preventDefault();
 const question=aiInput?.value.trim();
 if(!question)return;
 const send=$("aiSend");
 addFloatingAIMessage("user",question);
 aiInput.value="";
 aiInput.disabled=true;
 if(send)send.disabled=true;
 const pending=addFloatingAIMessage("assistant","जवाब तैयार हो रहा है…");
 floatingAIHistory.push({role:"user",content:question});
 try{
  const activePage=document.querySelector(".nav-item.active")?.dataset.page||"home";
  const response=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:floatingAIHistory.slice(-12),preferredLanguage:localStorage.getItem("school_ui_language")==="en"?"en":"hi",pageContext:{page:activePage,visiblePageContent:"Saraswati Shishu Mandir, Rasulpur, Mau school website. Main areas: Home, Management, Students, Teachers, Fees & Accounts, School Store, Attendance, Reports, Help."}})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||"AI सेवा अभी उपलब्ध नहीं है।");
  const answer=String(data.answer||"").trim();
  if(!answer)throw new Error("AI से खाली जवाब मिला।");
  if(pending){
   pending.textContent=answer;
   const speakButton=document.createElement("button");
   speakButton.type="button";speakButton.className="ai-speak-button";speakButton.textContent="🔊 जवाब सुनें";
   speakButton.addEventListener("click",()=>speakSaraswatiAnswer(answer));
   pending.appendChild(document.createElement("br"));pending.appendChild(speakButton);
  }
  if(aiVoiceStatus)aiVoiceStatus.textContent="जवाब मिल गया। अब जवाब सुनें।";
  speakSaraswatiAnswer(answer);
  floatingAIHistory.push({role:"assistant",content:answer});
 }catch(error){
  if(pending)pending.textContent="अभी जवाब नहीं मिला: "+(error.message||"कृपया थोड़ी देर बाद फिर प्रयास करें।");
  floatingAIHistory.pop();
 }finally{
  aiInput.disabled=false;
  if(send)send.disabled=false;
  aiInput.focus();
  if(aiMessages)aiMessages.scrollTop=aiMessages.scrollHeight;
 }
});
