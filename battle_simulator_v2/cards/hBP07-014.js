/**
 * 角巻わため (hBP07-014) ホロメン・白・2nd・HP200（#JP #4期生 #ケモミミ #歌）
 * バトンタッチ: 無色
 *
 * キーワード/ギフト「キュートセクシー」:
 *   このホロメンに重なっているホロメン1枚につき、このホロメンのHP+10。
 *   → 自分自身のHPを恒常強化する常時アウラ。auraHpPlus(src, target) で src===target の時のみ加算。
 *     「重なっているホロメン」= stack.length - 1（stack[0] が最上段＝このカード自身）。
 *
 * アーツ「脳天直撃わためハンマー！」(160) 特攻:赤+50:
 *   [センターポジション限定]このアーツで相手のホロメンをダウンさせた時、与えたダメージが残りHPを
 *   オーバーしていたなら、相手の2ndホロメン1人に、オーバーしたダメージと同じ数値の特殊ダメージを与える。
 *   → onDownDealt（ダメージ適用後に発火）。発火時点ではダウンしたホロメンはまだステージ上にあり、
 *     damage が累計ダメージ。オーバー量 = damage - 実効HP（>0 のときのみ）。
 *     [センターポジション限定] なので、ソース（このホロメン）がセンターにいない場合は何もしない。
 *     オーバーしたダメージと同じ数値の特殊ダメージを、相手の2ndホロメン1人へ与える。
 *     （特殊ダメージなのでダウン側の被ダメージ修正は dealSpecialDamage 側で処理される。）
 */
export default {
  number: 'hBP07-014',

  // ギフト「キュートセクシー」: このホロメンに重なっているホロメン1枚につき自分のHP+10（自己強化アウラ）
  auraHpPlus(src, target, engine) {
    if (src !== target) return 0; // 「このホロメンのHP」= 自分自身のみ
    const stacked = Math.max(0, (src.stack.length || 1) - 1); // 重なっているホロメンの枚数
    return stacked * 10;
  },

  arts: {
    '脳天直撃わためハンマー！': {
      // [センターポジション限定]「このアーツで相手をダウンさせた時」→ エンジンが onDownDealt を発火（ダメージ適用後）
      *onDownDealt(ctx) {
        // [センターポジション限定]: ソース（このホロメン）がセンターにいるときのみ
        if (ctx.sourceHolomemPos()?.zone !== 'center') return;

        // ダウンが確定した相手ホロメン（実効HP以上のダメージ）を探す。
        // 本アーツは単体対象なので、このタイミングで新たに実効HP以上になっているのは攻撃対象のみ。
        const downed = ctx.holomems('opp', (e) =>
          e.holomem.damage >= ctx.engine.effectiveHp(e.holomem));
        if (downed.length === 0) return;

        // 与えたダメージが残りHPをオーバーした量 = 累計ダメージ - 実効HP（最大値を採用）
        const overflow = Math.max(0, ...downed.map((e) =>
          e.holomem.damage - ctx.engine.effectiveHp(e.holomem)));
        if (overflow <= 0) return; // 「オーバーしていたなら」: ぴったり/未満なら何もしない

        // 相手の2ndホロメン1人へ、オーバーしたダメージと同じ数値の特殊ダメージ
        const second = ctx.holomems('opp', (e) => e.top.bloomLevel === '2nd');
        if (second.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.top.bloomLevel === '2nd',
          title: `オーバーしたダメージ${overflow}の特殊ダメージを与える相手の2ndホロメンを選択`,
        });
        if (!target) return;
        yield* ctx.dealSpecialDamage(target, overflow);
      },
    },
  },
};
