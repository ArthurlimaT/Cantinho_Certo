/**
 * Cantinho Certo — Módulo da Newsletter
 * 
 * Gerencia a validação, envio assíncrono, estados de carregamento,
 * feedback de sucesso e tratamento de erros sem inline handlers.
 * 
 * Para integrar com um serviço real (ex: ConvertKit, Mailchimp, Brevo, Formspree):
 * Defina antes do script: window.CANTINHO_NEWSLETTER_ENDPOINT = 'https://sua-api.com/newsletter';
 */
(function(window) {
  'use strict';

  var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return EMAIL_REGEX.test(email.trim());
  }

  function initNewsletter() {
    var form = document.getElementById('newsletter-form');
    if (!form) return;

    var emailInput = form.querySelector('input[type="email"]');
    var submitBtn = form.querySelector('button[type="submit"]');
    var feedbackEl = document.getElementById('newsletter-feedback');

    if (!emailInput || !submitBtn) return;

    var originalBtnText = submitBtn.textContent || 'Quero receber';
    var isSubmitting = false;

    function setFeedback(message, type) {
      if (!feedbackEl) return;
      feedbackEl.textContent = message;
      feedbackEl.className = 'newsletter-feedback ' + (type ? 'newsletter-feedback--' + type : '');
    }

    form.addEventListener('submit', function(e) {
      e.preventDefault();

      if (isSubmitting) return;

      var email = emailInput.value ? emailInput.value.trim() : '';

      // Validação do e-mail
      if (!validateEmail(email)) {
        setFeedback('Por favor, informe um endereço de e-mail válido.', 'error');
        emailInput.focus();
        return;
      }

      // Estado de Carregamento
      isSubmitting = true;
      submitBtn.disabled = true;
      emailInput.disabled = true;
      submitBtn.setAttribute('aria-busy', 'true');
      submitBtn.textContent = 'Enviando...';
      setFeedback('Inscrevendo seu e-mail...', 'loading');

      var endpoint = window.CANTINHO_NEWSLETTER_ENDPOINT || null;

      if (endpoint) {
        // Envio real para API configurada
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ email: email, timestamp: new Date().toISOString() })
        })
        .then(function(response) {
          if (!response.ok) throw new Error('Falha no serviço (' + response.status + ')');
          return response.json().catch(function() { return {}; });
        })
        .then(function() {
          handleSuccess();
        })
        .catch(function(err) {
          handleError('Não foi possível concluir a inscrição agora. Tente novamente mais tarde.');
        });
      } else {
        // Simulação assíncrona robusta (caso nenhum endpoint esteja configurado ainda)
        window.setTimeout(function() {
          // Salva confirmação no storage para registrar que o usuário já assinou
          window.CantinhoStorage.setChecklistItem('newsletter-subscribed', true);
          handleSuccess();
        }, 800);
      }

      function handleSuccess() {
        isSubmitting = false;
        submitBtn.disabled = true;
        submitBtn.removeAttribute('aria-busy');
        submitBtn.textContent = 'Inscrito com sucesso! ✓';
        emailInput.value = '';
        emailInput.disabled = true;
        setFeedback('Obrigado! Enviamos um e-mail de boas-vindas com o seu primeiro guia.', 'success');
      }

      function handleError(errorMsg) {
        isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
        submitBtn.textContent = originalBtnText;
        emailInput.disabled = false;
        emailInput.focus();
        setFeedback(errorMsg, 'error');
      }
    });

    // Limpa mensagem de erro ao digitar novamente
    emailInput.addEventListener('input', function() {
      if (feedbackEl && feedbackEl.classList.contains('newsletter-feedback--error')) {
        setFeedback('', '');
      }
    });
  }

  window.CantinhoNewsletter = {
    init: initNewsletter,
    validateEmail: validateEmail
  };
})(window);
