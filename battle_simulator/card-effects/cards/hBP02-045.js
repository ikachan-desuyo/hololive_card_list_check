/**
 * 紫咲シオン (hBP02-045_U)
 * ホロメン・1st・紫
 * HP: 130
 * 
 * ブルームエフェクト「久しぶりの全体ライブーっ！！」：
 * 自分のデッキの上から3枚を見る。その中から、[青ホロメンか紫ホロメン]1枚を公開し、手札に加える。
 * そして残ったカードを好きな順でデッキの下に戻す。
 * 
 * アーツ「最高にハッピーです！！」: 40ダメージ [無色1]
 */

(function() {
    'use strict';
    
    const cardEffect = {
        id: 'hBP02-045_U',
        name: '紫咲シオン',
        type: 'ホロメン',
        color: '紫',
        hp: 130,
        bloomLevel: '1st',
        
        bloomEffect: {
            name: '久しぶりの全体ライブーっ！！',
            
            canActivate: function(gameState, playerId) {
                const player = gameState.players[playerId];
                return player.deck && player.deck.length >= 1;
            },
            
            execute: async function(gameState, playerId) {
                
                const player = gameState.players[playerId];
                const lookCount = Math.min(3, player.deck.length);
                
                if (lookCount === 0) {
                    return false;
                }
                
                // デッキの上から3枚を見る
                const lookedCards = player.deck.slice(-lookCount);
                
                // 青または紫のホロメンを探す
                const targetCards = lookedCards.filter(card => 
                    card.card_type === 'ホロメン' && 
                    (card.color === '青' || card.color === '紫')
                );
                
                if (targetCards.length > 0) {
                    // 最初に見つかった対象カードを手札に加える
                    const selectedCard = targetCards[0];
                    
                    // デッキからカードを除去
                    const cardIndex = player.deck.indexOf(selectedCard);
                    if (cardIndex > -1) {
                        player.deck.splice(cardIndex, 1);
                        player.hand.push(selectedCard);
                    }
                    
                    // 残ったカードをデッキの下に戻す
                    const remainingCards = lookedCards.filter(card => card !== selectedCard);
                    remainingCards.forEach(card => {
                        const index = player.deck.indexOf(card);
                        if (index > -1) {
                            player.deck.splice(index, 1);
                            player.deck.unshift(card); // デッキの下に配置
                        }
                    });
                    
                } else {
                    
                    // 見たカードをすべてデッキの下に戻す
                    lookedCards.forEach(card => {
                        const index = player.deck.indexOf(card);
                        if (index > -1) {
                            player.deck.splice(index, 1);
                            player.deck.unshift(card); // デッキの下に配置
                        }
                    });
                }
                
                return true;
            }
        },
        
        arts: [
            {
                name: '最高にハッピーです！！',
                damage: 40,
                cost: { any: 1 },
                
                canActivate: function(gameState, playerId, position) {
                    return true;
                },
                
                execute: function(gameState, playerId, position, targetPlayerId, targetPosition) {
                    
                    return {
                        damage: 40,
                        effects: []
                    };
                }
            }
        ]
    };
    
    // カード効果を登録
    if (typeof window !== 'undefined') {
        if (!window.cardEffects) {
            window.cardEffects = {};
        }
        window.cardEffects[cardEffect.id] = cardEffect;
    }
})();
