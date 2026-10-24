# -*- coding: utf-8 -*-
import re, json
ROOT="C:/Users/xiaoluo920/WorkBuddy/2026-10-22-15-27-40"
js=open(f"{ROOT}/site/english_listening_4.js",encoding="utf-8").read()
m=re.search(r"window\.ENGLISH_LISTENING_4\s*=\s*(\[.*\])\s*;", js, re.S)
cards=json.loads(m.group(1))
print("cards:", len(cards))
assert len(cards)==100, "not 100"
# checks
no_audio=[]; no_opt=[]; tiny=[]; no_figs_cards=[]
for c in cards:
    b=c["body"]
    ex=int(c["key"].split(":")[1])
    if 'controls preload="none"' not in b: no_audio.append(ex)
    opts=b.count('ls-opt')-b.count('ls-opt-img')  # 文字/复选按钮（排除图片选项计数重复）
    if opts==0: no_opt.append(ex)
    if len(b)<200: tiny.append((ex,len(b)))
    if 'ls-figs' not in b: no_figs_cards.append(ex)
print("cards missing audio:", no_audio)
print("cards with 0 options:", no_opt)
print("tiny cards(<200):", tiny[:10], "total", len(tiny))
print("cards w/o figures:", no_figs_cards)
# distribution of options
import statistics
opt_counts=[c["body"].count('ls-opt')-c["body"].count('ls-opt-img') for c in cards]
print("opt count min/median/max:", min(opt_counts), statistics.median(opt_counts), max(opt_counts))
# spot-check synthetic exercises 4,29,62 and neighbors
for ex in [3,4,5,28,29,30,61,62,63]:
    c=next(x for x in cards if x["key"]==f"ls4:{ex}")
    b=c["body"]
    print(f"\n--- ls4:{ex}  title={c['title']}  opts={b.count('class=\"ls-opt\"')}  figs={b.count('ls-figs')}  len={len(b)}")
    # show first 400 chars of content after audio
    i=b.find('</audio>')
    print("  head:", b[i+8:i+300].replace('\n',' '))
