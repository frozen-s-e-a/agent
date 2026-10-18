import json
from file_structure import structure

def inspect_layout(db,files,root,params,stage):
    from worker import emit,lit
    db.execute('CREATE TABLE data (文件 VARCHAR,工作表 VARCHAR,项目 VARCHAR,位置 VARCHAR,内容 VARCHAR)')
    reports=[];summaries=[];samples=[];count=0
    for file in files:
        emit('progress',phase='读取工作簿结构：'+file.name,rows=count)
        report=structure(file,params,all_sheets=True);reports.append(report);relative=file.relative_to(root).as_posix()
        sheets=report.get('previews') or [{'sheet':report.get('sheet',file.name),'columns':report.get('columns',[]),'preview':report.get('preview',[])}]
        for sheet in sheets:
            count+=1;name=sheet['sheet'];summaries.append((relative,name,'工作表概览',sheet.get('reportedRange') or '未保存范围',json.dumps({k:v for k,v in sheet.items() if k not in ['rawRows','preview','columns']},ensure_ascii=False)))
            if 'rawRows' in sheet:
                for row in sheet['rawRows']:
                    cells=[c for c in row['cells'] if c['value']!=''];samples.append((relative,name,'原始行样本',str(row['row']),json.dumps(cells,ensure_ascii=False) if cells else '空白行'))
            else:samples.append((relative,name,'表头与样本','有限样本',json.dumps(sheet,ensure_ascii=False)))
        emit('progress',phase='已读取工作簿结构',rows=count)
    for record in summaries+samples:db.execute('INSERT INTO data VALUES ('+','.join(lit(v) for v in record)+')')
    (stage/'结构概览.json').write_text(json.dumps({'scope':'结构概览与有限样本，不是全量业务数据导入','files':reports},ensure_ascii=False,indent=2),encoding='utf-8')
    return count
