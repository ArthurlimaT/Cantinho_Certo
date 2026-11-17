/**
 * Cantinho Certo — Utilitários compartilhados das ferramentas
 */
(function(window) {
  'use strict';

  function parseCurrency(input) {
    var value = String(input).trim().replace(/^R\$\s*/i, '').replace(/\s/g, '');
    if (!value) return null;

    var normalized;
    if (value.indexOf(',') !== -1) {
      if (!/^(?:\d{1,3}(?:\.\d{3})+|\d+),\d{1,2}$/.test(value)) return null;
      normalized = value.replace(/\./g, '').replace(',', '.');
    } else if (value.indexOf('.') !== -1) {
      if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) {
        normalized = value.replace(/\./g, '');
      } else if (/^\d+\.\d{1,2}$/.test(value)) {
        normalized = value;
      } else {
        return null;
      }
    } else if (/^\d+$/.test(value)) {
      normalized = value;
    } else {
      return null;
    }

    var amount = Number(normalized);
    if (!Number.isFinite(amount) || amount > Number.MAX_SAFE_INTEGER / 100) return null;
    return Math.round(amount * 100) / 100;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  window.CantinhoToolUtils = {
    parseCurrency: parseCurrency,
    formatCurrency: formatCurrency
  };
})(window);
