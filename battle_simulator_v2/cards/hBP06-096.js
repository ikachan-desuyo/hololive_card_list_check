/**
 * 2人あわせてラムダック！ (hBP06-096) サポート・イベント・LIMITED
 * 自分の[〈角巻わため〉と〈大空スバル〉]1人ずつを選ぶ。自分のアーカイブのエールを選んだホロメンに
 * 1枚ずつ送る。その後、このターンの間、選んだホロメンのアーツ+20。
 * LIMITED：ターンに1枚しか使えない。
 */
export default {
  number: 'hBP06-096',
  support: {
    canUse(ctx) {
      return ctx.holomems('self', (e) => ctx.nameIs(e.top, '角巻わため')).length > 0 &&
        ctx.holomems('self', (e) => ctx.nameIs(e.top, '大空スバル')).length > 0;
    },
    *run(ctx) {
      const chosen = [];
      for (const name of ['角巻わため', '大空スバル']) {
        const entry = yield ctx.chooseHolomem({
          // ラムダック等〈角巻わため〉〈大空スバル〉両名のカードを拾い、
          // かつ既に選んだホロメンは除外して同一ホロメンの2枠重複選択を防ぐ。
          side: 'self', filter: (e) => ctx.nameIs(e.top, name) && !chosen.includes(e.holomem),
          title: `〈${name}〉を選択`,
        });
        if (!entry) continue;
        chosen.push(entry.holomem);
        // アーカイブのエールを1枚送る（「送る」＝強制。アーカイブは公開領域なのでエールがあれば必ず送る）
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length > 0) {
          const picked = yield ctx.chooseCard({
            cards: cheers, title: `${name} に送るエールを選択（アーカイブ）`,
          });
          if (picked) { ctx.removeFromArchive(picked); ctx.attachCheer(picked, entry.holomem); }
        }
      }
      for (const h of chosen) {
        ctx.addTurnModifier({
          kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
          match: (x) => x === h,
          description: `このターン、${h.stack[0].name} のアーツ+20`,
        });
      }
    },
  },
};
