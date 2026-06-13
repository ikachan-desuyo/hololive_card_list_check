/**
 * 古石ビジュー (hSD12-002) 推しホロメン・紫
 *
 * 推しスキル「Biboo Tax」[ホロパワー：-2][ターンに1回]:
 *   お互いのエールデッキの上から1枚をアーカイブする。
 *   アーカイブしたエール1色につき、自分のデッキを1枚引く。
 *   → oshiSkill（能動）。自分と相手それぞれのエールデッキ上から1枚を、
 *     それぞれのアーカイブへ送る。その後、今アーカイブしたエール（最大2枚）の
 *     「色の種類数」だけ自分のデッキを引く（同色なら1、異色なら2）。
 *     ※コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *     ※どちらかのエールデッキが空でも、引ける分は引く（テキストに最低枚数の制限なし）。
 *
 * SP推しスキル「古代魔石の輝き」[ホロパワー：-2][ゲームに1回]:
 *   相手のセンターホロメンに、自分のアーカイブの[#Adventを持つホロメンとエール]1枚につき、
 *   特殊ダメージ10を与える。
 *   → spOshiSkill（能動）。自分のアーカイブにある「#Advent を持つホロメンカード」と
 *     「#Advent を持つエールカード」の合計枚数 × 10 の特殊ダメージを相手センターに与える。
 *     ※コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *     ※特殊ダメージのライフ減少抑止（noLifeOnDown）はテキストに記載が無いため付けない。
 */

// アーカイブが #Advent を持つホロメン or エール かを判定
function isAdventHolomemOrCheer(card) {
  if (!card) return false;
  const tags = card.tags || [];
  const hasAdvent = tags.includes('Advent');
  if (!hasAdvent) return false;
  return card.kind === 'holomem' || card.kind === 'cheer';
}

export default {
  number: 'hSD12-002',

  oshiSkill: {
    name: 'Biboo Tax',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      const opp = engine.state.players[1 - ownerIdx];
      // どちらかのエールデッキにカードがあれば意味がある
      return (p.cheerDeck.length > 0) || (opp.cheerDeck.length > 0);
    },
    *run(ctx) {
      const archived = [];
      // 自分のエールデッキの上から1枚をアーカイブ
      if (ctx.player.cheerDeck.length > 0) {
        const cheer = ctx.player.cheerDeck.shift();
        ctx.flashReveal(cheer);
        ctx.player.archive.push(cheer);
        archived.push(cheer);
        ctx.log(`${ctx.player.name}: エールデッキの上 ${cheer.name} をアーカイブ`);
      }
      // 相手のエールデッキの上から1枚をアーカイブ
      if (ctx.opponent.cheerDeck.length > 0) {
        const cheer = ctx.opponent.cheerDeck.shift();
        ctx.flashReveal(cheer);
        ctx.opponent.archive.push(cheer);
        archived.push(cheer);
        ctx.log(`${ctx.opponent.name}: エールデッキの上 ${cheer.name} をアーカイブ`);
      }
      // アーカイブしたエール1色につき、自分のデッキを1枚引く（色の種類数ぶん）
      const colors = new Set(archived.map((c) => c.color).filter((c) => c));
      if (colors.size > 0) {
        ctx.log(`アーカイブしたエールの色: ${[...colors].join('/')} → ${colors.size}枚ドロー`);
        ctx.draw(colors.size);
      }
    },
  },

  spOshiSkill: {
    name: '古代魔石の輝き',
    canUse(engine, ownerIdx) {
      const opp = engine.state.players[1 - ownerIdx];
      if (!opp.center) return false;
      const p = engine.state.players[ownerIdx];
      // 自分のアーカイブに #Advent ホロメン/エール が1枚以上あれば意味がある
      return p.archive.some(isAdventHolomemOrCheer);
    },
    *run(ctx) {
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (!center) return;
      const count = ctx.player.archive.filter(isAdventHolomemOrCheer).length;
      if (count <= 0) return;
      const amount = count * 10;
      ctx.log(`アーカイブの #Advent ホロメン/エール ${count}枚 → 特殊ダメージ${amount}`);
      yield* ctx.dealSpecialDamage(center, amount);
    },
  },
};
