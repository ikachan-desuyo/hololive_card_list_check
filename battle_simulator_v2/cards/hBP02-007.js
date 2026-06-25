/**
 * 森カリオペ（推しホロメン hBP02-007・紫）
 *
 * 推しスキル「サンプリング」[ホロパワー：2消費][ターンに1回]:
 *   自分の手札2枚をアーカイブすることで、アーカイブの#ENを持つホロメン2枚を手札に戻す。
 *   → 能動型のメインステップ推しスキル。
 *     手札2枚をアーカイブ → アーカイブの #EN ホロメン2枚を手札へ戻す。
 *     コスト（ホロパワー2消費）とターン制限はエンジンが処理するので run では扱わない。
 *     「2枚をアーカイブすることで」がコスト。手札が2枚未満、または
 *     アーカイブに #EN ホロメンが居ない場合は空振りになるので canUse で弾く。
 *     ※手札のアーカイブはコストの一部なので、戻せる #EN ホロメンが居なくても
 *       一度払ったコストは戻さない（テキスト通り手札2枚をアーカイブしてから戻す）。
 *       戻す枚数は「2枚」だが、アーカイブの #EN ホロメンが2枚未満なら居る分だけ
 *       （厳密には "2枚" 指定だが対象不足時は可能な範囲）。
 *
 * SP推しスキル「死神ラップ」[ホロパワー：2消費][ゲームに1回]:
 *   自分のセンターホロメンが〈森カリオペ〉の時に使える：
 *   このターンの間、自分の〈森カリオペ〉1人は、アーツを使った後、同じアーツをもう1回使う。
 *   → spOshiSkill + ターン修正 kind:'reArts'（hBP07-008 と同形）。選んだ〈森カリオペ〉に再アーツ権を付与し、
 *     engine がアーツ使用後に同じアーツの再アーツアクションを提示する。
 */
const KIANA_NAME = '森カリオペ';

export default {
  number: 'hBP02-007',

  oshiSkill: {
    name: 'サンプリング',
    // 手札0/1枚でも宣言できる（Q237: 使用可・2枚アーカイブできなければ何もせず終了）。
    // コスト/[ターン1回]はエンジンが処理。AIは空振り（手札2枚未満／アーカイブに#ENホロメン無し）を避ける。
    aiSkip(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      return p.hand.length < 2 || !p.archive.some(
        (c) => c.kind === 'holomen' && (c.tags || []).includes('EN'));
    },
    *run(ctx) {
      // コスト: 手札2枚をアーカイブ（一括選択。手札が2枚未満なら有る分だけ）
      const costCards = yield ctx.chooseCards({
        cards: [...ctx.player.hand],
        count: 2,
        title: 'アーカイブする手札を選択（2枚）',
      });
      for (const card of costCards) {
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.log(`${card.name} をアーカイブした`);
      }
      // 効果: アーカイブの #EN ホロメン2枚を手札に戻す（一括選択。居る分だけ）
      const enHolomems = ctx.player.archive.filter(
        (c) => c.kind === 'holomen' && ctx.hasTag(c, 'EN'),
      );
      const picked = yield ctx.chooseCards({
        cards: enHolomems,
        count: 2,
        title: '手札に戻す#ENホロメンを選択（2枚）',
      });
      for (const c of picked) {
        ctx.removeFromArchive(c);
        ctx.addToHand(c);
      }
    },
  },

  spOshiSkill: {
    name: '死神ラップ',
    canUse(engine, ownerIdx) {
      // 自分のセンターホロメンが〈森カリオペ〉の時に使える
      const c = engine.state.players[ownerIdx].center;
      return !!c && c.stack[0].name === KIANA_NAME;
    },
    *run(ctx) {
      const cands = ctx.holomems('self', (e) => e.top.name === KIANA_NAME);
      if (cands.length === 0) return;
      const entry = cands.length === 1
        ? cands[0]
        : yield ctx.chooseHolomem({ side: 'self', filter: (e) => e.top.name === KIANA_NAME, title: 'アーツをもう1回使う〈森カリオペ〉を選択' });
      if (!entry) return;
      const sel = entry.holomem;
      ctx.addTurnModifier({
        kind: 'reArts', ownerIdx: ctx.playerIdx, used: false,
        match: (hm) => hm === sel,
        description: `${sel.stack[0].name}はアーツを使った後もう1回同じアーツを使う`,
      });
    },
  },
};
