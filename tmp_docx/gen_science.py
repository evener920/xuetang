# -*- coding: utf-8 -*-
"""读取 B 站分P列表（tmp_docx/bili_pagelist.json），生成 site/science_gallery.js
（小学科学 · 地理大百科启蒙动画画廊：每集一张卡片，内嵌 B 站播放器）。
"""
import json, re, os

ROOT = "C:/Users/xiaoluo920/WorkBuddy/2026-10-22-15-27-40"
SRC = f"{ROOT}/tmp_docx/bili_pagelist.json"
OUT = f"{ROOT}/site/science_gallery.js"
BV = "BV1jK7DzAERo"

d = json.load(open(SRC, encoding="utf-8"))
data = d["data"]
print("分P 总数:", len(data))

num_re = re.compile(r"^\s*\d+[\.．、]\s*")

def clean(part):
    return num_re.sub("", part).strip()

cards = []
for x in data:
    page = x["page"]
    part = x["part"]
    title = clean(part) or part
    player = f"https://player.bilibili.com/player.html?bvid={BV}&page={page}&high_quality=1&autoplay=0"
    body = (f"地理大百科启蒙动画第{page}集《{title}》。点击上方播放按钮即可观看动画讲解，"
            f"跟着动画轻松认识{title}。")
    cards.append({
        "key": f"sci:{page}",
        "subject": "科学",
        "type": "动画",
        "title": title,
        "sub": f"地理大百科 · 第{page}集",
        "body": body,
        "grade": "",
        "volume": "",
        "unit": "",
        "tags": ["小学科学", "地理", "动画画廊"],
        "videos": [player],
        "html": False,
    })

print("生成卡片:", len(cards))
assert len(cards) == len(data)

header = ("// 小学科学 · 地理大百科启蒙动画画廊（62 集，源自 B 站 BV1jK7DzAERo；每集一卡，内嵌 B 站播放器）\n"
         "// 用法：site/app.js 的 seedDefaultContent 以 scienceGallery 标记注入到 state.custom\n"
         "//       subject=科学 / type=动画 / tag=小学科学，可在「资源 → 科学」按 小学科学 标签筛选。\n")
open(OUT, "w", encoding="utf-8").write(
    header + "window.SCIENCE_GALLERY = " + json.dumps(cards, ensure_ascii=False) + ";\n")
print("写出:", OUT)
