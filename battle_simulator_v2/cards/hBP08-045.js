/**
 * ハコス・ベールズ (hBP08-045) 赤・2nd・HP200（#EN #Promise #ケモミミ）
 *
 * コラボエフェクト「今年は豊作になりそうやねん！」:
 *   このターンの間、自分の推しホロメンの〈ハコス・ベールズ〉と
 *   自分のステージの〈ハコス・ベールズ〉の能力でサイコロを振る時、
 *   そのサイコロの目の数すべてを倍の数として扱う。
 *   → 保留: サイコロの出目を「倍として扱う」継続効果を消費する機構が
 *     context.rollDice / state.modifiers に存在しない（現状は kind:'diceFixed' で
 *     固定値に置換する割り込みのみ）。発生源（振っているホロメン/カード）を見て
 *     倍化する処理をエンジン側（rollDice）に追加するまで実効できないため、
 *     落ちないようマーカーとして kind:'diceDouble' のターン修正だけ付与しておく
 *     （rollDice がこの種別を読むようになれば自動で効く）。
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
      // 保留: 出目倍化を消費する機構が未実装。マーカーのみ付与（rollDice 側の対応待ち）。
      ctx.addTurnModifier({
        kind: 'diceDouble',
        ownerIdx: ctx.playerIdx,
        // 発生源が推しの〈ハコス・ベールズ〉か、自分のステージの〈ハコス・ベールズ〉の能力なら倍化
        match: (rollerCard) => !!rollerCard && rollerCard.name === NAME,
        description: `このターンの間、〈${NAME}〉の能力で振るサイコロの目を倍として扱う（保留: 倍化機構未実装）`,
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
