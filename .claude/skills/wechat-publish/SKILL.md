---
name: wechat-publish
description: "将 Markdown 文章发布到微信公众号草稿箱，支持多种精美主题风格。当用户需要：(1) 发布文章到公众号 (2) 发布到微信 (3) 同步到公众号草稿箱 (4) 发小绿书 (5) 把某篇文章发到公众号 时触发。用户可能说：发布到公众号、发到微信、发小绿书、发布文章、/wechat-publish 文件路径。"
---

# 微信公众号文章发布工具

## 概述

将 Markdown 文章转换为微信公众号兼容的 HTML，自动生成封面图，上传图片，发布到公众号草稿箱。

**核心流程**：读取文件 -> 选择公众号 -> 选主题 -> 生成封面 -> 上传图片 -> 转换HTML -> 发布草稿

## 脚本位置

所有辅助脚本位于 `.claude/skills/wechat-publish/` 目录下：
- `converter.js` - Markdown 转 HTML（支持4种主题）
- `image-uploader.js` - ImgBB 图片上传
- `cover-generator.js` - AI 封面图生成

**首次使用前必须安装依赖**：

```bash
cd .claude/skills/wechat-publish && npm install
```

## API 配置

### 微信公众号发布 API
- **基础地址**: `https://wx.limyai.com/api/openapi`
- **API Key**: `xhs_612e5e649990245fc8c56b694ade4b07`
- **认证方式**: `X-API-Key` 请求头

### ImgBB 图床
- **API Key**: `4bf53d4bd1678fefb2a9802c13bdf302`（内置在 image-uploader.js）

### Gemini 封面图生成
- **API Key**: `sk-mvtp05Cxh9hTBEXkvVbD0qPY2SNemTEw1SmundmkHfI7WKAM`（内置在 cover-generator.js）

## 工作流

### 阶段 1：确定目标文件

从用户消息中获取 Markdown 文件路径。如果用户没有指定，询问文件路径。

示例用户输入：
- "发布到公众号 article.md"
- "把 ./posts/hello.md 发到公众号"
- "/wechat-publish /path/to/file.md"

### 阶段 2：获取公众号列表

使用 Bash 工具执行：

```bash
curl -s -X POST "https://wx.limyai.com/api/openapi/wechat-accounts" \
  -H "X-API-Key: xhs_612e5e649990245fc8c56b694ade4b07" \
  -H "Content-Type: application/json"
```

**处理逻辑**：
- 如果只有 1 个公众号，直接使用，记下 `wechatAppid`
- 如果有多个，列出给用户选择（显示名称和 AppID）
- 如果获取失败，提示错误并终止

### 阶段 3：选择主题风格（必须询问用户）

使用 AskUserQuestion 工具让用户选择主题，**不要使用默认值**：

```
问题：请选择文章主题风格
选项：
1. professional (简约专业) - 蓝色主色调 #1a73e8，适合技术文章
2. elegant (优雅文艺) - 墨绿主色调 #2d5a27，适合散文随笔，首行缩进2字符
3. vibrant (活力橙) - 橙色主色调 #ff6b35，适合营销活动
4. dark (暗黑极客) - 青色主色调 #61dafb，深色背景，适合程序员
```

### 阶段 4：提取标题并生成封面图

1. 从 Markdown 文件提取标题（优先 YAML frontmatter 的 title 字段，其次第一个 # 标题）
2. 使用 Bash 工具调用封面图生成器：

```bash
cd /Users/yjj/Documents/Trae-project/project2-webo/.claude/skills/wechat-publish && node cover-generator.js "文章标题"
```

3. 解析返回的 JSON，获取 `filePath`
4. 如果封面图生成失败，告知用户并询问是否继续（可以不使用封面图）

### 阶段 5：上传封面图到 ImgBB

使用 Bash 工具：

```bash
cd /Users/yjj/Documents/Trae-project/project2-webo/.claude/skills/wechat-publish && node image-uploader.js upload "<封面图文件路径>"
```

解析返回的 JSON，获取 `url` 作为封面图 URL。

### 阶段 6：处理文章中的本地图片

如果 Markdown 文件中包含本地图片引用（非 http/https 开头），上传并替换：

```bash
cd /Users/yjj/Documents/Trae-project/project2-webo/.claude/skills/wechat-publish && node image-uploader.js process "<markdown文件路径>"
```

解析返回的 JSON，获取 `tempPath`（处理后的 Markdown 临时文件路径）。

如果所有图片都是远程链接，跳过此步骤，使用原始文件。

### 阶段 7：转换 Markdown 为 HTML

使用 Bash 工具：

```bash
cd /Users/yjj/Documents/Trae-project/project2-webo/.claude/skills/wechat-publish && node converter.js "<markdown文件路径>" <主题名称>
```

**参数说明**：
- 第一个参数：Markdown 文件路径（如果阶段6生成了临时文件，使用临时文件路径）
- 第二个参数：主题名称（professional / elegant / vibrant / dark）

解析返回的 JSON，获取 `title`、`summary`、`html`。

### 阶段 8：发布到公众号草稿箱

使用 Bash 工具调用发布 API：

```bash
curl -s -X POST "https://wx.limyai.com/api/openapi/wechat-publish" \
  -H "X-API-Key: xhs_612e5e649990245fc8c56b694ade4b07" \
  -H "Content-Type: application/json" \
  -d '{
    "wechatAppid": "<公众号AppID>",
    "title": "<标题，最多64字符>",
    "content": "<HTML内容>",
    "summary": "<摘要，最多120字符>",
    "coverImage": "<封面图URL>",
    "contentFormat": "html",
    "articleType": "news"
  }'
```

**字段处理**：
- `title`：截断到 64 字符以内
- `summary`：截断到 120 字符以内
- `content`：阶段7生成的 HTML
- `coverImage`：阶段5获取的封面图 URL（如果没有则留空字符串）

### 阶段 9：返回结果

**成功输出格式**：

```
✅ 文章已成功发布到公众号草稿箱！

📝 文章信息：
- 标题：xxx
- 摘要：xxx
- 主题：xxx
- 封面图：已生成
- 图片处理：已上传 X 张

📌 请前往公众号后台查看并手动发布。
```

**错误处理**：
- 依赖未安装：提示运行 `cd .claude/skills/wechat-publish && npm install`
- 文件不存在：提示用户检查文件路径
- API 错误：显示错误信息和建议
- 封面图生成失败：询问用户是否跳过封面图继续发布
- 图片上传失败：提示具体失败的图片，询问是否继续

## 主题风格说明

| 主题 | 标识 | 主色 | 特点 |
|------|------|------|------|
| 简约专业 | professional | #1a73e8 蓝色 | 适合技术文章，干净清晰 |
| 优雅文艺 | elegant | #2d5a27 墨绿 | 适合散文随笔，首行缩进，衬线字体 |
| 活力橙 | vibrant | #ff6b35 橙色 | 适合营销活动，视觉冲击力强 |
| 暗黑极客 | dark | #61dafb 青色 | 深色背景 #1a1a2e，适合程序员 |

## 使用示例

```
# 直接指定文件
发布 article.md 到公众号

# 指定路径
把 ./posts/my-article.md 发到微信

# 使用斜杠命令
/wechat-publish /path/to/article.md

# 简短表达
发小绿书 hello.md
```

## 注意事项

- 标题最多 64 字符，超出会自动截断
- 摘要最多 120 字符，超出会自动截断
- 所有 CSS 样式已内联，兼容微信编辑器
- 链接自动转换为文末脚注（微信不支持外部链接跳转）
- 列表使用 `<section>` 标签替代 `<ul>/<ol>/<li>`（避免微信插入空行）
- 发布到草稿箱后，需手动在公众号后台点击发布
- 首次使用需要安装 Node.js 依赖
