// バインダーの状態管理
    let binderState = {
      binderId: null,
      binderData: null,
      currentPage: 0,
      pages: [],
      totalCards: 0,
      ownedCards: 0,
      autoArrangeVisible: false,
      viewMode: loadViewModePreference(), // 保存された設定を読み込み
      // バインダー設定
      settings: {
        name: 'マイバインダー',
        description: '',
        layout: '3x3',
        coverImage: null,
        isPublic: false,
        lastModified: Date.now()
      }
    };

    let cardsData = [];
    let userCollection = {};
    let binderCollection = { binders: [] };

    // 表示モード設定の保存・読み込み
    function saveViewModePreference(viewMode) {
      localStorage.setItem('binderViewMode', JSON.stringify(viewMode));
    }

    function loadViewModePreference() {
      const saved = localStorage.getItem('binderViewMode');
      if (saved !== null) {
        try {
          const viewMode = JSON.parse(saved);
          return viewMode;
        } catch (error) {
        }
      }
      return false; // デフォルトは編集モード
    }

    // カード選択関連の変数
    let currentSlotIndex = null;
    let selectedCardId = null;
    let availableCards = [];

    // カードナビゲーション用の変数
    let currentModalCard = null;
    let currentPageCards = [];
    let allBinderCards = []; // 全バインダー内のカード（空スロットは除く）
    let currentCardIndex = -1; // 全バインダー内での現在のカードインデックス

    // モバイル用の変数
    let touchStartX = 0;
    let touchStartY = 0;
    let isMobile = window.innerWidth <= 768;
    let mobileMenuVisible = false;

    // モバイル機能用の変数
    let swapMode = false;
    let firstSwapSlot = null;
    let lastTapTime = 0;
    let lastTapSlot = null;

    // 初期化
    document.addEventListener('DOMContentLoaded', async function() {
      console.log('🎴 コレクションバインダー初期化開始');

      // URLパラメータからバインダーIDを取得
      const urlParams = new URLSearchParams(window.location.search);
      binderState.binderId = urlParams.get('binderId');

      if (!binderState.binderId) {
        console.log('🚨 バインダーIDが指定されていません');

        // 既存のバインダーをチェック
        const saved = window.storageProvider.getBinderCollection();
        if (saved) {
          const collection = saved;
          if (collection.binders && collection.binders.length > 0) {
            // 最初のバインダーにリダイレクト
            const firstBinder = collection.binders[0];
            console.log(`🔄 最初のバインダーにリダイレクト: ${firstBinder.id}`);
            window.location.href = `collection_binder.html?binderId=${firstBinder.id}`;
            return;
          }
        }

        // バインダーが存在しない場合、バインダーコレクションページにリダイレクト
        alert('バインダーがありません。新しいバインダーを作成してください。');
        window.location.href = 'binder_collection.html';
        return;
      }

      console.log(`🎯 バインダーID: ${binderState.binderId}`);

      try {
        // 段階的に初期化を実行
        await loadCardData();
        console.log('✅ カードデータ読み込み完了');
        
        loadUserCollection();
        console.log('✅ ユーザーコレクション読み込み完了');
        
        loadBinderCollection();
        console.log('✅ バインダーコレクション読み込み完了');
        
        initializeBinder();
        console.log('✅ バインダー初期化完了');
        
        updateStats();
        initializeMobileFeatures();

        // ViewModeボタンの状態を確実に設定
        setTimeout(() => {
          updateViewModeButton();
        }, 100);

        // バインダー更新通知のリスナーを設定
        setupBinderUpdateListener();
        
        console.log('🎉 コレクションバインダー初期化完了');
      } catch (error) {
        console.error('❌ 初期化中にエラーが発生:', error);
        alert('初期化中にエラーが発生しました。ページを再読み込みしてください。');
      }
    });

    // カードデータの読み込み
    async function loadCardData() {
      try {
        const response = await fetch('./json_file/card_data.json');
        const rawCardData = await response.json();

        // オブジェクトから配列に変換
        cardsData = Object.entries(rawCardData).map(([key, card]) => ({
          ...card,
          id: key,  // keyをidとして設定（card_list.htmlと同じ方式）
          cardImageURL: card.image_url  // 互換性のため
        }));


        binderState.totalCards = cardsData.length;

        // cardsDataが配列であることを確認
        if (!Array.isArray(cardsData)) {
          cardsData = [];
        }

        // 商品リストの初期化はloadUserCollection()後に実行される
      } catch (error) {
        cardsData = []; // エラー時は空配列に設定
      }
    }

    // 収録商品リストの初期化（所有カードのみ）
    function initializeProductList() {
      const productSelect = document.getElementById('productSelect');
      if (!productSelect || !Array.isArray(cardsData)) return;

      // 所有しているカードの収録商品のセットを作成
      const productSet = new Set();
      cardsData.forEach(card => {
        if (userCollection[card.id] > 0 && card.product && card.product.trim()) {
          // 複数商品がある場合は分割して追加
          const products = card.product.split(',').map(p => p.trim());
          products.forEach(product => {
            if (product) productSet.add(product);
          });
        }
      });

      // プルダウンにオプションを追加
      productSelect.innerHTML = '<option value="">すべての商品</option>';
      [...productSet].sort().forEach(product => {
        const option = document.createElement('option');
        option.value = product;
        option.textContent = product;
        productSelect.appendChild(option);
      });

    }

    // カードタイプフィルターの初期化（所有カードのみ）
    function initializeCardTypeFilter() {
      const cardTypeSelect = document.getElementById('cardTypeFilter');
      if (!cardTypeSelect) return;

      const cardTypeSet = new Set();

      // 所有しているカードのカードタイプを収集
      cardsData.forEach(card => {
        if (userCollection[card.id] > 0 && card.card_type) {
          // 「・」で分割して各部分を個別に追加
          const typeParts = card.card_type.split('・');
          typeParts.forEach(part => {
            const trimmedPart = part.trim();
            if (trimmedPart) {
              cardTypeSet.add(trimmedPart);
            }
          });
        }
      });

      // プルダウンにオプションを追加
      cardTypeSelect.innerHTML = '<option value="">すべてのタイプ</option>';
      [...cardTypeSet].sort().forEach(cardType => {
        const option = document.createElement('option');
        option.value = cardType;
        option.textContent = cardType;
        cardTypeSelect.appendChild(option);
      });

    }

    // カード選択画面での統合フィルタリング
    function filterCardsInSelector() {
      const searchTerm = window.normalizeText(document.getElementById('cardSearchInput').value);
      const rarityFilter = document.getElementById('rarityFilter').value;
      const cardTypeFilter = document.getElementById('cardTypeFilter').value;
      const modalProductFilter = document.getElementById('modalProductFilter').value;

      const cardGrid = document.getElementById('cardGrid');
      if (!cardGrid) return;

      // 所有しているカードのみ取得
      const ownedCards = cardsData.filter(card => userCollection[card.id] > 0);

      // 全てのフィルタを適用
      const filteredCards = ownedCards.filter(card => {
        const matchesProduct = !modalProductFilter ||
          (card.product && card.product.includes(modalProductFilter));
        const matchesSearch = window.normalizeText(card.name).includes(searchTerm);
        const matchesRarity = !rarityFilter || card.rarity === rarityFilter;

        // カードタイプフィルタリングの改善
        let matchesCardType = true;
        if (cardTypeFilter) {
          // 「・」で分割されたカードタイプの各部分をチェック
          if (card.card_type) {
            const typeParts = card.card_type.split('・').map(part => part.trim());
            matchesCardType = typeParts.includes(cardTypeFilter);
          } else {
            matchesCardType = false;
          }
        }

        return matchesProduct && matchesSearch && matchesRarity && matchesCardType;
      });

      // カードグリッドを再描画
      renderCardGrid(filteredCards);

    }

    // ユーザーコレクションの読み込み
    function loadUserCollection() {

      // card_list.html形式のデータを読み込み（"count_" + cardId の形式）
      userCollection = {};
      let ownedCount = 0;
      let totalStorageItems = 0;
      let validCounts = 0;

      // すべてのlocalStorageキーをチェック
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('count_')) {
          totalStorageItems++;
          const value = localStorage.getItem(key);
        }
      }


      if (Array.isArray(cardsData)) {

        cardsData.forEach((card, index) => {
          const count = window.storageProvider.getCardCount(card.id);
          userCollection[card.id] = count;

          if (count > 0) {
            ownedCount++;
            validCounts++;
            if (validCounts <= 5) {  // 最初の5枚のみログ出力
            }
          }

          // 最初の10枚の詳細ログ
          if (index < 10) {
          }
        });
      } else {
      }


      // 所持カード数を計算
      binderState.ownedCards = ownedCount;

      
      // ユーザーコレクション読み込み完了後に商品リストを初期化
      initializeProductList();
    }

    // バインダーコレクションの読み込み
    function loadBinderCollection() {

      const saved = window.storageProvider.getBinderCollection();

      if (saved) {
        binderCollection = saved;
      }


      // 指定されたバインダーを取得
      binderState.binderData = binderCollection.binders.find(b => b.id == binderState.binderId);

      if (!binderState.binderData) {
        // テスト用バインダーを作成
        const testBinder = {
          id: binderState.binderId,
          name: `テストバインダー ${binderState.binderId}`,
          description: 'テスト用バインダー',
          layout: {
            type: '3x3',
            rows: 3,
            cols: 3,
            slotsPerPage: 9
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pageCount: 1,
          cardCount: 0,
          pages: [{
            id: Date.now(),
            name: 'ページ 1',
            slots: Array(9).fill(null)
          }]
        };

        if (!binderCollection.binders) {
          binderCollection.binders = [];
        }
        binderCollection.binders.push(testBinder);
        localStorage.setItem('binderCollection', JSON.stringify(binderCollection));
        binderState.binderData = testBinder;
      }

      // バインダーのページデータを復元
      if (binderState.binderData.pages) {
        binderState.pages = binderState.binderData.pages;
      } else {
        binderState.pages = [createEmptyPage()];
        binderState.binderData.pages = binderState.pages;
      }

      // 古いバインダーに対してレイアウト情報を追加（互換性）
      if (!binderState.binderData.layout) {
        binderState.binderData.layout = {
          type: '3x3',
          rows: 3,
          cols: 3,
          slotsPerPage: 9
        };
      }


      // ヘッダータイトルを更新
      updateBinderTitle();
    }

    // バインダーの初期化
    function initializeBinder() {
      // バインダーの基本情報を設定に反映
      if (binderState.binderData) {
        binderState.settings.name = binderState.binderData.name || 'コレクションバインダー';
        binderState.settings.description = binderState.binderData.description || '';
        binderState.settings.layout = binderState.binderData.layout?.type || binderState.binderData.layout || '3x3';
        binderState.settings.coverImage = binderState.binderData.coverImage || null;
        
        // 既存の設定があれば上書き
        if (binderState.binderData.settings) {
          binderState.settings = { ...binderState.settings, ...binderState.binderData.settings };
        }
      }
      
      // バインダータイトルを更新
      updateBinderTitle();
      
      // 保存されたviewModeに基づいてボタンの表示を設定
      updateViewModeButton();

      // バインダーデータが既に読み込まれているので、ページ・ページ番号をリセットしてレンダリング
      binderState.currentPage = 0;
      renderBinder();
      if (typeof updatePageNumberInput === 'function') {
        updatePageNumberInput();
      }
    }

    // ViewModeボタンの表示を更新
    function updateViewModeButton() {
      const btn = document.getElementById('viewModeBtn');
      const addPageBtn = document.getElementById('addPageBtn');
      const clearBtn = document.getElementById('clearBtn');
      
      if (!btn) return;

      if (binderState.viewMode) {
        // 閲覧モード
        btn.textContent = '✏️ 編集モード';
        btn.title = '編集モードに切替';
        
        // ページ追加ボタンと初期化ボタンを非表示
        if (addPageBtn) addPageBtn.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
      } else {
        // 編集モード
        btn.textContent = '👁️ 閲覧モード';
        btn.title = '閲覧モードに切替';
        
        // ページ追加ボタンと初期化ボタンを表示
        if (addPageBtn) addPageBtn.style.display = 'inline-block';
        if (clearBtn) clearBtn.style.display = 'inline-block';
      }
    }

    // 空のページを作成
    function createEmptyPage() {
      const slotsPerPage = binderState.binderData?.layout?.slotsPerPage || 9;
  return {
    id: Date.now(),
    name: '', // nameは使わず空に
    slots: Array(slotsPerPage).fill(null)
  };
    }

    // バインダーのレンダリング
    function renderBinder() {

      const container = document.getElementById('binderPages');
      container.innerHTML = '';

      if (binderState.pages.length === 0) {
        binderState.pages = [createEmptyPage()];
      }

      const currentPageData = binderState.pages[binderState.currentPage];

      if (!currentPageData) {
        binderState.currentPage = 0;
        return renderBinder();
      }

      // レイアウト情報を取得
      const layout = binderState.binderData?.layout || { type: '3x3', cols: 3, slotsPerPage: 9 };
      const slotsPerPage = layout.slotsPerPage;

      // デスクトップかモバイルかを判定
      const isDesktop = window.innerWidth >= 1200;

      if (isDesktop && binderState.pages.length > 1) {
        // デスクトップ版：複数ページ表示
        const pagesContainer = document.createElement('div');
        pagesContainer.className = 'desktop-pages-container';

        // 前のページ
        if (binderState.currentPage > 0) {
          const prevPageData = binderState.pages[binderState.currentPage - 1];
          const prevPageWrapper = document.createElement('div');
          prevPageWrapper.className = binderState.viewMode ? 'page-wrapper prev-page view-mode' : 'page-wrapper prev-page';
          prevPageWrapper.innerHTML = `
            <div class="page-label">前のページ</div>
            ${createPageHTML(prevPageData, binderState.currentPage - 1, layout, slotsPerPage, 'prevPageGrid')}
          `;
          pagesContainer.appendChild(prevPageWrapper);
        }

        // 現在のページ
        const currentPageWrapper = document.createElement('div');
        currentPageWrapper.className = binderState.viewMode ? 'page-wrapper current-page view-mode' : 'page-wrapper current-page';
        currentPageWrapper.innerHTML = `
          <div class="page-label">現在のページ</div>
          ${createPageHTML(currentPageData, binderState.currentPage, layout, slotsPerPage, 'currentPageGrid')}
        `;
        pagesContainer.appendChild(currentPageWrapper);

        // 次のページ
        if (binderState.currentPage < binderState.pages.length - 1) {
          const nextPageData = binderState.pages[binderState.currentPage + 1];
          const nextPageWrapper = document.createElement('div');
          nextPageWrapper.className = binderState.viewMode ? 'page-wrapper next-page view-mode' : 'page-wrapper next-page';
          nextPageWrapper.innerHTML = `
            <div class="page-label">次のページ</div>
            ${createPageHTML(nextPageData, binderState.currentPage + 1, layout, slotsPerPage, 'nextPageGrid')}
          `;
          pagesContainer.appendChild(nextPageWrapper);
        }

        container.appendChild(pagesContainer);

        // グリッドをレンダリング

        renderPageSlots(currentPageData.slots, 'currentPageGrid');
        if (binderState.currentPage > 0) {
          renderPageSlots(binderState.pages[binderState.currentPage - 1].slots, 'prevPageGrid');
        }
        if (binderState.currentPage < binderState.pages.length - 1) {
          renderPageSlots(binderState.pages[binderState.currentPage + 1].slots, 'nextPageGrid');
        }
      } else {
        // モバイル版：単一ページ表示
        const pageDiv = document.createElement('div');
        pageDiv.className = 'binder-page';
        pageDiv.innerHTML = createPageHTML(currentPageData, binderState.currentPage, layout, slotsPerPage, 'currentPageGrid');
        container.appendChild(pageDiv);
        renderPageSlots(currentPageData.slots, 'currentPageGrid');
      }

      updateStats();
      updateCurrentPageCards(); // カードナビゲーション用にページのカードリストを更新
      initializeProductList(); // 収録商品リストを更新
    }

    // ページHTMLを作成する関数
    function createPageHTML(pageData, pageIndex, layout, slotsPerPage, gridId) {
      return `
        <div class="binder-page">
          <div class="page-header">
            <div class="page-title">ページ ${pageIndex + 1}</div>
            <div class="page-info">
              <span>ページ ${pageIndex + 1} / ${binderState.pages.length}</span>
              <span>配置済み: ${pageData.slots.filter(slot => slot !== null).length}/${slotsPerPage}</span>
              <span>レイアウト: ${layout.type}</span>
            </div>
          </div>
          <div class="binder-grid layout-${layout.type}" id="${gridId}" style="--grid-cols: ${layout.cols}"></div>
        </div>
      `;
      updateStats();

      // ページ番号入力フィールドを更新
      updatePageNumberInput();

      // 閲覧モードでのUI制御
      updateViewModeUI();
    }

    // ページスロットのレンダリング
    function renderPageSlots(slots, gridId = 'currentPageGrid') {
      const grid = document.getElementById(gridId);
      if (!grid) {
        return;
      }

      grid.innerHTML = '';

      // ページインデックスを決定
      let pageIndex = binderState.currentPage;
      if (gridId === 'prevPageGrid') {
        pageIndex = binderState.currentPage - 1;
      } else if (gridId === 'nextPageGrid') {
        pageIndex = binderState.currentPage + 1;
      }

      slots.forEach((slotData, index) => {
        const slot = document.createElement('div');
        slot.className = 'card-slot';
        slot.setAttribute('data-slot-index', index);
        slot.setAttribute('data-page-index', pageIndex); // ページインデックスを追加

        if (slotData) {
          // カードが配置されている場合
          slot.classList.add('occupied');
          const card = cardsData.find(c => c.id === slotData.cardId);

          if (card) {
            const imageUrl = card.cardImageURL || card.image_url || './images/placeholder.png';

            // R以上のレアリティの光エフェクトを適用
            const rarityRank = {
              "SEC": 14, "OUR": 13, "UR": 12, "SY": 11, "OSR": 10,
              "SR": 9, "P": 8, "S": 7, "OC": 6, "RR": 5,
              "R": 4, "U": 3, "C": 2, "‐": 1, "-": 1
            };
            const isShinyRarity = card.rarity === 'S';
            const isRareOrHigher = (rarityRank[card.rarity] || 0) >= 4; // R以上
            const effectClass = isShinyRarity ? ' s-rarity-effect' : (isRareOrHigher ? ' rare-effect' : '');

            slot.innerHTML = `
              <div class="card-container${effectClass}" data-card-id="${card.id}" data-slot-index="${index}">
                <img src="${imageUrl}"
                     alt="${card.name}"
                     class="card-image"
                     onerror="this.src='./images/placeholder.png'"
                     onclick="handleCardImageClick('${card.id}')">
                <div class="card-overlay">
                  <div class="card-name">${card.name}</div>
                  <div class="card-rarity">${card.rarity || 'Unknown'}</div>
                </div>
              </div>
            `;

            // ドラッグイベントリスナーを追加（編集モードの全ページ）
            const cardContainer = slot.querySelector('.card-container');
            if (cardContainer) {
              if (!binderState.viewMode) {
                // 編集モード：ドラッグを有効にする
                cardContainer.setAttribute('draggable', 'true');

                cardContainer.addEventListener('dragstart', (e) => {
                  handleDragStart(e, index, pageIndex);
                });
                cardContainer.addEventListener('dragend', handleDragEnd);
              } else {
                // 閲覧モード：ドラッグを無効にする
                cardContainer.setAttribute('draggable', 'false');
              }
            }
          } else {
            slot.innerHTML = `
              <div class="empty-slot-content">
                <div class="slot-number">${index + 1}</div>
                <div class="slot-action">カードが見つかりません</div>
              </div>
            `;
          }
        } else {
          // 空のスロット
          slot.innerHTML = `
            <div class="empty-slot-content">
              <div class="slot-number">${index + 1}</div>
              <div class="slot-action">クリックしてカードを配置</div>
            </div>
          `;
        }

        // イベントリスナーの追加
        const isMainPage = gridId === 'currentPageGrid';
        const isPrevPage = gridId === 'prevPageGrid';
        const isNextPage = gridId === 'nextPageGrid';

        if (!binderState.viewMode) {
          if (isMainPage) {
            // メインページ：クリックとドラッグ&ドロップ両方可能
            slot.addEventListener('click', (e) => {
              
              // モバイルの場合はダブルタップとスワップ機能をチェック
              if (isMobile) {
                const currentTime = Date.now();
                const timeDiff = currentTime - lastTapTime;
                
                // ダブルタップの検出（500ms以内の2回タップ）
                if (timeDiff < 500 && lastTapSlot === index) {
                  handleDoubleTap(index);
                  lastTapTime = 0;
                  lastTapSlot = null;
                  return;
                }
                
                lastTapTime = currentTime;
                lastTapSlot = index;
                
                // スワップモードの処理
                if (swapMode) {
                  handleSwapMode(index);
                  return;
                }
                
                // 通常のクリック処理（少し遅延させてダブルタップと区別）
                setTimeout(() => {
                  if (lastTapSlot === index) {
                    openCardSelector(index);
                  }
                }, 300);
              } else {
                // デスクトップの場合は通常のクリック処理
                openCardSelector(index);
              }
            });
            slot.addEventListener('dragover', (e) => {
              handleDragOver(e);
            });
            slot.addEventListener('dragleave', handleDragLeave);
            slot.addEventListener('drop', (e) => handleDrop(e, index, binderState.currentPage));
          } else if (isPrevPage || isNextPage) {
            // 前後ページ：ドラッグ&ドロップのみ可能
            const targetPageIndex = isPrevPage ? binderState.currentPage - 1 : binderState.currentPage + 1;
            slot.addEventListener('dragover', (e) => {
              handleDragOver(e);
            });
            slot.addEventListener('dragleave', (e) => {
              handleDragLeave(e);
            });
            slot.addEventListener('drop', (e) => {
              handleDrop(e, index, targetPageIndex);
            });
            slot.style.cursor = 'default';
          }
        } else {
          // 閲覧モードでは視覚的にクリックできないことを示す
          slot.style.cursor = 'default';
        }

        grid.appendChild(slot);
      });
    }

    // カード選択モーダルを開く
    function openCardSelector(slotIndex) {

      // cardsDataが配列であることを確認
      if (!Array.isArray(cardsData)) {
        if (isMobile) {
          showMobileAlert('カードデータの読み込み中です。しばらくお待ちください。', '⏳');
        } else {
          alert('カードデータの読み込み中です。しばらくお待ちください。');
        }
        return;
      }

      currentSlotIndex = slotIndex;
      selectedCardId = null;

      // 所持カードのみを表示
      availableCards = cardsData.filter(card => userCollection[card.id] > 0);

      if (availableCards.length === 0) {
        // デバッグ用：最初の5枚のカードの所持状況をチェック
        const debugCards = cardsData.slice(0, 5);
        debugCards.forEach(card => {
          const count = userCollection[card.id];
        });

        if (isMobile) {
          showMobileAlert('配置可能なカードがありません\nホロライブカード一覧ページで所持枚数を1以上に設定してください', '📋');
        } else {
          alert('配置可能なカードがありません\nホロライブカード一覧ページで所持枚数を1以上に設定してください');
        }
        return;
      }

      // モーダルを表示
      const modal = document.getElementById('cardSelectorModal');
      modal.classList.add('show');

      // 商品フィルターを初期化（自動配置エリア用）
      populateProductFilter(availableCards);

      // モーダル内商品フィルターを初期化
      populateModalProductFilter(availableCards);

      // カードタイプフィルターを初期化
      initializeCardTypeFilter();

      // 検索フィールドをクリア
      document.getElementById('cardSearchInput').value = '';
      document.getElementById('rarityFilter').value = '';
      document.getElementById('cardTypeFilter').value = '';
      document.getElementById('modalProductFilter').value = '';

      // 初期フィルタを適用（所有カード + 収録商品フィルタ）
      filterCardsInSelector();

      // 現在のスロットにカードがある場合、それを選択状態にする
      const currentPage = binderState.pages[binderState.currentPage];
      if (currentPage.slots[slotIndex]) {
        selectedCardId = currentPage.slots[slotIndex].cardId;
        highlightSelectedCard();
      }
    }

    // スロットにカードを配置
    function placeCardInSlot(slotIndex, cardId) {
      // 読み取り専用モードチェック
      if (window.readOnlyMode && window.readOnlyMode.isEnabled()) {
        window.readOnlyMode.showWarning('カードの配置');
        return;
      }

      const currentPage = binderState.pages[binderState.currentPage];

      currentPage.slots[slotIndex] = { cardId, placedAt: Date.now() };

      saveBinder();
      renderBinder();
      updateCurrentPageCards();
    }

    // 商品フィルターのオプションを生成（自動配置エリア用）
    function populateProductFilter(cards) {
      const productSelect = document.getElementById('productSelect');
      if (!productSelect) return;

      const products = new Set();

      cards.forEach(card => {
        if (card.product) {
          // 複数商品がある場合は分割して追加
          const productList = card.product.split(',').map(p => p.trim());
          productList.forEach(product => {
            if (product) products.add(product);
          });
        }
      });

      // 既存のオプションをクリア（最初の「すべての商品」は残す）
      while (productSelect.children.length > 1) {
        productSelect.removeChild(productSelect.lastChild);
      }

      // 商品をソートして追加
      Array.from(products).sort().forEach(product => {
        const option = document.createElement('option');
        option.value = product;
        option.textContent = product;
        productSelect.appendChild(option);
      });
    }

    // モーダル内商品フィルターのオプションを生成
    function populateModalProductFilter(cards) {
      const modalProductFilter = document.getElementById('modalProductFilter');
      if (!modalProductFilter) return;

      const products = new Set();

      cards.forEach(card => {
        if (card.product) {
          // 複数商品がある場合は分割して追加
          const productList = card.product.split(',').map(p => p.trim());
          productList.forEach(product => {
            if (product) products.add(product);
          });
        }
      });

      // 既存のオプションをクリア（最初の「すべての商品」は残す）
      while (modalProductFilter.children.length > 1) {
        modalProductFilter.removeChild(modalProductFilter.lastChild);
      }

      // 商品をソートして追加
      Array.from(products).sort().forEach(product => {
        const option = document.createElement('option');
        option.value = product;
        option.textContent = product;
        modalProductFilter.appendChild(option);
      });
    }

    // カードグリッドをレンダリング
    function renderCardGrid(cards) {
      const cardGrid = document.getElementById('cardGrid');
      cardGrid.innerHTML = '';

      if (cards.length === 0) {
        cardGrid.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">該当するカードがありません</div>';
        return;
      }

      cards.forEach((card, index) => {
        const cardItem = document.createElement('div');

        // R以上のレアリティの光エフェクトを適用
        const rarityRank = {
          "SEC": 14, "OUR": 13, "UR": 12, "SY": 11, "OSR": 10,
          "SR": 9, "P": 8, "S": 7, "OC": 6, "RR": 5,
          "R": 4, "U": 3, "C": 2, "‐": 1, "-": 1
        };
        const isShinyRarity = card.rarity === 'S';
        const isRareOrHigher = (rarityRank[card.rarity] || 0) >= 4; // R以上
        const effectClass = isShinyRarity ? 's-rarity-effect' : (isRareOrHigher ? 'rare-effect' : '');
        cardItem.className = effectClass ? `card-item ${effectClass}` : 'card-item';
        cardItem.setAttribute('data-card-id', card.id);

        cardItem.innerHTML = `
          <img src="${card.cardImageURL || './images/placeholder.png'}"
               alt="${card.name}"
               loading="lazy"
               style="display: block;"
               onerror="this.onerror=null; this.src='./images/placeholder.png'; console.log('Image failed to load for card:', '${card.id}', 'Original URL:', '${card.cardImageURL}');"
               onload="console.log('Image loaded successfully for card:', '${card.id}');">
          <div class="card-info">
            <div class="name">${card.name}</div>
            <div class="rarity rarity-${card.rarity || 'C'}">${card.rarity || 'C'}</div>
          </div>
        `;

        cardItem.addEventListener('click', () => {
          selectCard(card.id);
        });
        cardGrid.appendChild(cardItem);

        // 画像の強制表示
        const img = cardItem.querySelector('img');
        if (img) {
          // 次のフレームで画像を強制表示
          requestAnimationFrame(() => {
            img.style.display = 'block';
            img.style.visibility = 'visible';
            img.style.opacity = '1';
          });
        }
      });

      // 全体の再描画を強制
      requestAnimationFrame(() => {
        cardGrid.style.display = 'none';
        cardGrid.offsetHeight; // リフロー強制
        cardGrid.style.display = 'grid';
      });

    }

    // 一時的なメッセージを表示
    function showTemporaryMessage(message, type = 'info') {
      const messageDiv = document.createElement('div');
      messageDiv.className = `temporary-message ${type}`;
      messageDiv.textContent = message;
      messageDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: fadeInOut 2s ease-in-out;
      `;

      document.body.appendChild(messageDiv);

      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.parentNode.removeChild(messageDiv);
        }
      }, 2000);
    }

    // カードを選択
    function selectCard(cardId) {

      // 既に同じカードが選択されている場合は何もしない
      if (selectedCardId === cardId) {
        return;
      }

      selectedCardId = cardId;
      highlightSelectedCard();
    }

    // 選択されたカードをハイライト
    function highlightSelectedCard() {
      // すべてのカードから選択状態を削除
      document.querySelectorAll('.card-item').forEach(item => {
        item.classList.remove('selected');
      });

      // 選択されたカードをハイライト
      if (selectedCardId) {
        const selectedItem = document.querySelector(`[data-card-id="${selectedCardId}"]`);
        if (selectedItem) {
          selectedItem.classList.add('selected');
        }
      }
    }

    // 選択されたカードを配置
    function placeSelectedCard() {
      if (selectedCardId && currentSlotIndex !== null) {

        // カード名を取得して表示
        const card = cardsData.find(c => c.id === selectedCardId);
        const cardName = card ? card.name : selectedCardId;

        placeCardInSlot(currentSlotIndex, selectedCardId);

        // 配置完了メッセージを表示
        if (isMobile) {
          showMobileAlert(`「${cardName}」を配置しました！`, '✅');
        } else {
          showTemporaryMessage(`「${cardName}」を配置しました！`, 'success');
        }

        closeCardSelector();
      } else {

        if (!selectedCardId) {
          if (isMobile) {
            showMobileAlert('カードを選択してください', '⚠️');
          } else {
            alert('カードを選択してください');
          }
        }
      }
    }

    // カードをスロットから削除
    function removeCardFromSlot() {
      // 読み取り専用モードチェック
      if (window.readOnlyMode && window.readOnlyMode.isEnabled()) {
        window.readOnlyMode.showWarning('カードの削除');
        return;
      }

      if (currentSlotIndex !== null) {
        const currentPage = binderState.pages[binderState.currentPage];
        currentPage.slots[currentSlotIndex] = null;
        saveBinder();
        renderBinder();
        updateCurrentPageCards();
        closeCardSelector();
      }
    }

    // カード選択モーダルを閉じる
    function closeCardSelector() {
      const modal = document.getElementById('cardSelectorModal');
      modal.classList.remove('show');
      currentSlotIndex = null;
      selectedCardId = null;
    }

    // 公式カード番号順の比較関数
    function compareOfficialOrder(a, b) {
      // カードを3つのグループに分類
      const getCardGroup = (card) => {
        const rarity = card.rarity;
        if (rarity === 'SY') return 3; // SYグループ
        if (['OUR', 'SEC', 'UR', 'SR', 'S'].includes(rarity)) return 2; // 高レアリティグループ
        return 1; // 通常グループ
      };

      const groupA = getCardGroup(a);
      const groupB = getCardGroup(b);

      // グループが異なる場合はグループ順で比較
      if (groupA !== groupB) {
        return groupA - groupB;
      }

      // SYグループの場合はそのまま配置（カード番号順）
      if (groupA === 3) {
        return (a.id || '').localeCompare(b.id || '');
      }

      // カードタイプの優先順位を定義
      const getCardTypePriority = (card) => {
        const cardType = card.card_type || '';
        if (cardType.includes('推しホロメン')) return 1;
        if (cardType.includes('ホロメン') && !(card.bloom === 'spot')) return 2;
        if (cardType.includes('ホロメン') && card.bloom === 'spot') return 3;
        if (cardType.includes('アイテム')) return 4;
        if (cardType.includes('イベント')) return 5;
        if (cardType.includes('ツール')) return 6;
        if (cardType.includes('マスコット')) return 7;
        if (cardType.includes('ファン')) return 8;
        if (card.cardType === 'エール') return 9;
        return 10;
      };

      const typeA = getCardTypePriority(a);
      const typeB = getCardTypePriority(b);

      if (typeA !== typeB) {
        return typeA - typeB;
      }

      // カード番号の接頭文字を取得
      const getCardPrefix = (cardId) => {
        if (!cardId) return '';
        const match = cardId.match(/^([A-Z]+)/);
        return match ? match[1] : '';
      };

      const prefixA = getCardPrefix(a.id);
      const prefixB = getCardPrefix(b.id);

      // グループ2（高レアリティ）の場合の特別処理
      if (groupA === 2) {
        // カードタイプでソート後、カード番号順
        const cardNumA = a.id ? a.id.replace(/[A-Z]+/, '').replace(/[A-Z]+$/, '') : '';
        const cardNumB = b.id ? b.id.replace(/[A-Z]+/, '').replace(/[A-Z]+$/, '') : '';

        // カード番号（数字部分）が同じ場合はレアリティ順
        if (cardNumA === cardNumB && cardNumA !== '') {
          const rarityOrder = { 'SEC': 1, 'OUR': 2, 'UR': 3, 'SR': 4, 'S': 5 };
          const rarityA = rarityOrder[a.rarity] || 99;
          const rarityB = rarityOrder[b.rarity] || 99;

          if (rarityA !== rarityB) {
            return rarityA - rarityB;
          }
        }
      }

      // 接頭文字の出現回数を計算（同一タイプ内で）
      const getCardPrefixCount = (prefix, type) => {
        return cardsData.filter(card =>
          getCardTypePriority(card) === type &&
          getCardPrefix(card.id) === prefix
        ).length;
      };

      const countA = getCardPrefixCount(prefixA, typeA);
      const countB = getCardPrefixCount(prefixB, typeB);

      // 通常グループ：多い接頭文字を優先
      // 高レアリティグループ：カード番号順後、少ない接頭文字を後に
      if (groupA === 1) {
        // 多い接頭文字を優先
        if (countA !== countB) {
          return countB - countA;
        }
      } else if (groupA === 2) {
        // カード番号順が基本、その後少ない接頭文字を後に
        const cardIdCompare = (a.id || '').localeCompare(b.id || '');
        if (cardIdCompare !== 0) {
          return cardIdCompare;
        }

        // 同じカード番号なら少ない接頭文字を後に
        if (countA !== countB) {
          return countA - countB;
        }
      }

      // 最終的にカード番号順
      return (a.id || '').localeCompare(b.id || '');
    }

    // 自動配置
    function autoArrange(mode) {
      if (!Array.isArray(cardsData)) {
        alert('カードデータの読み込み中です。しばらくお待ちください。');
        return;
      }

      // 順序設定を取得
      const sortOrder = document.getElementById('sortOrderSelect').value;
      const secondarySort = document.getElementById('secondarySortSelect').value;
      const productFilter = document.getElementById('productSelect').value;
      const preserveEmptySlots = document.getElementById('preserveEmptySlots').checked;
      const isAscending = sortOrder === 'asc';

      // 対象カードをフィルタ（所有しているカードのみ）
      let filteredCards = cardsData.filter(card => userCollection[card.id] > 0);

      if (productFilter) {
        filteredCards = filteredCards.filter(card =>
          card.product && card.product.includes(productFilter)
        );
      }

      if (filteredCards.length === 0) {
        const message = productFilter
          ? `収録商品「${productFilter}」の所有カードがありません`
          : '所有しているカードがありません';
        alert(message);
        return;
      }

      // ソート方法を選択（二次ソート対応）
      let sortedCards = [...filteredCards];

      // 二次ソート関数を定義
      const applySortingLogic = (cards, primaryMode, secondaryMode, ascending) => {
        // エールカードと通常カードを分離
        const yells = cards.filter(card => card.cardType === 'エール');
        const nonYells = cards.filter(card => card.cardType !== 'エール');

        // 通常カードをソート
        const sortedNonYells = nonYells.sort((a, b) => {
          // プライマリソート
          let diff = 0;
          switch(primaryMode) {
            case 'rarity':
              const rarityRank = {
                "SEC": 14, "OUR": 13, "UR": 12, "SY": 11, "OSR": 10,
                "SR": 9, "P": 8, "S": 7, "OC": 6, "RR": 5,
                "R": 4, "U": 3, "C": 2, "‐": 1, "-": 1
              };
              diff = (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0);
              break;
            case 'release':
              diff = new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0);
              break;
            case 'official':
              diff = compareOfficialOrder(a, b);
              break;
            case 'custom':
              diff = a.name.localeCompare(b.name);
              break;
          }

          // 同じ値の場合は二次ソートを適用
          if (diff === 0 && secondaryMode) {
            switch(secondaryMode) {
              case 'cardId':
                diff = (a.id || '').localeCompare(b.id || '');
                break;
              case 'release':
                diff = new Date(a.releaseDate || 0) - new Date(b.releaseDate || 0);
                break;
              case 'name':
                diff = a.name.localeCompare(b.name);
                break;
              case 'product':
                diff = (a.product || '').localeCompare(b.product || '');
                break;
            }
          }

          return ascending ? diff : -diff;
        });

        // エールカードをソート
        const sortedYells = yells.sort((a, b) => {
          let diff = 0;
          // エールカードは常にカード名でソート
          diff = a.name.localeCompare(b.name);

          // 二次ソートを適用
          if (diff === 0 && secondaryMode) {
            switch(secondaryMode) {
              case 'cardId':
                diff = (a.id || '').localeCompare(b.id || '');
                break;
              case 'release':
                diff = new Date(a.releaseDate || 0) - new Date(b.releaseDate || 0);
                break;
              case 'name':
                diff = a.name.localeCompare(b.name);
                break;
              case 'product':
                diff = (a.product || '').localeCompare(b.product || '');
                break;
            }
          }

          return ascending ? diff : -diff;
        });

        // 通常カードの後にエールカードを配置
        return [...sortedNonYells, ...sortedYells];
      };

      sortedCards = applySortingLogic(sortedCards, mode, secondarySort, isAscending);

      // 空スロット保持モードの場合
      if (preserveEmptySlots) {
        // 収録商品フィルターが有効なら、その商品内のカード順でnull挿入
        let baseList;
        if (productFilter) {
          baseList = applySortingLogic(
            cardsData.filter(card => card.product && card.product.includes(productFilter)),
            mode, secondarySort, isAscending
          );
        } else {
          baseList = applySortingLogic([...cardsData], mode, secondarySort, isAscending);
        }
        sortedCards = baseList.map(card => userCollection[card.id] > 0 ? card : null);
      } else {
        // 通常モード：持っているカードのみ
        sortedCards = sortedCards.filter(card => userCollection[card.id] > 0);
      }

      if (sortedCards.filter(card => card !== null).length === 0) {
        const message = productFilter
          ? `収録商品「${productFilter}」の配置可能なカードがありません`
          : '配置可能なカードがありません';
        alert(message);
        return;
      }

      // レイアウト情報を取得
      const layout = binderState.binderData?.layout || { slotsPerPage: 9 };
      const slotsPerPage = layout.slotsPerPage;

      // 必要なページ数を計算
      const requiredPages = Math.ceil(sortedCards.length / slotsPerPage);
      // ページ数を正確に調整
      if (binderState.pages.length > requiredPages) {
        binderState.pages = binderState.pages.slice(0, requiredPages);
      }
      while (binderState.pages.length < requiredPages) {
        binderState.pages.push(createEmptyPage());
      }

      // カードを配置
      for (let pageIndex = 0; pageIndex < requiredPages; pageIndex++) {
        const page = binderState.pages[pageIndex];
        page.slots = Array(slotsPerPage).fill(null);
        for (let slotIndex = 0; slotIndex < slotsPerPage; slotIndex++) {
          const globalIndex = pageIndex * slotsPerPage + slotIndex;
          if (globalIndex >= sortedCards.length) break;
          const card = sortedCards[globalIndex];
          if (card) {
            page.slots[slotIndex] = {
              cardId: card.id,
              placedAt: Date.now(),
              autoArranged: true
            };
          } else {
            page.slots[slotIndex] = null; // 空スロット保持
          }
        }
      }

      binderState.currentPage = 0;
      saveBinder();
      renderBinder();
      updateCurrentPageCards();
      hideAutoArrangePanel();

      const modeNames = {
        'rarity': 'レアリティ',
        'release': '発売日',
        'official': '公式カード番号',
        'custom': '五十音'
      };

      const secondaryNames = {
        'cardId': 'カード番号',
        'release': '発売日',
        'name': '名前',
        'product': '収録商品'
      };

      const layoutName = layout.type || '3x3';
      const placedCards = sortedCards.filter(card => card !== null).length;
      const emptySlots = preserveEmptySlots ? sortedCards.filter(card => card === null).length : 0;
      const orderText = isAscending ? '昇順' : '降順';
      const productText = productFilter ? ` (${productFilter})` : '';
      const secondaryText = secondarySort ? ` → ${secondaryNames[secondarySort]}順` : '';
      const emptyText = emptySlots > 0 ? ` (空スロット${emptySlots}個保持)` : '';

      let message = `${modeNames[mode] || mode}順${orderText}${secondaryText}で${placedCards}枚のカードを配置しました！${productText}${emptyText}\nレイアウト: ${layoutName} (${slotsPerPage}枚/ページ)`;

      if (isMobile) {
        showMobileAlert(message, '✅');
      } else {
        alert(message);
      }
    }

    // 統計の更新
    function updateStats() {
      // 統計表示は削除されたため、ページ情報のみ更新
      const currentPage = binderState.pages[binderState.currentPage];
      const filledSlots = currentPage ? currentPage.slots.filter(slot => slot !== null).length : 0;

      // 現在のバインダーのレイアウトから正しいスロット数を取得
      const totalSlots = binderState.binderData?.layout?.slotsPerPage || 9;

      // ページ情報をページヘッダーに反映
      const pageInfo = document.querySelector('.page-info');
      if (pageInfo) {
        pageInfo.innerHTML = `
          <span>ページ ${binderState.currentPage + 1} / ${binderState.pages.length}</span>
          <span>配置済み: ${filledSlots}/${totalSlots}</span>
        `;
      }
    }

    // ユーティリティ関数
    function toggleTheme() {
      document.body.classList.toggle('dark');
      localStorage.setItem('darkMode', document.body.classList.contains('dark'));
    }

    function showAutoArrangePanel() {
      const panel = document.getElementById('autoArrangePanel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      binderState.autoArrangeVisible = panel.style.display === 'block';
    }

    function hideAutoArrangePanel() {
      document.getElementById('autoArrangePanel').style.display = 'none';
      binderState.autoArrangeVisible = false;
    }

    function previousPage() {
      if (binderState.currentPage > 0) {
        binderState.currentPage--;
        renderBinder();
        updatePageNumberInput();
      }
    }

    function nextPage() {
      if (binderState.currentPage < binderState.pages.length - 1) {
        binderState.currentPage++;
        renderBinder();
        updatePageNumberInput();
      }
    }

    function addNewPage() {
      // 読み取り専用モードチェック
      if (window.readOnlyMode && window.readOnlyMode.isEnabled()) {
        window.readOnlyMode.showWarning('ページの追加');
        return;
      }

      binderState.pages.push(createEmptyPage());
      binderState.currentPage = binderState.pages.length - 1;
      saveBinder();
      renderBinder();
      updatePageNumberInput();
    }

    function saveBinder() {

      if (binderState.binderData) {
        // バインダーデータを更新
        binderState.binderData.pages = binderState.pages;
        binderState.binderData.pageCount = binderState.pages.length;
        binderState.binderData.cardCount = binderState.pages.reduce((count, page) => {
          return count + page.slots.filter(slot => slot !== null).length;
        }, 0);
        binderState.binderData.updatedAt = new Date().toISOString();


        // バインダーコレクション全体を保存
        localStorage.setItem('binderCollection', JSON.stringify(binderCollection));
      } else {
      }
    }

    function goHome() {
      // バインダー一覧に戻る
      window.location.href = 'binder_collection.html';
    }

    // ドラッグ&ドロップの処理
    let draggedCardData = null;

    function handleDragStart(e, slotIndex, sourcePageIndex = null) {
      const effectivePageIndex = sourcePageIndex !== null ? sourcePageIndex : binderState.currentPage;

      const sourcePage = binderState.pages[effectivePageIndex];
      if (!sourcePage) {
        e.preventDefault();
        return;
      }

      const slotData = sourcePage.slots[slotIndex];

      if (slotData) {
        draggedCardData = {
          cardId: slotData.cardId,
          fromSlot: slotIndex,
          fromPage: effectivePageIndex
        };

        // ドラッグ効果を設定
        e.currentTarget.classList.add('dragging');
        e.currentTarget.style.opacity = '0.5';

        // データ転送を明示的に設定
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', JSON.stringify(draggedCardData));
          e.dataTransfer.setData('application/json', JSON.stringify(draggedCardData));
        }

      } else {
        e.preventDefault();
      }
    }

    function handleDragEnd(e) {
      e.currentTarget.classList.remove('dragging');
      e.currentTarget.style.opacity = '1';

      // ドラッグオーバー効果をすべてのスロットから削除
      document.querySelectorAll('.card-slot.drag-over').forEach(slot => {
        slot.classList.remove('drag-over');
      });

      draggedCardData = null;
    }

    function handleDragOver(e) {
      e.preventDefault();
      e.stopPropagation();


      // ドロップエフェクトを明示的に設定
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }

      // ドラッグ元と同じスロット・ページでない場合のみハイライト
      const slotIndex = parseInt(e.currentTarget.dataset.slotIndex);
      const pageIndex = e.currentTarget.dataset.pageIndex ? parseInt(e.currentTarget.dataset.pageIndex) : binderState.currentPage;

      if (draggedCardData && (draggedCardData.fromSlot !== slotIndex || draggedCardData.fromPage !== pageIndex)) {
        e.currentTarget.classList.add('drag-over');
      }
    }

    function handleDragLeave(e) {
      e.currentTarget.classList.remove('drag-over');
    }

    function handleDrop(e, slotIndex, targetPageIndex = null) {
      e.preventDefault();
      e.currentTarget.classList.remove('drag-over');

      // 読み取り専用モードチェック
      if (window.readOnlyMode && window.readOnlyMode.isEnabled()) {
        window.readOnlyMode.showWarning('カードの移動');
        draggedCardData = null;
        return;
      }

      if (!draggedCardData) {
        return;
      }

      // ターゲットページを決定（指定されない場合は現在のページ）
      const finalTargetPageIndex = targetPageIndex !== null ? targetPageIndex : binderState.currentPage;

      // 同じスロットへのドロップは無視
      if (draggedCardData.fromSlot === slotIndex && draggedCardData.fromPage === finalTargetPageIndex) {
        return;
      }

      const sourcePage = binderState.pages[draggedCardData.fromPage];
      const targetPage = binderState.pages[finalTargetPageIndex];

      if (!sourcePage || !targetPage) {
        return;
      }

      const targetSlot = targetPage.slots[slotIndex];
      const sourceSlot = sourcePage.slots[draggedCardData.fromSlot];


      // カードの移動処理
      if (targetSlot) {
        // ターゲットスロットにカードがある場合は入れ替え
        sourcePage.slots[draggedCardData.fromSlot] = targetSlot;
        targetPage.slots[slotIndex] = sourceSlot;
      } else {
        // ターゲットスロットが空の場合は移動
        targetPage.slots[slotIndex] = sourceSlot;
        sourcePage.slots[draggedCardData.fromSlot] = null;
      }

      // バインダーを保存して再描画
      saveBinder();
      renderBinder();
      updateCurrentPageCards();

      // クリーンアップ
      draggedCardData = null;
    }

    // ダークモードの復元
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark');
    }

    // モバイル用機能の初期化
    function initializeMobileFeatures() {
      isMobile = window.innerWidth <= 768;

      // スワイプジェスチャーの設定
      const binderContainer = document.querySelector('.binder-container');
      if (binderContainer && isMobile) {
        binderContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
        binderContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
      }

      // スワップボタンの表示制御
      updateSwapButtonVisibility();

      // リサイズイベント
      window.addEventListener('resize', () => {
        const wasMobile = isMobile;
        isMobile = window.innerWidth <= 768;
        
        // モバイル⇄デスクトップ切り替え時にスワップモードをリセット
        if (wasMobile !== isMobile && swapMode) {
          cancelSwapMode();
        }
        
        updateSwapButtonVisibility();
      });
    }

    // スワップボタンの表示制御
    function updateSwapButtonVisibility() {
      const swapButton = document.getElementById('swapButton');
      if (swapButton) {
        // モバイルかつ編集モードの場合のみ表示
        swapButton.style.display = (isMobile && !binderState.viewMode) ? 'inline-block' : 'none';
      }
    }

    // タッチ開始
    function handleTouchStart(e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }

    // タッチ終了（スワイプ検出）
    function handleTouchEnd(e) {
      if (!touchStartX || !touchStartY) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const diffX = touchStartX - touchEndX;
      const diffY = touchStartY - touchEndY;

      // 水平スワイプの検出（縦のスクロールを妨げないように）
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
          // 左スワイプ - 次のページ
          nextPage();
        } else {
          // 右スワイプ - 前のページ
          previousPage();
        }
      }

      touchStartX = 0;
      touchStartY = 0;
    }

    // スワイプインジケーター表示機能は削除

    // ダブルタップ処理
    function handleDoubleTap(slotIndex) {
      const pageData = binderState.pages[binderState.currentPage];
      if (!pageData || !pageData.slots) return;
      
      const cardId = pageData.slots[slotIndex];
      
      if (cardId) {
        // カードがある場合：削除
        pageData.slots[slotIndex] = null;
        saveBinderData();
        renderBinder();
        updateCurrentPageCards();
        showMobileAlert('カードを削除しました', '🗑️');
      } else {
        // カードがない場合：カード選択画面を開く
        openCardSelector(slotIndex);
      }
    }

    // スワップモード処理
    function handleSwapMode(slotIndex) {
      if (firstSwapSlot === null) {
        // 最初のスロット選択
        firstSwapSlot = slotIndex;
        
        // 視覚的フィードバック
        const slot = document.querySelector(`[data-slot-index="${slotIndex}"]`);
        if (slot) {
          slot.style.border = '3px solid #007bff';
        }
        
        // showMobileAlert('交換する2つ目のカードを選択してください', '🔄'); // モバイルメッセージ非表示化
      } else if (firstSwapSlot === slotIndex) {
        // 同じスロットを選択した場合：キャンセル
        cancelSwapMode();
      } else {
        // 2つ目のスロット選択：スワップ実行
        performSwap(firstSwapSlot, slotIndex);
      }
    }

    // スワップ実行
    function performSwap(slot1, slot2) {
      const pageData = binderState.pages[binderState.currentPage];
      if (!pageData || !pageData.slots) return;
      
      // カードを交換
      const temp = pageData.slots[slot1];
      pageData.slots[slot1] = pageData.slots[slot2];
      pageData.slots[slot2] = temp;
      
      saveBinderData();
      renderBinder();
      updateCurrentPageCards();
      cancelSwapMode();
      // showMobileAlert('カードを交換しました', '✅'); // モバイルメッセージ非表示化
    }

    // スワップモードキャンセル
    function cancelSwapMode() {
      swapMode = false;
      firstSwapSlot = null;
      
      // 視覚的フィードバックをリセット
      document.querySelectorAll('.card-slot').forEach(slot => {
        slot.style.border = '';
      });
      
      // スワップボタンの表示を更新
      updateSwapButton();
    }

    // スワップモードトグル
   
    function toggleSwapMode() {
      if (swapMode) {
        cancelSwapMode();
        // showMobileAlert('スワップモードをキャンセルしました', '❌'); // モバイルメッセージ非表示化
      } else {
        swapMode = true;
        firstSwapSlot = null;
        updateSwapButton();
        showMobileAlert('スワップモード開始\n交換したい1つ目のカードを選択してください', '🔄');
      }
    }

    // スワップボタンの表示を更新
    function updateSwapButton() {
      const swapButton = document.getElementById('swapButton');
      if (swapButton) {
        if (swapMode) {
          swapButton.textContent = '❌ キャンセル';
          swapButton.style.background = 'linear-gradient(45deg, #dc3545, #c82333)';
        } else {
          swapButton.textContent = '🔄 交換';
          swapButton.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
        }
      }
    }

    // モバイル用アラート
    function showMobileAlert(message, icon = '📱') {
      const alertDiv = document.createElement('div');
      alertDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 20px 30px;
        border-radius: 15px;
        z-index: 10000;
        text-align: center;
        font-size: 1.1em;
        max-width: 80vw;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      `;
      alertDiv.innerHTML = `<div style="font-size: 1.5em; margin-bottom: 10px;">${icon}</div>${message}`;

      document.body.appendChild(alertDiv);

      setTimeout(() => {
        alertDiv.remove();
      }, 2500);
    }

    // モバイル用カードセレクター
    function showMobileCardSelector(slotIndex, ownedCards) {

      if (!ownedCards || ownedCards.length === 0) {
        showAlert('持っているカードがありません', '😕');
        return;
      }

      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        overflow-y: auto;
        padding: 20px;
        box-sizing: border-box;
      `;

      const content = document.createElement('div');
      content.style.cssText = `
        background: white;
        border-radius: 15px;
        padding: 20px;
        max-width: 500px;
        margin: 0 auto;
        color: #333;
      `;

      // 初期カード表示の生成
      const cardGridHtml = ownedCards.map((card, index) => `
        <div onclick="selectCard(${slotIndex}, '${card.id}'); this.closest('.modal').remove();"
             style="border: 2px solid #ddd; border-radius: 8px; padding: 8px; cursor: pointer; text-align: center; font-size: 0.8em;">
          <img src="${card.cardImageURL || './images/placeholder.png'}"
               style="width: 100%; height: 60px; object-fit: cover; border-radius: 4px; margin-bottom: 5px;"
               onerror="this.src='./images/placeholder.png'">
          <div style="font-weight: bold; line-height: 1.2;">${card.name}</div>
          <div style="color: #666; font-size: 0.9em;">${card.rarity || 'Unknown'}</div>
          <div style="color: #888; font-size: 0.8em;">${card.product || ''}</div>
        </div>
      `).join('');

      content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0;">カードを選択</h3>
          <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 1.5em; cursor: pointer;">✕</button>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">収録商品で絞り込み:</label>
          <select id="productFilterSelect" onchange="filterCardsByProduct(${slotIndex}, this.value)" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="">すべての商品</option>
          </select>
        </div>
        <div id="cardGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; max-height: 60vh; overflow-y: auto;">
          ${cardGridHtml}
        </div>
      `;

      modal.className = 'modal';
      modal.appendChild(content);
      document.body.appendChild(modal);

      // 商品リストを動的に生成
      const products = [...new Set(ownedCards.map(card => card.product).filter(Boolean))].sort();
      const productSelect = modal.querySelector('#productFilterSelect');
      products.forEach(product => {
        const option = document.createElement('option');
        option.value = product;
        option.textContent = product;
        productSelect.appendChild(option);
      });
    }

    // 商品によるカードフィルタリング
    function filterCardsByProduct(slotIndex, productFilter) {
      const ownedCards = cardsData.filter(card => userCollection[card.id] > 0);
      const filteredCards = productFilter ?
        ownedCards.filter(card => card.product && card.product.includes(productFilter)) :
        ownedCards;

      const cardGrid = document.getElementById('cardGrid');
      cardGrid.innerHTML = filteredCards.map(card => `
        <div onclick="selectCard(${slotIndex}, '${card.id}'); this.closest('.modal').remove();"
             style="border: 2px solid #ddd; border-radius: 8px; padding: 8px; cursor: pointer; text-align: center; font-size: 0.8em;">
          <img src="${card.cardImageURL || './images/placeholder.png'}"
               style="width: 100%; height: 60px; object-fit: cover; border-radius: 4px; margin-bottom: 5px;"
               onerror="this.src='./images/placeholder.png'">
          <div style="font-weight: bold; line-height: 1.2;">${card.name}</div>
          <div style="color: #666; font-size: 0.9em;">${card.rarity || 'Unknown'}</div>
          <div style="color: #888; font-size: 0.8em;">${card.product || ''}</div>
        </div>
      `).join('');
    }

    // 画像拡大表示モーダル
    function showImageModal(src, cardData = null) {
      const modal = document.getElementById("imageModal");
      const isMobile = window.innerWidth <= 768;

      // 現在表示中のカード情報を保存（ナビゲーション用）
      currentModalCard = cardData;
      
      // 全バインダー内での現在のカードインデックスを設定
      if (cardData && allBinderCards.length > 0) {
        currentCardIndex = allBinderCards.findIndex(item => item.card.id === cardData.id);
      }

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

        const productText = cardData.product ?
          (cardData.product.includes(",") ?
            cardData.product.replace(/,\s*/g, " / ") : cardData.product) : "不明";

        // スキル情報を取得（フォントサイズを統一）
        const skillsHtml = cardData.skills && cardData.skills.length > 0 ?
          renderSkills(cardData.skills) : "<div style='font-size:13px; color:#aaa;'>スキルなし</div>";

        // Bloom情報を正しく処理
        let bloomText = '不明';
        if (cardData.bloom_level !== undefined && cardData.bloom_level !== null && cardData.bloom_level !== "") {
          bloomText = cardData.bloom_level;
        } else if (cardData.bloom !== undefined && cardData.bloom !== null && cardData.bloom !== "" && cardData.bloom !== "null") {
          bloomText = cardData.bloom;
        } else if (cardData.cardType === "Buzzホロメン" || cardData.card_type === "Buzzホロメン") {
          bloomText = "1stBuzz";
        }

        if (isMobile) {
          // モバイル版：グリッドレイアウトで効率的に配置
          infoContent.innerHTML = `
            <h3 style="margin-top:0; color:#667eea; font-size:16px; margin-bottom:12px;">${cardData.name}</h3>

            <div style="margin-bottom:15px; font-size:13px;">
              <div style="margin-bottom:8px;"><strong>🆔 カード番号:</strong> ${cardData.id}</div>
              <div style="margin-bottom:8px;"><strong>🃏 カードタイプ:</strong> ${cardData.cardType || cardData.card_type || '不明'}</div>
              
              <!-- レアリティ、色、Bloomを1行に3つ表示 -->
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom:8px; font-size:12px;">
                <div><strong>✨ レアリティ:</strong><br>${cardData.rarity}</div>
                <div><strong>🎨 色:</strong><br>${cardData.color || '不明'}</div>
                <div><strong>🌸 Bloom:</strong><br>${bloomText}</div>
              </div>
              
              ${cardData.hp ? `<div style="margin-bottom:8px;"><strong>❤️ HP:</strong> ${cardData.hp}</div>` : ''}
              <div><strong>📦 収録商品:</strong> ${productText}</div>
            </div>

            <div style="margin:12px 0 30px 0; border-top:1px solid #555; padding-top:12px; padding-bottom:20px;">
              <strong style="font-size:14px; color:#667eea;">⚡ スキル:</strong>
              <div style="margin-top:8px; font-size:13px; padding-bottom:20px;">
                ${skillsHtml}
              </div>
            </div>
          `;
        } else {
          // デスクトップ版：従来のレイアウト
          infoContent.innerHTML = `
            <h3 style="margin-top:0; color:#667eea; font-size:18px;">${cardData.name}</h3>

            <div style="margin-bottom:18px; font-size:14px;">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">
                <div style="margin:4px 0;"><strong>🆔 カード番号:</strong> ${cardData.id}</div>
                <div style="margin:4px 0;"><strong>🃏 カードタイプ:</strong> ${cardData.cardType || cardData.card_type || '不明'}</div>
                <div style="margin:4px 0;"><strong>✨ レアリティ:</strong> ${cardData.rarity}</div>
                <div style="margin:4px 0;"><strong>🎨 色:</strong> ${cardData.color || '不明'}</div>
                <div style="margin:4px 0;"><strong>🌸 Bloom:</strong> ${bloomText}</div>
                ${cardData.hp ? `<div style="margin:4px 0;"><strong>❤️ HP:</strong> ${cardData.hp}</div>` : ''}
              </div>
              <div style="margin:8px 0;"><strong>📦 収録商品:</strong> ${productText}</div>
              ${cardData.releaseDate ? `<div style="margin:8px 0;"><strong>📅 発売日:</strong> ${cardData.releaseDate}</div>` : ''}
            </div>

            <div style="margin:15px 0; border-top:1px solid #555; padding-top:15px;">
              <strong style="font-size:15px; color:#667eea;">⚡ スキル:</strong><br>
              <div style="margin-top:10px; font-size:14px;">
                ${skillsHtml}
              </div>
            </div>

            <div style="margin:20px 0; text-align:center;">
              <a href="https://hololive-official-cardgame.com/cardlist/?id=${cardData.id}" target="_blank"
                 style="color:#667eea; text-decoration:none; font-size:14px; padding:8px 16px; border:1px solid #667eea; border-radius:20px; display:inline-block;">
                🔗 公式サイトで詳細を見る ↗
              </a>
            </div>
          `;
        }
      }

      modal.style.display = "flex";
      modal.style.alignItems = "center";
      modal.style.justifyContent = "center";
      document.body.style.overflow = "hidden";
      
      // ナビゲーションボタンの表示状態を更新
      updateNavigationButtons();
    }

    // ナビゲーションボタンの表示状態を更新
    function updateNavigationButtons() {
      const leftArrows = document.querySelectorAll('.nav-arrow-left, .nav-arrow-left-mobile');
      const rightArrows = document.querySelectorAll('.nav-arrow-right, .nav-arrow-right-mobile');
      
      // 前のカードがあるかチェック
      const hasPrevious = currentCardIndex > 0;
      leftArrows.forEach(arrow => {
        arrow.style.opacity = hasPrevious ? '1' : '0.3';
        arrow.style.pointerEvents = hasPrevious ? 'auto' : 'none';
      });
      
      // 次のカードがあるかチェック
      const hasNext = currentCardIndex < allBinderCards.length - 1;
      rightArrows.forEach(arrow => {
        arrow.style.opacity = hasNext ? '1' : '0.3';
        arrow.style.pointerEvents = hasNext ? 'auto' : 'none';
      });
    }

    function closeImageModal() {
      document.getElementById("imageModal").style.display = "none";
      document.body.style.overflow = "auto";
    }

    // カードナビゲーション機能
    function updateCurrentPageCards() {
      currentPageCards = [];
      allBinderCards = [];
      
      // 現在のページのカードを更新
      const currentPageData = binderState.pages[binderState.currentPage];
      if (currentPageData && currentPageData.slots) {
        currentPageData.slots.forEach(slot => {
          if (slot && slot.cardId) {
            const card = cardsData.find(c => c.id === slot.cardId);
            if (card) {
              currentPageCards.push(card);
            }
          }
        });
      }
      
      // 全バインダー内のカードを更新（ページ順序を維持、空スロットも含める）
      if (binderState.pages && binderState.pages.length > 0) {
        binderState.pages.forEach((page, pageIndex) => {
          if (page && page.slots) {
            page.slots.forEach((slot, slotIndex) => {
              if (slot && slot.cardId) {
                const card = cardsData.find(c => c.id === slot.cardId);
                if (card) {
                  allBinderCards.push({
                    card: card,
                    pageIndex: pageIndex,
                    slotIndex: slotIndex
                  });
                }
              }
            });
          }
        });
      }
    }

    function previousCardDetail() {
      if (!currentModalCard || allBinderCards.length === 0 || currentCardIndex <= 0) {
        return;
      }
      
      // 前のカードを探す（空のスロットをスキップ）
      let prevIndex = currentCardIndex - 1;
      while (prevIndex >= 0) {
        const prevCardInfo = allBinderCards[prevIndex];
        if (prevCardInfo && prevCardInfo.card) {
          // カードが見つかった場合
          // 必要に応じてページを移動
          if (prevCardInfo.pageIndex !== binderState.currentPage) {
            binderState.currentPage = prevCardInfo.pageIndex;
            renderBinder(); // ページを再描画
            
            // ページ描画後に少し遅延してモーダルを表示
            setTimeout(() => {
              const imageUrl = prevCardInfo.card.image_url || prevCardInfo.card.image || './images/placeholder.png';
              showImageModal(imageUrl, prevCardInfo.card);
            }, 100);
          } else {
            // 同じページ内での移動
            const imageUrl = prevCardInfo.card.image_url || prevCardInfo.card.image || './images/placeholder.png';
            showImageModal(imageUrl, prevCardInfo.card);
          }
          return;
        }
        prevIndex--;
      }
      
    }

    function nextCardDetail() {
      if (!currentModalCard || allBinderCards.length === 0 || currentCardIndex >= allBinderCards.length - 1) {
        return;
      }
      
      // 次のカードを探す（空のスロットをスキップ）
      let nextIndex = currentCardIndex + 1;
      while (nextIndex < allBinderCards.length) {
        const nextCardInfo = allBinderCards[nextIndex];
        if (nextCardInfo && nextCardInfo.card) {
          // カードが見つかった場合
          // 必要に応じてページを移動
          if (nextCardInfo.pageIndex !== binderState.currentPage) {
            binderState.currentPage = nextCardInfo.pageIndex;
            renderBinder(); // ページを再描画
            
            // ページ描画後に少し遅延してモーダルを表示
            setTimeout(() => {
              const imageUrl = nextCardInfo.card.image_url || nextCardInfo.card.image || './images/placeholder.png';
              showImageModal(imageUrl, nextCardInfo.card);
            }, 100);
          } else {
            // 同じページ内での移動
            const imageUrl = nextCardInfo.card.image_url || nextCardInfo.card.image || './images/placeholder.png';
            showImageModal(imageUrl, nextCardInfo.card);
          }
          return;
        }
        nextIndex++;
      }
      
    }

    // カード画像クリック処理
    function handleCardImageClick(cardId) {
      // 閲覧モードでのみ拡大表示
      if (binderState.viewMode) {
        const card = cardsData.find(c => c.id === cardId);
        if (card) {
          const imageUrl = card.cardImageURL || card.image_url || './images/placeholder.png';
          showImageModal(imageUrl, card);
        }
      }
    }

    // アイコンマップ（スキル表示用）
    const iconImageMap = {
      red: "./images/TCG-ColorArtIcon-Red.png",
      blue: "./images/TCG-ColorArtIcon-Blue.png",
      yellow: "./images/TCG-ColorArtIcon-Yellow.png",
      green: "./images/TCG-ColorArtIcon-Green.png",
      purple: "./images/TCG-ColorArtIcon-Purple.png",
      white: "./images/TCG-ColorArtIcon-White.png",
      any: "./images/TCG-ColorArtIcon-Colorless.png"
    };

    const tokkouImageMap = {
      '赤+50': "./images/tokkou_50_red.png",
      '青+50': "./images/tokkou_50_blue.png",
      '黄+50': "./images/tokkou_50_yellow.png",
      '緑+50': "./images/tokkou_50_green.png",
      '紫+50': "./images/tokkou_50_purple.png",
      '白+50': "./images/tokkou_50_white.png"
    };

    // スキル情報をレンダリングする関数
    function renderSkills(skills) {
      if (!skills || skills.length === 0) return "スキルなし";

      return skills.map(skill => {
        // メインアイコン
        const iconHTML = (skill.icons?.main ?? [])
          .map(icon => {
            const iconLower = icon.toLowerCase();
            const src = iconImageMap[iconLower];
            return src
              ? `<img src="${src}" alt="${icon}" class="skill-icon" style="height:16px; max-width:20px; object-fit:contain; background:transparent; vertical-align:middle;" />`
              : icon;
          })
          .join(" ");

        // 特攻アイコン処理
        const tokkouHTML = (skill.icons?.tokkou ?? [])
          .map(tokkou => {
            // "any" の場合は特別な表示
            if (tokkou.toLowerCase() === "any") {
              return '<span style="background:#ff6b6b; color:white; padding:2px 6px; border-radius:8px; font-size:11px; font-weight:bold;">Any</span>';
            }
            // 特攻アイコンがある場合（日本語形式をチェック）
            const src = tokkouImageMap[tokkou];
            return src
              ? `<img src="${src}" alt="特攻:${tokkou}" class="skill-icon" style="height:40px; max-width:44px; object-fit:contain; background:transparent; vertical-align:middle;" />`
              : `<span style="background:#ff6b6b; color:white; padding:2px 6px; border-radius:8px; font-size:11px;">${tokkou}</span>`;
          })
          .join(" ");

        const iconsBlock = (iconHTML || tokkouHTML)
          ? `<br><div style="margin:5px 0;">${iconHTML}${tokkouHTML ? " ｜ " + tokkouHTML : ""}</div>`
          : "";

        // 表示タイプ別に処理
        if (skill.text) {
          return `<div style="margin-bottom:12px;"><strong>【${skill.type}】</strong>${iconsBlock}<br><span class="skill-text" style="font-size:13px;">${skill.text}</span></div>`;
        } else if (skill.type === "キーワード") {
          const subtype = skill.subtype ? `<strong>【${skill.subtype}】</strong>` : "";
          const name = skill.name ?? "";
          const desc = skill.description ?? "";
          return `<div style="margin-bottom:12px;">${subtype}${iconsBlock}<br><strong style="font-size:14px;">${name}</strong><br><span class="skill-description" style="font-size:13px;">${desc}</span></div>`;
        } else {
          const typePart = `<strong>【${skill.type}】</strong>`;
          const namePart = skill.name ? `[${skill.name}]` : "";
          const dmg = skill.dmg ? `（${skill.dmg}）` : "";
          const subtype = skill.subtype ? `<br><em>${skill.subtype}</em>` : "";
          const desc = skill.description ?? "";
          return `<div style="margin-bottom:12px;">${typePart}<strong>${namePart}${dmg}</strong>${subtype}${iconsBlock}<br><span class="skill-description" style="font-size:13px;">${desc}</span></div>`;
        }
      }).join("");
    }

    // モバイル用メニュー切り替え
    function toggleMobileMenu() {
      mobileMenuVisible = !mobileMenuVisible;
      const fab = document.getElementById('mobileFab');

      if (mobileMenuVisible) {
        fab.textContent = '✕';
        fab.style.background = 'linear-gradient(45deg, #dc3545, #c82333)';
        showAutoArrangePanel();
      } else {
        fab.textContent = '⚙️';
        fab.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
        hideAutoArrangePanel();
      }
    }

    // モーダル関連のイベントリスナー
    document.addEventListener('DOMContentLoaded', function() {
      // モーダル外をクリックした時の処理
      document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-backdrop')) {
          closeCardSelector();
        }
      });

      // ESCキーでモーダルを閉じる
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          closeCardSelector();
        }
      });

      // カード選択時のダブルクリック処理
      document.addEventListener('dblclick', function(e) {
        if (e.target.closest('.card-item')) {
          placeSelectedCard();
        }
      });
    });
    // 閲覧モードのUI更新
    function updateViewModeUI() {
      // 編集関連ボタンの表示/非表示制御
      const editElements = [
        document.querySelector('[onclick="showAutoArrangePanel()"]'),
        document.querySelector('[onclick="addTestCards()"]'),
        document.getElementById('clearBtn'),
        document.querySelector('[onclick="addNewPage()"]')
      ];

      editElements.forEach(element => {
        if (element) {
          element.style.display = binderState.viewMode ? 'none' : 'inline-block';
        }
      });

      // ページ追加ボタンと初期化ボタンも閲覧モードでは非表示
      const pageAddBtn = document.querySelector('[onclick="addNewPage()"]');
      const clearBtn = document.getElementById('clearBtn');

      if (pageAddBtn) {
        pageAddBtn.style.display = binderState.viewMode ? 'none' : 'inline-block';
      }
      if (clearBtn) {
        clearBtn.style.display = binderState.viewMode ? 'none' : 'inline-block';
      }

      // スワップボタンの表示を更新
      updateSwapButtonVisibility();

      // 自動配置パネルを閉じる
      if (binderState.viewMode && binderState.autoArrangeVisible) {
        hideAutoArrangePanel();
      }

      // カード選択モーダルを閉じる
      if (binderState.viewMode) {
        closeCardSelector();
      }

      // 閲覧モードになったらスワップモードを終了
      if (binderState.viewMode && swapMode) {
        cancelSwapMode();
      }
    }

    // ページナビゲーション拡張機能
    function goToFirstPage() {
      if (binderState.pages.length > 0) {
        binderState.currentPage = 0;
        renderBinder();
        updatePageNumberInput();
      }
    }

    function goToLastPage() {
      if (binderState.pages.length > 0) {
        binderState.currentPage = binderState.pages.length - 1;
        renderBinder();
        updatePageNumberInput();
      }
    }

    function goToPage() {
      const input = document.getElementById('pageNumberInput');
      const pageNumber = parseInt(input.value);

      if (isNaN(pageNumber) || pageNumber < 1 || pageNumber > binderState.pages.length) {
        if (isMobile) {
          showMobileAlert(`1から${binderState.pages.length}の間のページ番号を入力してください`, '⚠️');
        } else {
          alert(`1から${binderState.pages.length}の間のページ番号を入力してください`);
        }
        return;
      }

      binderState.currentPage = pageNumber - 1;
      renderBinder();
      updatePageNumberInput();
    }

    function updatePageNumberInput() {
      const input = document.getElementById('pageNumberInput');
      if (input) {
        input.value = binderState.currentPage + 1;
        input.max = binderState.pages.length;
      }
    }

    // 閲覧/編集モード切替
    function toggleViewMode() {
      binderState.viewMode = !binderState.viewMode;

      // 設定を保存
      saveViewModePreference(binderState.viewMode);

      const btn = document.getElementById('viewModeBtn');
      const addPageBtn = document.getElementById('addPageBtn');
      const clearBtn = document.getElementById('clearBtn');

      if (binderState.viewMode) {
        // 閲覧モード
        btn.textContent = '✏️ 編集モード';
        btn.title = '編集モードに切替';
        
        // ページ追加ボタンと初期化ボタンを非表示
        if (addPageBtn) addPageBtn.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        
        if (isMobile) {
          showMobileAlert('閲覧モードに切り替えました', 'ℹ️');
        }
      } else {
        // 編集モード
        btn.textContent = '👁️ 閲覧モード';
        btn.title = '閲覧モードに切替';
        
        // ページ追加ボタンと初期化ボタンを表示
        if (addPageBtn) addPageBtn.style.display = 'inline-block';
        if (clearBtn) clearBtn.style.display = 'inline-block';
        
        if (isMobile) {
          showMobileAlert('編集モードに切り替えました', 'ℹ️');
        }
      }

      renderBinder();
    }

    // 全カード初期化
    function clearAllCards() {
      // 読み取り専用モードチェック
      if (window.readOnlyMode && window.readOnlyMode.isEnabled()) {
        window.readOnlyMode.showWarning('カードの一括削除');
        return;
      }

      const totalCards = binderState.pages.reduce((count, page) => {
        return count + page.slots.filter(slot => slot !== null).length;
      }, 0);

      if (totalCards === 0) {
        if (isMobile) {
          showMobileAlert('配置されているカードがありません', 'ℹ️');
        } else {
          alert('配置されているカードがありません');
        }
        return;
      }

      const confirmMessage = `${totalCards}枚の配置されたカードをすべて削除します。\nこの操作は取り消せません。\n\n実行しますか？`;

      if (confirm(confirmMessage)) {
        // ページ数も1枚に戻して全スロット初期化
        binderState.pages = [createEmptyPage()];
        binderState.currentPage = 0;
        binderState.binderData.pages = binderState.pages;

        saveBinder();
        renderBinder();
        if (typeof updatePageNumberInput === 'function') {
          updatePageNumberInput();
        }
        updateCurrentPageCards();
        if (isMobile) {
          showMobileAlert(`${totalCards}枚のカードを削除しました`, '✅');
        } else {
          alert(`${totalCards}枚のカードを削除しました`);
        }
      }
    }

    function updateBinderTitle() {
      const headerTitle = document.querySelector('.header h1');
      if (headerTitle) {
        headerTitle.textContent = `🎴 ${binderState.settings.name || 'コレクションバインダー'}`;
      }
    }

    // バインダー更新通知のリスナー設定
    function setupBinderUpdateListener() {
      // BroadcastChannelがサポートされている場合
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('binder-updates');
        channel.onmessage = function(event) {
          const { type, binderId, binderData } = event.data;
          if (type === 'BINDER_UPDATED' && binderId == binderState.binderId) {
            // バインダーデータを更新
            binderState.binderData = binderData;
            binderState.settings.name = binderData.name || 'コレクションバインダー';
            binderState.settings.description = binderData.description || '';
            binderState.settings.layout = binderData.layout?.type || binderData.layout || '3x3';
            
            // タイトルを更新
            updateBinderTitle();
            
            // レイアウトが変更された場合はバインダーを再描画
            renderBinder();
          }
        };
      }

      // localStorageイベントのリスナー
      window.addEventListener('storage', function(event) {
        if (event.key === 'binderUpdateNotification') {
          try {
            const data = JSON.parse(event.newValue);
            if (data && data.type === 'BINDER_UPDATED' && data.binderId == binderState.binderId) {
              // バインダーデータを更新
              binderState.binderData = data.binderData;
              binderState.settings.name = data.binderData.name || 'コレクションバインダー';
              binderState.settings.description = data.binderData.description || '';
              binderState.settings.layout = data.binderData.layout?.type || data.binderData.layout || '3x3';
              
              // タイトルを更新
              updateBinderTitle();
              
              // レイアウトが変更された場合はバインダーを再描画
              renderBinder();
            }
          } catch (error) {
          }
        }
      });
    }

