/**
 * 一伊那尓栖 (hBP08-071) 紫・ホロメン・1st・HP150（#EN,#Myth,#絵,#海）
 *
 * ブルームエフェクト「TOMORROW!?」:
 *   相手の推しホロメンと異なる色を持つ相手のホロメン1人に特殊ダメージ20を与える。
 *   → bloomEffect。対象は「相手の推しホロメンの色と異なる色を持つ」相手のステージのホロメン。
 *     相手の推しホロメンの色（ctx.opponent.oshi.color）と、各相手ホロメンの色（e.top.color）を比較し、
 *     一致しないホロメンのみ対象（色が同じホロメンは選べない）。
 *     対象が複数いればコントローラー（自分）が1人選ぶ。対象が居なければ何もしない（強制効果だが対象なし）。
 *     特殊ダメージ20を yield* ctx.dealSpecialDamage で与える。
 *
 * アーツ「Bonk!」(50, [無][無]):
 *   テキスト効果なし（基本ダメージのみ）。エンジンが処理するため arts 定義は不要。
 *
 * 保留: なし（ブルームエフェクトを context.js のプリミティブで全文実装。アーツは効果テキストなし）。
 */
export default {
  number: 'hBP08-071',

  bloomEffect: {
    name: 'TOMORROW!?',
    *run(ctx) {
      const oshiColor = ctx.opponent.oshi?.color || null;
      // 相手の推しホロメンと「異なる色を持つ」相手のホロメンのみ対象
      const filter = (e) => e.top.color !== oshiColor;
      const candidates = ctx.holomems('opp', filter);
      if (candidates.length === 0) {
        ctx.log('TOMORROW!?: 相手の推しホロメンと異なる色を持つホロメンがいない');
        return;
      }

      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter,
        title: '特殊ダメージ20を与える相手ホロメンを選択（推しと異なる色）',
      });
      if (!target) return;
      yield* ctx.dealSpecialDamage(target, 20);
    },
  },
};
