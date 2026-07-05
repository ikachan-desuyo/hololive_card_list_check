/**
 * 戌神ころね（hSD03-010）無色・Spot・HP70（#JP #ゲーマーズ #ケモミミ）
 *
 * コラボエフェクト「泥棒建設インターン」:
 *   自分のセンターホロメンが〈猫又おかゆ〉の時、
 *   自分のデッキから、[マスコットかファン]1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *
 * - 条件: センターホロメンの名前が「猫又おかゆ」（〈名称〉参照なので任意バージョン可）。
 * - 対象: デッキ内の サポート・マスコット または サポート・ファン（supportType で判定）。
 * - 「公開し手札に加える」→ addToHand(reveal:true)。「そして」→条件を満たせば常にデッキをシャッフル。
 * - 該当カードが無い場合でも、条件を満たした以上はデッキをシャッフルする（公開できる対象が無いだけ）。
 */
export default {
  number: 'hSD03-010',
  collabEffect: {
    name: '泥棒建設インターン',
    *run(ctx) {
      const center = ctx.player.center;
      if (!center || center.stack[0].name !== '猫又おかゆ') {
        ctx.log('センターホロメンが〈猫又おかゆ〉ではないため、効果は発動しない');
        return;
      }
      const candidates = ctx.deckCards(
        (c) => c.kind === 'support' && (c.supportType === 'マスコット' || c.supportType === 'ファン'),
      );
      if (candidates.length === 0) {
        ctx.log(`${ctx.player.name}: デッキにマスコット/ファンが無い`);
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加えるマスコット/ファンを選択',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
