/**
 * ベスティア・ゼータ (hBP07-016) 白・Debut・HP120（#ID #ID3期生）
 * [ギフト] Pat the BAZO:
 *   このホロメンにマスコットが付いているなら、このホロメンのHP+30。
 *   → 自分自身を対象にした常時アウラ（auraHpPlus）で実装。
 *      _auraSum は src 自身も target として評価するため src===target の時だけ判定する。
 * [アーツ] So, Tell Me Your Secrets? (dmg:20):
 *   追加効果テキストなし（基本ダメージのみ）。実装不要。
 */
export default {
  number: 'hBP07-016',
  // ギフト「Pat the BAZO」: このホロメンにマスコットが付いているなら自分のHP+30
  auraHpPlus(src, target) {
    if (src !== target) return 0;
    const hasMascot = (src.attachments || []).some((a) => a.supportType === 'マスコット');
    return hasMascot ? 30 : 0;
  },
};
