# paper_verify 核心还原记录

纸质信息核对

**本项状态：** 标准化、提取结果装配及一对一先精确后标准化比对已独立验证。图片/PDF 识别及完整写表未迁移。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|file_path|string|是|文件或文件夹路径: 需要核对的PDF/图片文件或文件夹路径|
|match_keys|string|是|匹配键: 用于关联提取数据与账面数据的字段名，支持中英文逗号分隔多个|
|max_workers|integer|是|并发线程数: 同时处理的任务数量，默认1（单线程），建议3-5|
|extra_prompt|string|是|补充指令: 追加到AI提示词末尾的补充指令，可选|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/paper_verify.pyd**

【功能名称】纸质信息核对
【支持文件】扫描版本PDF/图片（PNG、JPG、JPEG、BMP、WEBP）
【输入数据】input/纸质信息核对配置表.xlsx
【输出结果】output/纸质信息核对结果.xlsx
【功能说明】从PDF/图片文件中提取关键信息，与Excel账面数据进行双向核对，自动生成包含明细表和汇总表的核对结果报告。
【注意事项】该功能支持断点续传，中断后可从上次停止的地方继续。

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
|modules/paper_verify.pyd|18/19|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__paper_verify.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__paper_verify.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__paper_verify.pyd.json>)|
|modules/ai_utils.pyd|2/2|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__ai_utils.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__ai_utils.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__ai_utils.pyd.json>)|
|modules/info_extract.pyd|21/22|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__info_extract.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__info_extract.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__info_extract.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/paper_verify.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|75|get_planning_guide()|||
|84|normalize_value(value) -> 'str'|value, s, result, ch, code|<br>    标准化字段值：去首尾空格、去内部空格、全角转半角、统一小写。<br><br>    处理流程: 原始值 → strip() → 去除所有内部空格 → 全角转半角 → lower()<br><br>    如果输入为 None，返回空字符串。非字符串输入先转为字符串。<br>    |
|113|_parse_match_keys(raw: 'str') -> 'list[str]'|raw, parts, p|解析匹配键字符串，支持中英文逗号分隔。|
|120|load_config(core, config_mode: 'str', config_data: 'dict \| None') -> 'dict'|core, config_mode, config_data, config, settings|<br>    读取配置参数和待核对信息表数据。<br><br>    返回:<br>    {<br>        'file_path': str,           # 文件或文件夹路径<br>        'match_keys': list[str],    # 匹配键列表<br>        'max_workers': int,         # 并发线程数<br>        'extra_prompt': str,        # 补充指令<br>        'field_names': list[str],   # 待核对信息表的字段名列表<br>        'book_records': list[dict], # 账面记录列表<br>        'base_url': str,<br>        'api_key': str,<br>        'model_name': str,<br>        'visual_model_name': str,<br>    }<br><br>    Raises:<br>        ValueError: 缺少必填参数或待核对信息表无数据<br>    |
|158|build_prompt(field_names: 'list[str]', extra_prompt: 'str') -> 'tuple[str, str]'|field_names, extra_prompt, fields_str, system_prompt, user_prompt|<br>    根据字段名列表自动生成系统提示词和用户提示词。<br><br>    返回: (system_prompt, user_prompt)<br>    |
|183|_load_config_from_excel(core) -> 'dict'|core, input_path, wb, config_sheet, file_path, match_keys_raw, max_workers_raw, extra_prompt_raw, max_workers, extra_prompt, match_keys, data_sheet, rows, field_names, book_records, row, record, i, name, val, key, c|从 Excel 配置表读取配置参数和待核对信息表数据。|
|252|_load_config_from_direct(config_data: 'dict \| None') -> 'dict'|config_data, file_path, match_keys_raw, max_workers, extra_prompt, field_names, book_records, match_keys, key|从 config_data 字典读取所有参数。|
|317|_is_supported_file(file_path: 'str') -> 'bool'|file_path|判断文件是否为支持的 PDF/图片类型。|
|322|_read_existing_records(output_file: 'str') -> 'list[dict]'|output_file, wb, ws, rows, headers, records, row, record, i, h, val, key, e, c|从已有输出文件的"提取结果" sheet 读取已保存的记录。<br>    <br>    兼容旧版（列名 _source_file）和新版（列名 文件路径），<br>    统一将内部 key 转为 _source_file。<br>    |
|357|_save_records_to_excel(records: 'list[dict]', output_file: 'str') -> 'None'|records, output_file, wb, ws, all_keys, seen, rec, k, display_headers, row, val, col_idx, cell, file_path, k|将提取记录保存到输出文件的"提取结果" sheet（全量覆盖写入）。|
|427|_process_extract_result(data, file_path: 'str') -> 'list[dict]'|data, file_path, abs_path, records, array_values, longest, item, v|处理 AI 返回的 JSON 数据，转为记录列表，每条附加 _source_file。|
|461|extract_phase(core, config: 'dict', output_file: 'str') -> 'tuple[list[dict], dict]'|core, config, output_file, start_time, file_path, p, all_files, raw_files, existing, existing_records, processed_files, rec, src, files_to_process, f, norm, total_all, total_skip, total_todo, client, system_prompt, user_prompt, model_name, visual_model_name, all_records, successful_count, failed_count, _process_one_file, _process_one_file, max_workers, idx, fpath, progress, fname, new_records, e, completed_count, executor, future_to_file, future, end_time, total_time, extract_stats, f|<br>    发现文件、并发提取、断点续传。<br><br>    返回: (所有提取记录列表, 提取统计信息 dict)<br>    统计信息: {'total_time': float, 'total_files': int, 'processed': int,<br>               'successful': int, 'failed': int, 'total_records': int}<br>    |
|647|match_and_compare(book_records: 'list[dict]', extracted_records: 'list[dict]', match_keys: 'list[str]', field_names: 'list[str]') -> 'dict'|book_records, extracted_records, match_keys, field_names, matched, used_extracted, book, found_idx, i, ext, field_results, fn, book_val, ext_val, matched_books, unmatched_book, unmatched_extracted, genexpr, genexpr, genexpr, m, b, i, ext|<br>    执行匹配和逐字段比对。<br><br>    匹配策略：<br>    1. 先精确匹配：对每条账面记录，在提取记录中查找所有匹配键字段值完全相等的记录<br>    2. 精确匹配失败后用 normalize_value 做模糊匹配<br>    3. 多匹配键时要求所有键都匹配<br>    4. 每条提取记录最多匹配一条账面记录（一对一匹配）<br><br>    返回:<br>    {<br>        'matched': [<br>            {<br>                'book': dict,           # 账面记录<br>                'extracted': dict,      # 提取记录<br>                'file_path': str,       # 源文件路径<br>                'field_results': {      # 逐字段核对结果<br>                    '字段名': '一致' \| '不一致',<br>                    ...<br>                }<br>            },<br>            ...<br>        ],<br>        'unmatched_book': [dict, ...],      # 账面有但文件无<br>        'unmatched_extracted': [dict, ...],  # 文件有但账面无<br>    }<br>    |
|745|write_output(compare_result: 'dict', field_names: 'list[str]', output_file: 'str') -> 'None'|compare_result, field_names, output_file, wb, sheet_name, book_cols, file_path_col, ext_cols, result_cols, headers, ws_detail, hyperlink_font, fp_col_idx, matched, unmatched_book, unmatched_extracted, m, book, extracted, file_path, field_results, row, fn, cell, _, ext, _is_consistent, _is_consistent, _is_inconsistent, _is_inconsistent, consistent_count, inconsistent_count, unmatched_book_count, unmatched_ext_count, book_total, ext_total, field_stats, c, ic, ws_summary, title_font, title_fill, title_align, section_font, section_fill, header_font, header_fill, header_align, label_font, value_font, value_align, green_font, red_font, gray_font, thin_border, zebra_fill, row_num, title_cell, col, sec_cell, ci, h, overview_rows, ri, label, value, special_font, is_zebra, c1, c2, total_matched, rate_str, stats, fc, fic, f_total, f_rate, c3, c4, fn, fn, genexpr, genexpr, genexpr, genexpr, genexpr|<br>    写入核对明细和汇总表到输出 Excel 文件。<br><br>    - 核对明细（"核对明细"）：左右对比展示账面记录、文件路径、提取记录和核对结果<br>    - 汇总表（"汇总表"）：总体统计 + 按字段维度统计一致/不一致数<br><br>    如果输出文件已存在，加载它以保留"提取结果" sheet。<br>    |
|1071|_ai_recheck_mismatches(compare_result: 'dict', field_names: 'list[str]', config: 'dict') -> 'None'|compare_result, field_names, config, matched, mismatch_items, idx, m, field_results, book, extracted, fn, batches, i, client, model_name, _recheck_batch, _recheck_batch, max_workers, batch_results, bi, batch, executor, future_to_idx, future, e, ai_consistent, ai_inconsistent, ai_skipped, judgments, j, matched_idx, _|<br>    对 compare_result 中所有"不一致"字段进行 AI 二次判断。<br><br>    策略：将所有记录的所有不一致字段汇总，按 _AI_RECHECK_BATCH_SIZE 分批，<br>    多线程并发调用 AI（线程数使用配置表的 max_workers）。<br><br>    AI 判断后直接修改 compare_result['matched'] 中的 field_results：<br>    - AI 认为一致 → "一致(AI)"<br>    - AI 认为不一致 → "不一致(AI)"<br>    |
|1200|run(core, config_mode='excel', config_data=None) -> 'dict \| None'|core, config_mode, config_data, datetime, timestamp, output_dir, output_file, settings, base_url, api_key, msg, config, extracted_records, extract_stats, compare_result, matched_count, unmatched_book_count, unmatched_ext_count, processed, success_rate, e, error_detail|<br>    主入口函数，串联整个纸质信息核对流程。<br><br>    config_mode='excel' 时打印进度和摘要信息到 stdout，返回 None。<br>    config_mode='direct' 时返回 {"status": "success", "msg": "核对完成", "output_dir": "output/纸质信息核对"}。<br><br>    需求: 7.1, 7.5, 7.6, 8.3<br>    |

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|_ai_recheck_mismatches|0x180027370|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/_ai_recheck_mismatches__0x180024900.annotated.c>)|
|_is_consistent|0x180016cb0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/_is_consistent__0x180016ac0.annotated.c>)|
|_is_inconsistent|0x180016f60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/_is_inconsistent__0x180016d70.annotated.c>)|
|_is_supported_file|0x180006f50|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/_is_supported_file__0x180006c80.annotated.c>)|
|_load_config_from_direct|0x180005e80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/_load_config_from_direct__0x180005bb0.annotated.c>)|
|_load_config_from_excel|0x180003cf0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/_load_config_from_excel__0x180003b10.annotated.c>)|
|_parse_match_keys|0x180002580|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/_parse_match_keys__0x1800022b0.annotated.c>)|
|_process_extract_result|0x18000b880|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/_process_extract_result__0x18000b620.annotated.c>)|
|_process_one_file|0x18000cd60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/_process_one_file__0x18000caa0.annotated.c>)|
|_read_existing_records|0x1800074a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/_read_existing_records__0x1800071e0.annotated.c>)|
|_recheck_batch|0x180024e50|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/_recheck_batch__0x180024c70.annotated.c>)|
|_save_records_to_excel|0x1800091e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/_save_records_to_excel__0x180008f70.annotated.c>)|
|build_prompt|0x180003760|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/build_prompt__0x1800034f0.annotated.c>)|
|extract_phase|0x18000dd10|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/extract_phase__0x18000c750.annotated.c>)|
|load_config|0x180002e60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/load_config__0x180002b00.annotated.c>)|
|match_and_compare|0x180014f80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/match_and_compare__0x180013d30.annotated.c>)|
|normalize_value|0x180001ab0|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/normalize_value__0x1800018d0.annotated.c>)|
|run|0x18002b630|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/run__0x18002b2a0.annotated.c>)|
|write_output|0x180019940|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__paper_verify.pyd/write_output__0x180016750.asm>)|

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

标准化、提取结果装配及一对一先精确后标准化比对已独立验证。图片/PDF 识别及完整写表未迁移。

|已独立 helper|自有代码|
|---|---|
|paper_verify.normalize_value|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|paper_verify._parse_match_keys|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|paper_verify.match_and_compare|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/matching.py>)|
|paper_verify._process_extract_result|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/matching.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
