/**
 * デッキ火力解析ランナー（ヘッドレス）。analyzeDeckFirepower の結果を console に出力する。
 * URL: ?deck=Azki単 &top=4 &cheers=6
 * 出力: FP-TOP（主力火力カード上位）/ FP-ART（全アーツ実効火力ランキング上位20）/ FP DONE
 */
import { CardLibrary } from '../core/cards.js';
import { EffectRegistry } from '../core/effects/registry.js';
import { analyzeDeckFirepower } from '../core/ai/firepower.js';

async function loadDeck(name) {
  for (const cand of [name, name.normalize('NFD'), name.normalize('NFC')]) {
    try { const r = await fetch('../test_deck/' + encodeURIComponent(cand) + '.json'); if (r.ok) return await r.json(); } catch { /* next */ }
  }
  throw new Error('デッキ読込不可: ' + name);
}

export async function runFirepower() {
  const params = new URLSearchParams(location.search);
  const deckName = params.get('deck') || 'Azki単';
  const topN = Number(params.get('top')) || 4;
  const cheerCount = Number(params.get('cheers')) || 6;

  const lib = await CardLibrary.load('../../json_file/card_data.json');
  const deckMap = await loadDeck(deckName);
  const registry = new EffectRegistry();
  await registry.preload(Object.keys(deckMap).map((id) => lib.get(id)?.number).filter(Boolean), lib);

  const { topCards, allArts } = analyzeDeckFirepower(lib, deckMap, registry, { topN, cheerCount });

  console.log(`FP-START| deck=${deckName} topN=${topN} cheers=${cheerCount}`);
  topCards.forEach((r, i) => {
    console.log(`FP-TOP| ${i + 1}. ${r.name}〔${r.bloomLevel}〕「${r.art}」 実効${r.effective}（素${r.base}＋効果${r.bonus} 特攻${r.tokkou}） [${r.setup}]`);
  });
  console.log('FP-ART| --- 全アーツ実効火力ランキング(上位20) ---');
  allArts.slice(0, 20).forEach((r, i) => {
    console.log(`FP-ART| ${i + 1}. ${r.name}〔${r.bloomLevel}〕「${r.art}」 実効${r.effective}（素${r.base}＋効果${r.bonus}）`);
  });
  console.log('FP DONE');
  return { topCards, allArts };
}
