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
 *   → spOshiSkill + p._extraTurnPending フラグで実装。エンジンのターン終端処理が、保留中なら
 *     同じプレイヤーで _startTurn する（ゲーム1回なので無限化しない）。
 */
export default {
  number: 'hBP07-005',
  spOshiSkill: {
    name: '時間の典獄',
    canUse(engine, ownerIdx) {
      const c = engine.state.players[ownerIdx].center;
      return !!c && c.stack[0].name === 'オーロ・クロニー' && c.stack[0].bloomLevel === '2nd';
    },
    *run(ctx) {
      const c = ctx.player.center;
      if (!c || c.stack[0].name !== 'オーロ・クロニー' || c.stack[0].bloomLevel !== '2nd') return;
      ctx.player._extraTurnPending = true; // このターンの後にもう1回自分のターンを開始する
      ctx.log('時間の典獄: このターンの後にもう1回自分のターンを開始する');
    },
  },
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
};
