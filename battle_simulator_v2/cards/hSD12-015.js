/**
 * 脱獄を果たした共犯者たち (hSD12-015) サポート・イベント
 *
 * [サポート効果] このカードは、自分のステージのホロメン全員が#Adventを持つホロメンでなければ使えない。
 *   → 自分のステージにホロメンがいて、その全員が #Advent を持つ場合のみ使える。
 * 効果: 相手のセンターホロメンに特殊ダメージ20を与える。
 *       その後、自分のアーカイブのエール1枚を自分のホロメンに送る。
 * 自分の〈脱獄を果たした共犯者たち〉はターンに1回しか使えない（カード名でターン1回制限）。
 *
 * 実装方針:
 *   - 使用条件: ステージのホロメンが1人以上いて、その全員が #Advent。
 *     かつ、このカード名をこのターンまだ使っていない（markOncePerTurn / oncePerTurnUsed）。
 *   - 特殊ダメージ20を相手センターへ（dealSpecialDamage）。相手センターがいなければその部分はスキップ。
 *   - 「その後、アーカイブのエール1枚を自分のホロメンに送る」：テキストは「送る」（任意ではない）。
 *     アーカイブにエールが無い、または送り先ホロメンがいない場合は送れないだけ。
 *     どのエールをどのホロメンに送るかは選択（複数ある場合に意味がある）。
 */
const ONCE_KEY = 'hSD12-015:脱獄を果たした共犯者たち';

export default {
  number: 'hSD12-015',
  support: {
    canUse(ctx) {
      if (ctx.oncePerTurnUsed(ONCE_KEY)) return false;
      const stage = ctx.holomems('self', () => true);
      if (stage.length === 0) return false;
      return stage.every((e) => ctx.hasTag(e.top, 'Advent'));
    },
    *run(ctx) {
      ctx.markOncePerTurn(ONCE_KEY);

      // 相手のセンターホロメンに特殊ダメージ20
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (center) yield* ctx.dealSpecialDamage(center, 20);

      // その後、自分のアーカイブのエール1枚を自分のホロメンに送る
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) return;
      const ownHolomems = ctx.holomems('self', () => true);
      if (ownHolomems.length === 0) return;

      const picked = yield ctx.chooseCard({
        cards: cheers,
        title: 'アーカイブから送るエールを選択',
      });
      if (!picked) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'エールを送るホロメンを選択',
      });
      if (!target) return;
      ctx.removeFromArchive(picked);
      ctx.attachCheer(picked, target.holomem);
    },
  },
};
