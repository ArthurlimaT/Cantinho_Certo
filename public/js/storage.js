/**
 * Cantinho Certo — Módulo de Armazenamento Local (Storage)
 * 
 * Responsável por gerenciar a persistência segura no localStorage, com:
 * - Fallback automático em memória caso localStorage esteja indisponível (ex: navegação anônima restrita);
 * - Tratamento seguro de exceções (try/catch);
 * - Validação de dados corrompidos;
 * - Versionamento de esquema (cc-version).
 */
(function(window) {
  'use strict';

  var STORAGE_VERSION = 1;
  var memoryStorage = {};
  var isLocalStorageAvailable = checkStorageAvailability();

  function checkStorageAvailability() {
    try {
      var testKey = '__cc_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  function getItem(key) {
    if (isLocalStorageAvailable) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return memoryStorage[key] || null;
      }
    }
    return memoryStorage[key] || null;
  }

  function setItem(key, value) {
    if (isLocalStorageAvailable) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {}
    }
    memoryStorage[key] = String(value);
  }

  function loadJSON(key, fallback) {
    try {
      var raw = getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      // Garante que mapas esperados sejam objetos simples válidos
      if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) {
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return fallback;
        }
      }
      return parsed;
    } catch (e) {
      return fallback;
    }
  }

  function saveJSON(key, val) {
    try {
      setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  // Inicialização e versionamento de esquema
  var storedVersion = parseInt(getItem('cc-version'), 10);
  if (isNaN(storedVersion) || storedVersion < STORAGE_VERSION) {
    setItem('cc-version', STORAGE_VERSION);
  }

  var STEPS = ['planejar', 'escolher', 'mudar', 'mobiliar'];
  var checklist = loadJSON('cc-checklist', {});
  var doneSteps = loadJSON('cc-done', {});

  window.CantinhoStorage = {
    STEPS: STEPS,
    isAvailable: function() { return isLocalStorageAvailable; },
    getChecklist: function() { return checklist; },
    getDoneSteps: function() { return doneSteps; },
    setChecklistItem: function(key, val) {
      checklist[key] = Boolean(val);
      saveJSON('cc-checklist', checklist);
    },
    setStepDone: function(step, val) {
      doneSteps[step] = Boolean(val);
      saveJSON('cc-done', doneSteps);
    },
    resetProgress: function() {
      checklist = {};
      doneSteps = {};
      saveJSON('cc-checklist', checklist);
      saveJSON('cc-done', doneSteps);
    }
  };
})(window);
