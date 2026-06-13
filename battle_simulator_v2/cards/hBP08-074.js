/**
 * 一伊那尓栖 (hBP08-074) 紫・2nd・HP210（#EN #Myth #絵 #海）
 *
 * ブルームエフェクト「目覚めよ、赤き眼の黒龍」:
 *   [センターポジション限定] 相手の推しホロメンと異なる色を持つ相手のステージのホロメン1人につき、
 *   自分のデッキを1枚引く。
 *   → bloomEffect。位置限定はエンジン側で判定されないため、ここで sourceHolomemPos().zone が
 *     center の時だけ実行する（バック/コラボでBloomした場合は効果なし＝厳密解釈）。
 *     相手の推しホロメン (ctx.opponent.oshi.color) と色が異なる相手ステージホロメンの数を数えて
 *     その枚数ぶんドローする。色を持たない（無色等）ホロメンは「推しと異なる色」と判定。
 *
 * アーツ「ネクロ・エリミネーション!!」(110, 特攻 黄+50):
 *   自分の手札1～3枚をアーカイブできる:この能力でアーカイブしたカード1枚につき、相手のホロメン1人を選ぶ。
 *   このターンの間、選んだホロメンは、すべての色を持つホロメンとして扱う。
 *   → 基本ダメージ110・特攻[黄+50]はエンジンが素点処理する。
 *     run では「アーカイブする手札枚数（0～3）」を1枚ずつ任意で選ばせ、アーカイブした枚数ぶん
 *     相手ホロメンを（重複なく）選ばせ、選んだホロメンに「すべての色を持つホロメンとして扱う」
 *     ターン修正 kind:'colorOverrideAll' を付与する。
 *
 * 保留: 「選んだホロメンがすべての色を持つホロメンとして扱われる」色の上書きは、
 *   エンジンの特攻判定 (engine.js applyToTarget) が対象カードの素の color（tCard.color）を
 *   直接比較しており、color を上書きするターン修正種別を現状消費しない。
 *   そのため hBP08-018 と同様、kind:'colorOverrideAll' のターン修正を付与しておくが、
 *   エンジン側の特攻判定（および色参照する他効果）がこの種別を読むようになるまで、
 *   黄特攻+50 等への実効はしない（付与しても落ちはしない）。
 *   手札アーカイブと相手ホロメン選択のフローは実装済み。
 */
export default {
  number: 'hBP08-074',

  bloomEffect: {
    name: '目覚めよ、赤き眼の黒龍',
    *run(ctx) {
      // [センターポジション限定]
      const pos = ctx.sourceHolomemPos();
      if (!pos || pos.zone !== 'center') {
        ctx.log('目覚めよ、赤き眼の黒龍: センターにいないため発動しない');
        return;
      }
      const oshiColor = ctx.opponent.oshi?.color || null;
      // 相手の推しホロメンと異なる色を持つ、相手ステージのホロメンを数える
      const diff = ctx.holomems('opp', (e) => e.top.color !== oshiColor);
      if (diff.length === 0) {
        ctx.log('目覚めよ、赤き眼の黒龍: 推しと異なる色のホロメンがいない');
        return;
      }
      ctx.log(`目覚めよ、赤き眼の黒龍: 推し(${oshiColor})と異なる色のホロメン${diff.length}人ぶんドロー`);
      ctx.draw(diff.length);
    },
  },

  arts: {
    'ネクロ・エリミネーション!!': {
      *run(ctx) {
        // 「自分の手札1～3枚をアーカイブできる」: 最大3枚まで任意で1枚ずつ選ぶ（0枚も可＝「できる」）
        const archived = [];
        while (archived.length < 3 && ctx.player.hand.length > 0) {
          const card = yield ctx.chooseCard({
            cards: ctx.player.hand.slice(),
            title: `ネクロ・エリミネーション!!: アーカイブする手札を選択（${archived.length}/3）`,
            optional: true,
            skipLabel: archived.length === 0 ? 'アーカイブしない' : 'これでアーカイブを終える',
          });
          if (!card) break;
          ctx.removeFromHand(card);
          ctx.player.archive.push(card);
          archived.push(card);
          ctx.log(`ネクロ・エリミネーション!!: ${card.name} をアーカイブ`);
        }
        if (archived.length === 0) return;

        // アーカイブしたカード1枚につき、相手のホロメン1人を選ぶ（別々のホロメン＝重複なし）
        const chosen = [];
        for (let i = 0; i < archived.length; i++) {
          const entry = yield ctx.chooseHolomem({
            side: 'opp',
            filter: (e) => !chosen.includes(e.holomem),
            title: `すべての色を持つホロメンとして扱う相手ホロメンを選択（${i + 1}/${archived.length}）`,
          });
          if (!entry) break; // 選べる相手がいなくなったら終了
          chosen.push(entry.holomem);
          ctx.addTurnModifier({
            kind: 'colorOverrideAll',
            ownerIdx: ctx.playerIdx,
            match: (hm) => hm === entry.holomem,
            description: `${entry.top.name} はこのターン、すべての色を持つホロメンとして扱う`,
          });
        }
      },
    },
  },
};
