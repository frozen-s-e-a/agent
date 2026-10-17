# ipo_sh 核心还原记录

上交所IPO披露文件下载 — 爬取上海证券交易所科创板及主板项目动态，批量下载IPO披露文件（招股书、问询函等）。

**本项状态：** 独立查询/筛选/命名/下载/索引流程通过合成 HTTP 响应对照；三家共 28 例。未联机测试当前接口；北交所行业查询和网络异常重试仍需适配。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|start_date|string|是|开始日期: 格式 YYYY-MM-DD|
|end_date|string|是|结束日期: 格式 YYYY-MM-DD|
|update_mode|string|是|更新模式: 严格填写'项目'或'文件'|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/ipo_sh.pyd**

【功能名称】上交所IPO披露文件下载
【功能描述】
爬取上海证券交易所科创板及主板项目动态，批量下载IPO披露文件（招股书、问询函等）。
支持“项目更新”与“文件发布”双模式筛选，自动解析JSONP接口，支持断点续传与详细日志。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/ipo_sh.pyd|7/7|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__ipo_sh.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__ipo_sh.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__ipo_sh.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/ipo_sh.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|52|get_planning_guide()|||
|67|process_jsonp(jsonp_str)|jsonp_str, match|处理JSONP格式的响应体|
|79|_extract_info(person_list, key)|person_list, key, persons, person|提取特定职位人员姓名|
|88|sanitize_filename(filename)|filename||
|91|download_file(session, url, save_folder_path, file_name)|session, url, save_folder_path, file_name, sanitized_file_name, full_file_path, response, f, e||
|113|write_excel_with_hyperlinks(data, output_path)|data, output_path, wb, ws, headers, cell, row_data, current_row, file_path, abs_path, link_path, e||
|153|print_summary(start_time, total_projects, downloaded_count, output_dir)|start_time, total_projects, downloaded_count, output_dir, duration||
|166|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, work_dir, base_output_dir, output_excel_path, start_date, end_date, raw_mode, cfg_path, full_cfg_path, wb, ws, update_mode, e, session, project_status_map, all_downloaded_files_info, page, page_size, stop_crawling, processed_count, list_url, list_params, res_list, projects_data, project_list, project, company_name, project_id, update_date_str_raw, update_date_str_date_part, p_date, p_date_str, status_code, project_status, stock_issuer, industry, company_nick_name, intermediary, sponsor, acct_info, auditor, law_firm, detail_params, res_detail, detail_json, file_list, file_info, f_type, f_type_map, f_title, f_src, f_raw_time, f_date_str, f_date, should_download, file_name_clean, new_name, save_path_company, download_url, final_path||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x180010e40|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ipo_sh.pyd/__init____0x180010c50.annotated.c>)|
|_extract_info|0x180002240|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ipo_sh.pyd/_extract_info__0x180002010.annotated.c>)|
|download_file|0x180002ea0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ipo_sh.pyd/download_file__0x180002b90.annotated.c>)|
|process_jsonp|0x180001770|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ipo_sh.pyd/process_jsonp__0x180001590.annotated.c>)|
|run|0x1800077a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ipo_sh.pyd/run__0x180007410.annotated.c>)|
|sanitize_filename|0x180002960|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ipo_sh.pyd/sanitize_filename__0x180002770.annotated.c>)|
|write_excel_with_hyperlinks|0x180004a60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ipo_sh.pyd/write_excel_with_hyperlinks__0x180004840.annotated.c>)|

## 独立源代码和验证范围

独立查询/筛选/命名/下载/索引流程通过合成 HTTP 响应对照；三家共 28 例。未联机测试当前接口；北交所行业查询和网络异常重试仍需适配。

|已独立 helper|自有代码|
|---|---|
|ipo_sh.sanitize_filename|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|ipo_sh.process_jsonp|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

[独立 IPO 流程](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/ipo.py>)

[28 例验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/ipo-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
