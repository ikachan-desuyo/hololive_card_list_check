#!/usr/bin/env node

/**
 * 同期処理のカード効果を非同期処理+モーダル対応に一括更新するスクリプト
 */

const fs = require('fs');
const path = require('path');

const cardsDir = path.join(__dirname, 'battle_simulator/card-effects/cards');

// 更新対象ファイル
const syncFiles = [
  'hBP04-004.js',
  'hBP04-045.js', 
  'hSD01-016.js',
  'hY04-001.js'
];

function updateSyncEffect(filePath) {
  console.log(`🔄 更新中: ${filePath}`);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // effect: (card, battleEngine) => を effect: async (card, battleEngine) => に変更
    content = content.replace(
      /effect:\s*\(card,\s*battleEngine\)\s*=>\s*{/g,
      'effect: async (card, battleEngine) => {'
    );
    
    // 基本的なモーダル構造を追加（簡易版）
    // return { ... }; を Promise+モーダルに置換
    const returnPattern = /return\s*{\s*success:\s*true,\s*message:\s*[^}]+\s*};/g;
    const matches = content.match(returnPattern);
    
    if (matches) {
      // 最初のreturn文をモーダル対応に変更
      const firstReturn = matches[0];
      const modalReplacement = `
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || card.cardName,
            effectName: '効果発動',
            effectDescription: '効果を発動しますか？',
            effectType: 'support'
          }, async (confirmed) => {
            if (!confirmed) {
              resolve({
                success: false,
                message: '効果の発動をキャンセルしました'
              });
              return;
            }
            
            try {
              // TODO: 実際の効果処理
              resolve(${firstReturn});
            } catch (error) {
              console.error('効果実行エラー:', error);
              resolve({
                success: false,
                message: '効果の実行中にエラーが発生しました'
              });
            }
          });
        });`;
      
      content = content.replace(firstReturn, modalReplacement);
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ 完了: ${filePath}`);
    
  } catch (error) {
    console.error(`❌ エラー: ${filePath}`, error.message);
  }
}

// メイン処理
function main() {
  console.log('🚀 同期処理カード効果の一括更新を開始...');
  
  syncFiles.forEach(fileName => {
    const filePath = path.join(cardsDir, fileName);
    if (fs.existsSync(filePath)) {
      updateSyncEffect(filePath);
    } else {
      console.log(`⚠️  ファイルが見つかりません: ${fileName}`);
    }
  });
  
  console.log('🎉 一括更新完了！');
}

main();
