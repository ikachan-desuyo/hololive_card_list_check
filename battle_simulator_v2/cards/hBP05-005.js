/**
 * 癒月ちょこ (hBP05-005) 推しホロメン 紫 ライフ5
 *
 * 推しスキル「ちょこまみれになっちゃえっ！」[ホロパワー：-1][ターンに1回]:
 *   自分のデッキから、#食べ物を持つイベント1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → oshiSkill（能動）。デッキに#食べ物イベントが1枚以上ある時のみ使える。
 *     見つけて手札に加えた後、必ずデッキをシャッフルする。
 *     コスト（ホロパワー-1）と「ターンに1回」制限はエンジンが処理する。
 *
 * SP推しスキル「ちょこっとクッキング」[ホロパワー：-2][ゲームに1回]:
 *   自分のアーカイブの#食べ物を持つイベント1～4枚を手札に戻す。
 *   その後、このターンの間、自分のステージの#料理を持つホロメン全員のアーツ+40。
 *   → spOshiSkill。「1～4枚」=最低1枚・最大4枚。アーカイブに#食べ物イベントが1枚以上ある時のみ使える。
 *     アーツ+40 は artsPlus ターン修正（match で自分のステージ上の#料理ホロメンに動的適用）。
 *     アーツ強化は手札に戻す処理の「その後」なので、戻し終わってから付与する。ターン終了で自動消滅。
 *
 * 保留: なし
 */
const isFoodEvent = (c) =>
  c.kind === 'support' && c.supportType === 'イベント' && (c.tags || []).includes('食べ物');

export default {
  number: 'hBP05-005',

  // 推しスキル: デッキから#食べ物イベント1枚を公開し手札に加え、デッキをシャッフル
  oshiSkill: {
    name: 'ちょこまみれになっちゃえっ！',
    // デッキに#食べ物イベントが無くても宣言できる（Q441: 使用可・シャッフルのみで終了）。AIは空振りを避ける。
    aiSkip(engine, ownerIdx) {
      return !engine.state.players[ownerIdx].deck.some(isFoodEvent);
    },
    *run(ctx) {
      const events = ctx.deckCards(isFoodEvent);
      if (events.length === 0) {
        ctx.log('デッキに#食べ物イベントがない');
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: events,
        title: '手札に加える#食べ物イベントをデッキから選択',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.flashReveal(picked);
        ctx.addToHand(picked);
      }
      // そしてデッキをシャッフルする（カードを加えなかった場合でもテキスト通りシャッフルする）
      ctx.shuffleDeck();
    },
  },

  // SP推しスキル: アーカイブの#食べ物イベント1～4枚を手札に戻し、その後#料理ホロメン全員のアーツ+40
  spOshiSkill: {
    name: 'ちょこっとクッキング',
    // アーカイブに#食べ物イベントが無くても宣言できる（Q442: 使用可。#料理がいれば+40は適用される＝Q443）。
    // AIは空振り回避のため現状どおり「アーカイブに#食べ物が無ければ選ばない」（挙動維持）。
    aiSkip(engine, ownerIdx) {
      return !engine.state.players[ownerIdx].archive.some(isFoodEvent);
    },
    *run(ctx) {
      // アーカイブの#食べ物イベント1～4枚を手札に戻す（最低1枚・最大4枚）。一括選択
      const events = ctx.player.archive.filter(isFoodEvent);
      const picked = yield ctx.chooseCards({
        cards: events,
        min: 1,
        max: 4,
        title: '手札に戻す#食べ物イベントをアーカイブから選択（1～4枚）',
      });
      for (const c of picked) {
        ctx.removeFromArchive(c);
        ctx.addToHand(c);
      }
      // その後、このターンの間、自分のステージの#料理ホロメン全員のアーツ+40
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 40,
        ownerIdx: ctx.playerIdx,
        match: (h) => {
          const p = ctx.engine.state.players[ctx.playerIdx];
          // 自分のステージ上の#料理を持つホロメンであること
          const onStage = ctx.engine._stageHolomems(p).includes(h);
          return onStage && (h.stack[0].tags || []).includes('料理');
        },
        description: 'このターンの間、自分のステージの#料理ホロメン全員のアーツ+40',
      });
    },
  },
};
