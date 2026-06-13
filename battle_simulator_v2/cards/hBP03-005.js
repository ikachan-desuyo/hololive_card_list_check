/**
 * 常闇トワ (hBP03-005) 推しホロメン・紫
 *
 * 推しスキル「デビルズヴォイス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の#歌を持つ[センターホロメンとコラボホロメン]のアーツ+20。
 *   → メインステップの能動推しスキル。コストはエンジンが処理するので run では支払わない。
 *      addTurnModifier で「#歌 を持つセンター/コラボホロメン」のアーツ+20（エンドステップで自動消滅）。
 *
 * SP推しスキル「悪魔的所業」[ホロパワー：-2][ゲームに1回]:
 *   相手のターンで、自分の〈常闇トワ〉がダウンした時に使える：
 *   相手のセンターホロメンとコラボホロメンのエール2枚ずつを好きな順でエールデッキの下に戻す。
 *   → 「自分の推しがダウンした時に使える」タイミング割り込み型のSP推しスキル。
 *     推しホロメンのダウン監視＋SP推しスキルのトリガー発火機構が未対応のため未実装（保留）。
 */
export default {
  number: 'hBP03-005',
  oshiSkill: {
    *run(ctx) {
      const ownerIdx = ctx.playerIdx;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx,
        match: (h) => {
          const top = h.stack[0];
          if (!top || !ctx.hasTag(top, '歌')) return false;
          const zone = ctx.engine._zoneOf(h);
          return zone === 'center' || zone === 'collab';
        },
        description: 'このターン、#歌 のセンター/コラボホロメンのアーツ+20',
      });
    },
  },
  // SP推しスキル「悪魔的所業」はダウン時トリガー型のため未実装（保留）
};
