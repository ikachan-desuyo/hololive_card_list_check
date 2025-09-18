console.log('=== 全カード効果タイミング確認 ===');

// 全カード効果を確認
if (window.cardEffects) {
  console.log('🔍 [DEBUG] 登録されているカード数:', Object.keys(window.cardEffects).length);
  
  Object.entries(window.cardEffects).forEach(([cardId, cardEffect]) => {
    console.log(`\n📋 [${cardId}] ${cardEffect.cardName || 'カード名不明'}`);
    
    if (cardEffect.effects) {
      Object.entries(cardEffect.effects).forEach(([effectKey, effect]) => {
        const timing = effect.timing || '未設定';
        const autoTrigger = effect.auto_trigger || 'なし';
        const type = effect.type || '不明';
        const name = effect.name || effectKey;
        
        console.log(`  🎯 ${name} (${type})`);
        console.log(`    - timing: "${timing}"`);
        console.log(`    - auto_trigger: "${autoTrigger}"`);
        
        // タイミング分析
        const isAutomatic = ['on_collab', 'arts', 'on_bloom', 'on_center', 'on_stage'].includes(timing) || autoTrigger !== 'なし';
        const isManual = timing === 'manual' || timing === 'activate' || timing === 'gift';
        
        console.log(`    - 分類: ${isAutomatic ? '自動効果' : isManual ? '手動効果' : '不明'}`);
        
        // 適切性チェック
        if (type === 'collab' && timing !== 'manual' && autoTrigger !== 'on_collab') {
          console.warn(`    ⚠️ コラボ効果なのに適切でないタイミング設定`);
        }
        if (type === 'art' && timing !== 'manual' && autoTrigger !== 'arts') {
          console.warn(`    ⚠️ アーツ効果なのに適切でないタイミング設定`);
        }
        if (type === 'bloom' && timing !== 'manual' && autoTrigger !== 'on_bloom') {
          console.warn(`    ⚠️ ブルーム効果なのに適切でないタイミング設定`);
        }
      });
    } else {
      console.log(`  ❌ effects定義なし`);
    }
  });
} else {
  console.log('❌ window.cardEffects が存在しません');
}

console.log('\n=== hBP04-044 詳細確認 ===');
console.log('🔍 [DEBUG] カード効果が存在する:', !!window.cardEffects['hBP04-044']);
console.log('🔍 [DEBUG] 全体効果定義:', window.cardEffects['hBP04-044']);
console.log('🔍 [DEBUG] effects構造:', window.cardEffects['hBP04-044']?.effects);
console.log('🔍 [DEBUG] collabEffect:', window.cardEffects['hBP04-044']?.effects?.collabEffect);
console.log('🔍 [DEBUG] collabEffect timing:', window.cardEffects['hBP04-044']?.effects?.collabEffect?.timing);
console.log('🔍 [DEBUG] art1:', window.cardEffects['hBP04-044']?.effects?.art1);
console.log('🔍 [DEBUG] art1 timing:', window.cardEffects['hBP04-044']?.effects?.art1?.timing);
