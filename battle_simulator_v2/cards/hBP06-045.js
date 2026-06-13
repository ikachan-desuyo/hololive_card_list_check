/**
 * ハコス・ベールズ (hBP06-045) 赤・2nd・HP200（#EN #Promise #ケモミミ）
 *
 * アーツ「カオスリローデッド」(70+):
 *   自分のアーカイブのホロメン1～5枚を好きな順でデッキの下に戻す。
 *   戻したホロメン1枚につき、このアーツ+10。
 *   → run で 1～5枚を選ばせ、好きな順でデッキ下へ。addArtBonus(枚数×10)。
 *     「1～5枚」かつ「戻したホロメン1枚につき」なので最低1枚（0枚は不可、5枚上限）。
 *     アーカイブのホロメンが無ければ何もしない（その場合ボーナス0）。
 *
 * アーツ「💥¡¡SSꓵHƆSꓶƎԀԀOꓷ💥」(100):
 *   このゲーム中に、自分のSP推しスキル「🎲ƎNOZ N∩Ⅎ ƎH⊥ O⊥ ƎWOϽ˥ƎM🎲」を使っていたなら、
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ100を与える。
 *   → SP推しスキルは1プレイヤーにつき1種なので usedSpOshiSkillThisGame で判定。
 */
export default {
  number: 'hBP06-045',
  arts: {
    'カオスリローデッド': {
      *run(ctx) {
        const holomems = ctx.player.archive.filter((c) => c.kind === 'holomen');
        if (holomems.length === 0) return; // アーカイブにホロメンが無ければ何もしない
        const picked = [];
        const max = Math.min(5, holomems.length); // 1～5枚
        for (let i = 0; i < max; i++) {
          const remaining = holomems.filter((c) => !picked.includes(c));
          const choice = yield ctx.chooseCard({
            cards: remaining,
            title: `デッキの下に戻すアーカイブのホロメンを選択（${picked.length + 1}枚目 / 最大${max}枚, 1枚目以降は任意）`,
            optional: picked.length >= 1, // 最低1枚は戻す（0枚不可）
            skipLabel: 'これ以上戻さない',
          });
          if (!choice) break;
          picked.push(choice);
        }
        if (picked.length === 0) return;
        // 好きな順でデッキの下に戻す
        const ordered = yield* ctx.orderCardsFlow(picked, 'デッキの下に戻す順番');
        for (const c of ordered) ctx.removeFromArchive(c);
        ctx.deckToBottom(ordered);
        ctx.addArtBonus(picked.length * 10, `ホロメン${picked.length}枚をデッキ下へ`);
      },
    },
    '💥¡¡SSꓵHƆSꓶƎԀԀOꓷ💥': {
      *run(ctx) {
        // このゲーム中にSP推しスキルを使っていたなら特殊ダメージ100
        if (!ctx.player.usedSpOshiSkillThisGame) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: '特殊ダメージ100を与える相手ホロメンを選択（センターかコラボ）',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 100);
      },
    },
  },
};
