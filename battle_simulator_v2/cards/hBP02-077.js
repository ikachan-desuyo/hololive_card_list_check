/**
 * レトロパソコン (hBP02-077) サポート・アイテム・LIMITED
 *
 * [サポート効果] このカードは、自分のライフが3以下でなければ使えない。
 *   自分のアーカイブのホロメン1枚を手札に戻す。
 * LIMITED：ターンに1枚しか使えない（エンジンがLIMITED制御）。
 *
 * 解釈:
 *   - 使用条件「ライフが3以下でなければ使えない」= 自分のライフ枚数 (player.life.length) が 3 以下。
 *   - 効果「1枚を手札に戻す」=「戻せる」ではないので任意ではない。
 *     ただしアーカイブにホロメンが1枚も無ければ戻すものが無いだけ（canUse でも弾く）。
 *   - 戻す対象が複数あるときは「どのホロメンを戻すか」のみプレイヤーが選ぶ（枚数は1枚固定・必須）。
 */
export default {
  number: 'hBP02-077',
  ai: {
    // ライフ3以下でのみ使える。アーカイブにホロメンがあれば手札補充になる。
    supportValue({ player }) {
      if (player.life.length > 3) return 0;
      const hasHolomem = player.archive.some((c) => c.kind === 'holomem');
      return hasHolomem ? 12 : 0;
    },
  },
  support: {
    canUse(ctx) {
      // ライフが3以下でなければ使えない／戻せるホロメンが無いなら使えない
      if (ctx.player.life.length > 3) return false;
      return ctx.player.archive.some((c) => c.kind === 'holomem');
    },
    *run(ctx) {
      const cand = ctx.player.archive.filter((c) => c.kind === 'holomem');
      if (cand.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'アーカイブのホロメン1枚を手札に戻す',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked, { reveal: false });
    },
  },
};
