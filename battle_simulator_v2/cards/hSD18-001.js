/**
 * 森カリオペ (hSD18-001) 推しホロメン・紫・ライフ4
 *
 * 推しスキル「ライミング」[ホロパワー：-2][ターンに1回]:
 *   自分のデッキの上から2枚をアーカイブする。その後、自分のデッキを1枚引く。
 *   → oshiSkill（能動）。プレイヤー選択なし。デッキ上2枚をアーカイブ → 1枚ドロー。
 *     デッキが2枚未満ならある分だけアーカイブし、その後引けるなら引く。
 *     ※コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「世界を繋げるラップ」[ホロパワー：-2][ゲームに1回]:
 *   自分のアーカイブにホロメンが6枚以上あるなら、このターンの間、
 *   自分のステージの〈森カリオペ〉全員のアーツ+30。
 *   → spOshiSkill（能動）。条件（アーカイブのホロメン枚数≧6）を満たす時のみ有効。
 *     名前が「森カリオペ」のホロメン全員に「このターンの間アーツ+30」のターン修正を付与する。
 *     match はトップカード名で判定（ブルーム/移動しても都度評価）。
 *
 * 保留: なし（全効果実装済み）。
 */
export default {
  number: 'hSD18-001',

  oshiSkill: {
    name: 'ライミング',
    canUse(engine, ownerIdx) {
      // デッキが残っていれば意味がある（0枚なら何も起きない）
      const p = engine.state.players[ownerIdx];
      return p.deck.length > 0;
    },
    *run(ctx) {
      // 自分のデッキの上から2枚をアーカイブする
      for (let i = 0; i < 2 && ctx.player.deck.length > 0; i++) {
        const c = ctx.player.deck.shift();
        ctx.player.archive.push(c);
        ctx.recordDeckArchive(1);
        ctx.log(`デッキの上から ${c.name} をアーカイブ`);
      }
      // その後、自分のデッキを1枚引く
      ctx.draw(1);
    },
  },

  spOshiSkill: {
    name: '世界を繋げるラップ',
    canUse(engine, ownerIdx) {
      // 自分のアーカイブにホロメンが6枚以上あるなら使える
      const p = engine.state.players[ownerIdx];
      return p.archive.filter((c) => c && c.kind === 'holomen').length >= 6;
    },
    *run(ctx) {
      // 念のため使用時にも条件を再確認（満たさなければ何もしない＝安全側）
      const holomenInArchive = ctx.player.archive.filter((c) => c && c.kind === 'holomen').length;
      if (holomenInArchive < 6) {
        ctx.log('アーカイブのホロメンが6枚未満のため効果なし');
        return;
      }
      // このターンの間、自分のステージの〈森カリオペ〉全員のアーツ+30
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 30,
        ownerIdx: ctx.playerIdx,
        match: (h) => h.stack[0] && h.stack[0].name === '森カリオペ',
        description: 'このターンの間、自分の〈森カリオペ〉全員のアーツ+30',
      });
    },
  },
};
