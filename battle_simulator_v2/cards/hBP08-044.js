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
 * ギフト「光、再び灯りて」:
 *   自分のメインステップで、アーカイブにホロメンが10枚以上あるなら、
 *   自分のホロメンをアーカイブのこのホロメンを使ってBloomできる。アーカイブにある時のみ使える。
 *   → archiveActivatedAbilities[]（アーカイブにある間だけメインステップで使える起動型能力。
 *     engine がコントローラーのアーカイブを走査して提示する）。
 *     canUse: アーカイブのホロメンが10枚以上＋このカードでBloomできる自分のホロメンがいる。
 *     run: Bloom先を選び、このカードをアーカイブから取り出して重ね、ブルームエフェクトも誘発する。
 */
export default {
  number: 'hBP08-044',

  archiveActivatedAbilities: [
    {
      name: '光、再び灯りて',
      canUse(ctx) {
        const self = ctx.sourceCard;
        // アーカイブにホロメンが10枚以上（このカード自身を含む）
        if (ctx.player.archive.filter((c) => c.kind === 'holomen').length < 10) return false;
        // このカードでBloomできる自分のホロメンがいる
        return ctx.holomems('self', (e) => ctx.engine._canBloom(e.holomem, self)).length > 0;
      },
      *run(ctx) {
        const self = ctx.sourceCard;
        const entry = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.engine._canBloom(e.holomem, self),
          title: `${self.name} でBloomさせる自分のホロメンを選択`,
        });
        if (!entry) return;
        ctx.removeFromArchive(self);
        entry.holomem.stack.unshift(self);
        entry.holomem.bloomedTurn = ctx.state.turn;
        ctx.log(`${entry.holomem.stack[1].name} → ${self.name}〔${self.bloomLevel}〕にBloom（アーカイブから）`);
        // ブルームエフェクトも誘発する (13.3)。このカードに無ければ何もしない
        const bdef = ctx.engine.registry.get(self.number)?.bloomEffect;
        if (bdef) {
          ctx.log(`《ブルームエフェクト》${bdef.name}`);
          yield* ctx.runBloomEffect(bdef, self, entry.holomem);
        }
      },
    },
  ],

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
