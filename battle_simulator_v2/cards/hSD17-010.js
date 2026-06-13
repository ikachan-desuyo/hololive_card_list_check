/**
 * ステラ (hSD17-010) サポート・イベント
 *
 * [サポート効果]
 *   相手のDebut以外のバックホロメン1人に特殊ダメージ20を与える。
 *   自分の〈ステラ〉はターンに1回しか使えない。
 *
 * 実装メモ:
 *   - 対象: 相手のバックポジション（zone==='back'）のホロメンで、表面（top）が Debut 以外
 *     （bloomLevel !== 'Debut'）。1st/2nd 等のバックが対象。1人選んで特殊ダメージ20。
 *   - 特殊ダメージは noLifeOnDown 指定なし＝テキストに「ライフは減らない」記載が無いため、
 *     ダウン時はライフ通常どおり減る。yield* ctx.dealSpecialDamage(target, 20)。
 *   - 「自分の〈ステラ〉はターンに1回しか使えない」は、カード名「ステラ」で共有する
 *     ターン1回キーで制限する（同名の別ステラ・カードがあれば排他になる）。
 *     canUse で既使用なら不可、run 冒頭でマークする。
 *
 * 保留: なし。
 */
const ONCE_KEY = 'ステラ:ターン1回';

export default {
  number: 'hSD17-010',
  support: {
    canUse(ctx) {
      // 〈ステラ〉はこのターン未使用であること
      if (ctx.oncePerTurnUsed(ONCE_KEY)) return false;
      // 相手のDebut以外のバックホロメンが最低1人いること
      return ctx.holomems('opp',
        (e) => e.pos.zone === 'back' && e.top.bloomLevel !== 'Debut').length > 0;
    },
    *run(ctx) {
      ctx.markOncePerTurn(ONCE_KEY);
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'back' && e.top.bloomLevel !== 'Debut',
        title: '特殊ダメージ20を与える相手のDebut以外のバックホロメンを選択',
      });
      if (!target) return;
      yield* ctx.dealSpecialDamage(target, 20);
    },
  },
  ai: {
    // 相手のDebut以外のバックに確定20ダメージ。ターン1回制限を加味し中程度の価値。
    supportValue({ engine, player }) {
      const opp = engine.state.players.find((p) => p !== player);
      if (!opp) return 0;
      const targets = (opp.back || []).filter(
        (h) => h && h.stack[0] && h.stack[0].bloomLevel !== 'Debut');
      return targets.length > 0 ? 22 : 0;
    },
  },
};
