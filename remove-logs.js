#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ログを削除する対象パターン
const logPatterns = [
  /^\s*window\.debugLog\([^;]*\);\s*$/gm,
  /^\s*window\.errorLog\([^;]*\);\s*$/gm,
  /^\s*console\.log\([^;]*\);\s*$/gm,
  /^\s*console\.warn\([^;]*\);\s*$/gm,
  /^\s*console\.error\([^;]*\);\s*$/gm,
  /^\s*console\.info\([^;]*\);\s*$/gm
];

// 削除しないファイル（重要なログがあるもの）
const excludeFiles = [
  'update-version.js',
  'sw.js',
  'sw-handlers.js',
  'sw-utils.js',
  'remove-logs.js'
];

// 削除しないディレクトリ
const excludeDirs = [
  'node_modules',
  '.git',
  'json_file'
];

function processFile(filePath) {
  const fileName = path.basename(filePath);
  if (excludeFiles.includes(fileName)) {
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // 各パターンでログを削除
    logPatterns.forEach(pattern => {
      content = content.replace(pattern, '');
    });
    
    // 空行が連続している場合は1行に統合
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // 変更があった場合のみファイルを更新
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ ログを削除: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ エラー: ${filePath}`, error.message);
  }
}

function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  items.forEach(item => {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(item)) {
        processDirectory(itemPath);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      if (['.js', '.html'].includes(ext)) {
        processFile(itemPath);
      }
    }
  });
}

console.log('🧹 プロジェクト全体のログを削除中...');
processDirectory('./');
console.log('✨ ログ削除完了');
