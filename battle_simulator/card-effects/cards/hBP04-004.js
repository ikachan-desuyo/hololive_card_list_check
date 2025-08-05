/**
 * hBP04-004 - カード効果定義
 * 推しホロメン
 */

// カード効果の定義
const cardEffect_hBP04_004 = {
  // カード基本情報
  cardId: 'hBP04-004',
  cardName: '雪花ラミィ',
  cardType: '推しホロメン',
  
  // 効果定義
  effects: {
    // 推しスキル：愛してる
    oshiSkill_aishteru: {
      type: 'oshi_skill',
      timing: 'reactive',
      name: '愛してる',
      description: '[ホロパワー：-1]相手のターンで、自分のホロメンがダウンした時に使える：そのホロメンに付いているファン1枚を手札に戻す',
      holoPowerCost: 1,
      turnLimit: 1,
      condition: (card, gameState) => {
        // 相手のターン中で自分のホロメンがダウンした時
        return !gameState.isMyTurn && gameState.lastDownedHolomem;
      },
      effect: (card, battleEngine) => {
        console.log(`💙 [愛してる] ${card.name || '雪花ラミィ'}の推しスキルが発動！`);
        
        const utils = new CardEffectUtils(battleEngine);
        const gameState = battleEngine.gameState;
        
        // ダウンしたホロメンに付いているファンを手札に戻す
        const downedHolomem = gameState.lastDownedHolomem;
        if (downedHolomem && downedHolomem.attachedFans && downedHolomem.attachedFans.length > 0) {
          const fan = downedHolomem.attachedFans.pop();
          
          const currentPlayer = gameState.currentPlayer;
          const player = battleEngine.players[currentPlayer];
          player.hand.push(fan);
          
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${card.name || '雪花ラミィ'}の推しスキルでファン「${fan.name}」を手札に戻しました`,
            fanReturned: fan
          };
        } else {
          return {
            success: false,
            message: 'ダウンしたホロメンにファンが付いていません'
          };
        }
      }
    },

    // SP推しスキル：ぶーん、バリバリバリバリ
    spOshiSkill_baribaribari: {
      type: 'sp_oshi_skill',
      timing: 'manual',
      name: 'ぶーん、バリバリバリバリ',
      description: '[ホロパワー：-3]自分の〈雪花ラミィ〉1人を選ぶ。このターンの間、選んだホロメンが、相手のホロメン1人に与える特殊ダメージ+100し、選んだホロメンが相手のホロメンをダウンさせた時、自分のデッキを2枚引く',
      holoPowerCost: 3,
      gameLimit: 1,
      condition: (card, gameState) => {
        // 自分のターン中で雪花ラミィがステージにいる
        return gameState.isMyTurn && gameState.stage.some(holomem => holomem.name?.includes('雪花ラミィ'));
      },
      effect: (card, battleEngine) => {
        console.log(`⚡ [ぶーん、バリバリバリバリ] ${card.name || '雪花ラミィ'}のSP推しスキルが発動！`);
        
        const utils = new CardEffectUtils(battleEngine);
        const gameState = battleEngine.gameState;
        
        // 雪花ラミィを選択（簡易実装）
        const lamiis = gameState.stage.filter(holomem => holomem.name?.includes('雪花ラミィ'));
        if (lamiis.length > 0) {
          const selectedLamii = lamiis[0]; // 最初の雪花ラミィを選択
          
          // このターンの間、特殊ダメージ+100のバフを付与（相手のホロメン1人に対して）
          selectedLamii.tempBuffs = selectedLamii.tempBuffs || {};
          selectedLamii.tempBuffs.specialDamageBonus = 100;
          selectedLamii.tempBuffs.drawOnDownByThis = 2; // この選んだホロメンがダウンさせた時のみ
          selectedLamii.tempBuffs.spOshiSkillActive = true; // SP推しスキル効果中フラグ
          
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${card.name || '雪花ラミィ'}のSP推しスキルで「${selectedLamii.name}」に特殊ダメージ+100とダウン時ドロー効果を付与しました`,
            selectedHolomem: selectedLamii
          };
        } else {
          return {
            success: false,
            message: 'ステージに雪花ラミィがいません'
          };
        }
      }
    }
  }
};

// 効果を登録
if (typeof window !== 'undefined') {
  window.cardEffectManager = window.cardEffectManager || new ScalableCardEffectManager();
  window.cardEffectManager.registerCardEffect('hBP04-004', cardEffect_hBP04_004);
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cardEffect_hBP04_004;
}
