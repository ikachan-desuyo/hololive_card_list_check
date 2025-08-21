/**
 * カード効果スケルトンファイル自動生成ツール（テスト版）
 * 指定されたカードのみ生成してテストします
 */

const fs = require('fs');
const path = require('path');

// 元のスクリプトから関数を読み込み
const { getBaseCardNumber, getFileName, getExistingCardFiles, loadCardData } = require('./generate-card-skeletons.js');

// テスト用カードリスト（一部のみ生成）
const testCards = [
  'hBP04-089', // サポートカード
  'hBP02-069', // ホロメンカード（コラボエフェクト付き）
];

console.log('🧪 テスト用スケルトンファイル生成');
console.log(`🎯 対象カード: ${testCards.join(', ')}`);

// データ読み込み
const cardData = loadCardData();
const existingFiles = getExistingCardFiles();

testCards.forEach(baseNumber => {
  if (existingFiles.includes(baseNumber)) {
    console.log(`⚠️  ${baseNumber} は既に実装済みです`);
    return;
  }
  
  // 該当するバリエーションを検索
  const variants = Object.entries(cardData)
    .filter(([cardId, card]) => getBaseCardNumber(cardId) === baseNumber)
    .map(([cardId, card]) => ({ id: cardId, data: card }));
  
  if (variants.length === 0) {
    console.log(`❌ ${baseNumber} のデータが見つかりません`);
    return;
  }
  
  // 代表カードを選択
  const representative = variants[0];
  
  console.log(`📝 ${baseNumber} のスケルトンファイルを生成中...`);
  console.log(`   データ: ${representative.data.name} (${representative.data.card_type})`);
});

module.exports = { testCards };