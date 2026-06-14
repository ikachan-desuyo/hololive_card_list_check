/**
 * 鬼神刀「阿修羅」 (hBP06-098) サポート・ツール
 *
 * [サポート効果] このツールが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時 +10。
 *
 * ◆〈百鬼あやめ〉に付いていたら能力追加:
 *   このツールが付いているホロメンがコラボした時、自分のライフが1で、相手のコラボホロメンが
 *   いないなら、相手は、自身のバックホロメン1人をコラボポジションに移動させる
 *   （移動はコラボとしては扱わない）。
 *   → triggers.onCollab で実装。条件成立時、相手にバック1人を選ばせて（opponentChoosesHolomem）
 *     ctx.moveToCollabOwner で相手のコラボへ移動（コラボ扱いではないので相手のコラボ誘発は起きない）。
 *
 * ツールは、自分のホロメン1人につき1枚だけ付けられる（ツールの既定ルール。
 * _canAttachSupport がツール=1枚を既定で適用するため attachRule 不要）。
 */
export default {
  number: 'hBP06-098',
  attached: {
    artsPlus() { return 10; },
  },
  triggers: {
    // ◆〈百鬼あやめ〉に付いていたら: ホストがコラボした時、自分のライフ1かつ相手コラボ不在なら、相手はバック1人をコラボへ移動
    * onCollab(ctx) {
      if (ctx.sourceHolomem?.stack[0].name !== '百鬼あやめ') return;
      if (ctx.player.life.length !== 1) return;          // 自分のライフが1
      if (ctx.opponent.collab) return;                   // 相手のコラボホロメンがいない
      if (ctx.opponent.back.length === 0) return;
      const entry = yield ctx.opponentChoosesHolomem({
        filter: (e) => e.pos.zone === 'back',
        title: '阿修羅: バックホロメン1人をコラボに移動（移動はコラボ扱いではない）',
      });
      if (entry) ctx.moveToCollabOwner(entry.holomem);
    },
  },
};
