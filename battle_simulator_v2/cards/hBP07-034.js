/**
 * 輪堂千速 (hBP07-034) 緑・1st・HP190（#DEV_IS #FLOW #GLOW）
 * ブルームエフェクト「ぶいぶい走らせるぞ！！！」:
 *   [コスト] 自分のステージのエール1枚をアーカイブできる：
 *   自分のデッキから、#FLOW #GLOW を持つ Debut/1st/Spot ホロメン1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 * アーツ「どっちが速いｶﾅ？！？！？！」(20+):
 *   このホロメンに〈ふぐ太郎〉が付いているなら、このアーツ+10。 → dmgBonus
 */
export default {
  number: 'hBP07-034',
  bloomEffect: {
    name: 'ぶいぶい走らせるぞ！！！',
    *run(ctx) {
      // 検索対象が存在するかは支払い前でも確認できるが、コストは任意なので先に支払い意思を確認する
      const ok = yield ctx.confirm('自分のステージのエール1枚をアーカイブして効果を使いますか？');
      if (!ok) return;
      // コスト: 自分のステージ上のエール1枚をアーカイブ（どのホロメンのエールでも可）
      const holosWithCheer = ctx.holomems('self', (e) => e.holomem.cheers.length > 0);
      if (holosWithCheer.length === 0) return; // 支払えるエールが無い
      const allCheers = [];
      for (const { holomem } of holosWithCheer) {
        for (const cheer of holomem.cheers) allCheers.push({ holomem, cheer });
      }
      const picked = yield ctx.chooseCard({
        cards: allCheers.map((x) => x.cheer),
        title: 'コスト: アーカイブするエールを選択',
      });
      if (!picked) return;
      const owner = allCheers.find((x) => x.cheer === picked).holomem;
      yield* ctx.archiveCheer(owner, picked);
      // 効果: デッキから #FLOW #GLOW を持つ Debut/1st/Spot ホロメンを公開して手札へ
      const cand = ctx.deckCards((c) =>
        c.kind === 'holomen' &&
        ctx.hasTag(c, 'FLOW') && ctx.hasTag(c, 'GLOW') &&
        (c.bloomLevel === 'Debut' || c.bloomLevel === '1st' || c.bloomLevel === 'Spot'));
      const card = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える #FLOW #GLOW ホロメンを選択（Debut/1st/Spot・任意）',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (card) {
        ctx.removeFromDeck(card);
        ctx.addToHand(card, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
  arts: {
    'どっちが速いｶﾅ？！？！？！': {
      dmgBonus(ctx) {
        const hasFugutaro = ctx.sourceHolomem?.attachments.some((a) => a.name === 'ふぐ太郎');
        return hasFugutaro ? 10 : 0;
      },
    },
  },
};
