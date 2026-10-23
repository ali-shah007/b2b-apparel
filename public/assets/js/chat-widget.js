(function () {
    'use strict';

    function createTawkAdapter(config, onStatusChange, onOpenChange) {
        var loadPromise = null;
        var loaded = false;
        var openRequested = false;

        function emitStatus(status) {
            onStatusChange(status === 'online' ? 'online' : status === 'away' ? 'away' : 'offline');
        }

        function chainCallback(api, name, callback) {
            var previous = typeof api[name] === 'function' ? api[name] : null;
            api[name] = function () {
                if (previous) previous.apply(api, arguments);
                callback.apply(api, arguments);
            };
        }

        function syncLoadedState(api) {
            var providerIsMaximized = typeof api.isChatMaximized === 'function' && api.isChatMaximized();
            var shouldOpen = config.restoreOpen || providerIsMaximized;
            config.restoreOpen = false;

            if (shouldOpen) {
                openRequested = true;
                onOpenChange(true);
                if (typeof api.showWidget === 'function') api.showWidget();
                window.setTimeout(function () {
                    if (typeof api.maximize === 'function') api.maximize();
                }, 0);
                return;
            }

            openRequested = false;
            onOpenChange(false);
            if (typeof api.hideWidget === 'function') api.hideWidget();
        }

        function load() {
            if (loadPromise) return loadPromise;
            if (!config.propertyId || !config.widgetId) {
                return Promise.reject(new Error('Live Chat is not configured yet. Please use WhatsApp or the sourcing form.'));
            }

            loadPromise = new Promise(function (resolve, reject) {
                var api = window.Tawk_API = window.Tawk_API || {};

                chainCallback(api, 'onBeforeLoad', function () {
                    if (!config.restoreOpen && typeof api.hideWidget === 'function') api.hideWidget();
                });
                chainCallback(api, 'onLoad', function () {
                    loaded = true;
                    syncLoadedState(api);
                    if (typeof api.getStatus === 'function') emitStatus(api.getStatus());
                    resolve(api);
                });
                chainCallback(api, 'onStatusChange', emitStatus);
                chainCallback(api, 'onChatMaximized', function () {
                    openRequested = true;
                    onOpenChange(true);
                });
                chainCallback(api, 'onChatMinimized', function () {
                    openRequested = false;
                    onOpenChange(false);
                    if (typeof api.hideWidget === 'function') api.hideWidget();
                });
                chainCallback(api, 'onChatHidden', function () {
                    if (!openRequested) onOpenChange(false);
                });

                if (typeof api.getStatus === 'function') {
                    loaded = true;
                    syncLoadedState(api);
                    emitStatus(api.getStatus());
                    resolve(api);
                    return;
                }

                var existing = document.getElementById('bb-tawk-script');
                if (existing) {
                    existing.addEventListener('error', function () {
                        reject(new Error('Live Chat could not be loaded. Please try WhatsApp instead.'));
                    }, { once: true });
                    return;
                }

                var script = document.createElement('script');
                script.id = 'bb-tawk-script';
                script.async = true;
                script.charset = 'UTF-8';
                script.crossOrigin = 'anonymous';
                script.src = 'https://embed.tawk.to/'
                    + encodeURIComponent(config.propertyId)
                    + '/'
                    + encodeURIComponent(config.widgetId);
                script.addEventListener('error', function () {
                    reject(new Error('Live Chat could not be loaded. Please try WhatsApp instead.'));
                }, { once: true });
                document.head.appendChild(script);
            });

            return loadPromise;
        }

        function open() {
            return load().then(function (api) {
                openRequested = true;
                onOpenChange(true);
                if (typeof api.showWidget === 'function') api.showWidget();
                window.setTimeout(function () {
                    if (typeof api.maximize === 'function') api.maximize();
                }, 0);
            });
        }

        function preload() {
            if (!config.propertyId || !config.widgetId || loaded) return;
            load().catch(function () {
                openRequested = false;
                onOpenChange(false);
                emitStatus('offline');
            });
        }

        return { open: open, preload: preload };
    }

    function createTurnstileAdapter(container) {
        var widgetId = null;
        var loadPromise = null;
        var siteKey = container ? container.dataset.turnstileSiteKey || '' : '';

        function waitForApi(resolve, reject, attempts) {
            if (window.turnstile && typeof window.turnstile.render === 'function') {
                resolve(window.turnstile);
                return;
            }
            if (attempts <= 0) {
                reject(new Error('Security verification could not be loaded.'));
                return;
            }
            window.setTimeout(function () {
                waitForApi(resolve, reject, attempts - 1);
            }, 50);
        }

        function load() {
            if (window.turnstile && typeof window.turnstile.render === 'function') {
                return Promise.resolve(window.turnstile);
            }
            if (loadPromise) return loadPromise;
            if (!siteKey) {
                return Promise.reject(new Error('Security verification is not configured. Please contact us directly.'));
            }

            loadPromise = new Promise(function (resolve, reject) {
                var existing = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]');
                if (!existing) {
                    existing = document.createElement('script');
                    existing.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                    existing.async = true;
                    existing.defer = true;
                    document.head.appendChild(existing);
                }
                existing.addEventListener('error', function () {
                    reject(new Error('Security verification could not be loaded.'));
                }, { once: true });
                waitForApi(resolve, reject, 200);
            });

            return loadPromise;
        }

        function render() {
            if (!container || widgetId !== null) return Promise.resolve(widgetId);
            return load().then(function (turnstile) {
                container.replaceChildren();
                widgetId = turnstile.render(container, {
                    sitekey: siteKey,
                    theme: 'light',
                    size: 'flexible'
                });
                return widgetId;
            });
        }

        function token() {
            var field = container ? container.querySelector('[name="cf-turnstile-response"]') : null;
            return field ? field.value : '';
        }

        function reset() {
            if (widgetId !== null && window.turnstile && typeof window.turnstile.reset === 'function') {
                window.turnstile.reset(widgetId);
            }
        }

        return { render: render, token: token, reset: reset };
    }

    function initBigBeeChatWidget() {
        var root = document.getElementById('bb-chat');
        if (!root || root.dataset.initialized === 'true') return;
        root.dataset.initialized = 'true';

        var panel = root.querySelector('.bb-chat__panel');
        var launcher = root.querySelector('.bb-chat__launcher');
        var closeButton = root.querySelector('.bb-chat__close');
        var backButton = root.querySelector('.bb-chat__back');
        var title = root.querySelector('#bb-chat-title');
        var views = Array.prototype.slice.call(root.querySelectorAll('[data-chat-view]'));
        var menuStatus = root.querySelector('.bb-chat__menu-status');
        var onlineIndicators = Array.prototype.slice.call(root.querySelectorAll('[data-online-indicator]'));
        var form = root.querySelector('#bb-sourcing-form');
        var formStatus = root.querySelector('.bb-chat__form-status');
        var uploadInput = form ? form.querySelector('[name="reference_image"]') : null;
        var uploadLabel = root.querySelector('[data-upload-label]');
        var turnstileContainer = root.querySelector('.bb-chat__turnstile');
        var discardDialog = root.querySelector('.bb-chat__discard');
        var keepButton = root.querySelector('[data-discard-action="keep"]');
        var discardButton = root.querySelector('[data-discard-action="discard"]');
        var currentView = 'menu';
        var formDirty = false;
        var lastFocusedElement = null;
        var pendingClose = false;
        var uploadMaxBytes = Number(root.dataset.uploadMaxBytes || 0);
        var whatsappHref = root.dataset.whatsappHref || '';
        var tawkOpenStorageKey = 'bigbee-tawk-open';
        var restoreTawkOpen = false;

        try {
            restoreTawkOpen = window.sessionStorage.getItem(tawkOpenStorageKey) === 'true';
        } catch (error) {
            restoreTawkOpen = false;
        }

        // A persisted value is only a request to restore Tawk, not proof that
        // its iframe is currently visible. Keep the BigBee launcher available
        // until the provider confirms the maximized state; otherwise slower
        // mobile loading or a blocked third-party script leaves no chat entry.
        launcher.hidden = false;
        root.dataset.tawkOpen = 'false';

        var viewTitles = {
            menu: 'HOW CAN WE HELP YOU?',
            'sourcing-form': 'Sourcing Request',
            'form-success': 'Request sent'
        };

        var tawk = createTawkAdapter({
            propertyId: root.dataset.tawkPropertyId || '',
            widgetId: root.dataset.tawkWidgetId || '',
            restoreOpen: restoreTawkOpen
        }, function (status) {
            var isOnline = status === 'online';
            onlineIndicators.forEach(function (indicator) {
                indicator.hidden = !isOnline;
            });
            launcher.dataset.liveStatus = status;
            launcher.setAttribute('aria-label', isOnline ? "Open Let's Chat — team online" : "Open Let's Chat");
        }, function (isOpen) {
            launcher.hidden = isOpen;
            root.dataset.tawkOpen = isOpen ? 'true' : 'false';
            try {
                if (isOpen) window.sessionStorage.setItem(tawkOpenStorageKey, 'true');
                else window.sessionStorage.removeItem(tawkOpenStorageKey);
            } catch (error) {
                // Storage can be unavailable in strict privacy modes; UI state still updates normally.
            }
        });
        var turnstile = createTurnstileAdapter(turnstileContainer);

        function focusableElements(container) {
            return Array.prototype.slice.call(container.querySelectorAll(
                'button:not([disabled]):not([hidden]), a[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )).filter(function (element) {
                return !element.closest('[hidden]') && element.getClientRects().length > 0;
            });
        }

        function setView(name, options) {
            options = options || {};
            currentView = name;
            panel.dataset.view = name;
            views.forEach(function (view) {
                var active = view.dataset.chatView === name;
                view.hidden = !active;
                view.classList.toggle('is-active', active);
            });
            title.textContent = viewTitles[name] || 'HOW CAN WE HELP YOU?';
            backButton.hidden = name === 'menu';
            panel.querySelector('.bb-chat__body').scrollTop = 0;

            if (name === 'sourcing-form') {
                turnstile.render().catch(function (error) {
                    setFormStatus('error', error.message);
                });
            }

            if (options.focus !== false) {
                window.requestAnimationFrame(function () {
                    var activeView = root.querySelector('[data-chat-view="' + name + '"]');
                    var focusables = activeView ? focusableElements(activeView) : [];
                    (focusables[0] || closeButton).focus({ preventScroll: true });
                });
            }
        }

        function openPanel() {
            if (!panel.hidden) return;
            lastFocusedElement = document.activeElement;
            panel.hidden = false;
            launcher.setAttribute('aria-expanded', 'true');
            menuStatus.textContent = '';
            setView('menu');
        }

        function completeClose() {
            panel.hidden = true;
            discardDialog.hidden = true;
            pendingClose = false;
            launcher.setAttribute('aria-expanded', 'false');
            setView('menu', { focus: false });
            var focusTarget = lastFocusedElement && document.contains(lastFocusedElement)
                ? lastFocusedElement
                : launcher;
            focusTarget.focus({ preventScroll: true });
        }

        function askToDiscard() {
            pendingClose = true;
            discardDialog.hidden = false;
            window.requestAnimationFrame(function () {
                keepButton.focus({ preventScroll: true });
            });
        }

        function attemptClose(options) {
            options = options || {};
            if (panel.hidden) return;
            if (formDirty && !options.preserveDraft && !options.force) {
                askToDiscard();
                return;
            }
            completeClose();
        }

        function resetForm() {
            if (!form) return;
            form.reset();
            formDirty = false;
            if (uploadLabel) uploadLabel.textContent = 'Upload Reference File';
            if (formStatus) formStatus.hidden = true;
            turnstile.reset();
        }

        function setFormStatus(state, message) {
            if (!formStatus) return;
            formStatus.hidden = false;
            formStatus.dataset.state = state;
            formStatus.textContent = message;
        }

        function validateContactField() {
            var field = form.querySelector('[name="contact"]');
            var value = field.value.trim();
            var looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            var digits = value.replace(/\D/g, '');
            var looksLikePhone = /^[+()\d\s.-]+$/.test(value) && digits.length >= 7 && digits.length <= 18;
            field.setCustomValidity(looksLikeEmail || looksLikePhone ? '' : 'Enter a valid email address or WhatsApp number.');
            return field.checkValidity();
        }

        function validateUpload() {
            if (!uploadInput || !uploadInput.files.length) return true;
            var file = uploadInput.files[0];
            var allowedTypes = [
                'image/jpeg',
                'image/png',
                'image/webp',
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/zip',
                'application/x-zip-compressed'
            ];
            var allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'docx', 'pptx'];
            var extension = file.name.indexOf('.') === -1 ? '' : file.name.split('.').pop().toLowerCase();
            var error = '';
            if (uploadMaxBytes && file.size > uploadMaxBytes) {
                error = 'The reference file is larger than the allowed upload size.';
            } else if (allowedExtensions.indexOf(extension) === -1 || (file.type && allowedTypes.indexOf(file.type) === -1)) {
                error = 'Upload a JPG, PNG, WebP, PDF, DOCX, or PPTX file.';
            }
            uploadInput.setCustomValidity(error);
            return !error;
        }

        launcher.addEventListener('click', function () {
            if (panel.hidden) openPanel();
            else attemptClose();
        });

        closeButton.addEventListener('click', function () {
            attemptClose();
        });

        backButton.addEventListener('click', function () {
            discardDialog.hidden = true;
            pendingClose = false;
            setView('menu');
        });

        root.addEventListener('click', function (event) {
            var actionButton = event.target.closest('[data-chat-action]');
            if (!actionButton) return;
            var action = actionButton.dataset.chatAction;

            if (action === 'sourcing-form') {
                setView('sourcing-form');
            } else if (action === 'whatsapp') {
                if (whatsappHref) {
                    window.open(whatsappHref, '_blank', 'noopener,noreferrer');
                    attemptClose({ force: true, preserveDraft: true });
                } else {
                    menuStatus.textContent = 'WhatsApp is temporarily unavailable. Please use the sourcing form.';
                }
            } else if (action === 'back-menu') {
                setView('menu');
            } else if (action === 'live-chat') {
                actionButton.disabled = true;
                actionButton.setAttribute('aria-busy', 'true');
                menuStatus.textContent = '';
                attemptClose({ force: true, preserveDraft: true });
                tawk.open().catch(function (error) {
                    openPanel();
                    menuStatus.textContent = error.message;
                }).finally(function () {
                    actionButton.disabled = false;
                    actionButton.removeAttribute('aria-busy');
                });
            }
        });

        keepButton.addEventListener('click', function () {
            discardDialog.hidden = true;
            pendingClose = false;
            var activeView = root.querySelector('[data-chat-view="' + currentView + '"]');
            var focusables = activeView ? focusableElements(activeView) : [];
            (focusables[0] || closeButton).focus({ preventScroll: true });
        });

        discardButton.addEventListener('click', function () {
            resetForm();
            discardDialog.hidden = true;
            if (pendingClose) completeClose();
        });

        document.addEventListener('pointerdown', function (event) {
            if (!panel.hidden && !root.contains(event.target)) attemptClose();
        });

        panel.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                if (!discardDialog.hidden) {
                    discardDialog.hidden = true;
                    pendingClose = false;
                } else {
                    attemptClose();
                }
                return;
            }
            if (event.key !== 'Tab') return;
            var scope = discardDialog.hidden ? panel : discardDialog;
            var focusables = focusableElements(scope);
            if (!focusables.length) return;
            var first = focusables[0];
            var last = focusables[focusables.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });

        if (form) {
            form.addEventListener('input', function (event) {
                if (event.target.name && event.target.name !== 'cf-turnstile-response') formDirty = true;
                if (event.target.name === 'contact') validateContactField();
            });
            form.addEventListener('change', function (event) {
                if (event.target.name && event.target.name !== 'cf-turnstile-response') formDirty = true;
            });

            uploadInput.addEventListener('change', function () {
                validateUpload();
                uploadLabel.textContent = uploadInput.files.length
                    ? uploadInput.files[0].name
                    : 'Upload Reference Image';
            });

            form.addEventListener('focusin', function (event) {
                if (!window.visualViewport) return;
                window.setTimeout(function () {
                    event.target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                }, 220);
            });

            form.addEventListener('submit', function (event) {
                event.preventDefault();
                validateContactField();
                validateUpload();
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }
                if (!turnstile.token()) {
                    setFormStatus('error', 'Please complete the security verification.');
                    return;
                }

                var submitButton = form.querySelector('[type="submit"]');
                var submitLabel = submitButton.querySelector('span');
                var originalLabel = submitLabel.textContent;
                submitButton.disabled = true;
                submitButton.setAttribute('aria-busy', 'true');
                submitLabel.textContent = 'Sending…';
                setFormStatus('pending', 'Sending your sourcing request securely…');

                fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin'
                }).then(function (response) {
                    return response.json().catch(function () {
                        throw new Error('The server returned an unexpected response.');
                    }).then(function (result) {
                        if (!response.ok || !result.success) {
                            throw new Error(result.message || 'We could not send your request right now.');
                        }
                        return result;
                    });
                }).then(function () {
                    resetForm();
                    setView('form-success');
                }).catch(function (error) {
                    setFormStatus('error', error.message || 'We could not send your request right now. Please try again.');
                    turnstile.reset();
                }).finally(function () {
                    submitButton.disabled = false;
                    submitButton.removeAttribute('aria-busy');
                    submitLabel.textContent = originalLabel;
                });
            });
        }

        window.addEventListener('beforeunload', function (event) {
            if (!formDirty) return;
            event.preventDefault();
            event.returnValue = '';
        });

        function updateVisualViewport() {
            var viewport = window.visualViewport;
            if (!viewport) {
                root.style.setProperty('--bb-chat-viewport-height', '100dvh');
                root.style.setProperty('--bb-chat-keyboard-offset', '0px');
                return;
            }
            var keyboardOffset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
            root.style.setProperty('--bb-chat-viewport-height', viewport.height + 'px');
            root.style.setProperty('--bb-chat-keyboard-offset', keyboardOffset + 'px');
        }

        updateVisualViewport();
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateVisualViewport);
            window.visualViewport.addEventListener('scroll', updateVisualViewport);
        }

        function deferTawkPreload() {
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(function () { tawk.preload(); }, { timeout: 6000 });
            } else {
                window.setTimeout(function () { tawk.preload(); }, 3500);
            }
        }
        if (restoreTawkOpen) {
            // Restore an already-open conversation promptly. The ordinary
            // background status preload remains deferred for first-time visits.
            tawk.preload();
        } else if (document.readyState === 'complete') {
            deferTawkPreload();
        } else {
            window.addEventListener('load', deferTawkPreload, { once: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBigBeeChatWidget, { once: true });
    } else {
        initBigBeeChatWidget();
    }
})();
