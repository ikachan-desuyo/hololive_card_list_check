/**
 * 紫咲シオン (hBP04-060) Buzzホロメン・紫・HP240・1st
 *
 * ブルームエフェクト「エールリバース」:
 *   相手のアーカイブのエール1枚を、相手のセンターホロメンに送れる。
 *   → 「送れる」=任意。コントローラー（自分）が相手アーカイブのエールを1枚選び、相手センターへ送る。
 *     相手アーカイブからの取り出しは配列操作（context の removeFromArchive は this.player 向け）だが、
 *     付与は ctx.attachCheer を使う（所有者非依存。「エールが付いた時」の装着カード同期トリガーを発火させるため）。
 *     相手センターが居ない/エールが無ければ何もしない。
 *     ※自分のアーツ「ゲーム配信中」が相手センターのエール数に比例するため、相手にエールを与えて
 *       火力を伸ばすコンボ。
 *
 * アーツ「ゲーム配信中」(40):
 *   相手のセンターホロメンとコラボホロメンに、相手のセンターホロメンのエール1枚につき、特殊ダメージ10を与える。
 *   → 基本ダメージ40はエンジンが処理。テキスト効果として、相手センターのエール枚数×10の特殊ダメージを
 *     相手センターと相手コラボの両方に与える（dealSpecialDamage は yield* で呼ぶ）。
 *     特殊ダメージ量はアーツ解決開始時点の相手センターのエール枚数で固定し、両対象に同額を与える。
 */
export default {
  number: 'hBP04-060',
  bloomEffect: {
    name: 'エールリバース',
    *run(ctx) {
      const oppCenter = ctx.opponent.center;
      if (!oppCenter) {
        ctx.log('相手のセンターホロメンが居ないため発動できない');
        return;
      }
      const cheers = ctx.opponent.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) {
        ctx.log('相手のアーカイブにエールが無い');
        return;
      }
      // 「送れる」=任意。送るエールをコントローラーが選ぶ（選ばないも可）。
      const cheer = yield ctx.chooseCard({
        cards: cheers,
        title: '相手のセンターホロメンに送るエールを相手のアーカイブから選択',
        optional: true,
        skipLabel: '送らない',
      });
      if (!cheer) return;
      const i = ctx.opponent.archive.indexOf(cheer);
      if (i !== -1) ctx.opponent.archive.splice(i, 1);
      ctx.log(`相手のアーカイブの ${cheer.name} を相手のセンターホロメン（${oppCenter.stack[0].name}）に送る`);
      // attachCheer 経由で「エールが付いた時」の装着カード同期トリガー（hBP03-113 等）を発火させる
      ctx.attachCheer(cheer, oppCenter);
    },
  },
  arts: {
    'ゲーム配信中': {
      *run(ctx) {
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        const collab = ctx.holomems('opp', (e) => e.pos.zone === 'collab')[0];
        // 特殊ダメージ量は相手センターのエール枚数で決まる
        const cheerCount = center ? center.holomem.cheers.length : 0;
        const dmg = cheerCount * 10;
        if (dmg === 0) {
          ctx.log('相手のセンターホロメンのエールが0枚のため特殊ダメージなし');
          return;
        }
        // 相手のセンターホロメンとコラボホロメンの両方に同額を与える
        if (center) yield* ctx.dealSpecialDamage(center, dmg);
        if (collab) yield* ctx.dealSpecialDamage(collab, dmg);
      },
    },
  },
};
