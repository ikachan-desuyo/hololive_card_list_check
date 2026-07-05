/**
 * ルーナイト (hBP03-105) サポート・ファン
 * 効果: 相手のターンで、このファンが付いているホロメンがダメージを受ける時、このファンをアーカイブできる：
 *   このファンが付いていたホロメンの受けるダメージ-30。
 *   → onDamageReceivedReact（被ダメージ割り込み。アーツ/特殊どちらの経路でも提示される）。
 * 付け先: 自分の〈姫森ルーナ〉だけ・1人につき何枚でも。
 */
export default {
  number: 'hBP03-105',
  attachRule: {
    canAttach: (h) => h.stack[0].name === '姫森ルーナ',
    unlimited: true,
  },
  onDamageReceivedReact: {
    title: 'ルーナイトをアーカイブして受けるダメージ-30？',
    yesLabel: 'アーカイブする（-30）',
    // 相手のターン（防御側＝非ターンプレイヤー）で、このファンが付いたホロメンが受ける時のみ
    canUse(engine, info) {
      return engine.state.turnPlayer !== info.defIdx && info.dmg > 0;
    },
    apply(engine, info) {
      const t = info.target;
      const i = t.attachments.indexOf(info.attachedCard);
      if (i !== -1) {
        t.attachments.splice(i, 1);
        engine.state.players[info.defIdx].archive.push(info.attachedCard);
        engine.log(`${t.stack[0].name}: ルーナイトをアーカイブ → 受けるダメージ-30`);
      }
      return Math.max(0, info.dmg - 30);
    },
  },
};
