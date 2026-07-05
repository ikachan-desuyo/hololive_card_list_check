/**
 * エリザベス・ローズ・ブラッドフレイム (hSD13-007) 赤・2nd・HP180（#EN, #Justice, #歌）
 *
 * [キーワード/ギフト] 猛炎のウォークライ:
 *   このホロメンのエール1枚につき、このホロメンのHP+10。
 *   → auraHpPlus（自己ギフト）で実装。自分に付いているエール枚数 × 10 をHPに加算（常時）。
 *
 * [アーツ] 悪斬りのカデンツァ (100+, 特攻 紫+50):
 *   このホロメンのエール1枚につき、このアーツ+20。
 *   → dmgBonus: 付いているエール数 × 20。
 *   このアーツで相手のホロメンをダウンさせた時、自分のエールデッキの上から1枚をこのホロメンに送る。
 *   → onDownDealt: ctx.sourceHolomem（＝このホロメン）へエールデッキトップ1枚を送る。
 */
export default {
  number: 'hSD13-007',
  // キーワード「猛炎のウォークライ」: このホロメンのエール1枚につきHP+10（自己ギフト）
  auraHpPlus(src, holomem) {
    if (src !== holomem) return 0;                  // 自分自身のみ
    return (src.cheers?.length || 0) * 10;
  },
  arts: {
    '悪斬りのカデンツァ': {
      dmgBonus(ctx) {
        const cheers = ctx.sourceHolomem?.cheers?.length || 0;
        return cheers * 20;
      },
      *onDownDealt(ctx) {
        ctx.sendCheerFromCheerDeckTop(ctx.sourceHolomem);
      },
    },
  },
};
