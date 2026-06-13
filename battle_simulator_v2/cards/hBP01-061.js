/**
 * 鷹嶺ルイ 2nd (hBP01-061) 赤・2nd・HP190
 * ブルームエフェクト「組織の司令塔」:
 *   自分のアーカイブの#秘密結社holoXを持つホロメン1～2枚を手札に戻せる。
 *   → アーカイブ内のタグ付きホロメンを最大2枚選んで手札へ（「戻せる」=任意・0可）。
 * アーツ「ホークレイヴ」(60, 特攻: 相手が黄なら+50):
 *   自分の手札1～5枚をアーカイブできる：
 *   相手のセンターホロメンかコラボホロメンどちらかに、アーカイブしたカード1枚につき特殊ダメージ20を与える。
 *   → 手札を1～5枚アーカイブ（「できる」=任意、最低1枚払えば発動）。枚数×20の特殊ダメージ。
 */
export default {
  number: 'hBP01-061',

  bloomEffect: {
    name: '組織の司令塔',
    *run(ctx) {
      // 1枚ずつ最大2枚まで、アーカイブの#秘密結社holoXホロメンを手札へ戻す（任意・0可）
      for (let i = 0; i < 2; i++) {
        const cand = ctx.player.archive.filter(
          (c) => c.kind === 'holomen' && ctx.hasTag(c, '秘密結社holoX'));
        if (cand.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: `アーカイブの#秘密結社holoXホロメンを手札に戻す（${i + 1}/2・任意）`,
          optional: true,
          skipLabel: 'これ以上戻さない',
        });
        if (!picked) break;
        ctx.removeFromArchive(picked);
        ctx.addToHand(picked, { reveal: true });
        ctx.log(`${picked.name} を手札に戻した`);
      }
    },
  },

  arts: {
    'ホークレイヴ': {
      *run(ctx) {
        if (ctx.player.hand.length === 0) return; // コスト（手札1枚以上）を払えない
        const ok = yield ctx.confirm(
          '手札を1～5枚アーカイブして、アーカイブ枚数×特殊ダメージ20を与えますか？');
        if (!ok) return;
        const max = Math.min(5, ctx.player.hand.length);
        let count = 0;
        for (let i = 0; i < max; i++) {
          const card = yield ctx.chooseCard({
            cards: [...ctx.player.hand],
            title: `コスト: アーカイブする手札を選択（${i + 1}/${max}）` +
              (i === 0 ? '' : '・これ以上アーカイブしないなら見送り'),
            optional: i > 0, // 最初の1枚は必須（「1～5枚」の最小は1）
            skipLabel: 'これ以上アーカイブしない',
          });
          if (!card) break;
          ctx.removeFromHand(card);
          ctx.player.archive.push(card);
          count++;
        }
        if (count === 0) return;
        ctx.log(`手札${count}枚をアーカイブした`);
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: `特殊ダメージ${count * 20}を与える相手ホロメンを選択（センターかコラボ）`,
        });
        if (target) ctx.dealSpecialDamage(target, count * 20);
      },
    },
  },
};
