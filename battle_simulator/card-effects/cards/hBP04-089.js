/**
 * hBP04-089 - カード効果定義
 * ツートンカラーパソコン
 */

// カード効果の定義
const cardEffect_hBP04_089 = {
  // カード基本情報
  cardId: 'hBP04-089',
  cardName: 'ツートンカラーパソコン',
  cardType: 'サポート・アイテム・LIMITED',
  rarity: 'U',
  
  // 効果定義
  effects: {
    // サポート効果
    supportEffect: {
      type: 'support',
      timing: 'manual',
      name: 'サポート効果',
      description: 'このカードは、自分のステージに色が1色で異なる色のホロメンが2人以上いなければ使えない。\n\n自分のステージの色が1色で異なる色のホロメン2人を選ぶ。自分のデッキから、Buzz以外のそれぞれ選んだホロメンと同色の1stホロメン1枚ずつを公開し、手札に加える。そしてデッキをシャッフルする。\n\nLIMITED：ターンに１枚しか使えない。',
      condition: (card, gameState, battleEngine) => {
        // TODO: 使用条件を実装
        return true;
      },
      effect: async (card, battleEngine) => {
        console.log(`📋 [サポート効果] ${card.name || 'hBP04-089'}が発動可能！`);
        
        // モーダル表示で発動確認
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || 'ツートンカラーパソコン',
            effectName: 'サポート効果',
            effectDescription: 'このカードは、自分のステージに色が1色で異なる色のホロメンが2人以上いなければ使えない。\n\n自分のステージの色が1色で異なる色のホロメン2人を選ぶ。自分のデッキから、Buzz以外のそれぞれ選んだホロメンと同色の1stホロメン1枚ずつを公開し、手札に加える。そしてデッキをシャッフルする。',
            effectType: 'support'
          }, async (confirmed) => {
            if (!confirmed) {
              resolve({
                success: false,
                message: 'サポート効果の発動をキャンセルしました'
              });
              return;
            }
            
            try {
              console.log(`📋 [サポート効果] 「ツートンカラーパソコン」を実行中...`);
              
              const currentPlayer = battleEngine.gameState.currentPlayer;
              const player = battleEngine.players[currentPlayer];
              const utils = new CardEffectUtils(battleEngine);
              
              // 1. ステージの色が1色で異なる色のホロメン2人を選択
              const stageHolomens = battleEngine.gameState.stage[currentPlayer] || [];
              const eligibleHolomens = stageHolomens.filter(holomem => 
                holomem && holomem.card_type && holomem.card_type.includes('ホロメン')
              );
              
              if (eligibleHolomens.length < 2) {
                resolve({
                  success: false,
                  message: 'ステージに異なる色のホロメンが2人以上必要です'
                });
                return;
              }
              
              // 2色のホロメンを選択（簡易実装）
              const selectedHolomens = eligibleHolomens.slice(0, 2);
              
              // 2. デッキから対応する1stホロメンを検索
              const targetCards = [];
              for (const holomem of selectedHolomens) {
                const targetName = holomem.name || holomem.card_name;
                const targetColor = holomem.color;
                
                const deckCard = player.deck.find(card => 
                  (card.name === targetName || card.card_name === targetName) &&
                  card.bloom_level === '1st' &&
                  card.card_type && card.card_type.includes('ホロメン') &&
                  (!card.card_name || !card.card_name.includes('Buzz'))
                );
                
                if (deckCard) {
                  targetCards.push(deckCard);
                }
              }
              
              // 3. 手札に加える
              for (const targetCard of targetCards) {
                const deckIndex = player.deck.indexOf(targetCard);
                if (deckIndex !== -1) {
                  player.deck.splice(deckIndex, 1);
                  player.hand.push(targetCard);
                }
              }
              
              // 4. デッキシャッフル
              utils.shuffleDeck(currentPlayer);
              
              // サポートカードをアーカイブ
              const handIndex = player.hand.indexOf(card);
              if (handIndex !== -1) {
                player.hand.splice(handIndex, 1);
                player.archive.push(card);
              }
              
              // UI更新
              utils.updateDisplay();
              
              resolve({
                success: true,
                message: `${card.name || 'hBP04-089'}のサポート効果で${targetCards.length}枚のカードを手札に加えました`,
                addedCards: targetCards
              });
            } catch (error) {
              console.error('サポート効果実行エラー:', error);
              resolve({
                success: false,
                message: 'サポート効果の実行中にエラーが発生しました'
              });
            }
          });
        });
      }
    },
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP04-089'] = cardEffect_hBP04_089;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-089',
    effect: cardEffect_hBP04_089
  });
}

// グローバルに公開
window.cardEffect_hBP04_089 = cardEffect_hBP04_089;
