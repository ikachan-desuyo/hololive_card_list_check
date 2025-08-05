/**
 * カスタムパソコン (hBP02-076_C)
 * サポート・アイテム
 * 
 * サポート効果：
 * 自分の手札のDebutホロメン1枚を公開し、デッキの下に戻す。
 * 自分のデッキから、戻したホロメンと同じカード名のBuzz以外の1stホロメン1枚を公開し、手札に加える。
 * そしてデッキをシャッフルする。
 */

(function() {
    'use strict';
    
    const cardEffect = {
        id: 'hBP02-076_C',
        name: 'カスタムパソコン',
        type: 'サポート・アイテム',
        
        supportEffect: {
            canActivate: function(gameState, playerId) {
                const player = gameState.players[playerId];
                
                // 手札にDebutホロメンがいるかチェック
                const hasDebutInHand = player.hand.some(card => 
                    card.card_type === 'ホロメン' && 
                    card.bloom_level === 'Debut'
                );
                
                return hasDebutInHand && player.deck && player.deck.length > 0;
            },
            
            execute: async function(gameState, playerId) {
                
                const player = gameState.players[playerId];
                
                // 手札からDebutホロメンを選択
                const debutCards = player.hand.filter(card => 
                    card.card_type === 'ホロメン' && 
                    card.bloom_level === 'Debut'
                );
                
                if (debutCards.length === 0) {
                    return false;
                }
                
                // 最初のDebutカードを選択（実際のゲームでは選択UI）
                const selectedDebut = debutCards[0];
                
                // 手札からDebutを除去してデッキの下に戻す
                const handIndex = player.hand.indexOf(selectedDebut);
                if (handIndex > -1) {
                    player.hand.splice(handIndex, 1);
                    player.deck.unshift(selectedDebut); // デッキの下に配置
                }
                
                // デッキから同じ名前のBuzz以外の1stホロメンを探す
                const targetName = selectedDebut.name;
                const firstCards = player.deck.filter(card => 
                    card.card_type === 'ホロメン' && 
                    card.bloom_level === '1st' &&
                    card.name === targetName &&
                    !card.rarity?.includes('Buzz') // Buzzでない
                );
                
                if (firstCards.length > 0) {
                    const selectedFirst = firstCards[0];
                    
                    // デッキからカードを除去して手札に加える
                    const deckIndex = player.deck.indexOf(selectedFirst);
                    if (deckIndex > -1) {
                        player.deck.splice(deckIndex, 1);
                        player.hand.push(selectedFirst);
                    }
                } else {
                }
                
                // デッキをシャッフル
                this.shuffleDeck(player.deck);
                
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
