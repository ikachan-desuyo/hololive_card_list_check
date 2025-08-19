#!/usr/bin/env node

/**
 * バージョン更新スクリプト
 * 使用方法: node update-version.js 4.9.0 "新機能の説明"
 */

const fs = require('fs');
const path = require('path');

// コマンドライン引数の取得
const [,, newVersion, newDescription] = process.argv;

if (!newVersion || !newDescription) {
  console.error('使用方法: node update-version.js <バージョン> "<説明>"');
  console.error('例: node update-version.js 4.9.0 "新機能追加"');
  process.exit(1);
}

// バージョン形式の検証
if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('バージョンは x.y.z の形式で入力してください（例: 4.11.5）');
  process.exit(1);
}

console.log(`🚀 バージョンを ${newVersion} に更新します`);
console.log(`📝 説明: ${newDescription}`);

try {
  // 1. sw-version.js の更新
  updateSwVersion(newVersion, newDescription);
  
  // 2. 全HTMLファイルの更新
  updateHtmlFiles(newVersion);
  
  // 3. package.json の更新（存在する場合）
  updatePackageJson(newVersion);
  
  console.log('✅ バージョン更新が完了しました！');
  console.log('📋 更新されたファイル:');
  console.log('  - sw-version.js');
  console.log('  - index.html');
  console.log('  - binder_collection.html');
  console.log('  - collection_binder.html');
  console.log('  - card_list.html');
  console.log('  - holoca_skill_page.html');
  console.log('  - deck_builder.html');
  console.log('  - package.json (存在する場合)');
  
} catch (error) {
  console.error('❌ バージョン更新中にエラーが発生しました:', error.message);
  process.exit(1);
}

function updateSwVersion(version, description) {
  const versionFilePath = path.join(__dirname, 'sw-version.js');
  
  if (!fs.existsSync(versionFilePath)) {
    throw new Error('sw-version.js が見つかりません');
  }
  
  let content = fs.readFileSync(versionFilePath, 'utf8');
  
  // APP_VERSION の更新
  content = content.replace(
    /const APP_VERSION = "[^"]+";/,
    `const APP_VERSION = "${version}";`
  );
  
  // VERSION_DESCRIPTION の更新
  content = content.replace(
    /const VERSION_DESCRIPTION = "[^"]+";/,
    `const VERSION_DESCRIPTION = "${description}";`
  );
  
  // PAGE_VERSIONS の更新
  const pageVersionsRegex = /const PAGE_VERSIONS = \{([^}]+)\};/s;
  const pageVersionsMatch = content.match(pageVersionsRegex);
  
  if (pageVersionsMatch) {
    const updatedPageVersions = pageVersionsMatch[1].replace(
      /"[\d\.]+"/g,
      `"${version}"`
    );
    content = content.replace(
      pageVersionsRegex,
      `const PAGE_VERSIONS = {${updatedPageVersions}};`
    );
  }
  
  // UPDATE_DETAILS の更新
  content = content.replace(
    /title: "[^"]*"/,
    `title: "v${version}"`
  );
  
  content = content.replace(
    /description: "[^"]*"/,
    `description: "${description}"`
  );
  
  fs.writeFileSync(versionFilePath, content, 'utf8');
  console.log('✓ sw-version.js を更新しました');
}

function updateHtmlFiles(version) {
  const htmlFiles = [
    'index.html',
    'binder_collection.html',
    'collection_binder.html',
    'card_list.html',
    'holoca_skill_page.html',
    'deck_builder.html'
  ];
  
  htmlFiles.forEach(filename => {
    const filePath = path.join(__dirname, filename);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ ${filename} が見つかりません - スキップします`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // HTMLコメントのバージョン更新
    content = content.replace(
      /<!-- Version: [\d\.]+ -->/,
      `<!-- Version: ${version} -->`
    );
    
    // 表示バージョンの更新
    content = content.replace(
      /\[v[\d\.]+\]/g,
      `[v${version}]`
    );
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${filename} を更新しました`);
  });
}

function updatePackageJson(version) {
  const packagePath = path.join(__dirname, 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    console.log('ℹ️ package.json が見つかりません - スキップします');
    return;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    packageJson.version = version;
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
    console.log('✓ package.json を更新しました');
  } catch (error) {
    console.warn('⚠️ package.json の更新に失敗しました:', error.message);
  }
}
