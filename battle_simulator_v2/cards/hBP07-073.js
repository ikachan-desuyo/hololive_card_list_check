/**
 * ラプラス・ダークネス (hBP07-073) 紫・1st・HP170（#秘密結社holoX, #シューター, #歌）
 * コラボエフェクト「ライブだー！！！！！！！！！」:
 *   このターンの間、このホロメンのアーツに必要な無色-2。
 * アーツ「吾輩の歌聴いてくれる奴いるううう！？！？」(30):
 *   自分のデッキから、〈ラプラス・ダークネス〉1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 */
export default {
  number: 'hBP07-073',
  collabEffect: {
    name: 'ライブだー！！！！！！！！！',
    *run(ctx) {
      const me = ctx.sourceHolomem;
      ctx.addTurnModifier({
        kind: 'artCostReduce',
        color: '無色',
        amount: 2,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === me,
        description: `このターン、${me.stack[0].name} のアーツ必要 無色-2`,
      });
    },
  },
  arts: {
    '吾輩の歌聴いてくれる奴いるううう！？！？': {
      *run(ctx) {
        const candidates = ctx.deckCards((c) => c.name === 'ラプラス・ダークネス');
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: 'デッキから〈ラプラス・ダークネス〉を選択',
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
  },
};
