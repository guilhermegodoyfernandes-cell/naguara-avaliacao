// =============================================================================
// Front-end: formulário de avaliação + registro do Service Worker (PWA)
// =============================================================================

(function () {
  'use strict';

  /* ------------------- Formulário: exibir notas dos produtos ---------------- */
  const form = document.getElementById('review-form');
  if (form) {
    form.querySelectorAll('.product-rate').forEach(function (card) {
      const pick = card.querySelector('.pick input[type="checkbox"]');
      const aspects = card.querySelector('.aspects');
      const type = function (on) { aspects.hidden = !on; };

      pick.addEventListener('change', function () { type(pick.checked); });
      type(pick.checked);

      // Ao enviar, só produtos marcados são válidos; desliga inputs ocultos
      card.addEventListener('change', function () {
        if (!pick.checked) {
          aspects.querySelectorAll('input').forEach((i) => { i.checked = false; });
        }
      });
    });

    form.addEventListener('submit', function (event) {
      let ok = true;
      let anyProduct = false;

      form.querySelectorAll('.product-rate').forEach(function (card) {
        if (!card.querySelector('.pick input').checked) return;
        anyProduct = true;
        card.querySelectorAll('.aspect-row').forEach(function (row) {
          if (!row.querySelector('input:checked')) {
            ok = false;
            row.classList.add('aspect-missing');
          } else {
            row.classList.remove('aspect-missing');
          }
        });
      });

      const name = form.querySelector('#full_name');
      if (!name.value.trim()) ok = false;
      if (!ok || !anyProduct) {
        event.preventDefault();
        form.querySelectorAll('.alert-error').forEach(n => n.remove());
        const warn = document.createElement('div');
        warn.className = 'alert alert-error';
        warn.setAttribute('role', 'alert');
        warn.innerHTML = '<strong>Revise o formulário:</strong><ul>' +
          '<li>Informe seu nome completo.</li>' +
          '<li>Selecione pelo menos um produto e dê notas de 1 a 5 em todos os aspectos.</li></ul>';
        form.prepend(warn);
      }
    });
  }

  /* ------------------------------- PWA install ----------------------------- */
  let deferredPrompt = null;
  const installButton = document.getElementById('install-button');

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installButton) installButton.hidden = false;
  });

  if (installButton) {
    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installButton.hidden = true;
    });
  }

  // iOS/Safari: sem beforeinstallprompt — orienta o usuário a usar o menu nativo
  if (installButton) {
    installButton.addEventListener('click', function () {
      if (deferredPrompt) return;              // Chrome/Android: prompt oficial
      if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        alert("No iPhone/iPad: toque em Compartilhar e depois em 'Adicionar à Tela de Início'.");
      }
    });
  }

  // iOS não dispara beforeinstallprompt: mostra o botão e orienta o usuário
  if (installButton &&
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !window.matchMedia('(display-mode: standalone)').matches) {
    installButton.hidden = false;
  }
  /* ------------------------- Service Worker (PWA) -------------------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
})();
