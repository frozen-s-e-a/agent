// 底稿任务连真实宿主走一遍：真实的 Harness + 桥接插件 + 编排插件 + 假审计工具服务（harness/test/scenarios/receivables.mjs）+ 假模型。
// 发消息登记任务 → 底稿理解卡 → 口径卡 → 写入确认 → 完成后看区域和成果；
// 再开一个任务停在口径卡，重启宿主 → 任务显示已中断 → 从检查点继续 → 完成。
// 先 cd ../harness && npm ci。用法：node scripts/walk-task.mjs <截图目录> [light|dark]
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { fakeModel } from "../../harness/test/fake-model.mjs";
import { FILES, PROMPT, createScenario } from "../../harness/test/scenarios/receivables.mjs";
import { AppHost } from "../../app-host/host.mjs";
import { createServer } from "../../app-host/server.mjs";

const [, , out = "screens/task", theme = "light"] = process.argv;
fs.mkdirSync(out, { recursive: true });
const here = path.dirname(fileURLToPath(import.meta.url));
const harnessTest = path.join(here, "..", "..", "harness", "test");
const python = process.env.AUDIT_TEST_PYTHON ?? "python3";
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "walk-task-"));
const dataDir = path.join(scratch, "data");
const folder = path.join(scratch, "华东示例制造2025");
const textOf = (c) => (typeof c === "string" ? c : (c ?? []).map((p) => p.text ?? "").join(""));

// 假模型：编排节点按场景回答；对话里登记任务
const scenario = createScenario();
const model = await fakeModel({
  respond: (body) => {
    const node = textOf(body.messages.find((m) => m.role === "system")?.content).match(/【编排节点:(\w+)】/)?.[1];
    if (node) {
      const o = scenario.respond(node, JSON.parse(textOf(body.messages.at(-1).content)));
      return o.submit !== undefined ? { tools: [{ name: "submit", args: o.submit }] } : { text: o.text };
    }
    if (body.messages.at(-1).role === "tool") return { text: "已登记底稿任务，正在后台填写，需要你确认的地方会出卡片。" };
    return { tools: [{ name: "audit_task_start", args: { text: PROMPT, files: Object.values(FILES).map((f) => f.file) } }] };
  },
});

function startHost() {
  const host = new AppHost({
    dataDir,
    python,
    patches: [path.join(harnessTest, "plugins", "fake-tools.patch.yml")],
    harnessEnv: { FAKE_TOOLS_SCENARIO: path.join(harnessTest, "scenarios", "receivables.mjs"), FAKE_TOOLS_STATE: path.join(dataDir, "tools-state.json"), AUDIT_SEMANTICS_SAMPLES: "1" },
  });
  // 假审计工具不真的写文件：成果就绪时把底稿复制过去，代替 fill_apply 写出的新文件
  host.subscribe((e) => {
    if (e.type !== "output.ready" || !/\.xlsx$/.test(e.data.file)) return;
    const dest = path.join(folder, e.data.file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(folder, "资料", FILES.workpaper.name), dest);
  });
  const server = createServer(host);
  return new Promise((r) => server.listen(8787, "127.0.0.1", () => r({ host, server })));
}

let { host, server } = await startHost();
const bare = model.baseURL.replace(/\/v1$/, "");
await host.dispatch("connection.test", { baseUrl: bare, key: "sk-walk" });
await host.dispatch("settings.save", { baseUrl: bare, model: "audit-fixture" });
await host.dispatch("secret.save", { key: "model", value: "sk-walk" });
const project = (await host.dispatch("project.create", { name: "华东示例制造 2025年报审计", folder })).project;

// 场景里的资料编号是固定的：直接登记（真实流程由 files.add 按内容哈希编号）。底稿做一张真表。
fs.mkdirSync(path.join(folder, "资料"), { recursive: true });
execFileSync(python, ["-c", `
import openpyxl
from openpyxl.styles import Font
wb = openpyxl.Workbook(); ws = wb.active; ws.title = '应收账款'
ws['A1'] = '应收账款明细表'; ws['A1'].font = Font(bold=True); ws['E2'] = '单位：元'
ws['A5'] = '账龄'; ws['C5'] = '期末余额'; ws['D5'] = '占比'; ws['E5'] = '备注'
for i, t in enumerate(['1年以内', '1-2年', '2-3年', '3年以上']):
    ws.cell(7 + i, 1, t); ws.cell(7 + i, 4, '=C%d/$C$11' % (7 + i)); ws.cell(7 + i, 3).number_format = '#,##0.00'
ws['A11'] = '合计'; ws['C11'] = '=SUM(C7:C10)'; ws['C11'].number_format = '#,##0.00'
ws['A15'] = '序号'; ws['B15'] = '客户名称'; ws['C15'] = '期末余额'; ws['D15'] = '占比'
for i in range(5): ws.cell(16 + i, 1, i + 1)
ws.column_dimensions['A'].width = 12; ws.column_dimensions['B'].width = 16; ws.column_dimensions['C'].width = 16
wb.save(r'''${path.join(folder, "资料", FILES.workpaper.name)}''')`]);
const state = host.store.state(project);
for (const f of Object.values(FILES)) state.files.push({ file: f.file, name: f.name, path: "资料/" + f.name, kind: /底稿/.test(f.name) ? "workpaper" : "data", sizeBytes: 0, addedAt: new Date().toISOString(), ...(/底稿/.test(f.name) ? { sheets: ["应收账款"] } : {}) });
host.saveState(project);
await host.dispatch("project.open", { project });

const vite = spawn(process.execPath, [path.join(here, "..", "node_modules", "vite", "bin", "vite.js"), "--mode", "real", "--port", "5174", "--strictPort"], { cwd: path.join(here, ".."), stdio: "pipe" });
await new Promise((resolve) => vite.stdout.on("data", (d) => String(d).includes("Local") && resolve()));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e) + "\n" + e.stack));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
const step = (s) => console.log("·", s);
const openCard = (title) => page.locator(".card.open", { hasText: title }).last();

try {
  await page.goto(`http://127.0.0.1:5174/?theme=${theme}`);
  const input = page.locator(".composer textarea");
  await input.waitFor({ timeout: 30000 });

  step("发消息：Agent 登记底稿任务");
  await input.fill(PROMPT);
  await input.press("Enter");
  // 任务一开始就打开底稿；对话停在右侧，进度卡和表格同时看得到
  await page.locator(".ant-segmented-item").nth(2).click();
  await page.locator("[data-progress]").first().waitFor({ timeout: 30000 });

  step("底稿理解卡");
  const understanding = openCard("请确认对底稿的理解");
  await understanding.waitFor({ timeout: 60000 });
  await page.waitForTimeout(800);
  await shot("1-底稿理解卡");
  await understanding.getByRole("button", { name: /^确\s*认$/ }).click();

  step("口径确认卡");
  const basis = openCard("口径需要确认");
  await basis.waitFor({ timeout: 60000 });
  await page.waitForTimeout(500);
  await shot("2-口径确认卡");
  await basis.getByRole("button", { name: "确认口径" }).click();

  step("写入确认卡");
  const write = openCard("写入");
  await write.waitFor({ timeout: 60000 });
  await page.waitForTimeout(800);
  await shot("3-写入确认");
  await write.getByRole("button", { name: "确认写入" }).click();

  step("任务完成：进度卡、成果");
  await page.locator("[data-progress]").first().getByText("已完成").waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  await shot("4-完成");

  step("看区域：点进度卡里的区域");
  await page.locator("[data-progress]").first().locator(".region-status").first().click();
  await page.waitForTimeout(1500);
  await shot("5-区域");

  step("第二个任务停在口径卡，重启宿主");
  const session = host.store.state(project).sessions[0].session;
  const pending = new Set();
  const auto = host.subscribe((e) => {
    // 理解卡和写入卡由脚本代答，口径卡留着
    if (e.type === "card.opened" && e.data.kind === "workpaper_understanding" && !pending.has(e.data.card)) {
      pending.add(e.data.card);
      setTimeout(() => host.dispatch("card.answer", { card: e.data.card, action: "confirm" }).catch(() => {}), 50);
    }
  });
  const task2 = (await host.dispatch("task.create", { session, text: PROMPT + "（复核）", files: Object.values(FILES).map((f) => f.file) })).task;
  await page.locator(`[data-progress="${task2}"]`).waitFor({ timeout: 30000 });
  await openCard("口径需要确认").waitFor({ timeout: 60000 });
  auto();
  server.closeAllConnections?.();
  server.close();
  await host.close();
  ({ host, server } = await startHost());
  await page.reload();
  const progress2 = page.locator(`[data-progress="${task2}"]`);
  await progress2.getByText("已中断").waitFor({ timeout: 30000 });
  await page.waitForTimeout(500);
  await progress2.scrollIntoViewIfNeeded();
  await shot("6-重启后中断");

  step("从检查点继续");
  await progress2.getByRole("button", { name: "从检查点继续" }).click();
  const basis2 = openCard("口径需要确认");
  await basis2.waitFor({ timeout: 60000 });
  await basis2.getByRole("button", { name: "确认口径" }).click();
  const write2 = openCard("写入");
  await write2.waitFor({ timeout: 60000 });
  await write2.getByRole("button", { name: "确认写入" }).click();
  await progress2.getByText("已完成").waitFor({ timeout: 60000 });
  await page.waitForTimeout(1500);
  await shot("7-继续后完成");

  const tasks = (await host.dispatch("task.list", { project })).tasks;
  console.log("任务：", tasks.map((t) => `${t.task} ${t.status}`).join("；"));
  console.log("产出：", (await host.dispatch("outputs.list", { project })).outputs.map((o) => `${o.output} ${o.name}`).join("；"));
} catch (e) {
  await shot("x-失败").catch(() => {});
  console.error("失败：", e.message);
  process.exitCode = 1;
} finally {
  if (errors.length) console.log("页面错误：\n" + errors.join("\n"));
  await browser.close();
  vite.kill();
  server.closeAllConnections?.();
  server.close();
  await host.close();
  await model.close();
  fs.rmSync(scratch, { recursive: true, force: true });
}
