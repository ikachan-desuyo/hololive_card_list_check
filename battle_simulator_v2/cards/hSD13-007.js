/**
 * エリザベス・ローズ・ブラッドフレイム (hSD13-007) 赤・2nd・HP180（#EN, #Justice, #歌）
 *
 * [キーワード/ギフト] 猛炎のウォークライ:
 *   このホロメンのエール1枚につき、このホロメンのHP+10。
 *   → 【未実装】ホロメン自身の常時HP修正（自分のエール枚数依存）を自分自身へ適用する機構が
 *      エンジンに無い（effects.hpBonus は装着カードの attached.hpPlus と state.modifiers しか集計せず、
 *      ホロメン自身の def の常時アウラを自分へ反映する経路が存在しない）。
 *      該当する常時自己強化アウラのフックが追加されるまで保留。
 *
 * [アーツ] 悪斬りのカデンツァ (100+, 特攻 紫+50):
 *   このホロメンのエール1枚につき、このアーツ+20。
 *   → dmgBonus: 付いているエール数 × 20。
 *   このアーツで相手のホロメンをダウンさせた時、自分のエールデッキの上から1枚をこのホロメンに送る。
 *   → onDownDealt: ctx.sourceHolomem（＝このホロメン）へエールデッキトップ1枚を送る。
 */
export default {
  number: 'hSD13-007',
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
