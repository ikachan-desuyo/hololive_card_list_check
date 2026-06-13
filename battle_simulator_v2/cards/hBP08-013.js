/**
 * IRyS (hBP08-013) 白・2nd・HP200 / EN・Promise・歌
 *
 * ギフト「勝利のティータイム」:
 *   このホロメンが相手のホロメンをダウンさせた時、自分のデッキの上から1枚をホロパワーにする。
 *   → triggers.onOpponentDown（このホロメンが相手をダウンさせた時に発火）。
 *     デッキ上から1枚をホロパワーへ移すだけ（hBP04-013 のギフト前半と同形だが、手札に加える後処理は無い）。
 *
 * アーツ「萌え萌えキュンしちゃった？」(70+):
 *   このホロメンに紫エールが付いているなら、このアーツ+50。
 *   → dmgBonus(ctx): sourceHolomem に紫エールがあれば +50、無ければ 0。
 *     特攻「紫+50」(icons.tokkou) はエンジンが基本ダメージ計算で処理するため run/dmgBonus には書かない。
 *
 * 保留: なし（ギフト・アーツとも全文実装）。
 */
export default {
  number: 'hBP08-013',

  triggers: {
    *onOpponentDown(ctx) {
      const p = ctx.player;
      if (p.deck.length > 0) {
        p.holoPower.push(p.deck.shift());
        ctx.log('勝利のティータイム: デッキの上から1枚をホロパワーにした');
      } else {
        ctx.log('勝利のティータイム: デッキが空のためホロパワーにできない');
      }
    },
  },

  arts: {
    '萌え萌えキュンしちゃった？': {
      dmgBonus(ctx) {
        const hasPurpleCheer = (ctx.sourceHolomem?.cheers || []).some((c) => c.color === '紫');
        return hasPurpleCheer ? 50 : 0;
      },
    },
  },
};
