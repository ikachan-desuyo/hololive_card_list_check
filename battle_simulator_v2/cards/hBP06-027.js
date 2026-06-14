/**
 * 風真いろは (hBP06-027) 緑・2nd・HP210（#JP #秘密結社holoX）
 *
 * [ギフト] 伝えたい想い:
 *   このホロメンが相手のセンターホロメンをダウンさせた時、自分のこのターンにBloomした
 *   〈風真いろは〉1人を、自分の手札のホロメンを使って、もう1回Bloomできる。
 *   → 「もう1回Bloom（再Bloom）」は保留機構のため未実装。
 *      （相手"センター"ダウン限定の判定および、このターンにBloomしたホロメンの追跡も必要）
 *
 * [アーツ] 一緒にすてっぷ (160+) main:緑/無/無, 特攻:白+50
 *   ・自分の推しホロメンが〈風真いろは〉で、自分のコラボホロメンがいるなら、このアーツ+40。
 *       → dmgBonus で実装。
 *   ・さらに、このホロメンがBuzzホロメンからBloomしているなら、このアーツダメージは軽減されない。
 *       → arts定義 damageNotReduced で実装。スタックの下（重なり元）に Buzzホロメンがあるなら、
 *         このアーツダメージの軽減を無効化する。
 *
 * [ギフト] 伝えたい想い（再Bloom）は §0-B「再Bloom」機構が必要なため別途。
 */
export default {
  number: 'hBP06-027',
  arts: {
    '一緒にすてっぷ': {
      // 推しが風真いろは かつ コラボホロメンがいるなら +40
      dmgBonus(ctx) {
        if (ctx.player.oshi?.name !== '風真いろは') return 0;
        const hasCollab = ctx.holomems('self', (e) => e.pos.zone === 'collab').length > 0;
        return hasCollab ? 40 : 0;
      },
      // このホロメンがBuzzホロメンからBloomしているなら、このアーツダメージは軽減されない
      damageNotReduced(ctx) {
        const stack = ctx.sourceHolomem?.stack || [];
        return stack.slice(1).some((c) => c.buzz); // 重なり元（自分より下）にBuzzがある
      },
    },
  },
};
