/**
 * 博衣こより (hBP06-021) 白・2nd・HP190（#秘密結社holoX）
 * コラボエフェクト「君に届けっ」:
 *   このターンの間、自分のステージの#秘密結社holoXを持つホロメン1人のアーツ+30。
 *   このホロメンに#こよラボを持つサポートカードが付いているなら、かわりに、そのホロメンのアーツ+50。
 * アーツ「青春の１ページ」(90+):
 *   自分のアーカイブの#こよラボを持つサポートカード1枚をデッキの下に戻せる：このアーツ+40。
 */
export default {
  number: 'hBP06-021',
  collabEffect: {
    name: '君に届けっ',
    *run(ctx) {
      const hasLab = ctx.sourceHolomem.attachments.some((a) => (a.tags || []).includes('こよラボ'));
      const amount = hasLab ? 50 : 30;
      const target = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => ctx.hasTag(e.top, '秘密結社holoX'),
        title: `このターン アーツ+${amount}する #秘密結社holoX ホロメンを選択`,
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+${amount}`,
      });
    },
  },
  arts: {
    '青春の１ページ': {
      *run(ctx) {
        const labs = ctx.player.archive.filter((c) => c.kind === 'support' && (c.tags || []).includes('こよラボ'));
        if (labs.length === 0) return;
        const ok = yield ctx.confirm('アーカイブの#こよラボを1枚デッキの下に戻してこのアーツ+40しますか？');
        if (!ok) return;
        const picked = yield ctx.chooseCard({ cards: labs, title: 'デッキの下に戻す#こよラボサポートを選択' });
        if (!picked) return;
        ctx.removeFromArchive(picked);
        ctx.deckToBottom([picked]);
        ctx.addArtBonus(40, '#こよラボをデッキ下へ');
      },
    },
  },
};
