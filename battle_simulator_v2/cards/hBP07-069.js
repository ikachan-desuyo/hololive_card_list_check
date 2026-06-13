/**
 * AZKi (hBP07-069) 紫・2nd・HP220（#JP #0期生 #歌）
 *
 * アーツ「君と新たな開拓の地へ」 dmg:140（特攻 緑+50）:
 *   自分のデッキを2枚引く。
 *
 * アーツ「紡いだ軌跡 すべてに捧ぐ歌」 dmg:200（特攻 緑+50）:
 *   自分の推しホロメンが〈AZKi〉なら、自分のホロパワーの上から4枚をアーカイブできる：
 *   自分のアーカイブに〈フロンティアスピリット〉が4枚あるなら、相手のライフ-1。
 *
 *   実装方針:
 *     - 「ホロパワーの上から4枚をアーカイブできる」= 任意コスト。ホロパワーが4枚以上ある時のみ実行可能。
 *       「上から」= holoPower 先頭（index 0..3）。コラボ等で末尾へ push される運用に合わせ先頭が上。
 *     - 「相手のライフ-1」は通常のライフダメージ処理（reveal→ホロメンへ送る）と同じ機構で扱う。
 *       opponent.lifeDamage を加算しておくと、アーツ解決後の _checkTiming で
 *       ライフ公開＆送り先選択（相手の選択）が処理される（エンジンの 11.5 ライフダメージ処理に合流）。
 *     - 〈フロンティアスピリット〉(hBP07-100) の枚数判定はコスト支払い（4枚アーカイブ）後の
 *       アーカイブを対象にする（テキストの記述順どおり）。
 */
export default {
  number: 'hBP07-069',
  arts: {
    '君と新たな開拓の地へ': {
      *run(ctx) {
        ctx.draw(2);
      },
    },
    '紡いだ軌跡 すべてに捧ぐ歌': {
      *run(ctx) {
        // 自分の推しホロメンが〈AZKi〉でなければ追加効果は発動しない
        if (ctx.player.oshi?.name !== 'AZKi') return;
        // 任意コスト: ホロパワーの上から4枚をアーカイブできる（4枚以上ある時のみ）
        if (ctx.player.holoPower.length < 4) return;
        const ok = yield ctx.confirm(
          'ホロパワーの上から4枚をアーカイブしますか？（アーカイブに〈フロンティアスピリット〉が4枚あれば相手のライフ-1）');
        if (!ok) return;
        const removed = ctx.player.holoPower.splice(0, 4);
        ctx.player.archive.push(...removed);
        ctx.log(`${ctx.player.name}: ホロパワーの上から4枚をアーカイブ（${removed.map((c) => c.name).join(' / ')}）`);
        // アーカイブに〈フロンティアスピリット〉が4枚あるなら、相手のライフ-1
        const fsCount = ctx.player.archive.filter((c) => c.name === 'フロンティアスピリット').length;
        if (fsCount >= 4) {
          ctx.opponent.lifeDamage += 1;
          ctx.log(`相手のライフ-1（アーカイブの〈フロンティアスピリット〉${fsCount}枚）`);
        } else {
          ctx.log(`アーカイブの〈フロンティアスピリット〉は${fsCount}枚のため相手のライフ-1は発動しない`);
        }
      },
    },
  },
};
