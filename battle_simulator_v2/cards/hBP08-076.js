/**
 * 癒月ちょこ (hBP08-076) ホロメン・紫・2nd・HP200（#JP #2期生 #料理）
 *
 * [コラボエフェクト] おいしいごはんの夢:
 *   自分のデッキの上から3枚を見る。その中から、[#料理を持つホロメンと#食べ物を持つイベント]
 *   1枚ずつを公開し、手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 *   → デッキ上3枚を解決領域に置いて見る（lookTopDeck）。
 *     見た3枚の中から #料理 を持つホロメン1枚と #食べ物 を持つイベント1枚を、それぞれ最大1枚ずつ
 *     （「1枚ずつ」＝各カテゴリ1枚）公開して手札に加える。該当が無いカテゴリは加えない（0枚可）。
 *     残ったカードはプレイヤーが好きな順でデッキの下に戻す（orderCardsFlow）。
 *
 * [アーツ] ごはんをいっぱい食べたあとには……（120 / purple+any+any / 特攻[青+50]）:
 *   自分のアーカイブに#食べ物を持つイベントが3枚以上あるなら、このホロメンのHP100回復。
 *   → アーカイブの「#食べ物を持つイベント」を数え、3枚以上ならこのホロメン（sourceHolomem）のHPを100回復。
 *     素点120・特攻[青+50]はエンジンが処理する。
 *
 * 保留: なし（全文 context.js のプリミティブで実装）。
 */
const isCuisineHolomem = (ctx, c) => c.kind === 'holomen' && ctx.hasTag(c, '料理');
const isFoodEvent = (ctx, c) => c.supportType === 'イベント' && ctx.hasTag(c, '食べ物');

export default {
  number: 'hBP08-076',

  collabEffect: {
    name: 'おいしいごはんの夢',
    *run(ctx) {
      // デッキの上から3枚を見る（解決領域に置く）
      const seen = ctx.lookTopDeck(3);
      if (seen.length === 0) {
        ctx.log('デッキにカードがない');
        return;
      }

      // #料理を持つホロメン1枚を公開して手札に加える（任意・該当が無ければスキップ）
      const cuisine = seen.filter((c) => isCuisineHolomem(ctx, c));
      if (cuisine.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: cuisine,
          title: '手札に加える #料理を持つホロメン を選択',
          optional: true,
          skipLabel: '加えない',
          displayCards: seen,
        });
        if (picked) {
          seen.splice(seen.indexOf(picked), 1);
          ctx.flashReveal(picked);
          ctx.addToHand(picked);
        }
      }

      // #食べ物を持つイベント1枚を公開して手札に加える（任意・該当が無ければスキップ）
      const food = seen.filter((c) => isFoodEvent(ctx, c));
      if (food.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: food,
          title: '手札に加える #食べ物を持つイベント を選択',
          optional: true,
          skipLabel: '加えない',
          displayCards: seen,
        });
        if (picked) {
          seen.splice(seen.indexOf(picked), 1);
          ctx.flashReveal(picked);
          ctx.addToHand(picked);
        }
      }

      // 残ったカードを好きな順でデッキの下に戻す
      if (seen.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(seen, 'デッキの下に戻す順番');
        ctx.deckToBottom(ordered);
        ctx.log(`残り${ordered.length}枚をデッキの下に戻した`);
      }
    },
  },

  arts: {
    'ごはんをいっぱい食べたあとには……': {
      *run(ctx) {
        // 自分のアーカイブに #食べ物を持つイベント が3枚以上あるなら、このホロメンのHP100回復
        const foodCount = ctx.player.archive.filter((c) => isFoodEvent(ctx, c)).length;
        if (foodCount >= 3 && ctx.sourceHolomem) {
          ctx.heal(ctx.sourceHolomem, 100);
        } else {
          ctx.log(`アーカイブの #食べ物を持つイベント は${foodCount}枚（3枚未満）のため回復しない`);
        }
      },
    },
  },
};
