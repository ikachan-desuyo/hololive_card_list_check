/**
 * 小鳥遊キアラ (hBP01-063) 赤・Debut・HP60（#EN #Myth #トリ）
 * コラボエフェクト「きわわの魔法」:
 *   自分のセンターホロメンが#トリを持つ時、自分の手札１枚をアーカイブできる：
 *   自分のデッキから、マスコット１枚を公開し、手札に加える。そしてデッキをシャッフルする。
 * アーツ「もふもふタイム」(20): テキスト効果なし（エンジンが素点処理）。
 *
 * 解釈:
 *  - 「自分のセンターホロメンが#トリを持つ時」=このコラボ効果の発動条件（満たさなければ何もしない）。
 *  - 「手札１枚をアーカイブできる：…」=コロン前がコストの任意効果。
 *    コスト（手札1枚アーカイブ）を払えば、コロン後の効果（マスコット1枚をサーチして手札へ）を行う。
 *    「できる」なので任意。手札を払わないなら効果は発動しない。
 *  - 「そしてデッキをシャッフルする」=デッキを見た後にシャッフルする。
 *    コストを払った（=効果を行う）場合のみデッキに触れるため、その場合にシャッフルする。
 */
export default {
  number: 'hBP01-063',
  collabEffect: {
    name: 'きわわの魔法',
    *run(ctx) {
      // 発動条件: 自分のセンターホロメンが #トリ を持つ
      const center = ctx.player.center;
      if (!center || !ctx.hasTag(center.stack[0], 'トリ')) {
        ctx.log('センターホロメンが#トリを持たないため発動しない');
        return;
      }
      // 手札が無ければアーカイブコストを払えない
      if (ctx.player.hand.length === 0) {
        ctx.log('アーカイブできる手札が無いため発動しない');
        return;
      }
      // コスト: 手札1枚をアーカイブ（任意）
      const cost = yield ctx.chooseCard({
        cards: ctx.player.hand.slice(),
        title: 'アーカイブする手札1枚を選択（マスコットをサーチ）',
        optional: true,
        skipLabel: '発動しない',
      });
      if (!cost) return;
      ctx.removeFromHand(cost);
      ctx.player.archive.push(cost);
      ctx.log(`${ctx.player.name}: ${cost.name} をアーカイブ`);

      // 効果: デッキからマスコット1枚を公開して手札に加える
      const mascots = ctx.deckCards((c) => c.supportType === 'マスコット');
      if (mascots.length === 0) {
        ctx.log('デッキにマスコットがいなかった');
        ctx.shuffleDeck();
        return;
      }
      const mascot = yield ctx.chooseCard({
        cards: mascots,
        title: '公開して手札に加えるマスコットを選択',
        optional: true,
      });
      if (mascot) {
        ctx.removeFromDeck(mascot);
        ctx.flashReveal(mascot);
        ctx.addToHand(mascot, { reveal: true });
      }
      // デッキを見たのでシャッフルする
      ctx.shuffleDeck();
    },
  },
};
