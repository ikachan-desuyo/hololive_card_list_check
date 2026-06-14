/**
 * ふぐ太郎 (hSD10-013) サポート・ツール
 *
 * [サポート効果] このツールが付いている #FLOW GLOW を持つホロメンのアーツ+10。
 *   → attached.artsPlus（付け先が #FLOW GLOW を持つ場合のみ +10）として実装。
 *
 * ツールは、自分のホロメン1人につき1枚だけ付けられる。
 *   → attachRule（unlimited を付けない＝ツールの標準ルールはエンジン側で1枚制限。
 *      ここでは特別な付け先制限が無いので canAttach は常に true）。
 *
 * ◆#FLOW GLOW を持つホロメンに付いていたら能力追加（未実装）:
 *   「自分のエンドステップが開始する時、このターンにこのホロメンがアーツを使っていたなら使える：
 *    自分のデッキから #FLOW GLOW を持つ [Debut/Spot ホロメン]1枚を公開しステージに出す。
 *    デッキをシャッフルし、その後このホロメンに付いている〈ふぐ太郎〉1枚をデッキの下に戻す。」
 *   → エンドステップ開始時の誘発フック（onEndStep）がエンジン未実装（engine.js _endStep の TODO）。
 *     さらに「このターンにこのホロメンがアーツを使っていたなら」というアーツ使用済み判定
 *     （onArtsUse相当）も保留機構のため、能力追加部分は未実装。
 */
export default {
  number: 'hSD10-013',
  attached: {
    // 付け先が #FLOW GLOW を持つホロメンの時のみアーツ+10（タグは 'FLOW' と 'GLOW' に分割格納される）
    artsPlus(holomem) {
      const tags = holomem.stack[0].tags || [];
      return (tags.includes('FLOW') && tags.includes('GLOW')) ? 10 : 0;
    },
  },
  attachRule: {
    // ツール標準（ホロメン1人につき1枚）。特別な付け先制限は無い。
    canAttach() { return true; },
  },
};
