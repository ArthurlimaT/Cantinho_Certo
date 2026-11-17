/**
 * Cantinho Certo — Lista de Enxoval
 *
 * Lista de compras categorizada com prioridades, preços estimados
 * e marcação de itens comprados. Persistência local isolada.
 */
(function (window, document) {
  'use strict';

  var TOOL_ID = 'trousseau:v1';

  var PRIORITIES = [
    { id: 'essential', label: 'Essencial', desc: 'Itens sem os quais a rotina básica não funciona.' },
    { id: 'soon',      label: 'Logo depois', desc: 'Torna o dia a dia mais prático na segunda semana.' },
    { id: 'later',     label: 'Pode esperar', desc: 'Conforto e decoração para quando o orçamento permitir.' }
  ];

  var state = { items: [] };
  var ui = {};
  var initialized = false;
  var nextId = 1;

  /* ---------- Persistência ---------- */

  function save() {
    if (!window.CantinhoToolStorage) {
      announce('O armazenamento local não está disponível. A lista não foi salva.', true);
      return false;
    }
    var data = {
      items: state.items.map(function (item) {
        return {
          name: item.name,
          priority: item.priority,
          price: item.price,
          bought: item.bought
        };
      })
    };
    var result = window.CantinhoToolStorage.write(TOOL_ID, data);
    if (!result || !result.ok) {
      announce('Não foi possível salvar a lista.', true);
      return false;
    }
    return true;
  }

  function load() {
    if (!window.CantinhoToolStorage) {
      announce('O armazenamento local não está disponível. A lista não foi carregada.', true);
      return;
    }
    var result = window.CantinhoToolStorage.read(TOOL_ID);
    if (!result || !result.ok) {
      announce('Não foi possível ler a lista salva.', true);
      return;
    }
    if (!result.value) return;
    var data = result.value;
    if (!Array.isArray(data.items)) {
      announce('Os dados salvos da lista não puderam ser reconhecidos.', true);
      return;
    }

    state.items = data.items.reduce(function (items, raw) {
      var name = raw && typeof raw.name === 'string' ? raw.name.trim() : '';
      var price = raw && typeof raw.price === 'number' ? raw.price : NaN;
      if (!name || !Number.isFinite(price) || price < 0) return items;
      items.push({
        id: nextId++,
        name: name.slice(0, 120),
        priority: validatePriority(raw.priority),
        price: Math.round(price * 100) / 100,
        bought: raw.bought === true
      });
      return items;
    }, []);
    if (state.items.length !== data.items.length) {
      announce('Alguns itens salvos foram ignorados porque os dados estavam inválidos.', true);
    }
  }

  function validatePriority(val) {
    for (var i = 0; i < PRIORITIES.length; i++) {
      if (PRIORITIES[i].id === val) return val;
    }
    return 'essential';
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

  function animateCheck(input) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var indicator = input.nextElementSibling;
    if (!indicator || !indicator.classList.contains('checklist-box')) return;
    indicator.classList.remove('is-checking');
    void indicator.offsetWidth;
    indicator.classList.add('is-checking');
  }

  /* ---------- Renderização ---------- */

  function getItemsByPriority(priorityId) {
    return state.items.filter(function (item) {
      return item.priority === priorityId;
    });
  }

  function renderList() {
    var container = ui.listContainer;
    if (!container) return;
    container.innerHTML = '';

    if (state.items.length === 0) {
      var emptyEl = document.createElement('div');
      emptyEl.className = 'measure-empty';
      var emptyMessage = document.createElement('p');
      emptyMessage.textContent = 'Nenhum item adicionado à lista.';
      emptyEl.appendChild(emptyMessage);
      container.appendChild(emptyEl);
      updateSummary();
      return;
    }

    PRIORITIES.forEach(function (priority) {
      var items = getItemsByPriority(priority.id);
      if (items.length === 0) return;

      var section = document.createElement('div');
      section.className = 'trousseau-priority-section';
      section.setAttribute('data-trousseau-priority', priority.id);

      var heading = document.createElement('h4');
      heading.textContent = priority.label;
      section.appendChild(heading);

      var list = document.createElement('ul');
      list.className = 'trousseau-items-list';

      items.forEach(function (item) {
        var li = document.createElement('li');
        li.className = 'trousseau-item' + (item.bought ? ' is-bought' : '');
        li.setAttribute('data-trousseau-item-id', item.id);

        var label = document.createElement('label');
        label.className = 'trousseau-item-label';
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'trousseau-checkbox';
        checkbox.checked = item.bought;
        checkbox.setAttribute('data-trousseau-check', item.id);
        checkbox.setAttribute('aria-label', 'Marcar ' + item.name + ' como ' + (item.bought ? 'não comprado' : 'comprado'));
        var checkmark = document.createElement('span');
        checkmark.className = 'checklist-box';
        checkmark.setAttribute('aria-hidden', 'true');
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 16 16');
        var polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        polyline.setAttribute('points', '3.5 8.5 6.5 11.5 12.5 4.5');
        svg.appendChild(polyline);
        checkmark.appendChild(svg);
        var name = document.createElement('span');
        name.className = 'trousseau-item-name';
        name.textContent = item.name;
        label.appendChild(checkbox);
        label.appendChild(checkmark);
        label.appendChild(name);

        var price = document.createElement('span');
        price.className = 'trousseau-item-price';
        price.textContent = window.CantinhoToolUtils.formatCurrency(item.price);
        var removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'cost-remove-btn';
        removeButton.setAttribute('data-trousseau-remove', item.id);
        removeButton.setAttribute('aria-label', 'Remover ' + item.name);
        removeButton.textContent = '×';
        li.appendChild(label);
        li.appendChild(price);
        li.appendChild(removeButton);

        list.appendChild(li);
      });

      section.appendChild(list);
      container.appendChild(section);
    });

    updateSummary();
  }

  function updateSummary() {
    var totalItems = state.items.length;
    var boughtItems = state.items.filter(function (i) { return i.bought; }).length;
    var totalPrice = 0;
    var boughtPrice = 0;

    state.items.forEach(function (item) {
      totalPrice += item.price;
      if (item.bought) boughtPrice += item.price;
    });

    if (ui.itemCount) {
      ui.itemCount.textContent = boughtItems + ' de ' + totalItems + ' itens';
    }
    if (ui.totalPrice) {
      ui.totalPrice.textContent = window.CantinhoToolUtils.formatCurrency(totalPrice);
    }
    if (ui.boughtPrice) {
      ui.boughtPrice.textContent = window.CantinhoToolUtils.formatCurrency(boughtPrice);
    }
    if (ui.remainingPrice) {
      var remaining = totalPrice - boughtPrice;
      ui.remainingPrice.textContent = window.CantinhoToolUtils.formatCurrency(remaining);
    }
  }

  /* ---------- Ações ---------- */

  function addItem(name, priority, price) {
    if (!name || name.trim().length === 0) {
      announce('Informe o nome do item.', true);
      return false;
    }

    state.items.push({
      id: nextId++,
      name: name.trim().slice(0, 120),
      priority: validatePriority(priority),
      price: price || 0,
      bought: false
    });

    renderList();
    if (save()) announce(name.trim() + ' adicionado.', false);
    return true;
  }

  function removeItem(itemId) {
    var index = -1;
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === itemId) { index = i; break; }
    }
    if (index === -1) return;

    var removed = state.items.splice(index, 1)[0];
    renderList();
    if (save()) announce(removed.name + ' removido.', false);
  }

  function toggleBought(itemId) {
    var item = null;
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === itemId) {
        state.items[i].bought = !state.items[i].bought;
        item = state.items[i];
        break;
      }
    }
    if (!item) return;
    var row = ui.listContainer.querySelector('[data-trousseau-item-id="' + itemId + '"]');
    if (row) {
      row.classList.toggle('is-bought', item.bought);
      var checkbox = row.querySelector('[data-trousseau-check]');
      if (checkbox) {
        checkbox.setAttribute('aria-label', 'Marcar ' + item.name + ' como ' + (item.bought ? 'não comprado' : 'comprado'));
      }
    }
    updateSummary();
    if (save()) {
      announce(item.name + (item.bought ? ' marcado como comprado.' : ' marcado como não comprado.'), false);
    }
  }

  /* ---------- Inicialização ---------- */

  function init() {
    if (initialized) return;
    initialized = true;

    ui.panel = document.getElementById('trousseau-panel');
    if (!ui.panel) return;

    ui.announcement = ui.panel.querySelector('#trousseau-announcement');
    ui.listContainer = ui.panel.querySelector('[data-trousseau-list]');
    ui.itemCount = ui.panel.querySelector('[data-trousseau-item-count]');
    ui.totalPrice = ui.panel.querySelector('[data-trousseau-total]');
    ui.boughtPrice = ui.panel.querySelector('[data-trousseau-bought]');
    ui.remainingPrice = ui.panel.querySelector('[data-trousseau-remaining]');
    if (!window.CantinhoToolUtils) {
      announce('Não foi possível iniciar a formatação de valores.', true);
      return;
    }

    load();
    renderList();

    ui.panel.addEventListener('submit', function (e) {
      var form = e.target.closest('#trousseau-add-form');
      if (!form) return;
      e.preventDefault();

      var name = form.querySelector('[data-trousseau-name]').value;
      var priority = form.querySelector('[data-trousseau-priority]').value;
      var priceInput = form.querySelector('[data-trousseau-price]');
      var price = priceInput && priceInput.value.trim()
        ? window.CantinhoToolUtils.parseCurrency(priceInput.value)
        : 0;
      if (price === null) {
        announce('Informe um preço válido em reais, por exemplo 1.250,00.', true);
        priceInput.focus();
        return;
      }

      var success = addItem(name, priority, price);
      if (success) {
        form.querySelector('[data-trousseau-name]').value = '';
        if (priceInput) priceInput.value = '';
        form.querySelector('[data-trousseau-name]').focus();
      }
    });

    ui.panel.addEventListener('click', function (e) {
      var removeBtn = e.target.closest('[data-trousseau-remove]');
      if (removeBtn) {
        var itemId = parseInt(removeBtn.getAttribute('data-trousseau-remove'), 10);
        var currentRow = removeBtn.closest('[data-trousseau-item-id]');
        var oldPrioritySection = currentRow && currentRow.closest('.trousseau-priority-section');
        var priorityId = oldPrioritySection && oldPrioritySection.getAttribute('data-trousseau-priority');
        var rows = oldPrioritySection ? oldPrioritySection.querySelectorAll('[data-trousseau-item-id]') : [];
        var removedIndex = Array.prototype.indexOf.call(rows, currentRow);
        removeItem(itemId);
        if (priorityId) {
          var prioritySection = ui.listContainer.querySelector('[data-trousseau-priority="' + priorityId + '"]');
          var remainingButtons = prioritySection ? prioritySection.querySelectorAll('[data-trousseau-remove]') : [];
          var nextButton = remainingButtons[Math.min(removedIndex, remainingButtons.length - 1)];
          if (nextButton) nextButton.focus();
          else {
            var firstRemoveButton = ui.listContainer.querySelector('[data-trousseau-remove]');
            if (firstRemoveButton) firstRemoveButton.focus();
            else ui.panel.querySelector('[data-trousseau-name]').focus();
          }
        }
        return;
      }
    });

    ui.panel.addEventListener('change', function (e) {
      var checkbox = e.target.closest('[data-trousseau-check]');
      if (checkbox) {
        var itemId = parseInt(checkbox.getAttribute('data-trousseau-check'), 10);
        toggleBought(itemId);
        animateCheck(checkbox);
      }
    });
  }

  if (window.CantinhoTools) {
    window.CantinhoTools.register({ id: 'trousseau', init: init });
  }

})(window, document);
