/**
 * 姫森ルーナ (hBP06-031) 緑・2nd・HP190（#JP #4期生 #ベイビー）
 * ブルームエフェクト「んなっしょい！」:
 *   自分の推しホロメンが〈姫森ルーナ〉なら、自分のステージの〈ルーナイト〉1～2枚をアーカイブできる：
 *   アーカイブしたカード1枚につき、自分のエールデッキの上から1枚を自分の〈姫森ルーナ〉1人に送る。
 *   ※〈ルーナイト〉はカード名（hBP03-105 等のファンサポート）。ステージ上のホロメンに付いているものが対象。
 *   ※「できる」＝任意、「1～2枚」＝1枚または2枚（0は不可だが、付いている枚数が0なら発動しない）。
 *    アーカイブした枚数ぶん、エールデッキ上から1枚ずつ〈姫森ルーナ〉に送る（送り先は1枚ごとに選択）。
 * アーツ「ずっと一緒なのらね」(160+):
 *   このホロメンに〈ルーナイト〉が2枚以上付いているなら、このアーツ+50。
 */
export default {
  number: 'hBP06-031',
  bloomEffect: {
    name: 'んなっしょい！',
    *run(ctx) {
      // 発動条件: 自分の推しホロメンが〈姫森ルーナ〉
      if (ctx.player.oshi?.name !== '姫森ルーナ') return;

      // ステージ上の〈ルーナイト〉（カード名）一覧を収集
      const collect = () => {
        const list = [];
        for (const e of ctx.holomems('self')) {
          for (const a of e.holomem.attachments) {
            if (a.name === 'ルーナイト') list.push({ holomem: e.holomem, card: a, top: e.top });
          }
        }
        return list;
      };

      const available = collect();
      if (available.length === 0) return; // 付いている〈ルーナイト〉が無ければ何もしない

      // 任意発動: 最大2枚までアーカイブできる
      const ok = yield ctx.confirm('ステージの〈ルーナイト〉をアーカイブしてエールを送りますか？');
      if (!ok) return;

      // 最大2枚を一括選択してアーカイブ（任意）。候補は付いている〈ルーナイト〉一覧
      const entries = available;
      const pickedCards = yield ctx.chooseCards({
        cards: entries.map((x) => x.card),
        min: 0,
        max: 2,
        title: 'アーカイブする〈ルーナイト〉を選択（最大2枚・任意）',
      });
      let archived = 0;
      for (const picked of pickedCards) {
        const entry = entries.find((x) => x.card === picked);
        const idx = entry.holomem.attachments.indexOf(picked);
        if (idx !== -1) entry.holomem.attachments.splice(idx, 1);
        ctx.player.archive.push(picked);
        ctx.log(`${entry.top.name} の ${picked.name} をアーカイブ`);
        archived++;
      }

      if (archived === 0) return;

      // アーカイブした枚数ぶん、エールデッキ上から〈姫森ルーナ〉1人に1枚ずつ送る
      for (let i = 0; i < archived; i++) {
        const lunas = ctx.holomems('self', (e) => e.top.name === '姫森ルーナ');
        if (lunas.length === 0) break;
        if (ctx.player.cheerDeck.length === 0) break;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === '姫森ルーナ',
          title: `エールを送る〈姫森ルーナ〉を選択（${i + 1}/${archived}）`,
        });
        if (!target) break;
        ctx.sendCheerFromCheerDeckTop(target.holomem);
      }
    },
  },
  arts: {
    'ずっと一緒なのらね': {
      dmgBonus(ctx) {
        const lunaights = ctx.sourceHolomem.attachments.filter((a) => a.name === 'ルーナイト').length;
        return lunaights >= 2 ? 50 : 0;
      },
    },
  },
};
