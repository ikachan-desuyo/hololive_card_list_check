/**
 * みっころね24 (hBP02-084_02_U)
 * サポート・イベント・LIMITED
 * 
 * サポート効果：
 * 自分のデッキを2枚引き、サイコロを1回振る：
 * 3か5か6の時、自分のデッキから、Debutホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 * 2か4の時、自分のデッキを1枚引く。
 * LIMITED：ターンに１枚しか使えない。
 */

(function() {
    'use strict';
    
    const cardEffect = {
        id: 'hBP02-084_02_U',
        name: 'みっころね24',
        type: 'サポート・イベント・LIMITED',
        
        supportEffect: {
            canActivate: function(gameState, playerId) {
                const player = gameState.players[playerId];
                return !player.limitedUsedThisTurn && player.deck && player.deck.length > 0;
            },
            
            execute: async function(gameState, playerId) {
                
                const player = gameState.players[playerId];
                
                // LIMITEDフラグを設定
                player.limitedUsedThisTurn = true;
                
                // デッキから2枚引く
                let drawnCards = 0;
                for (let i = 0; i < 2 && player.deck.length > 0; i++) {
                    const card = player.deck.pop();
                    if (card) {
                        player.hand.push(card);
                        drawnCards++;
                    }
                }
                
                
                // サイコロを振る（1-6）
                const diceRoll = Math.floor(Math.random() * 6) + 1;
                
                if (diceRoll === 3 || diceRoll === 5 || diceRoll === 6) {
                    // Debutホロメンをサーチ
                    
                    const debutHolomen = player.deck.filter(card => 
                        card.card_type === 'ホロメン' && 
                        card.bloom_level === 'Debut'
                    );
                    
                    if (debutHolomen.length > 0) {
                        const selectedCard = debutHolomen[0];
                        
                        // デッキからカードを除去
                        const cardIndex = player.deck.indexOf(selectedCard);
                        if (cardIndex > -1) {
                            player.deck.splice(cardIndex, 1);
                            player.hand.push(selectedCard);
                        }
                        
                        // デッキをシャッフル
                        this.shuffleDeck(player.deck);
                    } else {
                    }
                    
                } else if (diceRoll === 2 || diceRoll === 4) {
                    // 1枚追加ドロー
                    
                    if (player.deck.length > 0) {
                        const card = player.deck.pop();
                        if (card) {
                            player.hand.push(card);
                        }
                    }
                } else {
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
