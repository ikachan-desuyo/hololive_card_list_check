/**
 * 春先のどか (hSD01-016_C)
 * サポート・スタッフ・LIMITED
 * 
 * サポート効果：
 * 自分のデッキを３枚引く。
 * LIMITED：ターンに１枚しか使えない。
 */

(function() {
    'use strict';
    
    const cardEffect = {
        id: 'hSD01-016_C',
        name: '春先のどか',
        type: 'サポート・スタッフ・LIMITED',
        
        supportEffect: {
            canActivate: function(gameState, playerId) {
                // LIMITEDチェック：このターンにLIMITEDカードを使用していないか
                const player = gameState.players[playerId];
                return !player.limitedUsedThisTurn && player.deck && player.deck.length > 0;
            },
            
            execute: async function(gameState, playerId) {
                
                const player = gameState.players[playerId];
                
                // LIMITEDフラグを設定
                player.limitedUsedThisTurn = true;
                
                // デッキから3枚引く
                let drawnCards = 0;
                for (let i = 0; i < 3 && player.deck.length > 0; i++) {
                    const card = player.deck.pop();
                    if (card) {
                        player.hand.push(card);
                        drawnCards++;
                    }
                }
                
                
                return true;
            }
        }
    };
    
    // カード効果を登録
    if (typeof window !== 'undefined') {
        if (!window.cardEffects) {
            window.cardEffects = {};
        }
        window.cardEffects[cardEffect.id] = cardEffect;
    }
})();
