/**
 * 猫又おかゆ (hSD03-003) 青・Debut・HP70（#ゲーマーズ）
 * コラボエフェクト「お家にお邪魔します…！」:
 *   自分のセンターホロメンが#ゲーマーズを持つ時、相手のセンターホロメンとバックホロメン1人に
 *   特殊ダメージ10を与える。ただし、ダウンしても相手のライフは減らない。
 *   → 条件: 自分センターが#ゲーマーズ。相手センターへ特殊10（自動）＋相手バック1人へ特殊10（選択）。
 *     いずれも noLifeOnDown。
 * アーツ「僕をお家に入れてください」(青/dmg10): テキスト効果なし（追加実装不要）。
 */
export default {
  number: 'hSD03-003',
  collabEffect: {
    name: 'お家にお邪魔します…！',
    *run(ctx) {
      // 自分のセンターホロメンが #ゲーマーズ を持つかを確認
      const center = ctx.holomems('self', (e) => e.pos.zone === 'center')[0];
      if (!center || !ctx.hasTag(center.top, 'ゲーマーズ')) {
        ctx.log('自分のセンターが#ゲーマーズを持たないため発動しない');
        return;
      }
      // 相手のセンターホロメンに特殊ダメージ10（ダウンしてもライフは減らない）
      const oppCenter = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (oppCenter) ctx.dealSpecialDamage(oppCenter, 10, { noLifeOnDown: true });
      // 相手のバックホロメン1人に特殊ダメージ10（ダウンしてもライフは減らない）
      const backTarget = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'back',
        title: '特殊ダメージ10を与える相手バックホロメンを選択',
        optional: true,
      });
      if (backTarget) ctx.dealSpecialDamage(backTarget, 10, { noLifeOnDown: true });
    },
  },
};
