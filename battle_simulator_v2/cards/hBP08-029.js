/**
 * 風真いろは (hBP08-029) ホロメン・Debut・緑・#秘密結社holoX
 * ギフト「Secret Love -Iroha-」:
 *   [コラボポジション限定][ターンに1回]相手のターンで、自分の#秘密結社holoXを持つセンターホロメンが
 *   アーツダメージを受けた時、自分のデッキの上から1枚をホロパワーにする。
 *   → onDamageReceivedReact（被ダメージ割り込み。防御側ステージのホロメンギフト経路③）。
 *      条件: ①このいろはがコラボポジションにいる ②相手のターン（防御側＝非ターンプレイヤー）
 *           ③受け手が自分のセンターで #秘密結社holoX を持つ ④アーツダメージ（kind==='arts'）
 *           ⑤このターン未使用 ⑥ダメージ>0（実際に受けた時）⑦デッキに1枚以上ある
 *      発動時: デッキの上から1枚をホロパワーへ。ダメージ量は変えない（info.dmg をそのまま返す）。
 *              ターン1回フラグを積む。
 *
 * アーツ「極秘任務遂行中でござる」: テキスト効果なし（基本ダメージ20はエンジン処理）。
 *
 * 保留なし。
 */

// このターンに「Secret Love -Iroha-」を使用済みであることを示すモディファイアの key
const ONCE_KEY = 'hBP08-029_SecretLoveIroha';

export default {
  number: 'hBP08-029',
  onDamageReceivedReact: {
    title: '「Secret Love -Iroha-」: デッキの上から1枚をホロパワーにする？',
    yesLabel: 'ホロパワーにする',
    canUse(engine, info) {
      // アーツダメージのみ（「アーツダメージを受けた時」）
      if (info.kind !== 'arts') return false;
      // 相手のターンのみ（防御側＝非ターンプレイヤー）
      if (engine.state.turnPlayer === info.defIdx) return false;
      // 実際にダメージを受ける時のみ
      if (info.dmg <= 0) return false;
      // reactor（このいろは）がコラボポジションにいること
      if (engine._zoneOf(info.reactor) !== 'collab') return false;
      const defender = engine.state.players[info.defIdx];
      // 受け手が自分のセンターホロメンであること
      if (defender.center !== info.target) return false;
      // センターホロメンが #秘密結社holoX を持つこと
      if (!(info.target.stack[0].tags || []).includes('秘密結社holoX')) return false;
      // デッキに1枚以上あること
      if (defender.deck.length === 0) return false;
      // [ターンに1回]
      const used = engine.state.modifiers.some(
        (m) => m.kind === 'oncePerTurnUsed' && m.key === ONCE_KEY && m.ownerIdx === info.defIdx);
      if (used) return false;
      return true;
    },
    apply(engine, info) {
      // ターン1回制限を消費（エンドステップで自動消滅）
      engine.state.modifiers.push({
        duration: 'turn', kind: 'oncePerTurnUsed', key: ONCE_KEY, ownerIdx: info.defIdx,
      });
      const defender = engine.state.players[info.defIdx];
      const card = defender.deck.shift();
      defender.holoPower.push(card);
      engine.log(`「Secret Love -Iroha-」: デッキの上から1枚をホロパワーにした`);
      // ダメージ量は変えない
      return info.dmg;
    },
  },
};
