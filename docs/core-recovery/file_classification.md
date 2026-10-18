# file_classification 核心还原记录

文件自动分类 (支持多维输出模式)

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|config_file|string|否|配置表文件路径（绝对路径或相对路径）|
|base_url|string|否|AI API Base URL|
|api_key|string|否|AI API Key|
|visual_model_name|string|否|视觉模型名称|
|model_name|string|否|语言模型名称|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/file_classification.pyd**

【功能名称】文件自动分类 (支持多维输出模式)
【支持文件】图片, pdf, Excel, word, csv, txt, md等
【输入数据】input/文件分类配置表.xlsx
【输出结果】根据配置表中的'输出文件夹'及'输出模式'决定

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/file_classification.pyd|12/12|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__file_classification.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__file_classification.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__file_classification.pyd.json>)|
|modules/ai_utils.pyd|2/2|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__ai_utils.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__ai_utils.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__ai_utils.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/file_classification.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|63|find_supported_files(directory)|directory, supported_files, supported_extensions, root_dir, file|查找目录下所有支持分类的文件。|
|82|get_excel_preview(file_path, rows=5)|file_path, rows, df, preview, e||
|92|get_csv_preview(file_path, rows=5)|file_path, rows, encodings, encoding, df, preview, e||
|108|get_word_preview(file_path, paragraphs=5)|file_path, paragraphs, doc, content, preview, e, p||
|118|read_text_file_preview(file_path)|file_path, encodings_to_try, encoding, file||
|129|encode_image_to_base64(image_path_or_bytes)|image_path_or_bytes, mime_type, _, image_file, img_bytes, e, encoded_string||
|145|convert_pdf_first_page_to_image(pdf_path, dpi=150, max_size=(800, 800), jpeg_quality=85)|pdf_path, dpi, max_size, jpeg_quality, doc, page, pix, img, buffer, encoded_string, e||
|170|generate_prompts(relative_file_path, categories_info)|relative_file_path, categories_info, system_prompt, category_definitions, user_prompt, item|生成系统和用户提示词，并引入高置信度约束。|
|196|classify_file(client, visual_model, lang_model, absolute_file_path, relative_file_path, categories_info)|client, visual_model, lang_model, absolute_file_path, relative_file_path, categories_info, file_extension, visual_extensions, text_extensions, system_prompt, user_prompt, messages, model_to_use, base64_image, content_parts, file_content, completion, response_text, returned_base_name, item, e|<br>    使用AI模型对单个文件进行高置信度分类。<br>    返回匹配类别的完整路径(full_path)，如果无法分类则返回None。<br>    |
|256|test_api_connection(client)|client, e|测试与API的连接和认证。|
|280|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, start_time, work_dir, settings, base_url, api_key, visual_model_name, language_model_name, config_file, wb_config, ws_base, config, file_mode, company_mode, processing_folder, output_folder, output_mode, ws_types, categories_info, row, full_path, base_name, e, example_relative_path, example_system_prompt, example_user_prompt, client, task_units, single_company_name, total_files_found, total_files_copied, total_unclassified, i, unit, all_files, file_index, absolute_file_path_str, unit_root_path, relative_file_path, progress_percent, classified_category_path, category_path_part, source_path, base_dest_structure, dest_path, dest_relative_path, end_time, total_duration, summary_title, summary_width, cell, item||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x180017d90|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__file_classification.pyd/__init____0x180017ba0.annotated.c>)|
|classify_file|0x18000b4c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__file_classification.pyd/classify_file__0x18000b0c0.annotated.c>)|
|convert_pdf_first_page_to_image|0x1800089e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__file_classification.pyd/convert_pdf_first_page_to_image__0x180008580.annotated.c>)|
|encode_image_to_base64|0x180006ed0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__file_classification.pyd/encode_image_to_base64__0x180006cf0.annotated.c>)|
|find_supported_files|0x180001780|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__file_classification.pyd/find_supported_files__0x1800015a0.annotated.c>)|
|generate_prompts|0x18000a6f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__file_classification.pyd/generate_prompts__0x18000a4d0.annotated.c>)|
|get_csv_preview|0x1800037b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__file_classification.pyd/get_csv_preview__0x1800034d0.annotated.c>)|
|get_excel_preview|0x1800026c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__file_classification.pyd/get_excel_preview__0x1800023e0.annotated.c>)|
|get_word_preview|0x180004e10|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__file_classification.pyd/get_word_preview__0x180004b30.annotated.c>)|
|read_text_file_preview|0x180005f70|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__file_classification.pyd/read_text_file_preview__0x180005d90.annotated.c>)|
|run|0x18000f2b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__file_classification.pyd/run__0x18000ef20.annotated.c>)|
|test_api_connection|0x18000dda0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__file_classification.pyd/test_api_connection__0x18000dbc0.annotated.c>)|

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
