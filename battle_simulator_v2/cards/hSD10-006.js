/**
 * 輪堂千速 (hSD10-006) ホロメン・緑・2nd・HP200（#DEV_IS #FLOW #GLOW）
 * バトンタッチ: 無色
 *
 * アーツ「鼓動の操縦者」(80+) 特攻:白+50:
 *   このターンに自分のホロメンがBloomしていたなら、このアーツ+50。
 *   → dmgBonus。「このターンにBloomした」= ステージ上のいずれかの自分のホロメンの
 *     bloomedTurn === 現ターン（各ホロメンは1ターンに1回までBloom可・8.3）。
 *
 * アーツ「アクセラビートブレイズ」(140) 特攻:白+50:
 *   このアーツで相手のセンターホロメンをダウンさせた時、与えたダメージが残りHPをオーバーしていたなら、
 *   オーバーしたダメージ30につき、自分のエールデッキの上から1枚を自分のバックホロメン1人に送る。
 *   → onDownDealt。発火時点ではダウンしたホロメンはまだステージ上にあり、damage が累計ダメージ。
 *     オーバー量 = damage - effectiveHp。30で割った商の回数だけ、エールデッキの上から1枚を
 *     バックホロメン1人へ送る（1枚ごとに送り先のバックホロメンを選べる解釈）。
 *     対象がセンターでない（バック等を倒した）場合や、オーバーが30未満の場合は何もしない。
 */
export default {
  number: 'hSD10-006',
  arts: {
    '鼓動の操縦者': {
      dmgBonus(ctx) {
        const turn = ctx.state.turn;
        const bloomed = ctx.holomems('self', (e) => e.holomem.bloomedTurn === turn).length > 0;
        return bloomed ? 50 : 0;
      },
    },
    'アクセラビートブレイズ': {
      // 「このアーツで相手のセンターホロメンをダウンさせた時」→ エンジンが onDownDealt を発火
      *onDownDealt(ctx) {
        // ダウンが確定した相手センターホロメンを特定（発火時点ではまだステージ上に存在）
        const downedCenter = ctx.holomems('opp', (e) =>
          e.pos.zone === 'center' &&
          e.holomem.damage >= ctx.engine.effectiveHp(e.holomem))[0];
        if (!downedCenter) return; // 倒したのがセンターでなければ何もしない

        const overflow = downedCenter.holomem.damage - ctx.engine.effectiveHp(downedCenter.holomem);
        const times = Math.floor(overflow / 30); // オーバーしたダメージ30につき1枚
        if (times <= 0) return;

        for (let i = 0; i < times; i++) {
          if (ctx.player.cheerDeck.length === 0) break; // エールデッキが尽きたら終了
          const backs = ctx.holomems('self', (e) => e.pos.zone === 'back');
          if (backs.length === 0) break; // バックホロメンがいないなら送れない
          let target = backs[0];
          if (backs.length > 1) {
            const chosen = yield ctx.chooseHolomem({
              side: 'self',
              filter: (e) => e.pos.zone === 'back',
              title: `エールデッキの上から1枚を送るバックホロメンを選択（${i + 1}/${times}）`,
            });
            if (!chosen) break;
            target = chosen;
          }
          ctx.sendCheerFromCheerDeckTop(target.holomem);
        }
      },
    },
  },
};
