/**
 * ロボ子さん（推しホロメン hBP06-007）紫
 *
 * 推しスキル「PONじゃないもん！！」[ホロパワー：-2][ターンに1回]:
 *   相手のターンで、自分の〈ロボ子さん〉がダウンした時に使える：
 *   自分のデッキの上から2枚をアーカイブする。その後、自分のアーカイブの〈ロボ子さん〉1枚を手札に戻す。
 *   → ダウン処理中に使える推しスキル (12.1.5.2) なので onDownOshiSkill で実装。
 *     手札に戻す〈ロボ子さん〉はプレイヤーが選ぶ（Debut/1st等が混在しうる）ため、
 *     対話的ジェネレータ run 方式（コスト・使用フラグはエンジンが処理）。
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
      return engine.state.turnPlayer !== ownerIdx &&                     // 相手のターン
        p.usedOshiSkillThisTurn < engine._oshiSkillCap(ownerIdx) &&      // ターンに1回（上限増加効果に対応）
        p.holoPower.length >= 2 &&                                       // [ホロパワー：-2]
        engine._nameIs(downedHolomem.stack[0], 'ロボ子さん');            // ダウンしたのが〈ロボ子さん〉
    },
    // コスト（ホロパワー-2）と使用フラグはエンジンが処理する（run 方式）
    *run(ctx) {
      // デッキの上から2枚をアーカイブ
      const moved = ctx.player.deck.splice(0, 2);
      ctx.player.archive.push(...moved);
      ctx.recordDeckArchive(moved.length); // デッキ→アーカイブ枚数を計上（hBP08-020）
      ctx.log(`推しスキル「PONじゃないもん！！」: デッキ上${moved.length}枚をアーカイブ`);
      // その後、アーカイブの〈ロボ子さん〉1枚を手札に戻す（複数種いる場合はプレイヤーが選ぶ）
      const cands = ctx.player.archive.filter((c) => ctx.nameIs(c, 'ロボ子さん'));
      if (cands.length === 0) return;
      const robo = yield ctx.chooseCard({
        cards: cands,
        title: '手札に戻す〈ロボ子さん〉を選択（アーカイブ）',
      });
      if (!robo) return;
      ctx.removeFromArchive(robo);
      ctx.player.hand.push(robo);
      ctx.log(`推しスキル「PONじゃないもん！！」: アーカイブの ${robo.name} を手札に戻した`);
    },
  },

  spOshiSkill: {
    *run(ctx) {
      // 自分のデッキを2枚引く
      ctx.draw(2);
      // その後、手札2枚をアーカイブする
      const archiveCount = Math.min(2, ctx.player.hand.length);
      const toArchive = yield ctx.chooseCards({
        cards: [...ctx.player.hand],
        count: archiveCount,
        title: 'SP推しスキル: アーカイブする手札を選択（2枚）',
      });
      for (const card of toArchive) {
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
