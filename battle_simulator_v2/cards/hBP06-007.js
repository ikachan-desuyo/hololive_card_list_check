/**
 * ロボ子さん（推しホロメン hBP06-007）紫
 *
 * 推しスキル「PONじゃないもん！！」[ホロパワー：-2][ターンに1回]:
 *   相手のターンで、自分の〈ロボ子さん〉がダウンした時に使える：
 *   自分のデッキの上から2枚をアーカイブする。その後、自分のアーカイブの〈ロボ子さん〉1枚を手札に戻す。
 *   → ダウン処理中に使える推しスキル (12.1.5.2) なので onDownOshiSkill で実装。
 *
 * SP推しスキル「ボクの『高性能っぷり』を堪能してよね♡」[ホロパワー：-1][ゲームに1回]:
 *   自分のデッキを2枚引いた後、手札2枚をアーカイブする。その後、自分のアーカイブの〈ろぼさー〉を
 *   好きな枚数選び、自分の〈ロボ子さん〉に割り振って付けられる。
 *   → 能動的な起動スキルなので spOshiSkill で実装。ホロパワーのコストはエンジンが支払う。
 */
export default {
  number: 'hBP06-007',

  // ダウン処理中に使える推しスキル (12.1.5.2)
  onDownOshiSkill: {
    cost: 2,
    title: '推しスキル「PONじゃないもん！！」: デッキ上2枚をアーカイブし、アーカイブの〈ロボ子さん〉1枚を手札に戻しますか？',
    canUse(engine, ownerIdx, downedHolomem) {
      const p = engine.state.players[ownerIdx];
      return engine.state.turnPlayer !== ownerIdx &&        // 相手のターン
        !p.usedOshiSkillThisTurn &&                          // ターンに1回
        p.holoPower.length >= 2 &&                           // [ホロパワー：-2]
        downedHolomem.stack[0].name === 'ロボ子さん';        // ダウンしたのが〈ロボ子さん〉
    },
    apply(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // コスト [ホロパワー：-2]
      p.archive.push(...p.holoPower.splice(0, 2));
      p.usedOshiSkillThisTurn += 1;
      // デッキの上から2枚をアーカイブ
      const moved = p.deck.splice(0, 2);
      p.archive.push(...moved);
      engine.log(`推しスキル「PONじゃないもん！！」: デッキ上${moved.length}枚をアーカイブ`);
      // アーカイブの〈ロボ子さん〉1枚を手札に戻す
      const i = p.archive.findIndex((c) => c.name === 'ロボ子さん');
      if (i !== -1) {
        const robo = p.archive.splice(i, 1)[0];
        p.hand.push(robo);
        engine.log(`推しスキル「PONじゃないもん！！」: アーカイブの ${robo.name} を手札に戻した`);
      }
    },
  },

  spOshiSkill: {
    *run(ctx) {
      // 自分のデッキを2枚引く
      ctx.draw(2);
      // その後、手札2枚をアーカイブする
      const archiveCount = Math.min(2, ctx.player.hand.length);
      for (let i = 0; i < archiveCount; i++) {
        const card = yield ctx.chooseCard({
          cards: [...ctx.player.hand],
          title: `SP推しスキル: アーカイブする手札を選択（${i + 1}/${archiveCount}）`,
        });
        if (!card) break;
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
      }
      // その後、自分のアーカイブの〈ろぼさー〉を好きな枚数選び、自分の〈ロボ子さん〉に割り振って付ける
      const roboHolomems = ctx.holomems('self', (e) => e.top.name === 'ロボ子さん');
      if (roboHolomems.length === 0) return;
      while (true) {
        const robosaa = ctx.player.archive.filter((c) => c.name === 'ろぼさー');
        if (robosaa.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: robosaa,
          title: '〈ロボ子さん〉に付ける〈ろぼさー〉を選択（任意・何枚でも）',
          optional: true,
          skipLabel: 'これ以上付けない',
        });
        if (!picked) break;
        // 付け先の〈ロボ子さん〉を選ぶ（割り振り）。付け先ルール（マスコットは1枚等）を尊重。
        const cand = ctx.holomems('self', (e) =>
          e.top.name === 'ロボ子さん' && ctx.engine._canAttachSupport(e.holomem, picked));
        if (cand.length === 0) break;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === 'ロボ子さん' && ctx.engine._canAttachSupport(e.holomem, picked),
          title: `${picked.name} を付ける〈ロボ子さん〉を選択`,
        });
        if (!target) break;
        ctx.removeFromArchive(picked);
        yield* ctx.attachSupportWithTrigger(picked, target.holomem);
      }
    },
  },
};
