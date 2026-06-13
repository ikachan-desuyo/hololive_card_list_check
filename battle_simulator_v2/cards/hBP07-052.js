/**
 * オーロ・クロニー (hBP07-052) 青・1st・HP160（#EN #Promise）
 * コラボエフェクト「お時間ですわ！」:
 *   自分のアーカイブのマスコット1枚をこのホロメンに付けられる。（任意・1枚まで）
 * アーツ「私の新キャッチフレーズ。どうだい？」(30+):
 *   自分のステージに〈オーロ・クロニー〉以外の#Promiseを持つホロメンがいるなら、このアーツ+10。
 */
export default {
  number: 'hBP07-052',

  collabEffect: {
    name: 'お時間ですわ！',
    *run(ctx) {
      const self = ctx.sourceHolomem;
      // アーカイブのマスコットで、このホロメンに付けられるもの（マスコットは1人1枚制限）
      const mascots = ctx.player.archive.filter(
        (c) => c.kind === 'support' && c.supportType === 'マスコット' && ctx.engine._canAttachSupport(self, c),
      );
      if (mascots.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: mascots,
        title: 'このホロメンに付けるマスコットを選ぶ（任意）',
        optional: true,
        skipLabel: '付けない',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.attachSupport(picked, self);
    },
  },

  arts: {
    '私の新キャッチフレーズ。どうだい？': {
      dmgBonus(ctx) {
        // 〈オーロ・クロニー〉以外の#Promiseホロメンがステージにいるなら+10
        const hasOther = ctx
          .holomems('self', (e) => e.top && e.top.name !== 'オーロ・クロニー' && ctx.hasTag(e.top, 'Promise'))
          .length > 0;
        return hasOther ? 10 : 0;
      },
    },
  },
};
