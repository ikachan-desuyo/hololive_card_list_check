/**
 * さくらみこ (hSD16-007) 赤・1st・HP130（#JP #0期生 #ベイビー）
 *
 * [キーワード/ギフト]「みこの膝にごろーんってして」:
 *   相手のターンで、このホロメンがダウンした時、自分のデッキを1枚引く。
 *   → triggers.onDown で実装。相手のターン（ctx.state.turnPlayer !== ctx.playerIdx）の時のみ
 *     ctx.draw(1)。hBP04-077 と同じ「相手のターンにダウンした時」誘発のパターン。
 *
 * [アーツ]「みこの耳かきスキルに蕩けちゃえ」(30+):
 *   [センターポジション限定]サイコロを1回振る。3か5なら、このアーツ+10。
 *   → 効果はダイスロールを伴う（rollDice はジェネレータ）ので dmgBonus ではなく arts.run で実装。
 *     [センターポジション限定]はサイコロ＆+10効果を制限する記述なので、センターに居ない場合は
 *     ロールせず効果なし（素点30はそのまま使える）。センターなら必ず1回振り、3か5でこのアーツ+10。
 *     hBP01-038（サイコロ→偶数で+20）と同じく ctx.addArtBonus で加算する。
 *
 * 保留: なし
 */
export default {
  number: 'hSD16-007',

  // ギフト: 相手のターンにこのホロメンがダウンした時、デッキを1枚引く
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      ctx.log('《ギフト》みこの膝にごろーんってして: デッキを1枚引く');
      ctx.draw(1);
    },
  },

  arts: {
    'みこの耳かきスキルに蕩けちゃえ': {
      *run(ctx) {
        // [センターポジション限定]: センターに居ない場合はサイコロ・+10効果なし
        if (ctx.engine._zoneOf(ctx.sourceHolomem) !== 'center') return;
        const roll = yield* ctx.rollDice();
        if (roll === 3 || roll === 5) {
          ctx.addArtBonus(10, `サイコロ${roll}（3か5）`);
        } else {
          ctx.log(`サイコロ${roll}のため効果なし`);
        }
      },
    },
  },
};
