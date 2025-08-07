/**
 * hBP04-004 - カード効果定義
 * 雪花ラミィ (推しホロメン)
 */

// カード効果の定義
const cardEffect_hBP04_004 = {
  // カード基本情報
  cardId: 'hBP04-004',
  cardName: '雪花ラミィ',
  cardType: '推しホロメン',
  color: '青',
  life: 5,
  rarity: 'OSR',
  
  // 効果定義
  effects: {
    // 推しスキル：愛してる
    oshiSkill: {
      type: 'oshi_skill',
      name: '愛してる',
      description: '[ホロパワー：-1]相手のターンで、自分のホロメンがダウンした時に使える：そのホロメンに付いているファン1枚を手札に戻す。',
      holoPowerCost: 1,
      turnLimit: 1,
      timing: 'reactive',
      condition: (card, gameState, battleEngine) => {
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const myPlayerId = 1; // 推しホロメンは常にプレイヤー1のもの
        
        // この推しスキルは相手のターン中の反応的効果なので、相手ターン中のみ
        const isOpponentTurn = currentPlayer !== myPlayerId;
        
        // 自分のホロメンがダウンした時かチェック
        const holomenDownedThisTurn = battleEngine.gameState.lastDownedHolomem && 
          battleEngine.gameState.lastDownedHolomem.playerId === myPlayerId;
        
        console.log(`🔍 [推しスキル条件] 相手ターン: ${isOpponentTurn}, ホロメンダウン: ${holomenDownedThisTurn}`);
        
        return isOpponentTurn && holomenDownedThisTurn;
      },
      effect: (card, battleEngine) => {
        console.log(`💙 [推しスキル] ${card.name || 'hBP04-004'}の「愛してる」が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // ダウンしたホロメンに付いているファンを手札に戻す
        const downedHolomem = battleEngine.gameState.lastDownedHolomem;
        if (downedHolomem && downedHolomem.fans && downedHolomem.fans.length > 0) {
          const fan = downedHolomem.fans.pop();
          
          // 手札に戻す
          const addResult = utils.addCardsToHand(currentPlayer, [fan.card]);
          
          if (addResult.success) {
            // UI更新
            utils.updateDisplay();
            
            return {
              success: true,
              message: `${card.name || 'hBP04-004'}の推しスキル「愛してる」でファン「${fan.card.name}」を手札に戻しました`,
              fanReturned: fan.card
            };
          } else {
            return { success: false, message: addResult.reason };
          }
        } else {
          return {
            success: false,
            message: 'ダウンしたホロメンにファンが付いていません'
          };
        }
      }
    },

    // SP推しスキル：ぶーん、バリバリバリバリ
    spOshiSkill: {
      type: 'sp_oshi_skill',
      name: 'ぶーん、バリバリバリバリ',
      description: '[ホロパワー：-3]自分の〈雪花ラミィ〉1人を選ぶ。このターンの間、選んだホロメンが、相手のホロメン1人に与える特殊ダメージ+100し、選んだホロメンが相手のホロメンをダウンさせた時、自分のデッキを2枚引く。',
      holoPowerCost: 3,
      turnLimit: 1,
      gameLimit: 1,
      timing: 'manual',
      condition: (card, gameState, battleEngine) => {
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const currentPhase = battleEngine.gameState.currentPhase;
        const myPlayerId = 1;
        const utils = new CardEffectUtils(battleEngine);
        
        // 自分のメインステップでのみ使用可能
        if (currentPlayer !== myPlayerId || currentPhase !== 3) {
          return false;
        }
        
        // 自分のターン中で雪花ラミィがステージにいる
        const stageHolomens = utils.getStageHolomens(currentPlayer);
        return stageHolomens.some(h => h.card.name && h.card.name.includes('雪花ラミィ'));
      },
      effect: (card, battleEngine) => {
        console.log(`⚡ [SP推しスキル] ${card.name || 'hBP04-004'}の「ぶーん、バリバリバリバリ」が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // 雪花ラミィを選択
        const stageHolomens = utils.getStageHolomens(currentPlayer);
        const lamiis = stageHolomens.filter(h => 
          h.card.name && h.card.name.includes('雪花ラミィ')
        );
        
        if (lamiis.length === 0) {
          return { success: false, message: 'ステージに雪花ラミィがいません' };
        }
        
        // TODO: 複数の雪花ラミィがいる場合の選択UIの実装
        const selectedLamii = lamiis[0]; // 仮で最初の雪花ラミィを選択
        
        // このターンの間、特殊ダメージ+100のバフを付与
        if (!selectedLamii.card.tempBuffs) {
          selectedLamii.card.tempBuffs = {};
        }
        selectedLamii.card.tempBuffs.specialDamageBonus = 100;
        selectedLamii.card.tempBuffs.drawOnDownByThis = 2;
        selectedLamii.card.tempBuffs.spOshiSkillActive = true;
        selectedLamii.card.tempBuffs.turnExpire = battleEngine.gameState.turn;
        
        // UI更新
        utils.updateDisplay();
        
        return {
          success: true,
          message: `${card.name || 'hBP04-004'}のSP推しスキル「ぶーん、バリバリバリバリ」で「${selectedLamii.card.name}」に特殊ダメージ+100とダウン時ドロー効果を付与！`,
          selectedHolomem: selectedLamii
        };
      }
    }
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP04-004'] = cardEffect_hBP04_004;
  console.log('🔮 [Card Effect] hBP04-004 の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-004',
    effect: cardEffect_hBP04_004
  });
}

// グローバルに公開
window.cardEffect_hBP04_004 = cardEffect_hBP04_004;
