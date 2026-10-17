# cicpa_query 核心还原记录

注协系统工商信息获取

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|query_mode|string|否|查询模式: search=轻量搜索, detail=企业详情, export=全维度导出, subsidiary=子公司发现, check_cookies=检查Cookie|
|company_name|string|否|企业名称: 企业精确工商注册全称，多个用逗号分隔|
|org_id|string|否|企业org_id: 中注协系统内部ID（detail模式可选，代替company_name）|
|output_path|string|否|输出路径: 结果保存路径|
|subsidiary_threshold|integer|否|子公司持股阈值: 持股比例阈值，默认50|
|cookie_json|string|否|Cookie JSON: 手动粘贴的cookie（JSON字符串，AI模式使用）|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/cicpa_query.pyd**

【功能名称】注协系统工商信息获取
    【输入数据】input/工商信息获取配置表.xlsx
    【输出结果】output/完整维度导出.zip
    【功能描述】通过中注协行业知识库批量获取企业全维度工商信息（61维度，53个Excel文件）。
    需要先登录注协系统获取Cookie（配置表"配置表"sheet的B1单元格）。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/cicpa_query.pyd|24/27|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__cicpa_query.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__cicpa_query.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__cicpa_query.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/cicpa_query.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|28|_cookie_file()||Cookie 文件始终在工作目录下|
|96|_save_cookies(cookies_dict, session_token=None)|cookies_dict, session_token, data, f|保存 cookies 到文件|
|104|_load_cookies()|f|从文件加载 cookies|
|112|_build_session(cookies_dict)|cookies_dict, session, zsk_domain_cookies, name, value, domain, xsrf_token|根据 cookie 字典构建 requests session|
|134|_check_cookie_valid(session)|session, resp, data|用 API 请求检测 cookie 是否有效，返回 True/False|
|148|_ensure_playwright()|playwright, subprocess, result|确保 playwright 已安装，未安装则自动 pip install。<br>    返回 True 表示可用，False 表示失败。<br>    |
|172|_detect_browser_channel()|platform, checks, channel, display_name, path|检测系统已安装的 Chromium 内核浏览器，避免下载 Chromium。<br><br>    Playwright channel 参数会直接使用系统已安装的浏览器。<br>    支持国内外常见浏览器：Chrome、Edge、360、QQ浏览器、搜狗、Brave、Chromium。<br><br>    返回 (channel, 显示名) 或 (None, None)。<br>    |
|216|_ensure_browser()|channel, display_name, subprocess, result|确保有可用的浏览器。<br>    优先使用系统已安装的浏览器，没有才下载 Playwright 自带的 Chromium。<br>    返回 (channel, display_name, error_message)。<br>    |
|239|_do_browser_login()|threading, channel, display_name, err, sync_playwright, launch_opts, cookie_dict, p, browser, context, page, e, current_url, all_cookies, session_token, c|打开浏览器让用户登录，登录完成后抓取 cookies。<br><br>    使用 Playwright 启动独立浏览器实例，导航到登录页。<br>    采用 input() 阻塞等待用户确认（用户在浏览器中完成登录后按回车）。<br><br>    注意：此函数需要在交互式终端中运行（有 stdin）。<br>    如果没有交互式终端（如被 AI 子进程调用），应改用 do_login_guided()。<br>    |
|347|save_cookies_from_dict(cookies_dict)|cookies_dict, session|直接保存外部传入的 cookie 字典（供 AI 通过 agent-browser 传入）<br><br>    Args:<br>        cookies_dict: {name: value} 格式的 cookie 字典<br>    Returns:<br>        bool: 保存是否成功<br>    |
|366|do_login()|cookie_dict, session|独立登录命令：打开浏览器 → 用户登录 → 保存 cookies → 验证有效性。<br><br>    这个函数由 --login 参数触发，与查询逻辑完全解耦。<br>    |
|391|ensure_session(force_login=False)|force_login, cookie_data, saved_at, age_hours, session, remaining, cookie_dict|统一入口：检查 cookie → 有效返回 session → 无效打开浏览器登录<br><br>    Args:<br>        force_login: 强制重新登录（忽略已有 cookie）<br><br>    Returns:<br>        requests.Session 或 None（登录失败时）<br>    |
|437|upload_companies(session, company_names)|session, company_names, wb, ws, name, tmp_file, xsrf_token, cookie, url, f, files, headers, resp, result, data|<br>    上传企业名单进行批量查询<br>    返回 batch_id<br>    |
|489|query_results(session, batch_id)|session, batch_id, url, xsrf_token, payload, headers, resp, result|<br>    查询批量搜索结果<br>    返回企业详细信息列表<br>    |
|520|search_company(query, page_size=5, force_login=False)|query, page_size, force_login, session, url, xsrf_token, headers, payload, resp, result, data, companies|<br>    轻量单企业搜索（不走 batch upload，直接调 home_search API）<br>    适合查 1 家公司的 org_id 等基础信息。<br><br>    :param query: 搜索关键词（企业名称/简称/代码）<br>    :param page_size: 返回条数（默认 5）<br>    :param force_login: 是否强制重新登录<br>    :return: 企业列表（每条含 org_id, name, legal_person 等）<br>    |
|568|batch_query(company_names, force_login=False)|company_names, force_login, session, batch_id, data|<br>    批量查询工商信息<br>    :param company_names: 企业名称列表<br>    :param force_login: 是否强制重新登录<br>    :return: 企业详细信息列表<br>    |
|596|discover_subsidiaries(audit_target, threshold=50.0)|audit_target, threshold, results, org_id, name, session, url, xsrf_token, headers, resp, result, data, invests_obj, children, subsidiaries, child, child_name, ratio_str, ratio|<br>    通过轻量搜索获取 org_id，再用 equity API 查对外投资，<br>    返回持股 >= threshold% 的子公司列表。<br><br>    :param audit_target: 被审计单位精确全称<br>    :param threshold: 持股比例阈值（默认 50%）<br>    :return: [{"name": "子公司名", "ratio": 100.0, "org_id": "Txxx"}, ...]<br>    |
|673|get_company_detail(org_id, company_name=None)|org_id, company_name, display_name, session, result, xsrf_token, url, headers, resp, data, e, equity_data|<br>    查询单家企业的详细信息（基本信息、股东、高管、股权结构）<br><br>    :param org_id: 企业 org_id（必填）<br>    :param company_name: 企业名称（可选，仅用于显示）<br>    :return: dict {"basic_info": {}, "shareholders": {}, "main_persons": {}, "equity": {}}<br>    |
|811|format_output(results)|results, i, company|格式化输出结果|
|834|save_to_excel(results, output_path, all_fields=False, export_by_dimension=False, select_dimensions=None)|results, output_path, all_fields, export_by_dimension, select_dimensions, basic_headers, full_dimensions, field_map, zipfile, datetime, timestamp, temp_dir, selected_dims, exported_count, dimension_name, dim_info, fields, has_data, sample, field_key, wb, ws, headers, header, company, row, value, idx, _, column_letter, max_length, cell, adjusted_width, excel_path, zip_path, zipf, file_path, arcname, shutil, excel_files, k, v, k, v, genexpr, genexpr, genexpr|保存结果到 Excel<br><br>    Args:<br>        results: 查询结果列表<br>        output_path: 输出文件路径<br>        all_fields: 是否导出全部字段（默认只导出基础 10 个字段）<br>        export_by_dimension: 是否按维度分类导出多个 Excel 文件并打包成 ZIP（模拟注协系统导出）<br>        select_dimensions: 选择导出的维度列表（如 ['基本信息', '经营状况', '经营风险']），None 表示全部导出<br>    |
|1107|_verify_companies(input_names, extract_dir)|input_names, extract_dir, re, base_file, f, wb, ws, file_companies, row, normalize, normalize, input_norm, file_norm, matched, missed, extra, matched_original, n, missed_original, n_key, fuzzy, extra_orig, n, n, n, n, fc, fc|验证下载的 ZIP 中公司名称与输入是否一致|
|1175|_get_all_dimensions(session, base_url)|session, base_url, resp, data, codes, dim, child, code|获取所有导出维度代码|
|1191|browser_export(company_names, output_path)|company_names, output_path, _time, base_url, session, wb, ws, i, name, temp_xlsx, f, files, resp, upload_data, batch_id, hit_num, search_data, result_count, dimensions, export_data, export_trigger_time, max_wait, poll_interval, new_task, elapsed, current_batch, latest, latest_date, all_batch, task_id, t, download_url, full_url, total_size, chunk, size_mb, zipfile, zf, names, n, extract_dir, info, filename, target, src, dst, t, t|纯 API 完整导出 26+ 个文件的 ZIP 包<br><br>    流程:<br>    1. 检查 cookie / 登录<br>    2. API 上传企业名单 (upload_local)<br>    3. API 触发查询 (enter_search)<br>    4. API 获取维度列表 (get_dimension_class)<br>    5. API 触发导出 (enter_search_out_type)<br>    6. API 轮询下载中心等待新任务<br>    7. API 下载 ZIP 文件<br><br>    Args:<br>        company_names: 企业名称列表<br>        output_path: 输出 ZIP 文件路径<br>    |
|1474|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, work_dir, settings, cookie_str, config_path, wb_list, ws_list, companies, row, name, datetime, timestamp, output_dir, output_path, success, params, mode, cookie_json, results, org_id, threshold, n|模块入口 — GUI模式走全维度导出，MCP模式支持所有查询|
|1591|_save_cookie_string(cookie_str)|cookie_str, cookies_dict, part, k, v|将 cookie 字符串（JSON 或 key=value; 格式）保存到 cookie 文件|
|1618|_check_cookies_status()|cookie_file, cookie_data, saved_at, age_hours, cookies, session, valid|检查 cookie 状态，返回 dict|

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|_build_session|0x180003d80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/_build_session__0x180003ba0.annotated.c>)|
|_check_cookie_valid|0x180004b40|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/_check_cookie_valid__0x180004960.asm>)|
|_check_cookies_status|0x180044750|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/_check_cookies_status__0x18003cc50.annotated.c>)|
|_cookie_file|0x1800018c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/_cookie_file__0x1800018c0.annotated.c>)|
|_detect_browser_channel|0x180005c60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/_detect_browser_channel__0x180005c60.annotated.c>)|
|_do_browser_login|0x180007220|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/_do_browser_login__0x180007220.annotated.c>)|
|_ensure_browser|0x180006730|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/_ensure_browser__0x180006730.annotated.c>)|
|_ensure_playwright|0x1800052d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/_ensure_playwright__0x1800052d0.annotated.c>)|
|_get_all_dimensions|0x1800299c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/_get_all_dimensions__0x1800297a0.annotated.c>)|
|_load_cookies|0x1800030d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/_load_cookies__0x1800030d0.annotated.c>)|
|_save_cookie_string|0x18003bbf0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/_save_cookie_string__0x18003ba10.annotated.c>)|
|_save_cookies|0x180002250|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/_save_cookies__0x180001f70.annotated.c>)|
|_verify_companies|0x180026ac0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/_verify_companies__0x180026480.annotated.c>)|
|batch_query|0x1800129b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/batch_query__0x1800126d0.annotated.c>)|
|browser_export|0x18002ac90|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/browser_export__0x18002a490.asm>)|
|discover_subsidiaries|0x1800137b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/discover_subsidiaries__0x1800132b0.annotated.c>)|
|do_login|0x18000bb00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/do_login__0x18000bb00.annotated.c>)|
|ensure_session|0x18000c670|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/ensure_session__0x18000c4c0.annotated.c>)|
|format_output|0x18001b650|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/format_output__0x18001b470.annotated.c>)|
|get_company_detail|0x180016240|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/get_company_detail__0x180015f60.annotated.c>)|
|normalize|0x180026880|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/normalize__0x1800266a0.annotated.c>)|
|query_results|0x180010710|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/query_results__0x1800104f0.annotated.c>)|
|run|0x180037ff0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/run__0x180037c60.annotated.c>)|
|save_cookies_from_dict|0x18000b5b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/save_cookies_from_dict__0x18000b3d0.annotated.c>)|
|save_to_excel|0x18001d9e0|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/save_to_excel__0x18001cb10.asm>)|
|search_company|0x1800116b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/search_company__0x180011320.annotated.c>)|
|upload_companies|0x18000d850|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__cicpa_query.pyd/upload_companies__0x18000d630.annotated.c>)|

## 独立源代码和验证范围

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
