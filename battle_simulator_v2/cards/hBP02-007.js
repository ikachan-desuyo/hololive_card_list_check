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
 *   → 「アーツを使った後、同じアーツをもう1回使う」=アーツ使用トリガー＋同一アーツの再実行機構。
 *     onArtsUse トリガー／アーツの再実行は未対応のため未実装（保留）。
 */
const KIANA_NAME = '森カリオペ';

export default {
  number: 'hBP02-007',

  oshiSkill: {
    name: 'サンプリング',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 手札が2枚以上（コストとして2枚アーカイブする）
      if (p.hand.length < 2) return false;
      // アーカイブに #EN を持つホロメンが1枚以上
      return p.archive.some(
        (c) => c.kind === 'holomen' && (c.tags || []).includes('EN'),
      );
    },
    *run(ctx) {
      // コスト: 手札2枚をアーカイブ
      for (let i = 0; i < 2 && ctx.player.hand.length > 0; i++) {
        const card = yield ctx.chooseCard({
          cards: ctx.player.hand,
          title: `アーカイブする手札を選択（${i + 1}/2）`,
        });
        if (!card) break;
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.log(`${card.name} をアーカイブした`);
      }
      // 効果: アーカイブの #EN ホロメン2枚を手札に戻す
      for (let i = 0; i < 2; i++) {
        const enHolomems = ctx.player.archive.filter(
          (c) => c.kind === 'holomen' && ctx.hasTag(c, 'EN'),
        );
        if (enHolomems.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: enHolomems,
          title: `手札に戻す#ENホロメンを選択（${i + 1}/2）`,
        });
        if (!picked) break;
        ctx.removeFromArchive(picked);
        ctx.addToHand(picked);
      }
    },
  },

  // SP推しスキル「死神ラップ」は未実装（保留）。
  // 「アーツを使った後、同じアーツをもう1回使う」はアーツ使用トリガー＋同一アーツ再実行が必要だが、
  // onArtsUse トリガーおよびアーツの再実行機構が未対応のため。
};
