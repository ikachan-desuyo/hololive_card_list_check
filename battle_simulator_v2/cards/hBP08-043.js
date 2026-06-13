/**
 * 小鳥遊キアラ (hBP08-043) Buzzホロメン・赤・1st・HP240
 *
 * コラボエフェクト「火ノ鳥剣舞」:
 *   自分のアーカイブにホロメンが10枚以上あるなら、このターンの間、このホロメンのアーツに必要な赤-2。
 *   → collabEffect。コラボに出たこのホロメン自身（ctx.sourceHolomem）のアーツ必要赤コストを
 *     このターンだけ -2 する（kind:'artCostReduce' のターン修正、match で自分自身に限定）。
 *     アーカイブのホロメン枚数は card.kind === 'holomen' で数える。10枚未満なら効果なし。
 *
 * アーツ「生き抜く覚悟」(50):
 *   自分のステージのホロメン全員が#Mythを持つホロメンなら、自分のデッキの上から1枚をホロパワーにする。
 *   → arts.run。自分のステージのホロメン全員が #Myth タグを持つ場合のみ、デッキトップ1枚をホロパワーへ。
 *     ホロパワーへの移動は専用プリミティブが無いため deck.shift() → holoPower.push() で直接処理する
 *     （hBP08-001 / hBP08-009 と同様）。
 *
 * 保留: なし（コラボエフェクト・アーツ効果とも実装済み）。
 */
const MYTH = 'Myth';

export default {
  number: 'hBP08-043',

  collabEffect: {
    name: '火ノ鳥剣舞',
    *run(ctx) {
      const archiveHolomem = ctx.player.archive.filter((c) => c.kind === 'holomen').length;
      if (archiveHolomem < 10) {
        ctx.log(`アーカイブのホロメンが${archiveHolomem}枚（10枚未満）のため効果なし`);
        return;
      }
      const self = ctx.sourceHolomem;
      if (!self) return;
      ctx.addTurnModifier({
        kind: 'artCostReduce',
        color: '赤',
        amount: 2,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === self,
        description: `このターン、${self.stack[0].name} のアーツ必要赤-2`,
      });
    },
  },

  arts: {
    '生き抜く覚悟': {
      *run(ctx) {
        // 自分のステージのホロメン全員が #Myth を持つホロメンなら
        const stage = ctx.holomems('self');
        const allMyth = stage.length > 0 && stage.every((e) => ctx.hasTag(e.top, MYTH));
        if (!allMyth) {
          ctx.log('自分のステージに#Mythを持たないホロメンがいるため効果なし');
          return;
        }
        if (ctx.player.deck.length === 0) {
          ctx.log('デッキが無いためホロパワーにできない');
          return;
        }
        ctx.player.holoPower.push(ctx.player.deck.shift());
        ctx.log(`${ctx.player.name}: デッキの上から1枚をホロパワーにした`);
      },
    },
  },
};
