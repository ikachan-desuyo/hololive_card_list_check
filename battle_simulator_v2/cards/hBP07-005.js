/**
 * オーロ・クロニー (hBP07-005) 推しホロメン・青
 *
 * 推しスキル「忘却の輪の上で」[ホロパワー：-2][ターンに1回]:
 *   自分のデッキを下から2枚引いた後、手札1枚をアーカイブする。
 *   → メインステップの能動推しスキル。コストはエンジンが処理するので run では支払わない。
 *     デッキは shift()=上 / push()=下 のため、下からの2枚は配列末尾から取り出す。
 *     引いた後は手札が増えているので、手札がある限り1枚を選んでアーカイブする。
 *
 * SP推しスキル「時間の典獄」[ホロパワー：-4][ゲームに1回]:
 *   自分のセンターホロメンが2ndの〈オーロ・クロニー〉なら、このターンの後に、もう1回自分のターンを開始する。
 *   → 追加ターン（エクストラターン）の機構がエンジン未対応のため未実装（保留）。
 */
export default {
  number: 'hBP07-005',
  oshiSkill: {
    name: '忘却の輪の上で',
    *run(ctx) {
      // デッキの下から2枚引く（末尾＝下。下から順に引くので末尾を1枚ずつ取り、その順で手札へ）
      const drawn = [];
      for (let i = 0; i < 2 && ctx.player.deck.length > 0; i++) {
        const c = ctx.player.deck.pop();
        ctx.player.hand.push(c);
        drawn.push(c);
      }
      if (drawn.length > 0) {
        ctx.log(`${ctx.player.name}: デッキの下から${drawn.length}枚ドロー（${drawn.map((c) => c.name).join(' / ')}）`);
      }
      // 手札1枚をアーカイブする（手札がある場合のみ。「まで」ではないので必須）
      if (ctx.player.hand.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: ctx.player.hand,
          title: 'アーカイブする手札1枚を選択',
        });
        if (picked) {
          ctx.removeFromHand(picked);
          ctx.player.archive.push(picked);
          ctx.log(`${ctx.player.name}: ${picked.name} をアーカイブ`);
        }
      }
    },
  },
  // SP推しスキル「時間の典獄」は追加ターン機構が未対応のため未実装（保留）
};
