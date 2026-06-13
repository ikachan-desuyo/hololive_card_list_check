/**
 * ホソイヌ (hBP03-103) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのアーツ+10。
 *   → attached.artsPlus（付いている間の常時修正）。
 *
 * ◆〈戌神ころね〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンがダウンした時、自分のホロパワー1枚をアーカイブできる：
 *   このマスコットを手札に戻す。
 *   → triggers.onDown。ダウン処理は _processDown でアーカイブ前に発火するため、
 *     ここでマスコットを attachments から取り除き手札に戻せば、finish() のアーカイブを免れる。
 *     「できる」＝任意なので confirm で確認し、コスト（ホロパワー1枚アーカイブ）を支払える時のみ実行。
 *   ※ ctx.sourceCard = このマスコット, ctx.sourceHolomem = 付いている（ダウンした）ホロメン。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（マスコットの既定ルール）。
 */
export default {
  number: 'hBP03-103',
  attached: {
    artsPlus() { return 10; },
  },
  triggers: {
    *onDown(ctx) {
      // 付いている先が〈戌神ころね〉でなければ能力は追加されない
      const host = ctx.sourceHolomem.stack[0];
      if (!host || host.name !== '戌神ころね') return;
      // コスト: 自分のホロパワー1枚をアーカイブできる時のみ
      if (ctx.player.holoPower.length < 1) return;
      const ok = yield ctx.confirm(
        'ホロパワー1枚をアーカイブして「ホソイヌ」を手札に戻しますか？',
        '戻す', '戻さない',
      );
      if (!ok) return;
      // コスト支払い: ホロパワーの上から1枚をアーカイブ
      const cost = ctx.player.holoPower.shift();
      if (cost) ctx.player.archive.push(cost);
      ctx.log(`${ctx.player.name}: ホロパワー1枚をアーカイブ`);
      // 効果: このマスコットを手札に戻す（アーカイブ前に attachments から取り除く）
      const attachments = ctx.sourceHolomem.attachments;
      const i = attachments.indexOf(ctx.sourceCard);
      if (i !== -1) attachments.splice(i, 1);
      ctx.addToHand(ctx.sourceCard, { reveal: false });
    },
  },
};
