/**
 * カード効果ファイルを新システム対応に一括更新
 */

const fs = require('fs');
const path = require('path');

const cardsDir = path.join(__dirname, 'battle_simulator', 'card-effects', 'cards');
const files = fs.readdirSync(cardsDir).filter(file => file.endsWith('.js'));

console.log(`🔄 ${files.length}個のカード効果ファイルを更新中...`);

let updatedCount = 0;

files.forEach(file => {
  const filePath = path.join(cardsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 旧システムの登録コードを新システム用に置換
  const oldPattern = /\/\/ 効果を登録\nif \(window\.cardEffectManager\) \{[\s\S]*?\} else \{[\s\S]*?\}/;
  
  if (oldPattern.test(content)) {
    const cardId = file.replace('.js', '');
    const effectVarName = `cardEffect_${cardId.replace(/-/g, '_')}`;
    
    const newRegistrationCode = `// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['${cardId}'] = ${effectVarName};
  console.log('🔮 [Card Effect] ${cardId} の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: '${cardId}',
    effect: ${effectVarName}
  });
}`;

    content = content.replace(oldPattern, newRegistrationCode);
    
    fs.writeFileSync(filePath, content);
    updatedCount++;
    console.log(`✅ ${file} を更新`);
  }
});

console.log(`🎉 ${updatedCount}個のファイルを新システム対応に更新完了！`);
