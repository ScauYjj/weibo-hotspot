#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const GEMINI_CONFIG = {
  baseUrl: 'https://yunwu.ai/',
  endpoint: '/v1beta/models/gemini-3.1-flash-image-preview:generateContent',
  apiKey: 'sk-mvtp05Cxh9hTBEXkvVbD0qPY2SNemTEw1SmundmkHfI7WKAM'
};

/**
 * Load cover prompt template and replace {{title}} placeholder
 */
function loadCoverPrompt(title) {
  const promptPath = path.join(__dirname, 'cover-prompt.md');
  let prompt = fs.readFileSync(promptPath, 'utf-8');
  prompt = prompt.replace(/\{\{title\}\}/g, title);
  return prompt;
}

/**
 * Generate a cover image using Gemini API
 * @param {string} title - Article title for the cover
 * @returns {Promise<{success: boolean, filePath: string, fileName: string}>}
 */
async function generateCover(title) {
  const prompt = loadCoverPrompt(title);

  const requestBody = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE']
    }
  };

  const url = new URL(GEMINI_CONFIG.endpoint, GEMINI_CONFIG.baseUrl);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_CONFIG.apiKey
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();

  // Extract image from response
  const parts = result.candidates?.[0]?.content?.parts || [];
  let imageData = null;
  let mimeType = null;

  for (const part of parts) {
    if (part.inlineData) {
      imageData = part.inlineData.data;
      mimeType = part.inlineData.mimeType;
      break;
    }
  }

  if (!imageData) {
    throw new Error('No image generated in response. The model may have returned only text.');
  }

  // Save to temp directory
  const tempDir = path.join(__dirname, 'temp');
  fs.mkdirSync(tempDir, { recursive: true });

  const ext = mimeType ? mimeType.split('/')[1] || 'png' : 'png';
  const fileName = `cover_${Date.now()}.${ext}`;
  const filePath = path.join(tempDir, fileName);

  fs.writeFileSync(filePath, Buffer.from(imageData, 'base64'));

  return {
    success: true,
    filePath,
    fileName,
    mimeType
  };
}

// ========== CLI Interface ==========

if (require.main === module) {
  const title = process.argv.slice(2).join(' ');
  if (!title) {
    console.error('Usage: node cover-generator.js <article-title>');
    process.exit(1);
  }

  console.log(`Generating cover for: "${title}"...`);

  generateCover(title)
    .then(result => {
      console.log(JSON.stringify(result));
    })
    .catch(err => {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { generateCover };
