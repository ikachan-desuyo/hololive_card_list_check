/**
 * アーニャ・メルフィッサ (hBP04-007) 推しホロメン
 * 推しスキル「神秘の儀式」[ホロパワー：-2][ターンに1回]:
 *   自分のデッキから、〈古代武器〉1枚を公開し、自分のホロメンに付ける。デッキをシャッフルする。
 *   付け先はツール上限（1人1枚）を満たすホロメンのみ（engine._canAttachSupport で判定）。
 * SP推しスキル「人生のこと考えていた方が勝てる」[ホロパワー：-2][ゲームに1回]:
 *   自分のアーカイブのエールを、自分の〈古代武器〉が付いているホロメン全員に1枚ずつ送る。
 *   「送る」＝強制（アーカイブにエールがある限り全員に1枚ずつ。送るエールの選択のみプレイヤーが行う）。
 */
export default {
  number: 'hBP04-007',
  oshiSkill: {
    *run(ctx) {
      const candidates = ctx.deckCards((c) => ctx.nameIs(c, '古代武器'));
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'デッキから〈古代武器〉を選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        // ツールは1人につき1枚まで（〈古代武器〉自身のテキスト）。付けられるホロメンのみ候補にする
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.engine._canAttachSupport(e.holomem, picked),
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
      // 〈古代武器〉が付いているホロメン全員に、アーカイブのエールを1枚ずつ送る（強制）
      const targets = ctx.holomems('self', (e) =>
        e.holomem.attachments.some((a) => ctx.nameIs(a, '古代武器')));
      for (const t of targets) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: `${t.top.name} に送るエールを選択（アーカイブから）`,
        });
        if (picked) {
          ctx.removeFromArchive(picked);
          ctx.attachCheer(picked, t.holomem);
        }
      }
    },
  },
};
