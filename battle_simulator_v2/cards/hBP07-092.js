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
      // 1枚目は必須、2・3枚目は任意
      for (let i = 0; i < 3; i++) {
        const cand = ctx.player.archive.filter((c) => c.kind === 'holomen');
        if (cand.length === 0) break;
        const optional = i >= 1;
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: `デッキに戻すアーカイブのホロメンを選択（${i + 1}/3${optional ? '・任意' : ''}）`,
          optional,
          skipLabel: 'これ以上戻さない',
        });
        if (!picked) break;
        ctx.removeFromArchive(picked);
        ctx.deckToBottom([picked]); // この後シャッフルするので位置は問わない
        ctx.log(`${picked.name} をデッキに戻した`);
      }
      ctx.shuffleDeck();
      ctx.draw(2);
    },
  },
};
