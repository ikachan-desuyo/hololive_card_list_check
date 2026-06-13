/**
 * フワワ・アビスガード (hBP03-043) 青・2nd・HP190（#EN #Advent #ケモミミ）
 * アーツ「ドーナツ大好き」(60): 効果なし（特攻 紫+50）。
 * アーツ「一緒に食べる？」(100, 特攻 紫+50):
 *   [センターポジション限定]自分の推しホロメンが〈FUWAMOCO〉の時、
 *   このホロメンのエール1枚を、自分の〈モココ・アビスガード〉に付け替えられる：
 *   相手のセンターホロメンに特殊ダメージ50を与える。
 *
 * 解釈:
 *   - センターポジション限定 → ctx.sourceHolomem がセンターにいる時のみ。
 *   - 推しが〈FUWAMOCO〉(oshi.name === 'FUWAMOCO') の時のみ。
 *   - 付け替え（コスト）は任意。実行した場合のみ特殊ダメージ50を与える。
 *   - 付け替え先は自分のステージにいる〈モココ・アビスガード〉(name === 'モココ・アビスガード')。
 */
export default {
  number: 'hBP03-043',
  arts: {
    '一緒に食べる？': {
      *run(ctx) {
        const h = ctx.sourceHolomem;
        if (!h) return;
        // センターポジション限定
        if (ctx.engine._zoneOf(h) !== 'center') return;
        // 推しが〈FUWAMOCO〉の時のみ
        if (ctx.player.oshi?.name !== 'FUWAMOCO') return;
        // 付け替え可能なエールが必要
        if (h.cheers.length === 0) return;
        // 付け替え先：自分のステージの〈モココ・アビスガード〉
        const mococos = ctx.holomems('self', (e) => e.top.name === 'モココ・アビスガード');
        if (mococos.length === 0) return;

        const cheer = yield ctx.chooseCard({
          cards: h.cheers,
          title: 'モココ・アビスガードに付け替えるエールを選択（任意）',
          optional: true,
          skipLabel: '付け替えない',
        });
        if (!cheer) return;

        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === 'モココ・アビスガード',
          title: '付け替え先の〈モココ・アビスガード〉を選択',
        });
        if (!target) return;
        ctx.moveCheer(cheer, h, target.holomem);

        // 付け替えたなら、相手のセンターホロメンに特殊ダメージ50
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) yield* ctx.dealSpecialDamage(center, 50);
      },
    },
  },
};
