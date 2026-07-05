/**
 * アーニャ・メルフィッサ (hBP04-078) 黄・2nd・HP180
 * ギフト「宝物みつけた」:
 *   [センターポジション・コラボポジション限定]
 *   自分の〈古代武器〉が付いているセンターホロメンの〈アーニャ・メルフィッサ〉のアーツに必要な黄-1。
 *   → アーツ必要エール軽減オーラ（engine が _effectiveArtCost で参照）
 * アーツ「ダンジョンアドベンチャー」(160): テキスト効果なし（基本値のみ）。
 */
export default {
  number: 'hBP04-078',
  // 自分(src)が center/collab にいる間、古代武器付き・センターの〈アーニャ〉のアーツ必要黄-1
  artsCostReduceAura(src, target, engine) {
    const sz = engine._zoneOf(src);
    if (sz !== 'center' && sz !== 'collab') return []; // [センター・コラボ限定]
    if (engine._zoneOf(target) !== 'center') return [];
    if (target.stack[0].name !== 'アーニャ・メルフィッサ') return [];
    if (!target.attachments.some((a) => a.name === '古代武器')) return [];
    return [{ color: '黄', amount: 1 }];
  },
};
