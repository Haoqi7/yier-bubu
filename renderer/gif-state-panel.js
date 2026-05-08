(function () {
  var STORAGE_KEY = 'gif-state-bindings';

  var panelEl = null;
  var bodyEl = null;
  var activeTab = 'yier';
  var bindings = [];
  var _dragState = null;
  var _suppressClose = false;

  var STATE_META = {
    idle:           { icon: '😶', label: '发呆' },
    walk:           { icon: '🚶', label: '走路' },
    run_right:      { icon: '🏃', label: '向右跑' },
    run_left:       { icon: '🏃‍♂️', label: '向左跑' },
    wave:           { icon: '👋', label: '挥手' },
    jump:           { icon: '🦘', label: '跳跃' },
    eat:            { icon: '🍽️', label: '吃东西' },
    sleep:          { icon: '😴', label: '睡觉' },
    happy_dance:    { icon: '💃', label: '跳舞' },
    roll:           { icon: '🔄', label: '打滚' },
    bath:           { icon: '🛁', label: '洗澡' },
    watch_tv:       { icon: '📺', label: '看电视' },
    stare_at_cursor:{ icon: '🖱️', label: '盯鼠标' },
    dream:          { icon: '💭', label: '做梦' },
    yawn:           { icon: '🥱', label: '打哈欠' },
    hide_and_seek:  { icon: '🙈', label: '捉迷藏' },
    clingy:         { icon: '🥺', label: '撒娇' },
    sad:            { icon: '😢', label: '难过' },
    coding:         { icon: '⌨️', label: '编码' },
    read:           { icon: '📖', label: '看书' },
    coffee:         { icon: '☕', label: '喝咖啡' },
    stare_love:     { icon: '🥰', label: '花痴' },
    debug:          { icon: '🐛', label: '调试' },
    play:           { icon: '🎯', label: '玩耍' },
    climb_wall:     { icon: '🧗', label: '爬墙' },
    drop_down:      { icon: '😱', label: '掉落' },
    beg:            { icon: '🙏', label: '讨食' },
    hungry:         { icon: '🍖', label: '饥饿' },
    carry:          { icon: '🫳', label: '抱走' },
    pat:            { icon: '🤚', label: '摸头' },
    protect:        { icon: '🛡️', label: '保护' },
    tuck_in:        { icon: '🛌', label: '盖被' },
    look_for_yier:  { icon: '🔍', label: '找一二' }
  };

  var SHARED_STATES = ['idle','walk','run_right','run_left','wave','jump','eat','sleep','happy_dance','roll','bath','watch_tv','stare_at_cursor','dream','hungry','beg','drop_down','sad'];
  var YIER_ONLY = ['play','climb_wall','hide_and_seek','clingy'];
  var BUBU_ONLY = ['yawn','coding','coffee','read','stare_love','debug','carry','pat','protect','tuck_in','look_for_yier'];
  var YIER_STATES_ORDER = SHARED_STATES.concat(YIER_ONLY);
  var BUBU_STATES_ORDER = SHARED_STATES.concat(BUBU_ONLY);

  function loadBindings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) bindings = JSON.parse(raw);
      if (!Array.isArray(bindings)) bindings = [];
    } catch (e) {
      bindings = [];
    }
  }

  function saveBindings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
    } catch (e) {
      console.error('[GifStatePanel] save failed:', e);
    }
  }

  function genId() {
    return 'sb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function getGifItems() {
    if (typeof GifManager !== 'undefined' && GifManager.items) {
      return GifManager.items();
    }
    return [];
  }

  function getAvailableGifs(petId) {
    var allGifs = getGifItems();
    return allGifs.filter(function (g) { return g.targetPet === petId; });
  }

  function getPendingGifs() {
    var allGifs = getGifItems();
    return allGifs.filter(function (g) { return g.targetPet === 'pending'; });
  }

  function getBoundGifsForState(petId, stateId) {
    return bindings.filter(function (b) {
      return b.petId === petId && b.stateId === stateId;
    });
  }

  function normalizeProbs(petId, stateId) {
    var stateBindings = getBoundGifsForState(petId, stateId);
    if (stateBindings.length <= 1) return;
    var total = stateBindings.reduce(function (s, b) { return s + (b.stateProb || 0); }, 0);
    if (total === 0) {
      var each = Math.floor(100 / stateBindings.length);
      stateBindings.forEach(function (b, i) {
        b.stateProb = i === 0 ? 100 - each * (stateBindings.length - 1) : each;
      });
    } else if (Math.abs(total - 100) > 0.5) {
      stateBindings.forEach(function (b) {
        b.stateProb = Math.round(b.stateProb / total * 100);
      });
      var diff = 100 - stateBindings.reduce(function (s, b) { return s + b.stateProb; }, 0);
      if (diff !== 0 && stateBindings.length > 0) {
        stateBindings[0].stateProb += diff;
      }
    }
    saveBindings();
  }

  function notifyBindingChanged(petId, stateId) {
    if (typeof pets === 'undefined' || !pets[petId]) return;
    var pet = pets[petId];
    if (pet.currentState === stateId) {
      pet.loadStateImage(stateId);
    }
  }

  function addBinding(petId, stateId, gifId, prob) {
    var existing = getBoundGifsForState(petId, stateId);
    var isSingle = existing.length === 0;
    var entry = {
      id: genId(),
      gifId: gifId,
      petId: petId,
      stateId: stateId,
      stateProb: isSingle ? 100 : (prob || Math.floor(100 / (existing.length + 1))),
      createdAt: Date.now()
    };
    bindings.push(entry);
    if (!isSingle) normalizeProbs(petId, stateId);
    saveBindings();
    notifyBindingChanged(petId, stateId);
    return entry;
  }

  function removeBinding(bindingId) {
    var binding = bindings.find(function (b) { return b.id === bindingId; });
    if (!binding) return;
    var petId = binding.petId;
    var stateId = binding.stateId;
    bindings = bindings.filter(function (b) { return b.id !== bindingId; });
    var remaining = getBoundGifsForState(petId, stateId);
    if (remaining.length === 1) {
      remaining[0].stateProb = 100;
    } else if (remaining.length > 1) {
      normalizeProbs(petId, stateId);
    }
    saveBindings();
    notifyBindingChanged(petId, stateId);
  }

  function deleteGifAndBindings(gifId) {
    var affected = bindings.filter(function (b) { return b.gifId === gifId; });
    bindings = bindings.filter(function (b) { return b.gifId !== gifId; });
    saveBindings();
    affected.forEach(function (b) { notifyBindingChanged(b.petId, b.stateId); });
  }

  function onGifDeleted(gifId) {
    deleteGifAndBindings(gifId);
  }

  function updateProb(bindingId, newProb) {
    var binding = bindings.find(function (b) { return b.id === bindingId; });
    if (!binding) return;
    binding.stateProb = Math.max(1, Math.min(100, Math.round(newProb)));
    saveBindings();
  }

  function getBoundGif(petId, stateId) {
    var stateBindings = getBoundGifsForState(petId, stateId);
    if (stateBindings.length === 0) return null;
    var gifItems = getGifItems();
    var validBindings = stateBindings.filter(function (b) {
      return gifItems.some(function (g) { return g.id === b.gifId; });
    });
    if (validBindings.length === 0) {
      bindings = bindings.filter(function (b) { return b.petId !== petId || b.stateId !== stateId; });
      saveBindings();
      return null;
    }
    if (validBindings.length === 1) {
      return gifItems.find(function (g) { return g.id === validBindings[0].gifId; }) || null;
    }
    var total = validBindings.reduce(function (s, b) { return s + (b.stateProb || 1); }, 0);
    var rand = Math.random() * total;
    for (var i = 0; i < validBindings.length; i++) {
      rand -= validBindings[i].stateProb || 1;
      if (rand <= 0) {
        return gifItems.find(function (g) { return g.id === validBindings[i].gifId; }) || null;
      }
    }
    return gifItems.find(function (g) { return g.id === validBindings[0].gifId; }) || null;
  }

  function getStatesOrder(petId) {
    return petId === 'yier' ? YIER_STATES_ORDER : BUBU_STATES_ORDER;
  }

  function showNotice(text) {
    if (typeof showGifNotice === 'function') {
      showGifNotice(text);
    }
    var el = document.createElement('div');
    el.className = 'gsp-notice';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 2600);
  }

  function suppressCloseOnce() {
    _suppressClose = true;
    setTimeout(function () { _suppressClose = false; }, 300);
  }

  function isSuppressingClose() {
    return _suppressClose;
  }

  function uploadGifFile(targetPet, callback) {
    var capturedPet = targetPet;
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.gif';
    input.onchange = function () {
      if (input.files && input.files[0]) {
        var file = input.files[0];
        var ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'gif') { showNotice('只支持 GIF 格式哒！'); return; }
        var reader = new FileReader();
        reader.onload = function (ev) { callback(ev.target.result, capturedPet); };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  function initDrag() {
    if (!panelEl) return;
    var header = panelEl.querySelector('.gsp-header');
    if (!header) return;
    header.style.cursor = 'move';
    header.addEventListener('mousedown', function (e) {
      if (e.target.closest('.gsp-close')) return;
      e.preventDefault();
      var rect = panelEl.getBoundingClientRect();
      _dragState = {
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top
      };
      panelEl.style.transition = 'none';
    });
    document.addEventListener('mousemove', function (e) {
      if (!_dragState) return;
      var x = e.clientX - _dragState.offsetX;
      var y = e.clientY - _dragState.offsetY;
      x = Math.max(0, Math.min(x, window.innerWidth - panelEl.offsetWidth));
      y = Math.max(0, Math.min(y, window.innerHeight - 60));
      panelEl.style.left = x + 'px';
      panelEl.style.top = y + 'px';
      panelEl.style.transform = 'none';
    });
    document.addEventListener('mouseup', function () {
      if (!_dragState) return;
      _dragState = null;
      panelEl.style.transition = '';
    });
  }

  function renderPanel() {
    if (!bodyEl) return;
    bodyEl.innerHTML = '';
    renderLibrary();
    renderStates();
  }

  function renderLibrary() {
    var petGifs = getAvailableGifs(activeTab);
    var pendingGifs = getPendingGifs();
    var petName = activeTab === 'yier' ? '一二' : '布布';
    var currentActiveTab = activeTab;

    var section = document.createElement('div');
    section.className = 'gsp-library-section';

    var header = document.createElement('div');
    header.className = 'gsp-library-header';
    header.innerHTML = '<span class="gsp-library-title">📦 GIF 库 — ' + petName + ' (' + petGifs.length + ')</span>';
    var uploadBtn = document.createElement('button');
    uploadBtn.className = 'gsp-btn gsp-btn-sm gsp-btn-primary';
    uploadBtn.textContent = '📤 上传 GIF';
    uploadBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      suppressCloseOnce();
      uploadGifFile(currentActiveTab, function (dataUrl, targetPet) {
        if (typeof GifManager !== 'undefined' && GifManager.addGifForPet) {
          GifManager.addGifForPet(dataUrl, targetPet);
        }
        renderPanel();
        var name = targetPet === 'yier' ? '一二' : '布布';
        showNotice('GIF 已上传到' + name + '的库中哒！');
      });
    });
    header.appendChild(uploadBtn);
    section.appendChild(header);

    var grid = document.createElement('div');
    grid.className = 'gsp-library-grid';

    if (petGifs.length === 0) {
      var emptyEl = document.createElement('div');
      emptyEl.className = 'gsp-library-empty';
      emptyEl.textContent = '还没有' + petName + '的 GIF，点击上方上传';
      grid.appendChild(emptyEl);
    } else {
      petGifs.forEach(function (gif) {
        var item = document.createElement('div');
        item.className = 'gsp-library-item';
        var img = document.createElement('img');
        img.src = gif.dataUrl;
        item.appendChild(img);
        var delBtn = document.createElement('div');
        delBtn.className = 'gsp-lib-del';
        delBtn.textContent = '✕';
        delBtn.title = '删除此GIF';
        delBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          suppressCloseOnce();
          if (!confirm('确定删除此 GIF 吗？\n相关的绑定也会被清除。')) return;
          deleteGifAndBindings(gif.id);
          if (window.GifManager && window.GifManager.deleteGifSilent) {
            window.GifManager.deleteGifSilent(gif.id);
          }
          renderPanel();
          showNotice('GIF 已删除哒！');
        });
        item.appendChild(delBtn);
        var bindingCount = bindings.filter(function (b) { return b.gifId === gif.id; }).length;
        if (bindingCount > 0) {
          var badge = document.createElement('div');
          badge.className = 'gsp-lib-badge';
          badge.textContent = bindingCount;
          badge.title = '已绑定 ' + bindingCount + ' 个状态';
          item.appendChild(badge);
        }
        grid.appendChild(item);
      });
    }
    section.appendChild(grid);

    if (pendingGifs.length > 0 && typeof currentMode !== 'undefined' && currentMode === 'both') {
      var pendHeader = document.createElement('div');
      pendHeader.className = 'gsp-library-header';
      pendHeader.innerHTML = '<span class="gsp-library-title">❓ 待分配 (' + pendingGifs.length + ')</span>';
      section.appendChild(pendHeader);

      var pendGrid = document.createElement('div');
      pendGrid.className = 'gsp-library-grid';
      pendingGifs.forEach(function (gif) {
        var item = document.createElement('div');
        item.className = 'gsp-library-item gsp-library-pending';
        var img = document.createElement('img');
        img.src = gif.dataUrl;
        item.appendChild(img);
        var assignY = document.createElement('div');
        assignY.className = 'gsp-lib-assign';
        assignY.textContent = '🤍';
        assignY.title = '分给一二';
        assignY.addEventListener('click', function (e) {
          e.stopPropagation();
          suppressCloseOnce();
          if (window.GifManager && window.GifManager.moveGif) {
            window.GifManager.moveGif(gif.id, 'yier');
          }
          renderPanel();
          showNotice('已分配给一二哒！');
        });
        item.appendChild(assignY);
        var assignB = document.createElement('div');
        assignB.className = 'gsp-lib-assign gsp-lib-assign-right';
        assignB.textContent = '🤎';
        assignB.title = '分给布布';
        assignB.addEventListener('click', function (e) {
          e.stopPropagation();
          suppressCloseOnce();
          if (window.GifManager && window.GifManager.moveGif) {
            window.GifManager.moveGif(gif.id, 'bubu');
          }
          renderPanel();
          showNotice('已分配给布布哒！');
        });
        item.appendChild(assignB);
        pendGrid.appendChild(item);
      });
      section.appendChild(pendGrid);
    }

    bodyEl.appendChild(section);
  }

  function renderStates() {
    var gifItems = getGifItems();
    var statesOrder = getStatesOrder(activeTab);
    var boundStates = [];
    var unboundStates = [];
    statesOrder.forEach(function (sid) {
      if (getBoundGifsForState(activeTab, sid).length > 0) {
        boundStates.push(sid);
      } else {
        unboundStates.push(sid);
      }
    });

    var section = document.createElement('div');
    section.className = 'gsp-states-section';

    var header = document.createElement('div');
    header.className = 'gsp-states-header';
    header.innerHTML = '<span class="gsp-states-title">🎬 状态绑定 (' + boundStates.length + '/' + statesOrder.length + ')</span>';
    section.appendChild(header);

    boundStates.forEach(function (sid) {
      section.appendChild(renderStateCard(sid, gifItems));
    });

    if (boundStates.length > 0 && unboundStates.length > 0) {
      var divider = document.createElement('div');
      divider.className = 'gsp-divider';
      divider.textContent = '—— 未绑定状态 ——';
      section.appendChild(divider);
    }

    unboundStates.forEach(function (sid) {
      section.appendChild(renderStateCard(sid, gifItems));
    });

    bodyEl.appendChild(section);
  }

  function renderStateCard(stateId, gifItems) {
    var meta = STATE_META[stateId] || { icon: '✨', label: stateId };
    var stateBindings = getBoundGifsForState(activeTab, stateId);

    var card = document.createElement('div');
    card.className = 'gsp-state-card' + (stateBindings.length > 0 ? ' has-binding' : '');

    var header = document.createElement('div');
    header.className = 'gsp-state-header';
    header.addEventListener('click', function (e) {
      e.stopPropagation();
      card.classList.toggle('expanded');
    });
    var label = document.createElement('span');
    label.className = 'gsp-state-label';
    label.innerHTML = meta.icon + ' ' + meta.label;
    header.appendChild(label);

    var right = document.createElement('div');
    right.className = 'gsp-state-right';
    if (stateBindings.length > 0) {
      var countBadge = document.createElement('span');
      countBadge.className = 'gsp-state-count';
      countBadge.textContent = stateBindings.length + ' 个 GIF';
      right.appendChild(countBadge);
      var preview = document.createElement('img');
      preview.className = 'gsp-state-mini-preview';
      var firstGif = gifItems.find(function (g) { return g.id === stateBindings[0].gifId; });
      if (firstGif) preview.src = firstGif.dataUrl;
      right.appendChild(preview);
    } else {
      var defaultBadge = document.createElement('span');
      defaultBadge.className = 'gsp-state-default';
      defaultBadge.textContent = '默认动画';
      right.appendChild(defaultBadge);
    }
    var arrow = document.createElement('span');
    arrow.className = 'gsp-state-arrow';
    arrow.textContent = '▼';
    right.appendChild(arrow);
    header.appendChild(right);
    card.appendChild(header);

    var body = document.createElement('div');
    body.className = 'gsp-state-body';

    if (stateBindings.length > 0) {
      var listEl = document.createElement('div');
      listEl.className = 'gsp-binding-list';

      stateBindings.forEach(function (binding) {
        var gif = gifItems.find(function (g) { return g.id === binding.gifId; });
        var item = document.createElement('div');
        item.className = 'gsp-binding-item';

        var previewImg = document.createElement('img');
        previewImg.className = 'gsp-binding-preview';
        previewImg.src = gif ? gif.dataUrl : '';
        item.appendChild(previewImg);

        var info = document.createElement('div');
        info.className = 'gsp-binding-info';

        if (stateBindings.length > 1) {
          var probWrap = document.createElement('div');
          probWrap.className = 'gsp-binding-prob';
          var slider = document.createElement('input');
          slider.type = 'range';
          slider.min = '1';
          slider.max = '100';
          slider.value = String(binding.stateProb || 100);
          slider.className = 'gsp-prob-slider';
          var probVal = document.createElement('span');
          probVal.className = 'gsp-prob-value';
          probVal.textContent = (binding.stateProb || 100) + '%';
          var debounce = null;
          slider.addEventListener('input', function () {
            var val = parseInt(this.value, 10);
            probVal.textContent = val + '%';
            updateProb(binding.id, val);
            if (debounce) clearTimeout(debounce);
            debounce = setTimeout(function () {
              normalizeProbs(activeTab, stateId);
              renderPanel();
            }, 400);
          });
          probWrap.appendChild(slider);
          probWrap.appendChild(probVal);
          info.appendChild(probWrap);
        } else {
          var probLabel = document.createElement('div');
          probLabel.className = 'gsp-binding-prob-single';
          probLabel.textContent = '100%';
          info.appendChild(probLabel);
        }
        item.appendChild(info);

        var actions = document.createElement('div');
        actions.className = 'gsp-binding-actions';

        var unbindBtn = document.createElement('button');
        unbindBtn.className = 'gsp-btn-small gsp-btn-unbind';
        unbindBtn.textContent = '解绑';
        unbindBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          suppressCloseOnce();
          if (!confirm('确定解绑此 GIF 吗？\n解绑后该状态将恢复默认动画。')) return;
          removeBinding(binding.id);
          renderPanel();
          showNotice('已解绑，恢复默认动画哒！');
        });
        actions.appendChild(unbindBtn);
        item.appendChild(actions);
        listEl.appendChild(item);
      });
      body.appendChild(listEl);
    }

    var addRow = document.createElement('div');
    addRow.className = 'gsp-state-add-row';
    var addBtn = document.createElement('button');
    addBtn.className = 'gsp-btn gsp-btn-add';
    addBtn.textContent = '＋ 添加 GIF';
    addBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      suppressCloseOnce();
      showBindPicker(card, stateId);
    });
    addRow.appendChild(addBtn);
    body.appendChild(addRow);

    card.appendChild(body);
    return card;
  }

  function showBindPicker(targetCard, stateId) {
    var existing = targetCard.querySelector('.gsp-bind-picker');
    if (existing) { existing.remove(); return; }

    var allPickers = panelEl.querySelectorAll('.gsp-bind-picker');
    allPickers.forEach(function (p) { p.remove(); });

    var petGifs = getAvailableGifs(activeTab);
    var meta = STATE_META[stateId] || { icon: '✨', label: stateId };
    var selectedIds = [];
    var capturedTab = activeTab;

    var picker = document.createElement('div');
    picker.className = 'gsp-bind-picker';

    var title = document.createElement('div');
    title.className = 'gsp-picker-title';
    title.innerHTML = '<span>选择 GIF →「' + meta.icon + ' ' + meta.label + '」</span>';
    picker.appendChild(title);

    var grid = document.createElement('div');
    grid.className = 'gsp-picker-gifs';

    if (petGifs.length === 0) {
      var emptyTip = document.createElement('div');
      emptyTip.className = 'gsp-picker-empty';
      emptyTip.textContent = '暂无可用 GIF，请先在上方 GIF 库中上传';
      grid.appendChild(emptyTip);
    } else {
      petGifs.forEach(function (gif) {
        var item = document.createElement('div');
        item.className = 'gsp-picker-gif-item';
        item.setAttribute('data-gid', gif.id);
        var img = document.createElement('img');
        img.src = gif.dataUrl;
        item.appendChild(img);
        var check = document.createElement('div');
        check.className = 'gsp-picker-check';
        check.textContent = '✓';
        item.appendChild(check);
        item.addEventListener('click', function (e) {
          e.stopPropagation();
          var idx = selectedIds.indexOf(gif.id);
          if (idx >= 0) {
            selectedIds.splice(idx, 1);
            item.classList.remove('selected');
          } else {
            selectedIds.push(gif.id);
            item.classList.add('selected');
          }
          nextBtn.disabled = selectedIds.length === 0;
        });
        grid.appendChild(item);
      });
    }
    picker.appendChild(grid);

    var uploadRow = document.createElement('div');
    uploadRow.className = 'gsp-picker-upload';
    var uploadBtn = document.createElement('button');
    uploadBtn.className = 'gsp-btn gsp-btn-outline';
    uploadBtn.textContent = '📤 上传新 GIF';
    uploadBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      suppressCloseOnce();
      uploadGifFile(capturedTab, function (dataUrl, targetPet) {
        if (typeof GifManager !== 'undefined' && GifManager.addGifForPet) {
          GifManager.addGifForPet(dataUrl, targetPet);
        }
        setTimeout(function () {
          refreshPickerGrid(grid, selectedIds, nextBtn, capturedTab);
          showNotice('GIF 已上传哒！');
        }, 200);
      });
    });
    uploadRow.appendChild(uploadBtn);
    picker.appendChild(uploadRow);

    var actions = document.createElement('div');
    actions.className = 'gsp-picker-actions';

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'gsp-btn gsp-btn-ghost';
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      picker.remove();
    });

    var nextBtn = document.createElement('button');
    nextBtn.className = 'gsp-btn gsp-btn-primary';
    nextBtn.textContent = '下一步 →';
    nextBtn.disabled = true;
    nextBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      suppressCloseOnce();
      if (selectedIds.length === 0) return;
      showConfirmStep(picker, targetCard, stateId, selectedIds.slice());
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(nextBtn);
    picker.appendChild(actions);

    targetCard.appendChild(picker);
    targetCard.classList.add('expanded');
    picker.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function refreshPickerGrid(grid, selectedIds, nextBtn, petId) {
    var petGifs = getAvailableGifs(petId);
    grid.innerHTML = '';
    if (petGifs.length === 0) {
      var emptyTip = document.createElement('div');
      emptyTip.className = 'gsp-picker-empty';
      emptyTip.textContent = '暂无可用 GIF，请先上传';
      grid.appendChild(emptyTip);
      return;
    }
    petGifs.forEach(function (gif) {
      var item = document.createElement('div');
      item.className = 'gsp-picker-gif-item';
      if (selectedIds.indexOf(gif.id) >= 0) item.classList.add('selected');
      item.setAttribute('data-gid', gif.id);
      var img = document.createElement('img');
      img.src = gif.dataUrl;
      item.appendChild(img);
      var check = document.createElement('div');
      check.className = 'gsp-picker-check';
      check.textContent = '✓';
      item.appendChild(check);
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = selectedIds.indexOf(gif.id);
        if (idx >= 0) {
          selectedIds.splice(idx, 1);
          item.classList.remove('selected');
        } else {
          selectedIds.push(gif.id);
          item.classList.add('selected');
        }
        nextBtn.disabled = selectedIds.length === 0;
      });
      grid.appendChild(item);
    });
  }

  function showConfirmStep(pickerEl, targetCard, stateId, gifIds) {
    suppressCloseOnce();
    pickerEl.innerHTML = '';
    var meta = STATE_META[stateId] || { icon: '✨', label: stateId };
    var gifItems = getGifItems();

    var title = document.createElement('div');
    title.className = 'gsp-picker-title';
    title.innerHTML = '<span>确认绑定 ' + gifIds.length + ' 个 GIF →「' + meta.icon + ' ' + meta.label + '」</span>';
    pickerEl.appendChild(title);

    var previewList = document.createElement('div');
    previewList.className = 'gsp-confirm-list';

    var probs = [];
    if (gifIds.length === 1) {
      probs = [100];
    } else {
      var each = Math.floor(100 / gifIds.length);
      probs = gifIds.map(function (_, i) { return i === 0 ? 100 - each * (gifIds.length - 1) : each; });
    }

    gifIds.forEach(function (gid, idx) {
      var gif = gifItems.find(function (g) { return g.id === gid; });
      var row = document.createElement('div');
      row.className = 'gsp-confirm-row';
      var img = document.createElement('img');
      img.className = 'gsp-confirm-img';
      img.src = gif ? gif.dataUrl : '';
      row.appendChild(img);
      var arrow = document.createElement('span');
      arrow.className = 'gsp-confirm-arrow';
      arrow.textContent = '→';
      row.appendChild(arrow);
      var target = document.createElement('span');
      target.className = 'gsp-confirm-target';
      target.textContent = meta.icon + ' ' + meta.label;
      row.appendChild(target);

      if (gifIds.length > 1) {
        var probWrap = document.createElement('div');
        probWrap.className = 'gsp-confirm-prob';
        var slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '1';
        slider.max = '100';
        slider.value = String(probs[idx]);
        slider.className = 'gsp-prob-slider';
        var probVal = document.createElement('span');
        probVal.className = 'gsp-prob-value';
        probVal.textContent = probs[idx] + '%';
        slider.addEventListener('input', function () {
          probs[idx] = parseInt(this.value, 10);
          probVal.textContent = probs[idx] + '%';
        });
        probWrap.appendChild(slider);
        probWrap.appendChild(probVal);
        row.appendChild(probWrap);
      } else {
        var probLabel = document.createElement('span');
        probLabel.className = 'gsp-prob-value';
        probLabel.textContent = '100%';
        row.appendChild(probLabel);
      }
      previewList.appendChild(row);
    });
    pickerEl.appendChild(previewList);

    var warn = document.createElement('div');
    warn.className = 'gsp-confirm-warn';
    warn.textContent = gifIds.length > 1
      ? '⚠️ 绑定后，该状态将按概率轮换使用这些 GIF'
      : '⚠️ 绑定后，该状态将使用此 GIF 替代默认动画';
    pickerEl.appendChild(warn);

    var actions = document.createElement('div');
    actions.className = 'gsp-picker-actions';

    var backBtn = document.createElement('button');
    backBtn.className = 'gsp-btn gsp-btn-ghost';
    backBtn.textContent = '← 返回';
    backBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      suppressCloseOnce();
      pickerEl.remove();
      showBindPicker(targetCard, stateId);
    });

    var confirmBtn = document.createElement('button');
    confirmBtn.className = 'gsp-btn gsp-btn-primary';
    confirmBtn.textContent = '✓ 确认绑定';
    confirmBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      suppressCloseOnce();
      gifIds.forEach(function (gid, idx) {
        addBinding(activeTab, stateId, gid, probs[idx]);
      });
      if (gifIds.length > 1) normalizeProbs(activeTab, stateId);
      pickerEl.remove();
      renderPanel();
      showNotice('已绑定 ' + gifIds.length + ' 个 GIF 到「' + meta.label + '」哒！');
    });

    actions.appendChild(backBtn);
    actions.appendChild(confirmBtn);
    pickerEl.appendChild(actions);
  }

  function createPanel() {
    if (panelEl) return;

    panelEl = document.createElement('div');
    panelEl.id = 'gif-state-panel';
    panelEl.innerHTML =
      '<div class="gsp-header">' +
        '<span class="gsp-title">🎭 GIF 绑定管理</span>' +
        '<div class="gsp-close" id="gsp-close-btn">✕</div>' +
      '</div>' +
      '<div class="gsp-tabs">' +
        '<div class="gsp-tab active" data-tab="yier">🤍 一二</div>' +
        '<div class="gsp-tab" data-tab="bubu">🤎 布布</div>' +
      '</div>' +
      '<div class="gsp-body" id="gsp-body"></div>' +
      '<div class="gsp-footer">💡 点击状态展开详情 · 绑定后立即生效 · 解绑恢复默认</div>';

    document.body.appendChild(panelEl);

    bodyEl = document.getElementById('gsp-body');

    document.getElementById('gsp-close-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      closePanel();
    });

    panelEl.querySelectorAll('.gsp-tab').forEach(function (tab) {
      tab.addEventListener('click', function (e) {
        e.stopPropagation();
        suppressCloseOnce();
        panelEl.querySelectorAll('.gsp-tab').forEach(function (t) { t.classList.remove('active'); });
        this.classList.add('active');
        activeTab = this.getAttribute('data-tab');
        renderPanel();
      });
    });

    panelEl.addEventListener('click', function (e) {
      e.stopPropagation();
    });

    initDrag();
    renderPanel();
  }

  function openPanel() {
    createPanel();
    if (typeof currentMode !== 'undefined') {
      if (currentMode === 'yier' || currentMode === 'bubu') {
        activeTab = currentMode;
      }
    }
    panelEl.querySelectorAll('.gsp-tab').forEach(function (tab) {
      tab.classList.remove('active');
      if (tab.getAttribute('data-tab') === activeTab) tab.classList.add('active');
    });
    renderPanel();
    panelEl.classList.add('visible');
    if (window.electronAPI) {
      window.electronAPI.setIgnoreMouseEvents(false);
    }
  }

  function closePanel() {
    if (_suppressClose) return;
    if (panelEl) panelEl.classList.remove('visible');
    if (typeof updateMousePassthrough === 'function') updateMousePassthrough(false);
  }

  function isOpen() {
    return panelEl && panelEl.classList.contains('visible');
  }

  function init() {
    loadBindings();
  }

  window.GifStatePanel = {
    init: init,
    openPanel: openPanel,
    closePanel: closePanel,
    isOpen: isOpen,
    isSuppressingClose: isSuppressingClose,
    addBinding: addBinding,
    removeBinding: removeBinding,
    deleteGifAndBindings: deleteGifAndBindings,
    updateProb: updateProb,
    getBoundGif: getBoundGif,
    onGifDeleted: onGifDeleted,
    normalizeProbs: normalizeProbs
  };
})();
