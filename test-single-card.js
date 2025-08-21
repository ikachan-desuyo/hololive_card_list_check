/**
 * テスト: 単一カードのスケルトンファイル生成
 */

const fs = require('fs');
const path = require('path');
const { 
  getBaseCardNumber, 
  getFileName, 
  getExistingCardFiles, 
  loadCardData, 
  generateSkeletonContent 
} = require('./generate-card-skeletons.js');

const testOutputDir = '/tmp/test-card-skeletons';

// テスト用ディレクトリを作成
if (!fs.existsSync(testOutputDir)) {
  fs.mkdirSync(testOutputDir, { recursive: true });
}

console.log('🧪 単一カードスケルトン生成テスト');
console.log(`📁 出力先: ${testOutputDir}`);

// データ読み込み
const cardData = loadCardData();

// テストケース1: サポートカード
const testCard1 = 'hBP04-089';
console.log(`\n📝 テスト1: ${testCard1} (サポートカード)`);

const variants1 = Object.entries(cardData)
  .filter(([cardId, card]) => getBaseCardNumber(cardId) === testCard1)
  .map(([cardId, card]) => ({ id: cardId, data: card }));

if (variants1.length > 0) {
  const representative1 = variants1[0];
  const content1 = generateSkeletonContent(testCard1, representative1, variants1);
  const fileName1 = getFileName(testCard1);
  const filePath1 = path.join(testOutputDir, fileName1);
  
  fs.writeFileSync(filePath1, content1, 'utf8');
  console.log(`✅ 生成完了: ${fileName1}`);
  console.log(`   カード名: ${representative1.data.name}`);
  console.log(`   ファイルサイズ: ${fs.statSync(filePath1).size} bytes`);
} else {
  console.log(`❌ ${testCard1} のデータが見つかりません`);
}

// テストケース2: ホロメンカード（コラボエフェクト付き）
const testCard2 = 'hBP02-069';
console.log(`\n📝 テスト2: ${testCard2} (ホロメンカード)`);

const variants2 = Object.entries(cardData)
  .filter(([cardId, card]) => getBaseCardNumber(cardId) === testCard2)
  .map(([cardId, card]) => ({ id: cardId, data: card }));

if (variants2.length > 0) {
  const representative2 = variants2[0];
  const content2 = generateSkeletonContent(testCard2, representative2, variants2);
  const fileName2 = getFileName(testCard2);
  const filePath2 = path.join(testOutputDir, fileName2);
  
  fs.writeFileSync(filePath2, content2, 'utf8');
  console.log(`✅ 生成完了: ${fileName2}`);
  console.log(`   カード名: ${representative2.data.name}`);
  console.log(`   ファイルサイズ: ${fs.statSync(filePath2).size} bytes`);
} else {
  console.log(`❌ ${testCard2} のデータが見つかりません`);
}

console.log(`\n📂 生成されたファイル一覧:`);
const generatedFiles = fs.readdirSync(testOutputDir);
generatedFiles.forEach(file => {
  console.log(`   ${file}`);
});

console.log(`\n💡 生成されたファイルを確認するには:`);
console.log(`   ls -la ${testOutputDir}`);
console.log(`   cat ${testOutputDir}/*.js`);