/**
 * 百鬼あやめ (hBP06-039) 赤・2nd・HP160（#JP #2期生 #シューター）
 *
 * 実装範囲:
 * - アーツ「百鬼乱舞 -朧月-」(80+):
 *     自分の推しホロメンが〈百鬼あやめ〉なら、自分のエールデッキの上から1～3枚を
 *     アーカイブできる：アーカイブしたエール1枚につき、このアーツ+40。
 *     → arts.run（エールデッキの「上から」を順にアーカイブ。何枚アーカイブするか＝1～3を選ぶだけで、
 *       どのエールを選ぶ操作ではないため実装可能）
 *
 * 実装範囲（続き）:
 * - キーワード/ギフト「余、なんも聞いとらんかった。」
 *     [センター限定]自分のコラボがいて相手のコラボがいないなら、自分のホロメン全員は
 *     相手からアーツダメージを受けない。
 *     → auraDamageDelta（kind==='arts' 限定の常時アウラ）で実装。条件成立時、自分のホロメン全員の
 *       アーツ被ダメージを実質無効化（-100000）。
 *
 * - アーツ「百鬼乱舞 -朧月-」の使用制限
 *     「このアーツは、自分のライフが2以下でなければコラボポジションでは使えない」
 *     → arts.canUse で実装（コラボにいてライフが3以上なら使えない）。
 */
export default {
  number: 'hBP06-039',
  // キーワード: [センター限定]自分のコラボがいて相手のコラボがいないなら、自分のホロメン全員は相手からアーツダメージを受けない
  auraDamageDelta(src, target, zone, engine, kind) {
    if (kind !== 'arts') return 0;                          // アーツダメージのみ
    if (engine._zoneOf(src) !== 'center') return 0;         // [センター限定]（あやめ自身）
    const ownerIdx = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(src));
    if (ownerIdx < 0) return 0;
    const me = engine.state.players[ownerIdx];
    const opp = engine.state.players[1 - ownerIdx];
    if (!me.collab) return 0;                               // 自分のコラボがいる
    if (opp.collab) return 0;                               // 相手のコラボがいない
    return -100000;                                          // 自分のホロメン全員は相手からアーツダメージを受けない
  },
  arts: {
    '百鬼乱舞 -朧月-': {
      // 「このアーツは、自分のライフが2以下でなければコラボポジションでは使えない」
      canUse(ctx) {
        if (ctx.engine._zoneOf(ctx.sourceHolomem) === 'collab' && ctx.player.life.length > 2) return false;
        return true;
      },
      *run(ctx) {
        // 自分の推しホロメンが〈百鬼あやめ〉でなければ効果なし
        if (ctx.player.oshi?.name !== '百鬼あやめ') return;
        const maxArchive = Math.min(3, ctx.player.cheerDeck.length);
        if (maxArchive <= 0) return;
        // 1～3枚を「上から」アーカイブ（任意）。何枚アーカイブするかを順に確認する。
        let archived = 0;
        while (archived < maxArchive) {
          const ok = yield ctx.confirm(
            `エールデッキの上から1枚をアーカイブしてこのアーツ+40しますか？`
            + `（現在 ${archived} 枚／最大 ${maxArchive} 枚, 累計+${archived * 40}）`,
          );
          if (!ok) break;
          const cheer = ctx.player.cheerDeck.shift();
          if (!cheer) break;
          ctx.player.archive.push(cheer);
          ctx.log(`エールデッキの上から ${cheer.name} をアーカイブ`);
          archived++;
        }
        if (archived > 0) {
          ctx.addArtBonus(archived * 40, `エール${archived}枚アーカイブ`);
        }
      },
    },
  },
};
