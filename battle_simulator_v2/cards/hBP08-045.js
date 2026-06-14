/**
 * ハコス・ベールズ (hBP08-045) 赤・2nd・HP200（#EN #Promise #ケモミミ）
 *
 * コラボエフェクト「今年は豊作になりそうやねん！」:
 *   このターンの間、自分の推しホロメンの〈ハコス・ベールズ〉と
 *   自分のステージの〈ハコス・ベールズ〉の能力でサイコロを振る時、
 *   そのサイコロの目の数すべてを倍の数として扱う。
 *   → kind:'diceDouble' のターン修正を付与する。ctx.rollDice() がこの種別を読み、
 *     発生源カード（推しの〈ハコス・ベールズ〉／ステージの〈ハコス・ベールズ〉）が match に
 *     合致したら出目を倍にする（context.js rollDice 参照）。ターン終了で自動消滅。
 *
 * アーツ「ボクはボクらしく生きたい。」(50+ / 特攻[緑+50]):
 *   自分のステージのホロメン1人を選び、サイコロを1回振る。
 *   出た目の数1につき、このターンの間、選んだホロメンのアーツ+10。
 *   → 基本ダメージ50・特攻[緑+50]はエンジンが素点処理する。
 *     run では対象を選ばせ → サイコロを1回振り → 出目×10 を選んだホロメン1体だけに
 *     artsPlus ターン修正として付与する（出目0は無いので最低+10）。
 *     倍化（コラボエフェクト）が実効になれば rollDice 経由で出目が倍になる。
 */
const NAME = 'ハコス・ベールズ';

export default {
  number: 'hBP08-045',

  collabEffect: {
    name: '今年は豊作になりそうやねん！',
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'diceDouble',
        ownerIdx: ctx.playerIdx,
        // 発生源が推しの〈ハコス・ベールズ〉か、自分のステージの〈ハコス・ベールズ〉の能力なら倍化
        match: (rollerCard) => !!rollerCard && rollerCard.name === NAME,
        description: `このターンの間、〈${NAME}〉の能力で振るサイコロの目を倍として扱う`,
      });
    },
  },

  arts: {
    'ボクはボクらしく生きたい。': {
      *run(ctx) {
        // 自分のステージのホロメン1人を選ぶ（必ず1人いる＝このカード自身がいる）
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: 'アーツを上げるホロメンを選択',
        });
        if (!target) return;

        // サイコロを1回振る（出目1につきアーツ+10）
        const value = yield* ctx.rollDice();
        const amount = value * 10;
        const selected = target.holomem;
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount,
          ownerIdx: ctx.playerIdx,
          match: (h) => h === selected,
          description: `このターンの間、${target.top.name}のアーツ+${amount}（サイコロ${value}）`,
        });
      },
    },
  },
};
