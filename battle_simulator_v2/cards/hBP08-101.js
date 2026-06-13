/**
 * We are ReGLOSS (hBP08-101) サポート・イベント・LIMITED
 *
 * [使用条件]
 *   このカードは、自分のステージのホロメン全員が #ReGLOSS を持つホロメンでなければ使えない。
 *   → ステージ上の全ホロメンが #ReGLOSS タグを持つ場合のみ使用可（every）。
 *
 * [サポート効果]
 *   ① 自分のデッキから、#ReGLOSS を持つホロメン2枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *      - 「2枚」= #ReGLOSS ホロメンを最大2枚（候補が足りなければ取れる分だけ。デッキは非公開領域なので許容）。
 *        1枚ずつ選んで取り除く（同じカードを二重に選ばないよう、選ぶたびに deckCards を再評価）。
 *   ② その後、自分のステージのホロメンが相手より少ないなら、自分のデッキを1枚引いた後、手札1枚をアーカイブする。
 *      - 「少ないなら」= ステージ上ホロメン数の厳密比較（self < opp）。
 *      - ドローは1枚。その後の手札1枚アーカイブは「アーカイブする」＝強制（任意ではない）。
 *        手札が空（引けず、かつ元々空）の場合のみアーカイブは行えない。
 *   LIMITED：ターンに1枚しか使えない（LIMITED制御はエンジン側）。
 *
 * 保留: なし（全文実装）。
 */
export default {
  number: 'hBP08-101',
  support: {
    canUse(ctx) {
      // 自分のステージのホロメン全員が #ReGLOSS を持つこと
      const stage = ctx.holomems('self');
      return stage.length > 0 && stage.every((e) => ctx.hasTag(e.top, 'ReGLOSS'));
    },
    *run(ctx) {
      // ① #ReGLOSS ホロメンを2枚サーチして公開・手札に加える
      for (let i = 0; i < 2; i++) {
        const cand = ctx.deckCards((c) => c.kind === 'holomen' && ctx.hasTag(c, 'ReGLOSS'));
        if (cand.length === 0) {
          ctx.log('デッキに #ReGLOSS を持つホロメンが見つからなかった');
          break;
        }
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: `手札に加える #ReGLOSS ホロメンを選択（${i + 1}枚目）`,
        });
        if (!picked) break;
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();

      // ② 自分のステージのホロメンが相手より少ないなら、1枚引いてから手札1枚をアーカイブ
      const selfCount = ctx.holomems('self').length;
      const oppCount = ctx.holomems('opp').length;
      if (selfCount < oppCount) {
        ctx.draw(1);
        if (ctx.player.hand.length > 0) {
          const toArchive = yield ctx.chooseCard({
            cards: [...ctx.player.hand],
            title: 'アーカイブする手札1枚を選択',
          });
          if (toArchive) {
            ctx.removeFromHand(toArchive);
            ctx.player.archive.push(toArchive);
            ctx.log(`${ctx.player.name}: ${toArchive.name} をアーカイブした`);
          }
        }
      } else {
        ctx.log('自分のステージのホロメンが相手以上のため、ドロー＆アーカイブは行わない');
      }
    },
  },
};
