/**
 * 雪花ラミィ (hBP04-004_OSR)
 * 推しホロメン・青
 * ライフ: 5
 * 
 * 推しスキル「愛してる」[ターンに1回]：
 * [ホロパワー：-1] 相手のターンで、自分のホロメンがダウンした時に使える：
 * そのホロメンに付いているファン1枚を手札に戻す。
 * 
 * SP推しスキル「ぶーん、バリバリバリバリ」[ゲームに1回]：
 * [ホロパワー：-3] 自分の〈雪花ラミィ〉1人を選ぶ。このターンの間、選んだホロメンが、
 * 相手のホロメン1人に与える特殊ダメージ+100し、選んだホロメンが相手のホロメンをダウンさせた時、
 * 自分のデッキを2枚引く。
 */

(function() {
    'use strict';
    
    const cardEffect = {
        id: 'hBP04-004_OSR',
        name: '雪花ラミィ',
        type: '推しホロメン',
        color: '青',
        life: 5,
        
        oshiSkills: [
            {
                name: '愛してる',
                cost: { holoPower: 1 },
                timing: 'reaction', // 相手ターンのリアクション
                usageLimit: 'turn', // ターンに1回
                
                canActivate: function(gameState, playerId, triggerEvent) {
                    // 相手のターンで自分のホロメンがダウンした時
                    const player = gameState.players[playerId];
                    
                    if (gameState.currentPlayer === playerId) return false; // 相手のターンのみ
                    if (triggerEvent?.type !== 'holomen_down') return false;
                    if (triggerEvent?.playerId !== playerId) return false;
                    
                    // ホロパワーチェック
                    if (player.holoPower < 1) return false;
                    
                    // ダウンしたホロメンにファンが付いているかチェック
                    const downedHolomen = triggerEvent.holomen;
                    return downedHolomen?.attachedCards?.some(card => card.card_type === 'ファン');
                },
                
                execute: function(gameState, playerId, triggerEvent) {
                    
                    const player = gameState.players[playerId];
                    const downedHolomen = triggerEvent.holomen;
                    
                    // ホロパワーを消費
                    player.holoPower -= 1;
                    
                    // 付いているファンから1枚を手札に戻す
                    const fanCards = downedHolomen.attachedCards?.filter(card => card.card_type === 'ファン') || [];
                    if (fanCards.length > 0) {
                        const selectedFan = fanCards[0]; // 最初のファンを選択
                        
                        // ホロメンから外して手札に戻す
                        const index = downedHolomen.attachedCards.indexOf(selectedFan);
                        if (index > -1) {
                            downedHolomen.attachedCards.splice(index, 1);
                            player.hand.push(selectedFan);
                        }
                    }
                    
                    return true;
                }
            },
            {
                name: 'ぶーん、バリバリバリバリ',
                cost: { holoPower: 3 },
                timing: 'active',
                usageLimit: 'game', // ゲームに1回
                
                canActivate: function(gameState, playerId) {
                    const player = gameState.players[playerId];
                    
                    // ホロパワーチェック
                    if (player.holoPower < 3) return false;
                    
                    // 自分の雪花ラミィがステージにいるかチェック
                    const hasLamy = player.stage.some(holomen => 
                        holomen && holomen.name === '雪花ラミィ'
                    );
                    
                    return hasLamy;
                },
                
                execute: function(gameState, playerId) {
                    
                    const player = gameState.players[playerId];
                    
                    // ホロパワーを消費
                    player.holoPower -= 3;
                    
                    // 雪花ラミィを選択（最初に見つかったもの）
                    const lamyPosition = player.stage.findIndex(holomen => 
                        holomen && holomen.name === '雪花ラミィ'
                    );
                    
                    if (lamyPosition !== -1) {
                        const lamy = player.stage[lamyPosition];
                        
                        // このターンの間の効果を設定
                        if (!lamy.temporaryEffects) lamy.temporaryEffects = [];
                        
                        lamy.temporaryEffects.push({
                            type: 'damage_boost',
                            amount: 100,
                            condition: 'special_damage_to_holomen',
                            duration: 'turn',
                            source: 'ぶーん、バリバリバリバリ'
                        });
                        
                        lamy.temporaryEffects.push({
                            type: 'on_down_trigger',
                            effect: 'draw_2_cards',
                            duration: 'turn',
                            source: 'ぶーん、バリバリバリバリ'
                        });
                        
                    }
                    
                    return true;
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
