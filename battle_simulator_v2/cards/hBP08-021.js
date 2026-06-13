/**
 * セシリア・イマーグリーン (hBP08-021) ホロメン・緑・Debut・HP120（#EN #Justice #語学）
 *
 * [コラボエフェクト] Automaton，Roll Out!:
 *   自分が後攻で最初のターンなら、自分のデッキから、〈Otomo〉2枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 *   → 後攻最初のターン判定は ctx.isFirstTurnGoingSecond()。満たさなければ何もしない。
 *      〈Otomo〉は「カード名」参照（ファン hBP08-107 "Otomo"）なので card.name === 'Otomo' で抽出。
 *      最大2枚を1枚ずつ選んで公開し手札に加える（デッキに2枚未満なら有る分だけ。
 *      非公開領域からの探索なので「見つからなかったことにする」も許容）。
 *      取り終えたらデッキをシャッフルする。
 *
 * [アーツ] 祝祭を響かせよう（30 / any）: テキスト効果なし（素点ダメージのみ）。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-021',

  collabEffect: {
    name: 'Automaton，Roll Out!',
    *run(ctx) {
      // 自分が後攻で最初のターンなら
      if (!ctx.isFirstTurnGoingSecond()) {
        ctx.log('後攻の最初のターンではないため発動しない');
        return;
      }

      // デッキから〈Otomo〉を最大2枚、1枚ずつ公開して手札に加える
      for (let i = 0; i < 2; i++) {
        const cand = ctx.deckCards((c) => c.name === 'Otomo');
        if (cand.length === 0) break;
        const target = yield ctx.chooseCard({
          cards: cand,
          title: `手札に加える〈Otomo〉を選択（${i + 1}枚目／最大2枚）`,
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        if (!target) break;
        ctx.removeFromDeck(target);
        ctx.addToHand(target, { reveal: true });
      }

      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
