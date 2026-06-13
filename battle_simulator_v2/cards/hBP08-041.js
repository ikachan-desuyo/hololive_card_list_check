/**
 * 小鳥遊キアラ (hBP08-041) ホロメン・赤・Debut・HP130
 *
 * ギフト「不死鳥式エアロビ」:
 *   相手のターンで、このホロメンがダウンした時、このホロメンをアーカイブするかわりに手札に戻せる。
 *   → triggers.onDown（_processDown のアーカイブ前に発火）。相手のターン限定（任意「できる」=confirm）。
 *     発動を選んだら、このホロメンのカードを stack から取り除いて手札へ戻す
 *     （stack から抜けば finish() のアーカイブ対象から外れる。hBP04-077 と同方式）。
 *     Debut なので stack は基本このカードのみ。重なりがある場合も「このホロメン（=top）」のみ戻す。
 *
 * アーツ「"熱狂的な夜"は実在する!!!」[any]×1 dmg20:
 *   自分のデッキの上から1枚をアーカイブする。
 *   → ダメージ20はエンジンが art.dmg で処理。run でデッキトップ1枚をアーカイブするのみ。
 *     （デッキトップを抜いてアーカイブする専用プリミティブは無いため deck.shift() → archive.push() で直接処理。
 *      hBP08-001 のホロパワー移動と同方式。デッキが空なら何もしない。）
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-041',

  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      const h = ctx.sourceHolomem;
      if (!h || h.stack.length === 0) return;
      const card = ctx.sourceCard; // ダウンしたこのホロメン（top）
      if (!card || !h.stack.includes(card)) return;
      const use = yield ctx.confirm(
        `${card.name} をアーカイブするかわりに手札に戻しますか？`,
        '手札に戻す',
        'アーカイブする',
      );
      if (!use) return;
      const i = h.stack.indexOf(card);
      if (i !== -1) {
        h.stack.splice(i, 1);
        ctx.player.hand.push(card);
        ctx.log(`${card.name} をアーカイブするかわりに手札に戻した`);
      }
    },
  },

  arts: {
    '"熱狂的な夜"は実在する!!!': {
      *run(ctx) {
        if (ctx.player.deck.length === 0) {
          ctx.log(`${ctx.player.name}: デッキが無いためアーカイブできない`);
          return;
        }
        const top = ctx.player.deck.shift();
        ctx.player.archive.push(top);
        ctx.log(`${ctx.player.name}: デッキの上から ${top.name} をアーカイブ`);
      },
    },
  },
};
