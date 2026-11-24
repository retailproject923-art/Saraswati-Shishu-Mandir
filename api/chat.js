// Saraswati Shishu Mandir — protected Vercel serverless AI endpoint.
// Configure AI_GATEWAY_API_KEY in Vercel before enabling live AI.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.AI_GATEWAY_API_KEY) return res.status(503).json({ error: "AI सेवा अभी सक्रिय नहीं है। AI Gateway key जोड़ने के बाद यह सुविधा चालू होगी।" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    if (!messages.length || messages.some(m => !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > 1200)) return res.status(400).json({ error: "संदेश सही प्रारूप में भेजें।" });
    const system = "You are Saraswati AI, the bilingual Hindi/English digital assistant for Saraswati Shishu Mandir, Rasulpur, Mau, Uttar Pradesh. Be warm, concise and practical. Reply in the user language. Explain general website navigation, admission enquiry steps, fee payment process, school store ordering, homework, attendance, notices and login help. Never invent school timings, fees, admission dates, policies, phone numbers or staff names. If exact school information is unknown, say so and direct the user to the school office. Never claim to access student records, payment status or private data. Never request passwords, OTPs, full bank details or sensitive personal data. For private student-specific questions, explain that authorised secure login is required. Keep answers simple for parents and students.";
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + process.env.AI_GATEWAY_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.AI_MODEL || "google/gemini-3.1-flash-lite", messages: [{ role: "system", content: system }, ...messages], temperature: 0.4, max_tokens: 700 })
    });
    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: "AI सेवा से अभी उत्तर नहीं मिल पाया। कृपया दोबारा प्रयास करें।" });
    const answer = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (typeof answer !== "string" || !answer.trim()) return res.status(502).json({ error: "AI ने खाली उत्तर दिया। दोबारा प्रयास करें।" });
    return res.status(200).json({ answer: answer.trim() });
  } catch (error) { return res.status(500).json({ error: "चैट सेवा में अस्थायी समस्या है। कृपया थोड़ी देर बाद प्रयास करें।" }); }
}
