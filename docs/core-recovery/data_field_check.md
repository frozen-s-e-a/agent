# data_field_check 核心还原记录

资料字段检查 — 根据配置，检查指定文件夹内各Excel文件的表头字段是否满足要求。

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
|model_name|string|否|模型名称|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/data_field_check.pyd**

【功能名称】资料字段检查
【功能描述】根据配置，检查指定文件夹内各Excel文件的表头字段是否满足要求。
【输入数据】input/资料字段检查配置表.xlsx
【输出结果】output/资料字段检查结果.xlsx
【注意事项】请确保配置表中的'资料类别'均有对应的sheet，且sheet中已填写所需字段。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/data_field_check.pyd|5/6|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__data_field_check.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__data_field_check.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__data_field_check.pyd.json>)|
|modules/ai_utils.pyd|2/2|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__ai_utils.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__ai_utils.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__ai_utils.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/data_field_check.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|57|test_api_connection(client)|client, e|<br>    通过尝试列出模型来测试与大语言模型API的连接。<br>    |
|76|find_excel_files(directory)|directory, supported_files, supported_extensions, root_dir, ext, file|<br>    递归搜索指定目录下的所有Excel文件。<br>    |
|94|read_excel_snippet(file_path, num_rows=10)|file_path, num_rows, snippet, file_name, workbook, sheet, row_idx, row_values, row, e, cell, cell, row, genexpr, genexpr|<br>    智能读取Excel文件（兼容.xls和.xlsx）的前N行作为原始数据片段。<br>    |
|121|check_fields_with_llm(client, model, required_fields, excel_snippet, temperature)|client, model, required_fields, excel_snippet, temperature, system_prompt, user_prompt, messages, completion, response_content, result_json, final_result, e, field, field, field|<br>    使用大语言模型分析原始数据片段，判断所需字段是否存在。<br>    |
|165|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, start_time, total_files_checked, work_dir, settings, base_url, api_key, client, e, config_file, output_dir, output_file, wb_config, ws_config, model_name, rows_to_check, temperature, configs, all_sheet_names, row, category, folder_path, ws_category, required_fields, wb_out, total_categories, hyperlink_font, i, config, ws_out, excel_files, total_files_in_category, j, file_path, progress, file_name, snippet, result_values, check_results, result_row, current_row_index, path_cell, end_time, total_duration, minutes, seconds, cell, field|主执行函数|

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x180012f70|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__data_field_check.pyd/__init____0x180012d80.annotated.c>)|
|check_fields_with_llm|0x180006bf0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__data_field_check.pyd/check_fields_with_llm__0x180006820.annotated.c>)|
|find_excel_files|0x180003130|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__data_field_check.pyd/find_excel_files__0x180002f50.annotated.c>)|
|read_excel_snippet|0x180004620|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__data_field_check.pyd/read_excel_snippet__0x180003ec0.annotated.c>)|
|run|0x180009420|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__data_field_check.pyd/run__0x180009090.asm>)|
|test_api_connection|0x180001ef0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__data_field_check.pyd/test_api_connection__0x180001d10.annotated.c>)|

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
