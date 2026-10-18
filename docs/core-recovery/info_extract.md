# info_extract 核心还原记录

文件关键信息提取

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|role_prompt|string|是|用户提示词: 提取信息的具体指令|
|folder|string|是|处理文件夹: 需要扫描的文件或文件夹路径|
|max_workers|integer|是|并发线程数: 同时处理的任务数量，默认1（单线程），建议3-5|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

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
|modules/info_extract.pyd|21/22|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__info_extract.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__info_extract.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__info_extract.pyd.json>)|
|modules/ai_utils.pyd|2/2|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__ai_utils.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__ai_utils.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__ai_utils.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

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

### modules/ai_utils.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|5|safe_chat_create(client, **kwargs)|client, kwargs, threading, result_holder, error_holder, _do_call, _do_call, t, e, APITimeoutError, APIConnectionError, error_code, err_str, t2, genexpr, genexpr|<br>    兼容各平台的 chat.completions.create 封装。<br>    - 通过 extra_body 传递 enable_thinking=False 关闭思考模式<br>    - 平台不支持时自动回退<br>    - 内置硬超时保护，防止请求无限卡死<br>    |

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|_do_call|0x180001610|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_utils.pyd/_do_call__0x180001360.annotated.c>)|
|safe_chat_create|0x180002640|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__ai_utils.pyd/safe_chat_create__0x180001000.annotated.c>)|

## 独立源代码和验证范围

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
