import re, os, json
body_files = set()
src = open('../site/english_listening_4.js', encoding='utf-8').read()
data = src.split('=', 1)[1].rsplit(';', 1)[0]
cards = json.loads(data)
for c in cards:
    for r in re.findall(r'assets/listen/t1/([^"]+)', c['body']):
        body_files.add(r)
print('referenced:', len(body_files))
copied = set(os.listdir('../site/assets/listen/t1'))
missing = sorted(body_files - copied)
print('missing count:', len(missing))
for m in missing:
    print('  ', m)
# Also check which rIds these map to
z = __import__('zipfile').ZipFile('src.docx')
rels = z.read('word/_rels/document.xml.rels').decode('utf-8')
rid2target = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="(media/[^"]+)"', rels))
# map filename->rid
tgt2rid = {v: k for k, v in rid2target.items()}
for m in missing:
    t = 'media/' + m
    rid = tgt2rid.get(t)
    print('  ->', m, 'rid=', rid, 'exists in docx=', (t in [x for x in z.namelist() if x.startswith('word/media/')]))
