# text_match 核心还原记录

文本提取匹配

**本项状态：** JSON 文本提取已独立验证；批次、AI 提示和结果校验有原生证据，未独立运行 AI。

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

**modules/text_match.pyd**

【功能名称】文本提取匹配
【输入数据】input/文本提取匹配配置表.xlsx
【输出结果】output/文本提取匹配结果.xlsx
【功能特点】
 1. 智能分类与归档：理解摘要描述，将凌乱数据自动归类到标准科目或清单。
 2. 关键信息抓取：从文本中提取合同方、金额、风险点等信息，并自动分列。
 3. 多层级匹配：支持“大类+小类”逻辑，即使小类缺失也能智能兼容。
 4. 格式原样保留：自动还原分类项中的空格、编码等格式。
 5. 零门槛操作：直接下达自然语言指令，程序自动解析并生成中文表头。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/text_match.pyd|6/6|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__text_match.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__text_match.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__text_match.pyd.json>)|
|modules/ai_utils.pyd|2/2|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__ai_utils.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__ai_utils.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__ai_utils.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/text_match.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|64|_get_ai_config(ctx, config_data)|ctx, config_data, settings|从 config_data 获取 AI 配置，回退到 ctx.settings_data|
|75|check_api_connection(client)|client, e|API 连接预检|
|84|extract_json_from_text(text)|text, start_idx, end_idx|稳健的 JSON 提取逻辑|
|100|process_batch(client, model, sys_prompt, task_mode, task_req, categories_data, batch_df, semaphore, audit_tool_instance, print_lock, total_rows, shared_counter)|client, model, sys_prompt, task_mode, task_req, categories_data, batch_df, semaphore, audit_tool_instance, print_lock, total_rows, shared_counter, data_lines, final_task_req, category_context, tree_lines, k, v, sub_keys, tree, format_instruction, full_sys, full_usr, completion, res, rid, vobj, info_str, count, percent, e, batch_ids, i, r, v, k, v||
|157|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, start_time, work_dir, ai_cfg, base_url, api_key, client, model_name, config_file, output_dir, sys_prompt, conf, task_mode, task_req, batch_size, max_workers, cat_mapping, categories_data, cat_df, _, row, row_vals, m_key_raw, m_key_clean, s_key_raw, s_key_clean, data_df, total_rows, all_results, semaphore, print_lock, shared_counter, executor, futures, future, res, rid, vobj, real_id, final_list, is_req_empty, i, row_res, record, val, b_val, s_val, others, k, v, result_df, output_path, e, v, i||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x1800100b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__text_match.pyd/__init____0x18000fec0.annotated.c>)|
|_get_ai_config|0x1800017d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__text_match.pyd/_get_ai_config__0x1800015b0.annotated.c>)|
|check_api_connection|0x180002200|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__text_match.pyd/check_api_connection__0x180002010.annotated.c>)|
|extract_json_from_text|0x180002c90|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__text_match.pyd/extract_json_from_text__0x180002ab0.annotated.c>)|
|process_batch|0x180003e50|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__text_match.pyd/process_batch__0x1800039d0.annotated.c>)|
|run|0x1800086b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__text_match.pyd/run__0x180008320.annotated.c>)|

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

JSON 文本提取已独立验证；批次、AI 提示和结果校验有原生证据，未独立运行 AI。

|已独立 helper|自有代码|
|---|---|
|text_match.extract_json_from_text|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/matching.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
