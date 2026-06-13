/**
 * 音乃瀬奏 (hBP08-081) 黄・ホロメン・1st・HP150（#DEV_IS #ReGLOSS #歌）
 *
 * ブルームエフェクト「音の饗宴」:
 *   自分のアーカイブのエール1枚を自分のセンターホロメンの〈音乃瀬奏〉に送る。
 *   → bloomEffect。送り先は「自分のセンターホロメンが〈音乃瀬奏〉である場合のみ」。
 *     センターが居ない／センターの名前が「音乃瀬奏」でない場合は対象不在で何もしない。
 *     アーカイブにエール（kind==='cheer'）が無ければ何もしない。
 *     エールが複数あればコントローラー（自分）が1枚選ぶ。
 *     「1枚を…送る」＝強制（条件・対象が揃えば必ず1枚送る）。
 *     removeFromArchive → attachCheer で移送する（hBP01-008 と同じ手順）。
 *
 * アーツ「今年も伸び盛り」(40+ / [黄][無]):
 *   [センターポジション限定]自分のステージのエールの枚数が相手より1枚多いなら、このアーツ+20。
 *   エールが2枚以上多いなら、かわりに、このアーツ+40。
 *   → dmgBonus。素点40はエンジンが処理する。
 *     [センターポジション限定]: 発生源がセンターに居る時のみ加算（hBP05-012 と同じく _zoneOf で判定）。
 *     差分 = 自分のステージのエール総数 − 相手のステージのエール総数。
 *       差分 >= 2 なら +40、差分 === 1 なら +20、それ以外（0以下）は +0。
 *     「1枚多い」=厳密に差1、「2枚以上多い」=差2以上。エールは holomem.cheers を全前衛/バック合算。
 *
 * 保留: なし（ブルームエフェクト・アーツとも全文実装）。
 */
const SELF_NAME = '音乃瀬奏';

export default {
  number: 'hBP08-081',

  bloomEffect: {
    name: '音の饗宴',
    *run(ctx) {
      // 送り先は「自分のセンターホロメンの〈音乃瀬奏〉」のみ
      const center = ctx.player.center;
      if (!center || center.stack[0].name !== SELF_NAME) {
        ctx.log('音の饗宴: 自分のセンターに〈音乃瀬奏〉がいないため発動しない');
        return;
      }
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) {
        ctx.log('音の饗宴: アーカイブにエールがない');
        return;
      }
      const cheer = yield ctx.chooseCard({
        cards: cheers,
        title: 'センターの〈音乃瀬奏〉に送るエールを選択',
      });
      if (!cheer) return;
      ctx.removeFromArchive(cheer);
      ctx.attachCheer(cheer, center);
    },
  },

  arts: {
    '今年も伸び盛り': {
      dmgBonus(ctx) {
        // [センターポジション限定]
        if (ctx.engine._zoneOf(ctx.sourceHolomem) !== 'center') return 0;
        const own = ctx.holomems('self').reduce((s, e) => s + e.holomem.cheers.length, 0);
        const opp = ctx.holomems('opp').reduce((s, e) => s + e.holomem.cheers.length, 0);
        const diff = own - opp;
        if (diff >= 2) return 40; // 2枚以上多い → かわりに +40
        if (diff === 1) return 20; // 1枚多い → +20
        return 0;
      },
    },
  },
};
