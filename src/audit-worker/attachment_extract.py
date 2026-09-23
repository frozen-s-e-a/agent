from pathlib import Path
import zipfile,xml.etree.ElementTree as ET,csv,itertools
def extract_attachment(file):
    p=Path(file);ext=p.suffix.lower();parts=[];truncated=False
    if ext in ['.xlsx','.xlsm','.docx']:
        with zipfile.ZipFile(p) as z:
            if sum(i.file_size for i in z.infolist())>64*1024**2:raise ValueError('解压体量超过附件解析预算')
    if ext in ['.xlsx','.xlsm']:
        from openpyxl import load_workbook
        w=load_workbook(p,read_only=True,data_only=False,keep_links=False)
        try:
            for sheet in w.worksheets[:5]:
                parts.append('工作表：'+sheet.title+'（前 50 行、前 40 列；公式未重新计算）')
                sheet.reset_dimensions()
                rows=list(itertools.islice(sheet.values,51))
                if len(rows)>50:truncated=True
                for i,row in enumerate(rows[:50],1):
                    if len(row)>40:truncated=True
                    parts.append(str(i)+'\t'+'\t'.join(str(v)[:200] if v is not None else '' for v in row[:40]))
            if len(w.worksheets)>5:truncated=True
        finally:w.close()
        note='工作表摘录'
    elif ext=='.pdf':
        from pypdf import PdfReader
        pdf=PdfReader(p)
        for i,page in enumerate(pdf.pages[:20],1):
            text=page.extract_text() or '[此页未提取到文本，可能需要 OCR，不能视为已识别]'
            parts.append(f'第 {i} 页：\n'+text)
        truncated=len(pdf.pages)>20;note='PDF 文本摘录（不含扫描页 OCR）'
    elif ext=='.docx':
        with zipfile.ZipFile(p) as z:
            root=ET.fromstring(z.read('word/document.xml'))
            for para in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                parts.append(''.join(n.text or '' for n in para.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')))
        note='Word 正文与表格文字摘录（不含嵌入图片）'
    else:raise ValueError('不支持此附件格式')
    text='\n'.join(parts)
    return {'text':text[:12000],'truncated':truncated or len(text)>12000,'note':note}
