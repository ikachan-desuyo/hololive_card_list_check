/**
 * AZKi (hBP01-045) Debut HP50
 * ギフト「Overwrite」: 自分のライフが3以下の間、このホロメンは、自分の手札の2nd〈AZKi〉に、
 *   Bloomレベルを無視してBloomできる。
 *   → def.specialBloom フック。通常の _canBloom（Debut→2ndは不可）を迂回し、メインステップの
 *     Bloomアクションとして提示する（レベル遷移のみ無視。同名・HP>ダメージ・ターン制限は通常通り）。
 * アーツ「海辺の街できみと」: テキスト効果なし。
 */
export default {
  number: 'hBP01-045',
  /**
   * @returns true ならこの手札カードへの特殊Bloomを許可する
   * @param h        ステージ上のこのホロメン（被Bloom側）
   * @param handCard 手札のBloom用カード
   * @param engine
   * @param ownerIdx このホロメンの持ち主
   */
  specialBloom(h, handCard, engine, ownerIdx) {
    if (engine.state.players[ownerIdx].life.length > 3) return false; // ライフ3以下の間
    if (handCard.kind !== 'holomen' || handCard.bloomLevel !== '2nd') return false; // 2ndへ
    if (handCard.name !== h.stack[0].name) return false;            // 同名〈AZKi〉
    if (handCard.hp <= h.damage) return false;                       // 新HP > ダメージ
    if (h.faceDown) return false;
    if (h.placedTurn === engine.state.turn) return false;            // このターンに出た→不可
    if (h.bloomedTurn === engine.state.turn) return false;           // このターンBloom済み→不可
    return true;
  },
};
