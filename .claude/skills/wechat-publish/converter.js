#!/usr/bin/env node

const { marked } = require('marked');
const juice = require('juice');
const hljs = require('highlight.js');
const fs = require('fs');
const path = require('path');

// ========== Theme Definitions ==========

const themes = {

  // 主题1：简约专业 - 蓝色主色调，适合技术文章
  professional: {
    name: '简约专业',
    primaryColor: '#1a73e8',
    container: 'max-width:100%;padding:10px 15px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#333;line-height:1.8;font-size:16px;background:#fff;',
    h1: 'font-size:24px;font-weight:bold;color:#1a73e8;margin:30px 0 15px;padding-bottom:10px;border-bottom:2px solid #1a73e8;line-height:1.4;',
    h2: 'font-size:20px;font-weight:bold;color:#1a73e8;margin:25px 0 12px;padding-left:10px;border-left:4px solid #1a73e8;line-height:1.4;',
    h3: 'font-size:18px;font-weight:bold;color:#333;margin:20px 0 10px;line-height:1.4;',
    h4: 'font-size:16px;font-weight:bold;color:#555;margin:18px 0 8px;line-height:1.4;',
    p: 'margin:10px 0;line-height:1.8;color:#333;font-size:16px;',
    strong: 'font-weight:bold;color:#1a73e8;',
    em: 'font-style:italic;color:#555;',
    inlineCode: 'background:#f0f4f8;color:#e83e8c;padding:2px 6px;border-radius:3px;font-size:90%;font-family:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;',
    codeBlock: 'background:#282c34;border-radius:5px;padding:16px;margin:15px 0;overflow-x:auto;',
    codeContent: 'font-family:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;font-size:14px;line-height:1.6;color:#abb2bf;background:transparent;margin:0;padding:0;',
    blockquote: 'border-left:4px solid #1a73e8;padding:10px 15px;margin:15px 0;background:#f8f9fa;color:#555;font-style:italic;',
    listItem: 'margin:5px 0;padding-left:5px;line-height:1.8;font-size:16px;color:#333;',
    link: 'color:#1a73e8;',
    image: 'max-width:100%;border-radius:5px;margin:10px auto;display:block;',
    hr: 'border:none;height:1px;background:linear-gradient(to right,transparent,#1a73e8,transparent);margin:20px 0;',
    tableWrapper: 'width:100%;border-collapse:collapse;margin:15px 0;font-size:15px;',
    tableTh: 'background:#1a73e8;color:#fff;padding:10px 15px;font-weight:bold;text-align:left;border:1px solid #1a73e8;',
    tableTd: 'padding:8px 15px;border:1px solid #e0e0e0;color:#333;',
    tableTrEven: 'background:#f8f9fa;',
    footnoteTitle: 'font-size:14px;font-weight:bold;color:#1a73e8;margin:20px 0 10px;padding-top:10px;border-top:1px solid #eee;',
    footnoteItem: 'font-size:13px;color:#666;line-height:1.6;margin:3px 0;word-break:break-all;',
  },

  // 主题2：优雅文艺 - 墨绿主色调，适合散文随笔，首行缩进
  elegant: {
    name: '优雅文艺',
    primaryColor: '#2d5a27',
    container: 'max-width:100%;padding:10px 15px;font-family:Georgia,"Times New Roman","Songti SC","SimSun",serif;color:#333;line-height:2;font-size:16px;background:#fff;',
    h1: 'font-size:24px;font-weight:bold;color:#2d5a27;margin:30px 0 15px;text-align:center;letter-spacing:2px;line-height:1.4;',
    h2: 'font-size:20px;font-weight:bold;color:#2d5a27;margin:25px 0 12px;text-align:center;letter-spacing:1px;line-height:1.4;',
    h3: 'font-size:18px;font-weight:bold;color:#3a6b32;margin:20px 0 10px;line-height:1.4;',
    h4: 'font-size:16px;font-weight:bold;color:#555;margin:18px 0 8px;line-height:1.4;',
    p: 'margin:10px 0;line-height:2;color:#333;font-size:16px;text-indent:2em;',
    strong: 'font-weight:bold;color:#2d5a27;',
    em: 'font-style:italic;color:#6b8e63;',
    inlineCode: 'background:#f0f7ef;color:#2d5a27;padding:2px 6px;border-radius:3px;font-size:90%;font-family:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;border:1px solid #d4e6d0;',
    codeBlock: 'background:#282c34;border-radius:5px;padding:16px;margin:15px 0;overflow-x:auto;',
    codeContent: 'font-family:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;font-size:14px;line-height:1.6;color:#abb2bf;background:transparent;margin:0;padding:0;',
    blockquote: 'border-left:4px solid #2d5a27;padding:10px 15px;margin:15px 0;background:#f0f7ef;color:#555;font-style:italic;',
    listItem: 'margin:5px 0;padding-left:5px;line-height:2;font-size:16px;color:#333;',
    link: 'color:#2d5a27;',
    image: 'max-width:100%;border-radius:8px;margin:10px auto;display:block;box-shadow:0 2px 8px rgba(0,0,0,0.1);',
    hr: 'border:none;height:1px;background:linear-gradient(to right,transparent,#2d5a27,transparent);margin:25px 0;',
    tableWrapper: 'width:100%;border-collapse:collapse;margin:15px 0;font-size:15px;',
    tableTh: 'background:#2d5a27;color:#fff;padding:10px 15px;font-weight:bold;text-align:left;border:1px solid #2d5a27;',
    tableTd: 'padding:8px 15px;border:1px solid #d4e6d0;color:#333;',
    tableTrEven: 'background:#f0f7ef;',
    footnoteTitle: 'font-size:14px;font-weight:bold;color:#2d5a27;margin:20px 0 10px;padding-top:10px;border-top:1px solid #d4e6d0;',
    footnoteItem: 'font-size:13px;color:#666;line-height:1.6;margin:3px 0;word-break:break-all;',
  },

  // 主题3：活力橙 - 橙色主色调，适合营销活动
  vibrant: {
    name: '活力橙',
    primaryColor: '#ff6b35',
    container: 'max-width:100%;padding:10px 15px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#333;line-height:1.8;font-size:16px;background:#fff;',
    h1: 'font-size:24px;font-weight:bold;color:#ff6b35;margin:30px 0 15px;padding-bottom:10px;border-bottom:3px solid #ff6b35;line-height:1.4;',
    h2: 'font-size:20px;font-weight:bold;color:#ff6b35;margin:25px 0 12px;padding-left:12px;border-left:5px solid #ff6b35;line-height:1.4;',
    h3: 'font-size:18px;font-weight:bold;color:#e55a2b;margin:20px 0 10px;line-height:1.4;',
    h4: 'font-size:16px;font-weight:bold;color:#555;margin:18px 0 8px;line-height:1.4;',
    p: 'margin:10px 0;line-height:1.8;color:#333;font-size:16px;',
    strong: 'font-weight:bold;color:#ff6b35;',
    em: 'font-style:italic;color:#888;',
    inlineCode: 'background:#fff3ed;color:#ff6b35;padding:2px 6px;border-radius:3px;font-size:90%;font-family:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;',
    codeBlock: 'background:#282c34;border-radius:5px;padding:16px;margin:15px 0;overflow-x:auto;',
    codeContent: 'font-family:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;font-size:14px;line-height:1.6;color:#abb2bf;background:transparent;margin:0;padding:0;',
    blockquote: 'border-left:4px solid #ff6b35;padding:10px 15px;margin:15px 0;background:#fff3ed;color:#555;font-style:italic;',
    listItem: 'margin:5px 0;padding-left:5px;line-height:1.8;font-size:16px;color:#333;',
    link: 'color:#ff6b35;',
    image: 'max-width:100%;border-radius:5px;margin:10px auto;display:block;',
    hr: 'border:none;height:2px;background:linear-gradient(to right,#ff6b35,#ffad60,#ff6b35);margin:20px 0;',
    tableWrapper: 'width:100%;border-collapse:collapse;margin:15px 0;font-size:15px;',
    tableTh: 'background:#ff6b35;color:#fff;padding:10px 15px;font-weight:bold;text-align:left;border:1px solid #ff6b35;',
    tableTd: 'padding:8px 15px;border:1px solid #ffe0cc;color:#333;',
    tableTrEven: 'background:#fff3ed;',
    footnoteTitle: 'font-size:14px;font-weight:bold;color:#ff6b35;margin:20px 0 10px;padding-top:10px;border-top:1px solid #ffe0cc;',
    footnoteItem: 'font-size:13px;color:#666;line-height:1.6;margin:3px 0;word-break:break-all;',
  },

  // 主题4：暗黑极客 - 青色主色调，深色背景，适合程序员
  dark: {
    name: '暗黑极客',
    primaryColor: '#61dafb',
    container: 'max-width:100%;padding:10px 15px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#e0e0e0;line-height:1.8;font-size:16px;background:#1a1a2e;',
    h1: 'font-size:24px;font-weight:bold;color:#61dafb;margin:30px 0 15px;padding-bottom:10px;border-bottom:2px solid #61dafb;line-height:1.4;',
    h2: 'font-size:20px;font-weight:bold;color:#61dafb;margin:25px 0 12px;padding-left:10px;border-left:4px solid #61dafb;line-height:1.4;',
    h3: 'font-size:18px;font-weight:bold;color:#e0e0e0;margin:20px 0 10px;line-height:1.4;',
    h4: 'font-size:16px;font-weight:bold;color:#aaa;margin:18px 0 8px;line-height:1.4;',
    p: 'margin:10px 0;line-height:1.8;color:#e0e0e0;font-size:16px;',
    strong: 'font-weight:bold;color:#61dafb;',
    em: 'font-style:italic;color:#aaa;',
    inlineCode: 'background:#2d2d44;color:#61dafb;padding:2px 6px;border-radius:3px;font-size:90%;font-family:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;',
    codeBlock: 'background:#0d1117;border-radius:5px;padding:16px;margin:15px 0;overflow-x:auto;border:1px solid #2d2d44;',
    codeContent: 'font-family:"SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;font-size:14px;line-height:1.6;color:#c9d1d9;background:transparent;margin:0;padding:0;',
    blockquote: 'border-left:4px solid #61dafb;padding:10px 15px;margin:15px 0;background:#2d2d44;color:#aaa;font-style:italic;',
    listItem: 'margin:5px 0;padding-left:5px;line-height:1.8;font-size:16px;color:#e0e0e0;',
    link: 'color:#61dafb;',
    image: 'max-width:100%;border-radius:5px;margin:10px auto;display:block;',
    hr: 'border:none;height:1px;background:linear-gradient(to right,transparent,#61dafb,transparent);margin:20px 0;',
    tableWrapper: 'width:100%;border-collapse:collapse;margin:15px 0;font-size:15px;',
    tableTh: 'background:#61dafb;color:#1a1a2e;padding:10px 15px;font-weight:bold;text-align:left;border:1px solid #61dafb;',
    tableTd: 'padding:8px 15px;border:1px solid #2d2d44;color:#e0e0e0;',
    tableTrEven: 'background:#2d2d44;',
    footnoteTitle: 'font-size:14px;font-weight:bold;color:#61dafb;margin:20px 0 10px;padding-top:10px;border-top:1px solid #2d2d44;',
    footnoteItem: 'font-size:13px;color:#888;line-height:1.6;margin:3px 0;word-break:break-all;',
  }
};

// ========== Title & Summary Extraction ==========

function extractTitle(markdown) {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const titleMatch = frontmatterMatch[1].match(/title:\s*["']?(.+?)["']?\s*$/m);
    if (titleMatch) return titleMatch[1].trim();
  }
  const h1Match = markdown.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();
  return 'Untitled';
}

function extractSummary(markdown) {
  let content = markdown.replace(/^---\n[\s\S]*?\n---\n?/, '');
  content = content.replace(/^#+\s+.+$/gm, '');
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('![') && !trimmed.startsWith('[') && trimmed.length > 10) {
      return trimmed.substring(0, 120);
    }
  }
  return '';
}

// ========== HTML Post-Processing ==========

function processLists(html, theme) {
  // Replace <ol>/<li> with numbered sections (innermost first for nested lists)
  let prev;
  do {
    prev = html;
    html = html.replace(/<ol(?:\s+start="(\d+)")?>([\s\S]*?)<\/ol>/g, (match, startStr, content) => {
      let num = parseInt(startStr) || 1;
      return content.replace(/<li>([\s\S]*?)<\/li>/g, (_, itemContent) => {
        const result = `<section style="${theme.listItem}"><span style="color:${theme.primaryColor};font-weight:bold;">${num}.</span> ${itemContent}</section>`;
        num++;
        return result;
      });
    });
  } while (html !== prev);

  // Replace <ul>/<li> with bullet sections
  do {
    prev = html;
    html = html.replace(/<ul>([\s\S]*?)<\/ul>/g, (match, content) => {
      return content.replace(/<li>([\s\S]*?)<\/li>/g, (_, itemContent) => {
        return `<section style="${theme.listItem}"><span style="color:${theme.primaryColor};">\u2022</span> ${itemContent}</section>`;
      });
    });
  } while (html !== prev);

  return html;
}

function processTables(html, theme) {
  // Add table wrapper style
  html = html.replace(/<table>/g, `<table style="${theme.tableWrapper}">`);
  // Add th/td styles
  html = html.replace(/<th>/g, `<th style="${theme.tableTh}">`);
  html = html.replace(/<td>/g, `<td style="${theme.tableTd}">`);
  // Add even row backgrounds in tbody
  let rowIndex = 0;
  html = html.replace(/<tbody>([\s\S]*?)<\/tbody>/g, (match, body) => {
    const processed = body.replace(/<tr>/g, () => {
      const style = rowIndex % 2 === 1 ? ` style="${theme.tableTrEven}"` : '';
      rowIndex++;
      return `<tr${style}>`;
    });
    return `<tbody>${processed}</tbody>`;
  });
  // Remove thead/tbody wrappers (WeChat compatibility)
  html = html.replace(/<\/?thead>/g, '');
  html = html.replace(/<\/?tbody>/g, '');
  return html;
}

// ========== Main Conversion ==========

function convert(markdown, themeName = 'professional') {
  const theme = themes[themeName];
  if (!theme) {
    throw new Error(`Unknown theme: ${themeName}. Available: ${Object.keys(themes).join(', ')}`);
  }

  const title = extractTitle(markdown);
  const summary = extractSummary(markdown);

  // Remove frontmatter
  let content = markdown.replace(/^---\n[\s\S]*?\n---\n?/, '');

  // Link collection for footnotes
  const links = [];
  let linkIndex = 0;

  // Configure marked with custom renderer
  marked.use({
    renderer: {
      // --- Block elements: use this.parser.parseInline for inline content ---

      heading(token) {
        const text = token.tokens ? this.parser.parseInline(token.tokens) : (token.text || '');
        const depth = token.depth;
        const style = theme[`h${depth}`] || theme.h4;
        return `<section style="${style}">${text}</section>`;
      },

      paragraph(token) {
        const text = token.tokens ? this.parser.parseInline(token.tokens) : (token.text || '');
        return `<section style="${theme.p}">${text}</section>`;
      },

      blockquote(token) {
        const text = token.tokens ? this.parser.parse(token.tokens) : (token.text || '');
        return `<section style="${theme.blockquote}">${text}</section>`;
      },

      // --- Inline elements: token.text is already the inner text ---

      strong(token) {
        const text = token.text || '';
        return `<strong style="${theme.strong}">${text}</strong>`;
      },

      em(token) {
        const text = token.text || '';
        return `<em style="${theme.em}">${text}</em>`;
      },

      codespan(token) {
        const text = token.text || '';
        return `<code style="${theme.inlineCode}">${text}</code>`;
      },

      link(token) {
        const href = token.href || '';
        const text = token.text || '';
        linkIndex++;
        links.push({ index: linkIndex, text, href });
        return `<span style="${theme.link}">${text}[${linkIndex}]</span>`;
      },

      image(token) {
        const src = token.href || '';
        const alt = token.text || '';
        return `<img style="${theme.image}" src="${src}" alt="${alt}" />`;
      },

      // --- Code blocks: token.text is raw code ---

      code(token) {
        const text = token.text || '';
        const lang = token.lang || '';
        let highlighted;
        try {
          if (lang && hljs.getLanguage(lang)) {
            highlighted = hljs.highlight(text, { language: lang }).value;
          } else {
            highlighted = hljs.highlightAuto(text).value;
          }
        } catch (e) {
          highlighted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        return `<section style="${theme.codeBlock}"><pre style="margin:0;padding:0;background:transparent;overflow-x:auto;white-space:pre;word-wrap:normal;"><code style="${theme.codeContent}">${highlighted}</code></pre></section>`;
      },

      // --- Other elements ---

      hr() {
        return `<section style="${theme.hr}"></section>`;
      }

      // table, tablerow, tablecell, list, listitem: NOT overridden
      // These are handled via HTML post-processing below
    }
  });

  // Convert markdown to HTML
  let html = marked(content);

  // Post-process: lists (replace ul/ol/li with section tags)
  html = processLists(html, theme);

  // Post-process: tables (add inline styles)
  html = processTables(html, theme);

  // Add footnote section if there are collected links
  if (links.length > 0) {
    html += `<section style="${theme.footnoteTitle}">\u53c2\u8003\u94fe\u63a5</section>`;
    for (const link of links) {
      html += `<section style="${theme.footnoteItem}">[${link.index}] ${link.text}: ${link.href}</section>`;
    }
  }

  // Wrap in container
  html = `<section style="${theme.container}">${html}</section>`;

  // Use juice to inline any remaining CSS (safety net)
  try {
    html = juice(html);
  } catch (e) {
    // If juice fails, continue with existing inline styles
  }

  // Remove whitespace between tags (prevents WeChat from inserting blank lines)
  html = html.replace(/>\s*\n\s*</g, '><');

  return { html, title, summary, links };
}

// ========== CLI Interface ==========

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node converter.js <markdown-file> [theme]');
    console.error(`Themes: ${Object.keys(themes).map(k => `${k} (${themes[k].name})`).join(', ')}`);
    process.exit(1);
  }

  const mdFile = args[0];
  const themeName = args[1] || 'professional';

  if (!fs.existsSync(mdFile)) {
    console.error(`File not found: ${mdFile}`);
    process.exit(1);
  }

  if (!themes[themeName]) {
    console.error(`Unknown theme: ${themeName}`);
    console.error(`Available: ${Object.keys(themes).join(', ')}`);
    process.exit(1);
  }

  const markdown = fs.readFileSync(mdFile, 'utf-8');

  try {
    const result = convert(markdown, themeName);
    console.log(JSON.stringify({
      title: result.title,
      summary: result.summary,
      html: result.html,
      linkCount: result.links.length
    }, null, 2));
  } catch (err) {
    console.error(`Conversion error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { convert, themes, extractTitle, extractSummary };
