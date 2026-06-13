/**
 * 音乃瀬奏 (hBP08-083) 黄・ホロメン・2nd・HP190 / #DEV_IS #ReGLOSS #歌
 *
 * ブルームエフェクト「テンション超アップ！」:
 *   自分のステージのエールの枚数が相手以下なら、自分のアーカイブのエール1～2枚をこのホロメンに送る。
 *   → 自分のステージ全体のエール総枚数 ≤ 相手のステージ全体のエール総枚数 の時に発動。
 *     アーカイブのエールから1枚（必須）、続けて2枚目を任意で選び、このホロメン(sourceHolomem)へ送る。
 *     「1～2枚」=最低1枚（「まで」表記が無いので0枚不可）、最大2枚。アーカイブにエールが無ければ何もしない。
 *     送り先は「このホロメン」固定なので対象選択は無し。
 *
 * アーツ「奏オンステージ」(120+, [yellow][yellow][any] 特攻[青+50]):
 *   自分のステージのエールの枚数が相手より多いなら、多い枚数1枚につき、このアーツ+20。
 *   → dmgBonus(ctx): (自分のステージのエール総枚数 - 相手のステージのエール総枚数) が正なら ×20、そうでなければ0。
 *     特攻[青+50]はエンジンが基本ダメージ処理で扱うため記述不要。
 *
 * 保留: なし（ブルームエフェクト・アーツとも全文実装）。
 */

/** プレイヤー(side)のステージ上のエール総枚数 */
function stageCheerCount(ctx, side) {
  let n = 0;
  for (const e of ctx.holomems(side)) {
    n += (e.holomem.cheers || []).length;
  }
  return n;
}

export default {
  number: 'hBP08-083',

  bloomEffect: {
    name: 'テンション超アップ！',
    *run(ctx) {
      const self = ctx.sourceHolomem;
      if (!self) return;

      // 自分のステージのエール枚数が相手以下なら発動
      const own = stageCheerCount(ctx, 'self');
      const opp = stageCheerCount(ctx, 'opp');
      if (own > opp) {
        ctx.log(`テンション超アップ！: 自分のエール枚数(${own})が相手(${opp})より多いため発動しない`);
        return;
      }

      // アーカイブのエール1～2枚をこのホロメンに送る（1枚必須、2枚目は任意）
      let archiveCheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (archiveCheers.length === 0) {
        ctx.log('テンション超アップ！: アーカイブにエールがない');
        return;
      }

      const first = yield ctx.chooseCard({
        cards: archiveCheers,
        title: 'このホロメンに送るエールを選択（1枚目）',
      });
      if (!first) return;
      ctx.removeFromArchive(first);
      ctx.attachCheer(first, self);

      // 2枚目（任意）
      archiveCheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (archiveCheers.length === 0) return;
      const second = yield ctx.chooseCard({
        cards: archiveCheers,
        title: 'このホロメンに送るエールを選択（2枚目・任意）',
        optional: true,
        skipLabel: '1枚だけにする',
      });
      if (!second) return;
      ctx.removeFromArchive(second);
      ctx.attachCheer(second, self);
    },
  },

  arts: {
    '奏オンステージ': {
      // 自分のステージのエール枚数が相手より多いなら、多い枚数1枚につき +20
      dmgBonus(ctx) {
        const own = stageCheerCount(ctx, 'self');
        const opp = stageCheerCount(ctx, 'opp');
        const diff = own - opp;
        return diff > 0 ? diff * 20 : 0;
      },
    },
  },
};
