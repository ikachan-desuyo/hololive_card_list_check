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
 * ◆#FLOW GLOW を持つホロメンに付いていたら能力追加:
 *   「自分のエンドステップが開始する時、このターンにこのホロメンがアーツを使っていたなら使える：
 *    自分のデッキから #FLOW GLOW を持つ [Debut/Spot ホロメン]1枚を公開しステージに出す。
 *    デッキをシャッフルし、その後このホロメンに付いている〈ふぐ太郎〉1枚をデッキの下に戻す。」
 *   → triggers.onEndStepStart（装着カードのエンドステップ開始時トリガー）で実装。
 *     ホストが#FLOW GLOWで、このターンにアーツを使っていたら（p.artsUsedNamesThisTurn）、
 *     デッキから#FLOW GLOWのDebut/Spotを1枚出し→シャッフル→このふぐ太郎をデッキの下に戻す（任意）。
 */
const isFG = (c) => (c.tags || []).includes('FLOW') && (c.tags || []).includes('GLOW');

export default {
  number: 'hSD10-013',
  attached: {
    // 付け先が #FLOW GLOW を持つホロメンの時のみアーツ+10（タグは 'FLOW' と 'GLOW' に分割格納される）
    artsPlus(holomem) {
      return isFG(holomem.stack[0]) ? 10 : 0;
    },
  },
  triggers: {
    // ◆#FLOW GLOW付与時: 自分のエンドステップ開始時、ホストがこのターンにアーツを使っていたら使える
    *onEndStepStart(ctx) {
      if (ctx.state.turnPlayer !== ctx.playerIdx) return; // 自分のエンドステップ
      const host = ctx.sourceHolomem;
      const top = host.stack[0];
      if (!isFG(top)) return;                                            // ◆#FLOW GLOW を持つホロメンに付いていたら
      if (host._artsUsedTurn !== ctx.state.turn) return;                 // このターンに“このホロメン”（個体）がアーツを使っていた
      const cand = ctx.deckCards((c) => c.kind === 'holomen' && isFG(c) && (c.bloomLevel === 'Debut' || c.bloomLevel === 'Spot'));
      if (cand.length === 0) return;
      const ok = yield ctx.confirm('ふぐ太郎: デッキから#FLOW GLOWのDebut/Spotを1枚ステージに出す？（ふぐ太郎はデッキの下に戻る）');
      if (!ok) return;
      const picked = yield ctx.chooseCard({ cards: cand, title: 'ステージに出す#FLOW GLOWのDebut/Spotホロメンを選択' });
      if (!picked) { ctx.shuffleDeck(); return; }
      ctx.removeFromDeck(picked);
      ctx.flashReveal(picked);
      if (!ctx.putToBack(picked)) {
        // ステージ満杯などで出せない時はデッキに戻す（どの領域にも属さない瞬間を作らない＝保存則）
        ctx.player.deck.push(picked);
        ctx.log('ステージが満杯のため出せなかった');
      }
      ctx.shuffleDeck();
      // その後、このふぐ太郎をデッキの下に戻す
      const i = host.attachments.indexOf(ctx.sourceCard);
      if (i !== -1) {
        host.attachments.splice(i, 1);
        ctx.player.deck.push(ctx.sourceCard);
        ctx.log('ふぐ太郎をデッキの下に戻した');
      }
    },
  },
  attachRule: {
    // ツール標準（ホロメン1人につき1枚）。特別な付け先制限は無い。
    canAttach() { return true; },
  },
};
