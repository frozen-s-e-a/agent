# xlsx_writer 核心还原记录

批量生成小账套

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|config_file|string|否|配置表文件路径（绝对路径或相对路径）|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/xlsx_writer.pyd**

【功能名称】批量生成小账套
【输入数据】批量生成小账套.xlsx
【输出结果】配置表中指定的输出文件夹
【提醒事项】数据文件需要遵循严格的命名规则。
  如果每家公司的数据在独立的文件夹中，那么该文件夹的名称应为公司名。
  文件命名应为："公司名-科目余额表.xlsx", "公司名-辅助科目余额表.xlsx", "公司名-序时账.xlsx"。
  如果所有文件在同一个文件夹中，命名规则亦是如此。
  若文件名不匹配，程序将报错并提示找不到文件。请仔细检查文件路径和命名。
  建议使用“文件批量重命名”等工具进行预处理。
【作    者】赵君

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/xlsx_writer.pyd|10/10|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__xlsx_writer.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__xlsx_writer.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__xlsx_writer.pyd.json>)|
|modules/xlwings_safe.pyd|19/19|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__xlwings_safe.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__xlwings_safe.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__xlwings_safe.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/xlsx_writer.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|64|get_first_file_extension(folder_path)|folder_path, files, first_file, _, file_extension, f|获取文件夹中第一个文件的扩展名，默认为.xlsx|
|82|process_company_data_old(company, data_combination_source_file_path, save_folder, app, mapping_data, is_partitioned)|company, data_combination_source_file_path, save_folder, app, mapping_data, is_partitioned, destination_path, folder, extension, file_paths, directory, workbook, index, file_path, macros_with_parameters, p, sheet_name, sheet, e, macro_name, parameter, macro_to_run, r_p, parameter_range, sheet_name|处理单个公司的数据，生成小账套文件|
|170|process_company_data(company, data_combination_source_file_path, save_folder, app, mapping_data, is_partitioned)|company, data_combination_source_file_path, save_folder, app, mapping_data, is_partitioned, destination_path, folder, directory, workbook, POSSIBLE_EXTENSIONS, index, table_name, data_file_path, base_filename, ext, potential_path, macros_with_parameters, p, sheet_name, macro_name, parameter, sheet, e, macro_to_run, r_p, parameter_range|<br>    处理单个公司的数据，生成小账套文件。<br>    该函数现在能够为每个数据表（科目余额表、辅助余额表、序时账）<br>    独立查找正确的扩展名 (.xlsx, .xls, .xlsm)。<br>    |
|285|set_file_permissions(file_path)|file_path, system_type, command, e|根据操作系统设置文件权限|
|298|write_title_to_sheet(workbook, cur_table, mapping_data, sheet_name='导入数据')|workbook, cur_table, mapping_data, sheet_name, data, sheet, item, e|将映射关系写入 '导入数据' 工作表|
|320|generate_json_from_excel(workbook, sheet_name)|workbook, sheet_name, sheet, json_data, start_row, original_headers, small_account_headers, col_idx, small_account_header, column_letter, cell, cell|从Excel映射表生成JSON配置|
|353|generate_json_info(file_path)|file_path, wb, json_subject, json_asist_subject, json_journal, json_data, data_folder, save_folder, partition_data|从配置文件完整生成JSON和路径信息|
|392|get_company_list(folder_path, is_partitioned)|folder_path, is_partitioned, subfolders, unique_names, filename, name_without_extension, base_name, entry|根据配置获取待处理的公司列表|
|414|run(ctx, config_mode='excel', config_data=None)|ctx, config_mode, config_data, start_time, work_dir, config_path, app, success_count, failed_companies, mapping_data, data_folder, save_folder, company_list, total_companies, mapping_data_json_obj, i, company, progress, e, end_time, total_time|主执行函数|

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x180017410|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlsx_writer.pyd/__init____0x180017410.annotated.c>)|
|generate_json_from_excel|0x18000cb20|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlsx_writer.pyd/generate_json_from_excel__0x18000c900.annotated.c>)|
|generate_json_info|0x18000e530|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlsx_writer.pyd/generate_json_info__0x18000e350.annotated.c>)|
|get_company_list|0x18000fcb0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlsx_writer.pyd/get_company_list__0x18000fa90.annotated.c>)|
|get_first_file_extension|0x1800014b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlsx_writer.pyd/get_first_file_extension__0x1800012d0.annotated.c>)|
|process_company_data|0x180006ac0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlsx_writer.pyd/process_company_data__0x1800066c0.annotated.c>)|
|process_company_data_old|0x180002b50|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlsx_writer.pyd/process_company_data_old__0x180002750.annotated.c>)|
|run|0x180011420|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlsx_writer.pyd/run__0x180011090.annotated.c>)|
|set_file_permissions|0x18000a480|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlsx_writer.pyd/set_file_permissions__0x18000a2a0.annotated.c>)|
|write_title_to_sheet|0x18000b6d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlsx_writer.pyd/write_title_to_sheet__0x18000b320.annotated.c>)|

### modules/xlwings_safe.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|27|_get_safe_dir()|base, safe_dir|返回 macOS 安全目录路径，Windows 返回 None。|
|44|_SafeBook.__init__(self, wb, original_path=None)|self, wb, original_path||
|48|_SafeBook.__getattr__(self, name)|self, name||
|51|_SafeBook.__setattr__(self, name, value)|self, name, value||
|57|_SafeBook.save(self, path=None)|self, path, target, safe_dir, tmp||
|86|_SafeBook.close(self)|self, safe_path||
|100|_SafeBooks.__init__(self, app)|self, app||
|103|_SafeBooks.open(self, path, **kwargs)|self, path, kwargs, safe_dir, basename, safe_path, wb||
|116|_SafeBooks.add(self)|self, wb||
|120|_SafeBooks.__getattr__(self, name)|self, name||
|131|SafeApp.__init__(self, **kwargs)|self, kwargs||
|143|SafeApp.__getattr__(self, name)|self, name||
|146|SafeApp.__setattr__(self, name, value)|self, name, value||
|152|SafeApp.quit(self)|self||
|156|SafeApp.kill(self)|self||
|160|SafeApp.__enter__(self)|self||
|163|SafeApp.__exit__(self, *args)|self, args||
|171|_cleanup()|safe_dir, prefix, f|清理本进程在安全目录中的临时文件。|

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__enter__|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__enter____0x180008740.annotated.c>)|
|__exit__|0x180008d60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__exit____0x1800089f0.annotated.c>)|
|__getattr__|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__getattr____0x180001bc0.annotated.c>)|
|__getattr__|0x180006750|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__getattr____0x180006430.annotated.c>)|
|__getattr__|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__getattr____0x180007520.annotated.c>)|
|__init__|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__init____0x1800016d0.annotated.c>)|
|__init__|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__init____0x1800049c0.annotated.c>)|
|__init__|0x180006be0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__init____0x1800068a0.annotated.c>)|
|__setattr__|0x1800022d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__setattr____0x180001f60.annotated.c>)|
|__setattr__|0x180007c30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/__setattr____0x1800078c0.annotated.c>)|
|_cleanup|0x18000c8a0|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/_cleanup__0x180009130.annotated.c>)|
|_get_safe_dir|0x18000cb80|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/_get_safe_dir__0x180001030.annotated.c>)|
|add|0x1800061e0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/add__0x180005f30.annotated.c>)|
|api|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/api__0x1800071f0.annotated.c>)|
|books|0x18000d240|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/books__0x180006f10.annotated.c>)|
|kill|0x180008550|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/kill__0x1800082a0.annotated.c>)|
|open|0x180005120|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/open__0x180004d50.annotated.c>)|
|quit|0x1800080b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/quit__0x180007e00.annotated.c>)|
|save|0x180002890|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__xlwings_safe.pyd/save__0x180002500.annotated.c>)|

## 独立源代码和验证范围

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
