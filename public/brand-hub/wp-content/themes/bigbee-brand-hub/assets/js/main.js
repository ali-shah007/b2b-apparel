/**
 * BigBee Brand Hub — theme JavaScript.
 *
 * Two behaviors ported from the reference site, dependency-free:
 * 1. Mobile hamburger/drawer with accordion submenus (script.js
 *    initStreetwearPage()/initMobileMenu() pattern).
 * 2. The "reveal" footer spacer (script.js initFixedFooterSpacer()) — the
 *    footer is fixed to the viewport bottom, so <main> needs a matching
 *    margin-bottom for normal scrolling to uncover it.
 *
 * The desktop mega menus are intentionally pure CSS (:hover / :focus-within
 * in main.css) — no JS is needed for them, matching the reference site.
 */
( function () {
	'use strict';

	function initMobileDrawer() {
		var hamburger = document.getElementById( 'bigbee-hamburger' );
		var drawer = document.getElementById( 'bigbee-mobile-drawer' );
		var closeButton = document.getElementById( 'bigbee-drawer-close' );
		var overlay = document.getElementById( 'bigbee-drawer-overlay' );

		if ( ! hamburger || ! drawer ) {
			return;
		}

		function openDrawer() {
			drawer.classList.add( 'is-open' );
			hamburger.classList.add( 'open' );
			hamburger.setAttribute( 'aria-expanded', 'true' );
			drawer.setAttribute( 'aria-hidden', 'false' );
			document.body.style.overflow = 'hidden';
		}

		function closeDrawer() {
			drawer.classList.remove( 'is-open' );
			hamburger.classList.remove( 'open' );
			hamburger.setAttribute( 'aria-expanded', 'false' );
			drawer.setAttribute( 'aria-hidden', 'true' );
			document.body.style.overflow = '';
		}

		hamburger.addEventListener( 'click', function () {
			if ( drawer.classList.contains( 'is-open' ) ) {
				closeDrawer();
			} else {
				openDrawer();
			}
		} );

		if ( closeButton ) {
			closeButton.addEventListener( 'click', closeDrawer );
		}

		if ( overlay ) {
			overlay.addEventListener( 'click', closeDrawer );
		}

		document
			.querySelectorAll( '.bigbee-mobile-nav__list > .bigbee-mobile-nav__item > .bigbee-mobile-nav__link, .bigbee-mobile-subnav__link' )
			.forEach( function ( link ) {
				link.addEventListener( 'click', closeDrawer );
			} );

		document.querySelectorAll( '.bigbee-mobile-nav__toggle' ).forEach( function ( toggle ) {
			toggle.addEventListener( 'click', function ( event ) {
				event.stopPropagation();
				var parentItem = toggle.closest( '.bigbee-mobile-nav__item--has-sub' );
				if ( ! parentItem ) {
					return;
				}
				var isExpanded = parentItem.classList.toggle( 'is-expanded' );
				toggle.setAttribute( 'aria-expanded', isExpanded ? 'true' : 'false' );
			} );
		} );

		document.addEventListener( 'keydown', function ( event ) {
			if ( 'Escape' === event.key && drawer.classList.contains( 'is-open' ) ) {
				closeDrawer();
			}
		} );
	}

	function initFooterSpacer() {
		var main = document.querySelector( 'main.bigbee-main' );
		var footer = document.getElementById( 'footer' );

		if ( ! main || ! footer ) {
			return;
		}

		function updateSpacer() {
			main.style.marginBottom = footer.offsetHeight + 'px';
		}

		updateSpacer();
		window.addEventListener( 'resize', updateSpacer );

		if ( 'ResizeObserver' in window ) {
			new ResizeObserver( updateSpacer ).observe( footer );
		}
	}

	window.initTABrandHub = function () {
		initMobileDrawer();
		initFooterSpacer();
	};
} )();
