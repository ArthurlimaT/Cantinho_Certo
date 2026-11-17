/**
 * Cantinho Certo — Módulo de Checklists Interativos
 * 
 * Utiliza elementos nativos <input type="checkbox"> para 100% de acessibilidade
 * (teclado, toque, leitor de tela) com estilização customizada na identidade visual.
 */
(function(window) {
  'use strict';

  function animateCheck(input) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var indicator = input.nextElementSibling;
    if (!indicator || !indicator.classList.contains('checklist-box')) return;
    indicator.classList.remove('is-checking');
    void indicator.offsetWidth;
    indicator.classList.add('is-checking');
  }

  function initChecklists() {
    var checklist = window.CantinhoStorage.getChecklist();
    var checkboxes = document.querySelectorAll('.checklist-input');

    // Restaura estado inicial de cada checkbox a partir do storage
    checkboxes.forEach(function(input) {
      var group = input.getAttribute('data-group') || (input.closest('[data-group]') ? input.closest('[data-group]').getAttribute('data-group') : '');
      var item = input.getAttribute('data-item') || input.id;
      var key = group ? (group + '-' + item) : item;

      if (checklist[key]) {
        input.checked = true;
        var label = input.closest('.checklist-item');
        if (label) label.classList.add('is-checked');
      }
    });

    // Delegação de eventos no document para mudanças de estado de qualquer checklist
    document.addEventListener('change', function(e) {
      var input = e.target;
      if (!input || !input.classList.contains('checklist-input')) return;

      var group = input.getAttribute('data-group') || (input.closest('[data-group]') ? input.closest('[data-group]').getAttribute('data-group') : '');
      var item = input.getAttribute('data-item') || input.id;
      var key = group ? (group + '-' + item) : item;
      var isChecked = input.checked;
      animateCheck(input);

      var label = input.closest('.checklist-item');
      if (label) {
        label.classList.toggle('is-checked', isChecked);
      }

      window.CantinhoStorage.setChecklistItem(key, isChecked);
      if (window.CantinhoProgress && typeof window.CantinhoProgress.updateProgress === 'function') {
        window.CantinhoProgress.updateProgress();
      }
    });

    document.addEventListener('click', function(e) {
      var filterButton = e.target.closest('[data-priority-filter]');
      if (filterButton) {
        var selectedPriority = filterButton.getAttribute('data-priority-filter');
        document.querySelectorAll('[data-priority-filter]').forEach(function(button) {
          button.setAttribute('aria-pressed', button === filterButton ? 'true' : 'false');
        });
        document.querySelectorAll('.shelf-tier[data-priority]').forEach(function(tier) {
          tier.hidden = selectedPriority !== 'all' && tier.getAttribute('data-priority') !== selectedPriority;
        });
        return;
      }

      if (e.target.closest('[data-print-checklist]')) {
        window.print();
      }
    });
  }

  window.CantinhoChecklist = {
    init: initChecklists
  };
})(window);
