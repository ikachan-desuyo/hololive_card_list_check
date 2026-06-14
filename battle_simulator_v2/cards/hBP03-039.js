/**
 * モココ・アビスガード (hBP03-039) 赤・1st・HP240・Buzzホロメン（#EN #Advent #ケモミミ）
 *
 * アーツ「もこもこしてる方」(50+):
 *   [コラボポジション限定]自分のセンターホロメンが〈フワワ・アビスガード〉の時、このアーツ+30。
 *   → dmgBonus（コラボ位置＆自センターが〈フワワ・アビスガード〉なら +30）
 *
 * ギフト「魔界乃番犬の暴れん坊」: 自分のリセットステップで、自分のセンターホロメンが
 *   〈フワワ・アビスガード〉の時、このホロメンはバックポジションに移動してもお休みしない。
 *   → noRestOnReset で実装。engine がリセットのコラボ→バック移動時にこのフックを見て、
 *     センターが〈フワワ・アビスガード〉なら rested にしない（アクティブのまま移動）。
 */
export default {
  number: 'hBP03-039',
  // ギフト「魔界乃番犬の暴れん坊」: センターが〈フワワ・アビスガード〉なら、リセットでバックへ移動してもお休みしない
  noRestOnReset(holomem, engine, ownerIdx) {
    const center = engine.state.players[ownerIdx].center;
    return !!center && center.stack[0].name === 'フワワ・アビスガード';
  },
  arts: {
    'もこもこしてる方': {
      dmgBonus(ctx) {
        // [コラボポジション限定]
        if (ctx.engine._zoneOf(ctx.sourceHolomem) !== 'collab') return 0;
        // 自分のセンターホロメンが〈フワワ・アビスガード〉か
        const center = ctx.holomems('self', (e) => e.pos.zone === 'center')[0];
        return center && center.top.name === 'フワワ・アビスガード' ? 30 : 0;
      },
    },
  },
};
