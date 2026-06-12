# Mundial 2026 · Bot de carruseles (previa + resultado)

Por cada partido genera DOS carruseles profundos: una **previa** (antes) y un
**resultado** (después). El bot decide cuál toca según la hora del partido.

```
  fixtures.json ──► run.js ──► research.js (Claude + web)
                         │            │
                         │            ├─ previa  ─► match.json ─► render ─► slides
                         │            └─ resultado─► match.json ─► render ─► slides
                         └─ decide modo según la hora del partido
```

## Preparación (una sola vez) — Windows

1. **Descomprime** el zip. Te queda la carpeta `mundial-bot`.
2. **Instala Node.js LTS** desde nodejs.org (instalación normal).
3. **API key de Anthropic** en console.anthropic.com (tiene costo por uso).
4. **Abre la terminal en la carpeta:** abre `mundial-bot`, clic en la barra de
   dirección, escribe `cmd` y Enter.
5. Instala dependencias (descarga el Chrome interno, tarda un par de minutos):
   ```
   npm install
   ```
6. Pega tu API key (en PowerShell):
   ```
   $env:ANTHROPIC_API_KEY="sk-ant-tu-clave"
   ```
   (En cmd clásico:  `set ANTHROPIC_API_KEY=sk-ant-tu-clave`)
   Nota: dura mientras la ventana esté abierta. Para fijarla, usa
   "Editar variables de entorno del sistema" en Windows.

## Uso

```
node run.js                 # genera lo que toque AHORA según la hora de cada partido
node run.js --all           # genera TODO: previa + resultado de todo el calendario
node run.js --all --previa  # solo previas de todo (ideal primera prueba)
```

Sin `--all`, el bot solo arma:
- la **previa** de partidos que arrancan dentro de las próximas 48 h, y
- el **resultado** de partidos que terminaron hace poco (config en `config.js`).

Cada partido crea:
```
salida/MEX-vs-RSA/previa/      match.json + slide-*.png
salida/MEX-vs-RSA/resultado/   match.json + slide-*.png
```
Revisa, ajusta el `match.json` si quieres (y vuelve a abrirlo en el generador),
y publica subiendo los PNG. Cada carpeta = una publicación.

## Dejarlo "automático" con GitHub (recomendado)

Esto hace que la generación corra sola, en los servidores de GitHub, sin que tu
PC esté encendida. Es gratis para este uso. Pasos (todo desde el navegador o
GitHub Desktop, sin terminal):

1. **Crea una cuenta en github.com** si no tienes una (gratis).

2. **Crea un repositorio nuevo:** botón verde "New" → ponle un nombre, por
   ejemplo `mundial-bot` → puede ser privado → "Create repository".

3. **Sube esta carpeta completa.** La forma más fácil:
   - Instala **GitHub Desktop** (desktop.github.com).
   - "Add an Existing Repository from your Hard Drive" → selecciona la carpeta
     `mundial-bot`.
   - Si te pregunta, "create a repository here" y luego "Publish repository",
     eligiendo el repositorio que creaste en el paso 2.

4. **Agrega tu API key como "Secret"** (nunca va en el código):
   - En la página de tu repositorio en github.com → **Settings** →
     **Secrets and variables** → **Actions** → **New repository secret**.
   - Nombre: `ANTHROPIC_API_KEY`   Valor: tu clave `sk-ant-...`.

5. **Pruébalo manualmente:** pestaña **Actions** → "Mundial Carrusel Bot" →
   botón **Run workflow**. Tarda unos minutos. Cuando termine, revisa la
   carpeta `salida/` dentro del repositorio (en github.com se ven las imágenes
   directamente, incluso desde el celular con la app de GitHub).

Después de esto, el workflow corre solo 3 veces al día (puedes ajustar el
horario editando `.github/workflows/mundial-bot.yml`, línea `cron`). Cada
corrida sube los PNG y `match.json` nuevos al repositorio para que los revises
y publiques.

## Dejarlo "automático" (alternativa: tu PC con Windows)

Programa `node run.js` con el **Programador de tareas**. Requiere que tu PC
esté encendida a esa hora.


## Notas

- `generator.html` es el motor con sus DOS modos (previa/resultado). Si lo
  mejoras, reemplaza el archivo y el bot usa la nueva versión.
- Verifica en docs.claude.com el nombre del modelo (`config.js`) y la versión de
  la herramienta de búsqueda (`research.js`).
- `fixtures.json` trae el Grupo A. Agrega los demás grupos con el mismo formato.
- Volumen: con carrusel por partido, un día de 4 partidos = hasta 8 posts (4
  previas + 4 resultados). Si en algún momento es demasiado, podemos añadir un
  modo "resumen del día". El motor de resumen quedaría como segunda fase.
- Publicación automática a Instagram: segunda fase, cuando pases de aprobar cada
  uno a posteo directo vía la API de Meta.
