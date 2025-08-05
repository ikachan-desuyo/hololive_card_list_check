/**
 * マネちゃん (hSD01-017_02_C)
 * サポート・スタッフ・LIMITED
 * 
 * サポート効果：
 * このカードは、自分の手札がこのカードを含まずに1枚以上なければ使えない。
 * 自分の手札すべてをデッキに戻してシャッフルする。そして自分のデッキを5枚引く。
 * LIMITED：ターンに１枚しか使えない。
 */

(function() {
    'use strict';
    
    const cardEffect = {
        id: 'hSD01-017_02_C',
        name: 'マネちゃん',
        type: 'サポート・スタッフ・LIMITED',
        
        supportEffect: {
            canActivate: function(gameState, playerId) {
                const player = gameState.players[playerId];
                
                // LIMITEDチェック
                if (player.limitedUsedThisTurn) return false;
                
                // 手札がこのカードを含まずに1枚以上必要
                const handWithoutThis = player.hand.filter(card => card.id !== this.id);
                return handWithoutThis.length >= 1 && player.deck;
            },
            
            execute: async function(gameState, playerId) {
                
                const player = gameState.players[playerId];
                
                // LIMITEDフラグを設定
                player.limitedUsedThisTurn = true;
                
                // 手札からこのカード以外をすべてデッキに戻す
                const cardsToReturn = player.hand.filter(card => card.id !== this.id);
                player.hand = player.hand.filter(card => card.id === this.id);
                
                // デッキに戻す
                cardsToReturn.forEach(card => {
                    player.deck.push(card);
                });
                
                
                // デッキをシャッフル
                this.shuffleDeck(player.deck);
                
                // 5枚引く
                let drawnCards = 0;
                for (let i = 0; i < 5 && player.deck.length > 0; i++) {
                    const card = player.deck.pop();
                    if (card) {
                        player.hand.push(card);
                        drawnCards++;
                    }
                }
                
                
                return true;
            },
            
            shuffleDeck: function(deck) {
                for (let i = deck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [deck[i], deck[j]] = [deck[j], deck[i]];
                }
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
