# auxiliary_selection 核心还原记录

辅助项智能选择 — 利用AI语义分析，自动判断科目余额方向（借/贷），并从辅助项中筛选出有用的标准维度。

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|config_file|string|否|配置表文件路径（绝对路径或相对路径）|
|base_url|string|否|AI API Base URL|
|api_key|string|否|AI API Key|
|output_dir|string|否|输出目录路径。不传则使用默认目录。|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/auxiliary_selection.pyd**

【功能名称】辅助项智能选择
【功能描述】利用AI语义分析，自动判断科目余额方向（借/贷），并从辅助项中筛选出有用的标准维度。
【输入数据】input/辅助项选择配置表.xlsx
【输出结果】output/辅助项选择结果.xlsx

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/auxiliary_selection.pyd|6/6|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__auxiliary_selection.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__auxiliary_selection.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__auxiliary_selection.pyd.json>)|
|modules/ai_utils.pyd|2/2|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__ai_utils.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__ai_utils.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__ai_utils.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/auxiliary_selection.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|51|check_api_connection(base_url, api_key)|base_url, api_key, client, e||
|65|extract_json_from_text(text)|text, start_idx, end_idx, json_str, e||
|82|analyze_subject(client, model, system_prompt, user_rules, subject_name, aux_list)|client, model, system_prompt, user_rules, subject_name, aux_list, aux_data_str, item, name, example, final_user_content, messages, completion, raw_content, e||
|117|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, start_time, work_dir, settings, base_url, api_key, client, config_file, config_df, get_cell_str, get_cell_str, model_name, system_prompt, user_rules, data_df, e, output_dir, output_path, unique_subjects, results_data, processed_count, idx, subject, sub_df, aux_list, ai_result, direction, selected_aux, record, preview, final_df, cols, c||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000bff0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__auxiliary_selection.pyd/__init____0x18000bff0.annotated.c>)|
|analyze_subject|0x180004310|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__auxiliary_selection.pyd/analyze_subject__0x180003f10.annotated.c>)|
|check_api_connection|0x180001730|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__auxiliary_selection.pyd/check_api_connection__0x180001510.annotated.c>)|
|extract_json_from_text|0x180002530|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__auxiliary_selection.pyd/extract_json_from_text__0x180002350.annotated.c>)|
|get_cell_str|0x1800061b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__auxiliary_selection.pyd/get_cell_str__0x180005ec0.annotated.c>)|
|run|0x180006760|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__auxiliary_selection.pyd/run__0x180005b30.annotated.c>)|

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
