/**
 * 破滅の呪文 (hBP08-095) サポート・イベント・LIMITED
 *
 * このカードは、自分のステージのホロメン全員が #EN を持つホロメンで、
 * 自分のライフが3以下でなければ使えない。
 *   → support.canUse: 自分ステージ全員が #EN タグ持ち（ctx.hasTag(top,'EN')）
 *     かつ ctx.player.life.length <= 3。
 *
 * お互いのセンターホロメンとコラボホロメンに特殊ダメージ50を与える。
 * ただし、この能力でダウンしてもライフは減らない。
 *   → 自分・相手の両方のセンター/コラボへ特殊ダメージ50（条件一致の全員。選択不要）。
 *     opts.noLifeOnDown:true で「ダウンしてもライフは減らない」を表現。
 *
 * LIMITED: ターンに1枚しか使えない（エンジンが c.limited で制御。カード側不要）。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-095',

  support: {
    canUse(ctx) {
      const stage = ctx.holomems('self');
      if (stage.length === 0) return false;
      // ステージのホロメン全員が #EN を持つ
      const allEN = stage.every((e) => ctx.hasTag(e.top, 'EN'));
      // 自分のライフが3以下
      return allEN && ctx.player.life.length <= 3;
    },
    *run(ctx) {
      // 対象: お互いのセンターホロメンとコラボホロメン（条件一致の全員）
      const isCenterOrCollab = (e) => e.pos.zone === 'center' || e.pos.zone === 'collab';
      // 相手側 → 自分側の順に処理（自分のダウンでもライフは減らない）
      const targets = [
        ...ctx.holomems('opp', isCenterOrCollab),
        ...ctx.holomems('self', isCenterOrCollab),
      ];
      for (const t of targets) {
        yield* ctx.dealSpecialDamage(t, 50, { noLifeOnDown: true });
      }
    },
  },
};
