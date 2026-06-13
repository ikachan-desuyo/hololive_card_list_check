/**
 * こぼ・かなえる (hBP03-045) 青・1st・Buzzホロメン・HP230（#ID #ID3期生）
 * ブルームエフェクト「ブルーレイン」:
 *   自分の#IDを持つホロメンのエール1枚をアーカイブできる：
 *   相手のバックホロメンに特殊ダメージ30を10ずつ割り振って与える。
 *   ただし、ダウンしても相手のライフは減らない。
 *   → コスト（#IDホロメンのエール1枚をアーカイブ）を払い、相手バックに10×3を割り振る。
 *     割り振り先はプレイヤーが選択（同じホロメンに重ねてもよい）。noLifeOnDown 指定。
 * アーツ「元気いっぱい！」(40+):
 *   相手のHPが減っているバックホロメン1人につき、このアーツ+10。
 */
export default {
  number: 'hBP03-045',
  bloomEffect: {
    name: 'ブルーレイン',
    *run(ctx) {
      // 相手にバックホロメンがいなければ意味がないので何もしない
      const oppBacks = () => ctx.holomems('opp', (e) => e.pos.zone === 'back');
      if (oppBacks().length === 0) return;
      // コスト: 自分の#IDを持つホロメンでエールを持つもの
      const idWithCheer = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'ID') && e.holomem.cheers.length > 0);
      if (idWithCheer.length === 0) return;
      const ok = yield ctx.confirm('#IDホロメンのエール1枚をアーカイブして相手のバックに特殊ダメージ30(10ずつ)を与えますか？');
      if (!ok) return;
      // どの#IDホロメンのエールをアーカイブするか
      const src = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'ID') && e.holomem.cheers.length > 0,
        title: 'エールをアーカイブする#IDホロメンを選択',
      });
      if (!src) return;
      const cheer = yield ctx.chooseCard({
        cards: src.holomem.cheers,
        title: 'アーカイブするエールを選択',
      });
      if (!cheer) return;
      yield* ctx.archiveCheer(src.holomem, cheer);
      // 特殊ダメージ30を10ずつ相手バックに割り振る（3回、各回プレイヤーが対象を選択）
      for (let i = 0; i < 3; i++) {
        const backs = oppBacks();
        if (backs.length === 0) break;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'back',
          title: `特殊ダメージ10を与える相手バックホロメンを選択（${i + 1}/3）`,
        });
        if (!target) break;
        // ダウンしても相手のライフは減らない
        yield* ctx.dealSpecialDamage(target, 10, { noLifeOnDown: true });
      }
    },
  },
  arts: {
    '元気いっぱい！': {
      // 相手のHPが減っているバックホロメン1人につき +10
      dmgBonus(ctx) {
        const count = ctx.holomems('opp', (e) => e.pos.zone === 'back' && e.holomem.damage > 0).length;
        return count * 10;
      },
    },
  },
};
