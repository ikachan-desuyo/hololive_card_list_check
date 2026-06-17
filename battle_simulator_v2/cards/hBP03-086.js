/**
 * デュアルモニターパソコン (hBP03-086) サポート・アイテム・LIMITED
 * [サポート効果]
 *   自分のデッキから、エクストラ「このホロメンはデッキに何枚でも入れられる」を持つ
 *   Debutホロメン1～2枚を公開し、ステージに出す。そしてデッキをシャッフルする。
 * LIMITED：ターンに1枚しか使えない。（LIMITED制限はエンジン側で処理）
 *
 * 対象は「エクストラ『このホロメンはデッキに何枚でも入れられる』」を持つDebutホロメン。
 * このエクストラ能力はキーワード（subtype「エクストラ」）として格納されるため、
 * キーワードのテキストに「デッキに何枚でも」を含むDebutホロメンを候補にする
 * （エクストラはコレクタが取得し、card_data の該当Debutに keywords として格納される）。
 *
 * 「1～2枚」=「まで」ではないので、候補があれば最低1枚は出す（2枚目は任意）。
 * ステージは最大6人。空きが無い場合はそこで打ち切る。
 */
function isExtraUnlimitedDebut(ctx, c) {
  if (c.kind !== 'holomen' || c.bloomLevel !== 'Debut') return false;
  // 「エクストラ」能力（subtype 'エクストラ'）の記載のみを対象にする。コラボ等の効果テキストに
  // "エクストラ「…デッキに何枚でも…」" と書かれているだけのカードを誤判定しないため。
  return (c.keywords || []).some((k) =>
    k.subtype === 'エクストラ' &&
    `${k.name || ''}${k.text || ''}`.includes('デッキに何枚でも入れられる'));
}

export default {
  number: 'hBP03-086',
  support: {
    // ステージ満杯（6人）or 対象Debutがデッキに無い時は何も起きないので使用不可（一般ルールQ348）
    canUse(ctx) {
      return ctx.engine._stageCount(ctx.player) < 6
        && ctx.player.deck.some((c) => isExtraUnlimitedDebut(ctx, c));
    },
    *run(ctx) {
      // 1枚目（候補があれば必須。ステージに空きがあること）
      if (ctx.engine._stageCount(ctx.player) >= 6) {
        ctx.shuffleDeck();
        return;
      }
      const cand1 = ctx.deckCards((c) => isExtraUnlimitedDebut(ctx, c));
      const first = yield ctx.chooseCard({
        cards: cand1,
        title: 'ステージに出すDebutホロメンを選択（1枚目）',
        optional: cand1.length === 0, // 「1～2枚」=最低1枚（候補があれば必須）。候補が無い時のみデッキ確認のみで終了可
        skipLabel: '見つからなかったことにする',
      });
      if (first) {
        ctx.removeFromDeck(first);
        ctx.putToBack(first);
        // 2枚目（任意。ステージに空きがある時のみ）
        if (ctx.engine._stageCount(ctx.player) < 6) {
          const second = yield ctx.chooseCard({
            cards: ctx.deckCards((c) => isExtraUnlimitedDebut(ctx, c)),
            title: 'ステージに出すDebutホロメンを選択（2枚目・任意）',
            optional: true,
            skipLabel: '1枚だけにする',
          });
          if (second) {
            ctx.removeFromDeck(second);
            ctx.putToBack(second);
          }
        }
      }
      ctx.shuffleDeck();
    },
  },
};
