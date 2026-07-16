/**
 * 鷹嶺ルイ (hBP01-005) 推しホロメン 赤 ライフ5
 * 推しスキル「女幹部の采配」[ホロパワー-X][ターンに1回]:
 *   自分の赤ホロメンの能力で手札をアーカイブする時に使える：アーカイブする手札1枚につき
 *   自分のホロパワー1枚を、かわりにアーカイブできる。
 *   → handArchiveCostReplace で実装。ctx.archiveHandCard（手札アーカイブ共通プリミティブ）が、
 *     発生源が赤ホロメンの時にこのフックを呼び、各手札アーカイブをホロパワー1枚アーカイブに置換するか
 *     プレイヤーに確認する。Xコストは置換した枚数ぶんのホロパワー。
 *     [ターンに1回]＝発動した発生源（ホロメンの1能力）に限り継続して置換でき、別の発生源では再使用不可。
 * SP推しスキル「ホークアイ」[ホロパワー-2][ゲームに1回]:
 *   次の相手のターンの間、相手のセンターホロメンとコラボホロメンは、バトンタッチ、移動、交代できない。
 *   → spOshiSkill。ターン修正 kind:'cannotMoveFrontline'（相手側・次の相手ターン終了まで）を積む。
 *     engine はバトンタッチ生成時にこの制限を参照する。
 */
export default {
  number: 'hBP01-005',

  // 推しスキル「女幹部の采配」: 赤ホロメンの能力での手札アーカイブを、ホロパワー1枚アーカイブに置換できる。
  //   ctx.archiveHandCard から呼ばれる。replaced=true を返すと手札カードは残り、ホロパワーが代わりにアーカイブされる。
  * handArchiveCostReplace(ctx, host, card) {
    if (!host || !ctx.engine._hasColor(host, '赤')) return false; // 赤ホロメンの能力のみ（多色・全色扱い対応）
    const p = ctx.player;
    if (p.holoPower.length === 0) return false; // 払うホロパワーが無い
    // [ターンに1回]: 既にこのターン別の発生源で使っていたら不可（同一発生源の能力中は継続可）
    if (p._saihaiUsedTurn === ctx.state.turn && p._saihaiHost !== host) return false;
    const ok = yield ctx.confirm(
      `推しスキル「女幹部の采配」: 「${card.name}」のかわりにホロパワー1枚をアーカイブする？`,
      'ホロパワーで代替する', '手札をアーカイブする');
    if (!ok) return false;
    p.archive.push(p.holoPower.shift());
    p._saihaiUsedTurn = ctx.state.turn;
    p._saihaiHost = host;
    ctx.log(`女幹部の采配: 「${card.name}」のかわりにホロパワー1枚をアーカイブ（手札に残す）`);
    return true;
  },

  spOshiSkill: {
    canUse(engine, idx) {
      const opp = engine.state.players[1 - idx];
      return !!(opp.center || opp.collab); // 縛る相手の前衛がいること
    },
    *run(ctx) {
      const oppIdx = 1 - ctx.playerIdx;
      ctx.engine.state.modifiers.push({
        kind: 'cannotMoveFrontline',
        ownerIdx: oppIdx,
        untilTurn: ctx.state.turn + 1, // 次の相手のターン（その終わりに消滅）
        description: '次の相手のターン、相手の前衛はバトンタッチ・移動・交代できない',
      });
      ctx.log('ホークアイ: 次の相手のターン、相手のセンター/コラボはバトンタッチ・移動・交代できない');
    },
  },
};
