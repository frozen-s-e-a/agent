# asist_split 核心还原记录

辅助项拆分工具 — 用于处理包含复杂键值对的辅助核算列。

**本项状态：** 独立 XLSX 核心 split_auxiliary_columns 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|file_path|string|是|文件或文件夹路径: 对应 B1 单元格|
|keyword|string|是|文件名关键词: 对应 B2 单元格|
|col_name|string|是|辅助项列名: 对应 B3 单元格|
|kv_sep|string|是|辅助项分隔符: 对应 B4 单元格 (如 :)|
|item_sep|string|是|辅助项拆分符: 对应 B5。填 ';' 代表按分号切分；填 '【】' 代表提取括号内内容|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/asist_split.pyd**

【功能名称】辅助项拆分工具
【功能描述】
用于处理包含复杂键值对的辅助核算列。
1. 支持普通分隔符（如分号）或包裹符（如【】）拆分。
2. 自动识别列中如 "【客户:A公司】【项目:B项目】" 的内容。
3. 结果直接追加写入原 Excel 文件。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/asist_split.pyd|6/6|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__asist_split.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__asist_split.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__asist_split.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/asist_split.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|66|get_planning_guide()|||
|76|log(msg)|msg||
|79|print_summary(start_time, success, fail, file_count)|start_time, success, fail, file_count, duration||
|93|_parse_auxiliary_item(cell_value, kv_sep, item_sep)|cell_value, kv_sep, item_sep, cell_str, result, items, start_char, end_char, safe_item_sep, strip_chars, item, parts, k, v|<br>    解析单个单元格逻辑<br>    支持：<br>    1. 包裹符模式: item_sep='【】' -> 提取 '【A:1】【B:2】' 中的 'A:1', 'B:2'<br>    2. 分隔符模式: item_sep=';'   -> 切割 'A:1; B:2'<br>    |
|161|_get_target_files(core, path_str, keyword)|core, path_str, keyword, target_files, work_dir, full_path, root, dirs, files, file|获取目标文件列表|
|194|_process_single_file(core, file_path, config)|core, file_path, config, col_name, kv_sep, item_sep, df, e, parsed_data_list, new_columns, d, k, wb, ws, start_col_idx, i, col_key, row_idx, row_data, excel_row, col_idx, val|单文件处理逻辑|
|254|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, success_count, fail_count, processed_files_count, work_dir, output_dir, task_configs, cfg_rel_path, full_cfg_path, wb, ws, get_val, get_val, single_config, e, results, i, config, path_input, keyword, col_name, kv_sep, err, target_files, msg, f_idx, f_path, f_name, res_msg, err_msg||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000e2c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__asist_split.pyd/__init____0x18000e0d0.annotated.c>)|
|_get_target_files|0x180004880|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__asist_split.pyd/_get_target_files__0x1800045a0.annotated.c>)|
|_parse_auxiliary_item|0x1800026a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__asist_split.pyd/_parse_auxiliary_item__0x1800023c0.annotated.c>)|
|_process_single_file|0x180006760|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__asist_split.pyd/_process_single_file__0x180006100.annotated.c>)|
|get_val|0x180009bb0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__asist_split.pyd/get_val__0x1800099d0.annotated.c>)|
|run|0x180009d90|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__asist_split.pyd/run__0x180009640.annotated.c>)|

## 独立源代码和验证范围

独立 XLSX 核心 split_auxiliary_columns 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。

|已独立 helper|自有代码|
|---|---|
|asist_split._parse_auxiliary_item|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

[独立 XLSX 核心](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/table_files.py>)

[成果验证](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/table-flow-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
