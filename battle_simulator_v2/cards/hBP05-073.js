/**
 * アユンダ・リス (hBP05-073) 黄・2nd・HP200（#ID1期生,#歌）
 * アーツ「IT's Time to RE4GE !!!!!」(50+): 自分の推しホロメンが〈アユンダ・リス〉なら、
 *   自分の#ID1期生を持つホロメン全員のエール1枚につき、このアーツ+10。ただし、数える枚数は10枚まで。
 * ※キーワード「BRRRR」(ブルームエフェクト・エールデッキ上3枚を見て選ぶ)は
 *   エールデッキを見るプリミティブが未実装のため未対応（CARD_EFFECT_STATUS.md §8）。
 */
export default {
  number: 'hBP05-073',
  arts: {
    "IT's Time to RE4GE !!!!!": {
      dmgBonus(ctx) {
        if (ctx.player.oshi?.name !== 'アユンダ・リス') return 0;
        let n = 0;
        for (const e of ctx.holomems('self', (x) => ctx.hasTag(x.top, 'ID1期生'))) n += e.holomem.cheers.length;
        return Math.min(n, 10) * 10;
      },
    },
  },
};
