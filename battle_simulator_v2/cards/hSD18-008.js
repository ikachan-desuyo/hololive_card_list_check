/**
 * 森カリオペ (hSD18-008) 紫・ホロメン・1st・HP140（#EN #Myth #歌）
 * バトンタッチ: 無色
 *
 * [ブルームエフェクト] ロックンロールリッパー:
 *   自分のデッキの上から1枚をアーカイブする。
 *   → bloomEffect。強制（任意ではない）。デッキ先頭1枚をアーカイブへ送るだけ。
 *     デッキが空なら何もしない。専用プリミティブが無いため deck.shift→archive.push
 *     （ドロー等で確立済みのパターン）で移動する。
 *
 * [アーツ] OK、もう一曲行こう！ (dmg:40 / purple+any):
 *   [センターポジション限定] 自分のアーカイブのツール1枚を手札に戻す。
 *   → arts。canUse でセンター限定。効果はアーカイブの supportType==='ツール' を
 *     1枚選んで手札へ。テキストに「まで」は無く「1枚を戻す」=候補があれば必ず戻す（強制）が、
 *     どの1枚かは選択。候補が無ければ何もしない。素点40はエンジンが処理。
 *
 * 保留: なし。
 */
export default {
  number: 'hSD18-008',

  bloomEffect: {
    name: 'ロックンロールリッパー',
    *run(ctx) {
      if (ctx.player.deck.length === 0) {
        ctx.log('ロックンロールリッパー: デッキが空のためアーカイブできない');
        return;
      }
      const card = ctx.player.deck.shift();
      ctx.player.archive.push(card);
      ctx.log(`${ctx.player.name}: デッキの上から ${card.name} をアーカイブした`);
    },
  },

  arts: {
    'OK、もう一曲行こう！': {
      // [センターポジション限定]
      canUse(ctx) {
        return ctx.sourceHolomemPos()?.zone === 'center';
      },
      *run(ctx) {
        // 自分のアーカイブのツール1枚を手札に戻す
        const tools = ctx.player.archive.filter((c) => c.supportType === 'ツール');
        if (tools.length === 0) {
          ctx.log('アーカイブにツールがない');
          return;
        }
        const picked = yield ctx.chooseCard({
          cards: tools,
          title: 'アーカイブから手札に戻すツールを選択',
        });
        if (picked) {
          ctx.removeFromArchive(picked);
          ctx.addToHand(picked, { reveal: true });
        }
      },
    },
  },
};
