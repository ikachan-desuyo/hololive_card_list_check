/**
 * SSRB (hBP03-106) サポート・ファン
 * 効果: このファンが付いているホロメンの能力でエールをアーカイブする時、アーカイブするエール1枚のかわりに、
 *   このファンをアーカイブできる。
 *   → cheerArchiveReplace（コスト置換）。ctx.archiveCheer がアビリティ起因（opts.ability!==false）の時、
 *     エール1枚のかわりにこのファンをアーカイブする選択を提示する。バトンタッチ等のコストは対象外。
 * 付け先: 自分の〈獅白ぼたん〉だけ・1人につき何枚でも。
 */
export default {
  number: 'hBP03-106',
  attachRule: {
    canAttach: (h) => h.stack[0].name === '獅白ぼたん',
    unlimited: true,
  },
  cheerArchiveReplace: {
    title: 'SSRB: アーカイブするエール1枚のかわりにSSRBをアーカイブする？',
    yesLabel: 'SSRBをアーカイブ（エールは残す）',
  },
};
