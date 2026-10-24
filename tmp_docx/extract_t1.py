import zipfile, re, json, os

SRC = 'src.docx'
z = zipfile.ZipFile(SRC)
xml = z.read('word/document.xml').decode('utf-8')
rels = z.read('word/_rels/document.xml.rels').decode('utf-8')
rid2target = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="(media/[^"]+)"', rels))
paras = re.findall(r'<w:p[ >].*?</w:p>', xml, re.S)

def detag(p):
    return re.sub(r'<[^>]+>', '', p).strip()

# Topic 1 body = paras 227..594
START, END = 227, 595

# Build map para -> ordered image rids
para_img = {}
for i in range(START, END):
    blips = re.findall(r'r:embed="(rId\d+)"', paras[i])
    if blips:
        para_img[i] = blips

# Collect unique media targets used in Topic 1
used = {}
for i, blips in para_img.items():
    for r in blips:
        t = rid2target.get(r)
        if t:
            used[r] = t

print('paras with images:', len(para_img))
print('unique images:', len(used))
for r, t in sorted(used.items(), key=lambda x: int(re.search(r'(\d+)', x[1]).group(1)) if re.search(r'(\d+)', x[1]) else 0):
    print(' ', r, '->', t)

# Save mapping
with open('t1_imgs.json', 'w', encoding='utf-8') as f:
    json.dump({'para_img': para_img, 'rid2target': used}, f, ensure_ascii=False, indent=1)
print('saved t1_imgs.json')
