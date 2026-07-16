/**
 * 白上フブキ (hBP05-069) 黄・1st・HP160（#1期生,#ゲーマーズ,#絵）
 * ギフト「とびきりの笑顔」: [バックポジション限定]このホロメンは相手からダメージを受けない。
 *   → 自己アウラ（auraDamageDelta）。自分がバックにいる間、受けるダメージを0にする（大きな負値で軽減）。
 * アーツ「満点じゃい！」(40): 自分のエールデッキの上から1枚をこのホロメンに送れる。
 *   →「送れる」= 任意（confirm で辞退できる）。
 */
export default {
  number: 'hBP05-069',
  auraDamageDelta(src, target, zone) {
    // 自分自身がバックにいる時、受けるダメージを実質0に（_applyDamageReceived が max(0,...) でクランプ）
    return (src === target && zone === 'back') ? -100000 : 0;
  },
  arts: {
    '満点じゃい！': {
      *run(ctx) {
        if (!ctx.sourceHolomem) return;
        // 「送れる」= 任意
        const ok = yield ctx.confirm('エールデッキの上から1枚をこのホロメンに送りますか？', '送る', '送らない');
        if (ok) ctx.sendCheerFromCheerDeckTop(ctx.sourceHolomem);
      },
    },
  },
};
