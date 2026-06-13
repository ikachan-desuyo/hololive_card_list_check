/**
 * 小鳥遊キアラ (hBP08-044) 赤・2nd・HP170（#EN #Myth #トリ）
 *
 * [アーツ]「不敵なるファイヤーフォーゲル」(dmg:100 / 赤赤、特攻 紫+50):
 *   自分のデッキの上から1～3枚をアーカイブする。
 *   → アーツ run（ダメージ適用後）で実行。「1～3枚」は最低1枚必須・最大3枚なので、
 *     まず上から1枚をアーカイブし、デッキが残っている間 confirm で「さらにアーカイブするか」を
 *     最大3枚まで提示する（0枚は不可）。デッキが尽きたらそこで打ち切り。
 *     特攻（紫+50）はアイコン処理でエンジン側が扱うため run には書かない。
 *
 * 保留: ギフト「光、再び灯りて」（自分のメインステップで、アーカイブにホロメンが10枚以上あるなら、
 *   自分のホロメンをアーカイブのこのホロメンを使ってBloomできる。アーカイブにある時のみ使える）。
 *   registry.js に「アーカイブにある間だけ使えるギフト能力」を発火させるフックが無いため未実装。
 *   （bloomFromArchiveFlow プリミティブはあるが、起動主体がアーカイブのこのカード自身という
 *    起動型能力フックが現状存在しない。フック追加後に実装すること。）
 */
export default {
  number: 'hBP08-044',

  arts: {
    '不敵なるファイヤーフォーゲル': {
      *run(ctx) {
        const archiveTop = () => {
          const c = ctx.player.deck.shift();
          ctx.player.archive.push(c);
          ctx.log(`${ctx.player.name}: デッキの上から ${c.name} をアーカイブ`);
        };
        if (ctx.player.deck.length === 0) {
          ctx.log(`${ctx.player.name}: デッキが空のためアーカイブできない`);
          return;
        }
        // 1枚目は必須（「1～3枚」＝最低1枚）
        archiveTop();
        // 2枚目・3枚目は任意（最大3枚まで）
        let count = 1;
        while (count < 3 && ctx.player.deck.length > 0) {
          const more = yield ctx.confirm(
            `デッキの上からさらに1枚アーカイブする？（現在${count}枚／最大3枚）`,
            'アーカイブする',
            'やめる',
          );
          if (!more) break;
          archiveTop();
          count++;
        }
      },
    },
  },
};
