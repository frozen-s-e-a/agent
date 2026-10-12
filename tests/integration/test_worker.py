import importlib.util, unittest, tempfile, csv, json, sys, io
from pathlib import Path
from contextlib import redirect_stdout
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'build/python-packages'))
sys.path.insert(0,str(ROOT/'src/audit-worker'))
spec=importlib.util.spec_from_file_location('worker',ROOT/'src/audit-worker/worker.py');worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)

class WorkerTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(dir=ROOT/'artifacts/test-results');self.root=Path(self.temp.name);self.n=0
  self.headers=['公司','凭证日期','凭证编号','科目编码','科目名称','借方金额','贷方金额','摘要','制单人','审核人']
  self.rows=[['A','2026-01-05','001','001002',' 银行存款 ','0.1','0','回款','甲','乙'],['A','2026-01-05','001','6001','收入','0.2','0.3','回款','甲','乙'],['A','2026-02-08','002','6602','费用','200','0','调整','甲','甲'],['A','2026-02-08','002','1002','银行','0','100','调整','甲','甲']]
  self.write('a.csv',self.rows[:2]);self.write('b.csv',self.rows[2:])
 def tearDown(self): self.temp.cleanup()
 def test_published_result_can_be_chained_with_verified_provenance(self):
  first=self.run_task('select_column',{'columns':'公司,科目编码'})
  source=Path(first['outputDir'])/next(x['name'] for x in first['outputs'] if x['name'].endswith('.csv'))
  before=worker.digest(source)
  second=self.run_task('add_column',{'target':'批次','value':'后续处理'},files=[str(source.relative_to(self.root))])
  self.assertEqual(second['rowCount'],first['rowCount']);self.assertIn('批次',second['columns'])
  self.assertEqual(second['columns'].count('_source_file'),1)
  self.assertTrue(second['preview'][0][0].startswith('outputs/'));self.assertEqual(worker.digest(source),before)
  with source.open('a',encoding='utf-8') as f:f.write('\n篡改的数据')
  with self.assertRaisesRegex(ValueError,'成果校验失败'):self.run_task('add_column',{'target':'批次'},files=[str(source.relative_to(self.root))])
  self.write('reserved.csv',[['fake']],headers=['_source_file'])
  with self.assertRaisesRegex(ValueError,'保留的来源列'):self.run_task('add_column',{'target':'批次'},files=['reserved.csv'])
 def write(self,name,rows,headers=None):
  with (self.root/name).open('w',encoding='utf-8-sig',newline='') as f:w=csv.writer(f);w.writerow(headers or self.headers);w.writerows(rows)
 def run_task(self,tool,params=None,mode='auto',files=None,task_id=None):
  self.n+=1;req={'protocolVersion':1,'taskId':task_id or f'test-{self.n}','root':str(self.root),'tool':tool,'files':files or ['a.csv','b.csv'],'mode':mode,'parameters':params or {},'limits':{'memoryMiB':512,'threads':1}}
  with redirect_stdout(io.StringIO()):return worker.run(req)
 def both(self,tool,p=None):
  a=self.run_task(tool,p,'local-light');b=self.run_task(tool,p,'local-batch');self.assertEqual(a['preview'],b['preview']);self.assertEqual(a['rowCount'],b['rowCount']);return a
 def test_decimal_and_cross_file_balance(self):
  self.write('a.csv',[self.rows[0],self.rows[2]]);self.write('b.csv',[self.rows[1],self.rows[3]])
  a=self.both('voucher_check',{'keys':'公司,凭证日期,凭证编号','debit':'借方金额','credit':'贷方金额','tolerance':'0.01'})
  self.assertEqual(a['rowCount'],1);self.assertEqual(a['preview'][0][5],'100.000000')
 def test_tolerance_strict_boundary(self):
  self.write('a.csv',[['A','2026-01-01','001','1002','银行','0.01','0','','','']]);a=self.run_task('voucher_check',{'keys':'凭证编号','debit':'借方金额','credit':'贷方金额','tolerance':'0.01'},files=['a.csv']);self.assertEqual(a['rowCount'],0)
 def test_bad_money_fails_without_publish(self):
  self.write('a.csv',[['A','2026-01-01','001','1002','银行','abc','0','','','']])
  with self.assertRaisesRegex(ValueError,'金额'):self.run_task('voucher_check',{'keys':'凭证编号','debit':'借方金额','credit':'贷方金额'},files=['a.csv'],task_id='bad')
  self.assertFalse((self.root/'outputs/bad').exists())
 def test_decimal_precision_not_silently_rounded(self):
  self.write('a.csv',[['A','2026-01-01','001','1002','银行','0.1234567','0','','','']])
  with self.assertRaisesRegex(ValueError,'6 位'):self.run_task('voucher_check',{'keys':'凭证编号','debit':'借方金额','credit':'贷方金额'},files=['a.csv'])
 def test_merge_and_select_preserve_codes(self):
  a=self.both('select_column',{'columns':'科目编码,摘要'});self.assertEqual(a['inputRows'],4);self.assertEqual(a['preview'][0][4],'001002');self.both('merge_files')
 def test_fill_does_not_cross_file_boundary(self):
  self.write('a.csv',[['A','x'],['','y']],['科目','值']);self.write('b.csv',[['','z']],['科目','值']);a=self.both('fill_column',{'columns':'科目'});self.assertEqual([r[4] for r in a['preview']],['A','A',None])
 def test_duplicate_global(self):
  self.write('b.csv',[self.rows[0]]);a=self.both('duplicates',{'keys':'公司,凭证日期,凭证编号,科目编码'});self.assertEqual(a['rowCount'],2)
 def test_clean_merge_add(self):
  a=self.both('subject_clean',{'columns':'科目名称'});self.assertEqual(a['preview'][0][8],'银行存款')
  self.both('merge_column',{'columns':'公司,凭证编号','target':'组合键','separator':'-'});self.both('add_column',{'target':'期间','value':'2026'})
 def test_filter_counts(self):
  a=self.both('text_match',{'column':'摘要','keyword':'调整'});self.assertEqual(a['rowCount'],2)
  a=self.both('dropsummary',{'column':'摘要','values':'调整'});self.assertEqual(a['inputRows']-a['rowCount'],2)
 def test_monthly_selection_and_precision(self):
  a=self.both('monthly_analysis',{'date':'凭证日期','subject':'科目编码','subjects':'6001','debit':'借方金额','credit':'贷方金额'});self.assertEqual(a['rowCount'],1);self.assertEqual(a['preview'][0][3],'0.300000')
 def test_jet_rule_template_and_features(self):
  a=self.both('jet_test',{'rules':'同人审单,周末分录'});self.assertEqual(a['rowCount'],4)
 def test_negative_conditions_are_joint_exclusions(self):
  a=self.both('jet_test',{'rules':'非法科目代码'});self.assertEqual(a['rowCount'],1)
 def test_missing_field_fails(self):
  with self.assertRaisesRegex(ValueError,'找不到'):self.run_task('select_column',{'columns':'不存在'})
 def test_traversal_and_duplicate_files_rejected(self):
  with self.assertRaises((ValueError,FileNotFoundError)):self.run_task('inspect',files=['../outside.csv'])
  with self.assertRaisesRegex(ValueError,'重复'):self.run_task('inspect',files=['a.csv','a.csv'])
 def test_input_unchanged_and_idempotent_publication(self):
  before=worker.digest(self.root/'a.csv');a=self.run_task('inspect',task_id='stable');b=self.run_task('inspect',task_id='stable');self.assertEqual(a,b);self.assertEqual(before,worker.digest(self.root/'a.csv'))
  self.write('a.csv',self.rows)
  with self.assertRaisesRegex(ValueError,'版本已改变'):self.run_task('inspect',task_id='stable')
 def test_tampered_output_rejected(self):
  a=self.run_task('inspect',task_id='stable');(Path(a['outputDir'])/'结果-001.csv').write_text('bad')
  with self.assertRaisesRegex(ValueError,'校验失败'):self.run_task('inspect',task_id='stable')
 def test_csv_quotes_newlines_and_formula_escape(self):
  self.write('a.csv',[['001','中文,带逗号\n第二行','=HYPERLINK("https://example.org")']],['代码','文本','表达式'])
  a=self.run_task('inspect',files=['a.csv']);self.assertEqual(a['rowCount'],1);self.assertEqual(a['preview'][0][5],'中文,带逗号\n第二行')
  content=(Path(a['outputDir'])/'结果-001.csv').read_text(encoding='utf-8-sig');self.assertIn("'=HYPERLINK",content)
 def test_ragged_csv_rejected(self):
  (self.root/'a.csv').write_text('a,b\n1,2,3',encoding='utf-8')
  with self.assertRaisesRegex(ValueError,'超出表头'):self.run_task('inspect',files=['a.csv'])
 def test_xlsx_and_link_extraction(self):
  from openpyxl import Workbook
  w=Workbook();s=w.active;s.append(['代码','金额']);s.append(['001',100]);s['A2'].hyperlink='https://example.org';w.save(self.root/'中文 测试.xlsx');w.close()
  a=self.run_task('inspect',files=['中文 测试.xlsx']);self.assertTrue(a['structureOnly']);self.assertIn('001',(Path(a['outputDir'])/'结构概览.json').read_text(encoding='utf-8'));a=self.run_task('link_extract',files=['中文 测试.xlsx']);self.assertEqual(a['rowCount'],1)
 def test_file_inventory(self):
  a=self.run_task('file_inventory');self.assertEqual(a['rowCount'],2);self.assertEqual(a['preview'][0][4],worker.digest(self.root/'a.csv'))
 def test_pdf_empty_page_records_warning(self):
  from pypdf import PdfWriter
  w=PdfWriter();w.add_blank_page(width=200,height=200);w.write(self.root/'blank.pdf')
  a=self.run_task('pdf_text',files=['blank.pdf']);self.assertEqual(a['rowCount'],1);self.assertEqual(a['warningCount'],1)
 def test_preview_has_no_output_side_effect(self):
  a=self.run_task('__preview',files=['a.csv']);self.assertTrue(a['previewOnly']);self.assertFalse((self.root/'outputs').exists())
 def test_all_33_jet_rules_execute_with_explicit_full_mapping(self):
  headers=self.headers+['制单日期','制单时间','类型','编号']
  self.write('a.csv',[self.rows[0]+['2026-03-05','2026-03-05 23:15:00','记','001']],headers)
  rules=json.loads((ROOT/'src/resources/jet-rules.json').read_text(encoding='utf-8'))['rules']
  a=self.run_task('jet_test',{'rules':','.join(r['name'] for r in rules),'keys':'公司,凭证日期,凭证编号'},files=['a.csv']);self.assertGreater(a['rowCount'],0)
 def test_long_text_stays_complete_outside_bounded_preview(self):
  self.write('a.csv',[['z'*40000]],['内容']);a=self.run_task('inspect',files=['a.csv']);self.assertEqual(len(a['preview'][0][4]),500);self.assertTrue(a['excelSkippedForLongText']);self.assertNotIn('结果.xlsx',a['files']);self.assertIn('z'*40000,(Path(a['outputDir'])/'结果-001.csv').read_text(encoding='utf-8-sig'))
 def test_sql_like_headers_and_values_are_data(self):
  name='col"; DROP TABLE data;--';text="'); DROP TABLE data;--\\text"
  self.write('a.csv',[[text]],[name]);a=self.run_task('select_column',{'columns':name},files=['a.csv']);self.assertEqual(a['preview'][0][4],text)

if __name__=='__main__':
 (ROOT/'artifacts/test-results').mkdir(parents=True,exist_ok=True);unittest.main(verbosity=2)
