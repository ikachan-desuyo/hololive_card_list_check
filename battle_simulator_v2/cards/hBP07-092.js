/**
 * アーカイブパソコン (hBP07-092) サポート・アイテム・LIMITED
 *
 * [サポート効果] 自分のアーカイブのホロメン1～3枚をデッキに戻してシャッフルする。
 *   その後、自分のデッキを2枚引く。
 * LIMITED：ターンに1枚しか使えない。
 *
 * 実装方針:
 *   - アーカイブのホロメン（kind:'holomen'）を1～3枚選んでデッキに戻す（あれば最低1枚）。
 *     アーカイブにホロメンが無くても使用可（その後2枚引く＝必ず状態変化。Q606/Q607）。
 *   - 戻した後デッキをシャッフルし、2枚引く。
 *   - LIMITED（ターン1枚）はエンジン側で処理されるため canUse には書かない。
 */
export default {
  number: 'hBP07-092',
  support: {
    // アーカイブにホロメンが無くても使用可（その後デッキを2枚引く＝必ず状態が変化する。Q606/Q607）。
    // 戻すホロメンが無ければ0枚戻し、そのまま2枚引く。
    *run(ctx) {
      // アーカイブのホロメン1～3枚をデッキに戻す（あれば最低1枚、最大3枚）。一括選択
      const cand = ctx.player.archive.filter((c) => c.kind === 'holomen');
      const picked = yield ctx.chooseCards({
        cards: cand,
        min: 1,
        max: 3,
        title: 'デッキに戻すアーカイブのホロメンを選択（1～3枚）',
      });
      for (const c of picked) {
        ctx.removeFromArchive(c);
        ctx.deckToBottom([c]); // この後シャッフルするので位置は問わない
        ctx.log(`${c.name} をデッキに戻した`);
      }
      ctx.shuffleDeck();
      ctx.draw(2);
    },
  },
};
