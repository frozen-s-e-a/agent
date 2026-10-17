# dropsummary 核心还原记录

删除合计行工具 — 用于删除 Excel 表中的合计行和汇总行。

**本项状态：** 独立 XLSX 核心 remove_summary_rows 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|file_path|string|是|文件路径: 要处理的 Excel 文件路径（配置表中每行一个文件）|
|keywords|string|是|关键字: 用于匹配合计行的关键字，多个关键字用竖线分隔（如：合计\|小计\|总计）|
|column_name|string|是|关键字所在列: 关键字所在的列名|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/dropsummary.pyd**

【功能名称】删除合计行工具
【功能描述】
用于删除 Excel 表中的合计行和汇总行。
1. 支持通过关键字匹配删除行（如"合计"、"小计"等）
2. 支持正则表达式匹配（用竖线分隔多个关键字）
3. 支持指定关键字所在列
4. 自动删除所有列值相同的行（重复行）
5. 支持批量处理多个文件
6. 直接修改原文件，请操作前先备份数据

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/dropsummary.pyd|4/4|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__dropsummary.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__dropsummary.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__dropsummary.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/dropsummary.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|51|get_planning_guide()|||
|72|log(msg)|msg||
|75|print_summary(start_time, success, fail, file_count)|start_time, success, fail, file_count, duration||
|89|_drop_summary_rows(file_path, keywords, column_name)|file_path, keywords, column_name, df, original_rows, keywords_pattern, final_rows, deleted_rows, e|<br>    删除Excel文件中的合计行<br>    <br>    参数:<br>        file_path: Excel文件路径<br>        keywords: 关键字（支持正则表达式，多个关键字用竖线分隔）<br>        column_name: 关键字所在列名<br>    <br>    返回:<br>        处理结果消息<br>    |
|131|_process_single_file(core, file_path, keywords, column_name)|core, file_path, keywords, column_name|处理单个文件|
|141|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, success_count, fail_count, processed_files_count, work_dir, output_dir, file_rules, cfg_rel_path, full_cfg_path, df_config, _, row, e, results, i, rule, file_path, keywords, column_name, err_msg, full_path, f_name, progress, res_msg, msg||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x180008c80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__dropsummary.pyd/__init____0x180008a90.annotated.c>)|
|_drop_summary_rows|0x1800024b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__dropsummary.pyd/_drop_summary_rows__0x1800021d0.annotated.c>)|
|_process_single_file|0x1800039b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__dropsummary.pyd/_process_single_file__0x1800036a0.annotated.c>)|
|run|0x180004100|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__dropsummary.pyd/run__0x180003d70.annotated.c>)|

## 独立源代码和验证范围

独立 XLSX 核心 remove_summary_rows 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。

[独立 XLSX 核心](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/table_files.py>)

[成果验证](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/table-flow-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
