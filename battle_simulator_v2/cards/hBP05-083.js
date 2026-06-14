/**
 * ネリッサ・レイヴンクロフトの杖 (hBP05-083) サポート・ツール
 *
 * 効果:
 *   このツールが付いているホロメンのアーツ+10。
 *   ◆2nd以上の〈ネリッサ・レイヴンクロフト〉に付いていたら能力追加:
 *     [センターポジション・コラボポジション限定][ターンに1回]
 *     このツールが付いているホロメンの能力で自分の手札をアーカイブした時、
 *     相手のセンターホロメンかコラボホロメンに特殊ダメージ20を与える。
 *   ツールは、自分のホロメン1人につき1枚だけ付けられる。
 *
 * 実装:
 *   - attached.artsPlus: 付いているホロメンのアーツ常時+10。
 *     付け先が 2nd 以上の〈ネリッサ・レイヴンクロフト〉でも、追加能力はアーツ修正ではないため +10 のまま。
 *   - 「ツールは1人につき1枚」はエンジンの supportType==='ツール' 既定上限で処理されるため
 *     attachRule は不要（特別な付け先制限が無いため定義しない）。
 *
 * 追加能力の実装:
 *   ctx.archiveHandCard（発生源ホロメンの能力で手札をアーカイブする共通プリミティブ）が、
 *   発生源ホロメンの装着カードの attached.onHostHandArchived を発火する。
 *   本ツールは、付け先が 2nd〈ネリッサ・レイヴンクロフト〉でセンター/コラボにいる時、
 *   [ターンに1回]、相手のセンター/コラボ1人に特殊ダメージ20を与える。
 */
export default {
  number: 'hBP05-083',

  attached: {
    // 付いているホロメンのアーツ+10（追加能力はアーツ修正ではないため常に+10）
    artsPlus() {
      return 10;
    },

    // ◆2nd以上の〈ネリッサ〉に付いている時：このホロメンの能力で手札をアーカイブした時、
    //   [センター/コラボ限定][ターンに1回]相手のセンター/コラボ1人に特殊ダメージ20
    * onHostHandArchived(ctx, host, self) {
      const top = host.stack[0];
      if (top.name !== 'ネリッサ・レイヴンクロフト' || top.bloomLevel !== '2nd') return;
      const zone = ctx.engine._zoneOf(host);
      if (zone !== 'center' && zone !== 'collab') return;
      if (self._handArchiveDmgTurn === ctx.state.turn) return; // [ターンに1回]
      const isFront = (e) => e.pos.zone === 'center' || e.pos.zone === 'collab';
      const targets = ctx.holomems('opp', isFront);
      if (targets.length === 0) return;
      self._handArchiveDmgTurn = ctx.state.turn;
      const entry = targets.length === 1
        ? targets[0]
        : yield ctx.chooseHolomem({ side: 'opp', filter: isFront, title: '特殊ダメージ20を与える相手のセンター/コラボを選択' });
      if (entry) yield* ctx.dealSpecialDamage(entry, 20);
    },
  },
};
