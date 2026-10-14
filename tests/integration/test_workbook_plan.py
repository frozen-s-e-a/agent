"""Business-level checks for ordinary, unannotated templates and saved outputs."""
import json, sys, tempfile, unittest, zipfile, copy
from pathlib import Path
from decimal import Decimal
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'src/audit-worker'))
from openpyxl import Workbook, load_workbook
from openpyxl.styles import PatternFill
from openpyxl.comments import Comment
from workbook_plan import validate_plan, fill_workbook, read_workbook, NeedsInput, sha

def fixture(folder):
    wb=Workbook();wb.remove(wb.active)
    for name in ['Lead Schedule','Disclosure','BKD24']:
        s=wb.create_sheet(name);s['A1']='投资收益';s.merge_cells('A1:F1');s['B2']='项目';s['C2']=2025;s['D2']=2024
        s['B3']='经核对明细';s['E3']='=C3-D3';s['F3']='=E3/D3';s['C3'].fill=PatternFill('solid',fgColor='FFEEDD');s['C3'].number_format='#,##0.00';s['H8']='模板尾部'
    s=wb.create_sheet('Sheet1');s['A1']='来源明细';s.append(['科目','部门','2025','2024'])
    for n in range(1,121):s.append(['投资收益','本部',n,5])
    file=folder/'普通模板.xlsx';wb.save(file)
    with zipfile.ZipFile(file,'a') as z:z.writestr('customXml/template-marker.xml','<original>preserve unrelated objects</original>')
    header={'file_path':file.name,'sheet':'Sheet1','row':2,'columns':{'A':'科目','B':'部门','C':'2025','D':'2024'}}
    writes=[];required=[];checks=[]
    for name in ['Lead Schedule','Disclosure','BKD24']:
        required.append({'sheet':name,'range':'C3:F3'})
        for target,column,year in [('C3','C',2025),('D3','D',2024)]:
            writes.append({'sheet':name,'cell':target,'reason':f'按实际 {year} 表头汇总全部投资收益明细','expr':{'op':'sum','file_path':file.name,'sheet':'Sheet1','headerRow':2,'column':column,'endRow':'auto','filters':[{'column':'A','value':'投资收益'}]}})
            checks.append({'source':{'file_path':file.name,'sheet':'Sheet1','cell':column+'2'},'target':{'file_path':file.name,'sheet':name,'cell':target[0]+'2'}})
    return file,{'file_path':file.name,'targetSheets':['Lead Schedule','Disclosure','BKD24'],'headers':[header],'required':required,'periodChecks':checks,'writes':writes}

class WorkbookPlanTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name).resolve();self.file,self.plan=fixture(self.root);self.files=[self.file];self.original=sha(self.file)
    def tearDown(self):self.tmp.cleanup()
    def validate(self,plan=None):return validate_plan(self.root,self.files,{'plan':plan or self.plan})
    def test_full_population_and_actual_reread_preserve_template(self):
        prepared=self.validate();self.assertTrue(prepared['ok']);self.assertEqual(prepared['writeCount'],6)
        stage=self.root/'stage';stage.mkdir();result=fill_workbook(self.root,self.files,{'plan':self.plan,'expectedPlanHash':prepared['planHash']},stage)
        self.assertEqual(sha(self.file),self.original);actual=load_workbook(stage/'填写成果.xlsx',data_only=True)
        for name in self.plan['targetSheets']:
            self.assertEqual(actual[name]['C3'].value,7260);self.assertEqual(actual[name]['D3'].value,600)
            self.assertEqual(actual[name]['E3'].value,6660);self.assertEqual(actual[name]['F3'].value,11.1)
            self.assertEqual(actual[name]['C3'].number_format,'#,##0.00')
        actual.close();receipt=json.loads((stage/'填写核对.json').read_text(encoding='utf-8'))
        self.assertEqual(receipt['verifiedCount'],12);self.assertEqual(receipt['formulaCount'],6)
        with zipfile.ZipFile(self.file) as original,zipfile.ZipFile(stage/'填写成果.xlsx') as output:
            for part in original.namelist():
                if not part.startswith('xl/worksheets/sheet') or part=='xl/worksheets/sheet4.xml':self.assertEqual(original.read(part),output.read(part),part)
    def test_range_beyond_preview_and_pagination(self):
        result=read_workbook(self.root,self.files,{'sheet':'Sheet1','range':'A100:D122','offset':80,'limit':12})
        self.assertFalse(result['sampleOnly']);self.assertEqual(result['pages'][0]['nextOffset'],None)
        self.assertEqual(result['pages'][0]['cells'][-2]['value'],Decimal(120))
        self.assertEqual(result['pages'][0]['headerCandidates'][0]['row'],2)
    def test_missing_amount_is_a_question_never_zero(self):
        w=load_workbook(self.file);w['Sheet1']['C100']=None;w.save(self.file);w.close()
        result=self.validate();self.assertFalse(result['ok']);self.assertEqual(result['status'],'waiting_for_user');self.assertIn('不能把空白当作零',result['questions'][0])
    def test_period_conflict_is_a_question(self):
        self.plan['periodChecks'][0]['target']['cell']='D2';result=self.validate();self.assertFalse(result['ok']);self.assertIn('期间不同',result['questions'][0])
    def test_duplicate_lookup_cannot_pick_first(self):
        self.plan['writes'][0]['expr']['op']='lookup';result=self.validate();self.assertFalse(result['ok']);self.assertIn('120 行',result['questions'][0])
    def test_missing_required_mapping_cannot_pass(self):
        self.plan['writes'].pop();result=self.validate();self.assertFalse(result['ok']);self.assertIn('缺少映射',result['questions'][0])
    def test_numeric_data_row_cannot_be_header(self):
        self.plan['headers'][0]={'file_path':self.file.name,'sheet':'Sheet1','row':3,'columns':{'C':'1'}}
        result=self.validate();self.assertFalse(result['ok']);self.assertIn('不能当作表头',result['questions'][0])
    def test_duplicate_and_merged_targets_rejected(self):
        bad=copy.deepcopy(self.plan);bad['writes'].append(copy.deepcopy(bad['writes'][0]));self.assertRaisesRegex(ValueError,'重复写入',self.validate,bad)
        bad=copy.deepcopy(self.plan);bad['required'].append({'sheet':'Lead Schedule','range':'C1'});bad['writes'][0]['cell']='C1';self.assertRaisesRegex(ValueError,'合并区域内部',self.validate,bad)
    def test_no_arbitrary_code_or_business_literals(self):
        self.plan['writes'][0]['expr']={'op':'literal','value':999};self.assertRaisesRegex(ValueError,'猜测',self.validate)
    def test_changed_input_invalidates_saved_plan(self):
        prepared=self.validate();w=load_workbook(self.file);w['Sheet1']['C122']=121;w.save(self.file);w.close();stage=self.root/'stage';stage.mkdir()
        self.assertRaisesRegex(NeedsInput,'版本已变化',fill_workbook,self.root,self.files,{'plan':self.plan,'expectedPlanHash':prepared['planHash']},stage)
        self.assertFalse((stage/'填写成果.xlsx').exists())
    def test_formula_without_calculated_source_is_a_question(self):
        self.plan['writes'][0]['expr']={'op':'cell','file_path':self.file.name,'sheet':'Lead Schedule','cell':'E3'}
        result=self.validate();self.assertFalse(result['ok']);self.assertIn('没有已计算结果',result['questions'][0])
    def test_grouped_fill_uses_each_template_row_key_without_large_model_output(self):
        w=load_workbook(self.file)
        for n in range(1,121):w['Sheet1'].cell(n+2,1,'组'+str(n%3))
        for row,name in [(3,'组0'),(4,'组1'),(5,'组2')]:w['Lead Schedule'].cell(row,2,name)
        w.save(self.file);w.close()
        for item in self.plan['writes']:item['expr']['filters']=[{'column':'B','value':'本部'}]
        first=self.plan['writes'][0];first.pop('cell');first['range']='C3:C5'
        first['expr']['filters']=[{'column':'A','valueExpr':{'op':'cell','file_path':self.file.name,'sheet':'Lead Schedule','cell':'B{row}'}}]
        self.plan['required'].append({'sheet':'Lead Schedule','range':'C4:C5'})
        prepared=self.validate();self.assertTrue(prepared['ok']);stage=self.root/'stage';stage.mkdir()
        fill_workbook(self.root,self.files,{'plan':self.plan,'expectedPlanHash':prepared['planHash']},stage)
        actual=load_workbook(stage/'填写成果.xlsx',data_only=True)
        self.assertEqual([actual['Lead Schedule'][f'C{r}'].value for r in range(3,6)],[2460,2380,2420]);actual.close()

if __name__=='__main__':unittest.main()
