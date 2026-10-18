# ipo_sz 核心还原记录

深交所IPO披露文件下载 — 爬取深圳证券交易所项目动态网站，批量下载IPO披露文件。

**本项状态：** 独立查询/筛选/命名/下载/索引流程通过合成 HTTP 响应对照；三家共 28 例。未联机测试当前接口；北交所行业查询和网络异常重试仍需适配。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|start_date|string|是|开始日期: 格式 YYYY-MM-DD|
|end_date|string|是|结束日期: 格式 YYYY-MM-DD|
|update_mode|string|是|更新模式: 必须严格填写'项目'或'文件'，不要填其他词|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/ipo_sz.pyd**

【功能名称】深交所IPO披露文件下载
【功能描述】
爬取深圳证券交易所项目动态网站，批量下载IPO披露文件。
支持按“项目更新时间”或“文件发布时间”筛选，自动修复文件名重复后缀问题，并输出详细过滤日志。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/ipo_sz.pyd|6/6|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__ipo_sz.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__ipo_sz.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__ipo_sz.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/ipo_sz.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|52|get_planning_guide()||<br>    修改点：在这里显式地教 Agent 只能选 '项目' 或 '文件'<br>    |
|70|sanitize_filename(filename)|filename||
|73|download_file(session, url, save_folder_path, file_name)|session, url, save_folder_path, file_name, sanitized_file_name, full_file_path, response, f, e||
|94|write_excel_with_hyperlinks(data, output_path)|data, output_path, wb, ws, headers, cell, row_data, current_row, file_path, abs_path, link_path, e||
|133|print_summary(start_time, total_projects, downloaded_count, output_dir)|start_time, total_projects, downloaded_count, output_dir, duration||
|146|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, work_dir, base_output_dir, output_excel_path, start_date, end_date, raw_mode, cfg_path, full_cfg_path, wb, ws, update_mode, e, session, list_url, detail_base_url, download_base_url, all_downloaded_files_info, res_list, project_list, get_date_key, get_date_key, project_list_sorted, processed_count, project_summary, company_name, project_id, p_date_str, p_date, res_detail, detail_data, files_to_check, project_status, industry, file_info, f_title, f_date_str, f_src, should_download, f_date, file_name_clean, new_name, save_path_company, download_url, final_path, x, x||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000eaf0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ipo_sz.pyd/__init____0x18000e900.annotated.c>)|
|download_file|0x180001d00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ipo_sz.pyd/download_file__0x1800019f0.annotated.c>)|
|get_date_key|0x180006790|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ipo_sz.pyd/get_date_key__0x1800065a0.annotated.c>)|
|run|0x180006d00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ipo_sz.pyd/run__0x180006210.annotated.c>)|
|sanitize_filename|0x1800017c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ipo_sz.pyd/sanitize_filename__0x1800015d0.annotated.c>)|
|write_excel_with_hyperlinks|0x1800038c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ipo_sz.pyd/write_excel_with_hyperlinks__0x1800036a0.annotated.c>)|

## 独立源代码和验证范围

独立查询/筛选/命名/下载/索引流程通过合成 HTTP 响应对照；三家共 28 例。未联机测试当前接口；北交所行业查询和网络异常重试仍需适配。

|已独立 helper|自有代码|
|---|---|
|ipo_sz.sanitize_filename|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

[独立 IPO 流程](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/ipo.py>)

[28 例验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/ipo-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
