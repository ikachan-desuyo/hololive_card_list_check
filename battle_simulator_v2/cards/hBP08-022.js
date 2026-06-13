/**
 * セシリア・イマーグリーン (hBP08-022) ホロメン・緑 Debut HP130（#EN #Justice #語学）
 *
 * ギフト「エスケープメント」:
 *   このホロメンがバトンタッチしてバックポジションに移動した時、このホロメンをお休みさせる。
 *   → triggers.onBatonMove（バトンタッチでバックへ移動した時に発火。ctx.sourceHolomem=このセシリア）
 *     移動はエンジンのバトンタッチ処理で既に完了しているので、ここでは rested=true にするだけ。
 *     強制効果なので確認は挟まない。
 *
 * アーツ「エレガントに行くのです」(20, 無色×1): テキスト効果なし。
 *
 * 保留: なし（全文 context.js / 既存フックで実装）。
 */
export default {
  number: 'hBP08-022',
  triggers: {
    *onBatonMove(ctx) {
      const me = ctx.sourceHolomem;
      if (!me || me.rested) return;
      me.rested = true;
      ctx.log(`${me.stack[0].name}（エスケープメント）: バトンタッチでバックへ移動したのでお休みさせる`);
    },
  },
};
