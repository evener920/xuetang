#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""从整本 docx 抽取 100 篇四年级英语听力练习，生成 site/english_listening_4.js（100 卡）。

分区策略（关键，解决 26 个缺标题/缺音频练习的切分）：
- 练习起始锚点 = 文档中的 "Exercise N" 标题(POS) + "听力音频" 音频标记(POS)。
- 一个标题会“吞掉”紧随其后的那个音频（同一练习），因此标题 + 其后音频 = 1 个练习起始。
- 由此得到 97 个真实起始（74 标题 + 23 仅音频）。
- 还有 3 个练习既无标题也无音频（不可见），经人工核对其段落位置后硬编码补齐：
    SYNTH = {4, 29, 62}  EXTRA = {4:419, 29:1779, 62:3693}
- 97 个真实起始按文档顺序映射到 [1..100] - SYNTH 的 97 个编号；3 个 SYNTH 编号放到 EXTRA 位置。
- 校验：每个带标题的起始，其分配编号必须等于其标题编号；真实起始数 == 100 - len(SYNTH)。
"""
import zipfile, re, json, os
from xml.etree import ElementTree as ET

ROOT = "C:/Users/xiaoluo920/WorkBuddy/2026-10-22-15-27-40"
SRC = f"{ROOT}/tmp_docx/src.docx"
OUT_JS = f"{ROOT}/site/english_listening_4.js"
IMG_DIR = f"{ROOT}/site/assets/listen/im"
LINKS = f"{ROOT}/tmp_docx/audio_links.json"

NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
W = NS; R = REL
DR = "{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}"

# ---- 人工核对补齐的不可见练习（既无标题也无音频）----
SYNTH = {4, 29, 62}
EXTRA = {4: 419, 29: 1779, 62: 3693}

links = json.load(open(LINKS, encoding="utf-8"))

TOPICS = ["Family life(家庭生活)", "People at work", "My friends(我的朋友)", "Places we live in",
          "The weather and us", "Changing for the seasons", "Clothes and shopping", "School life(学校生活)",
          "Daily life(日常生活)", "Sports(运动)", "Feelings(感受)", "Animals and plants",
          "Transportation(交通)", "Festivals and holidays"]

z = zipfile.ZipFile(SRC)
PNS = "{http://schemas.openxmlformats.org/package/2006/relationships}"
rels = {}
for r in ET.fromstring(z.read("word/_rels/document.xml.rels")).iter(f"{PNS}Relationship"):
    rels[r.get("Id")] = r.get("Target")

xml = z.read("word/document.xml")
root = ET.fromstring(xml)
body = root.find(f"{W}body")

def block_text(p):
    return "".join(n.text or "" for n in p.iter(f"{W}t"))

def block_rids(p):
    out = []
    for el in p.iter():
        v = el.get(f"{R}embed") or el.get(f"{R}id")
        if v:
            out.append(v)
    return out

blocks = []
for i, p in enumerate(body.iter(f"{W}p")):
    blocks.append((i, block_text(p), block_rids(p)))

CONTENT_START = 227  # 真实正文起点（此前是 TOC / 章节标题）

head_re = re.compile(r"^Exercise\s+(\d+)$")
heads = [(i, int(head_re.match(re.sub(r"\s+", " ", t)).group(1)))
         for i, t, _ in blocks if i >= CONTENT_START and head_re.match(re.sub(r"\s+", " ", t))]

audio_raw = [i for i, t, _ in blocks if i >= CONTENT_START and "听力音频" in t]
# 折叠相邻的音频标记（"听力音频听句子" + "听力音频" 属同一练习）
audio_groups = []
for a in audio_raw:
    if audio_groups and a - audio_groups[-1][-1] <= 3:
        audio_groups[-1].append(a)
    else:
        audio_groups.append([a])
audio_pos = [g[0] for g in audio_groups]

# ---- 构建真实起始（标题吞掉紧随音频）----
events = []
for i, n in heads:
    events.append((i, "H", n))
for i in audio_pos:
    events.append((i, "A", None))
events.sort()

starts = []          # (pos, number_or_None, is_heading)
pending_heading = None
for pos, kind, n in events:
    if kind == "H":
        starts.append((pos, n, True))
        pending_heading = pos
    else:  # 'A'
        if pending_heading is not None:
            pending_heading = None  # 该音频属于上一个标题练习
        else:
            starts.append((pos, None, False))
starts.sort()

assert len(starts) == 100 - len(SYNTH), f"真实起始数异常: {len(starts)}"

# ---- 分配编号：97 个真实起始按文档顺序映射到 [1..100]-SYNTH；SYNTH 编号放到 EXTRA 位置 ----
non_synth = sorted(set(range(1, 101)) - SYNTH)
assert len(non_synth) == len(starts), "编号集合长度不匹配"
num_by_start = {}
for k, (pos, n, is_h) in enumerate(starts):
    num_by_start[pos] = non_synth[k]

# 校验：带标题起始的分配编号必须等于其标题编号
for pos, n, is_h in starts:
    if is_h:
        assert num_by_start[pos] == n, f"标题编号不一致: 标题{n} 分配{num_by_start[pos]} @ {pos}"

# 构造 100 个练习的 (number, start_pos, end_pos)
pos_for_num = {}  # number -> position
for pos, num in num_by_start.items():
    pos_for_num[num] = pos
for s in SYNTH:
    pos_for_num[s] = EXTRA[s]
sorted_nums = sorted(pos_for_num.keys())
positions_by_num = [pos_for_num[n] for n in sorted_nums]
exercises = []
for idx, n in enumerate(sorted_nums):
    start = pos_for_num[n]
    end = positions_by_num[idx + 1] if idx + 1 < len(positions_by_num) else len(blocks)
    exercises.append((n, start, end))

# ---- 渲染 ----
def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

SKIP_RE = re.compile(r"^(Part|Topic|Exercise)\b")
SKIP_SET = {"基础篇", "提升篇", "话题训练", "综合训练"}
STEP_RE = re.compile(r"^(听句子|听对话|听短文|Step|难度|一[、.、]|二[、.、]|三[、.、]|四[、.、]|五[、.、]|六[、.、]|七[、.、]|八[、.、]|九[、.、]|十[、.、])")
DIFF_RE = re.compile(r"([☆★]+)")
TF_RE = re.compile(r'^\(\s*\)\s*\d+\.?\s*')          # 题号空括号：(    )1.
OPT_RE = re.compile(r'(?:(?<=^)|(?<=\s)|(?<=[).。．（）(])|\s)([A-E])\s*[.．]\s*')
AE_RE = re.compile(r'[A-E]\s*[.．]')                 # 含 A-E 选项字母

def is_skip(t):
    t = t.strip()
    if SKIP_RE.match(t):
        return True
    if t in SKIP_SET:
        return True
    if "话题训练" in t:
        return True
    if "Part 1" in t and "话题训练" in t:
        return True
    return False

def is_step(t):
    return bool(STEP_RE.match(t.strip()))

def is_audio(t):
    return "听力音频" in t

def split_options(text):
    positions = [(m.start(1), m.group(1)) for m in OPT_RE.finditer(text)]
    if len(positions) < 1:
        return None
    segs = []
    for k, (pos, letter) in enumerate(positions):
        mm = re.match(r'[A-E]\s*[.．]', text[pos:])
        start = pos + len(mm.group(0))
        end = positions[k + 1][0] if k + 1 < len(positions) else len(text)
        segs.append((letter, text[start:end].strip()))
    prompt = text[:positions[0][0]].strip()
    return prompt, segs

def split_packed(t):
    """把 '(    )1.A. B. (    )2.A. B.' 这类堆叠多题拆成独立小题。"""
    segs = re.split(r'(\(\s*\)\s*\d+\.)\s*', t)
    if len(segs) <= 1:
        return [t]
    out = []
    if segs[0].strip():
        out.append(segs[0])
    for i in range(1, len(segs), 2):
        marker = segs[i]
        content = segs[i + 1] if i + 1 < len(segs) else ""
        out.append(marker + content)
    return out

def classify(t, j, mcq_stem_idx):
    ts = t.strip()
    if is_skip(ts) or is_audio(ts):
        return "skip"
    if is_step(ts):
        return "step"
    if ts.startswith("□"):                      # 复选框选项（□ tall）
        return "check"
    # 判断题：( )N. 开头、无 A-E 选项、非问句；且后文不紧邻 A-E 选项（否则是选择题题干）
    if TF_RE.match(ts) and not AE_RE.search(ts) and "?" not in ts and "？" not in ts:
        return "prompt" if j in mcq_stem_idx else "tf"
    if AE_RE.search(ts):                         # 含 A-E 选项 -> 选择题
        return "question"
    return "prompt"

def topic_of(ex):
    if ex <= 70:
        tn = (ex - 1) // 5 + 1
        return TOPICS[tn - 1], f"Topic {tn} · Exercise {ex}", "话题训练"
    elif ex <= 78:
        return "综合训练·基础篇", f"综合训练 · Exercise {ex}", "综合训练"
    else:
        return "综合训练·提升篇", f"综合训练 · Exercise {ex}", "综合训练"

# 图片提取
rid_to_file = {}
file_count = 0
IMG_EXT = {".jpeg", ".jpg", ".png", ".gif", ".webp"}
os.makedirs(IMG_DIR, exist_ok=True)

def get_img_file(rid):
    global file_count
    if rid in rid_to_file:
        return rid_to_file[rid]
    tgt = rels.get(rid, "")
    if not tgt.startswith("media/"):
        tgt = "word/" + tgt if not tgt.startswith("/") else tgt.lstrip("/")
    ext = os.path.splitext(tgt)[1].lower()
    if ext not in IMG_EXT:
        rid_to_file[rid] = None
        return None
    try:
        data = z.read(tgt if tgt.startswith("word/") else "word/" + tgt)
    except KeyError:
        rid_to_file[rid] = None
        return None
    file_count += 1
    fname = f"li{file_count:04d}{ext}"
    with open(os.path.join(IMG_DIR, fname), "wb") as f:
        f.write(data)
    rid_to_file[rid] = fname
    return fname

def figs_div(figs):
    return '<div class="ls-figs">' + "".join(
        f'<img loading="lazy" src="assets/listen/im/{f}" alt="">' for f in figs) + '</div>'

def opt_imgs_div(figs):
    """可点选的图片选项（圈图/选图题）。"""
    return '<div class="ls-figs ls-figs-opt">' + "".join(
        f'<img loading="lazy" class="ls-opt-img" data-opt="{k}" src="assets/listen/im/{f}" alt="">'
        for k, f in enumerate(figs, 1)) + '</div>'

cards = []
for ex, start, end in exercises:
    topic, title, part = topic_of(ex)
    url = links[f"Exercise {ex}（听力训练 四）.mp3"]
    # 收集本练习段落
    ex_paras = [(j, blocks[j][1].strip(), blocks[j][2]) for j in range(start, end)]
    # 判断 ( )N. 句是选择题题干还是判断题：向后 3 段内若紧跟 A-E 选项则为题干
    mcq_stem_idx = set()
    for k, (j, ts, rids) in enumerate(ex_paras):
        if TF_RE.match(ts) and not AE_RE.search(ts) and "?" not in ts and "？" not in ts:
            found = False
            for m in range(k + 1, min(k + 4, len(ex_paras))):
                nts = ex_paras[m][1]
                if nts and AE_RE.search(nts):
                    found = True; break
                if nts and TF_RE.match(nts):
                    break
            if found:
                mcq_stem_idx.add(j)
    # 构建 items: (cls, text, figs)
    items = []
    figs_buffer = []
    for j, ts, rids in ex_paras:
        para_figs = []
        for r in rids:
            f = get_img_file(r)
            if f:
                para_figs.append(f)
        if not ts:
            if para_figs:
                figs_buffer.extend(para_figs)
            continue
        pieces = split_packed(ts)
        if len(pieces) == 1:
            cls = classify(ts, j, mcq_stem_idx)
            if cls == "skip":
                figs_buffer.extend(para_figs)
                continue
            allfigs = figs_buffer + para_figs; figs_buffer = []
            items.append((cls, ts, allfigs))
        else:
            first_figs = figs_buffer + para_figs; figs_buffer = []
            for k2, piece in enumerate(pieces):
                cls = classify(piece, j, mcq_stem_idx)
                if cls == "skip":
                    continue
                figs = first_figs if k2 == 0 else []
                items.append((cls, piece, figs))
    if figs_buffer:
        items.append(("prompt", "", figs_buffer))

    # 合并连续的 step 标题（如 "听句子" + "难度：☆☆"）
    merged = []
    for cls, txt, figs in items:
        if cls == "step" and merged and merged[-1][0] == "step":
            pc, pt, pf = merged[-1]
            merged[-1] = ("step", pt + " " + txt, pf)
        else:
            merged.append((cls, txt, figs))

    parts = []
    for cls, txt, figs in merged:
        if cls == "step":
            dm = DIFF_RE.search(txt)
            diff = f'<span class="ls-diff">{esc(dm.group(1))}</span>' if dm else ""
            name_clean = re.sub(r'\s*难度[:：]?\s*[☆★]+\s*', ' ', txt.strip()).strip()
            parts.append(f'<div class="ls-step-h"><span class="ls-step-name">{esc(name_clean)}</span>{diff}</div>')
        elif cls == "check":
            content = re.sub(r'^□\s*', '', txt.strip())
            parts.append(f'<div class="ls-q"><span class="ls-opt ls-multi" data-opt="{esc(content)}">{esc("☐ " + content)}</span></div>')
        elif cls == "tf":
            inner = f'<span class="ls-qprompt">{esc(txt.strip())}</span>'
            inner += '<span class="ls-opt" data-opt="T">T. 对</span><span class="ls-opt" data-opt="F">F. 错</span>'
            h = f'<div class="ls-q">{inner}</div>'
            if figs:
                h += opt_imgs_div(figs)
            parts.append(h)
        elif cls == "question":
            so = split_options(txt)
            if so:
                prompt, segs = so
                inner = ""
                if prompt:
                    inner += f'<span class="ls-qprompt">{esc(prompt)}</span>'
                for letter, content in segs:
                    inner += f'<span class="ls-opt" data-opt="{letter}">{esc(letter + ". " + content)}</span>'
                h = f'<div class="ls-q">{inner}</div>'
                if figs:
                    h += opt_imgs_div(figs)
                parts.append(h)
            else:
                h = f'<div class="ls-p">{esc(txt)}</div>'
                if figs:
                    h += figs_div(figs)
                parts.append(h)
        else:  # prompt
            h = f'<div class="ls-p">{esc(txt)}</div>' if txt else ''
            if figs:
                if re.search(r'圈出|选出|相符的图片|打[“"]?√|勾选|听录音[，,]选出', txt):
                    h += opt_imgs_div(figs)
                else:
                    h += figs_div(figs)
            if h:
                parts.append(h)

    body_html = ('<div class="ls-wrap">'
                 '<div class="ls-audio-on"><div class="ls-audio-label">🎧 听力音频（点击播放，可反复听）</div>'
                 f'<audio controls preload="none" src="{url}"></audio></div>'
                 + "".join(parts)
                 + '<div class="ls-foot"><button class="ls-check" type="button">🔍 对答案</button>'
                 '<div class="ls-answer">答案待补充（本书未附标准答案，请提供官方答案）</div></div>'
                 '</div>')
    cards.append({
        "key": f"ls4:{ex}",
        "subject": "英语", "type": "听力", "grade": "四年级",
        "topic": topic, "title": title, "sub": topic,
        "part": part, "html": True, "body": body_html,
    })

print("生成卡片数:", len(cards))
print("提取插图数:", file_count)
assert len(cards) == 100
for c in cards:
    assert f"Exercise {c['key'].split(':')[1]}（听力训练 四）.mp3" in links

header = "// 四年级英语听力 · 100 篇（全量导入：题目+插图+音频直链，由 docx 导入；选项可点选含图选/判断/复选，答案待补）\n"
open(OUT_JS, "w", encoding="utf-8").write(
    header + "window.ENGLISH_LISTENING_4 = " + json.dumps(cards, ensure_ascii=False) + ";\n")
print("写出:", OUT_JS)
