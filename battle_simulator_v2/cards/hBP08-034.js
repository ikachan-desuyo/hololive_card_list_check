/**
 * モココ・アビスガード (hBP08-034) ホロメン・赤・Debut・HP120（#EN #Advent #ケモミミ）
 *
 * [コラボエフェクト] FUWAMOCOを信じて！:
 *   自分が後攻で最初のターンなら、自分のデッキから、Debutホロメンの
 *   [〈フワワ・アビスガード〉と〈モココ・アビスガード〉]1枚ずつをステージに出す。
 *   そしてデッキをシャッフルする。
 *   → 後攻最初のターン判定は ctx.isFirstTurnGoingSecond()。満たさなければ何もしない。
 *      〈フワワ・アビスガード〉と〈モココ・アビスガード〉はそれぞれ「カード名」参照。
 *      Debutホロメン（c.kind==='holomen' && c.bloomLevel==='Debut'）かつ各名称のカードを
 *      デッキから1枚ずつ、計2枚をステージ（バック）に出す（putToBack）。
 *      「出す」=強制だが、デッキ探索なので各名称が見つからない／ステージ上限で出せない場合は
 *      その分だけ出す（putToBack がステージ上限6を担保）。名称指定の特定カードなので
 *      プレイヤーの選択は発生しない（同名の複数枚は同一なので先頭を採用）。
 *      最後にデッキをシャッフルする。
 *
 * [アーツ] あなたのもこもこなモココ（30 / any）: テキスト効果なし（素点ダメージのみ）。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-034',

  collabEffect: {
    name: 'FUWAMOCOを信じて！',
    *run(ctx) {
      // 自分が後攻で最初のターンなら
      if (!ctx.isFirstTurnGoingSecond()) {
        ctx.log('後攻の最初のターンではないため発動しない');
        return;
      }

      // Debutホロメンの〈フワワ・アビスガード〉と〈モココ・アビスガード〉を1枚ずつステージに出す
      const names = ['フワワ・アビスガード', 'モココ・アビスガード'];
      for (const name of names) {
        const card = ctx.deckCards(
          (c) => c.kind === 'holomen' && c.bloomLevel === 'Debut' && c.name === name,
        )[0];
        if (!card) {
          ctx.log(`デッキにDebutの〈${name}〉が見つからなかった`);
          continue;
        }
        ctx.removeFromDeck(card);
        ctx.flashReveal(card); // どのカードを出したか画面に見せる
        if (!ctx.putToBack(card)) {
          // ステージ上限などで出せなかった場合はデッキに戻す（領域に属さない瞬間を作らない）
          ctx.deckToBottom([card]);
          ctx.log(`ステージに空きがなく〈${name}〉を出せなかった`);
        }
      }

      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
