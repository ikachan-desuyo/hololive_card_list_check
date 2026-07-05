      let cards = [];
      let releaseMap = {};
      let renderLimit = 100;

      function toggleChip(btn) {
        const group = btn.parentElement;
        const allBtn = group.querySelector(".all-chip");
        if (allBtn) allBtn.classList.remove("selected");
        btn.classList.toggle("selected");
        renderTable();
      }

      function selectAllChip(allBtn) {
        const group = allBtn.parentElement;
        group.querySelectorAll(".chip").forEach(btn => btn.classList.remove("selected"));
        allBtn.classList.add("selected");
        renderTable();
      }

      function getCheckedFromChips(id) {
        const allSelected = document.querySelector(`#${id} .chip.all-chip.selected`);
        if (allSelected) return [];
        return [...document.querySelectorAll(`#${id} .chip.selected:not(.all-chip)`)].map(btn => btn.dataset.value);
      }

      function toggleFilters() {
        const el = document.getElementById("filtersWrapper");
        const isHidden = window.getComputedStyle(el).display === "none";
        el.style.display = isHidden ? "block" : "none";
      }

      function toggleDarkMode() {
        document.body.classList.toggle("dark");
        localStorage.setItem("darkMode", document.body.classList.contains("dark"));
      }

      function isMobileScreen() {
        return window.innerWidth <= 540;
      }

      function updateMobileLayout() {
        if (isMobileScreen()) {
          document.body.classList.add("mobile-layout");
        } else {
          document.body.classList.remove("mobile-layout");
        }
      }

      window.addEventListener("resize", updateMobileLayout);

      function showImageModal(src) {
        const modal = document.getElementById("imageModal");
        modal.querySelector("img").src = src;
        modal.style.display = "block";
      }

      function hideImageModal() {
        document.getElementById("imageModal").style.display = "none";
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
        // 収録商品フィルターの値を取得（holoca_skill_pageでは複数の商品フィルターがある可能性を考慮）
        const productFilter = document.getElementById("productFilter")?.value?.toLowerCase() ||
                             document.querySelector('select[id*="product"]')?.value?.toLowerCase() || "";
        const sorted = [...cards];

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
      function setupFilters() {
        const raritySet = new Set(), colorSet = new Set(), bloomSet = new Set(), productSet = new Set(), tagSet = new Set(), cardTypeSet = new Set();
        cards.forEach(c => {
          raritySet.add(c.rarity);
          colorSet.add(c.color);
          bloomSet.add(c.bloom);
          if (!c.product.includes(",")) {
            productSet.add(c.product);
          }
          c.tags.forEach(tag => tagSet.add(tag));
          // カードタイプを「・」で分割
          const typeParts = c.card_type?.split("・") ?? [];
          typeParts.forEach(part => cardTypeSet.add(part.trim()));
        });

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

      function populateChipGroup(id, items, withAllButton = false, selectAllByDefault = true) {
        const container = document.getElementById(id);
        container.innerHTML = "";
        container.classList.add("chip-group");

        const ownedLabelMap = {
          owned: "所持あり",
          unowned: "所持なし"
        };

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
          const label = id === "ownedStateChipGroup" ? ownedLabelMap[val] ?? val : val;
          btn.textContent = label;
          btn.className = "chip";
          btn.dataset.value = val;
          btn.onclick = () => toggleChip(btn);
          container.appendChild(btn);
        });
      }

      populateChipGroup("rarityFilter", [...raritySet].sort(), true, true);
      populateChipGroup("colorFilter", [...colorSet].sort(), true, true);
      populateChipGroup("bloomFilter", [...bloomSet].sort(), true, true);
      populateChipGroup("cardTypeFilter", [...cardTypeSet].sort(), true, true);
      populateChipGroup("ownedStateChipGroup", ["owned", "unowned"], true, true);

      populateSelect("productFilter", productSet, "収録商品");
      populateSelect("tagsFilter", tagSet, "タグ（選択）");
    }

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

    function renderSkills(skills) {
      return skills.map(skill => {
        // メインアイコン
        const iconHTML = (skill.icons?.main ?? [])
          .map(icon => {
            const src = iconImageMap[icon.toLowerCase()];
            return src
              ? `<img src="${src}" alt="${icon}" class="skill-icon" style="height:20px; max-width:24px; object-fit:contain; background:transparent; vertical-align:middle;" />`
              : icon;
          })
          .join(" ");

        // 特攻アイコン（any は除外）
        const tokkouHTML = (skill.icons?.tokkou ?? [])
          .filter(t => tokkouImageMap[t.toLowerCase()])
          .map(tokkou => {
            const src = tokkouImageMap[tokkou.toLowerCase()];
            return `<img src="${src}" alt="特攻:${tokkou}" class="skill-icon" style="height:52px; max-width:56px; object-fit:contain; background:transparent; vertical-align:middle;" />`;
          })
          .join(" ");

        const iconsBlock = (iconHTML || tokkouHTML)
          ? `<br>${iconHTML}${tokkouHTML ? "｜" + tokkouHTML : ""}`
          : "";

        // 表示タイプ別に処理
        if (skill.text) {
          return `<b>【${skill.type}】</b>${iconsBlock}<br>${skill.text}`;
        } else if (skill.type === "キーワード") {
          const subtype = skill.subtype ? `<b>【${skill.subtype}】</b>` : "";
          const name = skill.name ?? "";
          const desc = skill.description ?? "";
          return `${subtype}${iconsBlock}<br>${name}<br>${desc}`;
        } else {
          const typePart = `<b>【${skill.type}】</b>`;
          const namePart = skill.name ? `[${skill.name}]` : "";
          const dmg = skill.dmg ? `（${skill.dmg}）` : "";
          const subtype = skill.subtype ? `<br>${skill.subtype}` : "";
          const desc = skill.description ?? "";
          return `${typePart}${namePart}${dmg}${subtype}${iconsBlock}<br>${desc}`;
        }
      }).join("<br><br>");
    }

    function renderTable() {
      const keyword = window.normalizeText(document.getElementById("keywordSearch").value);
      const ownedStates = getCheckedFromChips("ownedStateChipGroup");
      const rarity = getCheckedFromChips("rarityFilter");
      const color = getCheckedFromChips("colorFilter");
      const bloom = getCheckedFromChips("bloomFilter");
      const cardType = getCheckedFromChips("cardTypeFilter");
      const product = window.normalizeText(document.getElementById("productFilter").value);
      const tagFilter = window.normalizeText(document.getElementById("tagsFilter").value);

      const tbody = document.querySelector("#cardTable tbody");
      tbody.innerHTML = "";

      const filtered = cards.filter(card => {
        const count = card.owned;
        const matchOwned =
          ownedStates.length === 0 ||
          (ownedStates.includes("owned") && count > 0) ||
          (ownedStates.includes("unowned") && (!count || count == 0));
        if (!matchOwned) return false;

        const allText = window.normalizeText([
          card.name, card.id, card.rarity, card.color, card.bloom,
          card.hp ?? card.life ?? "", card.product, card.card_type,
          card.tags.join(" "), renderSkills(card.skills).replace(/<br>/g, " ")
        ].join(" "));

        const match = {
          rarity: rarity.length === 0 || rarity.includes(card.rarity),
          color: color.length === 0 || color.includes(card.color),
          bloom: bloom.length === 0 || bloom.includes(card.bloom),
          cardType: cardType.length === 0 || cardType.some(type => card.card_type?.includes(type)),
          product: !product || window.normalizeText(card.product).includes(product),
          keyword: !keyword || allText.includes(keyword),
          tags: !tagFilter || card.tags.map(t => window.normalizeText(t)).includes(tagFilter)
        };

        return !Object.values(match).includes(false);
      });

      const sortedCards = sortCards(filtered);

      sortedCards.slice(0, renderLimit).forEach(card => {
        const bloomText = card.card_type === "Buzzホロメン" ? "1stBuzz" : card.bloom;
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><img src="${card.image}" loading="lazy" alt="${card.name}" onclick="showImageModal('${card.image}')"></td>
          <td class="name-cell">
            <div style="font-weight: bold;">${card.name}</div>
            <div class="meta">📄 ${card.id}<br>🃏 ${card.card_type}</div>
          </td>
          <td>${card.rarity}</td>
          <td>${card.color}</td>
          <td>${bloomText}</td>
          <td>${card.hp ?? card.life ?? "-"}</td>
          <td>${card.tags.join("<br>")}</td>
          <td>${renderSkills(card.skills)}</td>
        `;
        tbody.appendChild(row);
      });
    }

    window.onload = async () => {

      if (localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark");
      }

      updateMobileLayout();

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
          image: card.image_url,
          owned: parseInt(localStorage.getItem("count_" + key) ?? "0"),
          card_type: card.card_type ?? "-"
        }));

        setupFilters();
        renderTable();
      } catch (err) {

        // Try to load from localStorage as fallback
        const cachedCardData = localStorage.getItem('cardData');
        const cachedReleaseData = localStorage.getItem('releaseData');

        if (cachedCardData && cachedReleaseData) {
          const rawData = JSON.parse(cachedCardData);
          releaseMap = JSON.parse(cachedReleaseData);

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
            image: card.image_url,
            owned: parseInt(localStorage.getItem("count_" + key) ?? "0"),
            card_type: card.card_type ?? "-"
          }));

          setupFilters();
          renderTable();
        } else {
          alert("データの読み込みに失敗しました！インターネット接続を確認してください。");
        }
      }
    };

    // Service Worker registration with enhanced update notification for mobile
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
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
      });
    }

    // Online/Offline status
    function updateOnlineStatus() {
      const statusElement = document.getElementById('offline-status');
      if (!statusElement) return; // このページには #offline-status が無いため何もしない（load時のnull参照を防ぐ）
      if (navigator.onLine) {
        statusElement.textContent = '🟢 オンライン';
        statusElement.style.color = '#4CAF50';
      } else {
        statusElement.textContent = '🔴 オフライン';
        statusElement.style.color = '#F44336';
      }
    }

    // Update status on page load and network changes
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    window.addEventListener('load', updateOnlineStatus);

    window.addEventListener("scroll", () => {
      const bottom = window.innerHeight + window.scrollY;
      const docHeight = document.body.offsetHeight;
      if (bottom >= docHeight - 100) {
        renderLimit += 40;
        renderTable();
      }
    });
// ✅ Service Worker との通信機能
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
        { type: 'CHECK_SINGLE_PAGE_VERSION', data: { page: 'holoca_skill_page.html' } },
        [messageChannel.port2]
      );

      // レスポンス待機（タイムアウト付き）
      const versionCheckResult = await Promise.race([checkPromise, timeout]);

      if (versionCheckResult.hasUpdates && versionCheckResult.pageInfo) {
        const pageInfo = versionCheckResult.pageInfo;

        statusEl.innerHTML = `🚀 更新利用可能`;
        statusEl.style.color = '#ff6b35';

        // 現在のページのみの詳細情報を生成
        let detailMessage = `🚀 ${pageInfo.page} のバージョン不一致が検出されました:\n\n`;
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
            // より強力なキャッシュクリア処理

            // Service Workerに強制更新を要求
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({ type: 'FORCE_UPDATE' });
            }

            // ブラウザレベルでのキャッシュクリア
            if ('caches' in window) {
              caches.keys().then(cacheNames => {
                return Promise.all(cacheNames.map(cacheName => {
                  return caches.delete(cacheName);
                }));
              }).then(() => {
                // Service Workerの更新を待つ
                return new Promise(resolve => setTimeout(resolve, 1000));
              }).then(() => {
                // より強力なリロード
                if (window.location.reload) {
                  window.location.reload(true); // 強制リロード
                } else {
                  window.location.href = window.location.href + '?t=' + Date.now();
                }
              }).catch(error => {
                window.location.href = window.location.href + '?t=' + Date.now();
              });
            } else {
              // キャッシュAPIが使えない場合のフォールバック
              window.location.href = window.location.href + '?t=' + Date.now();
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
      statusEl.textContent = '[v4.0.0-SW-UNAVAILABLE]';
      statusEl.style.color = '#f44336';
    }

  } catch (error) {
    statusEl.textContent = '[v4.0.0-ERROR: ' + error.message + ']';
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
    const versionInfo = await getVersionInfo();
    if (versionInfo && versionInfo.data) {
      statusEl.textContent = `[v${versionInfo.data.pageVersions['holoca_skill_page.html']}-CENTRALIZED]`;
    }
  } catch (error) {
    statusEl.textContent = '[v4.0.0-CENTRALIZED]';
  }
}

// ✅ ページ読み込み時にバージョン情報を取得
document.addEventListener('DOMContentLoaded', function() {
  // Service Worker からバージョン情報を取得して表示
  setTimeout(() => {
    displayVersionInfo();
  }, 1000);
});

// ✅ Service Worker登録
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(function(registration) {
  }).catch(function(error) {
  });
}
