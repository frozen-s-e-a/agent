// 用预装的 Chromium 截图：node scripts/shot.mjs <url路径> <输出png> [宽] [高] [等待毫秒] [点击脚本js]
import { chromium } from "playwright-core";
const [, , path, out, w = "1440", h = "900", wait = "1200", script] = process.argv;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`http://127.0.0.1:5173${path}`);
await page.waitForTimeout(Number(wait));
if (script) {
  const fn = new Function("page", `return (async () => { ${script} })()`);
  await fn(page);
}
await page.screenshot({ path: out });
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
await browser.close();
