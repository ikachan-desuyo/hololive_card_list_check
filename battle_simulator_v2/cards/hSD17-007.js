/**
 * 星街すいせい (hSD17-007) 青・ホロメン・1st・HP130（#JP #0期生 #歌）
 * バトンタッチ: 無色
 *
 * [ブルームエフェクト] Message for You -すいせい-:
 *   [バックポジション限定]相手のバックホロメン1人に特殊ダメージ10を与える。
 *   → bloomEffect。Bloomしたこのホロメンがバックにいる時のみ発動（位置限定）。
 *     相手のバックホロメン1人を選び、特殊ダメージ10を与える（強制効果）。
 *     相手のバックが居なければ何もしない。
 *
 * [アーツ] バレンタイン……か…… (dmg:30 / any):
 *   テキスト効果なし（素点30はエンジンが処理するため実装不要）。
 *
 * 保留: なし。
 */
export default {
  number: 'hSD17-007',

  bloomEffect: {
    name: 'Message for You -すいせい-',
    *run(ctx) {
      const p = ctx.player;
      const self = ctx.sourceHolomem;
      // [バックポジション限定] このホロメンがバックにいる時のみ
      if (!self || !p.back.includes(self)) {
        ctx.log('Message for You -すいせい-: バックポジション限定のため発動しない');
        return;
      }
      // 相手のバックホロメン1人に特殊ダメージ10
      const targets = ctx.holomems('opp', (e) => e.pos.zone === 'back');
      if (targets.length === 0) {
        ctx.log('Message for You -すいせい-: 相手のバックホロメンがいないため発動しない');
        return;
      }
      const entry = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'back',
        title: '特殊ダメージ10を与える相手のバックホロメンを選択',
      });
      if (!entry) return;
      yield* ctx.dealSpecialDamage(entry, 10);
    },
  },
};
