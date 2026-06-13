/**
 * フワワ・アビスガード (hBP08-057) 青・1st・HP180（#EN #Advent #ケモミミ）
 *
 * コラボエフェクト「木漏れ日のブランコ」:
 *   自分のステージのエールを好きな枚数選び、自分の〈モココ・アビスガード〉1人に付け替えられる。
 *   その後、自分のステージにエールが8枚以上あるなら、このターンの間、このホロメンのアーツ+40。
 *   → 「好きな枚数」=0枚も可（任意）。1枚ずつ選び、すべて同一の付け替え先
 *      （選んだ1人の〈モココ・アビスガード〉）へ移す。付け替え先が場にいなければ
 *      付け替えステップはスキップ（その後のアーツ+40判定だけ行う）。
 *      「8枚以上」判定は付け替え後の自分ステージ上の総エール枚数で行う（付け替えは
 *      自ステージ内での移動なので総数は変わらないが、テキストの順序どおり付け替え後に判定）。
 *      アーツ+40 はこのホロメン（sourceHolomem）にこのターンの間付与する。
 *
 * アーツ「寄り添うふたり」(30+):
 *   このホロメンに赤エールが付いているなら、このアーツ+20。
 *   → 条件付き定数ボーナスなので dmgBonus で実装（基本値30はエンジンが素点処理）。
 */
const NAME = 'フワワ・アビスガード';
const PARTNER = 'モココ・アビスガード';

export default {
  number: 'hBP08-057',

  collabEffect: {
    name: '木漏れ日のブランコ',
    *run(ctx) {
      // 付け替え先候補: 自分の〈モココ・アビスガード〉
      const partners = ctx.holomems('self', (e) => e.top.name === PARTNER);
      if (partners.length > 0) {
        // 付け替え先を1人選ぶ（任意。選ばなければ付け替えステップを行わない）
        const dest = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === PARTNER,
          title: `エールの付け替え先〈${PARTNER}〉を選択`,
          optional: true,
        });
        if (dest) {
          // 好きな枚数（0枚可）。1枚ずつ選んで同じ付け替え先へ移す。
          while (true) {
            const entries = [];
            for (const e of ctx.holomems('self')) {
              if (e.holomem === dest.holomem) continue; // 付け替え先に既にあるエールは対象外
              for (const cheer of e.holomem.cheers) entries.push({ cheer, from: e.holomem });
            }
            if (entries.length === 0) break;
            const picked = yield ctx.chooseCard({
              cards: entries.map((e) => e.cheer),
              title: `〈${dest.top.name}〉へ付け替えるエールを選択（好きな枚数・任意）`,
              optional: true,
              skipLabel: 'ここまでにする',
            });
            if (!picked) break;
            const from = entries.find((e) => e.cheer === picked).from;
            ctx.moveCheer(picked, from, dest.holomem);
          }
        }
      } else {
        ctx.log(`〈${PARTNER}〉が自分のステージにいないため、エールの付け替えは行わない`);
      }

      // その後、自分のステージのエールが8枚以上なら、このターンの間このホロメンのアーツ+40
      let cheerCount = 0;
      for (const e of ctx.holomems('self')) cheerCount += e.holomem.cheers.length;
      if (cheerCount >= 8) {
        const self = ctx.sourceHolomem;
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount: 40,
          ownerIdx: ctx.playerIdx,
          match: (h) => h === self,
          description: `このターンの間、${NAME}のアーツ+40（ステージのエール${cheerCount}枚）`,
        });
      } else {
        ctx.log(`自分のステージのエールは${cheerCount}枚（8枚未満）のためアーツ+40は発動しない`);
      }
    },
  },

  arts: {
    '寄り添うふたり': {
      // このホロメンに赤エールが付いているなら、このアーツ+20
      dmgBonus(ctx) {
        const hasRed = (ctx.sourceHolomem?.cheers || []).some((c) => c.color === '赤');
        return hasRed ? 20 : 0;
      },
    },
  },
};
