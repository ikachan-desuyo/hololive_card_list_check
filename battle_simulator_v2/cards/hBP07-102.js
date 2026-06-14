/**
 * 角巻わためのハンマー (hBP07-102) サポート・ツール
 *
 * [サポート効果] このツールが付いている〈角巻わため〉のアーツ+20。
 *
 * ◆2ndの〈角巻わため〉に付いていたら能力追加:
 *   ■[センターポジション限定]このホロメンのアーツ+30。
 *   ■[センターポジション限定]このホロメンがアーツを使った時、サイコロを1回振る。
 *     3か5なら、このホロメン以外の自分のホロメン1人に特殊ダメージ50を与える。
 *
 * ツールは、自分のホロメン1人につき1枚だけ付けられる（エンジン既定のツール制限で担保）。
 *
 * 実装方針:
 *   - アーツ+20（〈角巻わため〉に付いている時）と、追加の +30（2ndのセンター）は
 *     attached.artsPlus で常時修正として実装。
 *   - 「このホロメンがアーツを使った時」の追加能力（サイコロ→特殊ダメージ50）は
 *     triggers.onArtsUse で実装（2ndの〈角巻わため〉センター時、3か5で他ホロメン1人に特殊50）。
 */
export default {
  number: 'hBP07-102',
  attached: {
    artsPlus(holomem, engine) {
      const host = holomem.stack[0];
      if (!host || host.name !== '角巻わため') return 0;
      let total = 20; // 基本: 〈角巻わため〉のアーツ+20
      // 追加: 2nd の〈角巻わため〉でセンターにいるなら +30
      if (host.bloomLevel === '2nd' && engine._zoneOf(holomem) === 'center') {
        total += 30;
      }
      return total;
    },
  },
  triggers: {
    // ◆2ndの〈角巻わため〉センター時: アーツを使った時サイコロを1回振る。3か5なら、このホロメン以外の自分のホロメン1人に特殊ダメージ50
    * onArtsUse(ctx) {
      const host = ctx.sourceHolomem;
      if (host?.stack[0].name !== '角巻わため' || host.stack[0].bloomLevel !== '2nd') return;
      if (ctx.engine._zoneOf(host) !== 'center') return;
      const v = yield* ctx.rollDice();
      if (v !== 3 && v !== 5) return;
      if (ctx.holomems('self', (e) => e.holomem !== host).length === 0) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => e.holomem !== host,
        title: '特殊ダメージ50を与える自分のホロメン（このホロメン以外）を選択',
      });
      if (entry) yield* ctx.dealSpecialDamage(entry, 50);
    },
  },
};
