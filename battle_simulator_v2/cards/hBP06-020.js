/**
 * 響咲リオナ (hBP06-020) 白・2nd・HP200（#FLOW GLOW）
 * ギフト「意志の指揮者」: 相手のターンで、このホロメンがダウンした時、自分のデッキの上から2枚を
 *   アーカイブできる。アーカイブしたなら、自分のステージの異なるカード名の#FLOW GLOWを持つホロメン1人につき、
 *   自分のデッキを1枚引く。
 * アーツ「レゾナンスロア」(150+): 自分のデッキの上から1～3枚をアーカイブする。アーカイブしたカード1枚につき、このアーツ+20。
 */
const isFlowGlow = (ctx, top) => ctx.hasTag(top, 'FLOW') && ctx.hasTag(top, 'GLOW');

export default {
  number: 'hBP06-020',
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      if (ctx.player.deck.length === 0) return;
      const ok = yield ctx.confirm('デッキの上から2枚をアーカイブしますか？');
      if (!ok) return;
      for (let i = 0; i < 2 && ctx.player.deck.length > 0; i++) {
        ctx.player.archive.push(ctx.player.deck.shift());
      }
      ctx.log('デッキの上から2枚をアーカイブした');
      const names = new Set();
      for (const e of ctx.holomems('self', (x) => isFlowGlow(ctx, x.top))) names.add(e.top.name);
      if (names.size > 0) ctx.draw(names.size);
    },
  },
  arts: {
    'レゾナンスロア': {
      *run(ctx) {
        const max = Math.min(3, ctx.player.deck.length);
        if (max === 0) return;
        // 1～3枚をアーカイブ（枚数を選ぶ: 1枚ずつ「まだ削るか」）
        let count = 0;
        for (let i = 0; i < max; i++) {
          const more = i === 0
            ? true
            : yield ctx.confirm(`さらにデッキの上をアーカイブしますか？（現在${count}枚）`, 'する', 'やめる');
          if (!more) break;
          if (ctx.player.deck.length === 0) break;
          ctx.player.archive.push(ctx.player.deck.shift());
          count++;
        }
        if (count > 0) {
          ctx.log(`デッキの上から${count}枚をアーカイブした`);
          ctx.addArtBonus(count * 20, `アーカイブ${count}枚`);
        }
      },
    },
  },
};
