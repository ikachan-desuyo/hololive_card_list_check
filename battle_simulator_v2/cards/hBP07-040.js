/**
 * 赤井はあと (hBP07-040) 赤・1st・HP170（#JP #1期生 #料理）
 * コラボエフェクト「Haachama ♥ Restaurant」:
 *   自分のバックポジションのDebutホロメンの〈赤井はあと〉1人をデッキの下に戻せる：
 *   自分のデッキから、Buzz以外の[1stホロメンか2ndホロメン]1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 *
 * 実装メモ:
 *   - 「戻せる」=コスト支払いは任意。支払えない（対象不在）／支払わない場合は効果が発動しない。
 *   - 戻す対象はバックの Debut（スタック先頭が Debut）の〈赤井はあと〉。
 *     ステージを離れるので付いているエール／サポートはアーカイブへ、本体スタックはデッキの下へ
 *     （hBP07-004 推しスキルと同じ扱い。4.4.7 相当）。
 *   - 検索対象は「Buzz以外の 1st か 2nd ホロメン」（名称・色・タグ指定なし）。
 *   - 公開して手札に加えた後、デッキをシャッフルする。
 */
export default {
  number: 'hBP07-040',
  collabEffect: {
    name: 'Haachama ♥ Restaurant',
    *run(ctx) {
      // 1) コスト: バックの Debut〈赤井はあと〉1人をデッキの下に戻せる（任意）
      const back = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) =>
          e.pos.zone === 'back' && e.top.name === '赤井はあと' && e.top.bloomLevel === 'Debut',
        title: 'デッキの下に戻すバックの Debut〈赤井はあと〉を選択（戻すと効果発動）',
        optional: true,
      });
      if (!back) return; // コストを支払わない／対象不在なら効果なし

      const h = back.holomem;
      if (h.cheers.length || h.attachments.length) {
        ctx.player.archive.push(...h.cheers, ...h.attachments);
        ctx.log(`${back.top.name} の付属カードをアーカイブ`);
      }
      ctx.engine._removeHolomem(ctx.player, back.pos);
      ctx.deckToBottom(h.stack);
      ctx.log(`${back.top.name} をデッキの下に戻した`);

      // 2) デッキから Buzz以外の 1st/2nd ホロメン1枚を公開して手札に加える
      const candidates = ctx.deckCards(
        (c) => c.kind === 'holomen' && !c.buzz && ['1st', '2nd'].includes(c.bloomLevel),
      );
      if (candidates.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: '手札に加える Buzz以外の[1st/2nd]ホロメンを選択',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.flashReveal(picked);
          ctx.addToHand(picked, { reveal: true });
        }
      } else {
        ctx.log('デッキに Buzz以外の[1st/2nd]ホロメンがいない');
      }

      // 3) デッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
