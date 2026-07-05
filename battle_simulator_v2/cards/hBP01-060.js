/**
 * 鷹嶺ルイ (hBP01-060) 赤・1st・HP100（#JP, #秘密結社holoX, #トリ, #お酒）
 * ブルームエフェクト「本当にみんなのおかげ！！」:
 *   DebutからBloomした時、自分の手札1枚をアーカイブできる：自分のデッキを2枚引く。
 *   → Bloom元がDebutの場合のみ。手札が1枚以上ある時に任意でアーカイブ→2ドロー。
 * アーツ「しっかりついてきてよね！」(dmg:40): テキスト効果なし（素点のみ）。
 */
export default {
  number: 'hBP01-060',
  bloomEffect: {
    name: '本当にみんなのおかげ！！',
    *run(ctx) {
      // Bloom元（stack[1]）がDebutでなければ発動しない
      if (ctx.sourceHolomem?.stack[1]?.bloomLevel !== 'Debut') return;
      if (ctx.player.hand.length === 0) return; // コスト（手札1枚）を払えない
      const ok = yield ctx.confirm('手札1枚をアーカイブしてデッキを2枚引きますか？');
      if (!ok) return;
      const card = yield ctx.chooseCard({
        cards: [...ctx.player.hand],
        title: 'コスト: アーカイブする手札を選択',
      });
      if (!card) return;
      // 「ホロメンの能力で手札をアーカイブ」共通プリミティブ（推し「女幹部の采配」のコスト置換にも対応）
      yield* ctx.archiveHandCard(card);
      ctx.draw(2);
    },
  },
};
