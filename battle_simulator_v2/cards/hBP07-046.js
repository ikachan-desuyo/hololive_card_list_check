/**
 * エリザベス・ローズ・ブラッドフレイム (hBP07-046) 赤・Debut・HP130（#EN #Justice #歌）
 *
 * コラボエフェクト「後の先を取る！」:
 *   自分が後攻で最初のターンなら、自分のデッキから、
 *   [1stホロメンの〈エリザベス・ローズ・ブラッドフレイム〉と〈Thorn〉]1枚ずつを公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 *
 * アーツ「Onwards and Upwards!」(30): テキスト効果なし（素点のみ）。定義不要。
 *
 * 解釈:
 *  - 条件は「後攻で最初のターンなら」→ ctx.isFirstTurnGoingSecond()。
 *  - 「1stホロメンの」は〈エリザベス・ローズ・ブラッドフレイム〉のみに掛かる。
 *    〈Thorn〉(hBP07-104) はサポート・ツールなので種別はサポートで検索する。
 *  - 非公開領域（デッキ）のサーチ＝「見つからなかったことにできる」（総合ルール 4.1.2.3）。
 *  - 条件成立時はデッキを必ずシャッフルする（加えた枚数に関わらず、テキスト通り実行）。
 */
export default {
  number: 'hBP07-046',
  collabEffect: {
    name: '後の先を取る！',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) {
        ctx.log('後攻で最初のターンではないため、効果は発動しない');
        return;
      }
      const searches = [
        {
          label: '1stホロメンの〈エリザベス・ローズ・ブラッドフレイム〉',
          filter: (c) => c.kind === 'holomen' && c.bloomLevel === '1st'
            && ctx.nameIs(c, 'エリザベス・ローズ・ブラッドフレイム'),
        },
        {
          label: '〈Thorn〉',
          filter: (c) => c.kind === 'support' && ctx.nameIs(c, 'Thorn'),
        },
      ];
      for (const s of searches) {
        const candidates = ctx.deckCards(s.filter);
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: `デッキから${s.label}1枚を公開して手札に加える`,
          optional: true,
          skipLabel: '見つからなかった（加えない）',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.addToHand(picked, { reveal: true });
        }
      }
      ctx.shuffleDeck();
    },
  },
};
