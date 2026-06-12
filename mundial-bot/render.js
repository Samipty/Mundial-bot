// Render headless: carga el generador, inyecta el JSON y captura cada slide a PNG.
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

export async function renderMatch(matchJson, generatorPath, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 620, height: 800, deviceScaleFactor: 2 });

    const url = "file://" + path.resolve(generatorPath);
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);

    await page.evaluate((obj) => window.importState(obj), matchJson);

    await page.evaluate(() => {
      const sc = document.getElementById("scaler");
      if (sc) sc.style.transform = "none";
      const vp = document.getElementById("viewport");
      if (vp) { vp.style.overflow = "visible"; vp.style.width = "540px"; vp.style.height = "auto"; }
      const tr = document.getElementById("track");
      if (tr) { tr.style.transform = "none"; tr.style.display = "block"; }
    });

    await new Promise((r) => setTimeout(r, 400));

    const slides = await page.$$(".slide");
    const files = [];
    for (let i = 0; i < slides.length; i++) {
      const key = await slides[i].evaluate((el) => el.getAttribute("data-key"));
      const file = path.join(outDir, `slide-${i + 1}-${key}.png`);
      await slides[i].screenshot({ path: file });
      files.push(file);
    }
    return files;
  } finally {
    await browser.close();
  }
}
