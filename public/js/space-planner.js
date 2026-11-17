/**
 * Cantinho Certo — Simulador de Espaço
 */
(function(window, document) {
  'use strict';

  var TOOL_ID = 'space-planner:v1';
  var DATA_VERSION = 2;
  var ROOM_LIMIT_CM = 2000;
  var ROOM_MARGIN_CM = 42;
  var GRID_CM = 5;
  var NARROW_CLEARANCE_CM = 60;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var ROOM_TYPES = [
    { id: 'sala', label: 'Sala', inRoom: 'na sala', defaultWidth: 420, defaultDepth: 360, furniture: ['sofa', 'rack', 'table'] },
    { id: 'quarto', label: 'Quarto', inRoom: 'no quarto', defaultWidth: 300, defaultDepth: 300, furniture: ['bed', 'wardrobe', 'bedside', 'desk'] },
    { id: 'cozinha', label: 'Cozinha', inRoom: 'na cozinha', defaultWidth: 250, defaultDepth: 300, furniture: ['fridge', 'stove', 'counter', 'table'] }
  ];
  var FURNITURE = {
    sofa: { label: 'Sofá de 2 lugares', shortLabel: 'Sofá', width: 180, depth: 85 },
    bed: { label: 'Cama de casal', shortLabel: 'Cama', width: 140, depth: 190 },
    table: { label: 'Mesa para 4 pessoas', shortLabel: 'Mesa', width: 120, depth: 80 },
    wardrobe: { label: 'Guarda-roupa', shortLabel: 'Armário', width: 160, depth: 60 },
    rack: { label: 'Rack', shortLabel: 'Rack', width: 160, depth: 40 },
    bedside: { label: 'Mesa de cabeceira', shortLabel: 'Cabeceira', width: 45, depth: 40 },
    desk: { label: 'Escrivaninha', shortLabel: 'Escrivaninha', width: 120, depth: 60 },
    fridge: { label: 'Geladeira', shortLabel: 'Geladeira', width: 70, depth: 70 },
    stove: { label: 'Fogão', shortLabel: 'Fogão', width: 60, depth: 60 },
    counter: { label: 'Bancada', shortLabel: 'Bancada', width: 120, depth: 60 }
  };
  var state = {
    activeRoomId: 'sala',
    plans: {}
  };
  ROOM_TYPES.forEach(function(roomType) {
    state.plans[roomType.id] = { room: null, items: [], selectedId: null };
  });
  Object.defineProperties(state, {
    room: {
      get: function() { return state.plans[state.activeRoomId].room; },
      set: function(value) { state.plans[state.activeRoomId].room = value; }
    },
    items: {
      get: function() { return state.plans[state.activeRoomId].items; },
      set: function(value) { state.plans[state.activeRoomId].items = value; }
    },
    selectedId: {
      get: function() { return state.plans[state.activeRoomId].selectedId; },
      set: function(value) { state.plans[state.activeRoomId].selectedId = value; }
    }
  });
  var ui = {};
  var drag = null;
  var initialized = false;

  function getElement(selector) {
    return ui.panel.querySelector(selector);
  }

  function setAnnouncement(message, isError) {
    ui.announcement.textContent = message;
    if (isError) {
      ui.announcement.setAttribute('data-state', 'error');
    } else {
      ui.announcement.removeAttribute('data-state');
    }
  }

  function formatNumber(value, decimals) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'move-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  function getRoomType(roomId) {
    return ROOM_TYPES.find(function(roomType) { return roomType.id === roomId; }) || ROOM_TYPES[0];
  }

  function getDimensions(item) {
    var furniture = FURNITURE[item.type];
    if (item.rotation === 90) {
      return { width: furniture.depth, depth: furniture.width };
    }
    return { width: furniture.width, depth: furniture.depth };
  }

  function getBounds(item) {
    var dimensions = getDimensions(item);
    return {
      left: item.x - dimensions.width / 2,
      right: item.x + dimensions.width / 2,
      top: item.y - dimensions.depth / 2,
      bottom: item.y + dimensions.depth / 2,
      width: dimensions.width,
      depth: dimensions.depth
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function snap(value, interval) {
    return Math.round(value / interval) * interval;
  }

  function clampItem(item) {
    var bounds = getBounds(item);
    item.x = clamp(snap(item.x, GRID_CM), bounds.width / 2, state.room.width - bounds.width / 2);
    item.y = clamp(snap(item.y, GRID_CM), bounds.depth / 2, state.room.depth - bounds.depth / 2);
  }

  function itemsOverlap(first, second) {
    var a = getBounds(first);
    var b = getBounds(second);
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function findOpenPosition(type) {
    var rotations = [0, 90];
    for (var r = 0; r < rotations.length; r++) {
      var rotation = rotations[r];
      var dimensions = getDimensions({ type: type, rotation: rotation });
      if (dimensions.width > state.room.width || dimensions.depth > state.room.depth) continue;

      var minX = dimensions.width / 2;
      var maxX = state.room.width - minX;
      var minY = dimensions.depth / 2;
      var maxY = state.room.depth - minY;
      var xPositions = getGridPositions(minX, maxX, 25);
      var yPositions = getGridPositions(minY, maxY, 25);
      var candidates = [];

      for (var y = 0; y < yPositions.length; y++) {
        for (var x = 0; x < xPositions.length; x++) {
          candidates.push({ x: xPositions[x], y: yPositions[y], rotation: rotation });
        }
      }
      if (!candidates.length) {
        candidates.push({ x: state.room.width / 2, y: state.room.depth / 2, rotation: rotation });
      }

      candidates.sort(function(a, b) {
        var aDistance = Math.pow(a.x - state.room.width / 2, 2) + Math.pow(a.y - state.room.depth / 2, 2);
        var bDistance = Math.pow(b.x - state.room.width / 2, 2) + Math.pow(b.y - state.room.depth / 2, 2);
        return aDistance - bDistance;
      });

      for (var i = 0; i < candidates.length; i++) {
        var candidate = {
          type: type,
          x: candidates[i].x,
          y: candidates[i].y,
          rotation: rotation
        };
        if (!state.items.some(function(item) { return itemsOverlap(candidate, item); })) {
          return candidates[i];
        }
      }
    }
    return null;
  }

  function getGridPositions(min, max, step) {
    var positions = [];
    for (var value = min; value < max; value += step) {
      positions.push(value);
    }
    if (!positions.length || positions[positions.length - 1] !== max) {
      positions.push(max);
    }
    return positions;
  }

  function analyzeLayout() {
    var result = {
      overlapPairs: 0,
      narrowPairs: 0,
      overlapIds: [],
      narrowIds: []
    };

    for (var i = 0; i < state.items.length; i++) {
      for (var j = i + 1; j < state.items.length; j++) {
        var first = state.items[i];
        var second = state.items[j];
        var a = getBounds(first);
        var b = getBounds(second);
        var overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        var overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

        if (overlapX > 0 && overlapY > 0) {
          result.overlapPairs++;
          result.overlapIds.push(first.id, second.id);
          continue;
        }

        var gapX = Math.max(0, Math.max(a.left - b.right, b.left - a.right));
        var gapY = Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom));
        if ((overlapX > 0 && gapY < NARROW_CLEARANCE_CM) ||
            (overlapY > 0 && gapX < NARROW_CLEARANCE_CM)) {
          result.narrowPairs++;
          result.narrowIds.push(first.id, second.id);
        }
      }
    }
    return result;
  }

  function formatCount(count, singular, plural) {
    return count + ' ' + (count === 1 ? singular : plural);
  }

  function warningMessage(warnings) {
    var messages = [];
    if (warnings.overlapPairs) {
      messages.push(formatCount(warnings.overlapPairs, 'sobreposição', 'sobreposições'));
    }
    if (warnings.narrowPairs) {
      messages.push(formatCount(warnings.narrowPairs, 'passagem abaixo de 60 cm', 'passagens abaixo de 60 cm'));
    }
    if (!messages.length) return 'Sem sobreposições ou passagens abaixo de 60 cm entre os móveis.';
    return 'Confira ' + messages.join(' e ') + ' entre os móveis.';
  }

  function updateSummary(warnings) {
    var roomArea = state.room.width * state.room.depth / 10000;
    var furnitureArea = state.items.reduce(function(total, item) {
      var furniture = FURNITURE[item.type];
      return total + furniture.width * furniture.depth / 10000;
    }, 0);

    ui.roomArea.textContent = formatNumber(roomArea, 1) + ' m²';
    ui.furnitureArea.textContent = formatNumber(furnitureArea, 1) + ' m²';
    ui.narrowCount.textContent = String(warnings.narrowPairs);
    ui.summary.hidden = false;
    ui.occupancyNote.hidden = state.items.length === 0;
  }

  function updateSaveStatus(result) {
    if (result.ok) {
      ui.saveStatus.textContent = 'Salvo neste dispositivo';
      ui.saveStatus.removeAttribute('data-state');
    } else {
      ui.saveStatus.textContent = 'Não foi possível salvar';
      ui.saveStatus.setAttribute('data-state', 'error');
      setAnnouncement('A planta continua disponível nesta tela, mas não foi possível salvá-la neste navegador.', true);
    }
  }

  function savePlan() {
    if (!window.CantinhoToolStorage) {
      updateSaveStatus({ ok: false });
      return false;
    }
    var plans = {};
    ROOM_TYPES.forEach(function(roomType) {
      var plan = state.plans[roomType.id];
      plans[roomType.id] = {
        room: plan.room ? { width: plan.room.width, depth: plan.room.depth } : null,
        items: plan.items.map(function(item) {
          return {
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            rotation: item.rotation
          };
        })
      };
    });
    var result = window.CantinhoToolStorage.write(TOOL_ID, {
      version: DATA_VERSION,
      activeRoomId: state.activeRoomId,
      plans: plans
    });
    updateSaveStatus(result);
    return result.ok;
  }

  function getSvgElement(name, attributes) {
    var element = document.createElementNS(SVG_NS, name);
    Object.keys(attributes).forEach(function(key) {
      element.setAttribute(key, attributes[key]);
    });
    return element;
  }

  function getItemLabel(item, warnings) {
    var furniture = FURNITURE[item.type];
    var dimensions = getDimensions(item);
    var label = furniture.label + ', ' + dimensions.width + ' por ' + dimensions.depth + ' centímetros.';
    if (warnings.overlapIds.indexOf(item.id) !== -1) {
      label += ' Há sobreposição com outro móvel.';
    } else if (warnings.narrowIds.indexOf(item.id) !== -1) {
      label += ' Há uma passagem com menos de 60 centímetros nas proximidades.';
    }
    label += ' Use as setas para mover, R para girar e Delete para remover.';
    return label;
  }

  function getItemTransform(item) {
    return 'translate(' + (ROOM_MARGIN_CM + item.x) + ' ' + (ROOM_MARGIN_CM + item.y) + ') rotate(' + item.rotation + ')';
  }

  function renderRoomDimensions() {
    while (ui.dimensionLayer.firstChild) {
      ui.dimensionLayer.removeChild(ui.dimensionLayer.firstChild);
    }

    var horizontalY = ROOM_MARGIN_CM / 2;
    var verticalX = ROOM_MARGIN_CM / 2;
    var lineStyle = {
      'class': 'space-dimension-line',
      'stroke-linecap': 'round'
    };
    var horizontalLine = getSvgElement('line', Object.assign({}, lineStyle, {
      'x1': ROOM_MARGIN_CM,
      'y1': horizontalY,
      'x2': ROOM_MARGIN_CM + state.room.width,
      'y2': horizontalY
    }));
    var verticalLine = getSvgElement('line', Object.assign({}, lineStyle, {
      'x1': verticalX,
      'y1': ROOM_MARGIN_CM,
      'x2': verticalX,
      'y2': ROOM_MARGIN_CM + state.room.depth
    }));
    var widthLabel = getSvgElement('text', {
      'class': 'space-dimension-label',
      'x': ROOM_MARGIN_CM + state.room.width / 2,
      'y': horizontalY - 5,
      'text-anchor': 'middle'
    });
    widthLabel.textContent = formatNumber(state.room.width / 100, 1) + ' m';

    var depthLabel = getSvgElement('text', {
      'class': 'space-dimension-label',
      'x': verticalX - 5,
      'y': ROOM_MARGIN_CM + state.room.depth / 2,
      'text-anchor': 'middle',
      'transform': 'rotate(-90 ' + (verticalX - 5) + ' ' + (ROOM_MARGIN_CM + state.room.depth / 2) + ')'
    });
    depthLabel.textContent = formatNumber(state.room.depth / 100, 1) + ' m';

    ui.dimensionLayer.appendChild(horizontalLine);
    ui.dimensionLayer.appendChild(verticalLine);
    ui.dimensionLayer.appendChild(widthLabel);
    ui.dimensionLayer.appendChild(depthLabel);
  }

  function refreshSelection() {
    var groups = ui.itemsLayer.querySelectorAll('.space-item');
    for (var i = 0; i < groups.length; i++) {
      var selected = groups[i].getAttribute('data-item-id') === state.selectedId;
      groups[i].classList.toggle('is-selected', selected);
      groups[i].setAttribute('aria-pressed', selected ? 'true' : 'false');
    }

    var item = state.items.find(function(candidate) { return candidate.id === state.selectedId; });
    ui.selectedControls.hidden = !item;
    if (item) {
      ui.selectedLabel.textContent = FURNITURE[item.type].label;
    }
  }

  function renderItems() {
    var warnings = analyzeLayout();
    while (ui.itemsLayer.firstChild) {
      ui.itemsLayer.removeChild(ui.itemsLayer.firstChild);
    }

    state.items.forEach(function(item) {
      var dimensions = FURNITURE[item.type];
      var group = getSvgElement('g', {
        'class': 'space-item',
        'data-item-id': item.id,
        'transform': getItemTransform(item),
        'tabindex': '0',
        'role': 'button',
        'aria-pressed': 'false',
        'aria-label': getItemLabel(item, warnings)
      });
      if (warnings.overlapIds.indexOf(item.id) !== -1) {
        group.classList.add('has-overlap');
      } else if (warnings.narrowIds.indexOf(item.id) !== -1) {
        group.classList.add('has-narrow-clearance');
      }

      var body = getSvgElement('rect', {
        'class': 'space-item-body',
        'x': -dimensions.width / 2,
        'y': -dimensions.depth / 2,
        'width': dimensions.width,
        'height': dimensions.depth,
        'rx': '8'
      });
      var label = getSvgElement('text', {
        'class': 'space-item-label',
        'x': '0',
        'y': '0'
      });
      label.textContent = dimensions.shortLabel;
      group.appendChild(body);
      group.appendChild(label);
      ui.itemsLayer.appendChild(group);
    });

    refreshSelection();
    updateSummary(warnings);
  }

  function renderPlan() {
    if (!state.room) {
      ui.emptyState.hidden = false;
      ui.canvas.setAttribute('hidden', '');
      ui.furnitureControls.hidden = true;
      ui.selectedControls.hidden = true;
      ui.summary.hidden = true;
      ui.occupancyNote.hidden = true;
      ui.canvasHelp.hidden = true;
      ui.resetButton.hidden = true;
      ui.submitButton.textContent = 'Desenhar cômodo';
      while (ui.dimensionLayer.firstChild) {
        ui.dimensionLayer.removeChild(ui.dimensionLayer.firstChild);
      }
      while (ui.itemsLayer.firstChild) {
        ui.itemsLayer.removeChild(ui.itemsLayer.firstChild);
      }
      return;
    }

    ui.submitButton.textContent = 'Atualizar cômodo';
    ui.resetButton.hidden = false;
    var viewWidth = state.room.width + ROOM_MARGIN_CM * 2;
    var viewDepth = state.room.depth + ROOM_MARGIN_CM * 2;
    ui.canvas.setAttribute('viewBox', '0 0 ' + viewWidth + ' ' + viewDepth);
    ui.roomSurface.setAttribute('x', ROOM_MARGIN_CM);
    ui.roomSurface.setAttribute('y', ROOM_MARGIN_CM);
    ui.roomSurface.setAttribute('width', state.room.width);
    ui.roomSurface.setAttribute('height', state.room.depth);
    renderRoomDimensions();
    ui.title.textContent = 'Planta do cômodo com ' + formatNumber(state.room.width / 100, 1) +
      ' por ' + formatNumber(state.room.depth / 100, 1) + ' metros';
    ui.description.textContent = 'Planta em escala. Selecione um móvel, use as setas para reposicionar e pressione R para girar.';
    ui.emptyState.hidden = true;
    ui.canvas.removeAttribute('hidden');
    ui.furnitureControls.hidden = false;
    ui.canvasHelp.hidden = false;
    renderItems();
  }

  function isValidPlan(data) {
    if (!data || data.version !== 1 || !data.room || !Array.isArray(data.items) || data.items.length > 40) return false;
    if (!Number.isFinite(data.room.width) || !Number.isFinite(data.room.depth)) return false;
    if (data.room.width < 100 || data.room.width > ROOM_LIMIT_CM ||
        data.room.depth < 100 || data.room.depth > ROOM_LIMIT_CM) return false;

    var itemIds = {};
    return data.items.every(function(item) {
      if (!item || typeof item.id !== 'string' || !item.id || item.id.length > 80 ||
          Object.prototype.hasOwnProperty.call(itemIds, item.id) ||
          !Object.prototype.hasOwnProperty.call(FURNITURE, item.type) ||
          !Number.isFinite(item.x) || !Number.isFinite(item.y) ||
          (item.rotation !== 0 && item.rotation !== 90)) return false;
      itemIds[item.id] = true;
      var dimensions = getDimensions(item);
      return dimensions.width <= data.room.width && dimensions.depth <= data.room.depth;
    });
  }

  function copyPlan(plan) {
    return {
      room: { width: plan.room.width, depth: plan.room.depth },
      items: plan.items.map(function(item) {
        return {
          id: item.id,
          type: item.type,
          x: item.x,
          y: item.y,
          rotation: item.rotation
        };
      }),
      selectedId: null
    };
  }

  function loadSavedPlan() {
    var result = window.CantinhoToolStorage.read(TOOL_ID);
    if (!result.ok) {
      setAnnouncement('Não foi possível ler as plantas salvas. Você pode iniciar novos planos.', true);
      return;
    }
    if (!result.value) return;

    var data = result.value;
    if (data.version === 1) {
      if (!isValidPlan(data)) {
        setAnnouncement('O plano antigo não pôde ser reconhecido. Você pode iniciar um novo.', true);
        return;
      }
      state.plans.sala = copyPlan(data);
      if (savePlan()) {
        setAnnouncement('Seu plano anterior foi mantido na aba Sala. As outras abas começam com plantas próprias.');
      }
      return;
    }
    if (data.version !== DATA_VERSION || !data.plans || typeof data.plans !== 'object') {
      setAnnouncement('As plantas salvas não puderam ser reconhecidas. Você pode iniciar novos planos.', true);
      return;
    }

    var invalidPlanFound = false;
    ROOM_TYPES.forEach(function(roomType) {
      var savedPlan = data.plans[roomType.id];
      if (!savedPlan) return;
      if (savedPlan.room === null && Array.isArray(savedPlan.items) && savedPlan.items.length === 0) return;
      if (!savedPlan.room || !isValidPlan({
        version: 1,
        room: savedPlan.room,
        items: savedPlan.items
      })) {
        invalidPlanFound = true;
        return;
      }
      state.plans[roomType.id] = copyPlan(savedPlan);
    });
    var savedRoomId = ROOM_TYPES.some(function(roomType) {
      return roomType.id === data.activeRoomId;
    }) ? data.activeRoomId : ROOM_TYPES[0].id;
    state.activeRoomId = savedRoomId;
    if (invalidPlanFound) {
      setAnnouncement('Uma planta salva estava inválida e foi ignorada. Os outros ambientes foram mantidos.', true);
    }
  }

  function updateFurnitureOptions() {
    while (ui.furnitureType.firstChild) {
      ui.furnitureType.removeChild(ui.furnitureType.firstChild);
    }
    getRoomType(state.activeRoomId).furniture.forEach(function(type) {
      var option = document.createElement('option');
      option.value = type;
      option.textContent = FURNITURE[type].label;
      ui.furnitureType.appendChild(option);
    });
  }

  function updateRoomView(animate) {
    var roomType = getRoomType(state.activeRoomId);
    var tabButtons = ui.roomTabs.querySelectorAll('[data-space-room]');
    for (var i = 0; i < tabButtons.length; i++) {
      var selected = tabButtons[i].getAttribute('data-space-room') === state.activeRoomId;
      tabButtons[i].setAttribute('aria-selected', selected ? 'true' : 'false');
      tabButtons[i].setAttribute('tabindex', selected ? '0' : '-1');
    }
    ui.roomWorkspace.setAttribute('aria-labelledby', 'space-tab-' + state.activeRoomId);
    ui.currentRoomTitle.textContent = roomType.label;
    ui.planHeading.textContent = 'Seu ambiente — ' + roomType.label;
    ui.roomHelp.textContent = 'Medida de referência: ' +
      formatNumber(roomType.defaultWidth / 100, 1) + ' × ' +
      formatNumber(roomType.defaultDepth / 100, 1) + ' m. Ajuste ao seu espaço.';
    ui.emptyTitle.textContent = 'Um espaço para começar';
    ui.emptyDescription.textContent = 'Ao desenhar a planta ' + roomType.inRoom + ', você poderá organizar os móveis por aqui.';
    ui.bedGuide.hidden = state.activeRoomId !== 'quarto';
    ui.widthInput.value = state.room
      ? (state.room.width / 100).toFixed(1)
      : (roomType.defaultWidth / 100).toFixed(1);
    ui.depthInput.value = state.room
      ? (state.room.depth / 100).toFixed(1)
      : (roomType.defaultDepth / 100).toFixed(1);
    ui.resetButton.setAttribute('aria-label', 'Apagar planta ' + roomType.inRoom);
    ui.saveStatus.textContent = state.room ? 'Salvo neste dispositivo' : 'Salvamento local';
    updateFurnitureOptions();
    renderPlan();
    if (animate) {
      ui.planCard.classList.remove('is-room-switching');
      void ui.planCard.offsetWidth;
      ui.planCard.classList.add('is-room-switching');
    }
  }

  function activateRoom(roomId) {
    if (!state.plans[roomId] || state.activeRoomId === roomId) return;
    state.activeRoomId = roomId;
    updateRoomView(true);
    savePlan();
  }

  function fitsInRoom(type, width, depth) {
    var furniture = FURNITURE[type];
    return (furniture.width <= width && furniture.depth <= depth) ||
      (furniture.depth <= width && furniture.width <= depth);
  }

  function handleRoomSubmit(event) {
    event.preventDefault();
    var width = Math.round(Number(ui.widthInput.value) * 100);
    var depth = Math.round(Number(ui.depthInput.value) * 100);

    if (!Number.isFinite(width) || !Number.isFinite(depth) ||
        width < 100 || depth < 100 || width > ROOM_LIMIT_CM || depth > ROOM_LIMIT_CM) {
      setAnnouncement('Informe medidas entre 1 e 20 metros.', true);
      return;
    }

    var tooLargeItem = state.items.find(function(item) {
      var dimensions = getDimensions(item);
      return dimensions.width > width || dimensions.depth > depth;
    });
    if (tooLargeItem) {
      setAnnouncement('Remova ou gire os móveis que não cabem antes de reduzir as medidas do cômodo.', true);
      return;
    }

    state.room = { width: width, depth: depth };
    state.items.forEach(clampItem);
    renderPlan();
    if (savePlan()) setAnnouncement('Medidas atualizadas. ' + warningMessage(analyzeLayout()));
  }

  function addFurniture() {
    if (!state.room) {
      setAnnouncement('Desenhe o cômodo antes de adicionar móveis.', true);
      return;
    }
    if (state.items.length >= 40) {
      setAnnouncement('A planta já chegou ao limite de 40 móveis. Remova um item para continuar.', true);
      return;
    }
    var type = ui.furnitureType.value;
    if (!Object.prototype.hasOwnProperty.call(FURNITURE, type) || !fitsInRoom(type, state.room.width, state.room.depth)) {
      setAnnouncement('Esse móvel não cabe nas medidas atuais do cômodo.', true);
      return;
    }

    var position = findOpenPosition(type);
    if (!position) {
      setAnnouncement('Não encontrei uma posição livre. Mova ou remova um móvel antes de adicionar outro.', true);
      return;
    }

    var item = {
      id: createId(),
      type: type,
      x: position.x,
      y: position.y,
      rotation: position.rotation
    };
    state.items.push(item);
    state.selectedId = item.id;
    renderItems();
    var saved = savePlan();
    focusSelectedItem();
    if (saved) setAnnouncement(FURNITURE[type].label + ' adicionado. ' + warningMessage(analyzeLayout()));
  }

  function getSelectedItem() {
    return state.items.find(function(item) { return item.id === state.selectedId; }) || null;
  }

  function updateItemTransform(item) {
    var groups = ui.itemsLayer.querySelectorAll('.space-item');
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].getAttribute('data-item-id') === item.id) {
        groups[i].setAttribute('transform', getItemTransform(item));
        break;
      }
    }
  }

  function focusSelectedItem() {
    var selected = getSelectedItem();
    if (!selected) return;
    var groups = ui.itemsLayer.querySelectorAll('.space-item');
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].getAttribute('data-item-id') === selected.id) {
        groups[i].focus();
        return;
      }
    }
  }

  function moveItem(item, dx, dy, announce) {
    item.x += dx;
    item.y += dy;
    clampItem(item);
    updateItemTransform(item);
    renderItems();
    var saved = savePlan();
    if (announce) {
      focusSelectedItem();
      if (saved) setAnnouncement('Móvel reposicionado. ' + warningMessage(analyzeLayout()));
    }
  }

  function rotateSelected() {
    var item = getSelectedItem();
    if (!item) return;
    var nextRotation = item.rotation === 0 ? 90 : 0;
    var nextDimensions = getDimensions({ type: item.type, rotation: nextRotation });
    if (nextDimensions.width > state.room.width || nextDimensions.depth > state.room.depth) {
      setAnnouncement('Esse móvel não cabe girado nas medidas atuais do cômodo.', true);
      return;
    }
    item.rotation = nextRotation;
    clampItem(item);
    renderItems();
    var saved = savePlan();
    focusSelectedItem();
    if (saved) setAnnouncement(FURNITURE[item.type].label + ' girado. ' + warningMessage(analyzeLayout()));
  }

  function removeSelected() {
    var item = getSelectedItem();
    if (!item) return;
    state.items = state.items.filter(function(candidate) { return candidate.id !== item.id; });
    state.selectedId = null;
    renderItems();
    var saved = savePlan();
    ui.furnitureType.focus();
    if (saved) setAnnouncement(FURNITURE[item.type].label + ' removido da planta. ' + warningMessage(analyzeLayout()));
  }

  function resetPlan() {
    var roomType = getRoomType(state.activeRoomId);
    if (!window.confirm('Apagar somente a planta ' + roomType.inRoom + '? Os outros ambientes serão mantidos.')) return;
    state.room = null;
    state.items = [];
    state.selectedId = null;
    updateRoomView(false);
    if (savePlan()) {
      setAnnouncement('Planta ' + roomType.inRoom + ' apagada. Os outros ambientes foram mantidos.');
    }
    ui.widthInput.focus();
  }

  function getRoomPoint(event) {
    var point = ui.canvas.createSVGPoint();
    var matrix = ui.canvas.getScreenCTM();
    if (!matrix) return null;
    point.x = event.clientX;
    point.y = event.clientY;
    var transformed = point.matrixTransform(matrix.inverse());
    return {
      x: transformed.x - ROOM_MARGIN_CM,
      y: transformed.y - ROOM_MARGIN_CM
    };
  }

  function handlePointerDown(event) {
    var target = event.target.closest ? event.target.closest('.space-item') : null;
    if (!target || !ui.itemsLayer.contains(target)) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    var itemId = target.getAttribute('data-item-id');
    var item = state.items.find(function(candidate) { return candidate.id === itemId; });
    var point = getRoomPoint(event);
    if (!item || !point) return;

    state.selectedId = itemId;
    refreshSelection();
    drag = {
      pointerId: event.pointerId,
      itemId: itemId,
      offsetX: item.x - point.x,
      offsetY: item.y - point.y
    };
    if (ui.canvas.setPointerCapture) ui.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    var point = getRoomPoint(event);
    var item = state.items.find(function(candidate) { return candidate.id === drag.itemId; });
    if (!point || !item) return;

    item.x = point.x + drag.offsetX;
    item.y = point.y + drag.offsetY;
    clampItem(item);
    updateItemTransform(item);
  }

  function finishDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    renderItems();
    if (savePlan()) setAnnouncement('Móvel reposicionado. ' + warningMessage(analyzeLayout()));
  }

  function handleItemKeydown(event) {
    var group = event.target.closest ? event.target.closest('.space-item') : null;
    if (!group || !ui.itemsLayer.contains(group)) return;
    var itemId = group.getAttribute('data-item-id');
    var item = state.items.find(function(candidate) { return candidate.id === itemId; });
    if (!item) return;
    state.selectedId = itemId;
    refreshSelection();

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      var distance = event.shiftKey ? 50 : 10;
      var dx = event.key === 'ArrowLeft' ? -distance : (event.key === 'ArrowRight' ? distance : 0);
      var dy = event.key === 'ArrowUp' ? -distance : (event.key === 'ArrowDown' ? distance : 0);
      moveItem(item, dx, dy, true);
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      rotateSelected();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      removeSelected();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setAnnouncement(FURNITURE[item.type].label + ' selecionado. Use as setas para mover e R para girar.');
    }
  }

  function initializeUI(panel) {
    ui.panel = panel;
    ui.roomTabs = getElement('[data-space-room-tabs]');
    ui.roomWorkspace = getElement('#space-room-workspace');
    ui.currentRoomTitle = getElement('[data-current-room-title]');
    ui.planHeading = getElement('[data-plan-heading]');
    ui.roomHelp = getElement('[data-room-help]');
    ui.emptyTitle = getElement('[data-space-empty] h4');
    ui.emptyDescription = getElement('[data-space-empty] p');
    ui.bedGuide = getElement('[data-space-bedroom-guide]');
    ui.planCard = getElement('.space-plan-card');
    ui.form = getElement('#space-room-form');
    ui.widthInput = getElement('#space-room-width');
    ui.depthInput = getElement('#space-room-depth');
    ui.submitButton = getElement('[data-room-submit]');
    ui.furnitureControls = getElement('[data-furniture-controls]');
    ui.furnitureType = getElement('#space-furniture-type');
    ui.addButton = getElement('[data-add-furniture]');
    ui.selectedControls = getElement('[data-selected-controls]');
    ui.selectedLabel = getElement('[data-selected-label]');
    ui.canvas = getElement('#space-plan-canvas');
    ui.title = getElement('#space-plan-title');
    ui.description = getElement('#space-plan-description');
    ui.roomSurface = getElement('[data-room-surface]');
    ui.dimensionLayer = getElement('[data-room-dimensions]');
    ui.itemsLayer = getElement('[data-space-items]');
    ui.emptyState = getElement('[data-space-empty]');
    ui.summary = getElement('[data-space-summary]');
    ui.occupancyNote = getElement('[data-occupancy-note]');
    ui.canvasHelp = getElement('[data-space-canvas-help]');
    ui.roomArea = getElement('[data-room-area]');
    ui.furnitureArea = getElement('[data-furniture-area]');
    ui.narrowCount = getElement('[data-narrow-count]');
    ui.saveStatus = getElement('#space-save-status');
    ui.resetButton = getElement('[data-reset-plan]');
    ui.announcement = getElement('#space-announcement');
  }

  function attachEvents() {
    ui.roomTabs.addEventListener('click', function(event) {
      var tab = event.target.closest('[data-space-room]');
      if (tab && ui.roomTabs.contains(tab)) activateRoom(tab.getAttribute('data-space-room'));
    });
    ui.roomTabs.addEventListener('keydown', function(event) {
      var tabs = Array.prototype.slice.call(ui.roomTabs.querySelectorAll('[data-space-room]'));
      var currentIndex = tabs.indexOf(event.target);
      if (currentIndex === -1) return;
      var nextIndex = currentIndex;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (currentIndex + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      else return;
      event.preventDefault();
      tabs[nextIndex].focus();
      activateRoom(tabs[nextIndex].getAttribute('data-space-room'));
    });
    ui.form.addEventListener('submit', handleRoomSubmit);
    ui.addButton.addEventListener('click', addFurniture);
    getElement('[data-rotate-furniture]').addEventListener('click', rotateSelected);
    getElement('[data-remove-furniture]').addEventListener('click', removeSelected);
    getElement('[data-reset-plan]').addEventListener('click', resetPlan);
    getElement('.space-direction-pad').addEventListener('click', function(event) {
      var button = event.target.closest('[data-move]');
      var item = getSelectedItem();
      if (!button || !item) return;
      var amount = 10;
      var direction = button.getAttribute('data-move');
      moveItem(
        item,
        direction === 'left' ? -amount : (direction === 'right' ? amount : 0),
        direction === 'up' ? -amount : (direction === 'down' ? amount : 0),
        true
      );
    });

    ui.itemsLayer.addEventListener('pointerdown', handlePointerDown);
    ui.canvas.addEventListener('pointermove', handlePointerMove);
    ui.canvas.addEventListener('pointerup', finishDrag);
    ui.canvas.addEventListener('pointercancel', finishDrag);
    ui.itemsLayer.addEventListener('keydown', handleItemKeydown);
    ui.itemsLayer.addEventListener('focusin', function(event) {
      var group = event.target.closest ? event.target.closest('.space-item') : null;
      if (!group || !ui.itemsLayer.contains(group)) return;
      state.selectedId = group.getAttribute('data-item-id');
      refreshSelection();
    });
  }

  function init() {
    if (initialized) return;
    var panel = document.querySelector('[data-tool-panel="space-planner"]');
    if (!panel) return;
    initialized = true;
    initializeUI(panel);
    attachEvents();
    loadSavedPlan();
    updateRoomView(false);
  }

  if (window.CantinhoTools && typeof window.CantinhoTools.register === 'function') {
    window.CantinhoTools.register({
      id: 'space-planner',
      init: init
    });
  }
})(window, document);
