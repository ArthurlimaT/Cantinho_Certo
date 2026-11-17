/**
 * Cantinho Certo — Módulo de Progresso das Etapas
 * 
 * Calcula o progresso global combinando checklists resolvidos e etapas concluídas:
 * p = 0.5 * (itens marcados / total) + 0.5 * (etapas concluídas / 4)
 * Atualiza a barra de progresso e seus valores acessíveis.
 */
(function(window) {
  'use strict';

  function countChecked() {
    var allInputs = document.querySelectorAll('.checklist .checklist-input');
    var total = allInputs.length;
    var checked = 0;
    allInputs.forEach(function(input) {
      if (input.checked) checked++;
    });
    return { total: total || 10, checked: checked };
  }

  function countDone() {
    var doneSteps = window.CantinhoStorage.getDoneSteps();
    var c = 0;
    window.CantinhoStorage.STEPS.forEach(function(s) {
      if (doneSteps[s]) c++;
    });
    return c;
  }

  function updateProgress() {
    var ck = countChecked();
    var d = countDone();
    var p = 0.5 * (ck.checked / ck.total) + 0.5 * (d / 4);

    var progressBar = document.getElementById('guide-progress-bar');
    if (progressBar) {
      var percentage = Math.round(p * 100);
      var checkedLabel = ck.checked === 1 ? '1 item marcado.' : ck.checked + ' itens marcados.';
      progressBar.value = percentage;
      progressBar.setAttribute('aria-valuetext', percentage + '% concluído; ' + d + ' de 4 etapas concluídas; ' + checkedLabel);
    }

    // Mensagem de apoio textual
    var msg = document.getElementById('progress-message');
    if (msg) {
      msg.textContent = d + ' de 4 etapas concluídas. Um passo de cada vez.';
    }
  }

  function updateNavDoneStates() {
    var doneSteps = window.CantinhoStorage.getDoneSteps();
    document.querySelectorAll('.nav-link[data-nav]').forEach(function(link) {
      var nav = link.getAttribute('data-nav');
      if (doneSteps[nav]) {
        link.classList.add('done');
      } else {
        link.classList.remove('done');
      }
    });
  }

  function updateStepCompleteBlocks() {
    var doneSteps = window.CantinhoStorage.getDoneSteps();
    window.CantinhoStorage.STEPS.forEach(function(step) {
      var block = document.getElementById('sc-' + step);
      if (!block) return;
      if (doneSteps[step]) {
        block.classList.add('is-completed');
      } else {
        block.classList.remove('is-completed');
      }
    });
  }

  function updateStepsVisual() {
    var doneSteps = window.CantinhoStorage.getDoneSteps();
    document.querySelectorAll('.step-pill[data-step]').forEach(function(pill) {
      var s = pill.getAttribute('data-step');
      if (doneSteps[s]) {
        pill.classList.add('done');
      } else {
        pill.classList.remove('done');
      }
    });
  }

  function updateAll() {
    updateProgress();
    updateNavDoneStates();
    updateStepCompleteBlocks();
    updateStepsVisual();
  }

  window.CantinhoProgress = {
    updateProgress: updateProgress,
    updateNavDoneStates: updateNavDoneStates,
    updateStepCompleteBlocks: updateStepCompleteBlocks,
    updateStepsVisual: updateStepsVisual,
    updateAll: updateAll
  };
})(window);
