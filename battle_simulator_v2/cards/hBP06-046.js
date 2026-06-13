/**
 * 鷹嶺ルイ (hBP06-046) 赤・2nd・HP200（#秘密結社holoX）
 * キーワード/ギフト「間違っているぞ！」:
 *   このゲーム中に、自分のSP推しスキル「ホークアイ」を使っていたなら、このホロメンのアーツ+20。
 *   → SP推しスキル「ホークアイ」は推し〈鷹嶺ルイ〉のSPスキル。プレイヤーは推し1枚なので
 *     「SPスキル使用済み(usedSpOshiSkillThisGame) かつ 推しが鷹嶺ルイ」で判定。
 *   → アーツへの常時+20なので arts.<名>.dmgBonus で実装（このカードのアーツは1種）。
 * アーツ「永久不滅の絆」(120, 特攻 紫+50):
 *   自分の推しホロメンが〈鷹嶺ルイ〉なら、自分の手札2枚をアーカイブできる：
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ50を与える。
 */
export default {
  number: 'hBP06-046',
  arts: {
    '永久不滅の絆': {
      // ギフト「間違っているぞ！」: SP推しスキル「ホークアイ」使用済みなら +20
      dmgBonus(ctx) {
        return (ctx.player.usedSpOshiSkillThisGame && ctx.player.oshi?.name === '鷹嶺ルイ') ? 20 : 0;
      },
      *run(ctx) {
        // 自分の推しホロメンが〈鷹嶺ルイ〉でないと発動できない
        if (ctx.player.oshi?.name !== '鷹嶺ルイ') return;
        if (ctx.player.hand.length < 2) return; // コスト（手札2枚）を払えない
        const ok = yield ctx.confirm('手札2枚をアーカイブして特殊ダメージ50を与えますか？');
        if (!ok) return;
        for (let i = 0; i < 2; i++) {
          const card = yield ctx.chooseCard({
            cards: [...ctx.player.hand],
            title: `コスト: アーカイブする手札を選択（${i + 1}/2）`,
          });
          if (!card) return;
          ctx.removeFromHand(card);
          ctx.player.archive.push(card);
        }
        ctx.log('手札2枚をアーカイブした');
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: '特殊ダメージ50を与える相手ホロメンを選択（センターかコラボ）',
        });
        if (target) ctx.dealSpecialDamage(target, 50);
      },
    },
  },
};
