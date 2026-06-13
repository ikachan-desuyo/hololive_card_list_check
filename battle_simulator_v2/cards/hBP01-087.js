/**
 * こぼ・かなえる (hBP01-087) 青・2nd・HP200（#ID #ID3期生）
 *
 * アーツ「雨のマントラ」(40+, 特攻 紫+50):
 *   このホロメンのエール1枚をアーカイブできる：相手のバックホロメン全員に特殊ダメージ20を与える
 *   （ダウンしても相手のライフは減らない）。
 *
 * アーツ「波のマントラ」(40+, 特攻 紫+50):
 *   このホロメンのエール2枚をアーカイブできる：相手のセンターホロメンに、相手のバックホロメン全員が
 *   受けているダメージの合計数と同じ数値の特殊ダメージを与える。
 *
 * いずれもコスト（エールのアーカイブ）は「できる」=任意。支払わなければ追加効果は発生しない。
 */
export default {
  number: 'hBP01-087',
  arts: {
    '雨のマントラ': {
      *run(ctx) {
        const cheers = ctx.sourceHolomem?.cheers || [];
        if (cheers.length < 1) return;
        const ok = yield ctx.confirm(
          'このホロメンのエール1枚をアーカイブして、相手のバックホロメン全員に特殊ダメージ20を与えますか？'
        );
        if (!ok) return;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: 'アーカイブするエールを選択',
        });
        if (!picked) return;
        ctx.archiveCheer(ctx.sourceHolomem, picked);
        const backs = ctx.holomems('opponent', (e) => e.pos.zone === 'back');
        for (const e of backs) {
          yield* ctx.dealSpecialDamage(e, 20, { noLifeOnDown: true });
        }
      },
    },
    '波のマントラ': {
      *run(ctx) {
        const cheers = ctx.sourceHolomem?.cheers || [];
        if (cheers.length < 2) return;
        const center = ctx.holomems('opponent', (e) => e.pos.zone === 'center')[0];
        if (!center) return;
        const ok = yield ctx.confirm(
          'このホロメンのエール2枚をアーカイブして、相手のセンターに「相手バック全員の被ダメージ合計」の特殊ダメージを与えますか？'
        );
        if (!ok) return;
        // エール2枚を順に選んでアーカイブ
        let pool = ctx.sourceHolomem.cheers.slice();
        for (let i = 0; i < 2; i++) {
          const picked = yield ctx.chooseCard({
            cards: pool,
            title: `アーカイブするエールを選択（${i + 1}/2）`,
          });
          if (!picked) return; // 2枚支払えなければ効果は発生しない（コスト未充足）
          ctx.archiveCheer(ctx.sourceHolomem, picked);
          pool = pool.filter((c) => c !== picked);
        }
        const backs = ctx.holomems('opponent', (e) => e.pos.zone === 'back');
        const total = backs.reduce((s, e) => s + (e.holomem.damage || 0), 0);
        if (total > 0) yield* ctx.dealSpecialDamage(center, total, {});
      },
    },
  },
};
