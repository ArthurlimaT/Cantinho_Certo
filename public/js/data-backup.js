/**
 * Cantinho Certo — Exportação e restauração de dados locais
 */
(function(window, document) {
  'use strict';

  var FORMAT = 'cantinho-certo-backup';
  var VERSION = 1;
  var MAX_BACKUP_SIZE = 1000000;
  var STORAGE_KEYS = [
    'cc-checklist',
    'cc-done',
    'cc-theme',
    'cc-tool:space-planner:v1',
    'cc-tool:cost-planner:v1',
    'cc-tool:measure-book:v1',
    'cc-tool:trousseau:v1'
  ];
  var STEPS = ['planejar', 'escolher', 'mudar', 'mobiliar'];
  var ROOM_IDS = ['sala', 'quarto', 'cozinha'];
  var COST_CATEGORIES = ['aluguel', 'transporte', 'mobilia', 'utilidades', 'reformas', 'imprevistos'];
  var PRIORITIES = ['essential', 'soon', 'later'];
  var FURNITURE = {
    sofa: [180, 85],
    bed: [140, 190],
    table: [120, 80],
    wardrobe: [160, 60],
    rack: [160, 40],
    bedside: [45, 40],
    desk: [120, 60],
    fridge: [70, 70],
    stove: [60, 60],
    counter: [120, 60]
  };
  var pendingBackup = null;

  function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function isChecklist(value) {
    if (!isObject(value)) return false;
    return Object.keys(value).every(function(key) {
      return /^[a-z0-9_-]{1,120}$/i.test(key) && typeof value[key] === 'boolean';
    });
  }

  function isDoneSteps(value) {
    if (!isObject(value)) return false;
    return Object.keys(value).every(function(key) {
      return STEPS.indexOf(key) !== -1 && typeof value[key] === 'boolean';
    });
  }

  function isSpacePlan(plan) {
    if (!isObject(plan) || !isObject(plan.room) || !Array.isArray(plan.items) ||
        !isFiniteNumber(plan.room.width) || !isFiniteNumber(plan.room.depth) ||
        plan.room.width < 100 || plan.room.width > 2000 ||
        plan.room.depth < 100 || plan.room.depth > 2000 || plan.items.length > 40) return false;

    var ids = Object.create(null);
    return plan.items.every(function(item) {
      if (!isObject(item) || typeof item.id !== 'string' || !item.id || item.id.length > 80 ||
          Object.prototype.hasOwnProperty.call(ids, item.id) ||
          !Object.prototype.hasOwnProperty.call(FURNITURE, item.type) ||
          !isFiniteNumber(item.x) || !isFiniteNumber(item.y) ||
          (item.rotation !== 0 && item.rotation !== 90)) return false;
      ids[item.id] = true;
      var dimensions = FURNITURE[item.type];
      var width = item.rotation === 90 ? dimensions[1] : dimensions[0];
      var depth = item.rotation === 90 ? dimensions[0] : dimensions[1];
      return width <= plan.room.width && depth <= plan.room.depth;
    });
  }

  function isSpacePlanner(value) {
    if (!isObject(value)) return false;
    if (value.version === 1) return isSpacePlan(value);
    if (value.version !== 2 || ROOM_IDS.indexOf(value.activeRoomId) === -1 ||
        !isObject(value.plans)) return false;

    return Object.keys(value.plans).every(function(roomId) {
      if (ROOM_IDS.indexOf(roomId) === -1) return false;
      var plan = value.plans[roomId];
      if (!isObject(plan) || !Array.isArray(plan.items)) return false;
      if (plan.room === null) return plan.items.length === 0;
      return isSpacePlan({ room: plan.room, items: plan.items });
    });
  }

  function isCostPlanner(value) {
    if (!isObject(value) || !isObject(value.categories)) return false;
    return Object.keys(value.categories).every(function(category) {
      var items = value.categories[category];
      return COST_CATEGORIES.indexOf(category) !== -1 && Array.isArray(items) &&
        items.length <= 500 && items.every(function(item) {
          return isObject(item) && typeof item.description === 'string' &&
            item.description.trim().length > 0 && item.description.length <= 120 &&
            isFiniteNumber(item.value) && item.value > 0;
        });
    });
  }

  function isMeasureBook(value) {
    if (!isObject(value) || !Array.isArray(value.rooms) || value.rooms.length > 500) return false;
    return value.rooms.every(function(room) {
      if (!isObject(room) || typeof room.name !== 'string' || !room.name.trim() ||
          room.name.length > 60 || !isFiniteNumber(room.width) || room.width <= 0 ||
          room.width > 30 || !isFiniteNumber(room.length) || room.length <= 0 ||
          room.length > 30 || (room.height !== undefined &&
          (!isFiniteNumber(room.height) || room.height < 0 || room.height > 10)) ||
          (room.notes !== undefined && (typeof room.notes !== 'string' || room.notes.length > 500)) ||
          (room.openings !== undefined && (!Array.isArray(room.openings) || room.openings.length > 20))) {
        return false;
      }
      return (room.openings || []).every(function(opening) {
        return isObject(opening) && (opening.type === 'porta' || opening.type === 'janela') &&
          isFiniteNumber(opening.width) && opening.width > 0 && opening.width <= 30 &&
          isFiniteNumber(opening.height) && opening.height > 0 && opening.height <= 30 &&
          (opening.label === undefined || (typeof opening.label === 'string' && opening.label.length <= 60));
      });
    });
  }

  function isTrousseau(value) {
    if (!isObject(value) || !Array.isArray(value.items) || value.items.length > 500) return false;
    return value.items.every(function(item) {
      return isObject(item) && typeof item.name === 'string' && item.name.trim() &&
        item.name.length <= 120 && isFiniteNumber(item.price) && item.price >= 0 &&
        (item.priority === undefined || PRIORITIES.indexOf(item.priority) !== -1) &&
        (item.bought === undefined || typeof item.bought === 'boolean');
    });
  }

  function isValidStorageValue(key, rawValue) {
    if (rawValue === null) return true;
    if (typeof rawValue !== 'string' || rawValue.length > MAX_BACKUP_SIZE) return false;
    if (key === 'cc-theme') return rawValue === 'light' || rawValue === 'dark';

    var value;
    try {
      value = JSON.parse(rawValue);
    } catch (error) {
      return false;
    }

    if (key === 'cc-checklist') return isChecklist(value);
    if (key === 'cc-done') return isDoneSteps(value);
    if (key === 'cc-tool:space-planner:v1') return isSpacePlanner(value);
    if (key === 'cc-tool:cost-planner:v1') return isCostPlanner(value);
    if (key === 'cc-tool:measure-book:v1') return isMeasureBook(value);
    if (key === 'cc-tool:trousseau:v1') return isTrousseau(value);
    return false;
  }

  function validateBackup(value) {
    if (!isObject(value) || value.format !== FORMAT || value.version !== VERSION ||
        !isObject(value.storage)) {
      return { ok: false, error: 'O arquivo não é um backup compatível do Cantinho Certo.' };
    }
    if (value.exportedAt !== undefined &&
        (typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt)))) {
      return { ok: false, error: 'A data do backup não é válida.' };
    }
    if (Object.keys(value.storage).some(function(key) {
      return STORAGE_KEYS.indexOf(key) === -1;
    })) {
      return { ok: false, error: 'O arquivo contém dados que não pertencem ao backup do Cantinho Certo.' };
    }

    var storage = {};
    for (var i = 0; i < STORAGE_KEYS.length; i++) {
      var key = STORAGE_KEYS[i];
      var rawValue = Object.prototype.hasOwnProperty.call(value.storage, key) ? value.storage[key] : null;
      if (!isValidStorageValue(key, rawValue)) {
        return { ok: false, error: 'Os dados do backup estão inválidos ou são incompatíveis com esta versão.' };
      }
      storage[key] = rawValue;
    }
    return { ok: true, value: { format: FORMAT, version: VERSION, storage: storage } };
  }

  function createBackup() {
    var storage;
    try {
      storage = window.localStorage;
      var data = {};
      STORAGE_KEYS.forEach(function(key) {
        data[key] = storage.getItem(key);
        if (!isValidStorageValue(key, data[key])) {
          throw new Error('Os dados salvos em ' + key + ' não puderam ser validados.');
        }
      });
      return {
        ok: true,
        value: {
          format: FORMAT,
          version: VERSION,
          exportedAt: new Date().toISOString(),
          storage: data
        }
      };
    } catch (error) {
      return { ok: false, error: 'Não foi possível ler e validar os dados deste navegador.' };
    }
  }

  function parseBackup(text) {
    if (typeof text !== 'string' || text.length > MAX_BACKUP_SIZE) {
      return { ok: false, error: 'O arquivo é maior do que o limite permitido para um backup.' };
    }
    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      return { ok: false, error: 'O arquivo não contém um JSON válido.' };
    }
    return validateBackup(parsed);
  }

  function restoreBackup(backup) {
    var validated = validateBackup(backup);
    if (!validated.ok) return validated;

    var storage;
    var previous = {};
    try {
      storage = window.localStorage;
      STORAGE_KEYS.forEach(function(key) {
        previous[key] = storage.getItem(key);
      });
    } catch (error) {
      return { ok: false, error: 'Não foi possível acessar o armazenamento deste navegador.' };
    }

    try {
      STORAGE_KEYS.forEach(function(key) {
        var value = validated.value.storage[key];
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      });
      return { ok: true };
    } catch (error) {
      var rollbackFailed = false;
      STORAGE_KEYS.forEach(function(key) {
        try {
          if (previous[key] === null) storage.removeItem(key);
          else storage.setItem(key, previous[key]);
        } catch (rollbackError) {
          rollbackFailed = true;
        }
      });
      return {
        ok: false,
        error: rollbackFailed
          ? 'A restauração falhou e nem todos os dados anteriores puderam ser recuperados. Verifique o armazenamento do navegador.'
          : 'Não foi possível restaurar o backup. Os dados anteriores foram mantidos.'
      };
    }
  }

  function init() {
    var exportButton = document.querySelector('[data-backup-export]');
    var importButton = document.querySelector('[data-backup-import]');
    var fileInput = document.querySelector('[data-backup-file]');
    var status = document.querySelector('[data-backup-status]');
    var restorePanel = document.querySelector('[data-backup-restore-panel]');
    var confirmButton = document.querySelector('[data-backup-confirm-restore]');
    var cancelButton = document.querySelector('[data-backup-cancel-restore]');
    if (!exportButton || !importButton || !fileInput || !status ||
        !restorePanel || !confirmButton || !cancelButton) return;

    function announce(message, isError) {
      status.textContent = message;
      if (isError) status.setAttribute('data-state', 'error');
      else status.removeAttribute('data-state');
    }

    function clearPendingBackup() {
      pendingBackup = null;
      restorePanel.hidden = true;
    }

    exportButton.addEventListener('click', function() {
      var result = createBackup();
      if (!result.ok) {
        announce(result.error, true);
        return;
      }
      try {
        var blob = new window.Blob([JSON.stringify(result.value, null, 2)], {
          type: 'application/json'
        });
        var url = window.URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'cantinho-certo-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        link.hidden = true;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function() { window.URL.revokeObjectURL(url); }, 1000);
        announce('O download do backup foi iniciado. Guarde o arquivo em um local seguro.');
      } catch (error) {
        announce('Não foi possível preparar o arquivo de backup para download.', true);
      }
    });

    importButton.addEventListener('click', function() {
      fileInput.value = '';
      fileInput.click();
    });

    fileInput.addEventListener('change', function() {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      clearPendingBackup();
      if (file.size > MAX_BACKUP_SIZE) {
        announce('O arquivo é maior do que o limite permitido para um backup.', true);
        return;
      }

      try {
        var reader = new window.FileReader();
        reader.onload = function() {
          var result = parseBackup(reader.result);
          if (!result.ok) {
            announce(result.error, true);
            return;
          }
          pendingBackup = result.value;
          restorePanel.hidden = false;
          announce('Arquivo validado. Confira o aviso e confirme para substituir os dados atuais.');
          confirmButton.focus();
        };
        reader.onerror = function() {
          announce('Não foi possível ler o arquivo selecionado.', true);
        };
        reader.readAsText(file);
      } catch (error) {
        announce('Não foi possível abrir o arquivo selecionado neste navegador.', true);
      }
    });

    confirmButton.addEventListener('click', function() {
      if (!pendingBackup) return;
      confirmButton.disabled = true;
      var result = restoreBackup(pendingBackup);
      if (!result.ok) {
        confirmButton.disabled = false;
        announce(result.error, true);
        return;
      }
      clearPendingBackup();
      announce('Backup restaurado. Atualizando as ferramentas e checklists.');
      window.setTimeout(function() { window.location.reload(); }, 1200);
    });

    cancelButton.addEventListener('click', function() {
      clearPendingBackup();
      announce('Restauração cancelada. Seus dados atuais não foram alterados.');
      importButton.focus();
    });
  }

  window.CantinhoDataBackup = {
    createBackup: createBackup,
    parseBackup: parseBackup,
    restoreBackup: restoreBackup
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
