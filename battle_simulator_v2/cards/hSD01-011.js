/**
 * AZKi (hSD01-011) 緑・2nd・HP190（#JP #0期生 #歌）
 *
 * アーツ「SorAZ グラビティ」(60, 特攻 青+50):
 *   自分のステージにホロメンの〈ときのそら〉がいる時、
 *   自分のエールデッキの上から１枚を、自分のホロメンに送る。
 *   → 〈ときのそら〉= 名前が「ときのそら」のホロメンが自分のステージにいるかで判定。
 *     エールデッキの上から1枚を自分のホロメン（プレイヤーが選択）に付ける。
 *
 * アーツ「デスティニーソング」(100+, 特攻 青+50):
 *   サイコロを１回振れる：奇数の時、このアーツ+50。１の時、さらに、このアーツ+50。
 *   → 「振れる」=任意（confirm）。奇数(1,3,5)で+50、出目が1ならさらに+50（=計+100）。
 */
export default {
  number: 'hSD01-011',
  arts: {
    'SorAZ グラビティ': {
      *run(ctx) {
        const hasSora = ctx.holomems('self', (e) => ctx.nameIs(e.top, 'ときのそら')).length > 0;
        if (!hasSora) return;
        if (ctx.player.cheerDeck.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: 'エールデッキの上から1枚を送るホロメンを選択',
        });
        if (!target) return;
        ctx.sendCheerFromCheerDeckTop(target.holomem);
      },
    },
    'デスティニーソング': {
      *run(ctx) {
        const ok = yield ctx.confirm('アーツ「デスティニーソング」: サイコロを1回振りますか？');
        if (!ok) return;
        const roll = (yield* ctx.rollDice());
        if (roll % 2 === 1) {
          ctx.addArtBonus(50, '奇数');
          if (roll === 1) ctx.addArtBonus(50, '1');
        }
      },
    },
  },
};
