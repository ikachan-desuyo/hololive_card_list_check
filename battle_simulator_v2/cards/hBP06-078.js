/**
 * 大空スバル (hBP06-078) 黄・Debut・HP100（#JP #2期生 #トリ）
 * コラボエフェクト「地球&テラ」:
 *   このホロメンのエール1枚をアーカイブできる（コスト・任意）：
 *   自分のデッキから、自分の推しホロメンと同じカード名のDebutホロメン1枚を公開し、
 *   手札に加える。そしてデッキをシャッフルする。
 *
 * アーツ「取り敢えずPOWERで頑張るっす！！！！」(20) はダメージのみでテキスト効果なし
 * （エンジンが基本ダメージを処理するため定義不要）。
 */
export default {
  number: 'hBP06-078',
  collabEffect: {
    name: '地球&テラ',
    *run(ctx) {
      // コスト: このホロメンのエール1枚をアーカイブ（「できる」=任意）
      if (ctx.sourceHolomem.cheers.length === 0) return;
      const oshiName = ctx.player.oshi?.name;
      if (!oshiName) return;
      const ok = yield ctx.confirm('エール1枚をアーカイブして、推しホロメンと同名のDebutホロメンを手札に加えますか？');
      if (!ok) return;
      const cheer = yield ctx.chooseCard({
        cards: ctx.sourceHolomem.cheers,
        title: 'アーカイブするエールを選択',
      });
      if (!cheer) return;
      ctx.archiveCheer(ctx.sourceHolomem, cheer);
      // 推しホロメンと同じカード名のDebutホロメンをデッキから検索
      const candidates = ctx.deckCards(
        (c) => c.kind === 'holomen' && c.bloomLevel === 'Debut' && c.name === oshiName,
      );
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: `手札に加える〈${oshiName}〉のDebutホロメンを選択（任意）`,
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
