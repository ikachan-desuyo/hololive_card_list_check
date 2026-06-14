/**
 * ぽよ余 (hSD02-014) サポート・マスコット（#白上'sキャラクター）
 *
 * [サポート効果]
 *  ■このマスコットが付いているホロメンのHP+20。
 *    → attached.hpPlus で常時 +20。
 *
 *  ◆〈百鬼あやめ〉に付いていたら能力追加
 *  ■このマスコットが付いているホロメンがBloomした時、自分のデッキを1枚引く。
 *    → 【保留】「付いているホロメンがBloomした時」を監視するトリガー（Bloom時イベントフック）が
 *      エンジン／効果フックに無い（attached 用の onBloom トリガー未実装。
 *      hBP02-089 の「コラボした時」と同種の保留事項）。
 *      attachment 向けの onBloom トリガーが追加されたら、付け先が〈百鬼あやめ〉である条件下で
 *      ctx.draw(1) を発火する定義を足すこと。
 *
 * ※ マスコットは自分のホロメン1人につき1枚（エンジン既定の付け上限。attachRule 不要）。
 */
export default {
  number: 'hSD02-014',
  attached: {
    // ■このマスコットが付いているホロメンのHP+20
    hpPlus() { return 20; },
  },
  triggers: {
    // ◆〈百鬼あやめ〉に付いていたら: ホストがBloomした時、自分のデッキを1枚引く
    * onBloom(ctx) {
      if (ctx.sourceHolomem?.stack[0].name !== '百鬼あやめ') return;
      ctx.draw(1);
    },
  },
};
