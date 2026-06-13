/**
 * モココ・アビスガード (hBP08-039) 赤・ホロメン・2nd・HP200（#EN #Advent #ケモミミ）
 *
 * ブルームエフェクト「深淵からの信頼」:
 *   自分のステージに青エールが6枚以上あるなら、自分のお休みしている〈フワワ・アビスガード〉1人をアクティブにする。
 *   → bloomEffect.run: 自分のステージ全体の青エール枚数を数え、6枚以上なら
 *     お休み中(rested)の〈フワワ・アビスガード〉を1人選んで setActive する（候補が無ければ何もしない）。
 *     「1人」かつ任意性の記載なし（条件を満たせば対象がいる限り実行）だが、対象選択のため強制1人選択にする。
 *
 * アーツ「もこもこバウンティハンター」(90+):
 *   このホロメンの青エール1枚につき、このアーツ+20。
 *   その後、このホロメンの青エールを好きな枚数選び、自分の〈フワワ・アビスガード〉1人に付け替える。
 *   → dmgBonus(ctx): このホロメン(sourceHolomem)に付いた青エール枚数 × 20。
 *     run: ダメージ確定後（解決時）に、このホロメンの青エールを1枚ずつ「好きな枚数」（0枚可）選び、
 *     付け替え先の〈フワワ・アビスガード〉1人を選んで moveCheer する。
 *     「自分の〈フワワ・アビスガード〉1人に」=付け替え先は1人に固定（最初に1人選び、選んだ枚数すべてそこへ）。
 *     付け替え先が居なければ付け替え不可（ダメージ加算のみ）。特攻[紫+50]はエンジンが基本ダメージで処理する。
 *
 * 保留: なし（ブルームエフェクト・アーツとも全文実装）。
 */
const FUWAWA = 'フワワ・アビスガード';

export default {
  number: 'hBP08-039',

  bloomEffect: {
    name: '深淵からの信頼',
    *run(ctx) {
      // 自分のステージ全体の青エール枚数
      let blue = 0;
      for (const e of ctx.holomems('self')) {
        blue += (e.holomem.cheers || []).filter((c) => c.color === '青').length;
      }
      if (blue < 6) {
        ctx.log('深淵からの信頼: 青エールが6枚未満のため発動しない');
        return;
      }
      // お休み中の〈フワワ・アビスガード〉1人をアクティブに
      const rested = ctx.holomems('self', (e) => ctx.nameIs(e.top, FUWAWA) && e.holomem.rested);
      if (rested.length === 0) {
        ctx.log('深淵からの信頼: お休み中の〈フワワ・アビスガード〉がいない');
        return;
      }
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.nameIs(e.top, FUWAWA) && e.holomem.rested,
        title: 'アクティブにするお休み中の〈フワワ・アビスガード〉を選択',
      });
      if (!entry) return;
      ctx.setActive(entry.holomem);
    },
  },

  arts: {
    'もこもこバウンティハンター': {
      // このホロメンの青エール1枚につき +20
      dmgBonus(ctx) {
        const blue = (ctx.sourceHolomem?.cheers || []).filter((c) => c.color === '青').length;
        return blue * 20;
      },
      *run(ctx) {
        const self = ctx.sourceHolomem;
        if (!self) return;
        // このホロメンの青エールが無ければ付け替え不可
        if (!(self.cheers || []).some((c) => c.color === '青')) return;
        // 付け替え先の〈フワワ・アビスガード〉1人（自分自身が〈フワワ〉でない前提だが名前で判定）
        const targets = ctx.holomems('self', (e) => ctx.nameIs(e.top, FUWAWA) && e.holomem !== self);
        if (targets.length === 0) return;

        const ok = yield ctx.confirm('青エールを〈フワワ・アビスガード〉に付け替えますか？');
        if (!ok) return;

        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.nameIs(e.top, FUWAWA) && e.holomem !== self,
          title: '青エールの付け替え先〈フワワ・アビスガード〉を選択',
        });
        if (!target) return;

        // 好きな枚数（このホロメンの青エールの数まで・0枚で打ち切り可）を1枚ずつ付け替える
        while (true) {
          const blueCheers = (self.cheers || []).filter((c) => c.color === '青');
          if (blueCheers.length === 0) break;
          const picked = yield ctx.chooseCard({
            cards: blueCheers,
            title: `付け替える青エールを選択（残り${blueCheers.length}枚・任意）`,
            optional: true,
            skipLabel: 'ここまでにする',
          });
          if (!picked) break;
          ctx.moveCheer(picked, self, target.holomem);
        }
      },
    },
  },
};
