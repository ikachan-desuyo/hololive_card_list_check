/**
 * フブラ (hBP02-092) サポート・マスコット（#白上'sキャラクター）
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 *   → attached.hpPlus
 *
 * ◆〈白上フブキ〉に付いていたら能力追加:
 *   [ターンに1回] 自分のメインステップで、自分のホロメンのエール2枚をアーカイブできる：
 *   このターンの間、このマスコットが付いているホロメンのアーツ+50。
 *   → activatedAbilities（コスト: 自分のホロメンのエール計2枚をアーカイブ）
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（エンジンのマスコット共通制約）。
 *
 * 注: コスト「自分のホロメンのエール2枚」はテキスト通り、自分のステージ上の任意のホロメンの
 * エールから合計2枚を選んでアーカイブする（付け先のホロメン限定ではない）。
 */
export default {
  number: 'hBP02-092',
  attached: {
    hpPlus() { return 20; },
  },
  activatedAbilities: [{
    name: 'フブラ',
    oncePerTurn: true,
    canUse(ctx) {
      // 〈白上フブキ〉に付いている時のみ能力追加
      if (ctx.sourceHolomem.stack[0].name !== '白上フブキ') return false;
      // 自分のホロメン全体でエール2枚以上ないとコストを払えない
      const total = ctx.holomems('self').reduce((n, e) => n + e.holomem.cheers.length, 0);
      return total >= 2;
    },
    *run(ctx) {
      // コスト: 自分のホロメンのエールを合計2枚アーカイブ
      for (let i = 0; i < 2; i++) {
        const candidates = ctx.holomems('self')
          .filter((e) => e.holomem.cheers.length > 0)
          .flatMap((e) => e.holomem.cheers.map((c) => ({ holomem: e.holomem, cheer: c })));
        if (candidates.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: candidates.map((c) => c.cheer),
          title: `コスト: アーカイブするエールを選択 (${i + 1}/2)`,
        });
        if (!picked) return;
        const owner = candidates.find((c) => c.cheer === picked);
        yield* ctx.archiveCheer(owner.holomem, picked);
      }
      // このターンの間、このマスコットが付いているホロメンのアーツ+50
      const target = ctx.sourceHolomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 50,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === target,
        description: 'フブラ: このターンのアーツ+50',
      });
    },
  }],
};
