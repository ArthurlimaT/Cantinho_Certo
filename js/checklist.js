/**
 * Cantinho Certo — Módulo de Checklists Interativos
 * 
 * Utiliza elementos nativos <input type="checkbox"> para 100% de acessibilidade
 * (teclado, toque, leitor de tela) com estilização customizada na identidade visual.
 */
(function(window) {
  'use strict';

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

      var label = input.closest('.checklist-item');
      if (label) {
        label.classList.toggle('is-checked', isChecked);
      }

      window.CantinhoStorage.setChecklistItem(key, isChecked);
      if (window.CantinhoProgress && typeof window.CantinhoProgress.updateProgress === 'function') {
        window.CantinhoProgress.updateProgress();
      }
    });
  }

  window.CantinhoChecklist = {
    init: initChecklists
  };
})(window);
