/**
 * オーロ・クロニー (hBP07-050) 紫・Debut #EN #Promise HP130
 * コラボエフェクト「この日が来た！」: 自分が後攻で最初のターンなら、自分のセンターホロメンの
 *   〈オーロ・クロニー〉を、自分の手札の1stホロメンを使ってBloomできる。この能力では最初のターンでもBloomできる。
 *   → collabEffect。後攻初手のみ。センターの同名オーロを手札の1stでBloom（通常のターン制限を迂回する効果Bloom）。
 * アーツ「紫色のレアー」(10): テキスト効果なし。
 */
export default {
  number: 'hBP07-050',
  collabEffect: {
    name: 'この日が来た！',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      // センターホロメンが〈オーロ・クロニー〉であること（別名 nameAliases 込み）を確認
      const centerEntry = ctx.holomems('self',
        (e) => e.pos.zone === 'center' && ctx.nameIs(e.top, 'オーロ・クロニー'))[0];
      if (!centerEntry) return;
      const center = centerEntry.holomem;
      // 手札の1stホロメンで、このセンターにBloomできるもの（同名・HP>ダメージ）
      const candidates = ctx.player.hand.filter((c) =>
        c.kind === 'holomen' && c.bloomLevel === '1st' && ctx.engine._canBloom(center, c));
      if (candidates.length === 0) return;
      const card = yield ctx.chooseCard({
        cards: candidates,
        title: 'センターをBloomさせる手札の1stホロメンを選択（任意）',
        optional: true,
        skipLabel: 'Bloomしない',
      });
      if (!card) return;
      // 手札から取り除いてBloom
      const i = ctx.player.hand.indexOf(card);
      if (i !== -1) ctx.player.hand.splice(i, 1);
      center.stack.unshift(card);
      center.bloomedTurn = ctx.state.turn;
      ctx.log(`${center.stack[1].name} → ${card.name}〔${card.bloomLevel}〕にBloom（コラボエフェクト）`);
      // ブルームエフェクトを誘発
      const def = ctx.engine.registry.get(card.number)?.bloomEffect;
      if (def) {
        ctx.log(`《ブルームエフェクト》${def.name}`);
        yield* ctx.runBloomEffect(def, card, center);
      }
    },
  },
};
