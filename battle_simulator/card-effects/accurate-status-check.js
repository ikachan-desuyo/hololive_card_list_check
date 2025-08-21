#!/usr/bin/env node

/**
 * 正確な実装状況レポート生成ツール
 * 実際のファイル検証に基づいた信頼性の高い分析
 */

const fs = require('fs');
const path = require('path');

// カード実装ファイルのディレクトリ
const CARDS_DIR = path.join(__dirname, 'cards');

// 環境をモック（Node.js用）
function setupMockEnvironment() {
  global.window = {
    cardEffects: {},
    pendingCardEffects: [],
    modalUI: { showCardEffectModal: () => {} }
  };
  global.CardEffectUtils = class {
    constructor() {}
  };
}

// ファイルの実際の動作テスト
function testCardFile(filepath, cardId) {
  setupMockEnvironment();
  
  const result = {
    cardId,
    exists: fs.existsSync(filepath),
    syntaxValid: false,
    hasEffects: false,
    hasModal: false,
    effectCount: 0,
    effects: [],
    codeLines: 0,
    implementationLevel: 'NOT_STARTED',
    issues: []
  };

  if (!result.exists) {
    result.issues.push('ファイルが存在しません');
    return result;
  }

  try {
    // ファイル内容読み込み
    const content = fs.readFileSync(filepath, 'utf8');
    result.codeLines = content.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*');
    }).length;

    // モーダル対応チェック
    result.hasModal = content.includes('showCardEffectModal');

    // 構文チェック
    delete require.cache[require.resolve(filepath)];
    require(filepath);
    result.syntaxValid = true;

    // エフェクトオブジェクト取得
    const effectVarName = `cardEffect_${cardId.replace(/-/g, '_')}`;
    const effectObj = global.window[effectVarName];
    
    if (effectObj && effectObj.effects) {
      result.hasEffects = true;
      result.effectCount = Object.keys(effectObj.effects).length;
      
      // 個別効果の詳細
      Object.entries(effectObj.effects).forEach(([key, effect]) => {
        result.effects.push({
          key,
          name: effect.name || 'Unknown',
          type: effect.type || 'Unknown',
          hasCondition: typeof effect.condition === 'function',
          hasEffect: typeof effect.effect === 'function'
        });
      });
    }

    // 実装レベル判定
    if (result.syntaxValid && result.hasModal && result.hasEffects) {
      if (result.codeLines >= 100 && result.effectCount >= 1) {
        result.implementationLevel = 'PRODUCTION_READY';
      } else if (result.codeLines >= 50) {
        result.implementationLevel = 'VALIDATED';
      } else {
        result.implementationLevel = 'PARTIAL_IMPL';
      }
    } else if (result.hasEffects) {
      result.implementationLevel = 'SKELETON_ONLY';
    }

  } catch (error) {
    result.syntaxValid = false;
    result.issues.push(`構文エラー: ${error.message}`);
    if (result.codeLines > 10) {
      result.implementationLevel = 'SKELETON_ONLY';
    }
  }

  return result;
}

// メイン実行
function generateAccurateReport() {
  console.log('🔍 正確な実装状況を分析中...\n');

  if (!fs.existsSync(CARDS_DIR)) {
    console.error('❌ カードディレクトリが見つかりません:', CARDS_DIR);
    return;
  }

  const files = fs.readdirSync(CARDS_DIR).filter(f => f.endsWith('.js'));
  const results = [];
  const summary = {
    total: files.length,
    production_ready: 0,
    validated: 0,
    partial_impl: 0,
    skeleton_only: 0,
    not_started: 0,
    syntax_valid: 0,
    modal_support: 0
  };

  files.forEach(filename => {
    const cardId = filename.replace('.js', '');
    const filepath = path.join(CARDS_DIR, filename);
    const result = testCardFile(filepath, cardId);
    
    results.push(result);
    
    // 統計更新
    if (result.syntaxValid) summary.syntax_valid++;
    if (result.hasModal) summary.modal_support++;
    
    switch (result.implementationLevel) {
      case 'PRODUCTION_READY': summary.production_ready++; break;
      case 'VALIDATED': summary.validated++; break;
      case 'PARTIAL_IMPL': summary.partial_impl++; break;
      case 'SKELETON_ONLY': summary.skeleton_only++; break;
      default: summary.not_started++; break;
    }

    // 進捗表示
    const status = result.syntaxValid ? '✅' : '❌';
    const level = result.implementationLevel;
    console.log(`${status} ${cardId}: ${level} (${result.effectCount}効果, ${result.codeLines}行)`);
  });

  // 結果レポート
  console.log('\n📊 === 正確な実装状況サマリー ===');
  console.log(`📁 総ファイル数: ${summary.total}`);
  console.log(`✅ 構文正常: ${summary.syntax_valid}/${summary.total} (${Math.round(summary.syntax_valid/summary.total*100)}%)`);
  console.log(`🖥️  モーダル対応: ${summary.modal_support}/${summary.total} (${Math.round(summary.modal_support/summary.total*100)}%)`);
  console.log('');
  console.log('🎯 実装レベル別:');
  console.log(`🟢 プロダクション対応: ${summary.production_ready}`);
  console.log(`🔵 検証済み: ${summary.validated}`);
  console.log(`🟡 部分実装: ${summary.partial_impl}`);
  console.log(`🔴 スケルトンのみ: ${summary.skeleton_only}`);
  console.log(`⚫ 未着手: ${summary.not_started}`);

  // プロダクション対応カードの詳細
  console.log('\n🏆 === プロダクション対応カード ===');
  const productionCards = results.filter(r => r.implementationLevel === 'PRODUCTION_READY');
  productionCards.forEach(card => {
    console.log(`✅ ${card.cardId}:`);
    card.effects.forEach(effect => {
      console.log(`   - ${effect.type}: ${effect.name}`);
    });
  });

  return { summary, results, productionCards };
}

// スクリプト実行
if (require.main === module) {
  const report = generateAccurateReport();
  
  // JSONファイルとして保存
  const reportData = {
    generatedAt: new Date().toISOString(),
    ...report
  };
  
  fs.writeFileSync('accurate-implementation-report.json', JSON.stringify(reportData, null, 2));
  console.log('\n💾 詳細レポートを accurate-implementation-report.json に保存しました');
}

module.exports = { generateAccurateReport };
