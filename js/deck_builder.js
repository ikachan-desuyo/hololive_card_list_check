let decks = {};
let currentDeck = null;
let cards = [];
let releaseMap = {};

function sortDeckByTypeAndId(cardIds) {
  // 優先度関数：文字列でなくカテゴリマッチに変更
  function getPriority(type) {
    if (type === "推しホロメン") return 1;
    if (type.includes("Buzzホロメン") || type.includes("ホロメン")) return 2; // ✅ 拡張済み
    if (type.includes("サポート")) return 3;
    if (type.includes("エール")) return 4;
    return 999; // その他は後方
  }

  return [...cardIds].sort((a, b) => {
    const cardA = cards.find(c => c.id === a);
    const cardB = cards.find(c => c.id === b);
    const typeA = cardA?.card_type ?? "";
    const typeB = cardB?.card_type ?? "";
    const prioA = getPriority(typeA);
    const prioB = getPriority(typeB);

    if (prioA !== prioB) return prioA - prioB;
    return a.localeCompare(b);
  });
}

// toggleDarkMode は utils.js で定義されているグローバル関数を使用

function createDeck() {
  // 読み取り専用モードチェック
  if (window.readOnlyMode && window.readOnlyMode.isEnabled()) {
    window.readOnlyMode.showWarning('デッキの作成');
    return;
  }

  const name = prompt("新しいデッキ名を入力してください");
  if (!name || name.trim() === "") {
    alert("デッキ名を入力してください");
    return;
  }
  if (decks[name]) {
    alert("同じ名前のデッキがすでに存在します");
    return;
  }
  decks[name] = [];
  currentDeck = name;
  updateDeckUI();
}

function switchDeck() {
  const select = document.getElementById("deckSelector");
  currentDeck = select.value;
  updateDeckUI();
}

function deleteDeck() {
  // 読み取り専用モードチェック
  if (window.readOnlyMode && window.readOnlyMode.isEnabled()) {
    window.readOnlyMode.showWarning('デッキの削除');
    return;
  }

  if (!currentDeck) return;
  if (!confirm(`「${currentDeck}」を削除しますか？`)) return;

  delete decks[currentDeck];
  currentDeck = null;

  // ✅ UI更新
  updateDeckUI();
  renderDeckList();

  // ✅ 選択枚数表示をリセット
  document.getElementById("cardStats").textContent = "";

  // ✅ デッキカード一覧の表示もリセット（サムネイル表示部）
  document.getElementById("deckCardList").innerHTML = "";

  // ✅ 「現在のデッキ名」もリセット
  document.getElementById("currentDeckName").textContent = "未選択";
}

function addCardToDeck(cardId) {
  // 読み取り専用モードチェック
  if (window.readOnlyMode && window.readOnlyMode.isEnabled()) {
    window.readOnlyMode.showWarning('デッキへのカード追加');
    return;
  }

  if (!currentDeck) {
    alert("先にデッキを選択してください");
    return;
  }
  // 上限チェック
  const deck = decks[currentDeck];
  const card = cards.find(c => c.id === cardId);
  if (!card) return;
  // 現在の構成をカウント
  const typeCounts = { oshi: 0, cheer: 0, other: 0 };
  deck.forEach(id => {
    const c = cards.find(x => x.id === id);
    if (!c) return;
    if (c.card_type === "推しホロメン") typeCounts.oshi += 1;
    else if (c.card_type === "エール") typeCounts.cheer += 1;
    else typeCounts.other += 1;
  });
  // 追加後の仮カウント
  if (card.card_type === "推しホロメン") typeCounts.oshi += 1;
  else if (card.card_type === "エール") typeCounts.cheer += 1;
  else typeCounts.other += 1;
  // 上限判定
  if (typeCounts.oshi > 1) {
    alert("推しホロメンは1枚までです");
    return;
  }
  if (typeCounts.cheer > 20) {
    alert("エールカードは最大20枚までです");
    return;
  }
  if (typeCounts.other > 50) {
    alert("その他カードは最大50枚までです");
    return;
  }
  deck.push(cardId);
  updateDeckUI();
}

function openExportDeckModal() {
  const modal = document.getElementById("exportModal");
  const selector = document.getElementById("exportDeckSelector");
  selector.innerHTML = `<option value="">-- 選択してください --</option>` +
    Object.keys(decks).map(name => `<option value="${name}">${name}</option>`).join("");

  modal.style.display = "block";
}

function closeExportDeckModal() {
  document.getElementById("exportModal").style.display = "none";
}

function confirmExportDeck() {
  const deckName = document.getElementById("exportDeckSelector").value;
  if (!deckName || !decks[deckName]) {
    alert("デッキが選択されていません");
    return;
  }

  const countMap = {};
  decks[deckName].forEach(id => {
    countMap[id] = (countMap[id] || 0) + 1;
  });

  const jsonText = JSON.stringify(countMap, null, 2);
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, jsonText], { type: "application/json" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${deckName}.json`;
  link.click();

  closeExportDeckModal();
}

function triggerDeckImport() {
  // 読み取り専用モードチェック
  if (window.readOnlyMode && window.readOnlyMode.isEnabled()) {
    window.readOnlyMode.showWarning('デッキのインポート');
    return;
  }

  const hiddenFileInput = document.getElementById("importDeckFileHidden");
  hiddenFileInput.accept = ".json";
  hiddenFileInput.onchange = () => {
    const file = hiddenFileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const json = JSON.parse(e.target.result);
        const deckName = file.name.replace(/\.json$/i, "").trim();
        if (!deckName) {
          alert("ファイル名からデッキ名が取得できませんでした");
          return;
        }

        const ids = [];
        Object.entries(json).forEach(([id, count]) => {
          const n = Math.max(0, parseInt(count) || 0);
          for (let i = 0; i < n; i++) ids.push(id);
        });

        decks = decks || {}; // ✅ 初期状態対応
        decks[deckName] = ids;
        currentDeck = deckName;

        updateDeckUI(); // ✅ UI更新呼び出しを保証
        alert(`デッキ「${deckName}」をインポートしました！`);
      } catch {
        alert("読み込みに失敗しました。ファイル形式や内容を確認してください。");
      }
    };

    reader.readAsText(file);
  };

  hiddenFileInput.click();
}

function updateDeckUI() {
  localStorage.setItem("deckData", JSON.stringify(decks));

  const select = document.getElementById("deckSelector");
  select.innerHTML = `<option value="">📂 デッキ選択</option>` +
    Object.keys(decks).map(name =>
      `<option value="${name}" ${name === currentDeck ? "selected" : ""}>${name} (${decks[name].length})</option>`
    ).join("");

  document.getElementById("currentDeckName").textContent = currentDeck || "未選択";
  const list = document.getElementById("deckCardList");
  list.innerHTML = "";

  if (!currentDeck) {
    document.getElementById("cardSelectionArea").style.display = "none";
    return;
  }

  document.getElementById("cardSelectionArea").style.display = "block";

  // ✅ 選択枚数合計表示
  document.getElementById("cardStats").textContent = `選択枚数：${decks[currentDeck].length}枚`;

  // ✅ デッキ構成分類（推し・エール・その他）
  function classifyDeckByType(deckIds) {
    const typeCounts = { oshi: 0, cheer: 0, other: 0 };
    deckIds.forEach(id => {
      const card = cards.find(c => c.id === id);
      if (!card) return;
      if (card.card_type === "推しホロメン") typeCounts.oshi += 1;
      else if (card.card_type === "エール") typeCounts.cheer += 1;
      else typeCounts.other += 1;
    });
    return typeCounts;
  }

  const typeCounts = classifyDeckByType(decks[currentDeck]);
  let warning = "";
  if (typeCounts.oshi > 1) warning += `💥 推しホロメンは1枚必要です\n`;
  if (typeCounts.cheer > 20) warning += `💥 エールカードは最大20枚までです\n`;
  if (typeCounts.other > 50) warning += `💥 その他カードは最大50枚までです\n`;
  if (warning) alert(warning);

  // ✅ デッキ構成を表示（任意の位置に #deckBreakdown がある前提）
  const breakdown = document.getElementById("deckBreakdown");
  if (breakdown) {
    breakdown.textContent =
      `💖 推しホロメン：${typeCounts.oshi}枚　📣 エール：${typeCounts.cheer}枚　🎴 その他：${typeCounts.other}枚`;
  }

  const countMap = {};
  decks[currentDeck].forEach(id => {
    countMap[id] = (countMap[id] || 0) + 1;
  });

  const sortedCardIds = sortDeckByTypeAndId(Object.keys(countMap));
  sortedCardIds.forEach(cardId => {
    const count = countMap[cardId]; // ✅ 枚数取得

    const wrapper = document.createElement("div");
    wrapper.className = "card-thumb";

    const card = cards.find(c => c.id === cardId);
    const img = document.createElement("img");
    img.src = card?.image ?? `images/${cardId}.png`;
    img.alt = card?.name ?? cardId;
    img.onerror = () => { img.src = "images/placeholder.png"; };
    wrapper.appendChild(img);

    const badge = document.createElement("div");
    badge.className = "count-badge";
    badge.textContent = `×${count}`;
    wrapper.appendChild(badge);

    const del = document.createElement("div");
    del.className = "delete-btn";
    del.textContent = "×";
    del.onclick = () => {
      // 読み取り専用モードチェック
      if (window.readOnlyMode && window.readOnlyMode.isEnabled()) {
        window.readOnlyMode.showWarning('デッキからのカード削除');
        return;
      }
      decks[currentDeck] = decks[currentDeck].filter(id => id !== cardId);
      updateDeckUI();
    };
    wrapper.appendChild(del);

    list.appendChild(wrapper);
  });
  renderDeckList();
  renderCardSelectionGallery();
}

function renderDeckList() {
  const container = document.getElementById("deckList");
  container.innerHTML = "";

  const deckNames = Object.keys(decks).filter(name => decks[name] && decks[name].length >= 0);
  if (deckNames.length === 0) {
    container.innerHTML = "<div style='color:#666;'>📂 デッキは存在しません</div>";
    return;
  }

  const cardMap = Object.fromEntries(cards.map(c => [c.id, c]));

  deckNames.forEach(name => {
    const cardIds = decks[name];

    // ✅ 推しホロメンの画像を探す
    const oshiCardId = cardIds.find(id => {
      const card = cardMap[id];
      return card?.card_type === "推しホロメン";
    });

    const fallbackId = cardIds[0] ?? "placeholder";
    const imageId = oshiCardId ?? fallbackId;
    const imageUrl = cardMap[imageId]?.image ?? `images/${imageId}.png`;

    const box = document.createElement("div");
    box.className = "deck-box";
    box.onclick = () => {
      currentDeck = name;
      updateDeckUI();
    };
    box.innerHTML = `
      <img src="${imageUrl}" alt="${name}" onerror="this.src='images/placeholder.png'" />
      <div style="font-weight:bold;">${name}</div>
      <div>枚数: ${cardIds.length}</div>
    `;
    container.appendChild(box);
  });
}

function toggleFilters() {
  const el = document.getElementById("filtersWrapper");
  el.style.display = window.getComputedStyle(el).display === "none" ? "block" : "none";
}

function toggleChip(btn) {
  const group = btn.parentElement;
  const allBtn = group.querySelector(".all-chip");
  if (allBtn) allBtn.classList.remove("selected");
  btn.classList.toggle("selected");
  renderCardSelectionGallery();
}

function selectAllChip(allBtn) {
  const group = allBtn.parentElement;
  group.querySelectorAll(".chip").forEach(btn => btn.classList.remove("selected"));
  allBtn.classList.add("selected");
  renderCardSelectionGallery();
}

function getCheckedFromChips(id) {
  const allSelected = document.querySelector(`#${id} .chip.all-chip.selected`);
  if (allSelected) return [];
  return [...document.querySelectorAll(`#${id} .chip.selected:not(.all-chip)`)].map(btn => btn.dataset.value);
}

function setupFilterChips() {
  const raritySet = new Set();
  const colorSet = new Set();
  const bloomSet = new Set();
  const productSet = new Set();
  const tagSet = new Set();
  const typePartsSet = new Set();

  cards.forEach(c => {
    raritySet.add(c.rarity);
    colorSet.add(c.color);
    bloomSet.add(c.bloom);
    c.tags?.forEach(tag => tagSet.add(tag));
    const typeParts = c.card_type?.split("・") ?? [];
    typeParts.forEach(part => typePartsSet.add(part.trim()));
    if (!c.product.includes(",")) {
      productSet.add(c.product);
    }
  });

  function populateChipGroup(id, items, withAll = true) {
    const container = document.getElementById(id);
    container.innerHTML = "";

    // 所持状態フィルターのラベルマップ
    const ownedLabelMap = {
      owned: "所持あり",
      unowned: "所持なし"
    };

    if (withAll) {
      const allBtn = document.createElement("button");
      allBtn.textContent = "すべて";
      allBtn.className = "chip all-chip selected";
      allBtn.dataset.value = "ALL";
      allBtn.onclick = () => selectAllChip(allBtn);
      container.appendChild(allBtn);
    }
    [...items].sort().forEach(val => {
      const btn = document.createElement("button");
      // 所持状態フィルターの場合は日本語ラベルを使用
      const label = id === "ownedStateChipGroup" ? ownedLabelMap[val] ?? val : val;
      btn.textContent = label;
      btn.className = "chip";
      btn.dataset.value = val;
      btn.onclick = () => toggleChip(btn);
      container.appendChild(btn);
    });
  }

  function populateSelect(id, items, label) {
    const select = document.getElementById(id);
    select.innerHTML = `<option value="">${label}</option>`;
    [...items].sort().forEach(val => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    });
  }

  populateChipGroup("rarityFilter", raritySet);
  populateChipGroup("colorFilter", colorSet);
  populateChipGroup("bloomFilter", bloomSet);
  populateChipGroup("cardTypeChipGroup", typePartsSet); // ✅ カードタイプの分割チップ表示
  populateChipGroup("ownedStateChipGroup", ["owned", "unowned"], true); // 「すべて」チップを追加
  populateSelect("productFilter", productSet, "収録商品");
  populateSelect("tagFilterSelect", tagSet, "タグ（選択）"); // ✅ タグはセレクト形式
}

// 共通のヘルパー関数：複数商品名から最も早い発売日を取得
function getEarliestReleaseDate(productString) {
  const products = productString.split(',').map(p => p.trim());
  let earliestDate = "9999-12-31";

  for (const product of products) {
    const date = releaseMap[product];
    if (date && date < earliestDate) {
      earliestDate = date;
    }
  }
  return earliestDate;
}

// フィルターされた商品に基づく発売日取得（フィルター適用時専用）
function getFilteredReleaseDate(productString, filteredProduct) {
  if (!filteredProduct) {
    return getEarliestReleaseDate(productString);
  }

  const products = productString.split(',').map(p => p.trim());
  const matchingProduct = products.find(p => p.toLowerCase().includes(filteredProduct));

  if (matchingProduct && releaseMap[matchingProduct]) {
    return releaseMap[matchingProduct];
  }

  return getEarliestReleaseDate(productString);
}

function sortCards(list, method, productFilter = "") {
  const sorted = [...list];
  if (method === "release") {
    sorted.sort((a, b) => {
      // 1. フィルター商品が設定されている場合は、その商品の発売日を優先
      const ra = getFilteredReleaseDate(a.product, productFilter);
      const rb = getFilteredReleaseDate(b.product, productFilter);
      if (ra !== rb) return ra.localeCompare(rb);

      // 2. 同じ発売日の場合、エールかどうかをチェック
      const aIsYell = a.card_type && a.card_type.includes("エール");
      const bIsYell = b.card_type && b.card_type.includes("エール");

      if (aIsYell !== bIsYell) {
        return aIsYell ? 1 : -1; // エールを後ろに
      }

      // 3. 同じ商品内ではカード番号順
      return a.id.localeCompare(b.id);
    });
  } else if (method === "id") {
    sorted.sort((a, b) => {
      if (a.id !== b.id) return a.id.localeCompare(b.id);
      // 同じIDの場合は、フィルター商品の発売日順
      const ra = getFilteredReleaseDate(a.product, productFilter);
      const rb = getFilteredReleaseDate(b.product, productFilter);
      return ra.localeCompare(rb);
    });
  } else if (method === "name") {
    sorted.sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name, "ja");
      if (nameCompare !== 0) return nameCompare;
      // 同じ名前の場合は、フィルター商品の発売日順
      const ra = getFilteredReleaseDate(a.product, productFilter);
      const rb = getFilteredReleaseDate(b.product, productFilter);
      return ra.localeCompare(rb);
    });
  } else if (method === "rarity") {
    const rank = {
      "SEC": 14, "OUR": 13, "UR": 12, "SY": 11, "OSR": 10,
      "SR": 9, "P": 8, "S": 7, "OC": 6, "RR": 5,
      "R": 4, "U": 3, "C": 2, "‐": 1, "-": 1
    };
    sorted.sort((a, b) => {
      const rarityDiff = (rank[b.rarity] ?? 0) - (rank[a.rarity] ?? 0);
      if (rarityDiff !== 0) return rarityDiff;
      // 同じレアリティ内では、フィルター商品の発売日順
      const ra = getFilteredReleaseDate(a.product, productFilter);
      const rb = getFilteredReleaseDate(b.product, productFilter);
      if (ra !== rb) return ra.localeCompare(rb);
      return a.id.localeCompare(b.id);
    });
  }
  return sorted;
}

function renderCardSelectionGallery() {
  const rawKeyword = document.getElementById("nameSearch").value.trim();
  const keyword = window.normalizeText(rawKeyword);
  const sortMethod = document.getElementById("sortMethod").value;

  const owned = getCheckedFromChips("ownedStateChipGroup");
  const rarity = getCheckedFromChips("rarityFilter");
  const color = getCheckedFromChips("colorFilter");
  const bloom = getCheckedFromChips("bloomFilter");
  const cardTypeFilters = getCheckedFromChips("cardTypeChipGroup");
  const product = document.getElementById("productFilter").value;
  const selectedTag = document.getElementById("tagFilterSelect").value;

  const container = document.getElementById("cardGallery");
  container.innerHTML = "";
  container.className = "card-grid";

  const countMap = {};
  if (currentDeck && decks[currentDeck]) {
    decks[currentDeck].forEach(id => {
      countMap[id] = (countMap[id] || 0) + 1;
    });
  }

  const filtered = cards.filter(card => {
    const ownedCount = card.owned ?? 0;
    const matchOwned =
      owned.length === 0 ||
      (owned.includes("owned") && ownedCount > 0) ||
      (owned.includes("unowned") && ownedCount === 0);

    const allText = window.normalizeText([
      card.name,
      card.id,
      card.rarity,
      card.color,
      card.bloom,
      card.hp ?? card.life ?? "",
      card.product,
      card.card_type,
      ...(card.skills ?? []),
      ...(card.tags ?? [])
    ].join(" "));

    const match = {
      rarity: rarity.length === 0 || rarity.includes(card.rarity),
      color: color.length === 0 || color.includes(card.color),
      bloom: bloom.length === 0 || bloom.includes(card.bloom),
      product: !product || card.product.toLowerCase().includes(product.toLowerCase()),
      tag: !selectedTag || (card.tags && card.tags.includes(selectedTag)),
      cardType:
        cardTypeFilters.length === 0 ||
        cardTypeFilters.some(type => {
          const typeParts = card.card_type?.split("・") ?? [];
          return typeParts.some(part => part.trim() === type);
        }),
      keyword: keyword === "" || allText.includes(keyword)
    };

    return matchOwned && !Object.values(match).includes(false);
  });

  const productFilter = document.getElementById("productFilter")?.value?.toLowerCase() || "";
  const sorted = sortCards(filtered, sortMethod, productFilter);

  const totalSelected = currentDeck && decks[currentDeck] ? decks[currentDeck].length : 0;
  document.getElementById("cardStats").textContent = `選択枚数：${totalSelected}枚`;

  sorted.forEach(card => {
    const selectedCount = countMap[card.id] || 0;
    const ownedCount = card.owned ?? 0;

    const box = document.createElement("div");
    box.className = "card-box";
    box.onclick = () => addCardToDeck(card.id);
    box.style.position = "relative";

    const img = document.createElement("img");
    img.src = card.image;
    img.alt = card.name;
    img.onerror = () => { img.src = "images/placeholder.png"; };
    box.appendChild(img);

    const info = document.createElement("div");
    info.className = "card-info";
    info.innerHTML = `
      <div style="font-weight:bold;">${card.name}</div>
      <div style="font-weight:bold;">📄${card.id}</div>
      <div style="font-weight:bold;">✨${card.rarity}　🃏所持：${ownedCount}枚</div>
    `;
    box.appendChild(info);

    if (selectedCount > 0) {
      const badge = document.createElement("div");
      badge.className = "count-badge";
      badge.textContent = `×${selectedCount}`;
      box.appendChild(badge);

      const minus = document.createElement("div");
      minus.className = "delete-btn";
      minus.textContent = "−";
      minus.title = "このカードを1枚デッキから外す";
      minus.onclick = (e) => {
        e.stopPropagation();
        const index = decks[currentDeck].indexOf(card.id);
        if (index !== -1) {
          decks[currentDeck].splice(index, 1);
          updateDeckUI();
        }
      };
      box.appendChild(minus);
    }

    container.appendChild(box);
  });
}
function classifyDeckByType(deckIds) {
  const typeCounts = {
    oshi: 0,
    cheer: 0,
    other: 0
  };

  deckIds.forEach(id => {
    const card = cards.find(c => c.id === id);
    if (!card) return;

    const type = card.card_type;
    if (type === "推しホロメン") {
      typeCounts.oshi += 1;
    } else if (type === "エール") {
      typeCounts.cheer += 1;
    } else {
      typeCounts.other += 1;
    }
  });

  return typeCounts;
}

// DOMコンテンツが読み込まれた後に初期化処理を実行
async function initializeDeckBuilder() {
    // 🌙 ダークモード
    if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark");
    }

    // 📱 モバイル判定
    if (window.innerWidth <= 600) {
document.body.classList.add("mobile-layout");
    }

    // 💾 保存されたデッキ読み込み
    const savedDecks = window.storageProvider.getDeckData();
    if (savedDecks) {
try {
decks = JSON.parse(savedDecks);
currentDeck = Object.keys(decks)[0] ?? null;
} catch {
}
    }

    try {
      // Try to load from localStorage first (for offline use)
      const cachedCardData = localStorage.getItem('cardData');
      const cachedReleaseData = localStorage.getItem('releaseData');
      const cacheTimestamp = localStorage.getItem('dataTimestamp');
      const now = Date.now();
      const cacheAge = now - (parseInt(cacheTimestamp) || 0);
      const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
      // アプリのバージョンが変わったらキャッシュを無効化（更新後に古いカードデータが残らないように）
      const appVer = self.APP_VERSION || '';
      const versionMatches = localStorage.getItem('dataVersion') === appVer;

      let rawData, releaseMapData;

      // バージョン一致 かつ 24時間以内（またはオフライン）の時だけキャッシュを使う
      if (cachedCardData && cachedReleaseData && versionMatches && (cacheAge < maxCacheAge || !navigator.onLine)) {
rawData = JSON.parse(cachedCardData);
releaseMapData = JSON.parse(cachedReleaseData);
      } else {
// Fetch fresh data
const [cardRes, releaseRes] = await Promise.all([
  fetch("json_file/card_data.json"),
  fetch("json_file/release_dates.json")
]);
rawData = await cardRes.json();
releaseMapData = await releaseRes.json();

// Cache the data（バージョンも記録）
localStorage.setItem('cardData', JSON.stringify(rawData));
localStorage.setItem('releaseData', JSON.stringify(releaseMapData));
localStorage.setItem('dataTimestamp', now.toString());
localStorage.setItem('dataVersion', appVer);
      }

      releaseMap = releaseMapData;

      cards = Object.entries(rawData).map(([key, card]) => ({
id: key,
name: card.name,
rarity: card.rarity ?? "-",
color: card.color ?? "-",
bloom: card.bloom_level ?? "-",
hp: card.hp ?? null,
life: card.life ?? null,
product: card.product ?? "-",
tags: card.tags ?? [],
skills: card.skills ?? [],
image: card.image_url || `images/${key}.png`,
owned: parseInt(localStorage.getItem("count_" + key) ?? "0"),
card_type: card.card_type ?? "-"
      }));

      setupFilterChips();
      updateDeckUI();

// データ読み込み成功をコンソールに記録
console.log('デッキビルダー初期化完了:', {
    cardCount: cards.length,
    dataSource: navigator.onLine && (cacheAge >= maxCacheAge) ? 'オンライン' : 'キャッシュ',
    cacheAge: cacheTimestamp ? `${Math.round(cacheAge / (60 * 60 * 1000))}時間` : '新規'
});
    } catch (err) {
console.error('デッキビルダー初期化エラー:', err);
alert("カードデータの読み込みに失敗しました！オフライン時は過去にアクセスした際のデータが必要です。");
    }

    // 🔄 Service Worker登録 & アップデート検出
    if ('serviceWorker' in navigator) {
navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
  .then((registration) => {

    // Listen for messages from Service Worker
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'CACHE_UPDATED') {
        window.location.reload(true);
      }
    });

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New content available, reload the page immediately
          // Clear all caches first
          caches.keys().then(cacheNames => {
            return Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
          }).then(() => {
            // Force reload without user confirmation
            window.location.reload(true);
          });
        }
      });
    });
  })
  .catch((registrationError) => {
  });
    }
}

// DOMContentLoaded時に初期化実行
document.addEventListener('DOMContentLoaded', function() {
    // デッキビルダー初期化
    initializeDeckBuilder();
    
    // Service Worker からバージョン情報を取得して表示
    setTimeout(() => {
        displayVersionInfo();
    }, 1000);
});

    // 🌐 オンライン/オフライン状態の表示管理
    function updateOnlineStatus() {
const statusElement = document.getElementById('offline-status');
if (statusElement) {
    if (navigator.onLine) {
        statusElement.textContent = '🟢 オンライン';
        statusElement.style.color = '#4CAF50';
    } else {
        statusElement.textContent = '🔴 オフライン';
        statusElement.style.color = '#F44336';
    }
}
    }

    // ネットワーク状態変更とページロード時のステータス更新
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    window.addEventListener('load', updateOnlineStatus);

async function sendMessageToSW(type, data) {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    throw new Error('Service Worker not available');
  }

  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };
    navigator.serviceWorker.controller.postMessage({ type, data }, [messageChannel.port2]);
  });
}

// ✅ バージョン情報を取得
async function getVersionInfo() {
  return await sendMessageToSW('GET_VERSION_INFO');
}


// ✅ バージョン情報を表示する関数
async function displayVersionInfo() {
  const statusEl = document.getElementById('versionDisplay');
  if (!statusEl) return;

  try {
    const versionInfo = await getVersionInfo();
    if (versionInfo && versionInfo.data) {
      statusEl.textContent = `[v${versionInfo.data.pageVersions['deck_builder.html']}-CENTRALIZED]`;
    }
  } catch (error) {
    statusEl.textContent = '[v4.0.0-CENTRALIZED]';
  }
}

// ✅ Service Worker登録
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(function(registration) {
  }).catch(function(error) {
  });
}
