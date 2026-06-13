// Envía un carrusel ya generado a Buffer como BORRADOR (no se publica solo —
// queda esperando tu aprobación en la app de Buffer).
//
// Diseño "best effort, apagado silencioso": si falta BUFFER_API_KEY o algo
// falla, no rompe la corrida — el bot sigue funcionando igual, solo sin este
// paso. Si el carrusel ya se envió antes (existe buffer.json en su carpeta),
// no lo vuelve a enviar.

import fs from "fs";
import path from "path";
import { config } from "./config.js";

// Base pública de las imágenes generadas (repo público en GitHub).
const REPO_RAW_BASE = "https://raw.githubusercontent.com/Samipty/Mundial-bot/main";

async function call(query) {
  const key = process.env.BUFFER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.buffer.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({ query })
    });
    return await res.json();
  } catch {
    return null;
  }
}

// dir: carpeta del carrusel, ej. "./salida/CAN-vs-BIH/resultado"
// match: el JSON ya generado (necesitamos match.caption)
export async function sendToBuffer(dir, match) {
  if (!process.env.BUFFER_API_KEY) return; // función desactivada, sin ruido
  if (!config.bufferChannelId) return;

  const markerPath = path.join(dir, "buffer.json");
  if (fs.existsSync(markerPath)) return; // ya enviado antes

  const slides = fs
    .readdirSync(dir)
    .filter((f) => /^slide-\d+-.+\.png$/.test(f))
    .sort();
  if (!slides.length) return;

  // Ruta relativa tipo "salida/CAN-vs-BIH/resultado"
  const relDir = path.relative(".", dir).split(path.sep).join("/");
  const assets = slides
    .map((s) => `{ image: { url: ${JSON.stringify(`${REPO_RAW_BASE}/${relDir}/${s}`)} } }`)
    .join(",\n        ");

  const text = match.caption || "";
  const music = match.musicSuggestion;

  // Si hay sugerencia de música, va en el "sticker" de música de Instagram
  // (campo de texto libre en Buffer) en vez del caption. Elegir un sticker de
  // música cambia el post a modo "Notify Me" (schedulingType: notification):
  // Buffer no puede adjuntar la canción real (limitación de la API de
  // Instagram), así que te avisa por notificación para que la agregues tú
  // mismo en la app de Instagram al finalizar la publicación.
  const instagramMeta =
    music?.song && music?.artist
      ? `{ type: post, shouldShareToFeed: true, stickerFields: { music: ${JSON.stringify(`${music.song} - ${music.artist}`)} } }`
      : `{ type: post, shouldShareToFeed: true }`;
  const schedulingType = music?.song && music?.artist ? "notification" : "automatic";

  const query = `
    mutation SendToBuffer {
      createPost(input: {
        text: ${JSON.stringify(text)},
        channelId: "${config.bufferChannelId}",
        schedulingType: ${schedulingType},
        mode: addToQueue,
        saveToDraft: true,
        assets: [
          ${assets}
        ],
        metadata: {
          instagram: ${instagramMeta}
        }
      }) {
        ... on PostActionSuccess { post { id } }
        ... on MutationError { message }
      }
    }
  `;

  const data = await call(query);
  const post = data?.data?.createPost?.post;
  const err = data?.data?.createPost?.message || data?.errors?.[0]?.message;

  if (post?.id) {
    fs.writeFileSync(
      markerPath,
      JSON.stringify({ bufferPostId: post.id, slides: slides.length, sentAt: new Date().toISOString() }, null, 2)
    );
    console.log(`  📤 Borrador enviado a Buffer (${slides.length} imágenes): ${post.id}`);
  } else {
    console.error(`  ⚠ Buffer no aceptó el carrusel: ${err || "respuesta inesperada"}`);
  }
}

// Modo CLI (node publish.js): recorre salida/ y envía a Buffer los carruseles
// que aún no tengan buffer.json. Este paso va DESPUÉS del "git push" en el
// workflow, para que las imágenes ya existan en raw.githubusercontent.com
// cuando Buffer intente leerlas.
const isMain = path.resolve(process.argv[1] || "") === path.resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const base = "./salida";
  if (!fs.existsSync(base)) {
    console.log("Nada en salida/ todavía.");
  } else {
    let sent = 0;
    for (const matchId of fs.readdirSync(base)) {
      for (const mode of ["previa", "resultado"]) {
        const dir = path.join(base, matchId, mode);
        const matchPath = path.join(dir, "match.json");
        if (!fs.existsSync(matchPath)) continue;
        if (fs.existsSync(path.join(dir, "buffer.json"))) continue;
        const match = JSON.parse(fs.readFileSync(matchPath, "utf8"));
        console.log(`\n▶ ${matchId} [${mode}] — enviando a Buffer...`);
        await sendToBuffer(dir, match);
        if (fs.existsSync(path.join(dir, "buffer.json"))) sent++;
      }
    }
    console.log(`\n✅ Listo. ${sent} carrusel(es) nuevo(s) enviados a Buffer.`);
  }
}
