// 连真实宿主走一遍：真实的 Harness（固定版本 + 桥接插件 + 审计工具服务）+ 假模型 + 测试用 OA 服务。
// 首次使用 → 连模型 → 建项目 → 加资料 → 发消息（调审计工具、出产出）→ 打开产出 → 追问卡 → 动作确认卡 → 刷新页面后历史还在。
// 先 cd ../harness && npm ci。用法：node scripts/walk-real.mjs <截图目录> [light|dark]
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { fakeModel } from "../../harness/test/fake-model.mjs";
import { AppHost } from "../../app-host/host.mjs";
import { createServer } from "../../app-host/server.mjs";

const [, , out = "screens/real", theme = "light"] = process.argv;
fs.mkdirSync(out, { recursive: true });
const here = path.dirname(fileURLToPath(import.meta.url));
const python = process.env.AUDIT_TEST_PYTHON ?? "python3";
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "walk-real-"));
const oaLog = path.join(scratch, "oa.log");

// 资料：项目外的一张余额表
const src = path.join(scratch, "外部资料", "科目余额表2025.xlsx");
fs.mkdirSync(path.dirname(src), { recursive: true });
execFileSync(python, ["-c", `import pandas as pd; pd.DataFrame({'科目编码':['1001','1002','1122','2202'],'科目名称':['库存现金','银行存款','应收账款','应付账款'],'期初余额':[1200.5,880000,1250000,-640000],'期末余额':[980.25,1035000,1835000,-712500]}).to_excel(r'''${src}''', index=False)`]);

const question = { id: "q1", question: "应付账款按什么口径列示？", options: [{ label: "按期末余额（贷方为负）" }, { label: "取绝对值" }] };
const model = await fakeModel({
  script: [
    { text: "我先从余额表里提取科目和期末余额。", tools: [{ name: "mcp__audit__select_column", args: { folder_path: "资料/科目余额表2025.xlsx", should_merge: "是", sheet_keywords: "", columns_to_keep: "科目编码,科目名称,期末余额" } }] },
    { text: "已提取 4 个科目的期末余额，结果放在「合并列提取结果.xlsx」里，可以在左侧成果里打开。" },
    { tools: [{ name: "ask_user_question", args: { questions: [question] } }] },
    (body) => ({ text: body.messages.some((m) => m.role === "tool" && String(m.content).includes("取绝对值")) ? "好，应付账款按绝对值 712,500.00 列示。" : "好，按期末余额列示，应付账款为 -712,500.00。" }),
    { text: "我先查一下这张报销单，再提交审批。", tools: [{ name: "mcp__oa__query_expense", args: { billNo: "BX-2025-1188" } }, { name: "mcp__oa__approve", args: { billNo: "BX-2025-1188", opinion: "同意" } }] },
    { text: "已在 OA 里审批通过 BX-2025-1188。" },
  ],
});

const host = new AppHost({ dataDir: path.join(scratch, "data"), python, harnessEnv: { FAKE_MCP_LOG: oaLog } });
// 外部 MCP 服务先在宿主里加好（设置页的添加流程另测）
await host.dispatch("mcp.add", { name: "oa", title: "OA 系统", enabled: true, transport: "stdio", command: process.execPath, args: [path.join(here, "..", "..", "app-host", "test", "fake-mcp.mjs")], env: { FAKE_MCP_LOG: oaLog } });
await host.dispatch("mcp.update", { name: "oa", tools: [{ tool: "query_expense", sideEffect: "readonly" }] });
const server = createServer(host);
await new Promise((r) => server.listen(8787, "127.0.0.1", r));
const vite = spawn(process.execPath, [path.join(here, "..", "node_modules", "vite", "bin", "vite.js"), "--mode", "real", "--port", "5174", "--strictPort"], { cwd: path.join(here, ".."), stdio: "pipe" });
await new Promise((resolve) => vite.stdout.on("data", (d) => String(d).includes("Local") && resolve()));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e) + "\n" + e.stack));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const lastText = () => page.locator(".msg-ai .text").last().innerText();
const waitText = async (re, ms = 30000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const t = await lastText().catch(() => "");
    if (re.test(t)) return t;
    await page.waitForTimeout(150);
  }
  throw new Error(`等不到回复 ${re}：${await lastText().catch(() => "")}`);
};
const step = (s) => console.log("·", s);

try {
  await page.goto(`http://127.0.0.1:5174/?theme=${theme}`);
  await page.getByText("开始之前").waitFor();
  step("首次使用：连接模型");
  await page.getByPlaceholder(/OpenAI 兼容格式/).fill(model.baseURL.replace(/\/v1$/, ""));
  await page.getByPlaceholder("粘贴 API Key").fill("sk-walk");
  await page.getByRole("button", { name: "测试连接" }).click();
  await page.getByText(/连接正常/).waitFor();
  await shot("1-连接模型");
  await page.getByRole("button", { name: "下一步" }).click();

  step("新建项目");
  await page.getByPlaceholder(/项目名称/).fill("华东示例制造 2025年报审计");
  await page.getByPlaceholder(/项目文件夹/).fill(path.join(scratch, "华东示例制造2025"));
  await shot("2-新建项目");
  await page.getByRole("button", { name: /创\s*建/ }).click();
  await page.getByText("要做什么？").waitFor({ timeout: 30000 });

  step("加资料");
  await page.locator(".side-tab", { hasText: "资料" }).click().catch(() => {});
  // 按路径 setInputFiles 在这个环境里不触发 change，直接给文件内容
  await page.locator(".side-actions input[type=file]").setInputFiles({ name: "科目余额表2025.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: fs.readFileSync(src) });
  await page.locator(".file-row", { hasText: "科目余额表2025.xlsx" }).waitFor();
  await shot("3-资料已加入");

  step("发消息：调审计工具，出产出");
  const input = page.locator(".composer textarea");
  await input.fill("从余额表里提取各科目的期末余额");
  await input.press("Enter");
  await waitText(/已提取 4 个科目/);
  await page.waitForTimeout(400);
  await shot("4-工具调用和回复");

  step("打开产出");
  await page.locator(".tool-row .chip.ref").first().click();
  await page.locator(".sheet-tab, .ws-tab", { hasText: "合并列提取结果" }).first().waitFor({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await shot("5-打开产出");

  step("追问卡");
  await input.fill("应付账款怎么列示");
  await input.press("Enter");
  const qcard = page.locator(".card", { hasText: "应付账款按什么口径列示" });
  await qcard.waitFor({ timeout: 30000 });
  await page.waitForTimeout(300);
  await shot("6-追问卡");
  await qcard.getByText("取绝对值").click();
  await qcard.getByRole("button", { name: "提交回答" }).click();
  await waitText(/按绝对值 712,500.00 列示/);

  step("动作确认卡");
  await input.fill("把报销单 BX-2025-1188 审批了");
  await input.press("Enter");
  const acard = page.locator(".card", { hasText: "审批报销单" });
  await acard.waitFor({ timeout: 30000 });
  await page.waitForTimeout(300);
  await shot("7-动作确认卡");
  await acard.getByRole("button", { name: "仍然执行" }).click();
  await page.locator(".ant-popconfirm").getByRole("button", { name: /执\s*行/ }).click();
  await waitText(/已在 OA 里审批通过/);
  if (!fs.existsSync(oaLog)) throw new Error("确认后 OA 工具没有执行");
  await shot("8-审批完成");

  step("刷新页面：历史从宿主补回");
  await page.reload();
  await page.locator(".msg-ai .text", { hasText: "已在 OA 里审批通过" }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(500);
  await shot("9-刷新后");

  step("设置：数据与安全");
  await page.locator(".side-foot, .sidebar").getByText("设置").first().click().catch(() => {});
  await page.getByText("数据与安全").first().click().catch(() => {});
  await page.waitForTimeout(800);
  await shot("10-数据与安全");

  const events = (await host.dispatch("session.list", { project: host.store.projects[0].project })).sessions;
  console.log("对话：", events.map((s) => `${s.title}（未处理卡片 ${s.openCards}）`).join("；"));
  console.log("产出：", (await host.dispatch("outputs.list", { project: host.store.projects[0].project })).outputs.map((o) => `${o.output} ${o.name}`).join("；"));
} catch (e) {
  await shot("x-失败").catch(() => {});
  console.error("失败：", e.message);
  process.exitCode = 1;
} finally {
  if (errors.length) console.log("页面错误：\n" + errors.join("\n"));
  await browser.close();
  vite.kill();
  server.close();
  await host.close();
  await model.close();
  fs.rmSync(scratch, { recursive: true, force: true });
}
