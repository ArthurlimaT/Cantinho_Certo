/**
 * Cantinho Certo — Registro e navegação das ferramentas
 */
(function(window, document) {
  'use strict';

  var modules = [];
  var initialized = false;

  function register(tool) {
    if (!tool || typeof tool.id !== 'string' || typeof tool.init !== 'function') {
      throw new TypeError('Cada ferramenta deve informar um id e uma função init.');
    }
    if (modules.some(function(registered) { return registered.id === tool.id; })) {
      throw new Error('Ferramenta registrada mais de uma vez: ' + tool.id);
    }
    modules.push(tool);
  }

  function findPanel(section, toolId) {
    var panels = section.querySelectorAll('[data-tool-panel]');
    for (var i = 0; i < panels.length; i++) {
      if (panels[i].getAttribute('data-tool-panel') === toolId) return panels[i];
    }
    return null;
  }

  function initializeNavigation() {
    var section = document.getElementById('ferramentas');
    if (!section) return;

    var catalog = section.querySelector('[data-tools-catalog]');
    var activeToolId = null;
    var activeTrigger = null;

    section.addEventListener('click', function(event) {
      var trigger = event.target.closest('[data-open-tool]');
      if (trigger && section.contains(trigger)) {
        var toolId = trigger.getAttribute('data-open-tool');
        var panel = findPanel(section, toolId);
        if (!panel || !catalog) return;

        activeToolId = toolId;
        activeTrigger = trigger;
        catalog.hidden = true;
        panel.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        var heading = panel.querySelector('h2');
        if (heading) heading.focus();
        return;
      }

      var backButton = event.target.closest('[data-tools-back]');
      if (!backButton || !section.contains(backButton)) return;

      var backToolId = backButton.getAttribute('data-tools-back');
      if (backToolId !== activeToolId) return;
      var activePanel = findPanel(section, activeToolId);
      if (!activePanel || !catalog) return;

      activePanel.hidden = true;
      catalog.hidden = false;
      if (activeTrigger) activeTrigger.setAttribute('aria-expanded', 'false');
      if (activeTrigger) activeTrigger.focus();
      activeToolId = null;
      activeTrigger = null;
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    modules.forEach(function(tool) {
      tool.init();
    });
    initializeNavigation();
  }

  window.CantinhoTools = {
    register: register,
    init: init
  };
})(window, document);
