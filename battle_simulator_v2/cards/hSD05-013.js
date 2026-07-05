/**
 * 音乃瀬奏 (hSD05-013) 黄・Debut・HP90（#DEV_IS,#ReGLOSS,#歌）
 * コラボエフェクト「クレッシェンドな日々」:
 *   自分のステージのエール1枚を、このホロメン以外の自分のホロメンに付け替えられる。
 *   → 任意効果（「できる」）。付け替え元・付け替え先はプレイヤーが選択。
 *     付け替え先は「このホロメン以外」の自分のホロメンに限定。
 * アーツ「ガハw」(20): 効果テキストなし（純粋なダメージアーツ）。
 */
export default {
  number: 'hSD05-013',
  collabEffect: {
    name: 'クレッシェンドな日々',
    *run(ctx) {
      // 付け替え先候補：このホロメン以外の自分のステージホロメン
      const destEntries = ctx.holomems('self', (e) => e.holomem !== ctx.sourceHolomem);
      if (destEntries.length === 0) return;

      // 付け替え可能なエールが1枚でも存在するか（自分のステージ上の全エール）
      const hasCheer = ctx.holomems('self').some((e) => e.holomem.cheers.length > 0);
      if (!hasCheer) return;

      const ok = yield ctx.confirm('自分のステージのエール1枚を付け替えますか？');
      if (!ok) return;

      // 付け替えるエールを選ぶ（自分のステージ上の全エールから）
      const cheerOptions = [];
      for (const e of ctx.holomems('self')) {
        for (const cheer of e.holomem.cheers) {
          cheerOptions.push({ cheer, from: e.holomem });
        }
      }
      const pickedCheer = yield ctx.chooseCard({
        cards: cheerOptions.map((o) => o.cheer),
        title: '付け替えるエールを選択',
        optional: true,
        skipLabel: '付け替えない',
      });
      if (!pickedCheer) return;
      const src = cheerOptions.find((o) => o.cheer === pickedCheer);
      if (!src) return;

      // 付け替え先（このホロメン以外）。付け替え元と同じホロメンは選んでも意味が無いが、
      // テキスト上は「このホロメン以外」の制限のみなので、ここでは元と同じも除外しない。
      const dest = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem !== ctx.sourceHolomem,
        title: 'エールの付け替え先のホロメンを選択',
      });
      if (!dest) return;
      if (dest.holomem === src.from) return; // 同じホロメンなら付け替え不要

      ctx.moveCheer(pickedCheer, src.from, dest.holomem);
    },
  },
  arts: {
    'ガハw': {
      // テキスト効果なし（ダメージ20のみ）
    },
  },
};
