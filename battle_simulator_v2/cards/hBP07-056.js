/**
 * オーロ・クロニー (hBP07-056) 青・2nd・HP200（#EN #Promise）
 *
 * [キーワード/ギフト] 時界を統べし者:
 *   [センター限定]自分のパフォーマンスステップ開始時、このホロメン以外の自分の〈オーロ・クロニー〉1人を、
 *   このホロメンに重なっているホロメンを使ってBloomできる。
 *   → triggers.onPerformanceStepStart で実装。自分のパフォーマンス開始時、センターのこのオーロの
 *      重なっているホロメン（stack[1..]）1枚を取り出し、別の〈オーロ・クロニー〉にBloomさせる。
 *      通常Bloomなので _canBloomIgnoreName で判定する（このターンに出た/Bloomしたホロメンは対象外）。
 *      ブルームエフェクトも誘発する。
 *
 * [アーツ] You're not ready for me. (80+) icons: 青青無無 / 特攻: 赤+50
 *   このホロメンのエール1枚を自分の他の#Promiseを持つホロメンに付け替えられる。
 *     → run: 任意（「付け替えられる」=しなくてよい）でこのホロメンのエール1枚を選び、
 *        別の#Promiseホロメンへ moveCheer する。
 *   その後、自分の推しホロメンが〈オーロ・クロニー〉なら、このアーツ+100。
 *     → dmgBonus: 推しが「オーロ・クロニー」なら +100（付け替えの実行有無に依存しない独立条件）。
 */
export default {
  number: 'hBP07-056',
  triggers: {
    // キーワード「時界を統べし者」: 自分のパフォーマンス開始時、重なっているホロメンを使って別の〈オーロ・クロニー〉をBloom
    *onPerformanceStepStart(ctx) {
      if (ctx.state.turnPlayer !== ctx.playerIdx) return;     // 自分のパフォーマンスステップ
      const self = ctx.sourceHolomem;
      if (ctx.engine._zoneOf(self) !== 'center') return;      // [センター限定]
      if (self.stack[0].name !== 'オーロ・クロニー') return;
      const bloomCards = self.stack.slice(1).filter((c) => c.kind === 'holomen'); // 重なっているホロメン
      if (bloomCards.length === 0) return;
      // 通常Bloomの制限を満たすこと（このターンに出た／このターンBloomしたホロメンはBloom不可。_canBloomIgnoreName）。
      // ※これは「もう1回Bloom（再Bloom）」ではないので canReBloom（このターン制限を無視）は使わない。
      const matches = (e) => e.holomem !== self && e.top.name === 'オーロ・クロニー'
        && bloomCards.some((c) => ctx.engine._canBloomIgnoreName(e.holomem, c));
      const valid = ctx.holomems('self', matches);
      if (valid.length === 0) return;
      const entry = valid.length === 1
        ? valid[0]
        : yield ctx.chooseHolomem({ side: 'self', filter: matches, title: 'Bloomさせる別の〈オーロ・クロニー〉を選択', optional: true });
      if (!entry) return;
      const target = entry.holomem;
      const usable = bloomCards.filter((c) => ctx.engine._canBloomIgnoreName(target, c));
      const card = usable.length === 1
        ? usable[0]
        : yield ctx.chooseCard({ cards: usable, title: '重なっているホロメンから使うカードを選択', optional: true });
      if (!card) return;
      const i = self.stack.indexOf(card);
      if (i === -1) return;
      self.stack.splice(i, 1);          // このホロメンの重なりから取り出す
      target.stack.unshift(card);       // 別の〈オーロ・クロニー〉にBloom
      target.bloomedTurn = ctx.state.turn;
      ctx.log(`時界を統べし者: ${target.stack[1].name} → ${card.name}〔${card.bloomLevel}〕にBloom（重なりを使用）`);
      const def = ctx.engine.registry.get(card.number)?.bloomEffect;
      if (def) { ctx.log(`《ブルームエフェクト》${def.name}`); yield* ctx.runBloomEffect(def, card, target); }
    },
  },
  arts: {
    "You're not ready for me.": {
      *run(ctx) {
        const src = ctx.sourceHolomem;
        if (!src) return;
        const myCheers = src.cheers || [];
        if (myCheers.length === 0) return;
        // 付け替え先候補: 自分の他の#Promiseホロメン（このホロメン以外）
        const targets = ctx.holomems('self', (e) =>
          e.holomem !== src && ctx.hasTag(e.top, 'Promise'));
        if (targets.length === 0) return;

        const ok = yield ctx.confirm('このホロメンのエール1枚を他の#Promiseホロメンに付け替えますか？');
        if (!ok) return;

        const cheer = yield ctx.chooseCard({
          cards: [...myCheers],
          title: '付け替えるエールを選択',
          optional: true,
          skipLabel: '付け替えない',
        });
        if (!cheer) return;

        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.holomem !== src && ctx.hasTag(e.top, 'Promise'),
          title: 'エールを付け替える#Promiseホロメンを選択',
          optional: true,
        });
        if (!target) return;
        ctx.moveCheer(cheer, src, target.holomem);
      },
      dmgBonus(ctx) {
        return ctx.player.oshi?.name === 'オーロ・クロニー' ? 100 : 0;
      },
    },
  },
};
