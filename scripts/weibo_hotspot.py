#!/usr/bin/env python3
"""
微博热搜产品创意分析 - Claude Agent SDK 版

使用 Claude Agent SDK 的 query() 启动一个 Agent，
Agent 自主完成全部流程：抓取热搜 -> 搜索背景 -> AI 分析 -> 生成报告

Agent 拥有的工具：WebSearch / Bash / Read / Write
Agent 自动处理工具调用循环，无需手动编排。
"""

import os
import sys
import asyncio
from datetime import datetime

from claude_agent_sdk import query, ClaudeAgentOptions

# ============ Configuration ============
TIANAPI_KEY = os.environ.get("TIANAPI_KEY", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
MAX_HOTSPOTS = os.environ.get("MAX_HOTSPOTS", "15")
MAX_BUDGET = float(os.environ.get("MAX_BUDGET_USD", "5.0"))
MAX_TURNS = int(os.environ.get("MAX_TURNS", "300"))

# Filenames
NOW = datetime.now()
DATE_STR = NOW.strftime("%Y%m%d_%H%M")

# ============ System Prompt ============
SYSTEM_PROMPT = """你是一个资深产品经理和趋势分析师，擅长从微博热搜中发现产品创意灵感。

可用工具：
- WebSearch：搜索网络信息
- Bash：执行 shell 命令（curl, python3, mkdir 等）
- Read：读取文件
- Write：写入文件

执行规则：
1. 严格按用户给出的步骤顺序执行
2. 所有文件使用 UTF-8 编码
3. 不要执行 open 命令（这是 CI 环境，没有浏览器）
4. 模板中 {{TEMPLATE_DATA}} 占位符必须替换为 JSON 数组字符串
5. 每完成一个步骤打印进度"""


def build_prompt():
    """构建 Agent 任务 prompt"""
    return f"""请完成微博热搜产品创意分析任务，严格按以下步骤执行。

## 步骤 0：准备
```bash
mkdir -p reports
```

## 步骤 1：获取微博热搜数据

用 Bash 执行以下命令（注意：不要修改命令中的参数格式）：
```bash
curl -s "https://apis.tianapi.com/weibohot/index?key={TIANAPI_KEY}" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('code') != 200:
    print('ERROR: ' + str(data.get('code')) + ' ' + data.get('msg',''))
    sys.exit(1)
items = data.get('result',{{'data':[]}}).get('data',[])
for item in items[:{MAX_HOTSPOTS}]:
    print(json.dumps({{'word':item.get('word',''),'hot_value':item.get('hot_value','0'),'label':item.get('label_name',''),'category':item.get('category','综合')}}, ensure_ascii=False))
"
```

将输出结果收集为 JSON 数组，保存到 reports/hotspot_raw_data.json。

## 步骤 2：搜索背景信息

对前 {MAX_HOTSPOTS} 个热点话题搜索背景信息：
- 每次用 WebSearch 搜索 3-5 个热点（并行调用多个 WebSearch）
- 查询词格式：`"{{热点关键词}} 事件 起因 经过"`
- 综合搜索结果整理每个热点的：
  - 事件概述（30字以内）
  - 事件脉络（3-5个节点，含 time 和 event）
  - 核心矛盾/看点
  - 涉及领域
  - 情感倾向

## 步骤 3：AI 产品创意分析

对每个热点评分（总分 100）：
- 有趣度（80分）：新颖性(30) + 共鸣度(25) + 传播潜力(25)
- 有用度（20分）：实际需求强度(10) + 可落地程度(10)

为每个热点生成 1-3 个产品创意：
- name（4-8字）、slogan（15字以内）、features（3-5个）、targetUsers、differentiation、monetization
- analysisReason：分析思路说明

## 步骤 4：生成 HTML 报告

1. 用 Read 工具读取 templates/report.html 模板
2. 将所有热点分析结果按 score 降序组成 JSON 数组
3. 用模板中的 {{TEMPLATE_DATA}} 替换为该 JSON 字符串（使用 json.dumps 风格，ensure_ascii=False）
4. 用 Write 工具写入 reports/weibo_hotspot_report_{DATE_STR}.html
5. 用 Write 写入 reports/weibo_hotspot_report_{DATE_STR}.json（原始分析数据）
6. 生成 reports/index.html（报告列表页，按日期降序链接所有报告）

### 每个热点的 JSON 结构：
{{"word":"...", "hot_value":"...", "label":"...", "category":"...", "score":0, "funScore":0, "usefulScore":0, "novelty":0, "resonance":0, "timeline":[{{"time":"...", "event":"..."}}], "ideas":[{{"name":"...", "slogan":"...", "features":["..."], "targetUsers":"...", "differentiation":"...", "monetization":"..."}}], "analysisReason":"..."}}

### index.html 示例格式：
```html
<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>微博热搜分析报告</title>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif; background:#f3f4f6; color:#111827; line-height:1.6; }}
.container {{ max-width:640px; margin:0 auto; padding:40px 16px; }}
h1 {{ text-align:center; margin-bottom:32px; font-size:24px; }}
a.report {{ display:block; background:#fff; padding:16px 20px; border-radius:12px; margin-bottom:12px; text-decoration:none; color:#111827; box-shadow:0 1px 3px rgba(0,0,0,0.1); }}
a.report:hover {{ box-shadow:0 4px 12px rgba(0,0,0,0.15); }}
.footer {{ text-align:center; padding:20px; color:#94a3b8; font-size:13px; }}
</style></head><body><div class="container">
<h1>&#x1F4CA; 微博热搜分析报告</h1>
{{各报告链接}}
<div class="footer">由 GitHub Actions 自动生成</div>
</div></body></html>
```

## 完成后
打印分析概要：总数、优秀(>80)/良好(60-80)/一般(<60) 数量、平均分、TOP 3 话题。"""


async def main():
    # Validate
    if not TIANAPI_KEY:
        print("ERROR: 请设置 TIANAPI_KEY 环境变量")
        sys.exit(1)
    if not ANTHROPIC_API_KEY:
        print("ERROR: 请设置 ANTHROPIC_API_KEY 环境变量")
        sys.exit(1)

    print("=" * 60)
    print("  微博热搜产品创意分析 · Claude Agent SDK 版")
    print(f"  时间: {NOW.strftime('%Y-%m-%d %H:%M')}")
    print(f"  分析数量: {MAX_HOTSPOTS}")
    print(f"  预算上限: ${MAX_BUDGET}")
    print(f"  最大轮次: {MAX_TURNS}")
    print("=" * 60)

    prompt = build_prompt()

    options = ClaudeAgentOptions(
        permission_mode="bypassPermissions",
        allowed_tools=["WebSearch", "Bash", "Read", "Write"],
        max_turns=MAX_TURNS,
        max_budget_usd=MAX_BUDGET,
        system_prompt=SYSTEM_PROMPT,
    )

    try:
        async for message in query(prompt=prompt, options=options):
            print(message)
    except Exception as e:
        print(f"FATAL: {e}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("  Agent 执行完毕")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
