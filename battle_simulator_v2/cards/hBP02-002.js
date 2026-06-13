/**
 * パヴォリア・レイネ (hBP02-002) 推しホロメン・緑
 *
 * 推しスキル「HALU」[ホロパワー：2消費][ターンに1回]:
 *   自分のホロメンの緑エール1枚をアーカイブすることで、自分のエールデッキから、
 *   エール1枚を公開し、自分のホロメンに送る。そしてエールデッキをシャッフルする。
 *   → メインステップの能動推しスキル。コストはエンジンが処理するので run では支払わない。
 *      効果コスト（緑エール1枚アーカイブ）は run 内で支払う。
 *
 * SP推しスキル「極彩色の宴」[ホロパワー：2消費][ゲームに1回]:
 *   このターンの間、自分のステージの#ID2期生を持つホロメン全員は、
 *   そのホロメンのエール1色につき、アーツ+20。
 *   → 「エール1色につき」= そのホロメンに付いているエールの異なる色数 × 20。
 *      addTurnModifier の amount を関数にして、評価時に各ホロメンの色数で再計算する。
 */
const COLORLESS = '無色';

// ホロメンに付いているエールの異なる色数（無色は色として数えない）
function distinctCheerColorCount(holomem) {
  const colors = new Set();
  for (const cheer of holomem.cheers || []) {
    if (cheer.color && cheer.color !== COLORLESS) colors.add(cheer.color);
  }
  return colors.size;
}

export default {
  number: 'hBP02-002',

  oshiSkill: {
    name: 'HALU',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // ステージのどこかのホロメンに緑エールが付いており、かつエールデッキが残っていること
      const hasGreenCheer = engine._stageHolomems(p).some((h) =>
        (h.cheers || []).some((c) => c.color === '緑'));
      return hasGreenCheer && p.cheerDeck.length > 0;
    },
    *run(ctx) {
      // コスト: 自分のホロメンの緑エール1枚をアーカイブする
      // 緑エールが付いているホロメンを選ぶ
      const fromHolomem = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => (e.holomem.cheers || []).some((c) => c.color === '緑'),
        title: 'コスト: 緑エールをアーカイブするホロメンを選ぶ',
      });
      if (!fromHolomem) return;
      const greens = fromHolomem.holomem.cheers.filter((c) => c.color === '緑');
      const cheer = yield ctx.chooseCard({
        cards: greens,
        title: 'コスト: アーカイブする緑エールを選ぶ',
      });
      if (!cheer) return;
      ctx.archiveCheer(fromHolomem.holomem, cheer);

      // エールデッキから1枚公開して自分のホロメンに送る
      if (ctx.player.cheerDeck.length > 0) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: 'エールデッキから公開したエールを送るホロメンを選ぶ',
        });
        if (target) {
          ctx.sendCheerFromCheerDeckTop(target.holomem);
        }
      }
      // エールデッキをシャッフルする
      ctx.shuffleCheerDeck();
    },
  },

  spOshiSkill: {
    name: '極彩色の宴',
    *run(ctx) {
      // このターンの間、#ID2期生 のホロメン全員、そのホロメンのエール色数 × 20 のアーツ+
      ctx.addTurnModifier({
        kind: 'artsPlus',
        ownerIdx: ctx.playerIdx,
        match: (h) => {
          const top = h.stack[0];
          return !!top && ctx.hasTag(top, 'ID2期生');
        },
        amount: (h) => distinctCheerColorCount(h) * 20,
        description: 'このターン、#ID2期生 ホロメンはエール1色につきアーツ+20',
      });
    },
  },
};
