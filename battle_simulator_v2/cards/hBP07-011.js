/**
 * 角巻わため (hBP07-011) 白・1st・HP140（#JP #4期生 #ケモミミ #歌）
 * ブルームエフェクト「グルグルシープ」:
 *   自分のデッキから、1stホロメンの〈角巻わため〉1枚を公開し手札に加える。デッキをシャッフルする。
 *   （ターンに1回しか使えない）
 * アーツ「これボタン弾けちゃうよぉ」(70):
 *   このホロメンに白エールが2枚以上付いているなら、このアーツに必要な無色-1。
 *   → このホロメンのアーツはこの1種のみなので、自身への artsCostReduceAura（無色-1, 白2枚以上条件）で表現。
 */
export default {
  number: 'hBP07-011',
  bloomEffect: {
    name: 'グルグルシープ',
    *run(ctx) {
      // 「グルグルシープはターンに1回しか使えない」
      if (ctx.oncePerTurnUsed('hBP07-011:グルグルシープ')) {
        ctx.log('ブルームエフェクト「グルグルシープ」はこのターン既に使用済み');
        return;
      }
      // 「1stホロメン」は Buzz の 1st も含む（Buzz を除外する場合はテキストに明記される。hBP07-040 参照）
      const candidates = ctx.deckCards(
        (c) => c.kind === 'holomen' && c.bloomLevel === '1st' && ctx.nameIs(c, '角巻わため'),
      );
      if (candidates.length === 0) {
        // 公開対象が無くてもデッキシャッフルは行う（効果の発動自体は成立）
        ctx.markOncePerTurn('hBP07-011:グルグルシープ');
        ctx.shuffleDeck();
        return;
      }
      ctx.markOncePerTurn('hBP07-011:グルグルシープ');
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加える 1stホロメン〈角巻わため〉を選択',
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
  arts: {
    'これボタン弾けちゃうよぉ': {
      // dmgは固定70（増減なし）。コスト軽減のみ。
    },
  },
  // このホロメン自身に白エールが2枚以上付いているとき、このホロメンのアーツ必要エール 無色-1。
  // （このカードのアーツは「これボタン弾けちゃうよぉ」1種のみのため、自身対象オーラで厳密に再現される）
  artsCostReduceAura(src, target, _engine) {
    if (src !== target) return [];
    const whiteCheers = (src.cheers || []).filter((c) => c.color === '白').length;
    return whiteCheers >= 2 ? [{ color: '無色', amount: 1 }] : [];
  },
};
