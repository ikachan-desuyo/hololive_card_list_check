/**
 * オーロ・クロニー (hBP07-056) 青・2nd・HP200（#EN #Promise）
 *
 * [キーワード/ギフト] 時界を統べし者:
 *   [センター限定]自分のパフォーマンスステップ開始時、このホロメン以外の自分の〈オーロ・クロニー〉1人を、
 *   このホロメンに重なっているホロメンを使ってBloomできる。
 *   → 特殊Bloom（重なっているカードを別のホロメンへ移して再Bloomする機構）は未実装のため保留。
 *      （CLAUDE規約の「もう一度Bloom・特殊Bloom」保留リストに該当）
 *
 * [アーツ] You're not ready for me. (80+) icons: 青青無無 / 特攻: 赤+50
 *   このホロメンのエール1枚を自分の他の#Promiseを持つホロメンに付け替えられる。
 *     → run: 任意（「付け替えられる」=しなくてよい）でこのホロメンのエール1枚を選び、
 *        別の#Promiseホロメンへ moveCheer する。
 *   その後、自分の推しホロメンが〈オーロ・クロニー〉なら、このアーツ+100。
 *     → dmgBonus: 推しが「オーロ・クロニー」なら +100（付け替えの実行有無に依存しない独立条件）。
 */
export default {
  number: 'hBP07-056',
  arts: {
    "You're not ready for me.": {
      *run(ctx) {
        const src = ctx.sourceHolomem;
        if (!src) return;
        const myCheers = src.cheers || [];
        if (myCheers.length === 0) return;
        // 付け替え先候補: 自分の他の#Promiseホロメン（このホロメン以外）
        const targets = ctx.holomems('self', (e) =>
          e.holomem !== src && ctx.hasTag(e.top, 'Promise'));
        if (targets.length === 0) return;

        const ok = yield ctx.confirm('このホロメンのエール1枚を他の#Promiseホロメンに付け替えますか？');
        if (!ok) return;

        const cheer = yield ctx.chooseCard({
          cards: [...myCheers],
          title: '付け替えるエールを選択',
          optional: true,
          skipLabel: '付け替えない',
        });
        if (!cheer) return;

        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.holomem !== src && ctx.hasTag(e.top, 'Promise'),
          title: 'エールを付け替える#Promiseホロメンを選択',
          optional: true,
        });
        if (!target) return;
        ctx.moveCheer(cheer, src, target.holomem);
      },
      dmgBonus(ctx) {
        return ctx.player.oshi?.name === 'オーロ・クロニー' ? 100 : 0;
      },
    },
  },
};
