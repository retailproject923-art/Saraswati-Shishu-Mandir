// Saraswati Shishu Mandir — Gemini server endpoint with safe diagnostics.
function aiVoiceLanguagePrompt(lang){
 return lang==="en-IN"?"Listen to the user's recorded voice question, understand it in English or another language, and answer in English. If speech is unclear, politely ask them to repeat.":"इस रिकॉर्ड की गई आवाज़ को ध्यान से सुनें। सवाल हिंदी या English में हो सकता है। सवाल समझकर हिंदी में जवाब दें। अगर आवाज़ स्पष्ट न हो तो दोबारा बोलने को कहें।";
}
module.exports = async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});
 if(!process.env.GEMINI_API_KEY)return res.status(503).json({error:"GEMINI_API_KEY Vercel Production में मौजूद नहीं है।"});
 try{
  const body=typeof req.body==="string"?JSON.parse(req.body):(req.body||{});
  const messages=Array.isArray(body.messages)?body.messages.slice(-8):[];
  const audioBase64=typeof body.audioBase64==="string"?body.audioBase64:"";
  const mimeType=String(body.mimeType||"audio/webm").split(";")[0];
  if(messages.some(m=>!["user","assistant"].includes(m.role)||typeof m.content!=="string"||m.content.length>1200))return res.status(400).json({error:"संदेश सही प्रारूप में भेजें।"});
  if(!messages.length&&!audioBase64)return res.status(400).json({error:"सवाल लिखें या आवाज़ रिकॉर्ड करें।"});
  if(audioBase64&&(audioBase64.length>2500000||!mimeType.startsWith("audio/")))return res.status(413).json({error:"आवाज़ की रिकॉर्डिंग बहुत बड़ी है या उसका प्रारूप सही नहीं है। 10–12 सेकंड में बोलें।"});
  const ctx=body.pageContext&&typeof body.pageContext==="object"?body.pageContext:{};
  const selectedLanguage=body.preferredLanguage==="en"?"English":"Hindi (Devanagari)";
  const lastUserText=[...messages].reverse().find(m=>m.role==="user")?.content||"";
  const devanagariCount=(lastUserText.match(/[\u0900-\u097F]/g)||[]).length;
  const romanHindiWords=/\b(kaise|kya|kyun|kyu|hai|hain|ho|hu|hum|mera|meri|mere|aap|apka|apni|mujhe|karna|karo|chahiye|batao|samjhao|nahi|nahin|haan|aur|mein|me|se|ko|ki|ke|ka|par|kahan|kab|kitna|kitni|kaun)\b/i;
  const englishWords=/\b(the|what|how|why|when|where|which|can|could|would|should|please|explain|tell|give|help|is|are|was|were|do|does|did|my|your|we|they|this|that|with|about|for|from)\b/i;
  const responseLanguage=audioBase64?(body.voiceLanguage==="en-IN"?"English":"Hindi (Devanagari)"):(devanagariCount>0?"Hindi (Devanagari)":(romanHindiWords.test(lastUserText)?"Hindi (Devanagari)":(englishWords.test(lastUserText)?"English":selectedLanguage)));
  const system="You are Reesika Mishra (रीसीका मिश्रा), the bilingual Hindi/English AI assistant for Saraswati Shishu Mandir, Rasulpur, Mau, Uttar Pradesh. RESPONSE LANGUAGE RULE (must follow): Reply in "+responseLanguage+". Hindi typed in Devanagari or clear Romanized Hindi/Hinglish must receive Hindi in Devanagari; English questions must receive English. The website language selector changes interface labels only; it must not override the language the user typed. If the latest question is too short or ambiguous, use the selected website language ("+selectedLanguage+"). Do not answer Romanized Hindi. Use one language consistently. Politely and simply. IMPORTANT CURRENT PAGE: "+String(ctx.page||"School website").slice(0,180)+". VISIBLE PAGE INFORMATION: "+String(ctx.visiblePageContent||"").slice(0,3500)+". Help detail: "+String(ctx.helpDetail||"").slice(0,1000)+". First interpret the user's question in the context of this current page. If the question is about this page, explain the exact visible controls and their purpose. If it concerns another school topic, help generally. Answer ordinary everyday questions and general knowledge directly from your knowledge; do not restrict yourself only to school or the current page. TEXTBOOK EXERCISE RESTRICTION (strict and narrow): If a student explicitly asks for a particular textbook's exercise/question by its book location or sequence—for example, 'Science, lesson 1, question 1', 'the first question at the end of chapter 2', or 'give the answer to question 5 from this named textbook'—do NOT provide that specific textbook exercise answer. Instead reply in Hindi: 'किताब के निर्धारित प्रश्न का उत्तर पाने के लिए कृपया स्कूल ऑफिस या अपने शिक्षक से संपर्क करें।' If response language is English, reply: 'Please contact the school office or your teacher for the answer to a specific textbook exercise question.' This restriction applies only to direct requests for specific textbook exercise questions/answers. Otherwise, answer normally and helpfully: solve maths calculations and word problems, explain concepts, answer Hindi/English language questions, science and social-science concept questions, general knowledge (GK), multiple-choice/ABCD questions, and other subject questions. Do not refuse or send these ordinary learning questions to the office just because they are school subjects. If a question is ambiguous, answer the general concept rather than assume it is a specific textbook exercise. Never invent school-specific facts. For live/current information or facts that may have changed, be transparent if you cannot verify them; never pretend to have live internet access. Never invent school fees, dates, timings, staff names, policies, contact numbers, or actual student/payment records. For missing school-specific facts, say the office must confirm. Never claim you performed an action or accessed private data. Never request passwords, OTPs, full bank details, or sensitive information. Student-specific private information requires authorised login and verified access. When a question genuinely benefits from a visual, include a chart block exactly as: ```chart\n{"title":"...","labels":["..."],"values":[1,2]}\n```. Use only numbers from the question or clearly labeled illustrative data; never invent data as facts. Use charts for comparisons, statistics, or numerical explanations. For a relevant photo/illustration, include Markdown image syntax ![short description](https://valid-known-image-url) only when you know a real reliable image URL; never fabricate or guess URLs. If no verified image source is available, explain the concept with a simple text diagram rather than inventing a photo. Keep ordinary answers text-only when a visual adds no value. Keep answers actionable and concise. Avoid repeating the same keyword, word, or sentence. Use simple Markdown paragraphs when helpful, and allow the specified chart block or verified image syntax. Keep text suitable for speaking aloud. Answer only once, naturally and briefly.";
  const contents=messages.map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));
  if(audioBase64){
   const voicePrompt=aiVoiceLanguagePrompt(body.voiceLanguage);
   contents.push({role:"user",parts:[{text:voicePrompt},{inline_data:{mime_type:mimeType,data:audioBase64}}]});
  }
  // Primary model plus automatic fallback for temporary capacity errors.
  const modelCandidates=["gemini-3.5-flash-lite","gemini-3.1-flash-lite","gemini-3.8-flash"];
  let response,data={},activeModel="";
  for(const model of modelCandidates){
   activeModel=model;
   const url="https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent";
   response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,generationConfig:{temperature:0.25,maxOutputTokens:500}}),signal:AbortSignal.timeout(22000)});
   data=await response.json().catch(()=>({}));
   if(response.ok){console.info("Gemini response received",model,response.status);break;}
   const status=response.status;
   const detail=String(data?.error?.message||"").slice(0,300);
   console.error("Gemini model request failed",model,status,data?.error?.status||"",detail);
   if((status===503||status===429)&&model!==modelCandidates[modelCandidates.length-1]){
    console.warn("Trying backup Gemini model after temporary capacity/quota response.");
    continue;
   }
   break;
  }
  if(!response.ok){
   const status=response.status;
   if(status===400||status===403)return res.status(502).json({error:"Gemini ने API Key या API अनुमति अस्वीकार की है। Google AI Studio में इसी Key और Generative Language API की अनुमति जाँचें।"});
   if(status===404)return res.status(502).json({error:"Gemini का उपलब्ध मॉडल नहीं मिला। API मॉडल की उपलब्धता जाँचनी होगी।"});
   if(status===429)return res.status(429).json({error:"Gemini की अनुरोध सीमा/कोटा पूरी हो गई है। कुछ देर बाद फिर प्रयास करें।"});
   if(status===503)return res.status(503).json({error:"Gemini के सभी उपलब्ध मॉडल अभी व्यस्त हैं। कृपया थोड़ी देर बाद फिर प्रयास करें।"});
   return res.status(502).json({error:"Gemini सर्वर ने अनुरोध अस्वीकार किया (HTTP "+status+")। कृपया बाद में प्रयास करें।"});
  }
  const answer=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim();
  if(!answer){console.error("Gemini returned no text",JSON.stringify(data).slice(0,500));return res.status(502).json({error:"Gemini ने खाली उत्तर दिया। दोबारा प्रयास करें।"});}
  return res.status(200).json({answer});
 }catch(err){console.error("AI endpoint failed",String(err?.message||err).slice(0,300));return res.status(err?.name==="TimeoutError"||err?.name==="AbortError"?504:500).json({error:err?.name==="TimeoutError"||err?.name==="AbortError"?"AI जवाब देने में समय ले रहा है। कृपया छोटा सवाल भेजकर फिर प्रयास करें।":"AI सेवा में अस्थायी समस्या है। कृपया दोबारा प्रयास करें।"});}
}
