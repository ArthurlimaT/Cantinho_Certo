/**
 * Cantinho Certo — Módulo da Planta Baixa Interativa SVG
 * 
 * Centraliza a interação com os cômodos (sala, quarto, cozinha, banheiro),
 * com suporte nativo a toque, clique e teclado (Enter e Espaço).
 * Atualiza o estado acessível aria-pressed e o painel de dicas (WCAG A6).
 */
(function(window) {
  'use strict';

  var roomData = {
    sala: {
      title: 'Sala',
      desc: 'O coração do apartamento pequeno — precisa ser versátil e acolhedora.',
      tips: [
        'Meça a diagonal das portas: um sofá que não cabe de frente pode passar inclinado.',
        'Verifique a posição das tomadas para a TV, abajur e cantinho de trabalho.',
        'Observe a circulação livre: reserve pelo menos 70 cm de corredor entre os móveis.'
      ]
    },
    quarto: {
      title: 'Quarto',
      desc: 'O refúgio de descanso. O tamanho real e a luz importam mais que a foto.',
      tips: [
        'Meça se cabe uma cama de casal e ao menos uma mesa de apoio lateral.',
        'Abra as janelas: confira se há boa ventilação e isolamento contra ruídos externos.',
        'Confira se as portas do armário ou janelas abrem sem bater na cama.'
      ]
    },
    cozinha: {
      title: 'Cozinha',
      desc: 'Em apê pequeno, cada centímetro da bancada e dos armários vale ouro.',
      tips: [
        'Conte os armários: espaço vertical até o teto é o maior aliado do apê compacto.',
        'Abra as torneiras: teste a pressão da água e o escoamento da pia.',
        'Meça os nichos para geladeira, fogão/cooktop e micro-ondas antes de comprar.'
      ]
    },
    banheiro: {
      title: 'Banheiro',
      desc: 'Compacto e funcional. O segredo está na boa ventilação e vedação.',
      tips: [
        'Acione a descarga e teste a pressão da água no chuveiro.',
        'Inspecione os cantos do box: manchas escuras revelam umidade retida ou ventilação fraca.',
        'Verifique se há ponto hidráulico e elétrico para a máquina de lavar roupas.'
      ]
    }
  };

  var activeRoomKey = null;

  function selectRoom(key) {
    var data = roomData[key];
    if (!data) return;

    activeRoomKey = key;
    var rooms = document.querySelectorAll('.room');
    var pt = document.getElementById('pt');
    var pd = document.getElementById('pd');
    var pu = document.getElementById('pu');

    // Atualiza estado acessível aria-pressed e classe visual
    rooms.forEach(function(r) {
      var isCurrent = r.getAttribute('data-k') === key;
      r.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
      r.classList.toggle('is-selected', isCurrent);
    });

    if (pt) pt.textContent = data.title;
    if (pd) pd.textContent = data.desc;
    if (pu) {
      pu.innerHTML = '';
      data.tips.forEach(function(tip) {
        var li = document.createElement('li');
        li.className = 'floor-plan-tip';
        li.innerHTML = '<span class="floor-plan-tip-icon" aria-hidden="true"></span><span class="floor-plan-tip-text">' + tip + '</span>';
        pu.appendChild(li);
      });
    }
  }

  function initFloorPlan() {
    var floorPlanSvg = document.querySelector('.floor-plan-svg svg');
    if (!floorPlanSvg) return;

    // Delegação centralizada de eventos de clique / toque
    floorPlanSvg.addEventListener('click', function(e) {
      var roomEl = e.target.closest('.room');
      if (roomEl) {
        var key = roomEl.getAttribute('data-k');
        if (key) selectRoom(key);
      }
    });

    // Delegação centralizada de eventos de teclado (Enter / Espaço)
    floorPlanSvg.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var roomEl = e.target.closest('.room');
        if (roomEl) {
          e.preventDefault();
          var key = roomEl.getAttribute('data-k');
          if (key) selectRoom(key);
        }
      }
    });

    // Seleção inicial da sala como exemplo acolhedor
    selectRoom('sala');
  }

  window.CantinhoFloorPlan = {
    init: initFloorPlan,
    selectRoom: selectRoom
  };
})(window);
