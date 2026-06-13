/**
 * オーロ・クロニー (hBP01-095)
 * コラボエフェクト: 相手のバックホロメン1人をDebutホロメンに戻す
 *   （ダメージを無くした後、Debutホロメン1枚とエールすべてを残し、他のカードすべてを手札に戻す）。
 * アーツ: 自分のこのターンに出したDebutバックホロメン1人を、自分の手札の1stホロメンにBloomできる。
 */
export default {
  number: 'hBP01-095',
  collabEffect: {
    name: '巻き戻し',
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'back' &&
          e.holomem.stack.some((c) => c.bloomLevel === 'Debut'),
        title: 'Debutホロメンに戻す相手のバックホロメンを選択',
      });
      if (!entry) return;
      const h = entry.holomem;
      const opp = ctx.opponent;
      h.damage = 0;
      const debutIdx = h.stack.findIndex((c) => c.bloomLevel === 'Debut');
      const debut = h.stack[debutIdx];
      const others = h.stack.filter((c, i) => i !== debutIdx);
      opp.hand.push(...others, ...h.attachments);
      h.stack = [debut];
      h.attachments = [];
      ctx.log(`${debut.name} をDebutホロメンに戻した（他のカードは相手の手札へ）`);
    },
  },
  arts: {
    '早送り': {
      *run(ctx) {
        const turn = ctx.state.turn;
        const targets = ctx.holomems('self', (e) =>
          e.pos.zone === 'back' &&
          e.top.bloomLevel === 'Debut' &&
          e.holomem.placedTurn === turn);
        const candidates = ctx.player.hand.filter((c) =>
          c.kind === 'holomen' && c.bloomLevel === '1st' &&
          targets.some((e) => e.top.name === c.name && c.hp > e.holomem.damage));
        if (targets.length === 0 || candidates.length === 0) return;
        const ok = yield ctx.confirm('このターンに出したDebutホロメンをBloomさせますか？');
        if (!ok) return;
        const card = yield ctx.chooseCard({ cards: candidates, title: 'Bloomさせる1stホロメンを選択' });
        if (!card) return;
        const entry = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.pos.zone === 'back' && e.top.bloomLevel === 'Debut' &&
            e.holomem.placedTurn === turn && e.top.name === card.name && card.hp > e.holomem.damage,
          title: 'Bloomさせるホロメンを選択',
        });
        if (!entry) return;
        ctx.removeFromHand(card);
        entry.holomem.stack.unshift(card);
        entry.holomem.bloomedTurn = turn;
        ctx.log(`${entry.holomem.stack[1].name} → ${card.name}〔1st〕にBloom（効果による）`);
        const def = ctx.engine.registry.get(card.number)?.bloomEffect;
        if (def) {
          ctx.log(`《ブルームエフェクト》${def.name}`);
          yield* def.run(ctx);
        }
      },
    },
  },
};
