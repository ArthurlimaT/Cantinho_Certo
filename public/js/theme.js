/**
 * Cantinho Certo — Módulo de Tema (Claro / Escuro)
 * Respeita preferências do sistema operacional (prefers-color-scheme)
 * e permite alternância manual persistida em localStorage.
 */
(function(window) {
  'use strict';

  function getPreferredTheme() {
    try {
      var saved = localStorage.getItem('cc-theme');
      if (saved) return saved;
    } catch (e) {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('cc-theme', theme);
    } catch (e) {}
  }

  function initTheme() {
    var themeBtn = document.querySelector('.theme-toggle');
    try {
      var stored = localStorage.getItem('cc-theme');
      if (stored) applyTheme(stored);
    } catch (e) {}

    if (themeBtn) {
      themeBtn.addEventListener('click', function() {
        var current = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
        var next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
      });
    }
  }

  window.CantinhoTheme = {
    init: initTheme,
    applyTheme: applyTheme,
    getPreferredTheme: getPreferredTheme
  };
})(window);
