/**
 * 紫咲シオン (hBP02-042_C)
 * ホロメン・Debut・紫
 * HP: 130
 * 
 * アーツ「どうも～」: 20ダメージ [無色1]
 */

(function() {
    'use strict';
    
    const cardEffect = {
        id: 'hBP02-042_C',
        name: '紫咲シオン',
        type: 'ホロメン',
        color: '紫',
        hp: 130,
        bloomLevel: 'Debut',
        
        arts: [
            {
                name: 'どうも～',
                damage: 20,
                cost: { any: 1 },
                
                canActivate: function(gameState, playerId, position) {
                    return true; // 基本的なアーツなので常に使用可能
                },
                
                execute: function(gameState, playerId, position, targetPlayerId, targetPosition) {
                    
                    // 基本ダメージを与える
                    const damage = 20;
                    return {
                        damage: damage,
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
