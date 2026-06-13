/**
 * ムーナ・ホシノヴァ (hBP06-049) 青・Debut・HP110（#ID #ID1期生 #歌）
 * コラボエフェクト「青い琥珀」:
 *   自分が後攻で最初のターンなら、自分のエールデッキから、青エール1枚を公開し、
 *   自分の〈ムーナ・ホシノヴァ〉に送る。そしてエールデッキをシャッフルする。
 * アーツ「星々の踊り」(20): テキスト効果なし（素のダメージのみ）。
 *
 * 実装メモ:
 * - 「青エール1枚を公開し」= エールデッキ内の青エールを1枚探して公開し送る。
 *   公開＝デッキ内非公開領域から特定色を取り出す処理なので chooseCard ではなく
 *   エンジンが自動で1枚取り出す（どの青エールでも同一なので選択不要）。
 * - 「自分の〈ムーナ・ホシノヴァ〉に送る」: ステージ上の同名ホロメンが複数いる場合は選択。
 *   1人だけなら自動で送る。0人ならコラボに出ている自分自身は必ず該当するため通常起こらない。
 */
export default {
  number: 'hBP06-049',
  collabEffect: {
    name: '青い琥珀',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;

      // エールデッキから青エールを1枚探す
      const blueCheer = ctx.player.cheerDeck.find((c) => c.color === '青');
      if (!blueCheer) {
        ctx.log('エールデッキに青エールがない');
        return;
      }

      // 送り先：自分のステージの〈ムーナ・ホシノヴァ〉
      const moonas = ctx.holomems('self', (e) => ctx.nameIs(e.top, 'ムーナ・ホシノヴァ'));
      if (moonas.length === 0) {
        ctx.log('〈ムーナ・ホシノヴァ〉がステージにいない');
        return;
      }
      let target = moonas[0];
      if (moonas.length > 1) {
        const chosen = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.nameIs(e.top, 'ムーナ・ホシノヴァ'),
          title: '青エールを送る〈ムーナ・ホシノヴァ〉を選択',
        });
        if (!chosen) return;
        target = chosen;
      }

      // 公開して送る
      ctx.removeFromCheerDeck(blueCheer);
      ctx.log(`${ctx.player.name}: エールデッキから ${blueCheer.name} を公開`);
      ctx.flashReveal(blueCheer);
      ctx.attachCheer(blueCheer, target.holomem);

      // エールデッキをシャッフル
      ctx.shuffleCheerDeck();
    },
  },
};
