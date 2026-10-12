# voucher_check 核心还原记录

凭证检查

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|source_paths|array|是|数据源路径: 需要扫描的文件或文件夹路径列表|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/voucher_check.pyd**

【功能名称】凭证检查
【功能说明】基于AI视觉模型，自动检查审计凭证的合规性。支持序时账匹配模式和无序时账模式。
【支持文件】PDF、PNG、JPG、JPEG、BMP、WEBP
【输入路径】input/凭证检查配置表.xlsx
【输出路径】output/凭证检查/

**modules/info_extract.pyd**

【功能名称】文件关键信息提取
【支持文件】扫描版本PDF/图片/txt/markdown
【输入数据】input/文件信息提取配置表.xlsx
【输出结果】output/文件信息提取结果.xlsx
【模型配置】使用"参数设置"中保存的模型（视觉模型用于图片/扫描PDF，文本模型用于文本文件/文本PDF）
【图片旋转】安装 Tesseract-OCR 后可自动检测并旋转图片到正确方向（非必须，未安装则跳过旋转）

　　Windows: 点击下载 Tesseract-OCR v5.5.0 安装包

　　macOS: 终端执行 brew install tesseract
【注意事项】该功能支持断点续传，结果直接生成。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/voucher_check.pyd|31/32|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__voucher_check.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__voucher_check.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__voucher_check.pyd.json>)|
|modules/ai_utils.pyd|2/2|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__ai_utils.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__ai_utils.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__ai_utils.pyd.json>)|
|modules/info_extract.pyd|21/22|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__info_extract.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__info_extract.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__info_extract.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/voucher_check.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|54|_split_path(file_path)|file_path, s, PureWindowsPath|<br>    跨平台路径分割：无论当前操作系统是什么，都能正确分割 Windows 和 POSIX 路径。<br>    返回 tuple of parts（与 Path.parts 行为一致）。<br>    |
|67|_path_basename(file_path)|file_path, parts|跨平台获取文件名（最后一级）|
|73|_path_parent_name(file_path)|file_path, parts|跨平台获取父文件夹名（倒数第二级）|
|79|_company_matches(company_a, company_b)|company_a, company_b, _strip_suffix, _strip_suffix, a, b|<br>    公司名模糊匹配：判断两个公司名是否指向同一实体。<br>    处理序时账中带后缀（如 '-藏建集团账簿'）的情况。<br>    |
|122|get_planning_guide()|||
|133|parse_file_info(file_path, companies)|file_path, companies, parts, file_name, name, strip_m, company, part, c, month, m, m2, parent_name, m2b, vn, voucher_str, voucher_type_pattern, text_to_search, m_full, m4, m5, m6|<br>    从文件名和路径中提取匹配要素：公司、月份、凭证号字符串、凭证号数字。<br>    返回 dict: {"company": str\|None, "month": str\|None, "vn": str\|None, "voucher_str": str\|None}<br>    voucher_str: 完整凭证号字符串（如"收-98"、"转-43"、"记-132"），用于AI匹配时提供上下文<br>    vn: 纯数字部分（向后兼容）<br>    |
|216|extract_vn_from_record(record)|record, vn, voucher_no, m, m2, month, date_str, m3|从序时账记录中提取凭证号数字和月份|
|239|extract_subject_from_path(file_path, checkpoints_map)|file_path, checkpoints_map, parts, part, subject|从文件路径的目录结构中尝试匹配科目|
|249|match_file_to_record(file_path, voucher_records, companies, checkpoints_map)|file_path, voucher_records, companies, checkpoints_map, info, file_company, file_month, file_vn, candidates, r, r_vn, r_month, month_matched, file_subject, r, r, r|<br>    四层降级匹配策略（前3层不消耗token）：<br>    层1: 公司 + 月份 + 凭证号数字 → 精确匹配<br>    层2: 公司 + 科目 + 唯一性 → 科目唯一匹配<br>    层3: 返回 None（由调用方决定是否用 AI 提取）<br>    <br>    返回 (record\|None, match_method: str)<br>    |
|307|extract_voucher_info_by_ai(client, visual_model_name, file_path)|client, visual_model_name, file_path, file_ext, fitz, doc, page, pix, Image, img, io, buffer, img_bytes, base64, b64, image_url, e, prompt, messages, completion, text, data|<br>    层3 AI提取：只读取文件第一页，提取凭证基本信息用于匹配序时账。<br>    返回 dict: {"公司": "", "日期": "", "凭证号": "", "摘要": "", "借方科目": "", "贷方科目": "", "金额": ""}<br>    或 None（提取失败）<br>    |
|376|match_by_ai_info(ai_info, voucher_records, companies, file_path=None)|ai_info, voucher_records, companies, file_path, ai_vn, ai_voucher_no, m, ai_amount, amt_str, ai_month, ai_date, m2, candidates, file_info, file_company, company_matched, vn_matched, month_matched, amount_matched, r, r_amt, r, r, r|<br>    用 AI 提取的凭证信息在序时账中匹配。<br>    匹配策略：公司（从路径提取）+ 凭证号 → 唯一确定；辅以金额、月份缩小范围。<br>    |
|457|_extract_company_from_path(file_path)|file_path, parts|从文件路径中粗提取疑似公司名（取最近的非根目录文件夹名）|
|466|_build_match_prompt(file_entries, record_entries)|file_entries, record_entries, files_text, records_text, genexpr, genexpr, genexpr|<br>    构建 AI 批量匹配的 prompt。<br>    file_entries: list of {"id": int, "path": str}<br>    record_entries: list of {"id": int, "公司": "", "凭证号": "", "科目名称": "", "日期": "", "摘要": "", "金额": ""}<br>    |
|503|ai_batch_match(client, model_name, unmatched_files, voucher_records, companies, thread_count)|client, model_name, unmatched_files, voucher_records, companies, thread_count, company_file_groups, fallback_files, f, folder_name, file_name, matched_company, parts, c, part, name_no_ext, strip_m, batch_tasks, company, files, company_records, subject_groups, r, subj, subj_records, final_batches, records, batch_size, i, batch_files, record_id_map, idx, result_map, match_lock, _run_batch, _run_batch, executor, futures, batch_records, future, e, r|<br>    用 AI 文本模型批量匹配未匹配的文件与序时账记录。<br>    <br>    分组策略：<br>    1. 从文件路径粗提取公司名，按公司分组<br>    2. 如果某公司组内序时账 > 50 条，再按科目细分<br>    3. 每组内序时账完整发送，文件按批次发送（每批上限动态调整）<br>    4. 多线程并发各批次<br>    <br>    返回 dict: {file_path: record}<br>    |
|686|load_config(core, config_mode, config_data)|core, config_mode, config_data, config_file_path, thread_count, raw, source_paths, wb, ws, row, tc_val, headers, checkpoints_map, subject, required_attachments, check_points, KNOWN_COLUMNS, voucher_records, extra_columns, ws_v, v_headers, col_index_map, idx, h, company_idx, vn_idx, company_val, vn_val, _get, _get, record, ec, cell, v, cell, h|<br>    读取配置：数据源路径 + 线程数 + 核查要点 + 序时账（可选）。<br>    返回 (source_paths, thread_count, checkpoints_map, voucher_records)<br>    <br>    checkpoints_map: {"科目名": {"required_attachments": "...", "check_points": [...]}}<br>    voucher_records: list[dict] 或 [] （空表示无序时账模式）<br>    |
|820|scan_all_files(source_paths)|source_paths, supported_extensions, all_files, path, ext, found, f|递归扫描所有路径，返回文件列表|
|846|match_subject(file_path, checkpoints_map, record=None)|file_path, checkpoints_map, record, record_subject, subject, folder_name|<br>    匹配核查要点中的科目。<br>    优先级：序时账科目名称 → 文件夹名称 → 返回None交给AI<br>    |
|869|build_check_prompt(subject, subject_info, checkpoints_map, record=None)|subject, subject_info, checkpoints_map, record, concise_rule, record_info, amount, side, check_points, required_attachments, points_text, attachment_check, subjects_list, subject_details, subj, info, att, pts, att_str, genexpr, genexpr|<br>    构建凭证核查 Prompt。<br>    record: 序时账记录（有序时账模式时传入）<br>    |
|960|parse_ai_response(response, file_path, subject, match_method, auto_generated, check_points_count)|response, file_path, subject, match_method, auto_generated, check_points_count, file_name, result, remarks, data, json_match, voucher_info, ai_subject, check_results_raw, check_results, item, conclusion, desc, e|解析 AI 返回的 JSON，构建输出行数据|
|1029|process_single_voucher(client, visual_model_name, file_path, checkpoints_map, record=None)|client, visual_model_name, file_path, checkpoints_map, record, file_ext, file_name, fitz, doc, page_count, e, subject, match_method, auto_generated, subject_info, system_prompt, prompt_subject, user_prompt, response, cp_count, result, ai_subj|<br>    处理单个凭证文件。<br>    record: 匹配到的序时账记录（可为 None）<br>    |
|1139|_write_merged_header(ws, extra_columns=None)|ws, extra_columns, thin, border, center, extra_start, extra_cols, i, col_name, row2_labels, col, label, total_cols, row, cell|写入两行合并表头|
|1200|_compute_overall(check_results)|check_results, has_fail, has_pass, has_unknown, r, text|<br>    根据所有测试情况计算总体情况。<br>    符合 → √，不符合 → ×，无法判断/混合 → -<br>    |
|1236|init_output(output_dir, output_file)|output_dir, output_file, completed, wb, ws, is_header_written, first_row, row, val, e, cell|初始化输出文件，返回 (wb, ws, completed_set, is_header_written)|
|1271|write_result_row(ws, is_header_written, result, record, seq_no, ai_voucher_info=None, index_ids=None, extra_columns=None)|ws, is_header_written, result, record, seq_no, ai_voucher_info, index_ids, extra_columns, extra_cols, check_results, company, date_str, year, subject_name, voucher_no, summary, debit_amount, credit_amount, ai_date, amt, file_name, info, vn, vi, index_str, overall, test_cols, i, row_num, file_path_val, file_name_val, cell_fp, data, col, val, extra_start, ec|<br>    将单条结果写入 Excel（两行合并表头格式）。<br>    record: 序时账记录（可为 None）<br>    seq_no: 序号<br>    ai_voucher_info: AI从凭证第一页提取的信息<br>    index_ids: 索引号列表（来自序时账的索引号字段，可能多个）<br>    extra_columns: 用户自定义的额外列名列表<br>    返回 is_header_written<br>    |
|1396|_write_checkpoints_sheet(output_file, checkpoints_map)|output_file, checkpoints_map, wb, sheet_name, ws_cp, max_points, info, headers, col_idx, h, row_idx, subject, i, point, e, i|将核查要点写入输出文件的'核查要点'工作表，作为留存信息|
|1431|_rename_file_with_prefix(file_path, index_ids)|file_path, index_ids, dir_name, file_name, m, prefix, new_name, new_path, e|<br>    在文件名前加上索引号前缀，格式为 [S0001 S0002] 202510记0132.pdf。<br>    方括号包裹便于识别，再次运行时会先去掉旧前缀再加新的。<br>    |
|1463|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, base_url, api_key, visual_model_name, msg, client, source_paths, thread_count, checkpoints_map, voucher_records, extra_columns, e, companies, all_files, file_record_map, file_match_method, file_index_ids, file_all_records, matched_count, f, record, method, vn_key, all_matched, ids, unmatched_files, text_model_name, ai_matched, total_matched, unmatched, output_dir, timestamp, output_file, existing_files, latest_file, is_append, wb, ws, completed_voucher_nos, is_header_written, files_to_process, info, file_vn, vn_str, total_files, total_this_run, successful_count, write_lock, seq_counter, _is_stopped, _is_stopped, _process_one, _process_one, executor, future_map, fp, future, file_path, result, ai_info_for_write, index_ids, seq, new_path, done, progress, matched_record_keys, unmatched_records, seen_keys, unique_unmatched, r, key, sheet_name, ws_unmatched, headers, col_idx, h, row_idx, i, ec, end_time, total_time, failed_count, genexpr, genexpr, r, r, f, r, r, f, f, genexpr, genexpr, r|<br>    凭证检查主入口（多线程版）。<br>    core: AuditTool 实例<br>    config_mode: 'excel'（默认）或 'direct'（Agent调用）<br>    config_data: dict，仅 config_mode='direct' 时使用<br>    |
|1847|Tool.__init__(self)|self||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x180048a20|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/__init____0x180048830.annotated.c>)|
|_build_match_prompt|0x180010860|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/_build_match_prompt__0x18000f0c0.annotated.c>)|
|_company_matches|0x180002f20|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/_company_matches__0x1800028e0.annotated.c>)|
|_compute_overall|0x18002b9d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/_compute_overall__0x18002b7f0.annotated.c>)|
|_extract_company_from_path|0x18000ef30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/_extract_company_from_path__0x18000ed40.annotated.c>)|
|_get|0x1800192b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/_get__0x180018fd0.annotated.c>)|
|_is_stopped|0x180035a80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/_is_stopped__0x180035a80.annotated.c>)|
|_path_basename|0x180002390|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/_path_basename__0x1800021a0.annotated.c>)|
|_path_parent_name|0x180002750|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/_path_parent_name__0x180002560.annotated.c>)|
|_process_one|0x180035dd0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/_process_one__0x180035bf0.annotated.c>)|
|_rename_file_with_prefix|0x1800343a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/_rename_file_with_prefix__0x180034180.annotated.c>)|
|_run_batch|0x180011150|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/_run_batch__0x180010f30.annotated.c>)|
|_split_path|0x180001b30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/_split_path__0x180001950.annotated.c>)|
|_strip_suffix|0x180002d00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/_strip_suffix__0x180002b10.annotated.c>)|
|_write_checkpoints_sheet|0x180031db0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/_write_checkpoints_sheet__0x180031b90.annotated.c>)|
|_write_merged_header|0x180028550|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/_write_merged_header__0x180028270.annotated.c>)|
|ai_batch_match|0x180014740|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/ai_batch_match__0x180010b30.annotated.c>)|
|build_check_prompt|0x180020bc0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/build_check_prompt__0x1800200a0.annotated.c>)|
|extract_subject_from_path|0x180006a90|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/extract_subject_from_path__0x180006870.annotated.c>)|
|extract_vn_from_record|0x180005d10|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/extract_vn_from_record__0x180005b30.annotated.c>)|
|extract_voucher_info_by_ai|0x180009500|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/extract_voucher_info_by_ai__0x180009220.annotated.c>)|
|init_output|0x18002c240|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/init_output__0x18002c020.annotated.c>)|
|load_config|0x1800196c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/load_config__0x180018cf0.annotated.c>)|
|match_by_ai_info|0x18000c740|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/match_by_ai_info__0x18000c390.annotated.c>)|
|match_file_to_record|0x180007330|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/match_file_to_record__0x180007020.annotated.c>)|
|match_subject|0x18001f8e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/match_subject__0x18001f5f0.annotated.c>)|
|parse_ai_response|0x180022cf0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/parse_ai_response__0x1800228f0.annotated.c>)|
|parse_file_info|0x180003770|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/parse_file_info__0x180003550.annotated.c>)|
|process_single_voucher|0x1800255f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/process_single_voucher__0x180025210.annotated.c>)|
|run|0x180038090|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/run__0x1800356f0.asm>)|
|scan_all_files|0x18001e380|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/scan_all_files__0x18001e1a0.annotated.c>)|
|write_result_row|0x18002e530|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__voucher_check.pyd/write_result_row__0x18002def0.annotated.c>)|

### modules/ai_utils.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|5|safe_chat_create(client, **kwargs)|client, kwargs, threading, result_holder, error_holder, _do_call, _do_call, t, e, APITimeoutError, APIConnectionError, error_code, err_str, t2, genexpr, genexpr|<br>    兼容各平台的 chat.completions.create 封装。<br>    - 通过 extra_body 传递 enable_thinking=False 关闭思考模式<br>    - 平台不支持时自动回退<br>    - 内置硬超时保护，防止请求无限卡死<br>    |

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|_do_call|0x180001610|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_utils.pyd/_do_call__0x180001360.annotated.c>)|
|safe_chat_create|0x180002640|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_utils.pyd/safe_chat_create__0x180001000.annotated.c>)|

### modules/info_extract.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|28|setup_tesseract_path()|platform, system, tesseract_install_path, tesseract_exe_path, current_path, tessdata_path, possible_paths, p, shutil, e|<br>    配置 Tesseract 路径，支持 Windows 和 macOS。<br>    Windows: C:\Program Files\Tesseract-OCR<br>    macOS: /usr/local/bin/tesseract 或 /opt/homebrew/bin/tesseract (Homebrew)<br>    自检成功则设置 IS_PYTESSERACT_AVAILABLE = True。<br>    自检失败则只打印一行警告，不抛出异常。<br>    |
|107|rotate_image_if_needed(img: 'Image.Image') -> 'Image.Image'|img, osd_data, rotation_angle, e|<br>    使用 Tesseract OSD 检测图像方向并将其旋转至正确方向。<br>    仅在 IS_PYTESSERACT_AVAILABLE 为 True 时执行。<br>    |
|205|get_planning_guide()|||
|212|get_filename_without_extension(file_path)|file_path, base_name, filename_without_extension, _||
|217|_extract_archive(archive_path)|archive_path, base_name, parent_dir, extract_dir, ext, zipfile, zf, rarfile, rf, py7zr, sz, e|<br>    解压压缩包到同目录下的同名文件夹。<br>    如果同名文件夹已存在则跳过。<br>    支持: .zip, .rar, .7z<br>    返回: 解压目标文件夹路径，失败返回 None<br>    |
|280|find_supported_files(directory)|directory, supported_files, supported_extensions, archive_extensions, root_dir, archives_found, ext, file, archive||
|308|read_file_with_fallback(file_path: 'str') -> 'str \| None'|file_path, encodings_to_try, encoding, file, content, e||
|330|encode_image_to_base64(image_path_or_bytes, compress_images, max_size=(1200, 1200), jpeg_quality=80)|image_path_or_bytes, compress_images, max_size, jpeg_quality, img_bytes, mime_type, image_path, _, image_file, e, img, original_format, buffer, save_params, encoded_string||
|407|try_extract_pdf_text(pdf_path: 'str') -> 'str \| None'|pdf_path, doc, page_count, full_text, page_num, page, text, combined_text, threshold, e||
|439|convert_pdf_to_images(pdf_path, compress_images, dpi=200, max_size=(1200, 1200), jpeg_quality=80)|pdf_path, compress_images, dpi, max_size, jpeg_quality, base64_images, current_dpi, current_max_size, current_jpeg_quality, current_subsampling, doc, page_num, page, pix, img, buffer, compressed_img_bytes, encoded_string, e||
|494|extract_info(client, model, system_prompt, user_prompt, visual_files=None, text_content=None, compress_images=True)|client, model, system_prompt, user_prompt, visual_files, text_content, compress_images, messages, content_parts, files_to_process, file_path, file_extension, base64_images, img, base64_image, info, completion, text, start_char, end_char, start_index, end_index, core_json, result, fixed_json, e||
|574|check_api_connection(base_url, api_key)|base_url, api_key, client, e||
|600|_is_multi_table_response(data) -> 'bool'|data, has_list_value, v, item, list_count, genexpr, genexpr|<br>    判断模型返回的数据是否为多表结构。<br>    多表结构的特征：dict，且至少有一个 value 是 list，且 list 中的元素是 dict。<br>    同时排除单条记录的情况（value 全是标量）。<br>    |
|632|parse_field_schema_from_prompt(user_prompt: 'str', client=None, model=None) -> 'dict'|user_prompt, client, model, analysis_prompt, messages, completion, result_text, result, schema, table_name, fields, e, f|<br>    分析用户提示词，判断是否为多表提取模式，并解析出字段模板。<br>    <br>    优先使用大模型判断（准确），失败时回退到正则匹配。<br>    <br>    返回: {"表格名": ["字段1", "字段2", ...], ...}<br>    如果不是多表模式，返回空 dict。<br>    |
|690|_parse_field_schema_by_regex(user_prompt: 'str') -> 'dict'|user_prompt, schema, pattern1, matches, table_name, fields_str, fields, pattern2, f, f|正则匹配方式解析多表字段模板（作为大模型判断的 fallback）。|
|731|normalize_model_response(data_from_model, field_schema=None)|data_from_model, field_schema, valid_items, cleaned, table_name, rows, valid_rows, single_key, single_val, item, r, genexpr, genexpr|<br>    智能标准化模型返回的数据，返回统一格式。<br><br>    参数:<br>        data_from_model: 模型返回的原始数据<br>        field_schema: 从用户提示词解析出的字段模板，用于辅助判断<br><br>    返回值: (mode, processed_data)<br>    - mode='simple', processed_data=list[dict]  -> 简单模式（扁平行列表）<br>    - mode='multi_table', processed_data=dict[str, list[dict]]  -> 多表模式<br>    - mode='empty', processed_data=None  -> 无效数据<br>    |
|797|flatten_multi_table_data(multi_table_data: 'dict', field_schema: 'dict' = None) -> 'tuple'|multi_table_data, field_schema, aligned_data, used_model_keys, schema_name, matched, model_name, s1, s2, rows, all_table_names, tn, table_fields, all_field_names, table_name, fields, seen_fields, f, row, key, has_duplicates, extra_headers, header_map, field, data_source, max_rows, result_rows, row_idx, row_values, field_name, table_rows, value, actual_key, k1, k2, processed, item, genexpr, genexpr, genexpr, genexpr|<br>    将多表数据横向拼接为扁平的行列表。<br><br>    参数:<br>        multi_table_data: {"银行存款": [{...}, {...}], "注销账户": [{...}]}<br>        field_schema: 从用户提示词解析出的字段模板 {"银行存款": ["字段1", ...], ...}<br>    返回: (extra_headers: list[str], rows: list[list])<br>    |
|953|_process_single_task(task_info, client, visual_model_name, language_model_name, system_prompt, role_prompt, force_pdf_as_image, compress_images)|task_info, client, visual_model_name, language_model_name, system_prompt, role_prompt, force_pdf_as_image, compress_images, visual_extensions, text_extensions, log_lines, data_from_model, display_path, display_name, file_ext, pdf_text, file_content, e|<br>    处理单个提取任务，返回模型原始数据。<br>    此函数在线程池中执行，不操作 Excel，不修改共享状态。<br>    <br>    返回: (task_info, data_from_model, log_lines)<br>    |
|1019|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, successful_tasks_count, base_url, api_key, visual_model_name, language_model_name, system_prompt, role_prompt, folder, mode, force_pdf_as_image, compress_images, max_workers, config_file, wb_config, ws_config, force_pdf_as_image_str, compress_images_str, max_workers_val, msg, e, client, all_files, output_file, completed_tasks, headers, wb_out, ws_out, is_header_written, user_chose_delete, is_append, cell, path_val, abs_path, norm_path, tasks_raw, visual_extensions, text_extensions, images_by_folder, file_path, file_ext, parent_folder, folder_path, image_list, task_list, task, first_file_path, folder_name, file_name, tasks_to_process, t, current_path_norm, total_tasks_in_dir, total_tasks_this_run, field_schema, table_names, _set_path_hyperlink, _set_path_hyperlink, _write_result_to_excel, _write_result_to_excel, _save_excel, _save_excel, index, task_info, progress_percent, _, data_from_model, log_lines, line, ThreadPoolExecutor, as_completed, completed_count, executor, future_to_task, future, end_time, total_time, failed_tasks_count, success_rate|<br>    core: AuditTool 实例（兼容旧版 audit_tool_instance）<br>    config_mode: 'excel'（默认，从Excel读取）或 'direct'（Agent调用，从config_data读取）<br>    config_data: dict，仅 config_mode='direct' 时使用<br>    |

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18003cf20|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/__init____0x18003cd30.annotated.c>)|
|_extract_archive|0x1800055b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/_extract_archive__0x1800053d0.annotated.c>)|
|_is_multi_table_response|0x18001bb50|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/_is_multi_table_response__0x18001b370.annotated.c>)|
|_parse_field_schema_by_regex|0x18001e380|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/_parse_field_schema_by_regex__0x18001e0c0.annotated.c>)|
|_process_single_task|0x1800271f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/_process_single_task__0x180026cf0.annotated.c>)|
|_save_excel|0x18002f1a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/_save_excel__0x18002f1a0.annotated.c>)|
|_set_path_hyperlink|0x180029960|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/_set_path_hyperlink__0x180029680.annotated.c>)|
|_write_result_to_excel|0x18002b430|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/_write_result_to_excel__0x18002a370.annotated.c>)|
|check_api_connection|0x18001a030|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/check_api_connection__0x180019e10.annotated.c>)|
|convert_pdf_to_images|0x180013220|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/convert_pdf_to_images__0x180012d70.annotated.c>)|
|encode_image_to_base64|0x18000c430|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/encode_image_to_base64__0x18000c030.annotated.c>)|
|extract_info|0x180016610|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/extract_info__0x180016070.annotated.c>)|
|find_supported_files|0x180009060|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/find_supported_files__0x180008e80.annotated.c>)|
|flatten_multi_table_data|0x1800230b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/flatten_multi_table_data__0x1800218d0.annotated.c>)|
|get_filename_without_extension|0x180004f40|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/get_filename_without_extension__0x180004d50.annotated.c>)|
|normalize_model_response|0x1800206c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/normalize_model_response__0x18001ff90.annotated.c>)|
|parse_field_schema_from_prompt|0x18001c6a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/parse_field_schema_from_prompt__0x18001c200.annotated.c>)|
|read_file_with_fallback|0x18000a5e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/read_file_with_fallback__0x18000a320.annotated.c>)|
|rotate_image_if_needed|0x1800037e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/rotate_image_if_needed__0x180003600.annotated.c>)|
|run|0x18002fe80|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/run__0x1800292f0.asm>)|
|setup_tesseract_path|0x1800011d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/setup_tesseract_path__0x1800011d0.annotated.c>)|
|try_extract_pdf_text|0x180011440|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract.pyd/try_extract_pdf_text__0x180011180.annotated.c>)|

## 独立源代码和验证范围

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
