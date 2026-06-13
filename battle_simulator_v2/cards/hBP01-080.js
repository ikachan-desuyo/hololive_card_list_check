/**
 * 星街すいせい (hBP01-080) 青・1st・HP110（#JP #0期生 #歌）
 * コラボエフェクト「雪山の記憶」:
 *   サイコロを1回振れる：奇数の時、相手のHPが40以上減っているバックホロメン1人を
 *   ダウンさせる（ダウンしても相手のライフは減らない）。
 *   → 「HPが40以上減っている」= holomem.damage >= 40
 * アーツ「戦うメイドさん」(70): テキスト効果なし（純粋なダメージのみ）。
 */
export default {
  number: 'hBP01-080',
  collabEffect: {
    name: '雪山の記憶',
    *run(ctx) {
      const ok = yield ctx.confirm('サイコロを振りますか？（雪山の記憶）');
      if (!ok) return;
      const value = ctx.rollDice();
      if (value % 2 === 0) {
        ctx.log('偶数のため効果は発動しない');
        return;
      }
      // 奇数: 相手のバックホロメンのうちHPが40以上減っている1人をダウン（ライフは減らない）
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'back' && e.holomem.damage >= 40,
        title: 'ダウンさせる相手のバックホロメンを選択（HPが40以上減っているもの）',
        optional: true,
      });
      if (!target) return;
      ctx.forceDown(target, { noLifeOnDown: true });
    },
  },
};
