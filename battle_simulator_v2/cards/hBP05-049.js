/**
 * こぼ・かなえる (hBP05-049) 青・2nd・HP200（#ID3期生）
 * アーツ「雨跡をなぞる」(60): 相手のバックホロメン全員のHPが合計80以上減っているなら、
 *   自分のアーカイブの青エール1枚を自分の〈こぼ・かなえる〉に送れる。
 * アーツ「残響する雨音」(120): このホロメンのエール2枚をアーカイブできる：
 *   相手のバックホロメン全員に特殊ダメージ30を与える。ただし、ダウンしても相手のライフは減らない。
 */
export default {
  number: 'hBP05-049',
  arts: {
    '雨跡をなぞる': {
      *run(ctx) {
        const totalDmg = ctx.holomems('opp', (e) => e.pos.zone === 'back')
          .reduce((s, e) => s + e.holomem.damage, 0);
        if (totalDmg < 80) return;
        const blues = ctx.player.archive.filter((c) => c.kind === 'cheer' && c.color === '青');
        const kobos = ctx.holomems('self', (e) => e.top.name === 'こぼ・かなえる');
        if (blues.length === 0 || kobos.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: blues, title: '送る青エールを選択（アーカイブ・任意）', optional: true, skipLabel: '送らない',
        });
        if (!picked) return;
        const target = yield ctx.chooseHolomem({
          side: 'self', filter: (e) => e.top.name === 'こぼ・かなえる', title: 'エールを送る〈こぼ・かなえる〉を選択',
        });
        if (target) { ctx.removeFromArchive(picked); ctx.attachCheer(picked, target.holomem); }
      },
    },
    '残響する雨音': {
      *run(ctx) {
        if (ctx.sourceHolomem.cheers.length < 2) return;
        const ok = yield ctx.confirm('エール2枚をアーカイブして相手バック全員に特殊ダメージ30を与えますか？');
        if (!ok) return;
        for (let i = 0; i < 2; i++) {
          const cheer = yield ctx.chooseCard({
            cards: [...ctx.sourceHolomem.cheers], title: `コスト: アーカイブするエールを選択（${i + 1}/2）`,
          });
          if (!cheer) return;
          ctx.archiveCheer(ctx.sourceHolomem, cheer);
        }
        for (const e of ctx.holomems('opp', (x) => x.pos.zone === 'back')) {
          yield* ctx.dealSpecialDamage(e, 30, { noLifeOnDown: true });
        }
      },
    },
  },
};
