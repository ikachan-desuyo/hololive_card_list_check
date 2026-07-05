/**
 * 不知火フレア (hSD07-007) 黄・1st・HP150（#JP #3期生 #ハーフエルフ）
 * ブルームエフェクト「また一つ成長した私を」:
 *   [バックポジション限定]自分の残りHP70以下のコラボホロメンとこのホロメンを交代できる。
 *   → このホロメン（ブルームした側）がバックにいる場合のみ。残りHP（実効HP-ダメージ）が70以下の
 *     コラボホロメンと位置を入れ替える（このホロメンがコラボへ、対象がバックへ）。
 * アーツ「キミに見てほしいな！」(40): テキスト効果なし（素のダメージのみ）。
 */
export default {
  number: 'hSD07-007',
  bloomEffect: {
    name: 'また一つ成長した私を',
    *run(ctx) {
      const p = ctx.player;
      const self = ctx.sourceHolomem;
      // [バックポジション限定] このホロメンがバックにいる時のみ
      const backIndex = p.back.indexOf(self);
      if (backIndex === -1) return;
      // 残りHP70以下のコラボホロメンが対象（コラボ枠は1人）
      const collab = p.collab;
      if (!collab) return;
      const remaining = ctx.engine.effectiveHp(collab) - (collab.damage || 0);
      if (remaining > 70) return;
      const ok = yield ctx.confirm(
        `コラボの ${collab.stack[0].name}（残りHP${remaining}）とこのホロメンを交代しますか？`,
      );
      if (!ok) return;
      // 位置を入れ替える: このホロメン→コラボ、対象→バック
      p.collab = self;
      p.back[backIndex] = collab;
      ctx.log(`${self.stack[0].name} がコラボに移動（${collab.stack[0].name} と交代）`);
    },
  },
  // アーツ「キミに見てほしいな！」はテキスト効果なし（素の40ダメージ）。
};
