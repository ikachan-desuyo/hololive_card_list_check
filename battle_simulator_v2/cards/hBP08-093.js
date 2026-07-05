/**
 * ちょこのなすユッケ (hBP08-093) サポート・イベント
 *
 * [サポート効果]:
 *   このカードは、自分のステージのホロメン全員が〈癒月ちょこ〉で、
 *   自分のライフが3以下でなければ使えない。
 *   このターンの間、自分のステージの[Debutホロメンと1stホロメン]全員のアーツ+20。
 *   その後、自分のステージの2ndホロメン全員のアーツ+60。
 *   自分の〈ちょこのなすユッケ〉はターンに1回しか使えない。
 *
 * 解釈:
 *   - 使用条件:
 *       ① 自分のステージにホロメンが1人以上いて、その全員の一番上のカード名が「癒月ちょこ」。
 *       ② 自分のライフが3以下（player.life.length <= 3）。
 *       ③ 「ターンに1回しか使えない」= 同名カードのターン1回制限（oncePerTurn キー）。
 *   - 効果:
 *       Debut/1stホロメン全員に artsPlus+20、2ndホロメン全員に artsPlus+60 を
 *       それぞれターン修正として付与（match で bloomLevel を判定。エンドステップで自動消滅）。
 *       選択は無いので yield しない。「その後」は処理順だが効果上は両方適用するだけ。
 *
 * 保留: なし（使用条件・効果とも全文実装）。
 */
const OSHI_NAME = '癒月ちょこ';
const ONCE_KEY = 'support:hBP08-093';

export default {
  number: 'hBP08-093',

  ai: {
    // ライフ3以下かつ全員癒月ちょこのデッキ専用。アーツ全体強化。
    supportValue({ engine, player }) {
      if (player.life.length > 3) return 0;
      const idx = engine.state.players.indexOf(player);
      if (engine.state.modifiers.some(
        (m) => m.kind === 'oncePerTurnUsed' && m.key === ONCE_KEY && m.ownerIdx === idx)) return 0;
      const stage = engine._stageHolomems(player);
      if (stage.length === 0) return 0;
      if (!stage.every((h) => h.stack[0].name === OSHI_NAME)) return 0;
      return 14;
    },
  },

  support: {
    canUse(ctx) {
      // ① ライフが3以下
      if (ctx.player.life.length > 3) return false;
      // ② ステージのホロメン全員が〈癒月ちょこ〉（1人以上いること前提）
      const stage = ctx.holomems('self');
      if (stage.length === 0) return false;
      if (!stage.every((e) => ctx.nameIs(e.top, OSHI_NAME))) return false;
      // ③ ターンに1回
      if (ctx.oncePerTurnUsed(ONCE_KEY)) return false;
      return true;
    },
    *run(ctx) {
      ctx.markOncePerTurn(ONCE_KEY);
      // Debut・1stホロメン全員のアーツ+20
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h.stack[0].bloomLevel === 'Debut' || h.stack[0].bloomLevel === '1st',
        description: 'このターンの間、自分のDebut/1stホロメン全員のアーツ+20',
      });
      // その後、2ndホロメン全員のアーツ+60
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 60, ownerIdx: ctx.playerIdx,
        match: (h) => h.stack[0].bloomLevel === '2nd',
        description: 'このターンの間、自分の2ndホロメン全員のアーツ+60',
      });
    },
  },
};
