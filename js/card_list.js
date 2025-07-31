// トグルボタンで簡易表示・表モードを切り替え
function toggleViewMode() {
  console.log('[toggleViewMode] before:', viewMode);
  if (viewMode === "table") {
    setViewMode("compact");
  } else {
    setViewMode("table");
  }
  console.log('[toggleViewMode] after:', viewMode);
  updateViewModeButton();
}

// ボタンのラベル・アイコンを現在のモードに合わせて更新
function updateViewModeButton() {
  const btn = document.getElementById("toggleViewModeBtn");
  if (!btn) return;
  if (viewMode === "table") {
    btn.textContent = "🖼️ 簡易表示";
    btn.title = "簡易表示に切り替えますわ";
  } else {
    btn.textContent = "🧾 表モード";
    btn.title = "表モードに切り替えますわ";
  }
}
      let cards = [];
      let releaseMap = {};
      let viewMode = "compact";
      let renderLimit = 50; // 初期表示数を50に削減
      let isRendering = false; // レンダリング中フラグを追加

      const ownedLabelMap = {
        owned: "所持あり",
        unowned: "所持なし"
      };

      // スキル表示用のアイコンマップ
      const iconImageMap = {
        red: "images/TCG-ColorArtIcon-Red.png",
        blue: "images/TCG-ColorArtIcon-Blue.png",
        yellow: "images/TCG-ColorArtIcon-Yellow.png",
        green: "images/TCG-ColorArtIcon-Green.png",
        purple: "images/TCG-ColorArtIcon-Purple.png",
        white: "images/TCG-ColorArtIcon-White.png",
        any: "images/TCG-ColorArtIcon-Colorless.png"
      };

      const tokkouImageMap = {
        '赤+50': "images/tokkou_50_red.png",
        '青+50': "images/tokkou_50_blue.png",
        '黄+50': "images/tokkou_50_yellow.png",
        '緑+50': "images/tokkou_50_green.png",
        '紫+50': "images/tokkou_50_purple.png",
        '白+50': "images/tokkou_50_white.png"
      };

      // スキル情報をレンダリングする関数
      function renderSkills(skills) {
        if (!skills || skills.length === 0) return "スキルなし";

        return skills.map(skill => {
          // メインアイコン
          const iconHTML = (skill.icons?.main ?? [])
            .map(icon => {
              const src = iconImageMap[icon.toLowerCase()];
              return src
                ? `<img src="${src}" alt="${icon}" class="skill-icon" style="height:16px; max-width:20px; object-fit:contain; background:transparent; vertical-align:middle;" />`
                : icon;
            })
            .join(" ");

          // 特攻アイコン（any は除外）
          const tokkouHTML = (skill.icons?.tokkou ?? [])
            .filter(t => tokkouImageMap[t.toLowerCase()])
            .map(tokkou => {
              const src = tokkouImageMap[tokkou.toLowerCase()];
              return `<img src="${src}" alt="特攻:${tokkou}" class="skill-icon" style="height:40px; max-width:44px; object-fit:contain; background:transparent; vertical-align:middle;" />`;
            })
            .join(" ");

          const iconsBlock = (iconHTML || tokkouHTML)
            ? `<br><div style="margin:5px 0;">${iconHTML}${tokkouHTML ? " ｜ " + tokkouHTML : ""}</div>`
            : "";

          // 表示タイプ別に処理
          if (skill.text) {
            return `<div style="margin-bottom:12px;"><strong>【${skill.type}】</strong>${iconsBlock}<br><span style="font-size:13px;">${skill.text}</span></div>`;
          } else if (skill.type === "キーワード") {
            const subtype = skill.subtype ? `<strong>【${skill.subtype}】</strong>` : "";
            const name = skill.name ?? "";
            const desc = skill.description ?? "";
            return `<div style="margin-bottom:12px;">${subtype}${iconsBlock}<br><strong style="font-size:14px;">${name}</strong><br><span style="font-size:13px;">${desc}</span></div>`;
          } else {
            const typePart = `<strong>【${skill.type}】</strong>`;
            const namePart = skill.name ? `[${skill.name}]` : "";
            const dmg = skill.dmg ? `（${skill.dmg}）` : "";
            const subtype = skill.subtype ? `<br><em>${skill.subtype}</em>` : "";
            const desc = skill.description ?? "";
            return `<div style="margin-bottom:12px;">${typePart}<strong>${namePart}${dmg}</strong>${subtype}${iconsBlock}<br><span style="font-size:13px;">${desc}</span></div>`;
          }
        }).join("");
      }

      function populateChipGroup(id, items, withAllButton = false, selectAllByDefault = true) {
        const container = document.getElementById(id);
        container.innerHTML = "";
        container.classList.add("chip-group");

        if (withAllButton) {
          const allBtn = document.createElement("button");
          allBtn.textContent = "すべて";
          allBtn.className = "chip all-chip" + (selectAllByDefault ? " selected" : "");
          allBtn.dataset.value = "ALL";
          allBtn.onclick = () => selectAllChip(allBtn);
          container.appendChild(allBtn);
        }

        items.forEach(val => {
          const btn = document.createElement("button");
          // ✅ 所持状態だけ日本語ラベルに変換
          const label = id === "ownedStateChipGroup" ? ownedLabelMap[val] ?? val : val;
          btn.textContent = label;
          btn.className = "chip";
          btn.dataset.value = val;
          btn.onclick = () => toggleChip(btn);
          btn.setAttribute('tabindex', '0'); // キーボードナビゲーション対応
          btn.setAttribute('role', 'button'); // スクリーンリーダー対応
          btn.setAttribute('aria-label', `フィルター: ${label}`);

          // キーボードイベント追加
          btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleChip(btn);
            }
          });

          container.appendChild(btn);
        });
      }

      function toggleChip(btn) {
        const group = btn.parentElement;
        const allBtn = group.querySelector(".all-chip");
        if (allBtn) allBtn.classList.remove("selected");

        btn.classList.toggle("selected");
        saveFilterState(); // フィルター状態を保存
        renderTable();
      }

      function selectAllChip(allBtn) {
        const group = allBtn.parentElement;
        group.querySelectorAll(".chip").forEach(btn => btn.classList.remove("selected"));
        allBtn.classList.add("selected");
        saveFilterState(); // フィルター状態を保存
        renderTable();
      }

      function getCheckedFromChips(id) {
        const group = document.getElementById(id);
        if (!group) return [];

        const allSelected = group.querySelector(".chip.all-chip.selected");
        if (allSelected) return []; // 「すべて」が選択されている場合は空配列を返す

        const selected = [...group.querySelectorAll(".chip.selected:not(.all-chip)")].map(btn => btn.dataset.value);
        return selected;
      }

function setViewMode(mode) {
  console.log('[setViewMode] called with:', mode, 'current:', viewMode);
  viewMode = mode;
  renderLimit = 100;
  localStorage.setItem("viewMode", mode); // ビューモードを保存
  renderTable();
  updateViewModeButton();
  console.log('[setViewMode] new viewMode:', viewMode);
}

      // フィルター状態を保存する関数
      function saveFilterState() {
        const filterState = {
          nameSearch: document.getElementById("nameSearch")?.value || "",
          sortMethod: document.getElementById("sortMethod")?.value || "release",
          productFilter: document.getElementById("productFilter")?.value || "",
          tagsFilter: document.getElementById("tagsFilter")?.value || "",
          ownedState: getCheckedFromChips("ownedStateChipGroup"),
          rarity: getCheckedFromChips("rarityFilter"),
          color: getCheckedFromChips("colorFilter"),
          bloom: getCheckedFromChips("bloomFilter"),
          cardType: getCheckedFromChips("cardTypeFilter")
        };
        localStorage.setItem("filterState", JSON.stringify(filterState));
      }

      // フィルター状態を復元する関数
      function restoreFilterState() {
        try {
          const savedState = localStorage.getItem("filterState");
          if (!savedState) return;

          const filterState = JSON.parse(savedState);

          // 基本フィルター復元
          if (filterState.nameSearch) {
            const nameSearch = document.getElementById("nameSearch");
            if (nameSearch) nameSearch.value = filterState.nameSearch;
          }

          if (filterState.sortMethod) {
            const sortMethod = document.getElementById("sortMethod");
            if (sortMethod) sortMethod.value = filterState.sortMethod;
          }

          if (filterState.productFilter) {
            const productFilter = document.getElementById("productFilter");
            if (productFilter) productFilter.value = filterState.productFilter;
          }

          if (filterState.tagsFilter) {
            const tagsFilter = document.getElementById("tagsFilter");
            if (tagsFilter) tagsFilter.value = filterState.tagsFilter;
          }

          // チップ状態復元（少し遅延させて確実に復元）
          setTimeout(() => {
            restoreChipState("ownedStateChipGroup", filterState.ownedState);
            restoreChipState("rarityFilter", filterState.rarity);
            restoreChipState("colorFilter", filterState.color);
            restoreChipState("bloomFilter", filterState.bloom);
            restoreChipState("cardTypeFilter", filterState.cardType);
          }, 100);

        } catch (error) {
          console.warn("Failed to restore filter state:", error);
        }
      }

      // チップ状態を復元するヘルパー関数
      function restoreChipState(groupId, selectedValues) {
        if (!selectedValues || !Array.isArray(selectedValues)) {
          // 保存された状態がない場合は「すべて」を選択
          const group = document.getElementById(groupId);
          if (group) {
            const allBtn = group.querySelector('.chip.all-chip');
            if (allBtn) {
              group.querySelectorAll(".chip").forEach(chip => chip.classList.remove("selected"));
              allBtn.classList.add("selected");
            }
          }
          return;
        }

        const group = document.getElementById(groupId);
        if (!group) return;

        // すべてのチップを初期化
        group.querySelectorAll(".chip").forEach(chip => chip.classList.remove("selected"));

        // 選択値が空の場合は「すべて」を選択
        if (selectedValues.length === 0) {
          const allBtn = group.querySelector('.chip.all-chip');
          if (allBtn) {
            allBtn.classList.add("selected");
          }
          return;
        }

        // 保存された選択状態を復元
        selectedValues.forEach(value => {
          const chip = group.querySelector(`[data-value="${value}"]`);
          if (chip) chip.classList.add("selected");
        });
      }

      function toggleFilters() {
        const el = document.getElementById("filtersWrapper");
        const toggleBtn = document.getElementById("filterToggleBtn");
        const isHidden = window.getComputedStyle(el).display === "none";

        if (isHidden) {
          el.style.display = "block";
          toggleBtn.textContent = "🔼 フィルター非表示";
        } else {
          el.style.display = "none";
          toggleBtn.textContent = "🔽 フィルター表示";
        }
      }

      function toggleCSVPanel() {
        const el = document.getElementById("csvPanel");
        const isHidden = window.getComputedStyle(el).display === "none";

        if (isHidden) {
          el.style.display = "block";
        } else {
          el.style.display = "none";
        }
      }

      function clearCSVInput() {
        document.getElementById("csvInput").value = "";
      }

      function toggleDarkMode() {
        document.body.classList.toggle("dark");
        localStorage.setItem("darkMode", document.body.classList.contains("dark"));
      }

      function selectAll(id) {
        document.querySelectorAll(`#${id} input[type="checkbox"]`).forEach(cb => cb.checked = true);
        renderTable();
      }

      function clearAll(id) {
        document.querySelectorAll(`#${id} input[type="checkbox"]`).forEach(cb => cb.checked = false);
        renderTable();
      }

      function showImageModal(src, cardData = null) {
        const modal = document.getElementById("imageModal");
        const isMobile = window.innerWidth <= 768;

        // レイアウトの切り替え
        const desktopLayout = modal.querySelector(".modal-desktop");
        const mobileLayout = modal.querySelector(".modal-mobile");

        if (isMobile) {
          desktopLayout.style.display = "none";
          mobileLayout.style.display = "flex";
          document.getElementById("modalImageMobile").src = src;
        } else {
          desktopLayout.style.display = "flex";
          mobileLayout.style.display = "none";
          document.getElementById("modalImage").src = src;
        }

        // カード情報を表示
        if (cardData) {
          const infoContent = isMobile ?
            document.getElementById("cardInfoContentMobile") :
            document.getElementById("cardInfoContent");

          const bloomText = cardData.card_type === "Buzzホロメン" ? "1stBuzz" : cardData.bloom;
          const productText = cardData.product.includes(",") ?
            cardData.product.replace(/,\s*/g, " / ") : cardData.product;

          // スキル情報を取得
          const skillsHtml = cardData.skills && cardData.skills.length > 0 ?
            renderSkills(cardData.skills) : "<div style='font-size:13px; color:#aaa;'>スキルなし</div>";

          infoContent.innerHTML = `
            <h3 style="margin-top:0; color:#4db6e6; font-size:18px;">${cardData.name}</h3>

            <div style="margin-bottom:18px; font-size:14px;">
              <div style="margin:6px 0;"><strong>🆔 カード番号:</strong> ${cardData.id}</div>
              <div style="margin:6px 0;"><strong>🃏 カードタイプ:</strong> ${cardData.card_type}</div>
              <div style="margin:6px 0;"><strong>✨ レアリティ:</strong> ${cardData.rarity}</div>
              <div style="margin:6px 0;"><strong>🎨 色:</strong> ${cardData.color}</div>
              <div style="margin:6px 0;"><strong>🌸 Bloom:</strong> ${bloomText}</div>
              ${cardData.hp ? `<div style="margin:6px 0;"><strong>❤️ HP:</strong> ${cardData.hp}</div>` : ''}
              <div style="margin:6px 0;"><strong>📦 収録商品:</strong> ${productText}</div>
              <div style="margin:6px 0;"><strong>🃏 所持枚数:</strong> ${cardData.owned || 0}枚</div>
            </div>

            ${cardData.tags && cardData.tags.length > 0 ?
              `<div style="margin:15px 0;">
                <strong style="font-size:15px;">🏷️ タグ:</strong><br>
                <div style="margin-top:8px;">
                  ${cardData.tags.map(tag =>
                    `<span style="background:#007acc; color:white; padding:3px 8px; border-radius:12px; margin:3px 4px 3px 0; display:inline-block; font-size:12px;">${tag}</span>`
                  ).join('')}
                </div>
              </div>` : ''
            }

            <div style="margin:15px 0; border-top:1px solid #555; padding-top:15px;">
              <strong style="font-size:15px; color:#4db6e6;">⚡ スキル:</strong><br>
              <div style="margin-top:10px;">
                ${skillsHtml}
              </div>
            </div>

            <div style="margin:20px 0; text-align:center;">
              <a href="https://hololive-official-cardgame.com/cardlist/?id=${cardData.id}" target="_blank"
                 style="color:#4db6e6; text-decoration:none; font-size:14px; padding:8px 16px; border:1px solid #4db6e6; border-radius:20px; display:inline-block;">
                🔗 公式サイトで詳細を見る ↗
              </a>
            </div>
          `;

          // 情報パネルを表示
          const infoPanel = isMobile ?
            document.getElementById("cardInfoPanelMobile") :
            document.getElementById("cardInfoPanel");
          if (infoPanel) infoPanel.style.display = "block";
        } else {
          // 情報がない場合は情報パネルを非表示
          const infoPanel = isMobile ?
            document.getElementById("cardInfoPanelMobile") :
            document.getElementById("cardInfoPanel");
          if (infoPanel) infoPanel.style.display = "none";
        }

        modal.style.display = "block";
        modal.focus(); // フォーカスをモーダルに移動
        document.body.style.overflow = "hidden"; // スクロールを無効化
      }

      function hideImageModal() {
        const modal = document.getElementById("imageModal");
        modal.style.display = "none";
        document.body.style.overflow = ""; // スクロールを復元

        // 情報パネルを再表示（次回のために）
        const infoPanels = [
          document.getElementById("cardInfoPanel"),
          document.getElementById("cardInfoPanelMobile")
        ];
        infoPanels.forEach(panel => {
          if (panel) panel.style.display = "";
        });
      }

      function setupFilters() {
        const raritySet = new Set(), colorSet = new Set(), bloomSet = new Set(), productSet = new Set(), tagSet = new Set(), cardTypeSet = new Set();
        cards.forEach(c => {
          raritySet.add(c.rarity);
          colorSet.add(c.color);
          bloomSet.add(c.bloom);
          if (!c.product.includes(",")) {
            productSet.add(c.product);
          }
          // タグの処理（存在する場合）
          if (c.tags && Array.isArray(c.tags)) {
            c.tags.forEach(tag => tagSet.add(tag));
          }
          // カードタイプを「・」で分割
          const typeParts = c.card_type?.split("・") ?? [];
          typeParts.forEach(part => cardTypeSet.add(part.trim()));
        });

        populateChipGroup("rarityFilter", [...raritySet].sort(), true, true);
        populateChipGroup("colorFilter", [...colorSet].sort(), true, true);
        populateChipGroup("bloomFilter", [...bloomSet].sort(), true, true);
        populateChipGroup("cardTypeFilter", [...cardTypeSet].sort(), true, true);
        populateChipGroup("ownedStateChipGroup", ["owned", "unowned"], true, true); // すべてボタンを追加

        // 「すべて」ボタンがある場合は確実に選択状態にする
        setTimeout(() => {
          document.querySelectorAll('.chip.all-chip').forEach(btn => {
            btn.classList.add('selected');
          });
        }, 50);

        const select = document.getElementById("productFilter");
        select.innerHTML = `<option value="">すべての商品</option>`;
        [...productSet].sort().forEach(val => {
          const opt = document.createElement("option");
          opt.value = val;
          opt.textContent = val;
          select.appendChild(opt);
        });

        // タグフィルター設定
        const tagsSelect = document.getElementById("tagsFilter");
        if (tagsSelect) {
          tagsSelect.innerHTML = `<option value="">タグ（選択）</option>`;
          [...tagSet].sort().forEach(val => {
            const opt = document.createElement("option");
            opt.value = val;
            opt.textContent = val;
            tagsSelect.appendChild(opt);
          });
        }
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

      function sortCards(cards) {
        const method = document.getElementById("sortMethod")?.value ?? "release";
        const productFilter = document.getElementById("productFilter")?.value.toLowerCase() || "";

        let sorted = [...cards];
        if (method === "release") {
          sorted.sort((a, b) => {
            // フィルター商品が設定されている場合は、その商品の発売日を優先
            const ra = getFilteredReleaseDate(a.product, productFilter);
            const rb = getFilteredReleaseDate(b.product, productFilter);

            // 1. 発売日順
            if (ra !== rb) return ra.localeCompare(rb);

            // 2. 同じ発売日の場合、エールかどうかをチェック
            const aIsYell = a.card_type && a.card_type.includes("エール");
            const bIsYell = b.card_type && b.card_type.includes("エール");

            if (aIsYell !== bIsYell) {
              return aIsYell ? 1 : -1; // エールを後ろに
            }

            // 3. 同じ商品内ではカード番号順（フィルター適用時は特に重要）
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
  function renderTable() {
    // レンダリング中の場合は処理をスキップ
    if (isRendering) return;
    isRendering = true;

    // デバウンス処理のため、前回のタイマーをクリア
    if (window.renderTimer) {
      clearTimeout(window.renderTimer);
    }

    window.renderTimer = setTimeout(() => {
      performRender();
      isRendering = false;
    }, 100); // 100ms のデバウンス
  }

  // テキスト正規化関数（ひらがな/カタカナ、大文字/小文字統一）
  function normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[ぁ-ゖ]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60))  // ひらがな→カタカナ変換
      .replace(/[\u3041-\u3096]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60)); // 残りのひらがな→カタカナ
  }

  function performRender() {
    const keyword = normalizeText(document.getElementById("nameSearch").value);
    const getChecked = id => [...document.querySelectorAll(`#${id} input:checked`)].map(el => el.value);
    const ownedStates = getCheckedFromChips("ownedStateChipGroup");
    const rarity = getCheckedFromChips("rarityFilter");
    const color = getCheckedFromChips("colorFilter");
    const bloom = getCheckedFromChips("bloomFilter");
    const cardType = getCheckedFromChips("cardTypeFilter");
    const product = normalizeText(document.getElementById("productFilter").value);
    const tagFilter = normalizeText(document.getElementById("tagsFilter")?.value || "");

    const tableArea = document.getElementById("cardTable");
    const previewArea = document.getElementById("cardPreviewArea");

    const filtered = cards.filter(card => {
      const count = card.owned;
      const matchOwned =
        ownedStates.length === 0 ||
        (ownedStates.includes("owned") && count > 0) ||
        (ownedStates.includes("unowned") && (!count || count == 0));
      if (!matchOwned) return false;

      const match = {
        name: !keyword || normalizeText(card.name).includes(keyword),
        rarity: rarity.length === 0 || rarity.includes(card.rarity),
        color: color.length === 0 || color.includes(card.color),
        bloom: bloom.length === 0 || bloom.includes(card.bloom),
        cardType: cardType.length === 0 || cardType.some(type => card.card_type?.includes(type)),
        product: !product || normalizeText(card.product).includes(product),
        tags: !tagFilter || (card.tags && Array.isArray(card.tags) && card.tags.map(t => normalizeText(t)).includes(tagFilter))
      };
      return !Object.values(match).includes(false);
    });

    const sortedCards = sortCards(filtered);
    const displayCards = sortedCards.slice(0, renderLimit); // ← 表示分だけ

    const tbody = tableArea.querySelector("tbody");
    tbody.innerHTML = "";

    // ✅ 統計は filtered ベースで全件集計
    const shown = filtered.length;
    const ownedTypes = filtered.filter(c => c.owned > 0).length;
    const ownedCount = filtered.reduce((sum, c) => sum + (c.owned ?? 0), 0);
    const ratio = shown > 0 ? Math.round((ownedTypes / shown) * 100) : 0;

    if (viewMode === "table") {
      previewArea.style.display = "none";
      tableArea.style.display = "";

        displayCards.forEach(card => {
          const bloomText = card.card_type === "Buzzホロメン" ? "1stBuzz" : card.bloom;
          const productText = card.product.includes(",") ? card.product.replace(/,\s*/g, "<br>") : card.product;

          const row = document.createElement("tr");
          row.innerHTML = `
            <td><img src="${card.image}" loading="lazy" alt="${card.name}のカード画像" onclick="showImageModal('${card.image}', ${JSON.stringify(card).replace(/"/g, '&quot;')})" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showImageModal('${card.image}', ${JSON.stringify(card).replace(/"/g, '&quot;')});}"></td>
            <td>
              <div style="font-weight: bold;">${card.name}</div>
              <div style="font-size:13px;">📄 ${card.id}<br>🃏 ${card.card_type}</div>
            </td>
            <td>${card.rarity}</td>
            <td>${card.color}</td>
            <td>${bloomText}</td>
            <td>${card.hp ?? "-"}</td>
            <td>${productText}</td>
            <td><input type="number" min="0" value="${card.owned}" onchange="updateOwned('${card.id}', this.value)" aria-label="${card.name}の所持枚数"></td>
          `;
          tbody.appendChild(row);
        });      // ✅ フィルター後全件の統計を表示
      document.getElementById("countDisplay").textContent =
        `所持枚数：${ownedCount} / 表示：${shown}種類 / 所持種類数：${ownedTypes}(${ratio}%)`;
      document.getElementById("typeDisplay").textContent = ``;
      return;
    }

    // ✅ 簡易モードはそのまま
    tableArea.style.display = "none";
    previewArea.innerHTML = "";
    previewArea.style.display = "block";

    const container = document.createElement("div");
    const isMobile = document.body.classList.contains("mobile-layout");
    const columns = isMobile ? 4 : Math.floor(window.innerWidth / 160);
    const cardWidth = isMobile ? Math.floor((window.innerWidth - 32) / columns) : 160;

    displayCards.forEach(card => {
      const box = document.createElement("div");
      box.style.width = `${cardWidth}px`;

      const img = document.createElement("img");
      img.src = card.image;
      img.alt = `${card.name}のカード画像`;
      img.loading = "lazy";
      img.style.width = "100%";
      img.style.cursor = "zoom-in";
      img.setAttribute('tabindex', '0');
      img.onclick = () => showImageModal(card.image, card);
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showImageModal(card.image, card);
        }
      });

      const info = document.createElement("div");
      info.innerHTML = `
        <div style="font-weight:bold;">${card.name}</div>
        <div style="font-size:11px;">📄${card.id}</div>
        <div style="font-size:11px;">✨${card.rarity}🃏${card.owned ?? 0}枚</div>
      `;
      box.appendChild(img);
      box.appendChild(info);
      container.appendChild(box);
    });

    previewArea.appendChild(container);

    // ✅ 統計表示（簡易モードも全件ベース）
    document.getElementById("countDisplay").textContent =
      `所持枚数：${ownedCount} / 表示：${shown}種類 / 所持種類数：${ownedTypes}(${ratio}%)`;
    document.getElementById("typeDisplay").textContent = "";
  }

  function updateOwned(id, value) {
    const num = Math.max(0, parseInt(value) || 0);
    localStorage.setItem("count_" + id, num);
    const card = cards.find(c => c.id === id);
    if (card) card.owned = num;
    renderTable();
  }

  function showImportOptions() {
    const choice = confirm("CSVインポート方法を選択してください:\n\nOK: ファイルから読み込み\nキャンセル: テキストエリアから読み込み");
    if (choice) {
      // ファイル選択を開く
      document.getElementById("csvFileInput").click();
    } else {
      // テキストエリアから読み込み
      importCSVFromTextarea();
    }
  }

  function showExportOptions() {
    const choice = confirm("CSV出力方法を選択してください:\n\nOK: ファイルとして保存\nキャンセル: クリップボードにコピー");
    if (choice) {
      // ファイルとして保存
      exportCSVToFile();
    } else {
      // クリップボードにコピー
      exportCSVToClipboard();
    }
  }

  function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      const csvData = e.target.result;
      importCSVData(csvData);
    };
    reader.readAsText(file);
  }

  function importCSVFromTextarea() {
    const csvData = document.getElementById("csvInput").value.trim();
    if (!csvData) {
      alert("CSVデータを入力してください");
      return;
    }
    importCSVData(csvData);
  }

  function importCSVData(csvData) {
    const lines = csvData.trim().split("\n");
    let importedCount = 0;

    lines.forEach(line => {
      const [id, count] = line.split(",");
      if (id && count !== undefined) {
        const num = Math.max(0, parseInt(count) || 0);
        localStorage.setItem("count_" + id, num);
        const card = cards.find(c => c.id === id);
        if (card) {
          card.owned = num;
          importedCount++;
        }
      }
    });

    renderTable();
    alert(`CSVを反映しました！（${importedCount}件のカードを更新）`);
  }

  function exportCSVToClipboard() {
    // 全カードを含む（所持枚数0のカードも含める）
    const lines = cards.map(c => `${c.id},${c.owned}`);
    navigator.clipboard.writeText(lines.join("\n"))
      .then(() => alert("全カードの所持CSVをクリップボードにコピーしました（所持枚数0のカードも含む）"))
      .catch(() => alert("コピーに失敗しました"));
  }

  function exportCSVToFile() {
    // 全カードを含む（所持枚数0のカードも含める）
    const lines = cards.map(c => `${c.id},${c.owned}`);
    const csvContent = lines.join("\n");

    // 現在の日付でファイル名を生成
    const now = new Date();
    const dateStr = now.getFullYear() +
                   String(now.getMonth() + 1).padStart(2, '0') +
                   String(now.getDate()).padStart(2, '0');
    const filename = `hololive_cards_${dateStr}.csv`;

    // ファイルダウンロード
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`CSVファイル "${filename}" として保存しました`);
  }

  // 後方互換性のため、元の関数も残しておく
  function importCSV() {
    importCSVFromTextarea();
  }

  function exportCSV() {
    exportCSVToClipboard();
  }

  function isMobileScreen() {
    return window.innerWidth <= 540;
  }

  function updateMobileLayout() {
    const wasMobile = document.body.classList.contains("mobile-layout");
    const isMobile = isMobileScreen();

    if (isMobile) {
      document.body.classList.add("mobile-layout");

      // モバイル版でのフィルター最適化
      const filtersWrapper = document.getElementById('filtersWrapper');
      const filterToggleBtn = document.getElementById('filterToggleBtn');

      if (filtersWrapper && filterToggleBtn) {
        // モバイルでは初期状態で非表示
        if (!wasMobile) {
          filtersWrapper.style.display = 'none';
          filterToggleBtn.textContent = '🔽 フィルター表示';
        }
      }

      if (!wasMobile) console.log('Switched to mobile layout - filters optimized');
    } else {
      document.body.classList.remove("mobile-layout");

      // デスクトップ版では常に表示
      const filtersWrapper = document.getElementById('filtersWrapper');
      const filterToggleBtn = document.getElementById('filterToggleBtn');

      if (filtersWrapper && filterToggleBtn) {
        // デスクトップでもデフォルトは非表示に変更
        filtersWrapper.style.display = 'none';
        filterToggleBtn.textContent = '� フィルター表示';
      }

      if (wasMobile) console.log('Switched to desktop layout - filters always visible');
    }
  }

  window.addEventListener("resize", updateMobileLayout);

  window.addEventListener("scroll", () => {
    if (viewMode === "compact" || viewMode === "table") {
      const bottom = window.innerHeight + window.scrollY;
      const docHeight = document.body.offsetHeight;
      if (bottom >= docHeight - 200 && !isRendering) { // 200px手前で追加読み込み開始
        renderLimit += 30; // 追加読み込み数を30に削減

        // ローディング表示
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
          loadingIndicator.style.display = 'block';
        }

        renderTable();

        // ローディング表示を非表示
        setTimeout(() => {
          if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
          }
        }, 500);
      }
    }
  });

window.onload = async () => {
    if (localStorage.getItem("darkMode") === "true") {
      document.body.classList.add("dark");
    }

    // 保存されたビューモードを復元
    const savedViewMode = localStorage.getItem("viewMode");
    if (savedViewMode && (savedViewMode === "table" || savedViewMode === "compact")) {
      viewMode = savedViewMode;
    }


    updateMobileLayout();
    updateViewModeButton();

    // フィルターを確実にデフォルト非表示に設定
    const filtersWrapper = document.getElementById('filtersWrapper');
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    if (filtersWrapper && filterToggleBtn) {
      filtersWrapper.style.display = 'none';
      filterToggleBtn.textContent = '🔽 フィルター表示';
    }

    // ✅ Service Worker からバージョン情報を取得して表示
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'VERSION_INFO_RESPONSE') {
            const versionEl = document.getElementById('versionDisplay');
            if (versionEl && event.data.data) {
              versionEl.textContent = `[v${event.data.data.pageVersions['card_list.html']}-CENTRALIZED]`;
            }
          }
        };
        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_VERSION_INFO' },
          [messageChannel.port2]
        );
      }
    } catch (error) {
      console.warn('Version display error:', error);
      const versionEl = document.getElementById('versionDisplay');
      if (versionEl) {
        versionEl.textContent = '[v4.1.0-CENTRALIZED]';
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

      let cardRaw, releaseMapData;

      // Use cached data if available and not too old, or if offline
      if (cachedCardData && cachedReleaseData && (cacheAge < maxCacheAge || !navigator.onLine)) {
        console.log('Using cached data');
        cardRaw = JSON.parse(cachedCardData);
        releaseMapData = JSON.parse(cachedReleaseData);
      } else {
        // Fetch fresh data
        console.log('Fetching fresh data');
        const [cardRes, releaseRes] = await Promise.all([
          fetch("json_file/card_data.json"),
          fetch("json_file/release_dates.json")
        ]);
        cardRaw = await cardRes.json();
        releaseMapData = await releaseRes.json();

        // Cache the data
        localStorage.setItem('cardData', JSON.stringify(cardRaw));
        localStorage.setItem('releaseData', JSON.stringify(releaseMapData));
        localStorage.setItem('dataTimestamp', now.toString());
      }

      releaseMap = releaseMapData;

      // デバッグ：releaseMapの内容を確認
      console.log('Release Map loaded:', Object.keys(releaseMap).length, 'entries');
      console.log('クインテットスペクトラム date:', releaseMap["ブースターパック「クインテットスペクトラム」"]);

      cards = Object.entries(cardRaw).map(([key, card]) => ({
        id: key,
        name: card.name,
        rarity: card.rarity ?? "-",
        color: card.color ?? "-",
        bloom: card.bloom_level ?? "-",
        hp: card.card_type === "ホロメン" ? card.hp : card.life ?? "-",
        product: card.product,
        image: card.image_url,
        url: `https://hololive-official-cardgame.com/cardlist/?id=${key}`,
        owned: parseInt(localStorage.getItem("count_" + key) ?? "0"),
        card_type: card.card_type ?? "-",
        tags: card.tags ?? [],
        skills: card.skills ?? [] // スキル情報を追加
      }));

      setupFilters();

      // フィルター状態を復元（非同期で少し遅延させる）
      setTimeout(() => {
        restoreFilterState();
        renderTable();
      }, 200);
    } catch (err) {
      console.error(err);

      // Try to load from localStorage as fallback
      const cachedCardData = localStorage.getItem('cardData');
      const cachedReleaseData = localStorage.getItem('releaseData');

      if (cachedCardData && cachedReleaseData) {
        console.log('Network failed, using cached data as fallback');
        const cardRaw = JSON.parse(cachedCardData);
        releaseMap = JSON.parse(cachedReleaseData);

        cards = Object.entries(cardRaw).map(([key, card]) => ({
          id: key,
          name: card.name,
          rarity: card.rarity ?? "-",
          color: card.color ?? "-",
          bloom: card.bloom_level ?? "-",
          hp: card.card_type === "ホロメン" ? card.hp : card.life ?? "-",
          product: card.product,
          image: card.image_url,
          url: `https://hololive-official-cardgame.com/cardlist/?id=${key}`,
          owned: parseInt(localStorage.getItem("count_" + key) ?? "0"),
          card_type: card.card_type ?? "-",
          tags: card.tags ?? [],
          skills: card.skills ?? [] // スキル情報を追加
        }));

        setupFilters();
        renderTable();

        // Show offline message
        document.getElementById("offline-status").textContent = "⚠️ オフライン - 保存されたデータを使用中";
        document.getElementById("offline-status").style.color = "#FF9800";
      } else {
        alert("データの読み込みに失敗しました！インターネット接続を確認してください。");
      }
    }
  };

  // Service Worker registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);

          // Listen for messages from Service Worker
          navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'CACHE_UPDATED') {
              console.log('Cache updated, forcing reload');
              window.location.reload(true);
            }
          });

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Get update message from centralized system
                const messageChannel = new MessageChannel();
                messageChannel.port1.onmessage = (event) => {
                  if (event.data.type === 'UPDATE_MESSAGE_RESPONSE') {
                    console.log('🚀 強制更新:', event.data.data.details.description);
                  } else {
                    console.log('🚀 強制更新: エールフィルター機能が修正されました');
                  }
                };

                try {
                  navigator.serviceWorker.controller.postMessage(
                    { type: 'GET_UPDATE_MESSAGE' },
                    [messageChannel.port2]
                  );
                } catch (msgError) {
                  console.log('🚀 強制更新: エールフィルター機能が修正されました');
                }

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
          console.log('SW registration failed: ', registrationError);
        });
    });
  }

  // Online/Offline status
  function updateOnlineStatus() {
    const statusElement = document.getElementById('offline-status');
    if (navigator.onLine) {
      statusElement.textContent = '🟢 オンライン - 最新データを取得中';
      statusElement.style.color = '#4CAF50';
    } else {
      statusElement.textContent = '🔴 オフライン - キャッシュデータを使用中';
      statusElement.style.color = '#F44336';
    }
  }

  // Update status on page load and network changes
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // ✅ 更新確認機能 - 現在のページのみをチェック
  async function checkForUpdates() {
    const statusEl = document.getElementById('versionDisplay');
    if (!statusEl) return;

    try {
      statusEl.textContent = '[確認中...]';
      statusEl.style.color = '#007acc';

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();

        // タイムアウト設定（10秒）
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Service Worker timeout')), 10000)
        );

        // Service Workerからのレスポンスを待機
        const checkPromise = new Promise((resolve, reject) => {
          messageChannel.port1.onmessage = (event) => {
            if (event.data.type === 'SINGLE_PAGE_VERSION_RESPONSE') {
              resolve(event.data.data);
            } else if (event.data.type === 'SINGLE_PAGE_VERSION_ERROR') {
              reject(new Error(event.data.error));
            }
          };
        });

        // 現在のページの単一バージョンチェック要求を送信
        navigator.serviceWorker.controller.postMessage(
          { type: 'CHECK_SINGLE_PAGE_VERSION', data: { page: 'card_list.html' } },
          [messageChannel.port2]
        );

        // レスポンス待機（タイムアウト付き）
        const versionCheckResult = await Promise.race([checkPromise, timeout]);

        if (versionCheckResult.hasUpdates && versionCheckResult.pageInfo) {
          const pageInfo = versionCheckResult.pageInfo;

          statusEl.innerHTML = `🚀 更新利用可能`;
          statusEl.style.color = '#ff6b35';

          // 現在のページのみの詳細情報を生成
          let detailMessage = `� ${pageInfo.page} のバージョン不一致が検出されました:\n\n`;
          detailMessage += `📊 期待バージョン: v${pageInfo.expectedVersion}\n`;
          detailMessage += `📊 現在のバージョン: v${pageInfo.actualVersion || '不明'}\n`;
          detailMessage += `📊 キャッシュバージョン: v${pageInfo.cachedVersion || 'なし'}\n\n`;

          // ミスマッチの理由を日本語で説明
          let reasonText = '';
          switch(pageInfo.reason) {
            case 'expected_vs_actual_mismatch':
              reasonText = '期待バージョンと実際バージョンが不一致';
              break;
            case 'actual_vs_cached_mismatch':
              reasonText = '実際バージョンとキャッシュバージョンが不一致';
              break;
            case 'actual_version_not_found':
              reasonText = '実際のバージョン情報が見つかりません';
              break;
            case 'no_cached_version':
              reasonText = 'キャッシュにバージョン情報がありません';
              break;
            default:
              reasonText = pageInfo.reason;
          }
          detailMessage += `理由: ${reasonText}\n\n`;

          setTimeout(() => {
            if (confirm(detailMessage + 'このページを更新してアプリケーションを再読み込みしますか？')) {
              // ページ単体キャッシュ削除＆リロード
              if (navigator.serviceWorker.controller) {
                const messageChannel = new MessageChannel();
                messageChannel.port1.onmessage = (event) => {
                  if (event.data.type === 'DELETE_PAGE_CACHE_DONE') {
                    window.location.reload(true);
                  } else if (event.data.type === 'DELETE_PAGE_CACHE_ERROR') {
                    alert('キャッシュ削除に失敗しました: ' + event.data.error);
                    window.location.reload(true);
                  }
                };
                navigator.serviceWorker.controller.postMessage(
                  { type: 'DELETE_PAGE_CACHE', data: { page: 'card_list.html' } },
                  [messageChannel.port2]
                );
              } else {
                // Service Worker未利用時は従来通り
                window.location.reload(true);
              }
            } else {
              // バージョン情報を再表示
              displayVersionInfo();
            }
          }, 2000);
        } else {
          statusEl.innerHTML = `✅ 最新 v${versionCheckResult.expectedVersion}`;
          statusEl.style.color = '#4caf50';
          setTimeout(() => {
            displayVersionInfo();
          }, 3000);
        }

      } else {
        statusEl.textContent = '[v4.1.0-SW-UNAVAILABLE]';
        statusEl.style.color = '#f44336';
      }

    } catch (error) {
      console.error('Update check failed:', error);
      statusEl.textContent = '[v4.1.0-ERROR: ' + error.message + ']';
      statusEl.style.color = '#f44336';
      setTimeout(() => {
        displayVersionInfo();
      }, 5000);
    }
  }

  // ✅ バージョン情報を表示する関数
  async function displayVersionInfo() {
    const statusEl = document.getElementById('versionDisplay');
    if (!statusEl) return;

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'VERSION_INFO_RESPONSE') {
            if (event.data.data && event.data.data.pageVersions) {
              statusEl.textContent = `[v${event.data.data.pageVersions['card_list.html']}-CENTRALIZED]`;
            }
          }
        };
        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_VERSION_INFO' },
          [messageChannel.port2]
        );
      } else {
        statusEl.textContent = '[4.10.0-VERSION-SYNC-UPDATE]';
      }
    } catch (error) {
      console.warn('Version display error:', error);
      statusEl.textContent = '[4.10.0-VERSION-SYNC-UPDATE]';
    }
  }

// --- グローバル公開は必ず一番最後で ---
window.toggleViewMode = toggleViewMode;
window.updateViewModeButton = updateViewModeButton;

// 戻る・進む時もlocalStorageのviewModeを再反映
window.addEventListener("pageshow", () => {
  const savedViewMode = localStorage.getItem("viewMode");
  if (
    savedViewMode &&
    (savedViewMode === "table" || savedViewMode === "compact") &&
    savedViewMode !== viewMode
  ) {
    setViewMode(savedViewMode);
  } else {
    updateViewModeButton();
  }
});

// ===== 画像一括ダウンロード機能 =====

let imageDownloadInProgress = false;

// 画像ダウンロード確認ダイアログを表示
function showImageDownloadDialog() {
  // モバイル版のみ表示（より厳密な判定）
  const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (!isMobile) {
    console.log('Image bulk download is available only on mobile devices');
    return;
  }
  
  if (imageDownloadInProgress) {
    alert('画像ダウンロードが実行中です。しばらくお待ちください。');
    return;
  }

  const modal = document.getElementById('imageDownloadModal');
  const totalImageCountEl = document.getElementById('totalImageCount');
  const estimatedSizeEl = document.getElementById('estimatedSize');
  const currentCacheInfoEl = document.getElementById('currentCacheInfo');
  const startBtn = document.getElementById('startDownloadBtn');
  
  // 画像数を計算
  const imageUrls = extractImageUrls();
  const totalCount = imageUrls.length;
  
  console.log(`Found ${totalCount} images to download`);
  
  // 推定サイズを計算（1枚あたり150-200KBで計算）
  const avgSizeKB = 175; // 平均サイズ
  const estimatedSizeMB = Math.round((totalCount * avgSizeKB) / 1024 * 10) / 10;
  
  totalImageCountEl.textContent = totalCount.toLocaleString();
  estimatedSizeEl.textContent = `約 ${estimatedSizeMB.toLocaleString()} MB`;
  
  // 詳細なキャッシュ状況を非同期で取得
  currentCacheInfoEl.textContent = '確認中...';
  startBtn.disabled = true;
  startBtn.textContent = '確認中...';
  
  checkCacheStatus().then(cacheStatus => {
    if (cacheStatus.cached === cacheStatus.total && cacheStatus.total > 0) {
      // 全てキャッシュ済み
      currentCacheInfoEl.innerHTML = `✅ <strong>全画像キャッシュ済み</strong> (${cacheStatus.cached}/${cacheStatus.total}枚)`;
      startBtn.disabled = true;
      startBtn.textContent = '📥 ダウンロード済み';
      startBtn.style.background = '#28a745';
    } else if (cacheStatus.cached > 0) {
      // 一部キャッシュ済み
      currentCacheInfoEl.innerHTML = `⚠️ <strong>一部キャッシュ済み</strong> (${cacheStatus.cached}/${cacheStatus.total}枚)<br>未キャッシュ: ${cacheStatus.uncached}枚`;
      startBtn.disabled = false;
      startBtn.textContent = `📥 残り${cacheStatus.uncached}枚をダウンロード`;
      startBtn.style.background = '#ffc107';
      startBtn.style.color = '#212529';
    } else {
      // キャッシュなし
      currentCacheInfoEl.innerHTML = `❌ <strong>キャッシュなし</strong> (0/${cacheStatus.total}枚)`;
      startBtn.disabled = false;
      startBtn.textContent = '📥 ダウンロード開始';
      startBtn.style.background = '#007bff';
      startBtn.style.color = 'white';
    }
    
    // 推定ダウンロードサイズを未キャッシュ分のみで再計算
    if (cacheStatus.uncached > 0) {
      const uncachedSizeMB = Math.round((cacheStatus.uncached * avgSizeKB) / 1024 * 10) / 10;
      estimatedSizeEl.textContent = `約 ${uncachedSizeMB.toLocaleString()} MB (未キャッシュ分)`;
    } else if (cacheStatus.cached > 0) {
      estimatedSizeEl.textContent = `ダウンロード不要`;
    }
    
  }).catch(error => {
    console.error('Cache status error:', error);
    currentCacheInfoEl.textContent = '❌ 情報取得失敗';
    startBtn.disabled = false;
    startBtn.textContent = '📥 ダウンロード開始';
  });
  
  modal.style.display = 'block';
}

// 画像ダウンロード確認ダイアログを非表示
function hideImageDownloadDialog() {
  const modal = document.getElementById('imageDownloadModal');
  
  if (imageDownloadInProgress) {
    const confirmClose = confirm('ダウンロードが実行中です。中断しますか？');
    if (!confirmClose) return;
    
    // 中断フラグを設定
    imageDownloadInProgress = false;
    console.log('Image download was cancelled by user');
  }
  
  modal.style.display = 'none';
  
  // プログレスをリセット
  resetDownloadProgress();
}

// カードデータから画像URLを抽出
function extractImageUrls() {
  const imageUrls = [];
  const seenUrls = new Set();
  
  console.log('Cards array length:', cards.length);
  console.log('Sample card:', cards[0]);
  
  for (const card of cards) {
    // image プロパティから画像URLを取得
    if (card.image && !seenUrls.has(card.image)) {
      imageUrls.push(card.image);
      seenUrls.add(card.image);
    }
  }
  
  console.log(`Extracted ${imageUrls.length} unique image URLs`);
  console.log('Sample image URL:', imageUrls[0]);
  return imageUrls;
}

// ダウンロード進捗をリセット
function resetDownloadProgress() {
  const progressDiv = document.getElementById('downloadProgress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const startBtn = document.getElementById('startDownloadBtn');
  const cancelBtn = document.getElementById('cancelDownloadBtn');
  
  progressDiv.style.display = 'none';
  progressBar.style.width = '0%';
  progressText.textContent = '準備中...';
  startBtn.disabled = false;
  startBtn.textContent = '📥 ダウンロード開始';
  cancelBtn.textContent = 'キャンセル';
}

// 画像一括ダウンロード開始
async function startImageDownload() {
  if (imageDownloadInProgress) return;
  
  imageDownloadInProgress = true;
  
  const progressDiv = document.getElementById('downloadProgress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const startBtn = document.getElementById('startDownloadBtn');
  const cancelBtn = document.getElementById('cancelDownloadBtn');
  
  // UIを更新
  progressDiv.style.display = 'block';
  startBtn.disabled = true;
  startBtn.textContent = 'ダウンロード中...';
  cancelBtn.textContent = '中断';
  
  try {
    // キャッシュ状況をチェックして、未キャッシュの画像のみを対象にする
    progressText.textContent = 'キャッシュ状況を確認中...';
    const cacheStatus = await checkCacheStatus();
    
    if (cacheStatus.uncached === 0) {
      // 全てキャッシュ済み
      progressText.textContent = '✅ 全ての画像は既にキャッシュされています';
      startBtn.textContent = '✅ 完了';
      cancelBtn.textContent = '閉じる';
      alert('全ての画像は既にキャッシュされているため、ダウンロードの必要はありません。');
      return;
    }
    
    const imageUrls = cacheStatus.uncachedUrls; // 未キャッシュの画像のみ
    const totalCount = imageUrls.length;
    let successCount = 0;
    let failureCount = 0;
    
    console.log(`Starting download of ${totalCount} uncached images`);
    
    progressText.textContent = `未キャッシュ画像を事前読み込み中... (${totalCount}枚)`;
    
    // バッチサイズ（同時ダウンロード数）
    const batchSize = 3; // バッチサイズを小さくして安定性向上
    
    for (let i = 0; i < imageUrls.length; i += batchSize) {
      if (!imageDownloadInProgress) {
        console.log('Download was cancelled by user');
        break; // 中断された場合
      }
      
      const batch = imageUrls.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(imageUrls.length/batchSize)}`);
      
      const batchPromises = batch.map(async (url) => {
        return new Promise(async (resolve) => {
          try {
            const timeout = setTimeout(() => {
              console.warn(`Timeout for: ${url}`);
              resolve({ success: false, url, error: 'Timeout' });
            }, 15000); // 15秒タイムアウトに戻す
            
            // Service Workerがキャッシュに保存するようにfetchを実行
            const response = await fetch(url);
            
            clearTimeout(timeout);
            
            // レスポンス状態をチェック
            if (response.ok || response.type === 'opaque') {
              console.log(`Successfully fetched: ${url} (status: ${response.status || 'opaque'})`);
              resolve({ success: true, url, cached: true });
            } else {
              console.warn(`Failed to fetch: ${url} - Status: ${response.status}`);
              resolve({ success: false, url, error: `HTTP ${response.status}` });
            }
            
          } catch (error) {
            console.warn(`Fetch failed for: ${url} - ${error.message}`);
            
            // fetch失敗の場合、Imageオブジェクトでフォールバック
            try {
              const img = new Image();
              const imgTimeout = setTimeout(() => {
                resolve({ success: false, url, error: 'Image load timeout' });
              }, 10000);
              
              img.onload = () => {
                clearTimeout(imgTimeout);
                console.log(`Image fallback succeeded for: ${url}`);
                resolve({ success: true, url, cached: false });
              };
              
              img.onerror = () => {
                clearTimeout(imgTimeout);
                resolve({ success: false, url, error: 'Image load failed' });
              };
              
              img.src = url;
            } catch (imgError) {
              resolve({ success: false, url, error: `Both fetch and image failed: ${error.message}` });
            }
          }
        });
      });
      
      // バッチ実行
      const batchResults = await Promise.all(batchPromises);
      
      // 結果を集計
      batchResults.forEach(result => {
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          console.warn(`Failed: ${result.url} - ${result.error}`);
        }
      });
      
      // プログレス更新
      const progress = Math.round((successCount + failureCount) / totalCount * 100);
      progressBar.style.width = `${progress}%`;
      
      // 全体の進捗情報を表示（既キャッシュ + 新規ダウンロード）
      const totalCachedNow = cacheStatus.cached + successCount;
      const grandTotal = cacheStatus.total;
      progressText.textContent = `${successCount + failureCount} / ${totalCount} 完了 (成功: ${successCount}, 失敗: ${failureCount})\n全体: ${totalCachedNow}/${grandTotal}枚がキャッシュ済み`;
      
      // 少し待機（サーバー負荷軽減）
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    if (imageDownloadInProgress) {
      // 完了メッセージ
      const totalCachedFinal = cacheStatus.cached + successCount;
      const grandTotal = cacheStatus.total;
      
      if (failureCount === 0) {
        progressText.textContent = `✅ 新規画像のダウンロードが完了しました！ (${successCount}枚)\n全体: ${totalCachedFinal}/${grandTotal}枚がキャッシュ済み`;
        alert(`画像一括ダウンロードが完了しました！\n\n新規ダウンロード: ${successCount}枚\n既存キャッシュ: ${cacheStatus.cached}枚\n合計: ${totalCachedFinal}/${grandTotal}枚\n\nオフラインでも画像が表示されるようになりました。`);
      } else {
        progressText.textContent = `⚠️ ダウンロード完了 (成功: ${successCount}枚, 失敗: ${failureCount}枚)\n全体: ${totalCachedFinal}/${grandTotal}枚がキャッシュ済み`;
        alert(`画像一括ダウンロードが完了しました。\n\n新規成功: ${successCount}枚\n失敗: ${failureCount}枚\n既存キャッシュ: ${cacheStatus.cached}枚\n\n成功した画像はオフラインでも表示されます。`);
      }
      
      startBtn.textContent = '✅ 完了';
      cancelBtn.textContent = '閉じる';
    } else {
      // 中断された場合
      const totalCachedFinal = cacheStatus.cached + successCount;
      const grandTotal = cacheStatus.total;
      progressText.textContent = `❌ ダウンロードが中断されました (成功: ${successCount}枚, 失敗: ${failureCount}枚)\n全体: ${totalCachedFinal}/${grandTotal}枚がキャッシュ済み`;
      startBtn.textContent = '中断済み';
      cancelBtn.textContent = '閉じる';
    }
    
  } catch (error) {
    console.error('Image download error:', error);
    progressText.textContent = '❌ ダウンロードエラーが発生しました';
    alert(`画像ダウンロード中にエラーが発生しました：${error.message}`);
    
    startBtn.textContent = '❌ エラー';
    cancelBtn.textContent = '閉じる';
  } finally {
    imageDownloadInProgress = false;
    startBtn.disabled = false;
  }
}

// 現在のキャッシュ名を取得
async function getCurrentCacheName() {
  // Service Workerに依存せず、固定のキャッシュ名を使用
  return 'hololive-card-tool-images';
}

// 画像キャッシュを削除
async function clearImageCache() {
  if (!confirm('画像キャッシュを削除しますか？\n\n削除後は再度ダウンロードが必要になります。')) {
    return;
  }

  const clearBtn = document.getElementById('clearCacheBtn');
  const originalText = clearBtn.textContent;
  
  try {
    clearBtn.disabled = true;
    clearBtn.textContent = '削除中...';
    
    // すべてのキャッシュを取得
    const cacheNames = await caches.keys();
    console.log('Available caches:', cacheNames);
    
    let deletedCount = 0;
    let totalSize = 0;
    
    // 画像関連のキャッシュエントリを削除
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        // 画像URLまたはhololive-official-cardgame.comのリクエストを削除
        if (request.url.includes('hololive-official-cardgame.com') ||
            request.url.includes('.jpg') ||
            request.url.includes('.png') ||
            request.url.includes('.jpeg') ||
            request.url.includes('.webp')) {
          
          const response = await cache.match(request);
          if (response) {
            const clonedResponse = response.clone();
            try {
              // レスポンスサイズを推定（可能であれば）
              const blob = await clonedResponse.blob();
              totalSize += blob.size;
            } catch (e) {
              // サイズ取得失敗は無視
            }
          }
          
          await cache.delete(request);
          deletedCount++;
          console.log('Deleted cached image:', request.url);
        }
      }
    }
    
    // サイズを人間が読める形式に変換
    const sizeText = totalSize > 0 ? 
      `約 ${(totalSize / (1024 * 1024)).toFixed(1)} MB` : 
      '不明';
    
    clearBtn.textContent = '✅ 削除完了';
    
    alert(`画像キャッシュを削除しました！\n\n削除した画像数: ${deletedCount}枚\n削除したサイズ: ${sizeText}\n\n次回表示時にはネットワークから画像を読み込みます。`);
    
    // UIをリセット
    setTimeout(() => {
      clearBtn.textContent = originalText;
      clearBtn.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Cache clear error:', error);
    clearBtn.textContent = '❌ エラー';
    alert(`キャッシュ削除中にエラーが発生しました：${error.message}`);
    
    setTimeout(() => {
      clearBtn.textContent = originalText;
      clearBtn.disabled = false;
    }, 2000);
  }
}

// キャッシュ状況を詳細チェック
async function checkCacheStatus() {
  try {
    const imageUrls = extractImageUrls();
    const cacheNames = await caches.keys();
    
    let cachedUrls = new Set();
    let uncachedUrls = [];
    
    // すべてのキャッシュをチェック
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      
      for (const url of imageUrls) {
        const response = await cache.match(url);
        if (response) {
          cachedUrls.add(url);
        }
      }
    }
    
    // キャッシュされていないURLを特定
    for (const url of imageUrls) {
      if (!cachedUrls.has(url)) {
        uncachedUrls.push(url);
      }
    }
    
    return {
      total: imageUrls.length,
      cached: cachedUrls.size,
      uncached: uncachedUrls.length,
      cachedUrls: Array.from(cachedUrls),
      uncachedUrls: uncachedUrls
    };
    
  } catch (error) {
    console.error('Cache status check error:', error);
    return {
      total: 0,
      cached: 0,
      uncached: 0,
      cachedUrls: [],
      uncachedUrls: []
    };
  }
}

// キャッシュサイズを推定
async function estimateCacheSize() {
  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    let imageCount = 0;
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      for (const request of requests) {
        if (request.url.includes('hololive-official-cardgame.com') ||
            request.url.includes('.jpg') ||
            request.url.includes('.png') ||
            request.url.includes('.jpeg') ||
            request.url.includes('.webp')) {
          
          imageCount++;
          const response = await cache.match(request);
          if (response) {
            try {
              const clonedResponse = response.clone();
              const blob = await clonedResponse.blob();
              totalSize += blob.size;
            } catch (e) {
              // サイズ取得失敗時は平均サイズで推定
              totalSize += 175 * 1024; // 175KB
            }
          }
        }
      }
    }
    
    return { 
      count: imageCount, 
      size: totalSize,
      sizeText: totalSize > 0 ? `約 ${(totalSize / (1024 * 1024)).toFixed(1)} MB` : '不明'
    };
  } catch (error) {
    console.error('Cache size estimation error:', error);
    return { count: 0, size: 0, sizeText: '取得失敗' };
  }
}

// グローバル関数として公開
window.showImageDownloadDialog = showImageDownloadDialog;
window.hideImageDownloadDialog = hideImageDownloadDialog;
window.startImageDownload = startImageDownload;
window.clearImageCache = clearImageCache;
window.estimateCacheSize = estimateCacheSize;
window.checkCacheStatus = checkCacheStatus;
