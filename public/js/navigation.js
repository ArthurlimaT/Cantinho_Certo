/**
 * Cantinho Certo — Módulo de Navegação & Roteamento
 * 
 * Gerencia a alternância entre etapas (#inicio, #planejar, #escolher, #mudar, #mobiliar, #diario, #ferramentas),
 * mantém histórico nativo do navegador (voltar/avançar), sincroniza atributos ARIA
 * e gerencia o foco do teclado no h1 de cada etapa (WCAG A3, A4).
 */
(function(window) {
  'use strict';

  var titles = {
    inicio: 'Cantinho Certo — Seu guia para a primeira mudança',
    planejar: '1. Planejar — Cantinho Certo',
    escolher: '2. Escolher — Cantinho Certo',
    mudar: '3. Mudar — Cantinho Certo',
    mobiliar: '4. Mobiliar — Cantinho Certo',
    diario: 'Diário da Mudança — Cantinho Certo',
    ferramentas: 'Ferramentas — Cantinho Certo'
  };

  function getHash() {
    var raw = (location.hash || '#inicio').replace('#', '').trim();
    return raw || 'inicio';
  }

  function showView(id, options) {
    var opts = options || {};
    if (!id) id = 'inicio';

    var views = document.querySelectorAll('.view');
    var navLinks = document.querySelectorAll('.nav-link[data-nav]');
    var announcer = document.getElementById('announcer');
    var progressBanner = document.getElementById('guide-progress');

    var targetView = document.getElementById(id) || document.querySelector('[data-v="' + id + '"]');

    if (!targetView) {
      id = 'inicio';
      targetView = document.getElementById('inicio') || document.querySelector('[data-v="inicio"]');
    }

    // Alterna a visibilidade das seções
    views.forEach(function(v) {
      if (v === targetView) {
        v.classList.add('active');
        v.removeAttribute('hidden');
      } else {
        v.classList.remove('active');
        v.setAttribute('hidden', 'until-found');
      }
    });

    // Atualiza links de navegação com aria-current="page" (WCAG A4)
    navLinks.forEach(function(link) {
      var navTarget = link.getAttribute('data-nav');
      if (navTarget === id) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });

    // Atualiza título da aba do navegador (WCAG A3)
    document.title = titles[id] || titles.inicio;

    // Gerenciamento de foco no título principal (WCAG A3)
    var heading = targetView ? targetView.querySelector('h1') : null;
    if (heading && opts.focus !== false) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: false });
    }

    // Região aria-live para tecnologias assistivas (WCAG A3)
    if (announcer && opts.announce !== false) {
      announcer.textContent = (titles[id] || 'Cantinho Certo') + ' — seção exibida.';
    }

    // Exibe o indicador apenas nas 4 etapas do guia
    var isStep = window.CantinhoStorage.STEPS.indexOf(id) > -1;
    if (progressBanner) {
      progressBanner.classList.toggle('is-visible', isStep);
      progressBanner.setAttribute('aria-hidden', isStep ? 'false' : 'true');
    }

    // Rolagem suave ao topo ao mudar de seção
    if (opts.scroll !== false) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Atualiza todos os indicadores de progresso
    if (window.CantinhoProgress && typeof window.CantinhoProgress.updateAll === 'function') {
      window.CantinhoProgress.updateAll();
    }
  }

  function initNavigation() {
    // Escuta mudanças de hash e botões de avançar/voltar do navegador
    window.addEventListener('hashchange', function() {
      showView(getHash(), { focus: true, scroll: true });
    });

    // Delegação de cliques em qualquer link interno ou botão de navegação
    document.addEventListener('click', function(e) {
      // Navegação por links com hash
      var link = e.target.closest('a[href^="#"]');
      if (link) {
        var hash = link.getAttribute('href').replace('#', '').trim();
        if (hash && hash !== 'main-content') {
          e.preventDefault();
          if (location.hash !== '#' + hash) {
            location.hash = '#' + hash;
          } else {
            showView(hash, { focus: true, scroll: true });
          }
          return;
        }
      }

      // Atalhos do início ("Em que momento você está?")
      var startBtn = e.target.closest('[data-start]');
      if (startBtn) {
        e.preventDefault();
        var targetStep = startBtn.getAttribute('data-start');
        if (targetStep === 'mudar') {
          window.CantinhoStorage.setStepDone('planejar', true);
          window.CantinhoStorage.setStepDone('escolher', true);
        } else if (targetStep === 'mobiliar') {
          window.CantinhoStorage.setStepDone('planejar', true);
          window.CantinhoStorage.setStepDone('escolher', true);
          window.CantinhoStorage.setStepDone('mudar', true);
        }
        location.hash = '#' + targetStep;
        return;
      }

      // Botões de conclusão de etapa ("Concluir e ir para...")
      var doneBtn = e.target.closest('[data-done]');
      if (doneBtn) {
        e.preventDefault();
        var currentStep = doneBtn.getAttribute('data-done');
        var nextStep = doneBtn.getAttribute('data-next');

        window.CantinhoStorage.setStepDone(currentStep, true);
        if (window.CantinhoProgress) window.CantinhoProgress.updateAll();

        if (nextStep) {
          location.hash = '#' + nextStep;
        } else {
          var announcer = document.getElementById('announcer');
          if (announcer) {
            announcer.textContent = 'Parabéns! Todas as 4 etapas da mudança foram concluídas com sucesso!';
          }
        }
      }
    });

    // Exibe a view inicial na carga da página
    showView(getHash(), { focus: false, scroll: false });
  }

  window.CantinhoNavigation = {
    init: initNavigation,
    showView: showView,
    getHash: getHash
  };
})(window);
