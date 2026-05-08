(function () {
  const STORAGE_KEY = 'gif-manager-data';
  const MAX_GIFS = 100;
  const MIN_PROB = 1;
  const MAX_PROB = 20;
  const DEFAULT_PROB = 5;

  let panelEl = null;
  let bodyEl = null;
  let countYierEl = null;
  let countBubuEl = null;
  let countPendEl = null;
  let tabYierEl = null;
  let tabBubuEl = null;
  let tabPendEl = null;
  let dropOverlay = null;
  let items = [];
  let activeTab = 'yier';

  function loadItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) items = JSON.parse(raw);
      if (!Array.isArray(items)) items = [];
    } catch (e) {
      items = [];
    }
  }

  function saveItems() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('[GifManager] 存储失败:', e);
    }
  }

  function genId() {
    return 'gif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function analyzeColors(dataUrl, callback) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement('canvas');
      const sw = 80, sh = 80;
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, sw, sh);
      const pixels = ctx.getImageData(0, 0, sw, sh).data;
      let brown = 0, white = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2], a = pixels[i + 3];
        if (a < 30) continue;
        const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
        const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
        const brightness = (r + g + b) / 3;
        if (brightness > 200 && sat < 0.15) white++;
        if (r > 100 && r < 210 && g > 50 && g < 150 && b < 120 && r > g && g > b) brown++;
      }
      callback({ brown: brown, white: white });
    };
    img.onerror = function () { callback({ brown: 0, white: 0 }); };
    img.src = dataUrl;
  }

  function getCurrentMode() {
    if (typeof currentMode !== 'undefined') return currentMode;
    return 'both';
  }

  function isBothMode() {
    return getCurrentMode() === 'both';
  }

  function detectTarget(dataUrl, callback) {
    analyzeColors(dataUrl, function (result) {
      if (result.brown > result.white * 2) {
        callback('bubu');
      } else if (result.white > result.brown * 2) {
        callback('yier');
      } else {
        callback('pending');
      }
    });
  }

  function addGif(dataUrl) {
    if (items.length >= MAX_GIFS) {
      alert('最多上传 ' + MAX_GIFS + ' 个 GIF 哒！');
      return;
    }

    function doAdd(target) {
      const entry = {
        id: genId(),
        dataUrl: dataUrl,
        targetPet: target,
        probability: DEFAULT_PROB,
        addedAt: Date.now()
      };
      items.push(entry);
      saveItems();
      activeTab = target;
      ensureValidTab();
      renderList();
      updateTabButtons();

      if (target === 'pending') {
        if (typeof showGifNotice === 'function') {
          showGifNotice('无法判断归属，已放入待分配哒~');
        }
      } else {
        var name = target === 'yier' ? '一二' : '布布';
        if (typeof showGifNotice === 'function') {
          showGifNotice('GIF 已分配给' + name + '哒！概率 ' + DEFAULT_PROB + '%');
        }
        triggerNow(target, entry);
      }
    }

    detectTarget(dataUrl, doAdd);
  }

  function ensureValidTab() {
    var mode = getCurrentMode();
    if (mode === 'yier' && activeTab === 'bubu') {
      activeTab = 'yier';
    } else if (mode === 'bubu' && activeTab === 'yier') {
      activeTab = 'bubu';
    }
  }

  function triggerNow(petId, entry) {
    if (typeof pets === 'undefined') return;
    var pet = pets[petId];
    if (!pet) return;
    pet.setState('gif:' + entry.id);
  }

  function moveGif(id, newTarget) {
    if (!isBothMode()) {
      alert('需要同时显示一二与布布才可分配哒~');
      return;
    }
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    item.targetPet = newTarget;
    saveItems();
    renderList();
    updateTabButtons();
    var name = newTarget === 'yier' ? '一二' : '布布';
    if (typeof showGifNotice === 'function') {
      showGifNotice('GIF 已移至' + name + '哒！');
    }
    triggerNow(newTarget, item);
  }

  function deleteGif(id) {
    var item = items.find(function (i) { return i.id === id; });
    if (!item) return;
    var targetName = item.targetPet === 'yier' ? '一二' : (item.targetPet === 'bubu' ? '布布' : '待分配');
    if (!confirm('确定要删除这个' + targetName + '的 GIF 吗？\n（第 1/2 次确认）')) return;
    if (!confirm('再次确认：真的要删除吗？\n（第 2/2 次确认）')) return;
    items = items.filter(function (i) { return i.id !== id; });
    saveItems();
    if (window.GifStatePanel && window.GifStatePanel.onGifDeleted) {
      window.GifStatePanel.onGifDeleted(id);
    }
    renderList();
    updateCounts();
  }

  function updateProb(id, prob) {
    const item = items.find(function (i) { return i.id === id; });
    if (item) {
      item.probability = Math.max(MIN_PROB, Math.min(MAX_PROB, prob));
      saveItems();
    }
  }

  function clearTab() {
    var tabItems = items.filter(function (i) { return i.targetPet === activeTab; });
    if (tabItems.length === 0) return;
    var tabName = activeTab === 'yier' ? '一二' : (activeTab === 'bubu' ? '布布' : '待分配');
    if (!confirm('确定要清空' + tabName + '的所有 ' + tabItems.length + ' 个 GIF 吗？\n（第 1/3 次确认）')) return;
    if (!confirm('此操作不可恢复！再次确认？\n（第 2/3 次确认）')) return;
    if (!confirm('最后确认：真的要全部删除吗？\n（第 3/3 次确认）')) return;
    items = items.filter(function (i) { return i.targetPet !== activeTab; });
    saveItems();
    if (window.GifStatePanel && window.GifStatePanel.onGifDeleted) {
      tabItems.forEach(function (t) { window.GifStatePanel.onGifDeleted(t.id); });
    }
    renderList();
    updateCounts();
  }

  function getGifStateCandidates(petId) {
    return items
      .filter(function (item) { return item.targetPet === petId; })
      .map(function (item) {
        return {
          id: item.id,
          dataUrl: item.dataUrl,
          probability: item.probability
        };
      });
  }

  function updateCounts() {
    var yierCount = items.filter(function (i) { return i.targetPet === 'yier'; }).length;
    var bubuCount = items.filter(function (i) { return i.targetPet === 'bubu'; }).length;
    var pendCount = items.filter(function (i) { return i.targetPet === 'pending'; }).length;
    if (countYierEl) countYierEl.textContent = yierCount;
    if (countBubuEl) countBubuEl.textContent = bubuCount;
    if (countPendEl) countPendEl.textContent = pendCount;
  }

  function updateTabButtons() {
    if (!panelEl) return;
    var mode = getCurrentMode();

    if (tabYierEl) {
      if (mode === 'bubu') {
        tabYierEl.style.display = 'none';
      } else {
        tabYierEl.style.display = '';
      }
    }
    if (tabBubuEl) {
      if (mode === 'yier') {
        tabBubuEl.style.display = 'none';
      } else {
        tabBubuEl.style.display = '';
      }
    }

    panelEl.querySelectorAll('.gif-tab').forEach(function (btn) {
      var tab = btn.getAttribute('data-tab');
      btn.classList.toggle('active', tab === activeTab);
    });
    updateCounts();
  }

  function switchTab(tab) {
    activeTab = tab;
    updateTabButtons();
    renderList();
  }

  function renderList() {
    if (!bodyEl) return;
    updateCounts();
    bodyEl.innerHTML = '';

    var tabItems = items.filter(function (i) { return i.targetPet === activeTab; });
    var sorted = tabItems.slice().sort(function (a, b) { return b.addedAt - a.addedAt; });

    var tabLabel = activeTab === 'yier' ? '一二' : (activeTab === 'bubu' ? '布布' : '待分配');
    if (sorted.length === 0) {
      bodyEl.innerHTML = '<div class="gif-empty-tip">' +
        '还没有' + tabLabel + '的 GIF 哦~<br>' +
        '拖拽 GIF 到宠物身上<br>或点击「上传 GIF」按钮添加</div>';
      return;
    }

    var isPending = activeTab === 'pending';
    var bothMode = isBothMode();

    sorted.forEach(function (item) {
      var date = new Date(item.addedAt);
      var timeStr = (date.getMonth() + 1) + '/' + date.getDate() + ' ' +
        date.getHours().toString().padStart(2, '0') + ':' +
        date.getMinutes().toString().padStart(2, '0');

      var el = document.createElement('div');
      el.className = 'gif-item';

      if (isPending) {
        if (bothMode) {
          el.innerHTML =
            '<img class="gif-item-preview" src="' + item.dataUrl + '">' +
            '<div class="gif-item-info">' +
              '<div class="gif-item-target" style="color:#999">待分配</div>' +
              '<div class="gif-item-meta">' + timeStr + '</div>' +
            '</div>' +
            '<div class="gif-item-actions">' +
              '<button class="gif-item-move gif-btn-move" data-id="' + item.id + '" data-target="yier" title="分给一二">🤍一二</button>' +
              '<button class="gif-item-move gif-btn-move" data-id="' + item.id + '" data-target="bubu" title="分给布布">🤎布布</button>' +
              '<button class="gif-item-delete" data-id="' + item.id + '" title="删除">✕</button>' +
            '</div>';

          el.querySelectorAll('.gif-item-move').forEach(function (btn) {
            btn.addEventListener('click', function () {
              moveGif(this.getAttribute('data-id'), this.getAttribute('data-target'));
            });
          });
        } else {
          el.innerHTML =
            '<img class="gif-item-preview" src="' + item.dataUrl + '">' +
            '<div class="gif-item-info">' +
              '<div class="gif-item-target" style="color:#999">待分配</div>' +
              '<div class="gif-item-meta">' + timeStr + '</div>' +
              '<div class="gif-pending-hint">需同时显示一二与布布才可分配</div>' +
            '</div>' +
            '<div class="gif-item-actions">' +
              '<button class="gif-item-delete" data-id="' + item.id + '" title="删除">✕</button>' +
            '</div>';
        }
      } else {
        var targetName = item.targetPet === 'yier' ? '一二' : '布布';
        var targetClass = item.targetPet === 'yier' ? 'target-yier' : 'target-bubu';
        el.innerHTML =
          '<img class="gif-item-preview" src="' + item.dataUrl + '">' +
          '<div class="gif-item-info">' +
            '<div class="gif-item-target ' + targetClass + '">' + targetName + '</div>' +
            '<div class="gif-item-meta">' + timeStr + '</div>' +
            '<div class="gif-prob-control">' +
              '<span class="gif-prob-label">触发率</span>' +
              '<input type="range" class="gif-prob-slider" min="' + MIN_PROB + '" max="' + MAX_PROB + '" value="' + item.probability + '" data-id="' + item.id + '">' +
              '<span class="gif-prob-value">' + item.probability + '%</span>' +
            '</div>' +
          '</div>' +
          '<div class="gif-item-actions">' +
            '<button class="gif-item-delete" data-id="' + item.id + '" title="删除">✕</button>' +
          '</div>';

        var slider = el.querySelector('.gif-prob-slider');
        var valueEl = el.querySelector('.gif-prob-value');
        if (slider && valueEl) {
          slider.addEventListener('input', function () {
            var val = parseInt(this.value, 10);
            valueEl.textContent = val + '%';
            updateProb(this.getAttribute('data-id'), val);
          });
        }
      }

      var delBtn = el.querySelector('.gif-item-delete');
      if (delBtn) {
        delBtn.addEventListener('click', function () {
          deleteGif(this.getAttribute('data-id'));
        });
      }

      bodyEl.appendChild(el);
    });
  }

  function createPanel() {
    if (panelEl) return;

    panelEl = document.createElement('div');
    panelEl.id = 'gif-panel';
    panelEl.innerHTML =
      '<div class="gif-panel-header">' +
        '<span class="gif-panel-title">🎞️ GIF 状态管理</span>' +
        '<div class="gif-panel-close" id="gif-panel-close-btn">✕</div>' +
      '</div>' +
      '<div class="gif-tabs">' +
        '<div class="gif-tab gif-tab-yier active" data-tab="yier">🤍 一二 <span class="gif-tab-count" id="gif-count-yier">0</span></div>' +
        '<div class="gif-tab gif-tab-bubu" data-tab="bubu">🤎 布布 <span class="gif-tab-count" id="gif-count-bubu">0</span></div>' +
        '<div class="gif-tab gif-tab-pend" data-tab="pending">❓ 待分配 <span class="gif-tab-count" id="gif-count-pend">0</span></div>' +
      '</div>' +
      '<div class="gif-panel-toolbar">' +
        '<button class="gif-btn gif-btn-primary" id="gif-upload-btn">📁 上传 GIF</button>' +
        '<button class="gif-btn gif-btn-danger" id="gif-clear-btn">🗑️ 清空当前</button>' +
      '</div>' +
      '<div class="gif-panel-body" id="gif-panel-body"></div>' +
      '<div class="gif-panel-footer">拖拽 GIF 到宠物身上可快速分配 · 支持自定义触发概率 1%~20%</div>';

    document.body.appendChild(panelEl);

    bodyEl = document.getElementById('gif-panel-body');
    countYierEl = document.getElementById('gif-count-yier');
    countBubuEl = document.getElementById('gif-count-bubu');
    countPendEl = document.getElementById('gif-count-pend');
    tabYierEl = panelEl.querySelector('.gif-tab-yier');
    tabBubuEl = panelEl.querySelector('.gif-tab-bubu');
    tabPendEl = panelEl.querySelector('.gif-tab-pend');

    document.getElementById('gif-panel-close-btn').addEventListener('click', closePanel);

    panelEl.querySelectorAll('.gif-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var tabId = this.getAttribute('data-tab');
        if (this.style.display === 'none') return;
        switchTab(tabId);
      });
    });

    document.getElementById('gif-upload-btn').addEventListener('click', function () {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.gif';
      input.onchange = function () {
        if (input.files && input.files[0]) {
          var file = input.files[0];
          var ext = file.name.split('.').pop().toLowerCase();
          if (ext !== 'gif') {
            alert('只支持 GIF 格式哒！');
            return;
          }
          var reader = new FileReader();
          reader.onload = function (ev) { addGif(ev.target.result); };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    });

    document.getElementById('gif-clear-btn').addEventListener('click', clearTab);

    createDropOverlay();

    panelEl.addEventListener('dragover', function (e) {
      e.preventDefault();
      if (dropOverlay) dropOverlay.classList.add('visible');
    });

    panelEl.addEventListener('dragleave', function (e) {
      if (!panelEl.contains(e.relatedTarget)) {
        if (dropOverlay) dropOverlay.classList.remove('visible');
      }
    });

    panelEl.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (dropOverlay) dropOverlay.classList.remove('visible');
      if (e.dataTransfer.files.length > 0) {
        var file = e.dataTransfer.files[0];
        var ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'gif') return;
        var reader = new FileReader();
        reader.onload = function (ev) { addGif(ev.target.result); };
        reader.readAsDataURL(file);
      }
    });

    renderList();
    updateTabButtons();
  }

  function createDropOverlay() {
    if (dropOverlay) return;
    dropOverlay = document.createElement('div');
    dropOverlay.className = 'gif-drop-overlay';
    dropOverlay.innerHTML =
      '<div class="gif-drop-box">' +
        '📎 拖拽 GIF 到这里' +
        '<div class="gif-drop-box-sub">自动识别棕色=布布，白色=一二</div>' +
      '</div>';
    document.body.appendChild(dropOverlay);
  }

  function openPanel() {
    createPanel();
    var mode = getCurrentMode();
    if (mode === 'yier' || mode === 'bubu') {
      activeTab = mode;
    }
    renderList();
    updateTabButtons();
    panelEl.classList.add('visible');
    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouseEvents(false);
    }
  }

  function closePanel() {
    if (panelEl) panelEl.classList.remove('visible');
    if (typeof updateMousePassthrough === 'function') updateMousePassthrough(false);
  }

  function isOpen() {
    return panelEl && panelEl.classList.contains('visible');
  }

  function init() {
    loadItems();
  }

  function addGifForPet(dataUrl, targetPet) {
    if (items.length >= MAX_GIFS) {
      alert('最多上传 ' + MAX_GIFS + ' 个 GIF 哒！');
      return null;
    }
    var entry = {
      id: genId(),
      dataUrl: dataUrl,
      targetPet: targetPet,
      probability: DEFAULT_PROB,
      addedAt: Date.now()
    };
    items.push(entry);
    saveItems();
    return entry;
  }

  function deleteGifSilent(id) {
    items = items.filter(function (i) { return i.id !== id; });
    saveItems();
    renderList();
    updateCounts();
  }

  window.GifManager = {
    init: init,
    openPanel: openPanel,
    closePanel: closePanel,
    isOpen: isOpen,
    addGif: addGif,
    addGifForPet: addGifForPet,
    moveGif: moveGif,
    deleteGif: deleteGif,
    deleteGifSilent: deleteGifSilent,
    getGifStateCandidates: getGifStateCandidates,
    items: function () { return items; },
    triggerNow: triggerNow
  };
})();
