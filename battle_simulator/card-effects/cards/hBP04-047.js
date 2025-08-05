/**
 * 雪花ラミィ (hBP04-047_R)
 * ホロメン・1st・青
 * HP: 120
 * 
 * コラボエフェクト「fleur」：
 * 自分の〈雪民〉が付いている〈雪花ラミィ〉がいる時、相手のホロメン1人に特殊ダメージ20を与える。
 * ただし、ダウンしても相手のライフは減らない。
 * 
 * アーツ「雪が煌く花束」: 50ダメージ [青1・無色1]
 */

(function() {
    'use strict';
    
    const cardEffect = {
        id: 'hBP04-047_R',
        name: '雪花ラミィ',
        type: 'ホロメン',
        color: '青',
        hp: 120,
        bloomLevel: '1st',
        
        collabEffect: {
            name: 'fleur',
            
            canActivate: function(gameState, playerId) {
                const player = gameState.players[playerId];
                
                // 雪民が付いている雪花ラミィがいるかチェック
                const hasLamyWithYukimin = player.stage.some(holomen => {
                    if (!holomen || !holomen.name || !holomen.name.includes('雪花ラミィ')) {
                        return false;
                    }
                    return holomen.attachedCards && holomen.attachedCards.some(attached => 
                        attached.name && attached.name.includes('雪民')
                    );
                });
                
                // 相手にホロメンがいるかチェック
                const opponentPlayerId = playerId === 1 ? 2 : 1;
                const opponentPlayer = gameState.players[opponentPlayerId];
                const hasOpponentHolomen = opponentPlayer.stage.some(holomen => 
                    holomen && holomen.name
                );
                
                return hasLamyWithYukimin && hasOpponentHolomen;
            },
            
            execute: async function(gameState, playerId) {
                
                const player = gameState.players[playerId];
                const opponentPlayerId = playerId === 1 ? 2 : 1;
                const opponentPlayer = gameState.players[opponentPlayerId];
                
                // 雪民が付いている雪花ラミィがいるかチェック
                const lamyWithYukimin = player.stage.find(holomen => {
                    if (!holomen || !holomen.name || !holomen.name.includes('雪花ラミィ')) {
                        return false;
                    }
                    return holomen.attachedCards && holomen.attachedCards.some(attached => 
                        attached.name && attached.name.includes('雪民')
                    );
                });
                
                if (!lamyWithYukimin) {
                    return false;
                }
                
                // 相手のホロメンを取得
                const opponentHolomens = opponentPlayer.stage.filter(holomen => 
                    holomen && holomen.name
                );
                
                if (opponentHolomens.length === 0) {
                    return false;
                }
                
                // 最初のホロメンをターゲットとする（実際のゲームでは選択）
                const targetHolomen = opponentHolomens[0];
                
                // 特殊ダメージを与える（ライフは減らない）
                const damage = 20;
                if (!targetHolomen.damage) targetHolomen.damage = 0;
                targetHolomen.damage += damage;
                
                
                // HPチェック（ダウンしてもライフは減らない）
                if (targetHolomen.damage >= targetHolomen.hp) {
                    // ダウン処理（ライフを減らさない特殊処理）
                    targetHolomen.isDown = true;
                }
                
                
                return true;
            }
        },
        
        arts: [
            {
                name: '雪が煌く花束',
                damage: 50,
                cost: { blue: 1, any: 1 },
                
                canActivate: function(gameState, playerId, position) {
                    return true;
                },
                
                execute: function(gameState, playerId, position, targetPlayerId, targetPosition) {
                    
                    return {
                        damage: 50,
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
