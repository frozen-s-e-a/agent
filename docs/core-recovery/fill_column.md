# fill_column 核心还原记录

向下填充空值工具 — 用于将 Excel 表中某些列的空值向下填充。

**本项状态：** 独立 XLSX 核心 fill_down_columns 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|file_path|string|是|文件或文件夹路径: 要处理的 Excel 文件路径或包含 Excel 文件的文件夹路径|
|keyword|string|是|文件名关键词: 用于过滤文件名的关键词，留空则处理所有 Excel 文件|
|column_names|string|是|待填充列名: 需要向下填充的列名，多个列名用逗号分隔（如：客户,项目）|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/fill_column.pyd**

【功能名称】向下填充空值工具
【功能描述】
用于将 Excel 表中某些列的空值向下填充。
1. 支持指定多个列名（用逗号分隔）
2. 自动处理所有 Sheet
3. 支持批量处理文件夹中的多个文件
4. 支持按文件名关键词过滤文件
5. 自动将 .xls 文件转换为 .xlsx 格式
6. 直接修改原文件，请操作前进行数据备份

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/fill_column.pyd|8/8|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__fill_column.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__fill_column.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__fill_column.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/fill_column.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|51|get_planning_guide()|||
|72|log(msg)|msg||
|75|print_summary(start_time, success, fail, file_count)|start_time, success, fail, file_count, duration||
|89|_find_excel_files(folder_path)|folder_path, excel_files, root, dirs, files, file|递归查找文件夹中的所有 Excel 文件|
|109|_filter_paths_by_keyword(paths, keyword)|paths, keyword, filtered, path, filename|根据关键词过滤文件路径|
|122|_fill_columns_in_file(file_path, column_names)|file_path, column_names, file_extension, engine, df_dict, sheet_name, sheet_df, column, matching_columns, col, new_path, writer, col|<br>    向下填充Excel中指定列的空白单元格<br>    <br>    参数:<br>        file_path: Excel文件路径<br>        column_names: 需要向下填充的列名列表<br>    |
|162|_process_single_file(core, file_path, column_names)|core, file_path, column_names, e|处理单个文件|
|179|_get_target_files(core, path_str, keyword)|core, path_str, keyword, work_dir, full_path, all_files, target_files|获取目标文件列表|
|207|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, success_count, fail_count, processed_files_count, work_dir, output_dir, config, cfg_rel_path, full_cfg_path, wb, ws, get_val, get_val, e, file_path, keyword, column_names_str, column_names, target_files, msg, results, f_idx, f_path, f_name, progress, res_msg, err_msg, name||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x18000c1c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__fill_column.pyd/__init____0x18000bfd0.annotated.c>)|
|_fill_columns_in_file|0x180003d50|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__fill_column.pyd/_fill_columns_in_file__0x180003b30.annotated.c>)|
|_filter_paths_by_keyword|0x1800035e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__fill_column.pyd/_filter_paths_by_keyword__0x1800033b0.annotated.c>)|
|_find_excel_files|0x1800023e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__fill_column.pyd/_find_excel_files__0x180002200.annotated.c>)|
|_get_target_files|0x180006c50|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__fill_column.pyd/_get_target_files__0x180006970.annotated.c>)|
|_process_single_file|0x180005fb0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__fill_column.pyd/_process_single_file__0x180005cd0.annotated.c>)|
|get_val|0x180007b60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__fill_column.pyd/get_val__0x180007980.annotated.c>)|
|run|0x180007d40|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__fill_column.pyd/run__0x1800075f0.annotated.c>)|

## 独立源代码和验证范围

独立 XLSX 核心 fill_down_columns 已通过原入口成果对照（8 项共 12 例）。未覆盖所有参数、样式、.xls、宏、Excel 重算及目录调度。

[独立 XLSX 核心](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/table_files.py>)

[成果验证](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/table-flow-verification.json>)

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
