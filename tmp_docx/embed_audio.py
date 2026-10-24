#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把 Topic1 听力卡（ls4:1..5）内每步的本地 mp3 占位，替换为每篇 1 个音频直链 <audio>。
音频粒度：每篇练习 1 个 mp3（覆盖该篇全部步骤），直链来自用户提供的 drfs.ctcontents.com webdav。
注意：body 在 JS 文件里是转义字符串（\" 表示引号），需先反转义再处理，最后再转义回去。
"""
import re, json

ROOT = "C:/Users/xiaoluo920/WorkBuddy/2026-10-22-15-27-40"
JS = f"{ROOT}/site/english_listening_4.js"
LINKS = f"{ROOT}/tmp_docx/audio_links.json"

links = json.load(open(LINKS, encoding="utf-8"))

def url_for(n):
    return links[f"Exercise {n}（听力训练 四）.mp3"]

def unescape_js(s):
    # 处理 \" \\ \/  （body 为单行，主要为 \" 与 \\）
    s = s.replace('\\"', '"').replace('\\\\', '\\').replace('\\/', '/')
    return s

def escape_js(s):
    s = s.replace('\\', '\\\\').replace('"', '\\"')
    return s

src = open(JS, encoding="utf-8").read()
body_re = re.compile(r'"body"\s*:\s*"((?:[^"\\]|\\.)*)"(\s*\},?)')

def transform(m):
    body = unescape_js(m.group(1))
    tail = m.group(2)
    nums = re.findall(r'assets/listen/t1/e(\d+)-s', body)
    if not nums:
        return m.group(0)
    n = int(nums[0])
    url = url_for(n)
    # 1) 移除所有每步占位 .ls-audio[data-src=...]
    body2 = re.sub(r'<div class="ls-audio" data-src="assets/listen/t1/e\d+-s\d+\.mp3">.*?</div>', '', body, flags=re.S)
    # 2) 在 .ls-wrap 顶部插入单一播放器
    player = ('<div class="ls-audio-on"><div class="ls-audio-label">🎧 听力音频（点击播放，可反复听）</div>'
              f'<audio controls preload="none" src="{url}"></audio></div>')
    body2 = body2.replace('<div class="ls-wrap">', '<div class="ls-wrap">' + player, 1)
    return '"body": "' + escape_js(body2) + '"' + tail

new, count = body_re.subn(transform, src)
print("cards transformed:", count)

new = new.replace(
    "// 四年级英语听力 · Topic 1 Family life（试点，由 docx 导入，题目+插图；音频/答案待补）",
    "// 四年级英语听力 · Topic 1 Family life（试点：题目+插图+音频直链，由 docx 导入；答案待补）"
)

open(JS, "w", encoding="utf-8").write(new)

# 校验：解开转义后，每个 body 含 1 个 <audio src="https://drfs...">，且不含 data-src 占位
bodies = body_re.findall(new)
ok = True
for i, (b, _) in enumerate(bodies, 1):
    clean = unescape_js(b)
    audios = re.findall(r'<audio[^>]+src="(https://drfs\.ctcontents\.com/[^"]+)"', clean)
    placeholders = re.findall(r'ls-audio data-src', clean)
    print(f"card {i}: audio={len(audios)} placeholder={len(placeholders)}")
    if len(audios) != 1 or len(placeholders) != 0:
        ok = False
print("VALID" if ok else "INVALID")
