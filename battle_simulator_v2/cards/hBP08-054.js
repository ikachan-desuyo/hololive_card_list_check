/**
 * ムーナ・ホシノヴァ (hBP08-054) 青・ホロメン・2nd・HP200（#ID #ID1期生 #歌）
 *
 * ブルームエフェクト「この絆が私達！」:
 *   自分の推しホロメンの色が緑か青か黄なら、自分のアーカイブの青エールを
 *   自分の#ID1期生を持つホロメン1～3人に1枚ずつ送る。
 *   → 条件: 自分の推しホロメンの色が 緑/青/黄 のいずれか（ctx.player.oshi.color）。
 *     満たさなければ何もしない。
 *     効果: アーカイブの「青」エールを、自分の #ID1期生 ホロメンへ1枚ずつ送る。
 *     「1～3人に1枚ずつ」= 別々のホロメンへ各1枚（同じホロメンに2枚は送らない）。最低1人・最大3人。
 *     アーカイブに青エールが無い、または #ID1期生 ホロメンが居なければ送れない。
 *     送り先は1人ごとに選び（既に送った人は除外）、青エールも1人ごとに選ぶ。
 *     2人目以降は「ここまでにする」で打ち切り可（1人は必須＝条件を満たし対象が居る限り）。
 *
 * アーツ「ひとりじゃない、今は共に」(130, 特攻[赤+50]):
 *   このホロメンに付いているエール3枚をアーカイブできる：自分のデッキを3枚引く。
 *   → 任意（「できる」）の追加効果。run: このホロメンに付いたエールが3枚以上あるなら確認し、
 *     OKならこのホロメンのエールを3枚アーカイブして3枚ドローする。
 *     アーカイブするエールは1枚ずつプレイヤーが選ぶ（色指定なし＝任意の3枚）。
 *     付いているエールが3枚未満なら追加効果は使えない（ダメージのみ）。特攻[赤+50]はエンジンが基本ダメージで処理する。
 *
 * 保留: なし（ブルームエフェクト・アーツとも全文実装）。
 */
const ID1_TAG = 'ID1期生';
const OSHI_OK_COLORS = ['緑', '青', '黄'];

export default {
  number: 'hBP08-054',

  bloomEffect: {
    name: 'この絆が私達！',
    *run(ctx) {
      // 条件: 自分の推しホロメンの色が 緑/青/黄
      const oshiColor = ctx.player.oshi?.color;
      if (!OSHI_OK_COLORS.includes(oshiColor)) {
        ctx.log('この絆が私達！: 推しホロメンの色が緑/青/黄でないため発動しない');
        return;
      }
      // アーカイブに青エールが無ければ送れない
      const hasBlueInArchive = ctx.player.archive.some((c) => c.kind === 'cheer' && c.color === '青');
      if (!hasBlueInArchive) {
        ctx.log('この絆が私達！: アーカイブに青エールが無い');
        return;
      }
      // #ID1期生 を持つ自ホロメンが居なければ送れない
      if (ctx.holomems('self', (e) => ctx.hasTag(e.top, ID1_TAG)).length === 0) {
        ctx.log('この絆が私達！: #ID1期生を持つホロメンがいない');
        return;
      }

      // 別々のホロメン1～3人へ、青エールを1枚ずつ送る
      const sentTo = [];
      for (let i = 0; i < 3; i++) {
        const blueCheers = ctx.player.archive.filter((c) => c.kind === 'cheer' && c.color === '青');
        if (blueCheers.length === 0) break;
        // 既に送ったホロメンは除外（1人につき1枚）
        const candidates = ctx.holomems(
          'self', (e) => ctx.hasTag(e.top, ID1_TAG) && !sentTo.includes(e.holomem));
        if (candidates.length === 0) break;

        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, ID1_TAG) && !sentTo.includes(e.holomem),
          title: `青エールを送る#ID1期生ホロメンを選択（${i + 1}/最大3人）`,
          optional: i > 0, // 1人目は必須、2人目以降は打ち切り可
        });
        if (!target) break;

        const cheer = yield ctx.chooseCard({
          cards: blueCheers,
          title: `${target.top.name}に送る青エールをアーカイブから選択`,
        });
        if (!cheer) break;

        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, target.holomem);
        sentTo.push(target.holomem);
      }
    },
  },

  arts: {
    'ひとりじゃない、今は共に': {
      *run(ctx) {
        const self = ctx.sourceHolomem;
        if (!self) return;
        // このホロメンに付いているエールが3枚以上ないと追加効果は使えない
        if ((self.cheers || []).length < 3) return;

        const ok = yield ctx.confirm(
          'このホロメンのエール3枚をアーカイブして、デッキを3枚引きますか？');
        if (!ok) return;

        // このホロメンのエールを3枚アーカイブ（一度に3枚選ぶ）
        const picked = yield ctx.chooseCards({
          cards: [...(self.cheers || [])],
          count: 3,
          title: 'アーカイブするエールを選択（3枚）',
        });
        for (const cheer of picked) yield* ctx.archiveCheer(self, cheer);

        ctx.draw(3);
      },
    },
  },
};
