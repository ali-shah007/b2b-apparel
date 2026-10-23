(function () {
      var faqList = document.getElementById('bigbee-faq-list');
      if (faqList) {
        faqList.addEventListener('click', function (e) {
          var item = e.target.closest('.faq-item');
          if (!item) return;
          var wasOpen = item.classList.contains('is-open');
          faqList.querySelectorAll('.faq-item.is-open').forEach(function (open) { open.classList.remove('is-open'); });
          if (!wasOpen) item.classList.add('is-open');
        });
      }
      var form = document.getElementById('bigbee-contact-form');
      var note = document.getElementById('bigbee-contact-form-note');
      if (form) {
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          var captchaField = form.querySelector('[name="cf-turnstile-response"]');
          if (!captchaField || !captchaField.value) {
            if (note) {
              note.hidden = false;
              note.dataset.state = 'error';
              note.textContent = 'Please complete the security verification.';
            }
            return;
          }

          var submitButton = form.querySelector('button[type="submit"]');
          var submitLabel = submitButton ? submitButton.querySelector('span') : null;
          var originalLabel = submitLabel ? submitLabel.textContent : '';

          if (submitButton) {
            submitButton.disabled = true;
            submitButton.setAttribute('aria-busy', 'true');
          }
          if (submitLabel) submitLabel.textContent = 'Sending...';
          if (note) {
            note.hidden = false;
            note.dataset.state = 'pending';
            note.textContent = 'Sending your inquiry securely...';
          }

          try {
            var response = await fetch(form.action, {
              method: 'POST',
              body: new FormData(form),
              headers: { 'Accept': 'application/json' },
              credentials: 'same-origin'
            });
            var result = await response.json();
            if (!response.ok || !result.success) {
              throw new Error(result.message || 'We could not send your inquiry right now.');
            }

            form.reset();
            if (note) {
              note.dataset.state = 'success';
              note.textContent = result.message;
            }
          } catch (error) {
            if (note) {
              note.dataset.state = 'error';
              note.textContent = error && error.message
                ? error.message
                : 'We could not send your inquiry right now. Please try again or contact us directly.';
            }
          } finally {
            if (window.turnstile) {
              window.turnstile.reset(form.querySelector('.cf-turnstile'));
            }
            if (submitButton) {
              submitButton.disabled = false;
              submitButton.removeAttribute('aria-busy');
            }
            if (submitLabel) submitLabel.textContent = originalLabel;
          }
        });
      }

      var hero = document.querySelector('.ct-hero');
      var heroMedia = document.querySelector('.ct-hero__media');
      var canMoveHero = window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (hero && heroMedia && canMoveHero) {
        hero.addEventListener('pointermove', function (e) {
          var rect = hero.getBoundingClientRect();
          var x = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
          var y = ((e.clientY - rect.top) / rect.height - 0.5) * 10;
          heroMedia.style.setProperty('--ct-image-x', x.toFixed(2) + 'px');
          heroMedia.style.setProperty('--ct-image-y', y.toFixed(2) + 'px');
        });
        hero.addEventListener('pointerleave', function () {
          heroMedia.style.setProperty('--ct-image-x', '0px');
          heroMedia.style.setProperty('--ct-image-y', '0px');
        });
      }
    })();
