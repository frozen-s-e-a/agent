# subject_allocation 核心还原记录

科目分配派工

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

**modules/subject_allocation.pyd**

【功能名称】科目分配派工
【输入数据】科目分配派工.xlsx
【输出结果】output/科目分配派工/ 文件夹

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/subject_allocation.pyd|8/8|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__subject_allocation.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__subject_allocation.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__subject_allocation.pyd.json>)|
|modules/ai_utils.pyd|2/2|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__ai_utils.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__ai_utils.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__ai_utils.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/subject_allocation.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|59|test_api_connection(client)|client, e|<br>    测试与大模型 API 的连接是否成功。<br>    |
|78|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, start_time, work_dir, settings, base_url, api_key, model_name, client, e, config_file, output_dir, wb_config, ws_config, ws_base_code, ws_other, subject2row, standard_subjects, folder, subject_keyword, report_keyword, sub_folders, total_folders, processed_count, i, sub_folder, progress_percentage, subject_path, report_path, all_subjects, subjects_from_table, subjects_from_report, final_info, output_file_name, output_file_path, wb_output, ws_output, row_count, row, cell, subject_name, row_index, end_time, total_time|<br>    主执行函数。<br>    |
|232|process_financial_data(ctx, client: 'OpenAI', model_name: 'str', file_path: 'str', standard_subjects: 'list', is_chunk: 'bool' = False) -> 'list'|ctx, client, model_name, file_path, standard_subjects, is_chunk, all_processed_data, xls, sheet_name, df, full_md, processed_result, e, unique_subjects|<br>    读取Excel财务数据，调用大模型API，识别并提取有值的科目名称。<br>    |
|276|_call_llm_api(client: 'OpenAI', model_name: 'str', content_md: 'str', standard_subjects: 'list') -> 'list'|client, model_name, content_md, standard_subjects, prompt, stream, full_content, thinking_chars, content_chars, phase, chunk, delta, reasoning, content, json_match, json_str, parsed_data, e|<br>    内部辅助函数：调用大模型API处理数据，返回有值的标准科目名称列表。<br>    |
|349|find_file_path(sub_folder, subject_keyword, report_keyword)|sub_folder, subject_keyword, report_keyword, subject_path, report_path, subject_pattern, report_pattern, filename, file_path, e|<br>    在指定文件夹中查找包含科目余额表和财务报表关键词的Excel文件。<br>    |
|374|get_subject_name_row_map(ws)|ws, subject_row_map, row_index, row, cell, subject_name|<br>    给定一个 openpyxl 工作表对象 (ws)，返回一个字典。<br>    字典的键是"科目名称" (假设在B列)，值是该科目名称所在的行号。<br>    |
|389|find_subdirectories(folder_path)|folder_path, subdirectories, e, d|<br>    给定一个文件夹路径，返回其所有第一层子目录的路径列表。<br>    如果不存在子目录，则将原始文件夹路径作为列表的唯一元素返回。<br>    |

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x180013650|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_allocation.pyd/__init____0x180013650.annotated.c>)|
|_call_llm_api|0x18000cab0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_allocation.pyd/_call_llm_api__0x18000c700.annotated.c>)|
|find_file_path|0x18000f9c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_allocation.pyd/find_file_path__0x18000f6e0.annotated.c>)|
|find_subdirectories|0x180012260|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_allocation.pyd/find_subdirectories__0x180012080.annotated.c>)|
|get_subject_name_row_map|0x1800116f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_allocation.pyd/get_subject_name_row_map__0x180011510.annotated.c>)|
|process_financial_data|0x18000a390|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_allocation.pyd/process_financial_data__0x180009e10.annotated.c>)|
|run|0x180002a80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_allocation.pyd/run__0x1800026f0.annotated.c>)|
|test_api_connection|0x180001740|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__subject_allocation.pyd/test_api_connection__0x180001560.annotated.c>)|

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
