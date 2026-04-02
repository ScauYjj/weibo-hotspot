#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const IMGBB_CONFIG = {
  apiKey: '4bf53d4bd1678fefb2a9802c13bdf302',
  endpoint: 'https://api.imgbb.com/1/upload'
};

/**
 * Upload a local image file to ImgBB
 * @param {string} localFilePath - Absolute path to the local image file
 * @param {string} fileName - Optional file name for the upload
 * @returns {Promise<{success: boolean, url: string, deleteUrl: string}>}
 */
async function uploadToImgBB(localFilePath, fileName) {
  if (!fs.existsSync(localFilePath)) {
    throw new Error(`File not found: ${localFilePath}`);
  }

  const imageData = fs.readFileSync(localFilePath);
  const base64Image = imageData.toString('base64');

  const formData = new URLSearchParams();
  formData.append('key', IMGBB_CONFIG.apiKey);
  formData.append('image', base64Image);
  if (fileName) formData.append('name', fileName);

  const response = await fetch(IMGBB_CONFIG.endpoint, {
    method: 'POST',
    body: formData
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(`ImgBB upload failed: ${JSON.stringify(result.error || result)}`);
  }

  return {
    success: true,
    url: result.data.url,
    deleteUrl: result.data.delete_url
  };
}

/**
 * Scan markdown for local image references, upload them to ImgBB, and replace with remote URLs
 * @param {string} markdown - The markdown content
 * @param {string} basePath - Base directory for resolving relative image paths
 * @returns {Promise<{markdown: string, uploads: Array}>}
 */
async function processMarkdownImages(markdown, basePath) {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  const uploads = [];

  while ((match = imageRegex.exec(markdown)) !== null) {
    const [fullMatch, alt, src] = match;

    // Skip remote URLs
    if (src.startsWith('http://') || src.startsWith('https://')) continue;

    const localPath = path.resolve(basePath, src);
    if (!fs.existsSync(localPath)) {
      console.error(`Warning: Image not found, skipping: ${localPath}`);
      continue;
    }

    const fileName = path.basename(localPath, path.extname(localPath));
    console.log(`Uploading: ${src}`);
    const result = await uploadToImgBB(localPath, fileName);
    uploads.push({ original: src, url: result.url });
    console.log(`  -> ${result.url}`);
  }

  // Replace local paths with remote URLs
  let updatedMarkdown = markdown;
  for (const upload of uploads) {
    const escaped = upload.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    updatedMarkdown = updatedMarkdown.replace(
      new RegExp(`\\]\\(${escaped}\\)`, 'g'),
      `](${upload.url})`
    );
  }

  return { markdown: updatedMarkdown, uploads };
}

// ========== CLI Interface ==========

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'upload') {
    const filePath = args[1];
    if (!filePath) {
      console.error('Usage: node image-uploader.js upload <image-path>');
      process.exit(1);
    }
    uploadToImgBB(path.resolve(filePath), path.basename(filePath, path.extname(filePath)))
      .then(result => console.log(JSON.stringify(result)))
      .catch(err => { console.error(err.message); process.exit(1); });

  } else if (command === 'process') {
    const mdFilePath = args[1];
    if (!mdFilePath) {
      console.error('Usage: node image-uploader.js process <markdown-file>');
      process.exit(1);
    }
    const absolutePath = path.resolve(mdFilePath);
    const basePath = path.dirname(absolutePath);
    const markdown = fs.readFileSync(absolutePath, 'utf-8');

    processMarkdownImages(markdown, basePath)
      .then(result => {
        // Write updated markdown to temp file
        const tempDir = path.join(__dirname, 'temp');
        fs.mkdirSync(tempDir, { recursive: true });
        const tempPath = path.join(tempDir, `processed_${Date.now()}_${path.basename(mdFilePath)}`);
        fs.writeFileSync(tempPath, result.markdown);
        console.log(JSON.stringify({ tempPath, uploadCount: result.uploads.length, uploads: result.uploads }));
      })
      .catch(err => { console.error(err.message); process.exit(1); });

  } else {
    console.error('Commands:');
    console.error('  node image-uploader.js upload <image-path>     Upload a single image');
    console.error('  node image-uploader.js process <markdown-file> Process all local images in markdown');
    process.exit(1);
  }
}

module.exports = { uploadToImgBB, processMarkdownImages };
