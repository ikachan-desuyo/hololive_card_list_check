/**
 * ときのそら (hBP08-018) 白・2nd・HP210（#JP #0期生 #歌）
 *
 * ブルームエフェクト「アイドルになりたいわたし」:
 *   [センターポジション・コラボポジション限定] 自分のデッキを2枚引く。
 *   → bloomEffect。位置限定はエンジン側で判定されない（bloom 解決時に無条件で run が走る）ため、
 *     ここで sourceHolomemPos().zone が center / collab の時だけドローする。
 *     バックでBloomした場合は効果なし（厳密解釈）。
 *
 * アーツ「盛り上がってくれたらうれしいな！」(150):
 *   自分の推しホロメンが〈ときのそら〉なら、自分のステージの他の〈ときのそら〉1人を選ぶ。
 *   このターンの間、選んだホロメンのアーツは、相手の2ndのバックホロメンも対象にできる。
 *   → 基本ダメージ150・特攻[赤+50]はエンジンが素点処理する。
 *     run では推しが〈ときのそら〉の時だけ、自分（このホロメン）以外の〈ときのそら〉1人を選ばせ、
 *     選んだホロメンに「相手の2ndバックも対象にできる」ターン修正を付与する。
 *
 *   「選んだホロメンのアーツが相手の2ndバックも対象にできる」対象拡張は、付与するターン修正
 *   kind:'artTargetSecondBack' を engine._performanceActions が消費して実効化する
 *   （既存の artTargetDamagedBack と同形。effects.hasArtTargetMod で判定）。
 */
const NAME = 'ときのそら';

export default {
  number: 'hBP08-018',

  bloomEffect: {
    name: 'アイドルになりたいわたし',
    *run(ctx) {
      // [センターポジション・コラボポジション限定]
      const pos = ctx.sourceHolomemPos();
      if (!pos || (pos.zone !== 'center' && pos.zone !== 'collab')) {
        ctx.log('アイドルになりたいわたし: センター/コラボにいないため発動しない');
        return;
      }
      ctx.draw(2);
    },
  },

  arts: {
    '盛り上がってくれたらうれしいな！': {
      *run(ctx) {
        // 自分の推しホロメンが〈ときのそら〉なら
        const oshi = ctx.player.oshi;
        if (!oshi || oshi.name !== NAME) return;

        // 自分のステージの「他の」〈ときのそら〉（このホロメン自身は除く）
        const others = ctx.holomems(
          'self',
          (e) => ctx.nameIs(e.top, NAME) && e.holomem !== ctx.sourceHolomem,
        );
        if (others.length === 0) return;

        const entry = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.nameIs(e.top, NAME) && e.holomem !== ctx.sourceHolomem,
          title: 'アーツの対象を拡張する他の〈ときのそら〉を選択',
        });
        if (!entry) return;

        const selected = entry.holomem;
        ctx.addTurnModifier({
          kind: 'artTargetSecondBack',
          ownerIdx: ctx.playerIdx,
          match: (hm) => hm === selected,
          description: `${entry.top.name}のアーツは相手の2ndバックも対象にできる`,
        });
      },
    },
  },
};
