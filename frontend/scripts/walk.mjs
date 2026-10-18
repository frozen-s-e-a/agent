// 走一遍整段回放：从第 1 屏发消息开始，逐张卡点主按钮，途中断线再重连，各屏截图。
// node scripts/walk.mjs <输出目录> [light|dark]
import { chromium } from "playwright-core";
const [, , out = "screens/walk", theme = "light"] = process.argv;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e) + "\n" + e.stack));
page.on("console", (m) => m.type() === "error" && !m.text().includes("404") && errors.push(m.text()));
const answers = [];
const base = `http://127.0.0.1:5173/?dev=0&theme=${theme}`;
const shot = async (name) => page.screenshot({ path: `${out}/${name}.png` });
const replay = () => page.evaluate(() => window.__host.replayState());
const waitCard = async (card) => {
  for (let i = 0; i < 200; i++) {
    const st = await replay();
    if (st.waitingCard === card || (!card && st.cursor >= st.total)) return st;
    await page.waitForTimeout(150);
  }
  throw new Error(`等不到 ${card ?? "结束"}：${JSON.stringify(await replay())}`);
};

await page.goto(base);
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const h = window.__host;
  const orig = h.request.bind(h);
  window.__answers = [];
  h.request = (m, p) => (m === "card.answer" && window.__answers.push(p), orig(m, p));
});
await shot("1-新建");
await page.click("text=用余额表和序时账填写应收账款底稿，期间2025年");
await page.evaluate(() => window.__host.setSpeed(20));

await waitCard("C-001");
await page.waitForTimeout(500);
await shot("2-底稿理解");
await page.locator(".card", { hasText: "请确认对底稿的理解" }).getByRole("button", { name: /确\s*认/ }).click();

// 中途断线 2 秒再重连，应补齐漏掉的事件
await page.waitForTimeout(300);
await page.evaluate(() => window.__host.setConnected(false));
await page.waitForTimeout(400);
await shot("2b-断线");
await page.waitForTimeout(1600);
await page.evaluate(() => window.__host.setConnected(true));

await waitCard("C-002").catch(() => null);
await page.waitForTimeout(500);
await shot("3-口径确认");
await page.locator(".card", { hasText: "账龄口径需要确认" }).getByRole("button", { name: "确认口径" }).click();

await waitCard("C-003");
await page.waitForTimeout(600);
await shot("4-写入确认-拟写值");
await page.locator(".card", { hasText: "确认写入底稿" }).getByRole("button", { name: "确认写入" }).click();

await waitCard(null);
await page.waitForTimeout(800);
await shot("5-结果");

// 停靠右侧 + 展开进度卡的执行记录
await page.evaluate(() => window.__store.setUi({ chatMode: "right" }));
await page.waitForTimeout(300);
await page.getByRole("button", { name: /执行记录/ }).first().click();
await page.waitForTimeout(400);
await shot("5b-停靠右侧");
// 点已写入的格看来源
await page.evaluate(() => window.__store.setUi({ chatMode: "float" }));
await page.waitForTimeout(400);

const st = await page.evaluate(() => {
  const s = window.__store.get().ev.sessions["S-41d2"];
  return { lastSeq: s.lastSeq, items: s.items.length, status: Object.values(s.tasks)[0]?.status, open: Object.values(s.cards).filter((c) => !c.answer && !c.withdrawn).map((c) => c.card.card) };
});
console.log("最终状态", JSON.stringify(st));
console.log("卡片回答", JSON.stringify(await page.evaluate(() => window.__answers)));
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
await browser.close();
