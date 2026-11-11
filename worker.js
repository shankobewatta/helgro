const MODEL = "@cf/zai-org/glm-4.7-flash";
const SITE_ORIGIN = "https://shankobewatta.github.io";

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGIN || SITE_ORIGIN;
  const allowOrigin = allowed === "*" ? "*" : (origin === allowed ? origin : allowed);
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers }
  });
}

function clean(value, max = 1200) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max);
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "Use POST for chat messages." }, 405, cors);

    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN || SITE_ORIGIN;
    if (allowed !== "*" && origin && origin !== allowed) {
      return json({ error: "This website is not allowed to use the HELGRO assistant." }, 403, cors);
    }
    if (!env.AI) return json({ error: "The Workers AI binding is not configured yet." }, 503, cors);

    let body;
    try {
      const raw = await request.text();
      if (raw.length > 16000) return json({ error: "Message is too large." }, 413, cors);
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Invalid JSON request." }, 400, cors);
    }

    const message = clean(body.message, 1200).trim();
    if (!message) return json({ error: "Please enter a question." }, 400, cors);
    const language = ["English", "Sinhala", "Tamil"].includes(body.language) ? body.language : "English";
    const farm = Array.isArray(body.farmContext) ? body.farmContext.slice(0, 20).map(item =>
      clean(JSON.stringify(item), 500)
    ).join("\n") : "No farm records were supplied.";
    const history = Array.isArray(body.history) ? body.history.slice(-8).map(item => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: clean(item.content, 1000)
    })).filter(item => item.content) : [];

    const system = `You are HELGRO, a careful and friendly agricultural assistant for small-scale farmers in Sri Lanka.
Reply only in ${language}. Use clear, simple language and practical steps. Consider Sri Lankan conditions, Maha and Yala seasons, local crops, small farms and locally available resources.
Use the farmer's farm records when relevant, but do not assume missing details. Ask one short follow-up question if crop, district, growth stage or symptoms are needed.
Never invent current market prices, government programmes, pesticide approvals or exact fertiliser doses. For fertilisers and pesticides, advise checking the current Department of Agriculture recommendation and product label. Never recommend mixing chemicals or exceeding label doses.
For animal illness, give safe first steps only and advise contacting a Veterinary Surgeon for urgent, severe or persistent symptoms. For fast-spreading crop disease or major damage, advise contacting the local agriculture instructor (Krushi Upadeshaka).
Do not claim to diagnose with certainty. Keep answers concise, usually under 180 words.
Farm records:
${farm}`;

    try {
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content: system },
          ...history,
          { role: "user", content: message }
        ],
        max_tokens: 650,
        temperature: 0.35
      });
      const reply = clean(result?.response || result?.output_text || "", 6000).trim();
      if (!reply) throw new Error("The model returned an empty response.");
      return json({ reply }, 200, cors);
    } catch (error) {
      return json({ error: "The AI service could not answer right now.", detail: clean(error?.message, 300) }, 502, cors);
    }
  }
};
