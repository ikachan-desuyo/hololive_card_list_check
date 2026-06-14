/**
 * フレンド (hBP01-117) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時 +10。
 *
 * ◆〈七詩ムメイ〉に付いていたら能力追加
 *   相手のターンで、このマスコットが付いているホロメンがダメージを受ける時、
 *   このマスコットをアーカイブできる：このマスコットが付いていたホロメンが受けるダメージ-30。
 *   → onDamageReceivedReact（被ダメージ割り込み・任意）で実装。〈七詩ムメイ〉に付いていて
 *     相手のターンに被弾する時、このマスコットをアーカイブして受けるダメージ-30。
 *
 * 付け先制限: マスコットの標準ルール（自分のホロメン1人につき1枚）は
 *   engine._canAttachSupport が既定で担保するため attachRule は不要。
 *   付け先はホロメン全般（ムメイ限定ではなく、ムメイに付いた時のみ追加能力が有効）。
 */
export default {
  number: 'hBP01-117',
  attached: {
    // このマスコットが付いているホロメンのアーツ+10
    artsPlus() { return 10; },
  },
  // ◆〈七詩ムメイ〉に付いていたら: 相手のターンに被弾する時、このマスコットをアーカイブして受けるダメージ-30（任意）
  onDamageReceivedReact: {
    title: 'フレンドをアーカイブして受けるダメージ-30？',
    yesLabel: 'アーカイブする（-30）',
    canUse(engine, info) {
      return info.target.stack[0].name === '七詩ムメイ' &&
        engine.state.turnPlayer !== info.defIdx &&   // 相手のターン
        info.dmg > 0;
    },
    apply(engine, info) {
      const t = info.target;
      const i = t.attachments.indexOf(info.attachedCard);
      if (i !== -1) {
        t.attachments.splice(i, 1);
        engine.state.players[info.defIdx].archive.push(info.attachedCard);
        engine.log(`${t.stack[0].name}: フレンドをアーカイブ → 受けるダメージ-30`);
      }
      return Math.max(0, info.dmg - 30);
    },
  },
};
