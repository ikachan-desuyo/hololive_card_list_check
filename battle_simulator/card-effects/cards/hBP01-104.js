/**
 * ふつうのパソコン (hBP01-104_C)
 * サポート・アイテム
 * 
 * サポート効果：
 * 自分のデッキから、Debutホロメン１枚を公開し、ステージに出す。そしてデッキをシャッフルする。
 */

(function() {
    'use strict';
    
    const cardEffect = {
        id: 'hBP01-104_C',
        name: 'ふつうのパソコン',
        type: 'サポート・アイテム',
        
        supportEffect: {
            canActivate: function(gameState, playerId) {
                // デッキにDebutホロメンがいるかチェック
                const player = gameState.players[playerId];
                if (!player.deck || player.deck.length === 0) return false;
                
                return player.deck.some(card => 
                    card.card_type === 'ホロメン' && 
                    card.bloom_level === 'Debut'
                );
            },
            
            execute: async function(gameState, playerId) {
                
                const player = gameState.players[playerId];
                
                // デッキからDebutホロメンを検索
                const debutHolomen = player.deck.filter(card => 
                    card.card_type === 'ホロメン' && 
                    card.bloom_level === 'Debut'
                );
                
                if (debutHolomen.length === 0) {
                    return false;
                }
                
                // プレイヤーに選択させる（現在は最初のカードを選択）
                const selectedCard = debutHolomen[0];
                
                // デッキからカードを除去
                const cardIndex = player.deck.indexOf(selectedCard);
                if (cardIndex > -1) {
                    player.deck.splice(cardIndex, 1);
                }
                
                // ステージに出す（空いているポジションを探す）
                const emptyPosition = this.findEmptyStagePosition(gameState, playerId);
                if (emptyPosition !== null) {
                    player.stage[emptyPosition] = selectedCard;
                } else {
                    // ステージが満杯の場合は手札に加える
                    player.hand.push(selectedCard);
                }
                
                // デッキをシャッフル
                this.shuffleDeck(player.deck);
                
                return true;
            },
            
            findEmptyStagePosition: function(gameState, playerId) {
                const player = gameState.players[playerId];
                for (let i = 0; i < 5; i++) {
                    if (!player.stage[i]) {
                        return i;
                    }
                }
                return null;
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
