/**
 * 一伊那尓栖 (hBP08-072) ホロメン・紫・1st・HP170（#EN #Myth #絵 #海 #サマー）
 *
 * ブルームエフェクト「Natsu Ina!!」:
 *   自分のアーカイブに#Mythを持つホロメンが8枚以上あるなら、
 *   自分のアーカイブの#Mythを持つホロメン1枚を手札に戻す。
 *   このブルームエフェクト「Natsu Ina!!」はターンに1回しか使えない。
 *   → 条件: アーカイブ内の #Myth ホロメン（c.kind==='holomen' かつ #Myth）が8枚以上。
 *     満たし、ターンに未使用なら、アーカイブの #Myth ホロメン1枚を選んで手札に戻す。
 *     「1枚を戻す」＝強制（条件を満たせば必ず戻す。候補が居る限り）。
 *     「ターンに1回」制限は markOncePerTurn / oncePerTurnUsed で管理。
 *
 * アーツ「マルチカラー・スケッチ」(30+ / purple):
 *   相手の推しホロメンと異なる色を持つ相手のステージのホロメン1人につき、このアーツ+10。
 *   → dmgBonus: 相手のステージのホロメンのうち、相手の推しホロメンの色と
 *     「異なる色」を持つホロメン1人につき +10。素点30はエンジンが処理する。
 *     色はトップカードの color で判定する。
 *
 * 保留: なし（ブルームエフェクト・アーツとも全文実装）。
 */
const MYTH_TAG = 'Myth';
const ONCE_KEY = 'hBP08-072_NatsuIna';

export default {
  number: 'hBP08-072',

  bloomEffect: {
    name: 'Natsu Ina!!',
    *run(ctx) {
      // ターンに1回制限
      if (ctx.oncePerTurnUsed(ONCE_KEY)) {
        ctx.log('Natsu Ina!!: このターンは既に使用済み');
        return;
      }
      // 条件: アーカイブに #Myth ホロメンが8枚以上
      const mythInArchive = ctx.player.archive.filter(
        (c) => c.kind === 'holomen' && ctx.hasTag(c, MYTH_TAG));
      if (mythInArchive.length < 8) {
        ctx.log(`Natsu Ina!!: アーカイブの#Mythホロメンが${mythInArchive.length}枚（8枚未満）のため発動しない`);
        return;
      }
      // 使用済みとしてマーク（条件を満たし発動するので消費する）
      ctx.markOncePerTurn(ONCE_KEY);

      // アーカイブの #Myth ホロメン1枚を手札に戻す
      const target = yield ctx.chooseCard({
        cards: mythInArchive,
        title: '手札に戻す#Mythホロメンを選択',
      });
      if (!target) return;
      ctx.removeFromArchive(target);
      ctx.addToHand(target);
    },
  },

  arts: {
    'マルチカラー・スケッチ': {
      dmgBonus(ctx) {
        // 相手の推しホロメンと異なる色を持つ相手のステージのホロメン1人につき +10
        const oshiColor = ctx.opponent.oshi?.color;
        const count = ctx.holomems('opp', (e) => e.top.color && e.top.color !== oshiColor).length;
        return count * 10;
      },
    },
  },
};
