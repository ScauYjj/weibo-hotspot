#!/usr/bin/env python3
"""
微博热搜产品创意分析 - GitHub Actions 版本
使用 OpenAI 兼容 SDK 调用智谱 API（MiniMax-M2.7）
"""

import os
import sys
import json
import re
import time
from datetime import datetime
from pathlib import Path

import requests
from openai import OpenAI

# ============ Configuration ============
AI_API_KEY = os.environ.get("AI_API_KEY", "")
AI_BASE_URL = os.environ.get("AI_BASE_URL", "https://open.bigmodel.cn/api/paas/v4")
AI_MODEL = os.environ.get("AI_MODEL", "MiniMax-M2.7")
TIANAPI_KEY = os.environ.get("TIANAPI_KEY", "")
MAX_HOTSPOTS = int(os.environ.get("MAX_HOTSPOTS", "15"))
DELAY_SECONDS = float(os.environ.get("DELAY_SECONDS", "3"))

SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_DIR = SCRIPT_DIR.parent
REPORTS_DIR = PROJECT_DIR / "reports"
TEMPLATE_PATH = PROJECT_DIR / "templates" / "report.html"
TIANAPI_URL = "https://apis.tianapi.com/weibohot/index"


# ============ Phase 1: Fetch Hotspots ============
def fetch_hotspots():
    print("=" * 50)
    print("  Phase 1: 获取微博热搜数据")
    print("=" * 50)

    url = f"{TIANAPI_URL}?key={TIANAPI_KEY}"
    resp = requests.get(url, timeout=30)
    data = resp.json()

    if data.get("code") != 200:
        raise RuntimeError(f"天行 API 错误: code={data.get('code')}, msg={data.get('msg')}")

    items = data.get("result", {}).get("list", [])
    if not items:
        raise RuntimeError("API 返回数据为空")

    hotspots = []
    for item in items[:MAX_HOTSPOTS]:
        hotspots.append({
            "word": item.get("hotword", ""),
            "hot_value": item.get("hotwordnum", "0"),
            "label": item.get("hottag", ""),
            "category": "综合",
        })

    print(f"  -> 获取到 {len(hotspots)} 条热搜数据\n")
    return hotspots


# ============ Phase 2+3: AI Analysis ============
def extract_json(text):
    """从模型响应中提取 JSON"""
    # 代码块
    m = re.search(r"```(?:json)?\s*\n(.*?)\n```", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass
    # 整段
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # 最外层 { }
    depth, start = 0, None
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                try:
                    return json.loads(text[start : i + 1])
                except json.JSONDecodeError:
                    start = None
    raise ValueError(f"无法提取 JSON: {text[:300]}...")


ANALYSIS_PROMPT = """你是一个资深产品经理和趋势分析师。请对以下微博热搜话题进行深度分析。

话题：{word}
热度值：{hot_value}
标签：{label}
分类：{category}

请基于你的知识对该话题进行分析（如果是不熟悉的新话题，请根据话题名称和分类合理推断）。

完成以下分析并严格以 JSON 返回（不要包含其他文字）：

1. overview: 事件概述（30字以内）
2. timeline: 事件脉络（3-5个节点，每个含 time 和 event）
3. coreConflict: 核心矛盾/看点
4. sentiment: 情感倾向（正面/负面/中性/争议）

评分（总分 100）：
- 有趣度（80分满分）：新颖性(30) + 共鸣度(25) + 传播潜力(25)
- 有用度（20分满分）：实际需求强度(10) + 可落地程度(10)

产品创意（1-3个），每个含：name, slogan, features, targetUsers, differentiation, monetization
analysisReason: 分析思路

JSON 格式：
{{"overview":"","timeline":[{{"time":"","event":""}}],"coreConflict":"","sentiment":"","score":0,"funScore":0,"usefulScore":0,"novelty":0,"resonance":0,"spread":0,"practicalNeed":0,"feasibility":0,"ideas":[{{"name":"","slogan":"","features":[""],"targetUsers":"","differentiation":"","monetization":""}}],"analysisReason":""}}"""


def analyze_hotspot(client, item, index, total):
    word = item["word"]
    print(f"  [{index}/{total}] 分析: {word}")

    prompt = ANALYSIS_PROMPT.format(
        word=word,
        hot_value=item["hot_value"],
        label=item["label"],
        category=item["category"],
    )

    try:
        resp = client.chat.completions.create(
            model=AI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=4096,
        )
        text = resp.choices[0].message.content
        if not text or not text.strip():
            raise ValueError("模型返回空响应")

        analysis = extract_json(text)
        item.update({
            "overview": analysis.get("overview", ""),
            "timeline": analysis.get("timeline", []),
            "coreConflict": analysis.get("coreConflict", ""),
            "sentiment": analysis.get("sentiment", ""),
            "score": int(analysis.get("score", 50)),
            "funScore": int(analysis.get("funScore", 0)),
            "usefulScore": int(analysis.get("usefulScore", 0)),
            "novelty": int(analysis.get("novelty", 0)),
            "resonance": int(analysis.get("resonance", 0)),
            "spread": int(analysis.get("spread", 0)),
            "practicalNeed": int(analysis.get("practicalNeed", 0)),
            "feasibility": int(analysis.get("feasibility", 0)),
            "ideas": analysis.get("ideas", []),
            "analysisReason": analysis.get("analysisReason", ""),
        })
        level = "优秀" if item["score"] > 80 else "良好" if item["score"] > 60 else "一般"
        print(f"    -> 评分: {item['score']} ({level})")
    except Exception as e:
        print(f"    -> 分析失败: {e}")
        item.update({
            "overview": "分析失败",
            "timeline": [],
            "score": 0, "funScore": 0, "usefulScore": 0,
            "novelty": 0, "resonance": 0,
            "ideas": [],
            "analysisReason": f"分析出错: {e}",
        })
    return item


def analyze_all(client, hotspots):
    print("=" * 50)
    print(f"  Phase 2+3: AI 分析（共 {len(hotspots)} 个话题）")
    print("=" * 50)

    total = len(hotspots)
    for i, item in enumerate(hotspots):
        analyze_hotspot(client, item, i + 1, total)
        if i < total - 1:
            time.sleep(DELAY_SECONDS)

    valid = [h for h in hotspots if h.get("score", 0) > 0]
    valid.sort(key=lambda x: x.get("score", 0), reverse=True)
    print(f"\n  -> 成功分析 {len(valid)}/{total} 个话题\n")
    return valid


# ============ Phase 4: Generate Report ============
def generate_report(items):
    print("=" * 50)
    print("  Phase 4: 生成 HTML 报告")
    print("=" * 50)

    if not TEMPLATE_PATH.exists():
        raise FileNotFoundError(f"HTML 模板不存在: {TEMPLATE_PATH}")

    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    data_json = json.dumps(items, ensure_ascii=False, indent=2)
    html = template.replace("{{TEMPLATE_DATA}}", data_json)

    now = datetime.now()
    timestamp = now.strftime("%Y%m%d_%H%M")
    html_name = f"weibo_hotspot_report_{timestamp}.html"
    json_name = f"weibo_hotspot_report_{timestamp}.json"

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    (REPORTS_DIR / html_name).write_text(html, encoding="utf-8")
    (REPORTS_DIR / json_name).write_text(
        json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    generate_index()
    print(f"  -> HTML: reports/{html_name}")
    print(f"  -> JSON: reports/{json_name}")


def generate_index():
    reports = sorted(REPORTS_DIR.glob("weibo_hotspot_report_*.html"), reverse=True)
    links = ""
    for r in reports:
        dm = re.search(r"(\d{8}_\d{4})", r.stem)
        ds = dm.group(1) if dm else r.stem
        try:
            dt = datetime.strptime(ds, "%Y%m%d_%H%M")
            display = dt.strftime("%Y年%m月%d日 %H:%M")
        except ValueError:
            display = ds
        links += f'<a href="{r.name}" class="report"><span>{display}</span><span>&rarr;</span></a>\n'

    html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>微博热搜分析报告</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;background:#f3f4f6;color:#111827;line-height:1.6}}
.c{{max-width:640px;margin:0 auto;padding:40px 16px}}
h1{{text-align:center;margin-bottom:32px;font-size:24px}}
a.report{{display:flex;justify-content:space-between;background:#fff;padding:16px 20px;border-radius:12px;margin-bottom:12px;text-decoration:none;color:#111827;box-shadow:0 1px 3px rgba(0,0,0,.1)}}
a.report:hover{{box-shadow:0 4px 12px rgba(0,0,0,.15)}}
.f{{text-align:center;padding:20px;color:#94a3b8;font-size:13px}}
</style></head><body><div class="c">
<h1>&#x1F4CA; 微博热搜分析报告</h1>
{links}
<div class="f">由 GitHub Actions 自动生成</div>
</div></body></html>"""
    (REPORTS_DIR / "index.html").write_text(html, encoding="utf-8")
    print("  -> Index: reports/index.html")


# ============ Main ============
def main():
    print("@" * 50)
    print("  微博热搜产品创意分析 · GitHub Actions 版")
    print("@" * 50)

    if not TIANAPI_KEY:
        print("ERROR: 请设置 TIANAPI_KEY 环境变量"); sys.exit(1)
    if not AI_API_KEY:
        print("ERROR: 请设置 AI_API_KEY 环境变量"); sys.exit(1)

    print(f"  AI: {AI_BASE_URL} / {AI_MODEL}")
    print(f"  分析数量: {MAX_HOTSPOTS}\n")

    client = OpenAI(api_key=AI_API_KEY, base_url=AI_BASE_URL)

    try:
        hotspots = fetch_hotspots()

        REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        (REPORTS_DIR / "hotspot_raw_data.json").write_text(
            json.dumps(hotspots, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        analyzed = analyze_all(client, hotspots)
        if not analyzed:
            print("ERROR: 所有话题分析均失败"); sys.exit(1)

        generate_report(analyzed)

        total = len(analyzed)
        exc = len([h for h in analyzed if h["score"] > 80])
        good = len([h for h in analyzed if 60 < h["score"] <= 80])
        avg = round(sum(h["score"] for h in analyzed) / total)
        print("=" * 50)
        print(f"  完成！共 {total} 个 | 优秀 {exc} | 良好 {good} | 平均 {avg} 分")
        print("=" * 50)

    except Exception as e:
        print(f"FATAL: {e}"); import traceback; traceback.print_exc(); sys.exit(1)


if __name__ == "__main__":
    main()
