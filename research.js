// Llama a Claude con búsqueda web y devuelve el JSON del partido (previa o resultado).
import Anthropic from "@anthropic-ai/sdk";
import { PROMPTS } from "./prompt.js";
import { config } from "./config.js";

const client = new Anthropic(); // usa la variable de entorno ANTHROPIC_API_KEY

export async function research(match, mode, officialData) {
  const p = PROMPTS[mode];
  if (!p) throw new Error(`Modo desconocido: ${mode}`);
  const m = { ...match, account: match.account || config.account };

  let userText = p.user(m);
  userText += officialData
    ? `\n\nDATOS_OFICIALES (verificados, API-Football — úsalos tal cual, no los contradigas):\n${JSON.stringify(officialData, null, 2)}`
    : `\n\nDATOS_OFICIALES: no disponibles para este partido todavía. Investiga estos datos por tu cuenta con búsqueda web.`;

  const msg = await client.messages.create({
    model: config.model,
    max_tokens: 4096,
    system: p.system,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
    messages: [{ role: "user", content: userText }]
  });

  const text = msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return extractJson(text);
}

function extractJson(t) {
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s < 0 || e < 0) throw new Error("No se encontró JSON en la respuesta del modelo");
  return JSON.parse(t.slice(s, e + 1));
}
