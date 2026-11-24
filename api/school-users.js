// Secure school account creation and User-ID login.
// Requires SUPABASE_SECRET_KEY in Vercel Production. Never expose this key in the browser.
const SUPABASE_URL="https://gnyhushvxqquvxepkinw.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_lrP4onruHeKnZwgkeBjUPg_Yk3ik6-7";
const json=(res,status,body)=>res.status(status).json(body);
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
 const service=process.env.SUPABASE_SECRET_KEY;
 if(!service)return json(res,503,{error:"Management account setup pending: Vercel Production में SUPABASE_SECRET_KEY जोड़ना बाकी है।"});
 try{
  const body=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});
  const action=String(body.action||"");
  const headers={apikey:service,"Content-Type":"application/json"};
  if(action==="login"){
   const loginId=String(body.login_id||"").trim();
   const password=String(body.password||"");
   if(!loginId||!password)return json(res,400,{error:"User ID और password दोनों भरें।"});
   const lookup=await fetch(SUPABASE_URL+"/rest/v1/profiles?login_id=ilike."+encodeURIComponent(loginId)+"&select=phone,is_active,role&limit=1",{headers});
   const rows=await lookup.json().catch(()=>[]);
   if(!lookup.ok)return json(res,503,{error:"User ID जाँच नहीं हो सकी।"});
   const p=rows?.[0];
   if(!p||!p.is_active||!p.phone)return json(res,403,{error:"यह User ID अभी अप्रूव/सक्रिय नहीं है।"});
   const sign=await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:SUPABASE_ANON_KEY,"Content-Type":"application/json"},body:JSON.stringify({phone:p.phone,password})});
   const session=await sign.json().catch(()=>({}));
   if(!sign.ok)return json(res,401,{error:session.msg||session.message||session.error_description||"User ID या password गलत है।"});
   return json(res,200,{session:{access_token:session.access_token,refresh_token:session.refresh_token}});
  }
  if(action!=="create")return json(res,400,{error:"Invalid action"});
  const auth=(req.headers.authorization||"").replace(/^Bearer\s+/i,"");
  if(!auth)return json(res,401,{error:"Management login जरूरी है।"});
  const who=await fetch(SUPABASE_URL+"/auth/v1/user",{headers:{apikey:SUPABASE_ANON_KEY,Authorization:"Bearer "+auth}});
  const caller=await who.json().catch(()=>({}));
  if(!who.ok||!caller.id)return json(res,401,{error:"लॉगिन सत्र समाप्त है। दोबारा लॉगिन करें।"});
  const pr=await fetch(SUPABASE_URL+"/rest/v1/profiles?id=eq."+encodeURIComponent(caller.id)+"&select=role,is_active",{headers});
  const profiles=await pr.json().catch(()=>[]);
  const admin=profiles?.[0];
  if(!admin?.is_active||!["owner","principal","management"].includes(admin.role))return json(res,403,{error:"केवल सक्रिय Management/Owner अकाउंट यह काम कर सकता है।"});
  const fullName=String(body.full_name||"").trim();
  const phone=String(body.phone||"").replace(/[\s()-]/g,"");
  const loginId=String(body.login_id||"").trim();
  const password=String(body.password||"");
  const role=String(body.role||"");
  const allowed=["management","accountant","teacher","staff","parent","student"];
  if(!fullName||!/^\+[1-9]\d{7,14}$/.test(phone)||!/^[A-Za-z0-9._-]{4,32}$/.test(loginId)||password.length<8||!allowed.includes(role))return json(res,400,{error:"नाम, +91 सहित सही फोन, 4–32 अक्षर का User ID, कम-से-कम 8 अक्षर का password और सही भूमिका भरें।"});
  if(admin.role==="management"&&role==="management")return json(res,403,{error:"Management अकाउंट केवल Owner/Principal बना सकता है।"});
  const dup=await fetch(SUPABASE_URL+"/rest/v1/profiles?login_id=ilike."+encodeURIComponent(loginId)+"&select=id&limit=1",{headers});
  const duplicate=await dup.json().catch(()=>[]);
  if(duplicate?.length)return json(res,409,{error:"यह User ID पहले से मौजूद है। दूसरा User ID चुनें।"});
  const created=await fetch(SUPABASE_URL+"/auth/v1/admin/users",{method:"POST",headers,body:JSON.stringify({phone,password,phone_confirm:true,user_metadata:{full_name:fullName,role,login_id:loginId}})});
  const user=await created.json().catch(()=>({}));
  if(!created.ok)return json(res,400,{error:user.msg||user.message||user.error_description||"अकाउंट नहीं बन पाया। Phone Auth provider और फोन नंबर जाँचें।"});
  const saved=await fetch(SUPABASE_URL+"/rest/v1/profiles?id=eq."+encodeURIComponent(user.id),{method:"PATCH",headers:{...headers,Prefer:"return=minimal"},body:JSON.stringify({full_name:fullName,phone,login_id:loginId,role,is_active:true})});
  if(!saved.ok){console.error("Profile update failed",saved.status,await saved.text());return json(res,500,{error:"Auth अकाउंट बन गया, लेकिन प्रोफाइल अपडेट नहीं हुआ। Owner से संपर्क करें।"});}
  return json(res,201,{ok:true,user_id:loginId,phone,role,message:"अकाउंट बन गया और सक्रिय कर दिया गया।"});
 }catch(e){console.error("school-users endpoint",String(e?.message||e));return json(res,500,{error:"सर्वर में अस्थायी समस्या है।"});}
}
