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
 * 未実装（エンジン機構が無い／保留対象のため）:
 * - キーワード/ギフト「余、なんも聞いとらんかった。」
 *     [センター限定]自分のコラボがいて相手のコラボがいないなら、自分のホロメン全員は
 *     相手からアーツダメージを受けない。
 *     → 被ダメージ割り込み（ダメージを受けない）の常時アウラ。保留対象のため未実装。
 * - アーツ「百鬼乱舞 -朧月-」の使用制限
 *     「このアーツは、自分のライフが2以下でなければコラボポジションでは使えない」
 *     → アーツ単位の使用可否(canUse)を判定するフックがエンジンに無いため未実装（制限は強制されない）。
 */
export default {
  number: 'hBP06-039',
  arts: {
    '百鬼乱舞 -朧月-': {
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
