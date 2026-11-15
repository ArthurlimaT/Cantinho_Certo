/**
 * Cantinho Certo — Aplicação Principal (Bootstrap)
 * 
 * Ponto de entrada que inicializa todos os módulos funcionais
 * e assegura a acessibilidade básica e tratamento de erros.
 */
document.addEventListener('DOMContentLoaded', function() {
  'use strict';

  // Marca classe .js para garantir fallback se JS estiver desativado (WCAG A5)
  document.documentElement.classList.add('js');

  // Inicialização modular segura
  if (window.CantinhoTheme && typeof window.CantinhoTheme.init === 'function') {
    window.CantinhoTheme.init();
  }

  if (window.CantinhoChecklist && typeof window.CantinhoChecklist.init === 'function') {
    window.CantinhoChecklist.init();
  }

  if (window.CantinhoFloorPlan && typeof window.CantinhoFloorPlan.init === 'function') {
    window.CantinhoFloorPlan.init();
  }

  if (window.CantinhoNewsletter && typeof window.CantinhoNewsletter.init === 'function') {
    window.CantinhoNewsletter.init();
  }

  if (window.CantinhoNavigation && typeof window.CantinhoNavigation.init === 'function') {
    window.CantinhoNavigation.init();
  }
});
