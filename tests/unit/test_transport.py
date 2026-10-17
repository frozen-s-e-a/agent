import sys, unittest, json, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'src'/'audit-domain'))
from runtime.transport import model,estimate_tokens,RemoteHttpError,Session,model_endpoint_allowed

class FakeSession:
    def __init__(self, payloads): self.payloads=list(payloads);self.requests=[]
    class Reply:
        def __init__(self,value): self.value=value
        def json(self): return self.value
    def post(self,url,json,headers,timeout): self.requests.append(json);return self.Reply(self.payloads.pop(0))

class Context:
    def __init__(self,session): self.session=session;self.task_id='transport-test';self.settings={'base_url':'http://127.0.0.1:1','model':'fixture'};self.args={};self.events=[]
    def emit(self,event): self.events.append(event)

class PagingSession(FakeSession):
    def __init__(self,reject_first=False):
        super().__init__([]);self.read_pages={};self.reject_first=reject_first
    def post(self,url,json,headers,timeout):
        self.requests.append(json)
        if self.reject_first and len(self.requests)==1:raise RemoteHttpError(400,True)
        for message in json['messages']:
            if message['role']=='tool':
                try:page=__import__('json').loads(message['content'])
                except ValueError:continue
                if page.get('section')=='prompt' and len(page['data'])>len(self.read_pages.get(page['offset'],'')):self.read_pages[page['offset']]=page['data']
        notice=next(__import__('json').loads(m['content']) for m in json['messages'] if m['role']=='system' and str(m['content']).startswith('{"inputHash"'))
        if len(self.requests)==1:
            return self.Reply({'choices':[{'message':{'content':'{"status":"premature"}'},'finish_reason':'stop'}]})
        missing=notice['nextUnread']
        if missing:
            name,args='read_task_input',missing
        elif not notice['savedRows']:
            name,args='append_task_result',{'field':'records','records':[{'记录编号':0,'匹配结果':'已处理完整输入'}]}
        else:
            return self.Reply({'choices':[{'message':{'content':'{"status":"complete"}'},'finish_reason':'stop'}]})
        return self.Reply({'choices':[{'message':{'tool_calls':[{'id':'c'+str(len(self.requests)),'type':'function','function':{'name':name,'arguments':__import__('json').dumps(args)}}]},'finish_reason':'tool_calls'}]})

class TransportTests(unittest.TestCase):
    def test_text_output_continues_after_length(self):
        session=FakeSession([
            {'choices':[{'message':{'content':'第一段'},'finish_reason':'length'}],'usage':{'prompt_tokens':10,'completion_tokens':8}},
            {'choices':[{'message':{'content':'第二段'},'finish_reason':'stop'}],'usage':{'prompt_tokens':20,'completion_tokens':4}},
        ])
        ctx=Context(session); result=model(ctx,'输出完整说明')
        self.assertEqual(result,'第一段第二段');self.assertEqual(len(session.requests),2);self.assertTrue(any(e.get('type')=='model_input' for e in ctx.events));self.assertEqual(ctx.events[-1]['finishReason'],'stop')

    def test_json_output_continues_and_parses(self):
        session=FakeSession([
            {'choices':[{'message':{'content':'{"rows":[1,'},'finish_reason':'length'}]},
            {'choices':[{'message':{'content':'2]}'},'finish_reason':'stop'}]},
        ])
        ctx=Context(session); result=model(ctx,'返回 JSON',schema={'type':'object'})
        self.assertEqual(result,{'rows':[1,2]});self.assertEqual(len(session.requests),2)

    def test_context_budget_uses_tokens_instead_of_utf8_bytes(self):
        session=FakeSession([{'choices':[{'message':{'content':'完成'},'finish_reason':'stop'}]}])
        ctx=Context(session);ctx.settings['contextWindow']=30000;ctx.settings['maxTokens']=256
        result=model(ctx,'检查资料：'+('凭证金额和科目。'*1500))
        self.assertEqual(result,'完成');self.assertEqual(len(session.requests),1)
        self.assertEqual(ctx.events[0]['budget']['method'],'character-estimate')

    def test_oversized_input_is_paged_in_full_and_partial_results_are_preserved(self):
        session=PagingSession();ctx=Context(session);ctx.settings.update(contextWindow=32000,maxTokens=256)
        with tempfile.TemporaryDirectory() as directory:
            ctx.output=Path(directory)
            prompt='必须保持万元口径\n'+'凭证金额。'*14000+'\n最后要求：保留原文件'
            result=model(ctx,prompt,schema=True)
            self.assertEqual(result['status'],'complete');self.assertEqual(len(result['records']),1)
            restored=[None]*len(prompt)
            for offset,page in session.read_pages.items():
                for index,char in enumerate(page):restored[offset+index]=char
            self.assertEqual(restored.count(None),0,'Every original character must actually reach a request')
            self.assertEqual(''.join(restored),prompt)
            self.assertTrue(all(estimate_tokens({'messages':r['messages'],'tools':r.get('tools',[])})+256+8192<=32000 for r in session.requests))
            saved=list(ctx.output.rglob('input.json'));self.assertEqual(len(saved),1)
            self.assertEqual(json.loads(saved[0].read_text(encoding='utf-8'))['prompt'],prompt)
            progress=json.loads(next(ctx.output.rglob('progress.json')).read_text(encoding='utf-8'))
            self.assertEqual(len(progress['results']['records']),1)

    def test_provider_rejected_input_switches_to_exact_paging(self):
        session=PagingSession(reject_first=True);ctx=Context(session)
        result=model(ctx,'完整请求被网关拒绝后必须重新按引用读取',schema=True)
        self.assertEqual(result['status'],'complete')
        self.assertTrue(any(e.get('finishReason')=='context_rejected' for e in ctx.events))

    def test_image_payload_size_does_not_count_as_plain_text_tokens(self):
        one={'messages':[{'role':'user','content':[{'type':'image_url','image_url':{'url':'data:image/png;base64,AA'}}]}]}
        many=json.loads(json.dumps(one));many['messages'][0]['content'][0]['image_url']['url']+='A'*1000000
        self.assertEqual(estimate_tokens(one),estimate_tokens(many))

    def test_model_allowlist_does_not_open_audit_queries_or_other_hosts(self):
        base='https://enterprise.example/v1'
        self.assertTrue(model_endpoint_allowed(base+'/chat/completions',base))
        self.assertFalse(model_endpoint_allowed('https://other.example/v1/chat/completions',base))
        self.assertFalse(model_endpoint_allowed(base+'/audit/query',base))
        session=Session();session.allowed_model_base=base
        with self.assertRaisesRegex(RuntimeError,'只能访问'):session.get(base+'/chat/completions')
        with self.assertRaisesRegex(RuntimeError,'只能访问'):session.post('https://other.example/v1/chat/completions',json={})

if __name__=='__main__': unittest.main()
