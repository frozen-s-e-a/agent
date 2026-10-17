# currency 核心还原记录

外汇管理局汇率数据查询 — 从国家外汇管理局官网获取人民币汇率中间价。

**本项状态：** 原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/currency.pyd**

【功能名称】外汇管理局汇率数据查询
【功能描述】
从国家外汇管理局官网获取人民币汇率中间价。
自动合并历史存档数据（Excel）与最新实时数据（API），生成全量历史汇率表。
无需任何输入参数，一键获取所有数据。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/currency.pyd|4/4|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__currency.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__currency.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__currency.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/currency.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|41|get_planning_guide()|||
|51|currency_boc_safe(core) -> 'pd.DataFrame'|core, url, r, soup, content, history_excel_url, e, temp_df, last_date, start_date, end_date, query_url, payload, current_temp_df, dfs, big_df, column_name_list, item|<br>    核心爬虫逻辑<br>    增加 core 参数用于检测中断信号<br>    |
|136|save_pretty_excel(df, output_path)|df, output_path, wb, ws, r, cell, i, col_letter||
|160|print_summary(start_time, row_count, output_path)|start_time, row_count, output_path, duration||
|172|run(core, config_mode='excel', config_data=None)|core, config_mode, config_data, start_time, work_dir, output_dir, output_excel_path, df_result, e, last_row, last_date, usd_rate||

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x1800097d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__currency.pyd/__init____0x1800095e0.annotated.c>)|
|currency_boc_safe|0x180001330|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__currency.pyd/currency_boc_safe__0x180001150.annotated.c>)|
|run|0x1800072f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__currency.pyd/run__0x180006f60.annotated.c>)|
|save_pretty_excel|0x180005210|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__currency.pyd/save_pretty_excel__0x180004ff0.annotated.c>)|

## 独立源代码和验证范围

原生算法、常量和接口证据已保存；尚未改写并验证独立 Python 业务实现。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
