/**
 * 鷹嶺ルイ (hBP01-005) 推しホロメン 赤 ライフ5
 * 推しスキル「女幹部の采配」[ホロパワー-X][ターンに1回]:
 *   自分の赤ホロメンの能力で手札をアーカイブする時に使える：アーカイブする手札1枚につき
 *   自分のホロパワー1枚を、かわりにアーカイブできる。
 *   → ★保留: 「手札をアーカイブするコスト」をホロパワーで肩代わりする置換効果。Xコストかつ
 *     手札アーカイブをコスト支払いとして行う箇所への置換フックが必要（hBP03-106 と同系統）。
 *     ※Xコスト推しスキルはエンジン側で元々メインに提示されない（未対応）。
 * SP推しスキル「ホークアイ」[ホロパワー-2][ゲームに1回]:
 *   次の相手のターンの間、相手のセンターホロメンとコラボホロメンは、バトンタッチ、移動、交代できない。
 *   → spOshiSkill。ターン修正 kind:'cannotMoveFrontline'（相手側・次の相手ターン終了まで）を積む。
 *     engine はバトンタッチ生成時にこの制限を参照する。
 */
export default {
  number: 'hBP01-005',
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
