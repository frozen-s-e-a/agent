# info_extract_multi 核心还原记录

多公司多类型文件关键信息提取

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|config_file|string|否|配置表文件路径（绝对路径或相对路径）|
|output_dir|string|否|输出目录路径。不传则使用默认目录。|
|base_url|string|否|AI API Base URL|
|api_key|string|否|AI API Key|
|visual_model_name|string|否|视觉模型名称|
|model_name|string|否|语言模型名称|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/info_extract_multi.pyd**

【功能名称】多公司多类型文件关键信息提取
【支持文件】PDF/图片(.png,.jpg,.jpeg,.bmp,.webp)/Word(.docx)/TXT/Markdown
【输入数据】input/多类型文件信息提取配置表.xlsx 
【输出结果】output/多类型文件信息提取结果.xlsx
【注意事项】智能模型切换；智能字段排序；图片格式自动转换；断点续传。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/info_extract_multi.pyd|16/16|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__info_extract_multi.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__info_extract_multi.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__info_extract_multi.pyd.json>)|
|modules/ai_utils.pyd|2/2|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__ai_utils.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__ai_utils.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__ai_utils.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/info_extract_multi.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|26|get_filename_without_extension(file_path)|file_path, base_name, filename_without_extension, _|获取不带扩展名的文件名|
|32|find_supported_files(directory, supported_extensions)|directory, supported_extensions, supported_files, item, file_ext|查找目录中的支持文件，对不支持的格式打印提示|
|47|read_file_with_fallback(file_path: 'str') -> 'str \| None'|file_path, encodings_to_try, encoding, file|尝试多种编码读取文本文件|
|58|encode_image_to_base64(image_path_or_bytes, extension=None)|image_path_or_bytes, extension, img_bytes, input_mime_type, output_mime_type, api_supported_formats, _, ext, image_file, e, ext_lower, original_format_supported, needs_conversion, img, output_buffer, encoded_string|<br>    将图片路径或字节编码为Base64 Data URI。<br>    增加对不支持格式（如 JPX）的自动转换（转为JPEG）。<br>    |
|128|process_pdf_document(pdf_path, dpi=150)|pdf_path, dpi, full_text, base64_images, doc, page_num, page, image_list, img_index, img, xref, base_image, image_bytes, image_ext, b64_img, e, images, pix, img_bytes, fallback_e|智能处理PDF，提取文本和图片（带格式转换）|
|156|process_word_document(file_path)|file_path, text_content, base64_images, document, para, rel, image_part, image_bytes, content_type, extension, b64_img, e|处理docx文件，提取文本和图片（带格式转换）|
|175|extract_info(client, model, system_prompt, user_prompt, base64_images=None, visual_files=None, text_content=None, max_images=10)|client, model, system_prompt, user_prompt, base64_images, visual_files, text_content, max_images, messages, content_parts, full_text, image_count, b64_img, file_path, completion, raw_response, start_brace, start_bracket, start_index, end_char, end_index, e|调用AI模型进行信息提取|
|208|extract_fields_from_prompt_with_llm(client, model, user_prompt)|client, model, user_prompt, meta_system_prompt, meta_user_prompt, completion, response_content, match, json_str, fields, e, genexpr, genexpr|使用语言模型智能解析用户提示词，提取有序的字段列表。如果失败则返回 None。|
|244|get_header_map_and_fields(client, language_model, task_configs)|client, language_model, task_configs, header_map, task, folder_name, prompt, fields|使用AI构建表头映射，失败则中止程序|
|306|_get_ai_config(ctx, config_data)|ctx, config_data, settings|从 config_data 获取 AI 配置，回退到 ctx.settings_data|
|316|find_subfolder_with_priority(parent_dir, keyword, match_mode='关键词')|parent_dir, keyword, match_mode, item, exact_match, contains_match|按优先级查找子文件夹|
|332|aggregate_results(results_list)|results_list, flattened_list, item, aggregated, all_keys_in_order, seen_keys, d, k, res_dict, key, value, final_result, key|聚合多次提取的结果|
|358|create_output_file_with_headers(output_file, header_map, ordered_categories)|output_file, header_map, ordered_categories, wb, ws, a1, b1, current_col, category, fields, start_col, cell, i, field_name, e|创建带表头的输出Excel文件|
|375|append_company_data(output_file, company_data, ordered_categories, header_map)|output_file, company_data, ordered_categories, header_map, wb, ws, row_to_write, category, field, data_key, new_row_num, path_cell, company_path, e|追加公司数据到Excel文件|
|391|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, start_time, files_processed_this_run, work_dir, ai_cfg, base_url, api_key, visual_model_name, language_model_name, config_file, output_dir, wb_config, ws_base, root_folder, task_configs_df, task_configs, e, system_prompt, client, header_map, ordered_categories, supported_extensions, output_file, completed_companies, df, companies_to_process, total_companies_to_process, index, company_dir_entry, processed_count, percentage, company_name, current_company_data, processed_folders_in_company, task, task_folder_name, match_mode, merge_mode, user_prompt, target_folder_path, task_files, extracted_data, all_text, all_b64_images, all_visual_files, file_path, file_ext, text, images, model_to_use, task_results_list, text_content, images_b64, visual_files, single_file_data, items_to_process, aggregated_for_task, field, value, end_time, duration, companies_processed_this_run, task, d|主执行函数|

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x180024070|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/__init____0x180023e80.annotated.c>)|
|_get_ai_config|0x180012dd0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/_get_ai_config__0x180012bb0.annotated.c>)|
|aggregate_results|0x180014c50|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/aggregate_results__0x180014a70.annotated.c>)|
|append_company_data|0x180018af0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/append_company_data__0x1800187e0.annotated.c>)|
|create_output_file_with_headers|0x180015f00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/create_output_file_with_headers__0x180015c20.annotated.c>)|
|encode_image_to_base64|0x180003fa0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/encode_image_to_base64__0x180003cc0.annotated.c>)|
|extract_fields_from_prompt_with_llm|0x1800104a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/extract_fields_from_prompt_with_llm__0x18000fd20.annotated.c>)|
|extract_info|0x18000d080|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/extract_info__0x18000c9f0.annotated.c>)|
|find_subfolder_with_priority|0x180013b80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/find_subfolder_with_priority__0x180013890.annotated.c>)|
|find_supported_files|0x180001a50|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/find_supported_files__0x180001830.annotated.c>)|
|get_filename_without_extension|0x1800013a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/get_filename_without_extension__0x1800011b0.annotated.c>)|
|get_header_map_and_fields|0x180011c20|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/get_header_map_and_fields__0x180011940.annotated.c>)|
|process_pdf_document|0x180007820|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/process_pdf_document__0x180007540.annotated.c>)|
|process_word_document|0x18000a620|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/process_word_document__0x18000a440.annotated.c>)|
|read_file_with_fallback|0x180002a20|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/read_file_with_fallback__0x180002760.annotated.c>)|
|run|0x18001a810|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__info_extract_multi.pyd/run__0x18001a480.annotated.c>)|

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
