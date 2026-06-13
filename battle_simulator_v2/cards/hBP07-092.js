/**
 * アーカイブパソコン (hBP07-092) サポート・アイテム・LIMITED
 *
 * [サポート効果] 自分のアーカイブのホロメン1～3枚をデッキに戻してシャッフルする。
 *   その後、自分のデッキを2枚引く。
 * LIMITED：ターンに1枚しか使えない。
 *
 * 実装方針:
 *   - アーカイブのホロメン（kind:'holomen'）を1～3枚選んでデッキに戻す。
 *     「1～3枚」なので最低1枚は戻す必要がある（アーカイブにホロメンが無ければ使えない）。
 *   - 戻した後デッキをシャッフルし、2枚引く。
 *   - LIMITED（ターン1枚）はエンジン側で処理されるため canUse には書かない。
 */
export default {
  number: 'hBP07-092',
  support: {
    canUse(ctx) {
      // アーカイブにホロメンが1枚以上ないと「1～3枚をデッキに戻す」を満たせない
      return ctx.player.archive.some((c) => c.kind === 'holomen');
    },
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
