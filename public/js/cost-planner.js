/**
 * Cantinho Certo — Planilha de Custos
 *
 * Organiza despesas da mudança em categorias, com soma automática
 * e persistência local.
 */
(function (window, document) {
  'use strict';

  var TOOL_ID = 'cost-planner:v1';

  var CATEGORIES = [
    { id: 'aluguel',     label: 'Aluguel e caução',     icon: 'home'     },
    { id: 'transporte',  label: 'Carreto e frete',       icon: 'truck'    },
    { id: 'mobilia',     label: 'Mobília essencial',      icon: 'package'  },
    { id: 'utilidades',  label: 'Contas iniciais',        icon: 'zap'      },
    { id: 'reformas',    label: 'Reformas leves',         icon: 'tool'     },
    { id: 'imprevistos', label: 'Imprevistos',            icon: 'alert'    }
  ];

  var state = { categories: {} };
  var ui = {};
  var initialized = false;
  var nextId = 1;

  /* ---------- Persistência ---------- */

  function save() {
    if (!window.CantinhoToolStorage) {
      announce('O armazenamento local não está disponível. As despesas não foram salvas.', true);
      return false;
    }
    var data = { categories: {} };
    CATEGORIES.forEach(function (cat) {
      data.categories[cat.id] = (state.categories[cat.id] || []).map(function (item) {
        return { description: item.description, value: item.value };
      });
    });
    var result = window.CantinhoToolStorage.write(TOOL_ID, data);
    if (!result || !result.ok) {
      announce('Não foi possível salvar. Verifique o armazenamento do navegador.', true);
      return false;
    }
    return true;
  }

  function load() {
    if (!window.CantinhoToolStorage) {
      announce('O armazenamento local não está disponível. As despesas não foram carregadas.', true);
      return;
    }
    var result = window.CantinhoToolStorage.read(TOOL_ID);
    if (!result || !result.ok) {
      announce('Não foi possível ler as despesas salvas.', true);
      return;
    }
    if (!result.value) return;
    var data = result.value;
    if (!data.categories || typeof data.categories !== 'object') {
      announce('Os dados salvos das despesas não puderam ser reconhecidos.', true);
      return;
    }

    CATEGORIES.forEach(function (cat) {
      var items = data.categories[cat.id];
      if (!Array.isArray(items)) return;
      state.categories[cat.id] = items.reduce(function (validItems, raw) {
        var value = raw && typeof raw.value === 'number' ? raw.value : NaN;
        var description = raw && typeof raw.description === 'string' ? raw.description.trim() : '';
        if (!description || !Number.isFinite(value) || value <= 0) return validItems;
        validItems.push({
          id: nextId++,
          description: description.slice(0, 120),
          value: Math.round(value * 100) / 100
        });
        return validItems;
      }, []);
      if (state.categories[cat.id].length !== items.length) {
        announce('Algumas despesas salvas foram ignoradas porque os dados estavam inválidos.', true);
      }
    });
  }

  /* ---------- Utilitários ---------- */

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

  function categoryTotal(catId) {
    var items = state.categories[catId] || [];
    var total = 0;
    for (var i = 0; i < items.length; i++) {
      total += items[i].value;
    }
    return total;
  }

  function grandTotal() {
    var total = 0;
    CATEGORIES.forEach(function (cat) {
      total += categoryTotal(cat.id);
    });
    return total;
  }

  function renderCategory(catId) {
    var section = ui.panel.querySelector('[data-cost-category="' + catId + '"]');
    if (!section) return;

    var listEl = section.querySelector('[data-cost-items]');
    var totalEl = section.querySelector('[data-cost-cat-total]');
    var items = state.categories[catId] || [];

    listEl.innerHTML = '';

    if (items.length === 0) {
      var emptyLi = document.createElement('li');
      emptyLi.className = 'cost-empty-row';
      emptyLi.textContent = 'Nenhuma despesa adicionada.';
      listEl.appendChild(emptyLi);
    } else {
      items.forEach(function (item) {
        var li = document.createElement('li');
        li.className = 'cost-item-row';
        li.setAttribute('data-cost-item-id', item.id);

        var descSpan = document.createElement('span');
        descSpan.className = 'cost-item-desc';
        descSpan.textContent = item.description;

        var valueSpan = document.createElement('span');
        valueSpan.className = 'cost-item-value';
        valueSpan.textContent = window.CantinhoToolUtils.formatCurrency(item.value);

        var removeBtn = document.createElement('button');
        removeBtn.className = 'cost-remove-btn';
        removeBtn.type = 'button';
        removeBtn.setAttribute('aria-label', 'Remover ' + item.description);
        removeBtn.setAttribute('data-remove-cost', item.id);
        removeBtn.setAttribute('data-remove-cat', catId);
        removeBtn.textContent = '×';

        li.appendChild(descSpan);
        li.appendChild(valueSpan);
        li.appendChild(removeBtn);
        listEl.appendChild(li);
      });
    }

    totalEl.textContent = window.CantinhoToolUtils.formatCurrency(categoryTotal(catId));
    renderGrandTotal();
  }

  function renderGrandTotal() {
    if (ui.grandTotal) {
      ui.grandTotal.textContent = window.CantinhoToolUtils.formatCurrency(grandTotal());
    }
    if (ui.itemCount) {
      var count = 0;
      CATEGORIES.forEach(function (cat) {
        count += (state.categories[cat.id] || []).length;
      });
      ui.itemCount.textContent = count + (count === 1 ? ' despesa' : ' despesas');
    }
  }

  function renderAll() {
    CATEGORIES.forEach(function (cat) {
      renderCategory(cat.id);
    });
  }

  /* ---------- Ações ---------- */

  function addItem(catId, description, value) {
    if (!description || description.trim().length === 0) {
      announce('Informe a descrição da despesa.', true);
      return false;
    }
    if (!Number.isFinite(value) || value <= 0) {
      announce('Informe um valor maior que zero.', true);
      return false;
    }

    if (!state.categories[catId]) {
      state.categories[catId] = [];
    }

    state.categories[catId].push({
      id: nextId++,
      description: description.trim().slice(0, 120),
      value: value
    });

    renderCategory(catId);
    if (save()) announce(description.trim() + ' adicionado.', false);
    return true;
  }

  function removeItem(catId, itemId) {
    var items = state.categories[catId];
    if (!items) return;

    var index = -1;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === itemId) {
        index = i;
        break;
      }
    }
    if (index === -1) return;

    var removed = items.splice(index, 1)[0];
    renderCategory(catId);
    if (save()) announce(removed.description + ' removido.', false);
  }

  function clearAll() {
    CATEGORIES.forEach(function (cat) {
      state.categories[cat.id] = [];
    });
    renderAll();
    if (save()) announce('Todas as despesas foram removidas.', false);
  }

  /* ---------- Inicialização ---------- */

  function init() {
    if (initialized) return;
    initialized = true;

    ui.panel = document.getElementById('cost-planner-panel');
    if (!ui.panel) return;

    ui.announcement = ui.panel.querySelector('#cost-announcement');
    ui.grandTotal = ui.panel.querySelector('[data-cost-grand-total]');
    ui.itemCount = ui.panel.querySelector('[data-cost-item-count]');
    if (!window.CantinhoToolUtils) {
      announce('Não foi possível iniciar a formatação de valores.', true);
      return;
    }

    load();
    renderAll();
    CATEGORIES.forEach(function (category) {
      var section = ui.panel.querySelector('[data-cost-category="' + category.id + '"]');
      if (!section) return;
      var toggle = section.querySelector('[data-cost-toggle]');
      var body = section.querySelector('[data-cost-body]');
      if (toggle && body) {
        body.id = 'cost-category-body-' + category.id;
        toggle.setAttribute('aria-controls', body.id);
      }
    });

    // Delegação de eventos
    ui.panel.addEventListener('submit', function (e) {
      var form = e.target.closest('[data-cost-add-form]');
      if (!form) return;
      e.preventDefault();

      var catId = form.getAttribute('data-cost-add-form');
      var descInput = form.querySelector('[data-cost-desc]');
      var valueInput = form.querySelector('[data-cost-value]');
      if (!descInput || !valueInput) return;

      var value = window.CantinhoToolUtils.parseCurrency(valueInput.value);
      if (value === null) {
        announce('Informe um valor válido em reais, por exemplo 1.250,00.', true);
        valueInput.focus();
        return;
      }
      var success = addItem(catId, descInput.value, value);

      if (success) {
        descInput.value = '';
        valueInput.value = '';
        descInput.focus();
      }
    });

    ui.panel.addEventListener('click', function (e) {
      var removeBtn = e.target.closest('[data-remove-cost]');
      if (removeBtn) {
        var itemId = parseInt(removeBtn.getAttribute('data-remove-cost'), 10);
        var catId = removeBtn.getAttribute('data-remove-cat');
        var section = removeBtn.closest('[data-cost-category]');
        var items = state.categories[catId] || [];
        var removedIndex = items.findIndex(function(item) { return item.id === itemId; });
        removeItem(catId, itemId);
        if (section) {
          var remainingItems = section.querySelectorAll('[data-remove-cost]');
          var nextButton = remainingItems[Math.min(removedIndex, remainingItems.length - 1)];
          var descriptionInput = section.querySelector('[data-cost-desc]');
          if (nextButton) nextButton.focus();
          else if (descriptionInput) descriptionInput.focus();
        }
        return;
      }

      var clearBtn = e.target.closest('[data-cost-clear-all]');
      if (clearBtn) {
        if (grandTotal() === 0) return;
        var confirmClear = window.confirm('Remover todas as despesas? Essa ação não pode ser desfeita.');
        if (confirmClear) clearAll();
        return;
      }

      // Toggle categoria
      var toggle = e.target.closest('[data-cost-toggle]');
      if (toggle) {
        var catSection = toggle.closest('[data-cost-category]');
        if (catSection) {
          var body = catSection.querySelector('[data-cost-body]');
          var isOpen = toggle.getAttribute('aria-expanded') === 'true';
          toggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
          if (body) body.hidden = isOpen;
        }
      }
    });
  }

  if (window.CantinhoTools) {
    window.CantinhoTools.register({ id: 'cost-planner', init: init });
  }

})(window, document);
