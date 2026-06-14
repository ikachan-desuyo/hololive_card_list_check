/**
 * 沙花叉クロヱ (hBP02-040) 青・2nd・HP190（#JP #秘密結社holoX #海）
 *
 * [キーワード/ギフト] 最高に激アツ～:
 *   [ターンに1回]このホロメンのアーツ「ホロックスロット」でカードを公開した時、
 *   公開したカード3枚が同じBloomレベルのホロメンなら、相手のライフ-1。
 *
 * [アーツ] ホロックスロット (100+) icons:[青][青][無] 特攻 白+50:
 *   自分のデッキの上から3枚を公開できる：公開したホロメン1枚につき、このアーツ+20。
 *   そして公開したカードをアーカイブする。
 *
 * 実装方針:
 *   - アーツは「公開できる」=任意なので confirm で確認する。
 *   - デッキの上から3枚を lookTopDeck で見る（解決領域 revealed へ）。
 *     公開したホロメン（kind==='holomen'）1枚につき +20（addArtBonus）。
 *   - ギフト「最高に激アツ～」の発火条件は「このアーツでカードを公開した時、
 *     公開した3枚が同じBloomレベルのホロメンなら」。アーツ解決中に判定するのが自然なため、
 *     アーカイブする前にこのアーツ run 内で判定する。
 *     条件: 公開枚数がちょうど3枚 / 3枚すべて kind==='holomen' / bloomLevel が全て同一。
 *     満たせば相手のライフ-1（opponent.lifeDamage += 1。hBP01-014 と同じく
 *     アーツ解決後の _checkTiming 11.5 ライフダメージ処理に合流させる）。
 *     [ターンに1回] は markOncePerTurn/oncePerTurnUsed で制限する。
 *   - 最後に公開した（revealed に残っている）カードをすべてアーカイブする。
 */
export default {
  number: 'hBP02-040',
  arts: {
    'ホロックスロット': {
      *run(ctx) {
        if (ctx.player.deck.length === 0) return;
        const ok = yield ctx.confirm('デッキの上から3枚を公開しますか？（公開したホロメン1枚につきアーツ+20）');
        if (!ok) return;

        const seen = ctx.lookTopDeck(3);
        if (seen.length === 0) return;

        // 公開したホロメン1枚につき +20
        const holomems = seen.filter((c) => c.kind === 'holomen');
        if (holomems.length > 0) {
          ctx.addArtBonus(holomems.length * 20, `公開したホロメン${holomems.length}枚`);
        }

        // ギフト「最高に激アツ～」[ターンに1回]:
        // 公開した3枚が同じBloomレベルのホロメンなら、相手のライフ-1
        const GIFT_KEY = 'hBP02-040:最高に激アツ';
        if (!ctx.oncePerTurnUsed(GIFT_KEY)
          && seen.length === 3
          && holomems.length === 3) {
          const level = holomems[0].bloomLevel;
          if (holomems.every((c) => c.bloomLevel === level)) {
            ctx.markOncePerTurn(GIFT_KEY);
            ctx.reduceOpponentLife(1);
            ctx.log(`《最高に激アツ～》公開した3枚が同じBloomレベル（${level}）のホロメン → 相手のライフ-1`);
          }
        }

        // 公開したカードをアーカイブする
        const rest = ctx.player.revealed.filter((c) => seen.includes(c));
        for (const c of rest) {
          ctx._unreveal(c);
          ctx.player.archive.push(c);
        }
        if (rest.length > 0) ctx.log(`${ctx.player.name}: 公開した${rest.length}枚をアーカイブした`);
      },
    },
  },
};
