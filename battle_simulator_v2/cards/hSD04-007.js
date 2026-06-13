/**
 * 癒月ちょこ (hSD04-007) 紫・1st・HP110（#JP #2期生 #料理）
 * ブルームエフェクト「ちょっこーん！」:
 *   自分のアーカイブのLIMITED以外のイベント1枚を手札に戻せる。（「戻せる」=任意・対象0可）
 * アーツ「大好き！ちゅっ♡」(30):
 *   自分のバックホロメン1人のHP20回復。
 */
export default {
  number: 'hSD04-007',
  bloomEffect: {
    name: 'ちょっこーん！',
    *run(ctx) {
      const events = ctx.player.archive.filter(
        (c) => c.kind === 'support' && c.supportType === 'イベント' && !c.limited,
      );
      if (events.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: events,
        title: 'アーカイブのLIMITED以外のイベント1枚を手札に戻す',
        optional: true,
        skipLabel: '戻さない',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked);
    },
  },
  arts: {
    '大好き！ちゅっ♡': {
      *run(ctx) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.pos.zone === 'back',
          title: 'HP20回復するバックホロメンを選択',
          optional: true,
        });
        if (target) ctx.heal(target.holomem, 20);
      },
    },
  },
};
