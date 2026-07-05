/**
 * アーニャ・メルフィッサ (hBP04-007) 推しホロメン
 * 推しスキル「神秘の儀式」[ホロパワー：-2][ターンに1回]:
 *   自分のデッキから、〈古代武器〉1枚を公開し、自分のホロメンに付ける。デッキをシャッフルする。
 * SP推しスキル「人生のこと考えていた方が勝てる」[ホロパワー：-2][ゲームに1回]:
 *   自分のアーカイブのエールを、自分の〈古代武器〉が付いているホロメン全員に1枚ずつ送る。
 */
export default {
  number: 'hBP04-007',
  oshiSkill: {
    *run(ctx) {
      const candidates = ctx.deckCards((c) => c.name === '古代武器');
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'デッキから〈古代武器〉を選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: '〈古代武器〉を付けるホロメンを選択',
        });
        if (target) {
          ctx.removeFromDeck(picked);
          ctx.attachSupport(picked, target.holomem);
        }
      }
      ctx.shuffleDeck();
    },
  },
  spOshiSkill: {
    *run(ctx) {
      // 〈古代武器〉が付いているホロメン全員に、アーカイブのエールを1枚ずつ送る
      const targets = ctx.holomems('self', (e) =>
        e.holomem.attachments.some((a) => a.name === '古代武器'));
      for (const t of targets) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: `${t.top.name} に送るエールを選択（アーカイブから・任意）`,
          optional: true,
          skipLabel: 'このホロメンには送らない',
        });
        if (picked) {
          ctx.removeFromArchive(picked);
          ctx.attachCheer(picked, t.holomem);
        }
      }
    },
  },
};
