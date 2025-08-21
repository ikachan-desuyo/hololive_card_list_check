/**
 * ent02_teaching - カード効果定義
 * デッキ構築ルール
 */

// カード効果の定義
const cardEffect_ent02_teaching = {
  // カード基本情報
  cardId: 'ent02_teaching',
  cardName: 'デッキ構築ルール',
  cardType: 'サポート',
  
  // 効果定義
  effects: {
    // サポート効果
    supportEffect: {
      type: 'support',
      timing: 'manual',
      name: 'サポート効果',
      description: '※本説明用カードはデッキ登録できません。\n\n【デッキ構築ルール】\n「推しホロメンカード」「ホロメンカード」「Spotホロメンカード」はブースターパック「クインテットスペクトラム」に収録されているタレントのみ使用可能です。\n※ブースターパック「クインテットスペクトラム」に収録されているタレントであれば、「クインテットスペクトラム」以外で収録・配布されているカードも使用可能です。ただし、hBP02-069〈魔法少女みこ〉、hBP02-070〈魔法少女かなた〉、hBP02-071〈魔法少女ルーナ〉、hBP02-072〈魔法少女シオン〉、hBP02-073〈魔法少女マリン〉、hBP02-074〈魔法少女クロヱ〉は使用できません。\n※サポートカードなどその他のカードは通常のデッキ構築と同様となります。\n\n＜例：白上フブキの場合＞\nブースターパック「クインテットスペクトラム」には白上フブキのカードが収録されているため、ブースターパック「キュリアスユニバース」に収録されている白上フブキのカードも使用可能です。',
      condition: (card, gameState, battleEngine) => {
        // TODO: 使用条件を実装
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`📋 [サポート効果] ${card.name || 'ent02_teaching'}が発動！`);
        
        // TODO: 効果処理を実装
        
        return {
          success: true,
          message: `${card.name || 'ent02_teaching'}のサポート効果が発動しました`
        };
      }
    },
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['ent02_teaching'] = cardEffect_ent02_teaching;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'ent02_teaching',
    effect: cardEffect_ent02_teaching
  });
}

// グローバルに公開
window.cardEffect_ent02_teaching = cardEffect_ent02_teaching;
