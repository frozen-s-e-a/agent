# add_column 核心还原记录

相同名称列合并工具 — 用于将 Excel 表中相同名称的列值合并为一个新列。

**本项状态：** 独立 XLSX 核心 merge_same_name_columns 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|file_path|string|是|文件或文件夹路径: 要处理的 Excel 文件路径或包含 Excel 文件的文件夹路径|
|keyword|string|是|文件名关键词: 用于过滤文件名的关键词，留空则处理所有 Excel 文件|
|column_name|string|是|待合并列名: 需要合并的列名（如：客户）|
|delimiter|string|是|连接符: 用于连接多个值的分隔符（如：,或;），留空则直接拼接|
|max_column_num|number|是|最大列数: 相同列名的最大数量，不足时自动插入空列|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/add_column.pyd**

【功能名称】相同名称列合并工具
【功能描述】
用于将 Excel 表中相同名称的列值合并为一个新列。
1. 自动查找所有同名列
2. 支持自定义连接符（如逗号、分号等）
3. 支持指定同名列的最大数量（不足时自动插入空列）
4. 合并结果添加为新列（列名：合并_原列名）
5. 支持批量处理文件夹中的多个文件
6. 支持按文件名关键词过滤文件
7. 直接修改原文件

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/add_column.pyd|8/8|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__add_column.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__add_column.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__add_column.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/add_column.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|64|get_planning_guide()|||
|88|log(msg)|msg||
|91|print_summary(start_time, success, fail, file_count)|start_time, success, fail, file_count, duration||
|105|_find_excel_files(directory)|directory, excel_files, root_dir, file|递归查找给定目录及其子目录下的所有Excel文件|
|129|_filter_paths_by_keyword(paths, keyword)|paths, keyword, filtered_paths, path|根据给定的关键词过滤路径列表（仅匹配文件名）|
|137|_merge_columns_by_name(excel_path, column_name, delimiter, max_column_num)|excel_path, column_name, delimiter, max_column_num, wb, ws, matching_columns, insert_num, last_same_column, i, new_column_name, existing_columns, last_column_index, row, values, merged_value, msg, col, col, col|<br>    根据给定的列名和连接符合并具有相同名称的所有列，并将结果添加为新的一列<br>    <br>    参数:<br>        excel_path: Excel文件路径<br>        column_name: 需要合并的列名<br>        delimiter: 用于连接值的分隔符<br>        max_column_num: 相同column_name的列最大数量<br>    <br>    返回:<br>        处理结果消息<br>    |
|210|_process_single_file(core, file_path, column_name, delimiter, max_column_num)|core, file_path, column_name, delimiter, max_column_num, result, e|处理单个文件|
|221|_get_target_files(core, path_str, keyword)|core, path_str, keyword, work_dir, full_path, all_files, target_files|获取目标文件列表|
|249|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, success_count, fail_count, processed_files_count, work_dir, output_dir, config, cfg_rel_path, full_cfg_path, wb, ws, get_val, get_val, e, file_path, keyword, column_name, delimiter, max_column_num, target_files, msg, results, f_idx, f_path, f_name, progress, res_msg, err_msg||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000c880|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__add_column.pyd/__init____0x18000c690.annotated.c>)|
|_filter_paths_by_keyword|0x1800031e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__add_column.pyd/_filter_paths_by_keyword__0x180002fb0.annotated.c>)|
|_find_excel_files|0x180002560|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__add_column.pyd/_find_excel_files__0x180002380.annotated.c>)|
|_get_target_files|0x180006f00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__add_column.pyd/_get_target_files__0x180006c20.annotated.c>)|
|_merge_columns_by_name|0x180003a70|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__add_column.pyd/_merge_columns_by_name__0x180003760.annotated.c>)|
|_process_single_file|0x1800061e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__add_column.pyd/_process_single_file__0x180005e10.annotated.c>)|
|get_val|0x180007e10|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__add_column.pyd/get_val__0x180007c30.annotated.c>)|
|run|0x180007ff0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__add_column.pyd/run__0x1800078a0.annotated.c>)|

## 独立源代码和验证范围

独立 XLSX 核心 merge_same_name_columns 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。

[独立 XLSX 核心](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/table_files.py>)

[成果验证](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/table-flow-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
