/**
 * 森カリオペの鎌 (hBP02-088) サポート・ツール
 * [サポート効果] このツールが付いているホロメンのアーツ+10。
 * ◆1st以上の〈森カリオペ〉に付いていたら能力追加:
 *   このツールをホロメンに手札から付けた時、自分のデッキの上から1枚をアーカイブする。
 * ツールは、自分のホロメン1人につき1枚だけ付けられる
 *   （ツール1人1枚の上限はエンジンの _canAttachSupport が既定で処理。付け先制限は無いので attachRule 不要）。
 *
 * 実装メモ:
 * - 常時のアーツ+10は attached.artsPlus（毎回動的計算なので後始末不要）。
 * - 「手札から付けた時」のトリガーは triggers.onAttach。通常プレイの装着（engine supportAttach）は
 *   必ず手札からなのでテキスト通り。効果でアーカイブから付ける attachSupportWithTrigger からも
 *   呼ばれ得るが、このツールをアーカイブから付ける効果は存在しないため実害なし。
 * - 「1st以上」= bloom_level が '1st' または '2nd'（Debut/Spot は対象外）。
 */
export default {
  number: 'hBP02-088',
  attached: {
    artsPlus() {
      return 10;
    },
  },
  triggers: {
    *onAttach(ctx) {
      const host = ctx.sourceHolomem; // このツールが付いたホロメン
      const top = host?.stack?.[0];
      if (!top) return;
      // 1st以上の〈森カリオペ〉に付いている場合のみ能力追加
      if (top.name !== '森カリオペ') return;
      if (top.bloomLevel !== '1st' && top.bloomLevel !== '2nd') return; // 正規化カードは bloomLevel
      // 自分のデッキの上から1枚をアーカイブする
      if (ctx.player.deck.length === 0) return;
      const card = ctx.player.deck.shift();
      ctx.player.archive.push(card);
      ctx.recordDeckArchive(1);
      ctx.log(`${ctx.player.name}: デッキの上から ${card.name} をアーカイブした（森カリオペの鎌）`);
    },
  },
};
