# related_party 核心还原记录

关联方核查 — 输入数据：input/关联方核查配置表.xlsx（配置表 + 客户名单/供应商名单/离任高管sheet）

**本项状态：** 独立 13 维度规则在已索引数据上通过 195 项对照，每个维度均有命中样例。53 类工商文件加载、线上股权穿透、完整报表及其他未覆盖分支尚未迁移。

**客户端独立迁移：未完成。** 以下的原生伪代码/汇编是还原证据，不是可直接执行的 Python 源码。

## 接口与文件约定

原 MCP 调度使用 `run(ctx, config_mode="direct", config_data=arguments)`。输入默认值和业务校验仍由入口决定。

|参数|接口类型|必填|原始说明|
|---|---|---|---|
|audit_target|string|是|被审计单位: 被审计单位名称（精确工商注册全称）|
|data_dir|string|是|数据目录: 工商信息Excel所在目录（解压后的文件夹路径）|
|threshold|integer|否|持股阈值(%): 持股比例>=该值识别为分子公司/继续穿透，默认50，设0禁用自动识别|
|equity_penetration|string|否|启用股权穿透: 是否启用CICPA股权穿透API，需要注协Cookie 可选值：["否", "是"]|
|equity_depth|integer|否|穿透深度: 最大穿透层数，默认5|
|output_path|string|否|输出路径: 报告输出路径（MCP模式使用，默认自动生成到output目录）|
|cookie_json|string|否|Cookie JSON: 注协系统Cookie（AI模式使用）|

以下来自原模块的输入/输出说明。扩展名仅据声明列示，未做对照的格式不能据此称为已支持。

**modules/related_party.pyd**

关联方核查
输入数据：input/关联方核查配置表.xlsx（配置表 + 客户名单/供应商名单/离任高管sheet）

input/工商信息数据/（53个Excel文件，由"注协系统工商信息获取"模块导出）
输出结果：output/关联方核查/{被审计单位}关联方分析报告.xlsx
功能描述：基于企业工商信息数据，对被审计单位的客户和供应商进行13维度关联方检测。

维度包括：股权穿透(D01)、共同股东(D02)、实际控制人穿透(D03)、关键管理人员重叠(D04)、法定代表人交叉(D05)、
法定代表人变更轨迹(D06)、同址经营(D07)、联系方式共用(D08)、变更时间窗口(D09)、企业名称相似度(D10)、
参保人数异常(D11)、交易对手状态异常(D12)、补充人员关联(E01)。

可选启用CICPA股权穿透API获取更深层数据。

## 完整原生证据

|实现文件|反编译/候选数|完整汇编|初始化常量|签名和原源行号|
|---|---|---|---|---|
|modules/related_party.pyd|51/52|[带注释汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/assembly/modules__related_party.annotated.asm>)|[常量](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/constants/modules__related_party.pyd.json>)|[元数据](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/introspection/modules__related_party.pyd.json>)|

函数地址由方法表和直接调用候选解析。反编译器的参数类型/控制流、部分候选函数对应关系仍需人工审查；完整线性汇编也不保证每个边界都被正确识别。

## 函数及处理步骤证据

以下按原源文件行号排列。变量名和函数说明来自原生 Cython 元数据，能够帮助追踪处理过程；它们本身不证明函数已被改写。

### modules/related_party.pyd

|原源行号|函数/方法签名|处理变量|业务说明|
|---|---|---|---|
|36|_cookie_file()|||
|154|normalize_name(name: 'str') -> 'str'|name|标准化企业名称：去空格、统一全半角括号、转小写|
|165|_load_excel(data_dir: 'Path', filename: 'str') -> 'list'|data_dir, filename, filepath, wb, ws, rows, headers, result, row, record, i, val, col, i, h|加载单个 Excel，返回 [{col: val, ...}, ...]|
|189|_load_all_data(data_dir: 'Path') -> 'dict'|data_dir, files, data, key, filename|加载所有 Excel 到 {文件名: [records]} 字典|
|212|_load_names_from_file(filepath: 'str') -> 'list'|filepath, path, names, wb, ws, row, f, line|从文件加载企业名称列表（支持 txt 和 xlsx）|
|239|CompanyIndex.__init__(self, data: 'dict', target_names: 'set')|self, data, target_names, n||
|263|CompanyIndex._company_key(self, name) -> 'str'|self, name||
|266|CompanyIndex._person_key(self, name) -> 'str'|self, name||
|269|CompanyIndex._extract_email_domain(self, email: 'str') -> 'str'|self, email||
|274|CompanyIndex._build(self)|self, rec, key, reg_status, addr, addr_key, phone, domain, legal_person, company, shareholder, entry, sh_key, person, before, after||
|436|EquityPenetration.__init__(self, cookies_path: 'str' = '.cicpa_cookies.json', threshold: 'float' = 50.0, max_depth: 'int' = 5, delay: 'float' = 1.0)|self, cookies_path, threshold, max_depth, delay||
|449|EquityPenetration._load_cookies(self) -> 'None'|self, f, data||
|459|EquityPenetration._call_api(self, orgid: 'str') -> 'Optional[Dict]'|self, orgid, url, headers, response, result, data, e||
|487|EquityPenetration._parse_ratio(self, czbl: 'str') -> 'float'|self, czbl||
|495|EquityPenetration._penetrate_holders(self, children: 'List[Dict]', chain: 'List[str]', depth: 'int') -> 'Dict[str, Dict]'|self, children, chain, depth, result, child, name, child_type, ratio_str, ratio, current_chain, key, should_penetrate, sub_children, child_orgid, sub_result, api_data, api_tree||
|537|EquityPenetration._extract_invests(self, invests: 'Dict') -> 'Dict[str, Dict]'|self, invests, result, children, child, name, ratio_str, ratio, status, key||
|555|EquityPenetration.penetrate(self, company_name: 'str', orgid: 'str') -> 'Dict[str, Any]'|self, company_name, orgid, data, controllers, final_beneficiaries, holders_obj, holders_tree, holders, invests_obj, invests||
|581|RelatedPartyScanner.__init__(self, index: 'CompanyIndex', audit_target: 'str', customers: 'list', suppliers: 'list', subsidiaries: 'list' = None, former_execs: 'list' = None, auto_subsidiary_threshold: 'float' = 50.0, equity_data: 'dict' = None)|self, index, audit_target, customers, suppliers, subsidiaries, former_execs, auto_subsidiary_threshold, equity_data, entity, s, sub_name, ratio_str, ratio, inv, inv_name, company, status, c, s||
|635|RelatedPartyScanner._add_finding(self, dimension, dimension_name: 'str', target_company: 'str', confidence: 'str', evidence: 'str', detail: 'dict' = None)|self, dimension, dimension_name, target_company, confidence, evidence, detail, dim_key, role||
|660|RelatedPartyScanner._get_target_legal_persons(self, company: 'str') -> 'set'|self, company, persons, basic, ch||
|672|RelatedPartyScanner._get_target_executives(self, company: 'str') -> 'set'|self, company, e||
|675|RelatedPartyScanner._get_target_shareholders(self, company: 'str') -> 'set'|self, company, s||
|679|RelatedPartyScanner._get_penetrated_shareholders(self, company: 'str') -> 'set'|self, company, eq, holders||
|686|RelatedPartyScanner._get_audit_all_persons(self) -> 'set'|self, persons, entity||
|695|RelatedPartyScanner.check_dimension_01(self)|self, a_subsidiaries, a_investments, entity, a_related, target, sub, sub_investments, target_subs, genexpr, genexpr, genexpr, i, s||
|723|RelatedPartyScanner.check_dimension_02(self)|self, use_penetration, a_shareholders, entity, target, t_shareholders, common, source, i, j, t1, t2, s1, s2||
|757|RelatedPartyScanner.check_dimension_03(self)|self, a_controllers, entity, c, a_beneficiaries, b, target, t_controllers, common_ctrl, t_beneficiaries, common_ben, c, b||
|781|RelatedPartyScanner.check_dimension_04(self)|self, a_executives, entity, target, t_executives, common||
|794|RelatedPartyScanner.check_dimension_05(self)|self, a_legal_persons, entity, target, t_legal_persons, common||
|807|RelatedPartyScanner.check_dimension_06(self)|self, a_all_persons, target, ch, before, after, date||
|823|RelatedPartyScanner._extract_address_core(self, addr: 'str') -> 'str'|self, addr, m||
|834|RelatedPartyScanner._extract_address_road(self, addr: 'str') -> 'str'|self, addr, m||
|846|RelatedPartyScanner.check_dimension_07(self)|self, a_addrs, entity, addr, virtual_keywords, target, t_addr, a_addr, matched, evidence, ratio, a_core, t_core, a_road, t_road, is_virtual, confidence, genexpr, genexpr||
|890|RelatedPartyScanner._parse_phones(self, phone_str: 'str') -> 'set'|self, phone_str, phones, p||
|901|RelatedPartyScanner.check_dimension_08(self)|self, a_phones, a_domains, entity, basic, domain, target_phones, target, t_basic, t_phones, common, t_domain, public_domains, target_domains, target_emails, email_str, emails, domains, e, i, j, t1, t2, common_phones, common_domains, common_emails, genexpr, genexpr||
|966|RelatedPartyScanner.check_dimension_09(self)|self, a_all_persons, entity, target, ch, item, before, after, date, person||
|986|RelatedPartyScanner.check_dimension_10(self)|self, strip_suffix, strip_suffix, a_stripped_names, target, t_stripped, a_name, ratio, e||
|1004|RelatedPartyScanner.check_dimension_11(self)|self, target, basic, insured_raw, insured, role||
|1023|RelatedPartyScanner.check_registration_status(self)|self, abnormal_statuses, target, role, status|检查客户/供应商的登记状态（注销/吊销）|
|1037|RelatedPartyScanner.check_dimension_e01(self)|self, target, t_executives, common, t_legal_persons, common_legal||
|1054|RelatedPartyScanner.run_all(self, data: 'dict') -> 'list'|self, data, checks, check, e, order||
|1077|_set_cell_style(cell, fill=None, font=None, alignment=None, border=None)|cell, fill, font, alignment, border||
|1088|_auto_width(ws)|ws, col, max_len, col_letter, cell, val_str, length, genexpr, genexpr||
|1100|_create_dimension_findings_map(findings: 'list') -> 'dict'|findings, dimension_map, f||
|1107|_get_company_role(company_name: 'str', customers: 'list', suppliers: 'list') -> 'str'|company_name, customers, suppliers, norm_name, c, s||
|1118|_create_company_risk_summary(findings: 'list', customers: 'list', suppliers: 'list', registration_statuses: 'dict' = None) -> 'list'|findings, customers, suppliers, registration_statuses, company_map, norm_customers, norm_suppliers, f, target_name, names_to_process, name, norm_name, result, confidence_order, data, unique_dimensions, max_confidence, original_name, reg_status, c, s||
|1155|_write_report(findings: 'list', output_path: 'str', audit_target: 'str', customers: 'list', suppliers: 'list', auto_subsidiaries: 'dict' = None, registration_statuses: 'dict' = None)|findings, output_path, audit_target, customers, suppliers, auto_subsidiaries, registration_statuses, wb, norm_customers, norm_suppliers, dimension_map, dimension_stats, dim_key, dim_findings, ws_summary, row, label, value, col, heatmap_headers, col_idx, header, total_hits, total_high, total_mid, total_low, info, stats, dim_code, row_data, cell, total_data, company_risk_summary, risk_headers, idx, risk, val, dim_name, ws_dim, headers, hit_map, f, target_name, names, name, seq, company, norm_company, role, ws_subs, norm_c, norm_s, sub_name, sub_info, is_trading, ws_input, title, items, item, c, s, genexpr, genexpr, genexpr, genexpr, c, s|输出多 sheet Excel 报告|
|1408|_save_cookie_string(cookie_str: 'str')|cookie_str, cookie_data, cookies_dict, xsrf_token, part, k, v, f|将 cookie 字符串保存为 .cicpa_cookies.json|
|1441|_run_gui(ctx, config_data: 'dict')|ctx, config_data, config_path, wb, ws, config, row, audit_target, data_dir, threshold, equity_pen_value, equity_pen, eq_depth, data_path, config_file, customers, suppliers, former_execs, sheet_name, rows, names, settings, cookie_str, data, index, scanner, findings, equity_data, eq, penetration_targets, company, basic, orgid, result, e, ts, output_path, r|GUI 模式：从配置表读取参数执行|
|1576|_run_mcp(ctx, config_data: 'dict')|ctx, config_data, audit_target, data_dir, customers_str, suppliers_str, customer_file, supplier_file, former_execs_str, former_exec_file, threshold, equity_pen, eq_depth, output_path, cookie_json, data_path, customers, suppliers, former_execs, settings, cookie_str, e, data, data_info, all_names, index, scanner, equity_data, eq, penetration_targets, company, basic, orgid, result, findings, ts, output_path_p, dim_summary, f, c, s, e, key, records, genexpr, genexpr, genexpr, genexpr|MCP 模式：AI 助手调用|
|1702|run(ctx, config_mode='gui', config_data=None)|ctx, config_mode, config_data|模块执行入口|

函数伪代码索引（保留原反编译结果及常量注释）：

|函数候选|地址|原函数名证据|输出|
|---|---|---|---|
|__init__|0x180006090|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/__init____0x180005d40.annotated.c>)|
|__init__|0x18000e7a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/__init____0x18000e140.annotated.c>)|
|__init__|0x180016080|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/__init____0x180015a30.annotated.c>)|
|_add_finding|0x180019a60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_add_finding__0x180019400.annotated.c>)|
|_auto_width|0x180036ab0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_auto_width__0x1800364b0.annotated.c>)|
|_build|0x180008670|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_build__0x180008490.annotated.c>)|
|_call_api|0x18000ff70|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_call_api__0x18000fd10.annotated.c>)|
|_company_key|0x180007a80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_company_key__0x180007850.annotated.c>)|
|_cookie_file|0x1800019a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_cookie_file__0x1800019a0.annotated.c>)|
|_create_company_risk_summary|0x1800393c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_create_company_risk_summary__0x180038790.annotated.c>)|
|_create_dimension_findings_map|0x1800379f0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_create_dimension_findings_map__0x180037720.annotated.c>)|
|_extract_address_core|0x180026b80|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_extract_address_core__0x180026920.annotated.c>)|
|_extract_address_road|0x1800274c0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_extract_address_road__0x180027260.annotated.c>)|
|_extract_email_domain|0x180008230|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_extract_email_domain__0x180007fe0.annotated.c>)|
|_extract_invests|0x180013e30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_extract_invests__0x180013bd0.annotated.c>)|
|_get_audit_all_persons|0x18001ca30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_get_audit_all_persons__0x18001c840.annotated.c>)|
|_get_company_role|0x1800380a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_get_company_role__0x180037d30.annotated.c>)|
|_get_penetrated_shareholders|0x18001c460|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_get_penetrated_shareholders__0x18001c210.annotated.c>)|
|_get_target_executives|0x18001b4d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_get_target_executives__0x18001b280.annotated.c>)|
|_get_target_legal_persons|0x18001a800|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_get_target_legal_persons__0x18001a5a0.annotated.c>)|
|_get_target_shareholders|0x18001bc10|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_get_target_shareholders__0x18001b9b0.annotated.c>)|
|_load_all_data|0x180003fb0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_load_all_data__0x180003dc0.annotated.c>)|
|_load_cookies|0x18000ee20|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_load_cookies__0x18000ec40.annotated.c>)|
|_load_excel|0x180002ab0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_load_excel__0x180002850.annotated.c>)|
|_load_names_from_file|0x180004850|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_load_names_from_file__0x180004590.annotated.c>)|
|_parse_phones|0x18002a5b0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_parse_phones__0x18002a350.annotated.c>)|
|_parse_ratio|0x180011b80|候选待核实|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_parse_ratio__0x180011930.annotated.c>)|
|_penetrate_holders|0x180012250|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_penetrate_holders__0x180011e60.annotated.c>)|
|_person_key|0x180007cb0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_person_key__0x180007cb0.annotated.c>)|
|_run_gui|0x18004b5d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_run_gui__0x18004b370.annotated.c>)|
|_run_mcp|0x180051470|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_run_mcp__0x1800502b0.annotated.c>)|
|_save_cookie_string|0x180049610|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_save_cookie_string__0x180049350.annotated.c>)|
|_set_cell_style|0x180036280|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_set_cell_style__0x180035d70.annotated.c>)|
|_write_report|0x18003cb70|C 生成失败/超时|[函数汇编](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/_write_report__0x18003b500.asm>)|
|check_dimension_01|0x18001dcf0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/check_dimension_01__0x18001ced0.annotated.c>)|
|check_dimension_02|0x18001ffe0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/check_dimension_02__0x18001fe00.annotated.c>)|
|check_dimension_03|0x180021e90|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/check_dimension_03__0x180021cb0.annotated.c>)|
|check_dimension_04|0x180023e40|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/check_dimension_04__0x180023c60.annotated.c>)|
|check_dimension_05|0x1800249d0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/check_dimension_05__0x1800247f0.annotated.c>)|
|check_dimension_06|0x180025560|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/check_dimension_06__0x180025380.annotated.c>)|
|check_dimension_07|0x180027fd0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/check_dimension_07__0x180027a10.annotated.c>)|
|check_dimension_08|0x18002b290|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/check_dimension_08__0x18002abf0.annotated.c>)|
|check_dimension_09|0x18002eff0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/check_dimension_09__0x18002ee10.annotated.c>)|
|check_dimension_10|0x180030cf0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/check_dimension_10__0x180030770.annotated.c>)|
|check_dimension_11|0x180031d40|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/check_dimension_11__0x180031b60.annotated.c>)|
|check_dimension_e01|0x180033a10|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/check_dimension_e01__0x180033830.annotated.c>)|
|check_registration_status|0x180032e30|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/check_registration_status__0x180032c50.annotated.c>)|
|normalize_name|0x1800024a0|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/normalize_name__0x1800021d0.annotated.c>)|
|penetrate|0x180014c60|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/penetrate__0x180014910.annotated.c>)|
|run|0x180058170|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/run__0x180057de0.annotated.c>)|
|run_all|0x180034a00|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/run_all__0x180034480.annotated.c>)|
|strip_suffix|0x180030b40|原函数名出现|[C 伪代码](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/decompiled/modules__related_party.pyd/strip_suffix__0x180030950.annotated.c>)|

## 独立源代码和验证范围

独立 13 维度规则在已索引数据上通过 195 项对照，每个维度均有命中样例。53 类工商文件加载、线上股权穿透、完整报表及其他未覆盖分支尚未迁移。

|已独立 helper|自有代码|
|---|---|
|related_party.normalize_name|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/kernels.py>)|
|related_party._extract_email_domain|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/relation_helpers.py>)|
|related_party._person_key|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/relation_helpers.py>)|
|related_party._extract_address_core|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/relation_helpers.py>)|
|related_party._extract_address_road|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/relation_helpers.py>)|
|related_party._parse_phones|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/relation_helpers.py>)|
|related_party._parse_ratio|[源码](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/relation_helpers.py>)|

[辅助规则验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/helper-verification.json>)

[独立 13 维度核心](<C:/Users/Install/Desktop/ai助手/src/audit-domain/recovered/related.py>)

[195 例验证结果](<C:/Users/Install/Desktop/ai助手/artifacts/core-coverage-20261010/relation-rule-verification.json>)

未覆盖分支：多层间接投资、线上穿透的全部返回类型、地址模糊/道路等回退及异常数据。当前代码验证范围限于报告所列样例。

## 后续迁移验收

补齐未覆盖的业务分支、文件读写与输出格式；为本项运行完整正常/异常样例；接入自有调度；在没有旧 EXE/.pyd 的安装环境中验收。不得以存在文件、可导入、方法名或 C 输出替代这一步。
