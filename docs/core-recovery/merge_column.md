# merge_column 核心还原记录

多列合并工具 — 用于将 Excel 表中多列值合并为一个新列。

**本项状态：** 独立 XLSX 核心 merge_named_columns 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|file_path|string|是|文件或文件夹路径: 要处理的 Excel 文件路径或包含 Excel 文件的文件夹路径|
|keyword|string|是|文件名关键词: 用于过滤文件名的关键词，留空则处理所有 Excel 文件|
|column_names|string|是|待合并列名: 需要合并的列名，多个列名用逗号分隔（如：客户,项目,"固定值"）|
|delimiter|string|是|连接符: 用于连接多个值的分隔符（如：,或;）|
|insert_index|string|是|插入位置: 新列插入位置，可以是列字母（如 A）或数字索引（如 1）|
|insert_name|string|是|新列名称: 合并后的新列名称，留空则默认为'合并列'|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/merge_column.pyd**

【功能名称】多列合并工具
【功能描述】
用于将 Excel 表中多列值合并为一个新列。
1. 支持合并多个列（用逗号分隔）
2. 支持固定值（用引号包裹，如 "固定文本"）
3. 支持自定义连接符（如逗号、分号等）
4. 支持指定插入位置（列字母或数字索引）
5. 支持自定义新列名称
6. 支持批量处理文件夹中的多个文件
7. 支持按文件名关键词过滤文件
8. 自动将 .xls 文件转换为 .xlsx 格式
9. 直接修改原文件

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/merge_column.pyd|10/10|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__merge_column.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__merge_column.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__merge_column.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/merge_column.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|73|get_planning_guide()|||
|98|log(msg)|msg||
|101|print_summary(start_time, success, fail, file_count)|start_time, success, fail, file_count, duration||
|115|_letter_to_number(column_letter)|column_letter, number, char|将Excel列字母（如'A', 'B', 'AA'）转换为数字索引（1, 2, 27）|
|123|_find_excel_files(directory)|directory, excel_files, root_dir, file|递归查找给定目录及其子目录下的所有Excel文件|
|147|_filter_paths_by_keyword(paths, keyword)|paths, keyword, filtered_paths, path|根据给定的关键词过滤路径列表（仅匹配文件名）|
|155|_merge_columns_in_file(file_path, column_names, delimiter, insert_index, insert_name)|file_path, column_names, delimiter, insert_index, insert_name, columns_to_merge, dtype_dict, df, actual_columns, missing_columns, merged_column_name, merge_values, merge_values, insert_col_idx, cols, new_file_path, msg, col, col, col, col|<br>    将Excel中多列值合并为一个新列<br>    <br>    参数:<br>        file_path: Excel文件路径<br>        column_names: 需要合并的列名列表（可包含固定值）<br>        delimiter: 连接符<br>        insert_index: 插入位置（列字母或数字）<br>        insert_name: 新列名称<br>    |
|244|_process_single_file(core, file_path, column_names, delimiter, insert_index, insert_name)|core, file_path, column_names, delimiter, insert_index, insert_name, result, e|处理单个文件|
|255|_get_target_files(core, path_str, keyword)|core, path_str, keyword, work_dir, full_path, all_files, target_files|获取目标文件列表|
|283|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, success_count, fail_count, processed_files_count, work_dir, output_dir, config, cfg_rel_path, full_cfg_path, wb, ws, get_val, get_val, e, file_path, keyword, column_names, delimiter, insert_index, insert_name, target_files, msg, results, f_idx, f_path, f_name, progress, res_msg, err_msg||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000dbb0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__merge_column.pyd/__init____0x18000d9c0.annotated.c>)|
|_filter_paths_by_keyword|0x180003aa0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__merge_column.pyd/_filter_paths_by_keyword__0x180003870.annotated.c>)|
|_find_excel_files|0x180002e20|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__merge_column.pyd/_find_excel_files__0x180002c40.annotated.c>)|
|_get_target_files|0x180008340|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__merge_column.pyd/_get_target_files__0x180008060.annotated.c>)|
|_letter_to_number|0x180002650|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__merge_column.pyd/_letter_to_number__0x180002460.annotated.c>)|
|_merge_columns_in_file|0x180004d20|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__merge_column.pyd/_merge_columns_in_file__0x180004020.annotated.c>)|
|_process_single_file|0x180007610|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__merge_column.pyd/_process_single_file__0x180007210.annotated.c>)|
|get_val|0x180009250|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__merge_column.pyd/get_val__0x180009070.annotated.c>)|
|merge_values|0x1800045d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__merge_column.pyd/merge_values__0x1800043f0.annotated.c>)|
|run|0x180009430|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__merge_column.pyd/run__0x180008ce0.annotated.c>)|

## 独立源代码和验证范围

独立 XLSX 核心 merge_named_columns 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。

|已独立 helper|自有代码|
|---|---|
|merge_column._letter_to_number|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

[独立 XLSX 核心](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/table_files.py>)

[成果验证](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/table-flow-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
