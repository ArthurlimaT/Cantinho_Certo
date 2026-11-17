/**
 * Cantinho Certo — Caderno de Medidas
 *
 * Registra dimensões de cômodos, portas e janelas com persistência local.
 */
(function (window, document) {
  'use strict';

  var TOOL_ID = 'measure-book:v1';
  var MAX_ROOM_DIMENSION = 30;
  var MAX_CEILING_HEIGHT = 10;
  var MAX_OPENINGS = 20;

  var state = { rooms: [] };
  var ui = {};
  var initialized = false;
  var nextId = 1;

  /* ---------- Persistência ---------- */

  function save() {
    if (!window.CantinhoToolStorage) {
      announce('O armazenamento local não está disponível. As medidas não foram salvas.', true);
      return false;
    }
    var data = {
      rooms: state.rooms.map(function (room) {
        return {
          name: room.name,
          width: room.width,
          length: room.length,
          height: room.height,
          openings: room.openings.map(function (o) {
            return { type: o.type, label: o.label, width: o.width, height: o.height };
          }),
          notes: room.notes
        };
      })
    };
    var result = window.CantinhoToolStorage.write(TOOL_ID, data);
    if (!result || !result.ok) {
      announce('Não foi possível salvar as medidas.', true);
      return false;
    }
    return true;
  }

  function load() {
    if (!window.CantinhoToolStorage) {
      announce('O armazenamento local não está disponível. As medidas não foram carregadas.', true);
      return;
    }
    var result = window.CantinhoToolStorage.read(TOOL_ID);
    if (!result || !result.ok) {
      announce('Não foi possível ler as medidas salvas.', true);
      return;
    }
    if (!result.value) return;
    var data = result.value;
    if (!data || !Array.isArray(data.rooms)) {
      announce('Os dados salvos das medidas não puderam ser reconhecidos.', true);
      return;
    }

    var ignoredData = false;
    state.rooms = data.rooms.reduce(function (rooms, raw) {
      var width = raw && typeof raw.width === 'number' ? raw.width : NaN;
      var length = raw && typeof raw.length === 'number' ? raw.length : NaN;
      var height = raw && typeof raw.height === 'number' ? raw.height : 0;
      var name = raw && typeof raw.name === 'string' ? raw.name.trim() : '';
      if (!name || !Number.isFinite(width) || width <= 0 || width > MAX_ROOM_DIMENSION ||
          !Number.isFinite(length) || length <= 0 || length > MAX_ROOM_DIMENSION ||
          !Number.isFinite(height) || height < 0 || height > MAX_CEILING_HEIGHT ||
          (raw.openings !== undefined && !Array.isArray(raw.openings))) {
        ignoredData = true;
        return rooms;
      }

      var openings = (raw.openings || []).slice(0, MAX_OPENINGS).reduce(function (validOpenings, opening) {
        var openingWidth = opening && typeof opening.width === 'number' ? opening.width : NaN;
        var openingHeight = opening && typeof opening.height === 'number' ? opening.height : NaN;
        if (!opening || (opening.type !== 'porta' && opening.type !== 'janela') ||
            !Number.isFinite(openingWidth) || openingWidth <= 0 || openingWidth > MAX_ROOM_DIMENSION ||
            !Number.isFinite(openingHeight) || openingHeight <= 0 || openingHeight > MAX_ROOM_DIMENSION) {
          ignoredData = true;
          return validOpenings;
        }
        validOpenings.push({
          id: nextId++,
          type: opening.type,
          label: String(opening.label || '').slice(0, 60),
          width: openingWidth,
          height: openingHeight
        });
        return validOpenings;
      }, []);
      if ((raw.openings || []).length > MAX_OPENINGS) ignoredData = true;

      rooms.push({
        id: nextId++,
        name: name.slice(0, 60),
        width: width,
        length: length,
        height: height,
        openings: openings,
        notes: String(raw.notes || '').slice(0, 500)
      });
      return rooms;
    }, []);
    if (ignoredData) {
      announce('Alguns cômodos salvos foram ignorados porque os dados estavam inválidos.', true);
    }
  }

  /* ---------- Utilitários ---------- */

  function formatM(value) {
    if (!value || value === 0) return '—';
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value) + ' m';
  }

  function formatArea(w, l) {
    if (!w || !l) return '—';
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(w * l) + ' m²';
  }

  function announce(message, isError) {
    if (!ui.announcement) return;
    ui.announcement.textContent = message;
    if (isError) {
      ui.announcement.setAttribute('data-state', 'error');
    } else {
      ui.announcement.removeAttribute('data-state');
    }
  }

  /* ---------- Renderização ---------- */

  function renderList() {
    var container = ui.roomsList;
    if (!container) return;
    container.innerHTML = '';

    if (state.rooms.length === 0) {
      var emptyEl = document.createElement('div');
      emptyEl.className = 'measure-empty';
      var emptyMessage = document.createElement('p');
      emptyMessage.textContent = 'Nenhum cômodo registrado ainda.';
      emptyEl.appendChild(emptyMessage);
      container.appendChild(emptyEl);
      updateCount();
      return;
    }

    state.rooms.forEach(function (room) {
      var card = document.createElement('article');
      card.className = 'card measure-room-card';
      card.setAttribute('data-measure-room-id', room.id);

      var header = document.createElement('div');
      header.className = 'measure-room-header';
      var heading = document.createElement('h3');
      heading.textContent = room.name;
      var removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'cost-remove-btn';
      removeButton.setAttribute('data-measure-remove', room.id);
      removeButton.setAttribute('aria-label', 'Remover ' + room.name);
      removeButton.textContent = '×';
      header.appendChild(heading);
      header.appendChild(removeButton);
      card.appendChild(header);

      var dimensions = document.createElement('div');
      dimensions.className = 'measure-dims';
      [
        ['Largura', formatM(room.width)],
        ['Comprimento', formatM(room.length)],
        ['Pé-direito', formatM(room.height)],
        ['Área', formatArea(room.width, room.length)]
      ].forEach(function (dimension) {
        var cell = document.createElement('div');
        cell.className = 'measure-dim';
        var label = document.createElement('span');
        label.textContent = dimension[0];
        var value = document.createElement('strong');
        value.textContent = dimension[1];
        cell.appendChild(label);
        cell.appendChild(value);
        dimensions.appendChild(cell);
      });
      card.appendChild(dimensions);

      if (room.openings.length > 0) {
        var openingsSection = document.createElement('div');
        openingsSection.className = 'measure-openings';
        var openingsHeading = document.createElement('h4');
        openingsHeading.textContent = 'Aberturas';
        var openingsList = document.createElement('ul');
        openingsSection.appendChild(openingsHeading);
        room.openings.forEach(function (o) {
          var row = document.createElement('li');
          var typeLabel = document.createElement('span');
          typeLabel.className = 'measure-opening-type';
          typeLabel.textContent = (o.type === 'janela' ? 'Janela' : 'Porta') + (o.label ? ' — ' + o.label : '');
          var dimensionsLabel = document.createElement('span');
          dimensionsLabel.textContent = formatM(o.width) + ' × ' + formatM(o.height);
          row.appendChild(typeLabel);
          row.appendChild(dimensionsLabel);
          openingsList.appendChild(row);
        });
        openingsSection.appendChild(openingsList);
        card.appendChild(openingsSection);
      }

      if (room.notes) {
        var notesSection = document.createElement('div');
        notesSection.className = 'measure-notes';
        var notesHeading = document.createElement('h4');
        notesHeading.textContent = 'Observações';
        var notes = document.createElement('p');
        notes.textContent = room.notes;
        notesSection.appendChild(notesHeading);
        notesSection.appendChild(notes);
        card.appendChild(notesSection);
      }
      container.appendChild(card);
    });

    updateCount();
  }

  function updateCount() {
    if (ui.roomCount) {
      var count = state.rooms.length;
      ui.roomCount.textContent = count + (count === 1 ? ' cômodo' : ' cômodos');
    }
  }

  /* ---------- Ações ---------- */

  function addRoom(name, width, length, height, openings, notes) {
    if (!name || name.trim().length === 0) {
      announce('Informe o nome do cômodo.', true);
      return false;
    }

    width = Number(width);
    length = Number(length);
    height = height === '' || height === null || !Number.isFinite(Number(height)) ? 0 : Number(height);
    if (!Number.isFinite(width) || width <= 0 || width > MAX_ROOM_DIMENSION ||
        !Number.isFinite(length) || length <= 0 || length > MAX_ROOM_DIMENSION ||
        height < 0 || height > MAX_CEILING_HEIGHT) {
      announce('Informe largura e comprimento entre 0,01 e 30 m. O pé-direito, se preenchido, deve ser de até 10 m.', true);
      return false;
    }

    var room = {
      id: nextId++,
      name: name.trim().slice(0, 60),
      width: width,
      length: length,
      height: height,
      openings: openings || [],
      notes: (notes || '').trim().slice(0, 500)
    };

    state.rooms.push(room);
    renderList();
    if (save()) announce(room.name + ' adicionado.', false);
    return true;
  }

  function removeRoom(roomId) {
    var index = -1;
    for (var i = 0; i < state.rooms.length; i++) {
      if (state.rooms[i].id === roomId) { index = i; break; }
    }
    if (index === -1) return;

    var removed = state.rooms.splice(index, 1)[0];
    renderList();
    if (save()) announce(removed.name + ' removido.', false);
    var removeButtons = ui.roomsList.querySelectorAll('[data-measure-remove]');
    var nextButton = removeButtons[Math.min(index, removeButtons.length - 1)];
    if (nextButton) nextButton.focus();
    else ui.panel.querySelector('[data-measure-name]').focus();
  }

  /* ---------- Inicialização ---------- */

  function collectOpenings(form) {
    var openings = [];
    var rows = form.querySelectorAll('[data-opening-row]');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var type = row.querySelector('[data-opening-type]');
      var label = row.querySelector('[data-opening-label]');
      var w = row.querySelector('[data-opening-width]');
      var h = row.querySelector('[data-opening-height]');
      if (type && w && h) {
        var wVal = w.value.trim() ? Number(w.value) : 0;
        var hVal = h.value.trim() ? Number(h.value) : 0;
        if (w.value.trim() || h.value.trim()) {
          if (!Number.isFinite(wVal) || !Number.isFinite(hVal) ||
              wVal <= 0 || hVal <= 0 ||
              wVal > MAX_ROOM_DIMENSION || hVal > MAX_ROOM_DIMENSION) {
            announce('Preencha largura e altura da abertura com valores entre 0,01 e 30 m.', true);
            (w.value.trim() ? h : w).focus();
            return null;
          }
          openings.push({
            type: type.value,
            label: label ? label.value.trim().slice(0, 60) : '',
            width: wVal || 0,
            height: hVal || 0
          });
        }
      }
    }
    if (openings.length > MAX_OPENINGS) {
      announce('Registre até 20 portas e janelas por cômodo.', true);
      return null;
    }
    return openings;
  }

  function addOpeningRow(container) {
    var row = document.createElement('div');
    row.className = 'measure-opening-row';
    row.setAttribute('data-opening-row', '');
    row.innerHTML =
      '<select data-opening-type aria-label="Tipo de abertura">' +
        '<option value="porta">Porta</option>' +
        '<option value="janela">Janela</option>' +
      '</select>' +
      '<input type="text" data-opening-label placeholder="Rótulo (opcional)" aria-label="Rótulo da abertura" maxlength="60">' +
      '<div class="measure-opening-dims">' +
        '<input type="number" data-opening-width placeholder="Larg." step="0.01" min="0.01" max="30" aria-label="Largura em metros" inputmode="decimal">' +
        '<span aria-hidden="true">×</span>' +
        '<input type="number" data-opening-height placeholder="Alt." step="0.01" min="0.01" max="30" aria-label="Altura em metros" inputmode="decimal">' +
        '<span aria-hidden="true">m</span>' +
      '</div>' +
      '<button type="button" class="cost-remove-btn" data-remove-opening aria-label="Remover abertura">×</button>';
    container.appendChild(row);
    row.querySelector('[data-opening-type]').focus();
  }

  function init() {
    if (initialized) return;
    initialized = true;

    ui.panel = document.getElementById('measure-book-panel');
    if (!ui.panel) return;

    ui.announcement = ui.panel.querySelector('#measure-announcement');
    ui.roomsList = ui.panel.querySelector('[data-measure-rooms]');
    ui.roomCount = ui.panel.querySelector('[data-measure-room-count]');

    load();
    renderList();

    ui.panel.addEventListener('submit', function (e) {
      var form = e.target.closest('#measure-add-form');
      if (!form) return;
      e.preventDefault();

      var name = form.querySelector('[data-measure-name]').value;
      var width = parseFloat(form.querySelector('[data-measure-width]').value);
      var length = parseFloat(form.querySelector('[data-measure-length]').value);
      var height = parseFloat(form.querySelector('[data-measure-height]').value);
      var notes = form.querySelector('[data-measure-notes]').value;
      var openings = collectOpenings(form);
      if (openings === null) return;

      var success = addRoom(name, width, length, height, openings, notes);
      if (success) {
        form.reset();
        // Remover linhas de abertura extras
        var rows = form.querySelectorAll('[data-opening-row]');
        for (var i = rows.length - 1; i >= 0; i--) {
          rows[i].parentNode.removeChild(rows[i]);
        }
        form.querySelector('[data-measure-name]').focus();
      }
    });

    ui.panel.addEventListener('click', function (e) {
      var removeBtn = e.target.closest('[data-measure-remove]');
      if (removeBtn) {
        var roomId = parseInt(removeBtn.getAttribute('data-measure-remove'), 10);
        removeRoom(roomId);
        return;
      }

      var addOpeningBtn = e.target.closest('[data-add-opening]');
      if (addOpeningBtn) {
        var container = ui.panel.querySelector('[data-openings-container]');
        if (container) addOpeningRow(container);
        return;
      }

      var removeOpening = e.target.closest('[data-remove-opening]');
      if (removeOpening) {
        var row = removeOpening.closest('[data-opening-row]');
        if (row) {
          var nextRow = row.nextElementSibling;
          var previousRow = row.previousElementSibling;
          row.parentNode.removeChild(row);
          var focusRow = nextRow || previousRow;
          if (focusRow) focusRow.querySelector('[data-opening-type]').focus();
          else ui.panel.querySelector('[data-add-opening]').focus();
        }
      }
    });
  }

  if (window.CantinhoTools) {
    window.CantinhoTools.register({ id: 'measure-book', init: init });
  }

})(window, document);
