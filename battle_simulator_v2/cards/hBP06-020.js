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
      let archivedCount = 0;
      for (let i = 0; i < 2 && ctx.player.deck.length > 0; i++) {
        ctx.player.archive.push(ctx.player.deck.shift());
        archivedCount++;
      }
      ctx.recordDeckArchive(archivedCount);
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
        // 1～3枚をアーカイブ（枚数を先に宣言してからまとめてアーカイブ。
        // デッキの上の中身は見られないため、途中で結果を見て止める段階的処理にはしない。Q516）
        const count = yield {
          kind: 'choose', player: ctx.playerIdx, title: 'デッキの上から何枚アーカイブしますか？',
          buildOptions: () => {
            const opts = [];
            for (let n = 1; n <= max; n++) opts.push({ id: `n_${n}`, label: `${n}枚`, value: n });
            return opts;
          },
        };
        if (!count) return;
        for (let i = 0; i < count && ctx.player.deck.length > 0; i++) {
          ctx.player.archive.push(ctx.player.deck.shift());
        }
        if (count > 0) {
          ctx.recordDeckArchive(count);
          ctx.log(`デッキの上から${count}枚をアーカイブした`);
          ctx.addArtBonus(count * 20, `アーカイブ${count}枚`);
        }
      },
    },
  },
};
