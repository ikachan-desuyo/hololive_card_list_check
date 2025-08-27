/**
 * hBP04-097 - 緑の試験管（装備テスト用）
 */

// カード効果の定義
const cardEffect_hBP04_097 = {
  cardId: 'hBP04-097',
  name: '緑の試験管',
  
  effects: {
    // 手動効果（装備か効果発動かを選択できるようにする）
    supportEffect: {
      name: '緑の試験管効果',
      timing: 'manual',
      limited: false,
      condition: function(card, gameState, battleEngine) {
        return true; // 常に発動可能
      },
      activate: function(card, gameState, battleEngine) {
        console.log('🧪 緑の試験管の効果が発動しました！');
        alert('緑の試験管の効果：テスト効果です');
        return true;
      }
    }
  }
};

// グローバルに登録
if (typeof window !== 'undefined') {
  window.cardEffects = window.cardEffects || {};
  window.cardEffects['hBP04-097'] = cardEffect_hBP04_097;
  window.cardEffects['hBP04-097_U'] = cardEffect_hBP04_097; // フルIDでも登録
}
