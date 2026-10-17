# announcement 核心还原记录

公告下载 — 从巨潮资讯网下载上市公司的年报、半年报、审计报告等公告文件。

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|stock_codes|array|是|股票代码列表: 如 ['000002', '600519']|
|start_date|string|是|开始日期: YYYY-MM-DD|
|end_date|string|是|结束日期: YYYY-MM-DD|
|market_type|string|是|市场板块: 默认为'京沪深'|
|category_name|string|是|公告类型: 可选值: '年报', '半年报', '一季报', '三季报', '业绩预告', '中介报告', '首发', '增发' 等，为空则下载全部类型|
|keyword|string|是|标题关键词: 筛选标题内容|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/announcement.pyd**

【功能名称】公告下载
【功能描述】
从巨潮资讯网下载上市公司的年报、半年报、审计报告等公告文件。
1. 支持按股票代码、日期范围、公告类别筛选。
2. 自动下载 PDF 文件并按规范重命名。
3. 生成包含文件索引的汇总 Excel。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/announcement.pyd|7/7|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__announcement.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__announcement.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__announcement.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/announcement.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|72|get_planning_guide()|||
|97|sanitize_filename(filename)|filename||
|100|normalize_date(raw)|raw, fmt|将用户输入的日期尽量转为 YYYY-MM-DD 格式，失败则返回 None。|
|112|print_summary(start_time, total_count, output_dir)|start_time, total_count, output_dir, duration|【新增】打印执行摘要|
|123|download_pdf(url, save_folder_path, file_name)|url, save_folder_path, file_name, full_file_path, headers, response, file, e||
|141|code2id(code, plate_type)|code, plate_type, urls, url, res, s||
|156|fetch_cninfo_data(core, code, org_id, sec_name, plate_type, category_code, keyword, start_date, end_date, save_path, page=1, all_data=None)|core, code, org_id, sec_name, plate_type, category_code, keyword, start_date, end_date, save_path, page, all_data, url, payload, res, announcements, row, raw_sec_name, raw_title, ts, date_str, file_name, pdf_url, local_path, total_num||
|208|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, final_config, excel_path, wb, ws, s_date, e_date, codes, e, start_date, end_date, save_folder, results, market_str, cat_name, keyword, total, i, code, plate_type, org_id, sec_name, cat_code, stock_data, msg, r||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000c2c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__announcement.pyd/__init____0x18000c2c0.annotated.c>)|
|code2id|0x180004f60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__announcement.pyd/code2id__0x180004d40.annotated.c>)|
|download_pdf|0x180003150|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__announcement.pyd/download_pdf__0x180002e70.annotated.c>)|
|fetch_cninfo_data|0x180005ec0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__announcement.pyd/fetch_cninfo_data__0x180005980.annotated.c>)|
|normalize_date|0x180001dc0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__announcement.pyd/normalize_date__0x180001be0.annotated.c>)|
|run|0x1800088c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__announcement.pyd/run__0x180008530.annotated.c>)|
|sanitize_filename|0x1800019c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__announcement.pyd/sanitize_filename__0x1800017d0.annotated.c>)|

## 独立源代码和验证范围

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
