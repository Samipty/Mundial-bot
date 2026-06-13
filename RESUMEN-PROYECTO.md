# Cara o Cruz (@caraocruzfutbol) — Resumen del proyecto

Cuenta de Instagram en español sobre el Mundial 2026 (previas y resultados),
automatizada con GitHub Actions. Repo: **github.com/Samipty/Mundial-bot** (público).

## Branding

- **Bio:** "Previa o resultado: las dos caras del partido. Dato real + el ángulo
  que no esperabas. ⚽ Mundial 2026"
- **Colores:** fondo oscuro `#0A0E14`, acento lima `#C6F432`, dorado `#E8B800`,
  coral `#FF4D5E`
- **Logo:** pendiente — hay un prompt ya redactado (moneda/escudo partido a la
  mitad, sin texto) para generar en DALL-E/ChatGPT
- **Equipos cubiertos (12):** México, Brasil, España, Francia, Argentina,
  Portugal, Colombia, Inglaterra, Panamá, Nueva Zelanda, EE.UU., Canadá —
  37 partidos en `fixtures.json`, grupos A, B, C, D, G, H, I, J, K, L

## Arquitectura (archivos en raíz del repo)

| Archivo | Función |
|---|---|
| `fixtures.json` | 37 partidos: `id`, `stage`, `a`/`b` {name,code}, `venue`, `datetime`, `kickoff` (ISO) |
| `generator.html` | Generador de carrusel (Puppeteer). Modo previa = 6 slides, resultado = 7 slides |
| `config.js` | Cuenta, `bufferChannelId`, modelo Claude, ventanas de tiempo (`previaWindowHours: 48`, `resultadoAfterHours: 2.5`, `resultadoLookbackHours: 24`) |
| `prompt.js` | Prompts para Claude (modo previa/resultado). Esquema incluye `caption` (texto del post + hashtags) y `musicSuggestion` {song, artist} |
| `research.js` | Llama a Claude con `web_search` (max_uses:8), inyecta `DATOS_OFICIALES` si hay |
| `sportsdata.js` | API-Football (`x-apisports-key`, league=1, season=2026). `getForm`, `getHeadToHead`, `getFixtureResult`. Degrada a `null` sin romper si falla |
| `render.js` | Puppeteer → PNGs por slide |
| `run.js` | Orquestador. `modesDue()` decide previa/resultado según `kickoff` vs ahora. Salta si `match.json` ya existe (salvo `--all`) |
| `publish.js` | `sendToBuffer(dir, match)` — crea borrador en Buffer; CLI mode escanea `salida/*/{previa,resultado}/match.json` sin `buffer.json` y los envía |
| `.github/workflows/mundial-bot.yml` | Cron `0 6,14,22 * * *` + manual. **4 pasos**: (1) `node run.js`, (2) commit+push `salida/`+`cache/`, (3) `node publish.js`, (4) commit+push marcadores `buffer.json` |
| `README.md` | Setup completo: GitHub Desktop, Secrets, API-Football, Buffer |

**Secrets de GitHub** (ya configurados): `ANTHROPIC_API_KEY` (obligatoria),
`API_SPORTS_KEY` (opcional), `BUFFER_API_KEY` (opcional).

## Buffer — detalles técnicos

- `organizationId`: `6a2c879197191e3c4c712707`
- `channelId` (Instagram @caraocruzfutbol): `6a2c8db338b55793458cfd3e`
- Imágenes se referencian vía `raw.githubusercontent.com/Samipty/Mundial-bot/main/salida/<id>/<modo>/slide-N-*.png`
  — **deben estar ya en GitHub (pasos 1-2) antes de llamar a Buffer (paso 3)**,
  si no Buffer responde `"Failed to fetch image dimensions: Not Found"`.
- `createPost`: `assets` (imagen por slide) + `text` (= `match.caption`) +
  `channelId` + `mode: addToQueue` + `saveToDraft: true` +
  `metadata.instagram: { type: post, shouldShareToFeed: true, stickerFields? }`
- **Música**: si `match.musicSuggestion` existe →
  `stickerFields: { music: "Canción - Artista" }` y `schedulingType: notification`
  (en vez de `automatic`). Esto activa el modo "Notify Me" de Buffer: el usuario
  recibe una notificación al celular, abre Instagram, agrega la canción real
  desde el buscador de música de Instagram, y publica manualmente. Buffer NO
  puede adjuntar canciones reales vía API (limitación de Instagram).
- ⚠️ Sin confirmar: si el sticker de música de Instagram funciona en
  publicaciones tipo **carrusel** (históricamente solo aplicaba a fotos/videos
  individuales).
- `publish.js` escribe `dir/buffer.json` `{bufferPostId, slides, sentAt}` como
  marcador de "ya enviado" — evita duplicados.

## Estado actual (13 jun 2026)

Carruseles generados y enviados a Buffer como borradores:

- **Brasil vs Marruecos** (previa) — caption + sugerencia musical (Anitta -
  "Envolver") escritos a mano y entregados al usuario (se generó antes de que
  `caption`/`musicSuggestion` existieran en el esquema)
- **Canadá vs Bosnia y Herzegovina** (resultado, 1-1) — sin caption original;
  ya se le entregó al usuario un caption + música (The Weeknd - "Blinding
  Lights") para pegar manualmente en Buffer
- **Corea del Sur vs Chequia** (resultado, 2-1) — mismo caso; caption + música
  (BTS - "Dynamite") entregados para pegar manualmente
- **EE.UU. vs Paraguay** (resultado) — el usuario confirmó que está "listo
  para publicar" tal cual (sin caption, no se generó uno)

**Próximo hito natural:** las previas del 15 de junio (IRN-vs-NZL, ESP-vs-CPV)
serán las primeras en pasar por el flujo completo de 4 pasos con
`caption`+`musicSuggestion` desde el inicio (generación → push → Buffer →
marcador), sin intervención manual.

## Decisiones y aprendizajes clave

- El split en 4 pasos del workflow (generar → push código → enviar a Buffer →
  push marcadores) fue la corrección crítica: antes, `sendToBuffer` se llamaba
  ANTES del push y Buffer no encontraba las imágenes.
- `modesDue()`: la ventana de "resultado" es de `resultadoAfterHours` (2.5h)
  a `resultadoLookbackHours` (24h) después del kickoff. Si se borra
  `match.json` de un partido FUERA de esa ventana, no se regenera solo (ni con
  `--all` vía el workflow normal, que no acepta flags desde la UI de Actions).
- `publish.js` en modo CLI revisa TODOS los `salida/*/{previa,resultado}/`
  sin `buffer.json` — incluyendo carruseles viejos generados antes de que
  `publish.js` existiera. Por eso aparecieron en Buffer Canadá/Corea/USA con
  caption vacío en una corrida automática.

## Contenido evergreen ya preparado (no atado a un partido)

**10 plantillas de post genéricas** (formato Cara o Cruz, con `[placeholders]`
para rellenar): predicción "Cara o Cruz" del día, dato curioso, "tu 11 ideal",
frase del día, resumen de jornada, sorpresa del torneo, estadio del día,
"Cara o Cruz" de goleador, antes/ahora histórico, "mi selección". (Texto
completo entregado al usuario en el chat; se puede regenerar si se necesita.)

**10 canciones sugeridas** (formato `Canción - Artista` para el campo de
música de Buffer): 4 himnos oficiales de Mundiales (Waka Waka-Shakira, Live It
Up, Hayya Hayya, We Are One), + por selección: Envolver-Anitta (Brasil),
TQG-Karol G & Shakira (Colombia), Hecha Pa'Mi-Boza y Otro Trago-Sech (Panamá),
Sweet Caroline-Neil Diamond (Inglaterra), Vivir Mi Vida-Marc Anthony (genérico).

## Pendientes

- Generar y subir el logo al perfil de Instagram
- Verificar si el sticker de música funciona en carruseles de Instagram
- Confirmar que Canadá/Corea reciban su caption+música pegados manualmente en
  Buffer
- Seguir el primer ciclo completo automático (15 de junio) y revisar que
  `schedulingType: notification` + `saveToDraft: true` no genere errores

## Bug conocido (corregido, no retroactivo)

`run.js` no le pasaba el handle de la cuenta a Claude (`Cuenta: undefined` en
el prompt), así que Claude inventó `@mundialaldia` como placeholder para el
campo `account`. Esto quedó "quemado" en las imágenes (marca de agua +
CTA final "Sigue @mundialaldia →") de **Brasil-Marruecos (previa)**,
**Canadá-Bosnia (resultado)** y **Corea-Chequia (resultado)** — sus 3
borradores en Buffer.

**Corregido** (13 jun): `run.js` ahora pasa `account: config.account`
(`@caraocruzfutbol`) a `research()`. Todo lo generado desde esa corrección en
adelante sale correcto (USA-Paraguay ya salió bien, por casualidad, antes del
fix).

**Decisión:** los 3 borradores ya creados con el handle equivocado se
publican igual tal cual — no se regeneran. Error de marca menor, aceptado
como parte de los primeros posts.
