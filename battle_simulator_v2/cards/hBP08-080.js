/**
 * 音乃瀬奏 (hBP08-080) ホロメン・黄・1st・HP170（#DEV_IS #ReGLOSS #歌）
 *
 * ブルームエフェクト「ファイティングエール」:
 *   自分のステージのエールの枚数が相手より多いなら、自分のデッキから、
 *   #ReGLOSSを持つDebutホロメン1枚をステージに出せる。そしてデッキをシャッフルする。
 *   → 条件: 自分のステージ上のエール総枚数 > 相手のステージ上のエール総枚数（「より多い」＝厳密に大きい）。
 *     満たすなら、デッキ（非公開領域）から #ReGLOSS を持つ Debut ホロメンを1枚選び、
 *     ステージ（バックポジション）に出せる（「出せる」＝任意・optional。「出さない」も可）。
 *     その後デッキをシャッフルする（出さなかった場合もシャッフルは行う＝デッキを見るため）。
 *     エール枚数は holomems('self'/'opp') の各 holomem.cheers.length を合算して比較する。
 *     ステージ上限(6)は putToBack 側で担保される。
 *
 * アーツ「奏ストラクション」(dmg:20 / any):
 *   テキスト効果なし（コストのみ）。実装不要。
 *
 * 保留: なし（ブルームエフェクト実装済み。アーツは素点のみで効果テキスト無し）。
 */
export default {
  number: 'hBP08-080',

  bloomEffect: {
    name: 'ファイティングエール',
    *run(ctx) {
      // 自分/相手のステージ上のエール総枚数を比較（「より多い」＝厳密に大きい）
      const selfCheers = ctx.holomems('self').reduce((sum, e) => sum + e.holomem.cheers.length, 0);
      const oppCheers = ctx.holomems('opp').reduce((sum, e) => sum + e.holomem.cheers.length, 0);
      if (selfCheers <= oppCheers) {
        ctx.log(`ファイティングエール: 自分のエール${selfCheers}枚 ≦ 相手${oppCheers}枚のため発動しない`);
        return;
      }
      // デッキから #ReGLOSS を持つ Debut ホロメン1枚（任意）
      const candidates = ctx.deckCards(
        (c) => c.kind === 'holomen' && c.bloomLevel === 'Debut' && ctx.hasTag(c, 'ReGLOSS'),
      );
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'ステージに出す #ReGLOSS Debutホロメンを選択（任意）',
        optional: true,
        skipLabel: '出さない／見つからなかったことにする',
      });
      if (picked) {
        // ステージ満杯時は出せない。先にデッキから抜くとカードが消失する（保存則違反）ため、
        // 出せる時だけデッキから抜いて出す。出せなければデッキに残す（直後のシャッフルで戻る）。
        if (ctx.engine._stageCount(ctx.player) < 6) {
          ctx.removeFromDeck(picked);
          ctx.putToBack(picked); // ステージ（バック）に出す
        } else {
          ctx.log('ステージが満杯のため #ReGLOSS Debutホロメンを出せない');
        }
      }
      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
