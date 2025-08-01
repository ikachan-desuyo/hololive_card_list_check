    // バインダーコレクションの状態管理
    let binderCollection = {
      binders: [],
      nextId: 1
    };

    // 初期化
    document.addEventListener('DOMContentLoaded', function() {
      loadBinderCollection();
      renderBinders();

      // ダークモードの復元
      if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
      }
    });

    // バインダーコレクションの読み込み
    function loadBinderCollection() {
      const saved = localStorage.getItem('binderCollection');
      if (saved) {
        binderCollection = JSON.parse(saved);
      }
    }

    // バインダーコレクションの保存
    function saveBinderCollection() {
      localStorage.setItem('binderCollection', JSON.stringify(binderCollection));
    }

    // バインダー一覧のレンダリング
    function renderBinders() {
      const grid = document.getElementById('binderGrid');
      grid.innerHTML = '';

      // 新規作成カード
      const newBinderCard = document.createElement('div');
      newBinderCard.className = 'binder-card new-binder-card';
      newBinderCard.onclick = openCreateBinderModal;
      newBinderCard.innerHTML = `
        <div class="new-binder-content">
          <div class="new-binder-icon">➕</div>
          <div class="new-binder-text">新しいバインダーを作成</div>
        </div>
      `;
      grid.appendChild(newBinderCard);

      // 既存のバインダーカード
      binderCollection.binders.forEach((binder, index) => {
        const binderCard = createBinderCard(binder, index);
        grid.appendChild(binderCard);
      });
    }

    // バインダーカードの作成
    function createBinderCard(binder, index) {
      const card = document.createElement('div');
      card.className = 'binder-card';
      card.onclick = () => openBinder(binder.id);

      const coverContent = binder.coverImage ?
        `<img src="${binder.coverImage}" alt="${binder.name}" class="binder-cover-image">` :
        `<div class="binder-cover-placeholder">📚</div>`;

      card.innerHTML = `
        <div class="binder-cover">
          ${coverContent}
          <div class="binder-cover-overlay">
            バインダーを開く
          </div>
          <div class="binder-actions">
            <button class="action-btn" onclick="event.stopPropagation(); editBinder(${index})" title="編集">✏️</button>
            <button class="action-btn" onclick="event.stopPropagation(); deleteBinder(${index})" title="削除">🗑️</button>
          </div>
        </div>
        <div class="binder-info">
          <div class="binder-name">${binder.name}</div>
          <div class="binder-description">${binder.description || 'バインダーの説明がありません'}</div>
          <div class="binder-stats">
            <span class="stat-badge">ページ: ${binder.pageCount || 0}</span>
            <span class="stat-badge">カード: ${binder.cardCount || 0}枚</span>
            <span class="stat-badge">作成: ${formatDate(binder.createdAt)}</span>
          </div>
        </div>
      `;

      return card;
    }

    // レイアウトを選択
    function selectLayout(layout) {
      // 全ての選択を解除
      document.querySelectorAll('.layout-option').forEach(option => {
        option.classList.remove('selected');
      });

      // 選択されたレイアウトをハイライト
      document.querySelector(`[data-layout="${layout}"]`).classList.add('selected');

      // 隠しフィールドに値を設定
      document.getElementById('selectedLayout').value = layout;
    }

    // バインダー作成モーダルを開く
    function openCreateBinderModal() {
      document.getElementById('createBinderModal').classList.add('show');
      document.getElementById('binderName').focus();

      // デフォルトで3x3を選択
      selectLayout('3x3');
    }

    // バインダー作成モーダルを閉じる
    function closeCreateBinderModal() {
      document.getElementById('createBinderModal').classList.remove('show');
      document.getElementById('createBinderForm').reset();
      resetCoverPreview();
      resetSubmitButton(); // ボタン状態もリセット

      // レイアウト選択もリセット
      document.querySelectorAll('.layout-option').forEach(option => {
        option.classList.remove('selected');
      });
    }

    // 表紙画像のアップロード処理
    function handleCoverImageUpload(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const previewImage = document.getElementById('coverPreviewImage');
          const preview = document.getElementById('coverPreview');
          const uploadText = document.getElementById('coverUploadText');

          previewImage.src = e.target.result;
          preview.style.display = 'block';
          uploadText.style.display = 'none';
        };
        reader.readAsDataURL(file);
      }
    }

    // 表紙プレビューのリセット
    function resetCoverPreview() {
      document.getElementById('coverPreview').style.display = 'none';
      document.getElementById('coverUploadText').style.display = 'block';
      document.getElementById('coverImageInput').value = '';
    }

    // バインダー作成フォームの送信
    document.getElementById('createBinderForm').addEventListener('submit', function(e) {
      e.preventDefault();

      // 重複送信防止
      const submitBtn = document.getElementById('createBinderSubmitBtn');
      if (submitBtn.disabled) {
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '作成中...';

      const name = document.getElementById('binderName').value.trim();
      const description = document.getElementById('binderDescription').value.trim();
      const selectedLayout = document.getElementById('selectedLayout').value;
      const coverImageInput = document.getElementById('coverImageInput');

      if (!name) {
        alert('バインダー名を入力してください');
        resetSubmitButton();
        return;
      }

      // レイアウトに基づいてスロット数を決定
      const layoutConfig = {
        '3x3': { slots: 9, rows: 3, cols: 3 },
        '4x3': { slots: 12, rows: 3, cols: 4 },
        '3x4': { slots: 12, rows: 4, cols: 3 },
        '2x3': { slots: 6, rows: 3, cols: 2 }
      };

      const config = layoutConfig[selectedLayout] || layoutConfig['3x3'];

      const newBinder = {
        id: binderCollection.nextId++,
        name: name,
        description: description,
        coverImage: null,
        layout: {
          type: selectedLayout,
          rows: config.rows,
          cols: config.cols,
          slotsPerPage: config.slots
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pageCount: 1,
        cardCount: 0,
        pages: [{
          id: Date.now(),
          name: 'ページ 1',
          slots: Array(config.slots).fill(null)
        }]
      };

      // 表紙画像の処理
      if (coverImageInput.files[0]) {
        const file = coverImageInput.files[0];

        // ファイルサイズチェック（5MB制限）
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          alert('画像ファイルサイズが大きすぎます。5MB以下の画像を選択してください。');
          resetSubmitButton();
          return;
        }

        // ファイル形式チェック
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          alert('サポートされていない画像形式です。JPEG、PNG、GIF、WebPのいずれかを選択してください。');
          resetSubmitButton();
          return;
        }

        const reader = new FileReader();

        reader.onerror = function() {
          alert('画像の読み込みに失敗しました。別の画像を選択してください。');
          resetSubmitButton();
        };

        reader.onload = function(e) {
          try {
            // 画像サイズを圧縮
            const img = new Image();
            img.onload = function() {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');

              // 最大サイズを設定（800x600）
              const maxWidth = 800;
              const maxHeight = 600;
              let { width, height } = img;

              if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
              }

              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(img, 0, 0, width, height);

              // 圧縮された画像データを取得
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
              newBinder.coverImage = compressedDataUrl;
              finalizeBinderCreation(newBinder);
            };

            img.onerror = function() {
              alert('画像の処理に失敗しました。');
              resetSubmitButton();
            };

            img.src = e.target.result;
          } catch (error) {
            console.error('Image processing error:', error);
            alert('画像の処理中にエラーが発生しました。');
            resetSubmitButton();
          }
        };

        reader.readAsDataURL(file);
      } else {
        finalizeBinderCreation(newBinder);
      }
    });

    // 送信ボタンのリセット
    function resetSubmitButton() {
      const submitBtn = document.getElementById('createBinderSubmitBtn');
      submitBtn.disabled = false;
      submitBtn.textContent = 'バインダーを作成';
    }

    // バインダー作成の完了
    function finalizeBinderCreation(binder) {
      try {
        console.log('Creating binder:', binder);
        binderCollection.binders.push(binder);
        console.log('Binder added to collection');

        saveBinderCollection();
        console.log('Binder collection saved');

        closeCreateBinderModal();
        console.log('Modal closed');

        renderBinders();
        console.log('Binders rendered');

        // 作成完了アニメーション
        setTimeout(() => {
          const newCard = document.querySelector('.binder-card:last-child');
          if (newCard && !newCard.classList.contains('new-binder-card')) {
            newCard.classList.add('new');
          }
        }, 100);

        alert(`バインダー「${binder.name}」を作成しました！`);
        console.log('Binder creation completed successfully');

      } catch (error) {
        console.error('Binder creation error:', error);
        console.error('Error stack:', error.stack);
        alert('バインダーの作成中にエラーが発生しました。コンソールでエラー詳細を確認してください。');
        resetSubmitButton();
      }
    }

    // バインダーを開く（オフライン対応）
    function openBinder(binderId) {
      // バインダーIDをURLパラメータとして渡して、collection_binder.htmlを開く
      const url = `collection_binder.html?binderId=${binderId}`;
      
      // オフライン対応ナビゲーションを使用
      if (typeof window.navigateToPage === 'function') {
        console.log('Using offline-aware navigation for binder');
        window.navigateToPage(url);
      } else {
        console.log('Fallback to direct navigation for binder');
        window.location.href = url;
      }
    }

    // バインダーの編集（リッチUI対応）
    let editingBinderIndex = null;
    function editBinder(index) {
      editingBinderIndex = index;
      const binder = binderCollection.binders[index];

      // モーダルを開く
      document.getElementById('editBinderModal').classList.add('show');

      // 値をセット
      document.getElementById('editBinderName').value = binder.name;
      document.getElementById('editBinderDescription').value = binder.description || '';
      document.getElementById('editSelectedLayout').value = binder.layout?.type || '3x3';

      // レイアウト選択UIを反映
      document.querySelectorAll('#editBinderModal .layout-option').forEach(option => {
        option.classList.remove('selected');
        if (option.getAttribute('data-layout') === (binder.layout?.type || '3x3')) {
          option.classList.add('selected');
        }
      });

      // 表紙画像プレビュー
      const preview = document.getElementById('editCoverPreview');
      const previewImg = document.getElementById('editCoverPreviewImage');
      const placeholder = document.getElementById('editCoverPlaceholder');
      const removeBtn = document.getElementById('editRemoveCoverBtn');
      if (binder.coverImage) {
        preview.style.display = 'block';
        previewImg.src = binder.coverImage;
        placeholder.style.display = 'none';
        removeBtn.style.display = 'inline-block';
      } else {
        preview.style.display = 'none';
        previewImg.src = '';
        placeholder.style.display = 'block';
        removeBtn.style.display = 'none';
      }
      document.getElementById('editCoverImageInput').value = '';
    }

    // レイアウト選択（編集用）
    function selectEditLayout(layout) {
      document.querySelectorAll('#editBinderModal .layout-option').forEach(option => {
        option.classList.remove('selected');
      });
      document.querySelector(`#editBinderModal .layout-option[data-layout="${layout}"]`).classList.add('selected');
      document.getElementById('editSelectedLayout').value = layout;
    }

    // 表紙画像アップロード（編集用）
    function handleEditCoverImageUpload(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const previewImage = document.getElementById('editCoverPreviewImage');
          const preview = document.getElementById('editCoverPreview');
          const placeholder = document.getElementById('editCoverPlaceholder');
          previewImage.src = e.target.result;
          preview.style.display = 'block';
          placeholder.style.display = 'none';
          document.getElementById('editRemoveCoverBtn').style.display = 'inline-block';
        };
        reader.readAsDataURL(file);
      }
    }

    // 表紙画像削除（編集用）
    function removeEditCover() {
      const preview = document.getElementById('editCoverPreview');
      const previewImg = document.getElementById('editCoverPreviewImage');
      const placeholder = document.getElementById('editCoverPlaceholder');
      preview.style.display = 'none';
      previewImg.src = '';
      placeholder.style.display = 'block';
      document.getElementById('editRemoveCoverBtn').style.display = 'none';
      document.getElementById('editCoverImageInput').value = '';
    }

    // 編集モーダルを閉じる
    function closeEditBinderModal() {
      document.getElementById('editBinderModal').classList.remove('show');
      document.getElementById('editBinderForm').reset();
      removeEditCover();
      editingBinderIndex = null;
    }

    // 編集フォーム送信
    document.getElementById('editBinderForm').addEventListener('submit', function(e) {
      e.preventDefault();
      if (editingBinderIndex === null) return;
      const binder = binderCollection.binders[editingBinderIndex];
      const name = document.getElementById('editBinderName').value.trim();
      const description = document.getElementById('editBinderDescription').value.trim();
      const selectedLayout = document.getElementById('editSelectedLayout').value;
      const coverImageInput = document.getElementById('editCoverImageInput');

      if (!name) {
        alert('バインダー名を入力してください');
        return;
      }

      // レイアウト情報
      const layoutConfig = {
        '3x3': { slots: 9, rows: 3, cols: 3 },
        '4x3': { slots: 12, rows: 3, cols: 4 },
        '3x4': { slots: 12, rows: 4, cols: 3 },
        '2x3': { slots: 6, rows: 3, cols: 2 }
      };
      const config = layoutConfig[selectedLayout] || layoutConfig['3x3'];

      binder.name = name;
      binder.description = description;
      binder.layout = {
        type: selectedLayout,
        rows: config.rows,
        cols: config.cols,
        slotsPerPage: config.slots
      };
      binder.updatedAt = new Date().toISOString();

      // 表紙画像の処理
      if (coverImageInput.files[0]) {
        const file = coverImageInput.files[0];
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          alert('画像ファイルサイズが大きすぎます。5MB以下の画像を選択してください。');
          return;
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          alert('サポートされていない画像形式です。JPEG、PNG、GIF、WebPのいずれかを選択してください。');
          return;
        }
        const reader = new FileReader();
        reader.onerror = function() {
          alert('画像の読み込みに失敗しました。別の画像を選択してください。');
        };
        reader.onload = function(e) {
          try {
            const img = new Image();
            img.onload = function() {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const maxWidth = 800;
              const maxHeight = 600;
              let { width, height } = img;
              if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
              }
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(img, 0, 0, width, height);
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
              binder.coverImage = compressedDataUrl;
              finalizeEditBinder();
            };
            img.onerror = function() {
              alert('画像の処理に失敗しました。');
            };
            img.src = e.target.result;
          } catch (error) {
            alert('画像の処理中にエラーが発生しました。');
          }
        };
        reader.readAsDataURL(file);
      } else if (document.getElementById('editCoverPreviewImage').src && document.getElementById('editCoverPreview').style.display === 'block') {
        // 既存画像をそのまま使う
        binder.coverImage = document.getElementById('editCoverPreviewImage').src;
        finalizeEditBinder();
      } else {
        // 画像なし
        binder.coverImage = null;
        finalizeEditBinder();
      }
    });

    function finalizeEditBinder() {
      saveBinderCollection();
      renderBinders();
      closeEditBinderModal();
      alert('バインダー情報を更新しました！');
    }

    // バインダーの削除
    function deleteBinder(index) {
      const binder = binderCollection.binders[index];

      if (confirm(`バインダー「${binder.name}」を削除しますか？\nこの操作は取り消せません。`)) {
        binderCollection.binders.splice(index, 1);
        saveBinderCollection();
        renderBinders();
        alert('バインダーを削除しました');
      }
    }

    // バインダーコレクションのエクスポート
    function exportBinderCollection() {
      try {
        const exportData = {
          version: "4.1.1",
          exportDate: new Date().toISOString(),
          binderCollection: binderCollection
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `hololive_binder_collection_${new Date().toISOString().split('T')[0]}.json`;
        link.click();

        alert('バインダーコレクションをエクスポートしました！');
      } catch (error) {
        console.error('Export error:', error);
        alert('エクスポートに失敗しました');
      }
    }

    // インポートモーダルを開く
    function openImportModal() {
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
          <div class="modal-header">
            <h3>バインダーコレクションのインポート</h3>
            <button class="modal-close-btn" onclick="this.closest('.modal').remove()">✕</button>
          </div>
          <div class="modal-body">
            <div style="margin-bottom: 20px;">
              <p style="color: #666; margin-bottom: 15px;">
                バインダーコレクションのJSONファイルを選択してください。<br>
                <strong>注意：</strong> 現在のコレクションは上書きされます。
              </p>
              <input type="file" id="importFileInput" accept=".json" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button onclick="this.closest('.modal').remove()" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">キャンセル</button>
              <button onclick="importBinderCollection()" style="padding: 10px 20px; border: none; background: linear-gradient(45deg, #667eea, #764ba2); color: white; border-radius: 4px; cursor: pointer;">インポート</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      modal.classList.add('show');
    }

    // バインダーコレクションのインポート
    function importBinderCollection() {
      const fileInput = document.getElementById('importFileInput');
      const file = fileInput.files[0];

      if (!file) {
        alert('ファイルを選択してください');
        return;
      }

      if (!file.name.toLowerCase().endsWith('.json')) {
        alert('JSONファイルを選択してください');
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const importData = JSON.parse(e.target.result);

          // データの検証
          if (!importData.binderCollection || !importData.binderCollection.binders) {
            throw new Error('無効なファイル形式です');
          }

          // 確認ダイアログ
          const confirmMsg = `${importData.binderCollection.binders.length}個のバインダーをインポートします。\n現在のコレクションは削除されます。\n\n続行しますか？`;

          if (confirm(confirmMsg)) {
            // インポート実行
            binderCollection = importData.binderCollection;
            saveBinderCollection();
            renderBinders();

            // モーダルを閉じる
            document.querySelector('.modal').remove();

            alert(`${binderCollection.binders.length}個のバインダーを正常にインポートしました！`);
          }
        } catch (error) {
          console.error('Import error:', error);
          alert('インポートに失敗しました。ファイル形式を確認してください。');
        }
      };

      reader.readAsText(file);
    }

    // ユーティリティ関数
    function toggleTheme() {
      document.body.classList.toggle('dark');
      localStorage.setItem('darkMode', document.body.classList.contains('dark'));
    }

    function goHome() {
      window.location.href = 'index.html';
    }

    function formatDate(dateString) {
      const date = new Date(dateString);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    // モーダルの外側クリックで閉じる
    document.getElementById('createBinderModal').addEventListener('click', function(e) {
      if (e.target === this) {
        closeCreateBinderModal();
      }
    });

    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeCreateBinderModal();
      }
    });
