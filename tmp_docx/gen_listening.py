import zipfile, re, json, os

SRC = 'src.docx'
z = zipfile.ZipFile(SRC)
xml = z.read('word/document.xml').decode('utf-8')
rels = z.read('word/_rels/document.xml.rels').decode('utf-8')
rid2target = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="(media/[^"]+)"', rels))
paras = re.findall(r'<w:p[ >].*?</w:p>', xml, re.S)

def detag(p):
    return re.sub(r'<[^>]+>', '', p).strip()

def clean_text(t):
    t = re.sub(r'^\d{4,}', '', t)
    t = re.sub(r'[ \t]{2,}', ' ', t)
    return t.strip()

def para_images(p):
    out = []
    for r in re.findall(r'r:embed="(rId\d+)"', p):
        t = rid2target.get(r)
        if t:
            out.append('assets/listen/t1/' + os.path.basename(t))
    return out

START, END = 227, 595
items = []
for i in range(START, END):
    p = paras[i]
    items.append({'i': i, 't': clean_text(detag(p)), 'imgs': para_images(p)})

# Explicit verified exercise ranges (item indices). Ex4 has no header in docx.
EX_RANGES = [
    (1, 10, 78),    # Exercise 1  (para 237..305)
    (2, 79, 139),   # Exercise 2  (para 306..366)
    (3, 140, 187),  # Exercise 3  (para 367..414)
    (4, 188, 313),  # Exercise 4  (para 415..538)  recovered (no header in docx)
    (5, 314, 367),  # Exercise 5  (para 541..594)
]

def strip_lead(t):
    return re.sub(r'^[0-9A-Za-z\-\.\s]+', '', t).strip()

STEP_RE = re.compile(r'(Step\s*\d*\s*)?(听句子|听对话|听短文)(\s*难度[:：]?\s*[☆★]*)?')

def step_diff(t):
    dm = re.search(r'难度[:：]?\s*([☆★]+)', t)
    return dm.group(1) if dm else ''

def split_step(t):
    """Return (pre_text, label_or_None). label is the step header if found."""
    s = strip_lead(t)
    m = STEP_RE.search(s)
    if not m:
        return s, None
    if m.start() == 0:
        return '', s  # whole thing is a label
    pre = s[:m.start()].strip()
    label = s[m.start():].strip()
    return pre, label

def is_question(t):
    if re.search(r'\(\s*\)', t):
        return True
    if re.match(r'^\d+[\.、．]', t):
        return True
    return False

def esc(t):
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def figs_html(imgs):
    if not imgs:
        return ''
    parts = ''.join(f'<img loading="lazy" src="{src}" alt="">' for src in imgs)
    return f'<div class="ls-figs">{parts}</div>'

def build_exercise(num, a, b):
    # a,b inclusive item indices
    ex = {'num': num, 'steps': []}
    cur = None
    for j in range(a, b + 1):
        it = items[j]
        t, imgs = it['t'], it['imgs']
        pre, label = split_step(t)
        # if this paragraph carries a step label embedded after content, flush pre first
        if label is not None:
            if pre:
                if cur is None:
                    cur = {'label': '', 'diff': '', 'content': []}
                    ex['steps'].append(cur)
                cur['content'].append({'t': pre, 'imgs': []})
            cur = {'label': label, 'diff': step_diff(label), 'content': []}
            ex['steps'].append(cur)
            if imgs:
                cur['content'].append({'t': '', 'imgs': imgs})
            continue
        if not t and not imgs:
            continue
        if re.fullmatch(r'\d{5,}', t):
            continue
        if cur is None:
            cur = {'label': '', 'diff': '', 'content': []}
            ex['steps'].append(cur)
        cur['content'].append({'t': t, 'imgs': imgs})
    # drop empty steps (no text, no images)
    ex['steps'] = [s for s in ex['steps'] if s['content']]
    return ex

if __name__ == '__main__' and False:
    pass

def render_body(ex):
    parts = ['<div class="ls-wrap">']
    sm = 0
    for step in ex['steps']:
        sm += 1
        label = step['label'] or '听力练习'
        diff = step['diff']
        diff_badge = f'<span class="ls-diff">{esc(diff)}</span>' if diff else ''
        parts.append(f'<div class="ls-step">')
        parts.append(f'<div class="ls-step-h"><span class="ls-step-name">{esc(label)}</span>{diff_badge}</div>')
        # audio slot (progressive enhancement: placeholder, real player once file exists)
        parts.append(
            f'<div class="ls-audio" data-src="assets/listen/t1/e{ex["num"]}-s{sm}.mp3">'
            f'<span class="ls-ico">🎧</span>'
            f'<span class="ls-at">听力音频（待上传）</span>'
            f'<code>e{ex["num"]}-s{sm}.mp3</code></div>'
        )
        figs_buf = []
        for c in step['content']:
            if not c['t'] and c['imgs']:
                figs_buf.extend(c['imgs'])
                continue
            if figs_buf:
                parts.append(figs_html(figs_buf)); figs_buf = []
            if c['t']:
                cls = 'ls-q' if is_question(c['t']) else 'ls-p'
                parts.append(f'<div class="{cls}">{esc(c["t"])}</div>')
            if c['imgs']:
                parts.append(figs_html(c['imgs']))
        if figs_buf:
            parts.append(figs_html(figs_buf))
        parts.append('</div>')  # step
    parts.append('<div class="ls-answer">参考答案：待补充（请提供官方答案）</div>')
    parts.append('</div>')  # wrap
    return ''.join(parts)

cards = []
for num, a, b in EX_RANGES:
    ex = build_exercise(num, a, b)
    body = render_body(ex)
    cards.append({
        'key': f'ls4:{num}',
        'subject': '英语',
        'type': '听力',
        'grade': '四年级',
        'topic': 'Family life',
        'title': f'Topic 1 · Exercise {num}',
        'sub': '家庭生活 Family life',
        'html': True,
        'body': body,
    })

# Emit JS
out = '// 四年级英语听力 · Topic 1 Family life（试点，由 docx 导入，题目+插图；音频/答案待补）\n'
out += 'window.ENGLISH_LISTENING_4 = ' + json.dumps(cards, ensure_ascii=False, indent=0) + ';\n'
with open('../site/english_listening_4.js', 'w', encoding='utf-8') as f:
    f.write(out)
print('Wrote site/english_listening_4.js with', len(cards), 'cards')
for c in cards:
    print(' ', c['key'], '| steps:', c['body'].count('ls-step"') + c['body'].count("ls-step'>") , '| len', len(c['body']))
