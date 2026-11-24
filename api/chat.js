// Saraswati Shishu Mandir — Gemini server endpoint with safe diagnostics.
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 if(!process.env.GEMINI_API_KEY)return res.status(503).json({error:"GEMINI_API_KEY Vercel Production में मौजूद नहीं है।"});
 try{
  const body=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});
  const messages=Array.isArray(body.messages)?body.messages.slice(-12):[];
  if(!messages.length||messages.some(m=>!["user","assistant"].includes(m.role)||typeof m.content!=="string"||m.content.length>1200))return res.status(400).json({error:"संदेश सही प्रारूप में भेजें।"});
  const ctx=body.pageContext&&typeof body.pageContext==="object"?body.pageContext:{};
  const system="You are Saraswati AI, the bilingual Hindi/English assistant for Saraswati Shishu Mandir, Rasulpur, Mau, Uttar Pradesh. Always answer in the user's language, politely and simply. IMPORTANT CURRENT PAGE: "+String(ctx.page||"School website").slice(0,180)+". VISIBLE PAGE INFORMATION: "+String(ctx.visiblePageContent||"").slice(0,3500)+". Help detail: "+String(ctx.helpDetail||"").slice(0,1000)+". First interpret the user's question in the context of this current page. If the question is about this page, explain the exact visible controls and their purpose. If it concerns another school topic, help generally. Never invent school fees, dates, timings, staff names, policies, contact numbers, or actual student/payment records. For missing school-specific facts, say the office must confirm. Never claim you performed an action or accessed private data. Never request passwords, OTPs, full bank details, or sensitive information. Student-specific private information requires authorised login and verified access. Keep answers actionable and concise.";
  const contents=messages.map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));
  const url="https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key="+encodeURIComponent(process.env.GEMINI_API_KEY);
  const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,generationConfig:{temperature:0.35,maxOutputTokens:700}})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
   const detail=String(data?.error?.message||"").slice(0,300);
   console.error("Gemini API rejected request",response.status,data?.error?.status||"",detail);
   if(response.status===400||response.status===403)return res.status(502).json({error:"Gemini ने API Key या API अनुमति अस्वीकार की है। Google AI Studio में इसी Key और Generative Language API की अनुमति जाँचें।"});
   if(response.status===404)return res.status(502).json({error:"Gemini मॉडल उपलब्ध नहीं मिला। मॉडल सेटिंग जाँचनी होगी।"});
   if(response.status===429)return res.status(429).json({error:"Gemini की मुफ्त अनुरोध सीमा/कोटा पूरी हो गई है। कुछ देर बाद फिर प्रयास करें।"});
   return res.status(502).json({error:"Gemini सर्वर ने अनुरोध अस्वीकार किया (HTTP "+response.status+")। कृपया बाद में प्रयास करें।"});
  }
  const answer=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim();
  if(!answer){console.error("Gemini returned no text",JSON.stringify(data).slice(0,500));return res.status(502).json({error:"Gemini ने खाली उत्तर दिया। दोबारा प्रयास करें।"});}
  return res.status(200).json({answer});
 }catch(err){console.error("AI endpoint failed",String(err?.message||err).slice(0,300));return res.status(500).json({error:"AI सेवा में अस्थायी समस्या है। कृपया दोबारा प्रयास करें।"});}
}
