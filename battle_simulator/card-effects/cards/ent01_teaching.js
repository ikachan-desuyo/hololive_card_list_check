/**
 * ent01_teaching - カード効果定義
 * デッキ構築ルール
 */

// カード効果の定義
const cardEffect_ent01_teaching = {
  // カード基本情報
  cardId: 'ent01_teaching',
  cardName: 'デッキ構築ルール',
  cardType: 'サポート',
  
  // 効果定義
  effects: {
    // サポート効果
    supportEffect: {
      type: 'support',
      timing: 'manual',
      name: 'サポート効果',
      description: '※本説明用カードはデッキ登録できません。\n\n【デッキ構築ルール】\n「推しホロメンカード」「ホロメンカード」「Spotホロメンカード」はブースターパック「ブルーミングレディアンス」に収録されているタレントのみ使用可能です。\n※ブースターパック「ブルーミングレディアンス」に収録されているタレントであれば、「ブルーミングレディアンス」以外で収録・配布されているカードも使用可能です。ただし、hBP02-070〈魔法少女かなた〉、hBP02-073〈魔法少女マリン〉は使用できません。\n※サポートカードなどその他のカードは通常のデッキ構築と同様となります。\n\n＜例：宝鐘マリンの場合＞\nブースターパック「ブルーミングレディアンス」には宝鐘マリンのカードが収録されているため、ブースターパック「クインテットスペクトラム」に収録されている宝鐘マリンのカードも使用可能です。',
      condition: (card, gameState, battleEngine) => {
        // TODO: 使用条件を実装
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`📋 [サポート効果] ${card.name || 'ent01_teaching'}が発動！`);
        
        // TODO: 効果処理を実装
        
        return {
          success: true,
          message: `${card.name || 'ent01_teaching'}のサポート効果が発動しました`
        };
      }
    },
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['ent01_teaching'] = cardEffect_ent01_teaching;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'ent01_teaching',
    effect: cardEffect_ent01_teaching
  });
}

// グローバルに公開
window.cardEffect_ent01_teaching = cardEffect_ent01_teaching;
