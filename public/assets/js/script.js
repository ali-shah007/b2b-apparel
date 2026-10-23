/**
 * BIGBEE APPARELS - MAIN SCRIPT
 * Framework: GSAP + Lenis Smooth Scroll
 */

window.initTASite = () => {
    initGlobalCursor();
    initFixedFooterSpacer();
    initScrollReveal();
    initCapabilityNav();
    initMseBulkInteractions();
    initAuEthicsInteractions();

    const mobileStaticHomepage = window.matchMedia("(max-width: 768px)").matches;
    if (mobileStaticHomepage) {
        document.querySelectorAll('a[href="/?skip-intro=1#about-bigbee"]').forEach((homeLink) => {
            homeLink.setAttribute("href", "/");
        });
    }

    if (document.body.classList.contains("bigbee-bespoke-page")) {
        initBespokePage();
        return;
    }
    if (document.body.classList.contains("bigbee-streetwear-page")) {
        initStreetwearPage();
        return;
    }
    const skipHomepageIntro = document.body.classList.contains("bigbee-home-content-entry")
        || window.bigbeeSkipHomepageIntro === true;
    let homepageContentEntryReady = !skipHomepageIntro;
    let homepageContentEntryReverseQueued = false;
    let homepageContentEntryUserScrolled = false;
    // Enable full-page scroll lock while preloading
    if (skipHomepageIntro) {
        document.body.classList.remove("is-preloading");
    } else {
        document.body.classList.add("is-preloading");
    }
    window.resizeScene1Canvas = null;
    window.preloadedScene1Images = [];
    const SCENE2_FRAME_NUMBERS = Array.from({ length: 129 }, (_, index) => 105 + index);
    const SCENE2_FRAME_INDEX = new Map(
        SCENE2_FRAME_NUMBERS.map((frameNumber, index) => [frameNumber, index])
    );

    // --------------------------------------------------------------------------
    // 0. FULL PAGE PRELOADER & INITIALIZATION ENGINE
    // --------------------------------------------------------------------------
    function initLegacySitePreloader() {
        const preloader = document.getElementById("site-preloader");
        const progressBar = document.getElementById("preloader-progress-bar");
        const tapeMarkings = document.getElementById("preloader-tape-markings");

        if (!preloader) return;

        // Build a genuine 1–100 tape scale. Every unit gets a tick, while the
        // first unit and each ten-unit interval receive a readable number.
        if (tapeMarkings && !tapeMarkings.childElementCount) {
            const svgNamespace = "http://www.w3.org/2000/svg";
            const firstTickX = 12;
            const lastTickX = 696;
            for (let unit = 1; unit <= 100; unit++) {
                const x = firstTickX + ((unit - 1) / 99) * (lastTickX - firstTickX);
                const tick = document.createElementNS(svgNamespace, "line");
                const isMajor = unit === 1 || unit % 10 === 0;
                const isMid = unit % 5 === 0;
                tick.setAttribute("x1", x.toFixed(2));
                tick.setAttribute("x2", x.toFixed(2));
                tick.setAttribute("y1", "14");
                tick.setAttribute("y2", isMajor ? "34" : (isMid ? "29" : "24"));
                tick.setAttribute("fill", "none");
                tick.setAttribute("stroke", "currentColor");
                tick.setAttribute("stroke-width", isMajor ? "1.8" : "1.2");
                tick.setAttribute("stroke-linecap", "round");
                tapeMarkings.appendChild(tick);

                if (isMajor) {
                    const label = document.createElementNS(svgNamespace, "text");
                    label.setAttribute("x", x.toFixed(2));
                    label.setAttribute("y", "53");
                    label.setAttribute("text-anchor", unit === 1 ? "start" : (unit === 100 ? "end" : "middle"));
                    label.setAttribute("fill", "currentColor");
                    label.setAttribute("stroke", "none");
                    label.textContent = String(unit);
                    tapeMarkings.appendChild(label);
                }
            }
        }

        // 1. Scene 1 is intentionally skipped and its deleted frames are not requested.

        // 2. Add frames of all active scenes (2 to 6) to the load queue.
        // Mobile keeps Scene 0 static and never downloads these sequences.
        const otherSceneUrls = [];
        if (!mobileStaticHomepage) {
            // Scene 2: 105 to 233
            SCENE2_FRAME_NUMBERS.forEach((frameNumber) => {
                otherSceneUrls.push(`/assets/images/animation/scene-2/frame-${String(frameNumber).padStart(4, "0")}.avif`);
            });
            // Scene 3: 234 to 402
            for (let i = 234; i <= 402; i++) {
                otherSceneUrls.push(`/assets/images/animation/scene-3/frame-${String(i).padStart(4, "0")}.avif`);
            }
            // Scene 4: 441 to 798
            for (let i = 441; i <= 798; i++) {
                otherSceneUrls.push(`/assets/images/animation/scene-4/frame-${String(i).padStart(4, "0")}.avif`);
            }
            // Scene 5: 860 to 902
            for (let i = 860; i <= 902; i++) {
                otherSceneUrls.push(`/assets/images/animation/scene-5/frame-${String(i).padStart(4, "0")}.avif`);
            }
            // Scene 6: 939 to 1407
            for (let i = 939; i <= 1407; i++) {
                otherSceneUrls.push(`/assets/images/animation/scene-6/frame-${String(i).padStart(4, "0")}.avif`);
            }
        }

        // 3. Add only the static backgrounds used by the hero journey.
        const heroRequiredUrls = [
            "/assets/images/hero-background.jpg",
            "/assets/images/hero-background-hover.jpg",
            "/assets/images/yellow-gradient-background.jpg"
        ];

        // Combine and deduplicate everything
        const allUrls = [...new Set([...heroRequiredUrls, ...otherSceneUrls])];
        
        let loadedCount = 0;
        const totalCount = allUrls.length;

        function updateProgress(percent) {
            const rounded = Math.min(100, Math.round(percent));
            if (progressBar) {
                progressBar.setAttribute("width", String(4 + ((rounded / 100) * 712)));
                progressBar.closest("svg")?.setAttribute("aria-label", `Loading ${rounded}%`);
            }
        }

        function onAssetLoaded(url, img) {
            const match = url.match(/frame-(\d+)\.avif/);
            if (match) {
                const frameVal = parseInt(match[1], 10);
                if (url.includes("scene-2/frame-")) {
                    const packedIndex = SCENE2_FRAME_INDEX.get(frameVal);
                    if (packedIndex !== undefined) window.scene2Images[packedIndex] = img;
                } else if (url.includes("scene-3/frame-")) {
                    window.scene3Images[frameVal - 234] = img;
                } else if (url.includes("scene-4/frame-")) {
                    window.scene4Images[frameVal - 441] = img;
                } else if (url.includes("scene-5/frame-")) {
                    window.scene5Images[frameVal - 860] = img;
                } else if (url.includes("scene-6/frame-")) {
                    window.scene6Images[frameVal - 939] = img;
                }
            }

            loadedCount++;
            const percent = (loadedCount / totalCount) * 100;
            updateProgress(percent);

            if (loadedCount >= totalCount) {
                finishPreloader();
            }
        }

        function finishPreloader() {
            // Set all scene loading flags to true to bypass lazy loading triggers
            sceneLoadStatuses[2] = true;
            sceneLoadStatuses[3] = true;
            sceneLoadStatuses[4] = true;
            sceneLoadStatuses[5] = true;
            sceneLoadStatuses[6] = true;

            // Trigger initial rendering on all canvasses
            if (typeof window.resizeScene1Canvas === "function") window.resizeScene1Canvas();
            if (typeof window.resizeScene2Canvas === "function") window.resizeScene2Canvas();
            if (typeof window.resizeScene3Canvas === "function") window.resizeScene3Canvas();
            if (typeof window.resizeScene4Canvas === "function") window.resizeScene4Canvas();
            if (typeof window.resizeScene5Canvas === "function") window.resizeScene5Canvas();
            if (typeof window.resizeScene6Canvas === "function") window.resizeScene6Canvas();

            // Animate out the preloader using GSAP
            if (typeof gsap !== "undefined") {
                const leftCurtain = preloader.querySelector(".preloader-curtain--left");
                const rightCurtain = preloader.querySelector(".preloader-curtain--right");
                const cutPath = preloader.querySelector(".preloader-cut-path");
                const cutProgress = preloader.querySelector(".preloader-cut-progress");
                const scissors = preloader.querySelector(".preloader-scissors");
                const upperScissorHalf = preloader.querySelector(".preloader-scissor-half--upper");
                const lowerScissorHalf = preloader.querySelector(".preloader-scissor-half--lower");
                const tl = gsap.timeline({
                    onComplete: () => {
                        preloader.style.display = "none";
                        document.body.classList.remove("is-preloading");
                        if (lenis) {
                            lenis.start();
                        }
                        if (window.ScrollTrigger) {
                            ScrollTrigger.refresh();
                        }
                    }
                });

                tl.to(".preloader-content", {
                    opacity: 0,
                    y: -12,
                    duration: 0.35,
                    ease: "power2.inOut"
                })
                .set(cutPath, { autoAlpha: 1 })
                .set(scissors, {
                    autoAlpha: 1,
                    y: () => window.innerHeight + 64,
                    xPercent: -50,
                    yPercent: -50,
                    rotation: -92,
                    transformOrigin: "50% 50%",
                    force3D: true
                })
                .to(cutProgress, {
                    scaleY: 1,
                    duration: 2.2,
                    ease: "sine.inOut"
                })
                .to(scissors, {
                    y: -64,
                    rotation: -88,
                    force3D: true,
                    duration: 2.2,
                    ease: "sine.inOut"
                }, "<")
                .to(upperScissorHalf, {
                    rotation: 11,
                    svgOrigin: "26 20",
                    duration: 0.275,
                    repeat: 7,
                    yoyo: true,
                    ease: "sine.inOut"
                }, "<")
                .to(lowerScissorHalf, {
                    rotation: -11,
                    svgOrigin: "26 20",
                    duration: 0.275,
                    repeat: 7,
                    yoyo: true,
                    ease: "sine.inOut"
                }, "<")
                .to(cutPath, {
                    autoAlpha: 0,
                    duration: 0.18,
                    ease: "sine.out"
                })
                .to(leftCurtain, {
                    xPercent: -100,
                    duration: 1.05,
                    ease: "power4.inOut"
                }, "<")
                .to(rightCurtain, {
                    xPercent: 100,
                    duration: 1.05,
                    ease: "power4.inOut"
                }, "<");
            } else {
                preloader.style.opacity = "0";
                setTimeout(() => {
                    preloader.style.display = "none";
                    document.body.classList.remove("is-preloading");
                    if (lenis) lenis.start();
                }, 800);
            }
        }

        if (totalCount === 0) {
            finishPreloader();
        } else {
            allUrls.forEach(url => {
                const img = new Image();
                img.onload = () => onAssetLoaded(url, img);
                img.onerror = () => onAssetLoaded(url, img);
                img.src = url;
            });
        }
    }

    function initSitePreloader() {
        const preloader = document.getElementById("site-preloader");
        const progressBar = document.getElementById("preloader-progress-bar");
        const tapeMarkings = document.getElementById("preloader-tape-markings");
        const tapeRollout = document.getElementById("preloader-tape-rollout");
        const tapePullEnd = document.getElementById("preloader-tape-pull-end");
        const tapeRoll = document.getElementById("preloader-tape-roll");
        const rasterStage = document.getElementById("preloader-raster-stage");
        const rasterWindow = document.getElementById("preloader-raster-window");
        const tapeRender = document.getElementById("preloader-tape-render");
        const movingRoll = document.getElementById("preloader-moving-roll");
        const composition = document.getElementById("preloader-composition");
        const logo = preloader?.querySelector(".preloader-logo");
        const tapeContainer = preloader?.querySelector(".preloader-progress-container");
        const tagline = preloader?.querySelector(".preloader-tagline");

        if (!preloader) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const preloaderStartedAt = performance.now();
        const minimumDuration = reducedMotion ? 650 : 1850;
        const tapeViewBoxWidth = 800;
        const tapeMinimumEdge = 82;
        const tapeMaximumEdge = 700;
        const startingVisualProgress = 25;
        const milestoneValues = [50, 75];
        const settledMilestones = new Set();
        let actualProgress = 0;
        let visualProgress = startingVisualProgress;
        let milestoneHoldUntil = 0;
        let assetsAreReady = false;
        let exitHasStarted = false;
        let previousProgressTick = performance.now();
        let fallbackAnimationFrame = null;

        if (tapeMarkings && !tapeMarkings.childElementCount) {
            const svgNamespace = "http://www.w3.org/2000/svg";
            const firstTickX = 58;
            const lastTickX = 666;

            for (let unit = 0; unit <= 100; unit++) {
                const x = firstTickX + (unit / 100) * (lastTickX - firstTickX);
                const tick = document.createElementNS(svgNamespace, "line");
                const isLabel = unit % 25 === 0;
                const isMajor = unit % 10 === 0;
                const isMid = unit % 5 === 0;
                tick.setAttribute("x1", x.toFixed(2));
                tick.setAttribute("x2", x.toFixed(2));
                tick.setAttribute("y1", "32");
                tick.setAttribute("y2", isLabel ? "59" : (isMajor ? "54" : (isMid ? "49" : "43")));
                tick.setAttribute("fill", "none");
                tick.setAttribute("stroke", "currentColor");
                tick.setAttribute("stroke-width", isLabel ? "2.2" : (isMajor ? "1.8" : "1.15"));
                tapeMarkings.appendChild(tick);

                if (isLabel) {
                    const label = document.createElementNS(svgNamespace, "text");
                    label.setAttribute("x", x.toFixed(2));
                    label.setAttribute("y", "83");
                    label.setAttribute("text-anchor", "middle");
                    label.setAttribute("fill", "currentColor");
                    label.textContent = String(unit);
                    tapeMarkings.appendChild(label);
                }
            }
        }

        function renderTapeProgress(percent) {
            const clamped = Math.max(0, Math.min(100, percent));
            const rasterVisiblePercent = 9 + (clamped * 0.91);
            const rasterRightEdge = 50 + (rasterVisiblePercent / 2);
            // The photographed curl occupies the final ~23% of the source image.
            // Keep that complete crop at every stage so its outer left loop is
            // never sliced off as the rollout begins.
            const movingRollWidth = 23.35;
            const movingRollOverlap = 0.35;
            const visibleEdge = tapeMinimumEdge
                + ((tapeMaximumEdge - tapeMinimumEdge) * clamped / 100);
            // The metal fitting begins at local x=4 and the pull edge extends
            // four units beyond visibleEdge, so this offset centers the actual
            // painted bounds rather than merely centering the clip rectangle.
            const centeredOffset = (tapeViewBoxWidth - visibleEdge - 8) / 2;

            if (progressBar) {
                progressBar.setAttribute("width", String(Math.max(0, visibleEdge - 28)));
            }
            if (tapeRollout) {
                tapeRollout.setAttribute("transform", `translate(${centeredOffset.toFixed(2)} 0)`);
            }
            if (tapePullEnd) {
                tapePullEnd.setAttribute("transform", `translate(${visibleEdge.toFixed(2)} 0)`);
            }
            if (tapeRoll) {
                tapeRoll.setAttribute("transform", `translate(${(visibleEdge - 14).toFixed(2)} 0)`);
            }
            if (rasterWindow) {
                rasterWindow.style.width = `${rasterVisiblePercent.toFixed(3)}%`;
                rasterWindow.classList.toggle("is-complete", clamped >= 99.6);
            }
            if (movingRoll) {
                movingRoll.style.width = `${movingRollWidth.toFixed(3)}%`;
                movingRoll.style.left = `${(rasterRightEdge - movingRollWidth + movingRollOverlap).toFixed(3)}%`;
                // The curl masks unreached scale values as it travels. At the
                // final frame it clears, revealing the complete 10–100 scale.
                movingRoll.style.opacity = clamped >= 99.6 ? "0" : "1";
            }

            preloader.setAttribute("aria-valuenow", String(Math.round(clamped)));
        }

        function emphasizeMilestone(value) {
            if (reducedMotion || !tapeContainer || typeof gsap === "undefined") return;
            gsap.fromTo(tapeContainer,
                { scaleX: 1.008, scaleY: 0.992 },
                {
                    scaleX: 1,
                    scaleY: 1,
                    duration: 0.16,
                    ease: "back.out(2.2)",
                    overwrite: true
                }
            );
            if (movingRoll) {
                gsap.fromTo(movingRoll,
                    { rotation: -1.2, y: -3 },
                    {
                        rotation: 0,
                        y: 0,
                        duration: 0.22,
                        ease: "back.out(1.8)",
                        overwrite: true
                    }
                );
            }
            preloader.dataset.milestone = String(value);
        }

        function prepareHomepageCanvases() {
            sceneLoadStatuses[2] = true;
            sceneLoadStatuses[3] = true;
            sceneLoadStatuses[4] = true;
            sceneLoadStatuses[5] = true;
            sceneLoadStatuses[6] = true;

            if (mobileStaticHomepage) return;

            if (typeof window.resizeScene1Canvas === "function") window.resizeScene1Canvas();
            if (typeof window.resizeScene2Canvas === "function") window.resizeScene2Canvas();
            if (typeof window.resizeScene3Canvas === "function") window.resizeScene3Canvas();
            if (typeof window.resizeScene4Canvas === "function") window.resizeScene4Canvas();
            if (typeof window.resizeScene5Canvas === "function") window.resizeScene5Canvas();
            if (typeof window.resizeScene6Canvas === "function") window.resizeScene6Canvas();
        }

        function releaseHomepage() {
            preloader.remove();
            document.body.classList.remove("is-preloading");
            if (lenis) lenis.start();
            if (window.ScrollTrigger) ScrollTrigger.refresh();
        }

        function finishPreloader() {
            if (exitHasStarted) return;
            exitHasStarted = true;
            visualProgress = 100;
            renderTapeProgress(100);
            if (tagline) tagline.hidden = true;
            prepareHomepageCanvases();

            if (typeof gsap === "undefined") {
                preloader.style.transition = "opacity 0.4s ease";
                preloader.style.opacity = "0";
                window.setTimeout(releaseHomepage, 420);
                return;
            }

            const finalRolloutOffset = (tapeViewBoxWidth - 748) / 2;
            const timeline = gsap.timeline({ onComplete: releaseHomepage });

            if (reducedMotion) {
                timeline
                    .to({}, { duration: 0.18 })
                    .to(preloader, { autoAlpha: 0, duration: 0.32, ease: "sine.out" });
                return;
            }

            gsap.set(tapeRoll, {
                autoAlpha: 0,
                scale: 0.58,
                rotation: -7,
                svgOrigin: "0 61"
            });

            timeline
                .to(rasterStage, {
                    rotationZ: 0,
                    rotationX: 0.4,
                    y: -2,
                    duration: 0.56,
                    ease: "power3.out"
                }, 0)
                .to(tapeRender, {
                    scale: 1.006,
                    duration: 0.56,
                    ease: "sine.inOut"
                }, 0)
                .to(tapePullEnd, { autoAlpha: 0, duration: 0.18, ease: "sine.out" }, 0)
                .to(tapeRollout, {
                    attr: { transform: `translate(${finalRolloutOffset} 0)` },
                    duration: 0.56,
                    ease: "power3.inOut"
                }, 0)
                .to(tapeRoll, {
                    autoAlpha: 1,
                    scale: 1,
                    rotation: 0,
                    duration: 0.56,
                    ease: "back.out(1.7)"
                }, 0.04)
                .to(composition, {
                    scale: 1.012,
                    duration: 0.58,
                    ease: "sine.inOut"
                }, 0.08)
                .to({}, { duration: 0.32 })
                .to(composition, {
                    scale: 1.025,
                    y: -6,
                    duration: 0.62,
                    ease: "power2.in"
                })
                .to(preloader, {
                    autoAlpha: 0,
                    duration: 0.62,
                    ease: "power2.inOut"
                }, "<");
        }

        function progressTick() {
            if (exitHasStarted) return;

            const now = performance.now();
            const deltaMs = Math.min(50, Math.max(1, now - previousProgressTick));
            previousProgressTick = now;
            const elapsed = now - preloaderStartedAt;
            const timeCeiling = Math.min(100, (elapsed / minimumDuration) * 100);
            const rawTarget = Math.min(actualProgress, timeCeiling);
            const target = startingVisualProgress + (rawTarget * 0.75);

            if (now >= milestoneHoldUntil) {
                const smoothing = 1 - Math.exp(-deltaMs / (reducedMotion ? 45 : 72));
                let nextProgress = visualProgress + ((target - visualProgress) * smoothing);
                if (target - nextProgress < 0.08) nextProgress = target;

                const pendingMilestone = milestoneValues.find((value) => !settledMilestones.has(value));
                if (
                    pendingMilestone !== undefined
                    && target >= pendingMilestone
                    && nextProgress >= pendingMilestone - 0.08
                ) {
                    visualProgress = pendingMilestone;
                    settledMilestones.add(pendingMilestone);
                    milestoneHoldUntil = now + (reducedMotion ? 0 : 110);
                    emphasizeMilestone(pendingMilestone);
                } else {
                    visualProgress = Math.max(visualProgress, nextProgress);
                }
                renderTapeProgress(visualProgress);
            }

            if (assetsAreReady && elapsed >= minimumDuration && visualProgress >= 99.6) {
                if (typeof gsap !== "undefined") gsap.ticker.remove(progressTick);
                if (fallbackAnimationFrame !== null) cancelAnimationFrame(fallbackAnimationFrame);
                finishPreloader();
            } else if (typeof gsap === "undefined") {
                fallbackAnimationFrame = requestAnimationFrame(progressTick);
            }
        }

        function updateProgress(percent) {
            actualProgress = Math.max(actualProgress, Math.min(100, percent));
        }

        renderTapeProgress(startingVisualProgress);
        if (typeof gsap !== "undefined") {
            gsap.set(tapeContainer, { autoAlpha: 0, y: 8 });
            gsap.timeline()
                .to(logo, {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: reducedMotion ? 0.2 : 0.72,
                    ease: "power3.out"
                })
                .to(tapeContainer, {
                    autoAlpha: 1,
                    y: 0,
                    duration: reducedMotion ? 0.2 : 0.48,
                    ease: "power2.out"
                }, reducedMotion ? 0.08 : 0.18)
                .to(tagline, {
                    opacity: 0.48,
                    y: 0,
                    duration: reducedMotion ? 0.16 : 0.42,
                    ease: "sine.out"
                }, reducedMotion ? 0.12 : 0.28);
            gsap.ticker.add(progressTick);
        } else {
            if (logo) {
                logo.style.opacity = "1";
                logo.style.transform = "none";
            }
            fallbackAnimationFrame = requestAnimationFrame(progressTick);
        }

        const sceneUrls = [];

        if (!mobileStaticHomepage) {
            SCENE2_FRAME_NUMBERS.forEach((frameNumber) => {
                sceneUrls.push(`/assets/images/animation/scene-2/frame-${String(frameNumber).padStart(4, "0")}.avif`);
            });
            for (let i = 234; i <= 402; i++) {
                sceneUrls.push(`/assets/images/animation/scene-3/frame-${String(i).padStart(4, "0")}.avif`);
            }
            for (let i = 441; i <= 798; i++) {
                sceneUrls.push(`/assets/images/animation/scene-4/frame-${String(i).padStart(4, "0")}.avif`);
            }
            for (let i = 860; i <= 902; i++) {
                sceneUrls.push(`/assets/images/animation/scene-5/frame-${String(i).padStart(4, "0")}.avif`);
            }
            for (let i = 939; i <= 1407; i++) {
                sceneUrls.push(`/assets/images/animation/scene-6/frame-${String(i).padStart(4, "0")}.avif`);
            }
        }

        // Keep the blocking loader scoped to the opening hero journey. Images
        // below the hero load naturally or through their own local loader.
        const heroRequiredUrls = [
            "/assets/images/hero-background.jpg",
            "/assets/images/hero-background-hover.jpg",
            "/assets/images/yellow-gradient-background.jpg"
        ];
        const allUrls = [...new Set([...heroRequiredUrls, ...sceneUrls])];
        let loadedCount = 0;
        const totalCount = allUrls.length;

        function onAssetLoaded(url, img) {
            const match = url.match(/frame-(\d+)\.avif/);
            if (match) {
                const frameVal = parseInt(match[1], 10);
                if (url.includes("scene-2/frame-")) {
                    const packedIndex = SCENE2_FRAME_INDEX.get(frameVal);
                    if (packedIndex !== undefined) window.scene2Images[packedIndex] = img;
                } else if (url.includes("scene-3/frame-")) {
                    window.scene3Images[frameVal - 234] = img;
                } else if (url.includes("scene-4/frame-")) {
                    window.scene4Images[frameVal - 441] = img;
                } else if (url.includes("scene-5/frame-")) {
                    window.scene5Images[frameVal - 860] = img;
                } else if (url.includes("scene-6/frame-")) {
                    window.scene6Images[frameVal - 939] = img;
                }
            }

            loadedCount += 1;
            updateProgress((loadedCount / totalCount) * 100);
            if (loadedCount >= totalCount) {
                assetsAreReady = true;
                updateProgress(100);
            }
        }

        if (totalCount === 0) {
            assetsAreReady = true;
            updateProgress(100);
        } else {
            allUrls.forEach((url) => {
                const img = new Image();
                img.onload = () => onAssetLoaded(url, img);
                img.onerror = () => onAssetLoaded(url, img);
                img.src = url;
            });
        }
    }

    // Shared references and state for lazy preloading
    window.scene2Images = [];
    window.scene3Images = [];
    window.scene4Images = [];
    window.scene5Images = [];
    window.scene6Images = [];

    window.resizeScene2Canvas = null;
    window.resizeScene3Canvas = null;
    window.resizeScene4Canvas = null;
    window.resizeScene5Canvas = null;
    window.resizeScene6Canvas = null;

    const preloaderEl = document.getElementById("bigbee-scene-preloader");
    const preloaderProgress = document.getElementById("preloader-ring-progress");
    const preloaderLabel = document.getElementById("preloader-label");
    const scenePreloaderTitle = document.getElementById("scene-preloader-title");
    const scenePreloaderMessage = document.getElementById("scene-preloader-message");
    let scenePreloaderReadyTimer = null;
    const sceneLoadStatuses = {
        1: true, // Scene 1 is intentionally disabled; no frame files are requested
        2: false,
        3: false,
        4: false,
        5: false,
        6: false
    };

    function updatePreloaderCircle(percent) {
        if (preloaderProgress) {
            const circumference = 100.53;
            const offset = circumference - (percent / 100) * circumference;
            preloaderProgress.style.strokeDashoffset = offset;
        }
        if (preloaderLabel) {
            preloaderLabel.textContent = `${Math.round(percent)}%`;
        }
    }

    function showPreloader() {
        if (skipHomepageIntro && homepageContentEntryReady) return;
        if (preloaderEl) {
            preloaderEl.classList.add("is-loading");
            preloaderEl.setAttribute("aria-hidden", "false");
        }
    }

    function hidePreloader() {
        if (preloaderEl) {
            preloaderEl.classList.remove("is-loading");
            preloaderEl.setAttribute("aria-hidden", "true");
        }
    }

    function setContentEntryPreloadStatus(state) {
        if (!skipHomepageIntro || !preloaderEl || !scenePreloaderTitle || !scenePreloaderMessage) return;

        if (scenePreloaderReadyTimer) {
            clearTimeout(scenePreloaderReadyTimer);
            scenePreloaderReadyTimer = null;
        }

        preloaderEl.classList.remove("is-ready");
        if (state === "waiting") {
            scenePreloaderTitle.textContent = "Almost ready…";
            scenePreloaderMessage.textContent = "Your animation will begin automatically.";
            preloaderEl.classList.add("is-loading");
            preloaderEl.setAttribute("aria-hidden", "false");
            return;
        }

        if (state === "ready") {
            scenePreloaderTitle.textContent = "Animation ready";
            scenePreloaderMessage.textContent = "Scroll up to explore.";
            updatePreloaderCircle(100);
            preloaderEl.classList.add("is-loading", "is-ready");
            preloaderEl.setAttribute("aria-hidden", "false");
            scenePreloaderReadyTimer = setTimeout(() => {
                preloaderEl.classList.remove("is-loading", "is-ready");
                preloaderEl.setAttribute("aria-hidden", "true");
                scenePreloaderReadyTimer = null;
            }, 2400);
            return;
        }

        scenePreloaderTitle.textContent = "Preparing animation…";
        scenePreloaderMessage.textContent = "You can keep browsing. Scroll up when ready.";
        preloaderEl.classList.add("is-loading");
        preloaderEl.setAttribute("aria-hidden", "false");
    }

    // Helper padZero
    function padZero(num, size) {
        let s = num + "";
        while (s.length < size) s = "0" + s;
        return s;
    }

    let activePreloadScene = null;
    const preloadQueue = [];

    // Centralized preload function for a scene's images
    window.preloadScene = function(sceneNum, callback) {
        if (mobileStaticHomepage) {
            if (sceneLoadStatuses[sceneNum] !== undefined) sceneLoadStatuses[sceneNum] = true;
            if (callback) callback();
            return;
        }

        if (sceneLoadStatuses[sceneNum]) {
            if (callback) callback();
            return;
        }

        // If another scene is actively loading, queue this one and exit
        if (activePreloadScene !== null && activePreloadScene !== sceneNum) {
            if (!preloadQueue.includes(sceneNum)) {
                preloadQueue.push(sceneNum);
            }
            return;
        }

        activePreloadScene = sceneNum;
        let imagesArray, startFrame, endFrame, frameCount, pathPrefix, onFirstFrameLoaded, frameNumbers;

        if (sceneNum === 2) {
            imagesArray = window.scene2Images;
            startFrame = 105;
            endFrame = 233;
            frameNumbers = SCENE2_FRAME_NUMBERS;
            pathPrefix = "/assets/images/animation/scene-2/frame-";
            onFirstFrameLoaded = window.resizeScene2Canvas;
        } else if (sceneNum === 3) {
            imagesArray = window.scene3Images;
            startFrame = 234;
            endFrame = 402;
            pathPrefix = "/assets/images/animation/scene-3/frame-";
            onFirstFrameLoaded = window.resizeScene3Canvas;
        } else if (sceneNum === 4) {
            imagesArray = window.scene4Images;
            startFrame = 441;
            endFrame = 798;
            pathPrefix = "/assets/images/animation/scene-4/frame-";
            onFirstFrameLoaded = window.resizeScene4Canvas;
        } else if (sceneNum === 5) {
            imagesArray = window.scene5Images;
            startFrame = 860;
            endFrame = 902;
            pathPrefix = "/assets/images/animation/scene-5/frame-";
            onFirstFrameLoaded = window.resizeScene5Canvas;
        } else if (sceneNum === 6) {
            imagesArray = window.scene6Images;
            startFrame = 939;
            endFrame = 1407;
            pathPrefix = "/assets/images/animation/scene-6/frame-";
            onFirstFrameLoaded = window.resizeScene6Canvas;
        } else {
            activePreloadScene = null;
            return;
        }

        frameCount = frameNumbers ? frameNumbers.length : endFrame - startFrame + 1;
        let loadedCount = 0;

        showPreloader();
        updatePreloaderCircle(0);

        for (let i = 0; i < frameCount; i++) {
            const img = new Image();
            const frameNum = padZero(frameNumbers ? frameNumbers[i] : startFrame + i, 4);
            img.src = `${pathPrefix}${frameNum}.avif`;
            img.onload = () => {
                loadedCount++;
                const progressPercent = (loadedCount / frameCount) * 100;
                updatePreloaderCircle(progressPercent);

                if (i === 0 && typeof onFirstFrameLoaded === "function") {
                    onFirstFrameLoaded();
                }

                if (loadedCount === frameCount) {
                    sceneLoadStatuses[sceneNum] = true;
                    activePreloadScene = null;
                    setTimeout(() => {
                        hidePreloader();
                        if (callback) callback();
                        // Process the next item in queue
                        if (preloadQueue.length > 0) {
                            const nextInQueue = preloadQueue.shift();
                            window.preloadScene(nextInQueue);
                        }
                    }, 500);
                }
            };
            img.onerror = () => {
                loadedCount++;
                if (loadedCount === frameCount) {
                    sceneLoadStatuses[sceneNum] = true;
                    activePreloadScene = null;
                    setTimeout(() => {
                        hidePreloader();
                        if (callback) callback();
                        if (preloadQueue.length > 0) {
                            const nextInQueue = preloadQueue.shift();
                            window.preloadScene(nextInQueue);
                        }
                    }, 500);
                }
            };
            imagesArray.push(img);
        }
    };
    // --------------------------------------------------------------------------
    // 1. HEADER & NAVIGATION SCROLL HANDLER
    // --------------------------------------------------------------------------
    const header = document.getElementById("bigbee-header");
    const aboutSection = document.getElementById("about-bigbee") || document.getElementById("stats");

    function handleHeaderScroll() {
        if (!header) return;
        const currentScrollY = window.scrollY;
        const aboutTop = aboutSection ? aboutSection.offsetTop - 120 : window.innerHeight - 100;
        const managedSceneOverlayActive = document.body.classList.contains("scene-1-overlay-active")
            || document.body.classList.contains("scene-2-overlay-active")
            || document.body.classList.contains("scene-3-overlay-active")
            || document.body.classList.contains("scene-4-overlay-active")
            || document.body.classList.contains("scene-5-overlay-active")
            || document.body.classList.contains("scene-6-overlay-active");

        // Managed hero scenes use fixed layers while the underlying document
        // scroll position advances. Never let that hidden scroll position
        // activate the normal content-section header background.
        if (managedSceneOverlayActive) {
            header.classList.remove("scrolled");
            if (window.scene6TextInCenter) {
                document.body.classList.remove("nav-scrolled-out");
                document.body.classList.add("scene-6-text-in-center");
            } else {
                document.body.classList.add("nav-scrolled-out");
                document.body.classList.remove("scene-6-text-in-center");
            }
            return;
        }

        if (currentScrollY >= aboutTop || window.scene6TextInCenter) {
            document.body.classList.remove("nav-scrolled-out");
            if (window.scene6TextInCenter) {
                document.body.classList.add("scene-6-text-in-center");
            } else {
                document.body.classList.remove("scene-6-text-in-center");
            }

            if (currentScrollY >= aboutTop) {
                header.classList.add("scrolled");
            } else {
                header.classList.remove("scrolled");
            }
        } else if (currentScrollY <= 50) {
            // Very top of page: Header transparent & nav links + 4 bottom sections shown
            header.classList.remove("scrolled");
            document.body.classList.remove("nav-scrolled-out");
            document.body.classList.remove("scene-6-text-in-center");
        } else {
            // Inside Hero section below top (whether scrolling down or up):
            // Keep header transparent, hide nav links & 4 bottom sections
            header.classList.remove("scrolled");
            document.body.classList.add("nav-scrolled-out");
            document.body.classList.remove("scene-6-text-in-center");
        }
    }
    window.addEventListener("scroll", handleHeaderScroll, { passive: true });
    handleHeaderScroll();

    // --------------------------------------------------------------------------
    // 2. LENIS SMOOTH SCROLL ENGINE
    // --------------------------------------------------------------------------
    let lenis = null;
    if (typeof Lenis !== "undefined") {
        lenis = new Lenis({
            duration: 1.4,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            wheelMultiplier: 0.8
        });

        // Lock scrolling only for the animated homepage entrance. Interior-nav
        // visits land directly in normal homepage content.
        if (skipHomepageIntro || mobileStaticHomepage) {
            lenis.start();
        } else {
            lenis.stop();
        }

        if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
            gsap.registerPlugin(ScrollTrigger);
            lenis.on("scroll", ScrollTrigger.update);
            gsap.ticker.add((time) => {
                lenis.raf(time * 1000);
            });
            gsap.ticker.lagSmoothing(0);
        }
    }

    // Anchor smooth scroll click handler
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener("click", (e) => {
            const targetId = anchor.getAttribute("href");
            if (targetId && targetId !== "#") {
                if ((targetId === "#scene-1" || targetId === "#scene-2") && window.scrollY < 120) {
                    transitionBetweenHeroScenes("down", e);
                    return;
                }
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    e.preventDefault();
                    if (lenis) {
                        lenis.scrollTo(targetEl, { offset: 0, duration: 1.4 });
                    } else {
                        targetEl.scrollIntoView({ behavior: "smooth" });
                    }
                }
            }
        });
    });

    // --------------------------------------------------------------------------
    // 3. ELEGANT HERO TEXT ENTRANCE ANIMATION (FIRST LOAD REVEAL)
    // --------------------------------------------------------------------------
    if (!mobileStaticHomepage && typeof gsap !== "undefined") {
        const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });

        heroTl.fromTo(
            ".bigbee-hero__title-line",
            {
                opacity: 0,
                y: 40,
                filter: "blur(8px)"
            },
            {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 1.1,
                stagger: 0.18,
                delay: 0.2
            }
        )
        .fromTo(
            ".bigbee-scroll-indicator",
            {
                opacity: 0,
                y: 20
            },
            {
                opacity: 1,
                y: 0,
                duration: 0.8
            },
            "-=0.5"
        )
        .fromTo(
            ".bigbee-stat-card",
            {
                opacity: 0,
                y: 25
            },
            {
                opacity: 1,
                y: 0,
                duration: 0.8,
                stagger: 0.12
            },
            "-=0.6"
        );
    }

    // --------------------------------------------------------------------------
    // 3B. SYMMETRIC TRANSITIONS BETWEEN HERO, SCENE-1 & SCENE-2
    // --------------------------------------------------------------------------
    let isTransitioningScene = false;
    let touchStartY = 0;
    let playScene1Forward = null;
    let cancelScene1Animation = null;
    let advanceScene1ToScene2 = null;
    let advanceScene2ToScene3 = null;
    let advanceScene3ToScene4 = null;
    let advanceScene4ToScene5 = null;
    let advanceScene5ToScene6 = null;
    let advanceScene6ToContent = null;
    let advanceScene0ToScene2ViaZoom = null;
    let returnScene2ToScene0ViaZoom = null;
    let returnContentToScene6 = null;
    let restoreScene6FinalState = null;
    let returnScene2ToScene1 = null;
    let returnScene3ToScene2 = null;
    let returnScene4ToScene3 = null;
    let returnScene5ToScene4 = null;
    let returnScene6ToScene5 = null;
    let playScene2Reverse = null;
    let playScene3Forward = null;
    let playScene3Reverse = null;
    let prepareScene4ForScrub = null;
    let playScene5Forward = null;
    let playScene5Reverse = null;
    let playScene6Forward = null;
    let playScene6Reverse = null;
    let scrubScene2Frames = null;
    let scrubScene3Frames = null;
    let scrubScene4Frames = null;
    let scrubScene5Frames = null;
    let scrubScene6Frames = null;
    let hideScene3SupportingCopy = null;
    let hideScene4Cards = null;
    let hideScene6FinalContent = null;
    let detachScene0HeroCircleEffect = null;
    let attachScene0HeroCircleEffect = null;
    let isScene1Animating = false;
    let isScene3Animating = false;
    let isScene4Animating = false;
    let isScene5Animating = false;
    let isScene6Animating = false;
    let scene6FinalContentIsAnimating = false;
    let scene1HasCompletedForward = false;
    let isHeroTitleHandoffActive = false;
    let scene1IsOverlayActive = false;
    let scene2IsOverlayActive = false;
    let scene3IsOverlayActive = false;
    let scene4IsOverlayActive = false;
    let scene5IsOverlayActive = false;
    let scene6IsOverlayActive = false;
    let scene6ContentHandoffIsActive = false;
    let sceneContentReverseJourneyIsActive = false;
    let scene1NaturalDocTop = null;
    let scene1PinnedTitleTop = null;
    const HERO_SCENE_TRANSITION_DURATION = 0.9;
    const HERO_SCENE_SCRUB_VIEWPORTS = 3;
    // Mouse wheels commonly emit coarse 100–120px notches while touchpads emit
    // smaller continuous deltas. Cap only the large spikes so both inputs drive
    // the hero frame scrub at a comparable per-event rate.
    const HERO_SCENE_MAX_WHEEL_DELTA = 24;
    const heroSceneConfig = document.getElementById("bigbee-hero");
    const readPositiveHeroSceneConfig = (attributeName, fallback) => {
        const value = Number.parseFloat(heroSceneConfig?.getAttribute(attributeName));
        return Number.isFinite(value) && value > 0 ? value : fallback;
    };
    const HERO_SCENE_SCRUB_SPEED_MULTIPLIER = readPositiveHeroSceneConfig(
        "data-scrub-speed-multiplier",
        6
    );
    const HERO_SCENE_SCRUB_GLIDE_DURATION = readPositiveHeroSceneConfig(
        "data-scrub-glide-duration",
        0.65
    );
    const CONTENT_TO_SCENE6_BOUNDARY_SNAP_RANGE = 40;
    const CONTENT_TO_SCENE6_INPUT_RELEASE_DELAY = 180;
    let contentBoundaryAwaitingFreshUpwardInput = false;
    let contentBoundaryLastUpwardInputAt = 0;
    let contentBoundaryInputReleaseTimer = null;
    const SCENE2_SECONDARY_COPY_START_FRAME = 173;
    const SCENE2_BOTTOM_COPY_START_FRAME = 210;
    const scene0HeroTitle = document.querySelector("#scene-0 .bigbee-hero__title");
    let scene2PrimaryRightCopyIsVisible = true;
    let scene2SecondaryRightCopyIsVisible = false;
    let scene2BottomCopyIsVisible = false;
    function setSceneScrollPrompt(sceneNumber, isVisible) {
        const indicator = document.getElementById(`scene-${sceneNumber}-scroll-indicator`);
        if (!indicator) return;
        const scene6FinalContentIsVisible = sceneNumber === 6 && (
            window.scene6TextInCenter
            || document.body.classList.contains("scene-6-text-in-center")
        );
        const shouldShow = isVisible && !scene6FinalContentIsVisible;
        indicator.classList.toggle("is-visible", shouldShow);
        indicator.setAttribute("aria-hidden", shouldShow ? "false" : "true");
    }

    function setScene2CopyVisibility(elementId, isVisible, immediate = false) {
        const rightCopy = document.getElementById(elementId);
        if (!rightCopy) return;
        const state = {
            autoAlpha: isVisible ? 1 : 0,
            x: isVisible ? 0 : Math.max(80, window.innerWidth * 0.07)
        };

        if (typeof gsap === "undefined") {
            rightCopy.style.opacity = isVisible ? "1" : "0";
            rightCopy.style.visibility = isVisible ? "visible" : "hidden";
            rightCopy.style.transform = `translate(${state.x}px, -50%)`;
            return;
        }

        gsap.killTweensOf(rightCopy);
        if (immediate) {
            gsap.set(rightCopy, state);
        } else {
            gsap.to(rightCopy, {
                ...state,
                duration: 0.55,
                ease: "power3.out",
                overwrite: true
            });
        }
    }

    function setScene2PrimaryRightCopyVisibility(isVisible, immediate = false) {
        if (!immediate && scene2PrimaryRightCopyIsVisible === isVisible) return;
        scene2PrimaryRightCopyIsVisible = isVisible;
        setScene2CopyVisibility("scene-2-info-primary-right", isVisible, immediate);
    }

    function setScene2SecondaryRightCopyVisibility(isVisible, immediate = false) {
        if (!immediate && scene2SecondaryRightCopyIsVisible === isVisible) return;
        scene2SecondaryRightCopyIsVisible = isVisible;
        setScene2CopyVisibility("scene-2-info-secondary-right", isVisible, immediate);
    }

    function updateScene2SecondaryRightCopy(frameIndex, immediate = false) {
        const actualFrame = SCENE2_FRAME_NUMBERS[Math.max(
            0,
            Math.min(SCENE2_FRAME_NUMBERS.length - 1, Math.floor(frameIndex))
        )];
        setScene2SecondaryRightCopyVisibility(
            actualFrame >= SCENE2_SECONDARY_COPY_START_FRAME,
            immediate
        );
    }

    function setScene2BottomCopyVisibility(isVisible, immediate = false) {
        const bottomCopy = document.getElementById("scene-2-info-bottom");
        if (!bottomCopy || (!immediate && scene2BottomCopyIsVisible === isVisible)) return;

        scene2BottomCopyIsVisible = isVisible;
        const state = {
            autoAlpha: isVisible ? 1 : 0,
            y: isVisible ? 0 : Math.max(48, window.innerHeight * 0.07)
        };

        if (typeof gsap === "undefined") {
            bottomCopy.style.opacity = isVisible ? "1" : "0";
            bottomCopy.style.visibility = isVisible ? "visible" : "hidden";
            return;
        }

        gsap.killTweensOf(bottomCopy);
        if (immediate) {
            gsap.set(bottomCopy, state);
        } else {
            gsap.to(bottomCopy, {
                ...state,
                duration: 0.65,
                ease: "power3.out",
                overwrite: true
            });
        }
    }

    function updateScene2BottomCopy(frameIndex, immediate = false) {
        const actualFrame = SCENE2_FRAME_NUMBERS[Math.max(
            0,
            Math.min(SCENE2_FRAME_NUMBERS.length - 1, Math.floor(frameIndex))
        )];
        setScene2BottomCopyVisibility(
            actualFrame >= SCENE2_BOTTOM_COPY_START_FRAME,
            immediate
        );
    }

    function initScene2TitleSpotlights() {
        const titles = Array.from(document.querySelectorAll(".scene-2-info__title, .scene-4-card h3"));
        if (!titles.length) return;

        const motion = [
            { speedX: 0.00038, speedY: 0.00071, phase: 0.15, rangeX: 47, rangeY: 32 },
            { speedX: 0.00053, speedY: 0.00044, phase: 1.7, rangeX: 43, rangeY: 38 },
            { speedX: 0.00067, speedY: 0.00058, phase: 3.15, rangeX: 49, rangeY: 29 },
            { speedX: 0.00046, speedY: 0.00083, phase: 4.6, rangeX: 40, rangeY: 36 }
        ];

        const renderSpotlights = (time) => {
            titles.forEach((title, index) => {
                const path = motion[index % motion.length];
                const x = 50 + Math.sin(time * path.speedX + path.phase) * path.rangeX;
                const y = 50 + Math.cos(time * path.speedY + path.phase) * path.rangeY;
                title.style.setProperty("--scene-2-spotlight-x", `${x.toFixed(2)}%`);
                title.style.setProperty("--scene-2-spotlight-y", `${y.toFixed(2)}%`);
            });
        };

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            renderSpotlights(0);
            return;
        }

        const animateSpotlights = (time) => {
            if (scene2IsOverlayActive || scene4IsOverlayActive) renderSpotlights(time);
            requestAnimationFrame(animateSpotlights);
        };
        requestAnimationFrame(animateSpotlights);
    }

    if (!mobileStaticHomepage) initScene2TitleSpotlights();

    function resetScene2SupportingCopy() {
        const infoBlocks = document.querySelector(".scene-2-info-blocks");
        const leftCopy = document.querySelector(".scene-2-info--left");
        if (infoBlocks && typeof gsap !== "undefined") {
            gsap.set(infoBlocks, { clearProps: "transform" });
        }
        if (leftCopy && typeof gsap !== "undefined") {
            gsap.killTweensOf(leftCopy);
            gsap.set(leftCopy, { autoAlpha: 1, x: 0 });
        }
        setScene2PrimaryRightCopyVisibility(true, true);
        setScene2SecondaryRightCopyVisibility(false, true);
        setScene2BottomCopyVisibility(false, true);
    }

    function hideScene2SupportingCopyForHandoff(onComplete) {
        const leftCopy = document.querySelector(".scene-2-info--left");
        const rightCopies = Array.from(document.querySelectorAll(".scene-2-info--right"));
        const bottomCopy = document.getElementById("scene-2-info-bottom");
        if (typeof gsap === "undefined") {
            if (onComplete) onComplete();
            return;
        }

        const horizontalDistance = Math.max(90, window.innerWidth * 0.075);
        const verticalDistance = Math.max(60, window.innerHeight * 0.08);
        const timeline = gsap.timeline({ onComplete });
        if (leftCopy) {
            timeline.to(leftCopy, {
                autoAlpha: 0,
                x: -horizontalDistance,
                duration: 0.55,
                ease: "power3.inOut"
            }, 0);
        }
        if (rightCopies.length) {
            timeline.to(rightCopies, {
                autoAlpha: 0,
                x: horizontalDistance,
                duration: 0.55,
                ease: "power3.inOut"
            }, 0);
        }
        if (bottomCopy) {
            timeline.to(bottomCopy, {
                autoAlpha: 0,
                y: verticalDistance,
                duration: 0.55,
                ease: "power3.inOut"
            }, 0);
        }
    }

    function restoreScene2FinalSupportingCopy() {
        const leftCopy = document.querySelector(".scene-2-info--left");
        if (leftCopy && typeof gsap !== "undefined") {
            gsap.killTweensOf(leftCopy);
            gsap.set(leftCopy, { autoAlpha: 1, x: 0 });
        }
        setScene2PrimaryRightCopyVisibility(false, true);
        updateScene2SecondaryRightCopy(SCENE2_FRAME_NUMBERS.length - 1, true);
        updateScene2BottomCopy(SCENE2_FRAME_NUMBERS.length - 1, true);
    }

    function setScene2HeaderTheme(isActive) {
        const header = document.getElementById("bigbee-header");
        const logo = header?.querySelector(".bigbee-logo__img");
        const button = header?.querySelector(".bigbee-btn--header");
        if (!header || !logo || !button) return;

        header.classList.toggle("is-scene-2-theme", isActive);
        button.classList.toggle("bigbee-btn--scene-2", isActive);
        const scene2UsesDarkLogo = isActive && document.body.classList.contains("scene-2-overlay-active");
        logo.src = isActive && !scene2UsesDarkLogo ? "/assets/images/ta-sports-logo-white.svg" : "/assets/images/ta-sports-logo.svg";
    }

    function activateScene1Overlay() {
        const scene1El = document.getElementById("scene-1");
        if (scene1El) {
            scene1NaturalDocTop = getElementDocTop(scene1El);
            scene1El.style.opacity = "";
            scene1El.style.visibility = "";
        }
        scene1IsOverlayActive = true;
        document.body.classList.add("scene-1-overlay-active");
        if (lenis) lenis.stop();
        if (typeof window.resizeScene1Canvas === "function") {
            window.resizeScene1Canvas();
        }
    }

    function deactivateScene1Overlay(resumeScroll = true) {
        scene1IsOverlayActive = false;
        document.body.classList.remove("scene-1-overlay-active");
        if (resumeScroll && lenis) lenis.start();
    }

    function activateScene2Overlay(updateHeaderTheme = true) {
        scene2IsOverlayActive = true;
        document.body.classList.add("scene-2-overlay-active");
        if (updateHeaderTheme) setScene2HeaderTheme(true);
        if (lenis) lenis.stop();
        if (typeof window.resizeScene2Canvas === "function") {
            window.resizeScene2Canvas();
        }
    }

    function deactivateScene2Overlay(resumeScroll = true) {
        scene2IsOverlayActive = false;
        document.body.classList.remove("scene-2-overlay-active");
        if (resumeScroll && lenis) lenis.start();
    }

    function activateScene3Overlay() {
        scene3IsOverlayActive = true;
        document.body.classList.add("scene-3-overlay-active");
        if (lenis) lenis.stop();
        if (typeof window.resizeScene3Canvas === "function") {
            window.resizeScene3Canvas();
        }
    }

    function deactivateScene3Overlay(resumeScroll = true) {
        scene3IsOverlayActive = false;
        document.body.classList.remove("scene-3-overlay-active");
        if (resumeScroll && lenis) lenis.start();
    }

    function activateScene4Overlay() {
        scene4IsOverlayActive = true;
        document.body.classList.add("scene-4-overlay-active");
        if (lenis) lenis.stop();
        if (typeof window.resizeScene4Canvas === "function") {
            window.resizeScene4Canvas();
        }
    }

    function deactivateScene4Overlay(resumeScroll = true) {
        scene4IsOverlayActive = false;
        document.body.classList.remove("scene-4-overlay-active");
        if (resumeScroll && lenis) lenis.start();
    }

    function activateScene5Overlay() {
        scene5IsOverlayActive = true;
        document.body.classList.add("scene-5-overlay-active");
        setScene2HeaderTheme(true);
        if (lenis) lenis.stop();
        if (typeof window.resizeScene5Canvas === "function") {
            window.resizeScene5Canvas();
        }
    }

    function deactivateScene5Overlay(resumeScroll = true) {
        scene5IsOverlayActive = false;
        document.body.classList.remove("scene-5-overlay-active");
        setScene2HeaderTheme(false);
        if (resumeScroll && lenis) lenis.start();
    }

    function activateScene6Overlay() {
        const scene6El = document.getElementById("scene-6");
        if (scene6El) scene6El.style.visibility = "";
        scene6IsOverlayActive = true;
        document.body.classList.add("scene-6-overlay-active");
        setScene2HeaderTheme(false);
        if (lenis) lenis.stop();
        if (typeof window.resizeScene6Canvas === "function") {
            window.resizeScene6Canvas();
        }
    }

    function deactivateScene6Overlay(resumeScroll = true) {
        scene6IsOverlayActive = false;
        document.body.classList.remove("scene-6-overlay-active");
        if (resumeScroll && lenis) lenis.start();
    }

    advanceScene6ToContent = function() {
        const scene6El = document.getElementById("scene-6");
        const nextSection = document.getElementById("about-bigbee");
        if (!scene6El || !nextSection || isTransitioningScene) return;
        const nextSectionTop = getElementDocTop(nextSection);

        isTransitioningScene = true;
        sceneContentReverseJourneyIsActive = false;
        document.body.classList.add("scene-6-to-content");
        gsap.set(scene6El, { y: 0 });

        gsap.to(scene6El, {
            y: -window.innerHeight,
            duration: HERO_SCENE_TRANSITION_DURATION,
            ease: "power3.inOut",
            overwrite: true,
            onComplete: () => {
                // Keep the departing scene concealed until the normal document
                // has genuinely settled with About at the viewport top.
                scene6El.style.visibility = "hidden";
                if (lenis) lenis.stop();

                const settleOnNextSection = (attempt = 0) => {
                    const sectionTopInViewport = nextSection.getBoundingClientRect().top;
                    const correctedScrollY = window.scrollY + sectionTopInViewport;

                    if (Math.abs(sectionTopInViewport) > 1 && attempt < 6) {
                        if (lenis) {
                            lenis.scrollTo(correctedScrollY, { immediate: true, force: true });
                        }
                        window.scrollTo(0, correctedScrollY);
                        requestAnimationFrame(() => settleOnNextSection(attempt + 1));
                        return;
                    }

                    document.body.classList.remove("scene-6-to-content");
                    document.body.classList.remove("scene-6-text-in-center");
                    window.scene6TextInCenter = false;
                    deactivateScene6Overlay(false);
                    gsap.set(scene6El, { clearProps: "transform" });
                    scene6El.style.visibility = "";
                    scene6ContentHandoffIsActive = true;
                    isTransitioningScene = false;
                    if (lenis) lenis.start();
                    if (typeof handleHeaderScroll === "function") handleHeaderScroll();
                };

                if (lenis) {
                    lenis.scrollTo(nextSectionTop, { immediate: true, force: true });
                }
                window.scrollTo(0, nextSectionTop);
                requestAnimationFrame(() => settleOnNextSection());
            }
        });

        if (lenis) {
            lenis.scrollTo(nextSection, {
                duration: HERO_SCENE_TRANSITION_DURATION,
                force: true
            });
        } else {
            window.scrollTo({
                top: getElementDocTop(nextSection),
                behavior: "smooth"
            });
        }
    };

    returnContentToScene6 = function() {
        const scene6El = document.getElementById("scene-6");
        const nextSection = document.getElementById("about-bigbee");
        if (!scene6El || !nextSection || isTransitioningScene) return;

        isTransitioningScene = true;
        sceneContentReverseJourneyIsActive = true;
        scene6ContentHandoffIsActive = false;
        scene6El.style.visibility = "";
        if (typeof restoreScene6FinalState === "function") {
            restoreScene6FinalState();
        }
        window.scene6TextInCenter = true;
        setSceneScrollPrompt(6, false);
        document.body.classList.add("scene-content-to-scene-6");
        activateScene6Overlay();
        document.body.classList.add("scene-6-text-in-center");
        gsap.set(scene6El, { y: -window.innerHeight });
        if (typeof handleHeaderScroll === "function") handleHeaderScroll();

        const scene6TargetScroll = Math.max(
            0,
            getElementDocTop(nextSection) - window.innerHeight
        );
        const returnTimeline = gsap.timeline({
            onComplete: () => {
                document.body.classList.remove("scene-content-to-scene-6");
                gsap.set(scene6El, { clearProps: "transform" });
                isTransitioningScene = false;
                if (typeof handleHeaderScroll === "function") handleHeaderScroll();
            }
        });
        returnTimeline.to(scene6El, {
            y: 0,
            duration: HERO_SCENE_TRANSITION_DURATION,
            ease: "power3.inOut",
            overwrite: true
        });

        if (lenis) {
            lenis.scrollTo(scene6TargetScroll, {
                duration: HERO_SCENE_TRANSITION_DURATION,
                force: true
            });
        } else {
            window.scrollTo({ top: scene6TargetScroll, behavior: "smooth" });
        }
    };

    function removeScene1PinnedTitle(immediate = false) {
        const pinnedTitle = document.querySelector(".bigbee-hero-title-handoff");
        if (!pinnedTitle) return;
        if (immediate || typeof gsap === "undefined") {
            pinnedTitle.remove();
            return;
        }
        gsap.to(pinnedTitle, {
            autoAlpha: 0,
            duration: 0.25,
            overwrite: true,
            onComplete: () => pinnedTitle.remove()
        });
    }

    function movePinnedTitleIntoPageFlow() {
        const pinnedTitle = document.querySelector(".bigbee-hero-title-handoff");
        if (!pinnedTitle) return;

        const titleRect = pinnedTitle.getBoundingClientRect();
        document.body.appendChild(pinnedTitle);
        pinnedTitle.classList.add("is-scrolling-with-page");
        gsap.set(pinnedTitle, {
            top: window.scrollY + titleRect.top,
            left: 0,
            width: "100%",
            x: 0,
            y: 0,
            clearProps: "opacity,visibility"
        });
    }

    function createTitleForScene2ReverseScroll() {
        const pinnedTitle = createScene1PinnedTitle(scene1PinnedTitleTop);
        if (!pinnedTitle) return;

        const targetTop = (scene1NaturalDocTop ?? window.innerHeight)
            + (scene1PinnedTitleTop ?? pinnedTitle.getBoundingClientRect().top);
        pinnedTitle.classList.add("is-scrolling-with-page");
        gsap.set(pinnedTitle, {
            top: targetTop,
            y: 0,
            clearProps: "opacity,visibility"
        });
    }

    function pinTitleAtCurrentViewportPosition() {
        const pinnedTitle = document.querySelector(".bigbee-hero-title-handoff");
        if (!pinnedTitle) return;

        const titleRect = pinnedTitle.getBoundingClientRect();
        pinnedTitle.classList.remove("is-scrolling-with-page");
        gsap.set(pinnedTitle, {
            top: titleRect.top,
            y: 0
        });
        scene1PinnedTitleTop = titleRect.top;
    }

    function createScene1PinnedTitle(topPosition = scene1PinnedTitleTop) {
        if (!scene0HeroTitle) return null;
        const existingTitle = document.querySelector(".bigbee-hero-title-handoff");
        if (existingTitle) return existingTitle;

        const sourceRect = scene0HeroTitle.getBoundingClientRect();
        const targetLeft = Math.max(24, window.innerWidth * 0.06);
        if (topPosition === null) {
            topPosition = Math.max(100, (window.innerHeight - sourceRect.height) / 2);
        }
        scene1PinnedTitleTop = topPosition;

        const pinnedTitle = scene0HeroTitle.cloneNode(true);
        pinnedTitle.removeAttribute("id");
        pinnedTitle.classList.add("bigbee-hero-title-handoff");
        pinnedTitle.setAttribute("aria-hidden", "true");
        pinnedTitle.querySelectorAll(".bigbee-hero__title-line").forEach((line) => {
            line.style.transform = "none";
        });
        document.body.appendChild(pinnedTitle);

        if (typeof gsap !== "undefined") {
            gsap.set(pinnedTitle, {
                top: topPosition,
                left: targetLeft,
                width: `calc(100% - ${targetLeft * 2}px)`,
                transformOrigin: "left top"
            });
        }
        return pinnedTitle;
    }

    function resetScene0HeroTitle(reveal = true) {
        if (!scene0HeroTitle) return;
        scene0HeroTitle.style.visibility = reveal ? "" : "hidden";
        const titleLines = scene0HeroTitle.querySelectorAll(".bigbee-hero__title-line");
        const scene0ScrollIndicator = document.querySelector("#scene-0 .bigbee-scroll-indicator");
        if (typeof gsap !== "undefined") {
            gsap.set(scene0HeroTitle, { clearProps: "transform" });
            gsap.set(titleLines, { clearProps: "transform" });
            if (scene0ScrollIndicator) {
                gsap.set(scene0ScrollIndicator, { clearProps: "opacity,visibility" });
            }
        }
    }

    function createScene0BackgroundReturnLayer() {
        document.querySelector(".scene-0-background-return")?.remove();
        const layer = document.createElement("div");
        layer.className = "scene-0-background-return";
        layer.setAttribute("aria-hidden", "true");
        document.body.appendChild(layer);
        return layer;
    }

    function removeScene0BackgroundReturnLayer(layer) {
        if (!layer) return;
        layer.remove();
    }

    let scene0ZoomGeometry = null;

    function captureScene0ZoomGeometry() {
        const focus = scene0HeroTitle?.querySelector(".bigbee-hero__zoom-focus");
        if (!scene0HeroTitle || !focus) return null;
        const titleRect = scene0HeroTitle.getBoundingClientRect();
        const focusRect = focus.getBoundingClientRect();
        const lineRects = Array.from(
            scene0HeroTitle.querySelectorAll(".bigbee-hero__title-line")
        ).map((line) => {
            const rect = line.getBoundingClientRect();
            return {
                left: rect.left - titleRect.left,
                top: rect.top - titleRect.top
            };
        });
        scene0ZoomGeometry = {
            left: titleRect.left,
            forwardTop: titleRect.top,
            restTop: titleRect.top + window.scrollY,
            width: titleRect.width,
            height: titleRect.height,
            focusX: focusRect.left - titleRect.left + (focusRect.width / 2),
            focusY: focusRect.top - titleRect.top + (focusRect.height / 2),
            focusWidth: focusRect.width,
            focusHeight: focusRect.height,
            lineRects
        };
        return scene0ZoomGeometry;
    }

    function createScene0ZoomStage(isReverse = false) {
        document.querySelector(".scene-0-zoom-stage")?.remove();
        const geometry = scene0ZoomGeometry || captureScene0ZoomGeometry();
        if (!geometry || !scene0HeroTitle) return null;
        const stageOverscan = 2;

        const stage = document.createElement("div");
        stage.className = "scene-0-zoom-stage";
        stage.setAttribute("aria-hidden", "true");
        if (isReverse) {
            // The reverse stage must enter the DOM already hidden. Its line
            // measurements below force layout, so hiding it only in the caller
            // can submit one malformed maximum-zoom frame to the compositor.
            stage.style.opacity = "0";
            stage.style.visibility = "hidden";
        }

        const title = scene0HeroTitle.cloneNode(true);
        title.classList.remove("bigbee-hero-title-handoff");
        title.classList.add("scene-0-zoom-title");
        title.removeAttribute("id");
        title.querySelectorAll(".bigbee-hero__title-line").forEach((line) => {
            line.style.transform = "none";
        });
        stage.appendChild(title);
        document.body.appendChild(stage);

        const titleTop = isReverse ? geometry.restTop : geometry.forwardTop;
        const zoomScale = Math.max(
            window.innerWidth / Math.max(1, geometry.focusWidth),
            window.innerHeight / Math.max(1, geometry.focusHeight)
        ) * 2.7;
        const zoomX = (window.innerWidth / 2) - (geometry.left + geometry.focusX);
        const zoomY = (window.innerHeight / 2) - (titleTop + geometry.focusY);
        gsap.set(title, {
            left: geometry.left + stageOverscan,
            top: titleTop + stageOverscan,
            width: geometry.width,
            height: geometry.height,
            margin: 0,
            x: 0,
            y: 0,
            scale: 1,
            force3D: true,
            transformOrigin: `${geometry.focusX}px ${geometry.focusY}px`
        });

        // Re-parenting the title changes its flex formatting context slightly.
        // FLIP each line back onto its measured Scene 0 coordinates before the
        // first painted frame, eliminating the pre-zoom placement jump.
        const clonedLines = Array.from(title.querySelectorAll(".bigbee-hero__title-line"));
        clonedLines.forEach((line, index) => {
            const rect = line.getBoundingClientRect();
            const expected = geometry.lineRects[index];
            if (!expected) return;
            gsap.set(line, {
                x: expected.left - (rect.left - geometry.left),
                y: expected.top - (rect.top - titleTop)
            });
        });

        if (isReverse) {
            // Keep the complete title unmasked and invisible at extreme zoom.
            // It fades in only once it is close enough to its resting scale,
            // avoiding both oversized letter fragments and circular clip edges.
            gsap.set(title, {
                x: zoomX,
                y: zoomY,
                scale: zoomScale,
                autoAlpha: 0
            });
        }

        return {
            stage,
            title,
            zoomScale,
            zoomX,
            zoomY
        };
    }

    advanceScene0ToScene2ViaZoom = function() {
        if (isTransitioningScene || !scene0HeroTitle || typeof gsap === "undefined") return;
        const scene1El = document.getElementById("scene-1");
        const scene2El = document.getElementById("scene-2");
        const scene2CanvasEl = document.getElementById("scene-2-canvas");
        const scene2GradientLayer = document.getElementById("scene-2-gradient-layer");
        const scene2InfoBlocks = document.querySelector(".scene-2-info-blocks");
        const header = document.getElementById("bigbee-header");
        if (!scene2El || !scene2CanvasEl) return;

        const scene2Top = getElementDocTop(scene2El);
        if (typeof detachScene0HeroCircleEffect === "function") {
            detachScene0HeroCircleEffect();
        }
        scene0ZoomGeometry = null;
        captureScene0ZoomGeometry();
        const zoom = createScene0ZoomStage(false);
        if (!zoom) {
            if (typeof attachScene0HeroCircleEffect === "function") {
                attachScene0HeroCircleEffect();
            }
            return;
        }

        isTransitioningScene = true;
        freezeHeroScrollPosition(window.scrollY);
        scene0HeroTitle.style.visibility = "hidden";
        document.querySelector("#scene-0 .bigbee-scroll-indicator")?.style.setProperty("visibility", "hidden");
        if (typeof resetSceneState === "function") resetSceneState(1);
        if (typeof resetScene2State === "function") resetScene2State();
        if (scene1El) {
            scene1El.style.opacity = "0";
            scene1El.style.visibility = "hidden";
        }

        // Keep the destination scene opaque beneath the camera layer. Fading
        // the entire fixed scene exposed Scene 3 at the document scroll slot.
        scene2El.style.opacity = "1";
        scene2El.style.visibility = "visible";
        gsap.killTweensOf(scene2El);
        gsap.set(scene2El, { x: 0, y: 0 });
        gsap.set(scene2CanvasEl, {
            autoAlpha: 1,
            scale: 0,
            force3D: true,
            transformOrigin: "50% 50%"
        });
        if (scene2InfoBlocks) {
            gsap.set(scene2InfoBlocks, {
                scale: 0,
                force3D: true,
                transformOrigin: "50% 50%"
            });
        }
        if (scene2GradientLayer) gsap.set(scene2GradientLayer, { autoAlpha: 1 });
        activateScene2Overlay(false);
        if (lenis) lenis.scrollTo(scene2Top, { immediate: true, force: true });
        window.scrollTo(0, scene2Top);

        gsap.timeline({
            onComplete: () => {
                zoom.stage.remove();
                resetScene0HeroTitle();
                const scene0Indicator = document.querySelector("#scene-0 .bigbee-scroll-indicator");
                if (scene0Indicator) scene0Indicator.style.visibility = "";
                scene2El.style.opacity = "1";
                setScene2HeaderTheme(true);
                if (header) gsap.set(header, { clearProps: "opacity,visibility" });

                // Frame 0105 grows out of the gray handoff while the gradient
                // fades away to reveal Scene 2's white background.
                gsap.timeline({
                    onComplete: () => {
                        gsap.set(scene2CanvasEl, { clearProps: "transform" });
                        if (scene2InfoBlocks) {
                            gsap.set(scene2InfoBlocks, { clearProps: "transform" });
                        }
                        if (scene2GradientLayer) {
                            gsap.set(scene2GradientLayer, { clearProps: "opacity,visibility" });
                        }
                        if (playScene2Forward) playScene2Forward();
                        isHeroTitleHandoffActive = false;
                        isTransitioningScene = false;
                    }
                })
                    .to(scene2CanvasEl, {
                        scale: 1,
                        force3D: true,
                        duration: 1.05,
                        ease: "power3.out"
                    }, 0)
                    .to(scene2InfoBlocks, {
                        scale: 1,
                        force3D: true,
                        duration: 1.05,
                        ease: "power3.out"
                    }, 0)
                    .to(scene2GradientLayer, {
                        autoAlpha: 0,
                        duration: 1.05,
                        ease: "sine.inOut"
                    }, 0);
            }
        })
            .to(zoom.title, {
                x: zoom.zoomX,
                y: zoom.zoomY,
                scale: zoom.zoomScale,
                force3D: true,
                duration: 1.35,
                ease: "power3.in"
            }, 0)
            .to(header, { autoAlpha: 0, duration: 0.14, ease: "sine.in" }, 0.91)
            .call(() => setScene2HeaderTheme(true), null, 1.05)
            .to(header, { autoAlpha: 1, duration: 0.22, ease: "sine.out" }, 1.05)
            .to(zoom.stage, { autoAlpha: 0, duration: 0.4, ease: "sine.inOut" }, 0.95);
    };

    returnScene2ToScene0ViaZoom = function() {
        const scene1El = document.getElementById("scene-1");
        const scene2El = document.getElementById("scene-2");
        const scene2CanvasEl = document.getElementById("scene-2-canvas");
        const scene2GradientLayer = document.getElementById("scene-2-gradient-layer");
        const scene2InfoBlocks = document.querySelector(".scene-2-info-blocks");
        const header = document.getElementById("bigbee-header");
        if (!scene2El || !scene2CanvasEl || !scene0HeroTitle || typeof gsap === "undefined") return;

        if (typeof detachScene0HeroCircleEffect === "function") {
            detachScene0HeroCircleEffect();
        }
        // Cancel any residual Lenis wheel target before constructing the fixed
        // reverse layer. Otherwise the document continues drifting underneath
        // Scene 2 during the first part of the return animation.
        freezeHeroScrollPosition(window.scrollY);
        const zoom = createScene0ZoomStage(true);
        if (!zoom) {
            isTransitioningScene = false;
            return;
        }

        isTransitioningScene = true;
        scene0HeroTitle.style.visibility = "hidden";
        gsap.killTweensOf(scene2El);
        gsap.set(scene2El, { x: 0, y: 0 });
        gsap.set(zoom.stage, { autoAlpha: 0 });

        const finishScene0Return = () => {
                sceneContentReverseJourneyIsActive = false;
                freezeHeroScrollPosition(0);
                deactivateScene2Overlay(false);
                if (typeof resetScene2State === "function") resetScene2State();
                gsap.set(scene2El, { clearProps: "transform" });
                scene2El.style.opacity = "";
                scene2El.style.visibility = "";
                if (scene1El) {
                    scene1El.style.opacity = "";
                    scene1El.style.visibility = "";
                }
                setScene2HeaderTheme(false);
                // Restore the live title's geometry without exposing it while
                // the document is still settling back onto Scene 0.
                resetScene0HeroTitle(false);
                if (lenis) {
                    lenis.scrollTo(0, { immediate: true, force: true });
                }
                const previousScrollBehavior = document.documentElement.style.scrollBehavior;
                document.documentElement.style.scrollBehavior = "auto";
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
                window.scrollTo(0, 0);

                // Keep Lenis stopped at Scene 0. The next downward gesture is
                // intercepted by the zoom handoff itself, so resuming it here
                // would only reapply its stale Scene 2 target and cause drift.
                const holdScene0AtTop = () => {
                    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
                    document.documentElement.scrollTop = 0;
                    document.body.scrollTop = 0;
                    window.scrollTo(0, 0);
                };

                // Keep the full yellow camera layer opaque while Scene 0 first
                // settles invisibly, then receives two complete paint frames.
                // This prevents the live title from flashing at its stale
                // Scene 2 document position during the final layer swap.
                gsap.set(zoom.stage, { autoAlpha: 1 });
                let scene0LayoutFrames = 0;
                const settleScene0Layout = () => {
                    holdScene0AtTop();
                    scene0LayoutFrames += 1;
                    if (scene0LayoutFrames < 2) {
                        requestAnimationFrame(settleScene0Layout);
                        return;
                    }

                    // Force the settled geometry to be committed before the
                    // live title is revealed underneath the opaque clone.
                    scene0HeroTitle.getBoundingClientRect();
                    gsap.set(scene0HeroTitle, { autoAlpha: 1 });

                    let scene0PaintFrames = 0;
                    const finishPaintSafeSwap = () => {
                        holdScene0AtTop();
                        scene0PaintFrames += 1;
                        if (scene0PaintFrames < 2) {
                            requestAnimationFrame(finishPaintSafeSwap);
                            return;
                        }
                        zoom.stage.remove();
                        gsap.set(scene0HeroTitle, { clearProps: "opacity,visibility" });
                        document.documentElement.style.scrollBehavior = previousScrollBehavior;
                        if (header) gsap.set(header, { clearProps: "opacity,visibility" });
                        if (typeof attachScene0HeroCircleEffect === "function") {
                            attachScene0HeroCircleEffect();
                        }
                        isTransitioningScene = false;
                        if (typeof handleHeaderScroll === "function") handleHeaderScroll();
                    };
                    requestAnimationFrame(finishPaintSafeSwap);
                };
                requestAnimationFrame(settleScene0Layout);
        };

        const startAmpersandReturn = () => {
            gsap.timeline({ onComplete: finishScene0Return })
            .to(zoom.stage, { autoAlpha: 1, duration: 0.4, ease: "sine.inOut" }, 0)
            .to(header, { autoAlpha: 0, duration: 0.16, ease: "sine.in" }, 0)
            .call(() => setScene2HeaderTheme(false), null, 0.16)
            .to(header, { autoAlpha: 1, duration: 0.22, ease: "sine.out" }, 0.16)
            .to(zoom.title, {
                x: 0,
                y: 0,
                scale: 1,
                force3D: true,
                duration: 1.35,
                ease: "power3.out"
            }, 0)
            .to(zoom.title, {
                autoAlpha: 1,
                duration: 0.46,
                ease: "sine.out"
            }, 0.46);
        };

        // Mirror the Scene 2 entrance first: frame 0105 collapses to the
        // center as the gray gradient returns over the white base.
        gsap.timeline()
            .to(scene2CanvasEl, {
                scale: 0,
                force3D: true,
                transformOrigin: "50% 50%",
                duration: 1.05,
                ease: "power3.in"
            }, 0)
            .to(scene2InfoBlocks, {
                scale: 0,
                force3D: true,
                transformOrigin: "50% 50%",
                duration: 1.05,
                ease: "power3.in"
            }, 0)
            .to(scene2GradientLayer, {
                autoAlpha: 1,
                duration: 1.05,
                ease: "sine.inOut"
            }, 0)
            // Begin revealing the ampersand before Scene 2 reaches scale zero,
            // avoiding the blank charcoal beat that looked like a full-frame flick.
            .call(startAmpersandReturn, null, 0.82);
    };

    function handoffHeroTitleToScene1(onReadyToSwap) {
        if (!scene0HeroTitle || typeof gsap === "undefined") {
            createScene1PinnedTitle();
            if (onReadyToSwap) onReadyToSwap();
            return;
        }

        removeScene1PinnedTitle(true);
        isHeroTitleHandoffActive = true;

        const targetLeft = Math.max(24, window.innerWidth * 0.06);
        const sourceLines = Array.from(scene0HeroTitle.querySelectorAll(".bigbee-hero__title-line"));
        const titleRect = scene0HeroTitle.getBoundingClientRect();
        const sourceLineRects = sourceLines.map((line) => line.getBoundingClientRect());
        const targetTop = (window.innerHeight - titleRect.height) / 2;
        const scene0ScrollIndicator = document.querySelector("#scene-0 .bigbee-scroll-indicator");

        // Animate the fixed title that will remain over Scene 1. Keeping the
        // same element throughout avoids a one-frame placement change when the
        // moving Scene 0 title is exchanged for its pinned copy.
        const pinnedTitle = scene0HeroTitle.cloneNode(true);
        pinnedTitle.removeAttribute("id");
        pinnedTitle.classList.add("bigbee-hero-title-handoff");
        pinnedTitle.setAttribute("aria-hidden", "true");
        document.body.appendChild(pinnedTitle);

        const pinnedLines = Array.from(pinnedTitle.querySelectorAll(".bigbee-hero__title-line"));
        gsap.set(pinnedTitle, {
            top: titleRect.top,
            left: 0,
            width: "100%",
            x: 0,
            y: 0,
            transformOrigin: "left top"
        });
        pinnedLines.forEach((line, index) => {
            gsap.set(line, {
                x: sourceLineRects[index].left,
                y: 0
            });
        });
        scene0HeroTitle.style.visibility = "hidden";

        if (scene0ScrollIndicator) {
            gsap.to(scene0ScrollIndicator, { autoAlpha: 0, duration: 0.25, overwrite: true });
        }

        const handoffTimeline = gsap.timeline({
            defaults: { duration: 0.75, ease: "power3.inOut" },
            onComplete: () => {
                scene1PinnedTitleTop = targetTop;
                if (onReadyToSwap) onReadyToSwap();
            }
        });

        handoffTimeline
            .to(pinnedTitle, { top: targetTop }, 0)
            .to(pinnedLines, { x: targetLeft }, 0);
    }

    function handoffHeroTitleBackToScene0(onComplete) {
        const pinnedTitle = document.querySelector(".bigbee-hero-title-handoff");
        if (!pinnedTitle || !scene0HeroTitle || typeof gsap === "undefined") {
            removeScene1PinnedTitle(true);
            resetScene0HeroTitle();
            if (onComplete) onComplete();
            return;
        }

        const sourceTitleRect = scene0HeroTitle.getBoundingClientRect();
        const sourceTitleTopAtPageStart = sourceTitleRect.top + window.scrollY;
        const sourceLineRects = Array.from(
            scene0HeroTitle.querySelectorAll(".bigbee-hero__title-line")
        ).map((line) => line.getBoundingClientRect());
        const pinnedLines = Array.from(pinnedTitle.querySelectorAll(".bigbee-hero__title-line"));

        isHeroTitleHandoffActive = true;
        const reverseTimeline = gsap.timeline({
            defaults: { duration: 0.75, ease: "power3.inOut" },
            onComplete: () => {
                resetScene0HeroTitle();
                removeScene1PinnedTitle(true);
                isHeroTitleHandoffActive = false;
                if (onComplete) onComplete();
            }
        });

        reverseTimeline
            // Return the wrapper to Scene 0's full-width coordinate system.
            // After the Scene 2 handoff it still carries Scene 1's left inset;
            // leaving that inset in place adds it to every line target.
            .to(pinnedTitle, {
                top: sourceTitleTopAtPageStart,
                left: 0,
                width: "100%"
            }, 0)
            .to(pinnedLines, {
                x: (index) => sourceLineRects[index].left
            }, 0);
    }

    function getElementDocTop(el) {
        let top = 0;
        let current = el;
        while (current) {
            top += current.offsetTop;
            current = current.offsetParent;
        }
        return top;
    }

    function consumeHeroSceneInput(e) {
        if (!e) return;
        if (e.cancelable) e.preventDefault();
        if (typeof e.stopImmediatePropagation === "function") {
            e.stopImmediatePropagation();
        }
    }

    function clearContentBoundaryInputReleaseGate() {
        contentBoundaryAwaitingFreshUpwardInput = false;
        contentBoundaryLastUpwardInputAt = 0;
        if (contentBoundaryInputReleaseTimer !== null) {
            window.clearTimeout(contentBoundaryInputReleaseTimer);
            contentBoundaryInputReleaseTimer = null;
        }
    }

    function scheduleContentBoundaryInputReleaseCheck(delay = CONTENT_TO_SCENE6_INPUT_RELEASE_DELAY) {
        if (contentBoundaryInputReleaseTimer !== null) {
            window.clearTimeout(contentBoundaryInputReleaseTimer);
        }
        contentBoundaryInputReleaseTimer = window.setTimeout(() => {
            contentBoundaryInputReleaseTimer = null;
            if (!contentBoundaryAwaitingFreshUpwardInput) return;

            const quietDuration = Date.now() - contentBoundaryLastUpwardInputAt;
            const remainingQuietTime = CONTENT_TO_SCENE6_INPUT_RELEASE_DELAY - quietDuration;
            if (isTransitioningScene || remainingQuietTime > 0) {
                scheduleContentBoundaryInputReleaseCheck(
                    Math.max(CONTENT_TO_SCENE6_INPUT_RELEASE_DELAY, remainingQuietTime)
                );
                return;
            }

            contentBoundaryAwaitingFreshUpwardInput = false;
            contentBoundaryLastUpwardInputAt = 0;
        }, Math.max(0, delay));
    }

    function markContentBoundaryUpwardInput() {
        if (!contentBoundaryAwaitingFreshUpwardInput) return;
        contentBoundaryLastUpwardInputAt = Date.now();
        scheduleContentBoundaryInputReleaseCheck();
    }

    function beginContentBoundaryInputReleaseGate() {
        contentBoundaryAwaitingFreshUpwardInput = true;
        contentBoundaryLastUpwardInputAt = Date.now();
        scheduleContentBoundaryInputReleaseCheck();
    }

    function holdContentBoundaryPosition(contentSectionTop) {
        if (!Number.isFinite(contentSectionTop)) return;
        if (lenis) {
            lenis.scrollTo(contentSectionTop, { immediate: true, force: true });
        }
        if (Math.abs(window.scrollY - contentSectionTop) > 0.5) {
            window.scrollTo(0, contentSectionTop);
        }
    }

    function freezeHeroScrollPosition(scrollY) {
        const lockedY = Math.max(0, scrollY);
        if (lenis) {
            lenis.stop();
            lenis.scrollTo(lockedY, { immediate: true, force: true });
        }
        if (Math.abs(window.scrollY - lockedY) > 0.5) {
            window.scrollTo(0, lockedY);
        }
    }

    function getHeroSceneInputPixels(direction, e, explicitDelta) {
        if (Number.isFinite(explicitDelta)) return Math.abs(explicitDelta) * (direction === "down" ? 1 : -1);
        if (e && Number.isFinite(e.deltaY)) {
            let pixels = Math.abs(e.deltaY);
            if (e.deltaMode === 1) pixels *= 16;
            if (e.deltaMode === 2) pixels *= window.innerHeight;
            pixels = Math.min(pixels, HERO_SCENE_MAX_WHEEL_DELTA);
            return pixels * (direction === "down" ? 1 : -1);
        }
        return 120 * (direction === "down" ? 1 : -1);
    }

    function getHeroSceneScrubDelta(inputPixels, sequenceLength) {
        // Give each pinned sequence enough travel to remain controllable during
        // a normal wheel or trackpad gesture instead of completing in one flick.
        const scrubDistance = Math.max(1, window.innerHeight * HERO_SCENE_SCRUB_VIEWPORTS);
        return inputPixels * (sequenceLength / scrubDistance);
    }

    function transitionBetweenHeroScenes(direction, e, explicitDelta) {
        if (mobileStaticHomepage) return;

        if (skipHomepageIntro && !homepageContentEntryReady) {
            // Keep normal homepage content scrollable while Scene 6 prepares in
            // the background. Only hold an upward gesture that would expose the
            // concealed hero before its reverse-animation state is ready.
            if (direction === "down") {
                homepageContentEntryReverseQueued = false;
                homepageContentEntryUserScrolled = true;
                setContentEntryPreloadStatus("loading");
            } else if (direction === "up") {
                const contentSection = document.getElementById("about-bigbee");
                const contentSectionTop = contentSection ? getElementDocTop(contentSection) : null;
                const currentY = window.scrollY;
                let upwardInputPixels = Number.isFinite(explicitDelta) ? Math.abs(explicitDelta) : 0;

                if (!upwardInputPixels && e && Number.isFinite(e.deltaY)) {
                    upwardInputPixels = Math.abs(e.deltaY);
                    if (e.deltaMode === 1) upwardInputPixels *= 16;
                    if (e.deltaMode === 2) upwardInputPixels *= window.innerHeight;
                }

                const wouldCrossContentBoundary = contentSectionTop !== null
                    && upwardInputPixels > 0
                    && upwardInputPixels >= currentY - contentSectionTop - 8;

                if (
                    contentSectionTop !== null
                    && (currentY <= contentSectionTop + 8 || wouldCrossContentBoundary)
                ) {
                    homepageContentEntryReverseQueued = true;
                    setContentEntryPreloadStatus("waiting");
                    consumeHeroSceneInput(e);
                }
            }
            return;
        }

        const scene1El = document.getElementById("scene-1");
        const scene0El = document.getElementById("scene-0");
        if (!scene1El || !scene0El) return;

        const scene1DocTop = getElementDocTop(scene1El);
        const currentY = window.scrollY;
        const contentSection = document.getElementById("about-bigbee");
        const contentSectionTop = contentSection ? getElementDocTop(contentSection) : null;
        const scrubPixels = getHeroSceneInputPixels(direction, e, explicitDelta);
        let rawUpwardInputPixels = 0;
        if (direction === "up") {
            if (Number.isFinite(explicitDelta)) {
                rawUpwardInputPixels = Math.abs(explicitDelta);
            } else if (e && Number.isFinite(e.deltaY)) {
                rawUpwardInputPixels = Math.abs(e.deltaY);
                if (e.deltaMode === 1) rawUpwardInputPixels *= 16;
                if (e.deltaMode === 2) rawUpwardInputPixels *= window.innerHeight;
            }
        }
        const upwardInputWouldCrossContentBoundary = contentSectionTop !== null
            && rawUpwardInputPixels > 0
            && rawUpwardInputPixels >= currentY - contentSectionTop - 8;
        const anyManagedOverlayActive = scene6IsOverlayActive
            || scene5IsOverlayActive
            || scene4IsOverlayActive
            || scene3IsOverlayActive
            || scene2IsOverlayActive
            || scene1IsOverlayActive;

        if (contentBoundaryAwaitingFreshUpwardInput) {
            if (direction === "down") {
                clearContentBoundaryInputReleaseGate();
            } else if (direction === "up") {
                markContentBoundaryUpwardInput();
            }
        }

        if (isTransitioningScene && !anyManagedOverlayActive) {
            consumeHeroSceneInput(e);
            return;
        }

        if (
            direction === "up"
            && contentBoundaryAwaitingFreshUpwardInput
            && !anyManagedOverlayActive
            && contentSectionTop !== null
        ) {
            consumeHeroSceneInput(e);
            holdContentBoundaryPosition(contentSectionTop);
            return;
        }

        if (
            direction === "up"
            && !scene6IsOverlayActive
            && !scene5IsOverlayActive
            && !scene4IsOverlayActive
            && !scene3IsOverlayActive
            && !scene2IsOverlayActive
            && !scene1IsOverlayActive
            && !isTransitioningScene
            && (scene6HasCompletedForward || scene6ContentHandoffIsActive)
            && contentSectionTop !== null
            && currentY > contentSectionTop + 8
            && (
                currentY <= contentSectionTop + CONTENT_TO_SCENE6_BOUNDARY_SNAP_RANGE
                || upwardInputWouldCrossContentBoundary
            )
        ) {
            consumeHeroSceneInput(e);
            isTransitioningScene = true;
            beginContentBoundaryInputReleaseGate();
            if (lenis) {
                lenis.scrollTo(contentSectionTop, {
                    duration: HERO_SCENE_TRANSITION_DURATION,
                    force: true
                });
            } else {
                window.scrollTo({ top: contentSectionTop, behavior: "smooth" });
            }
            setTimeout(() => {
                isTransitioningScene = false;
                if (typeof handleHeaderScroll === "function") handleHeaderScroll();
            }, HERO_SCENE_TRANSITION_DURATION * 1000);
            return;
        }

        if (
            direction === "up"
            && !scene6IsOverlayActive
            && !scene5IsOverlayActive
            && !scene4IsOverlayActive
            && !scene3IsOverlayActive
            && !scene2IsOverlayActive
            && !scene1IsOverlayActive
            && !isTransitioningScene
            && (scene6HasCompletedForward || scene6ContentHandoffIsActive)
            && returnContentToScene6
            && contentSectionTop !== null
            && currentY >= contentSectionTop - 4
            && currentY <= contentSectionTop + 8
        ) {
            consumeHeroSceneInput(e);
            clearContentBoundaryInputReleaseGate();
            returnContentToScene6();
            return;
        }

        if (scene6IsOverlayActive) {
            if (isScene6Animating || isTransitioningScene) {
                consumeHeroSceneInput(e);
                return;
            }
            if (
                direction === "down"
                && scene6HasCompletedForward
                && !scene6FinalContentIsAnimating
                && advanceScene6ToContent
            ) {
                consumeHeroSceneInput(e);
                advanceScene6ToContent();
                return;
            }
            if (
                direction === "up"
                && scene6HasCompletedForward
                && scrubScene6Frames
            ) {
                consumeHeroSceneInput(e);
                isTransitioningScene = true;
                if (hideScene6FinalContent) {
                    hideScene6FinalContent(() => {
                        scene6HasCompletedForward = false;
                        isTransitioningScene = false;
                        scrubScene6Frames(scrubPixels);
                    });
                } else {
                    scene6HasCompletedForward = false;
                    isTransitioningScene = false;
                    scrubScene6Frames(scrubPixels);
                }
                return;
            }
            if (scrubScene6Frames) {
                consumeHeroSceneInput(e);
                const scrubResult = scrubScene6Frames(scrubPixels);
                if (scrubResult === "past-start" && returnScene6ToScene5) {
                    isTransitioningScene = true;
                    returnScene6ToScene5();
                }
                return;
            }
            deactivateScene6Overlay();
            return;
        }

        if (scene5IsOverlayActive) {
            if (isScene5Animating || isTransitioningScene) {
                consumeHeroSceneInput(e);
                return;
            }

            if (
                direction === "down"
                && scene5HasCompletedForward
                && advanceScene5ToScene6
            ) {
                consumeHeroSceneInput(e);
                setSceneScrollPrompt(5, false);
                advanceScene5ToScene6(scrubPixels);
                return;
            }

            if (
                direction === "up"
                && scene5HasCompletedForward
                && scrubScene5Frames
            ) {
                consumeHeroSceneInput(e);
                setSceneScrollPrompt(5, false);
                scene5HasCompletedForward = false;
                scrubScene5Frames(scrubPixels);
                return;
            }

            if (scrubScene5Frames) {
                consumeHeroSceneInput(e);
                const scrubResult = scrubScene5Frames(scrubPixels);
                if (scrubResult === "past-start" && returnScene5ToScene4) {
                    isTransitioningScene = true;
                    returnScene5ToScene4();
                }
                return;
            }

            deactivateScene5Overlay();
            return;
        }

        if (scene4IsOverlayActive) {
            if (isScene4Animating || isTransitioningScene) {
                consumeHeroSceneInput(e);
                return;
            }

            if (
                direction === "down"
                && scene4HasCompletedForward
                && advanceScene4ToScene5
            ) {
                consumeHeroSceneInput(e);
                setSceneScrollPrompt(4, false);
                advanceScene4ToScene5();
                return;
            }

            if (
                direction === "up"
                && scene4HasCompletedForward
                && scrubScene4Frames
            ) {
                consumeHeroSceneInput(e);
                setSceneScrollPrompt(4, false);
                scene4HasCompletedForward = false;
                scrubScene4Frames(scrubPixels);
                return;
            }

            if (scrubScene4Frames) {
                consumeHeroSceneInput(e);
                const scrubResult = scrubScene4Frames(scrubPixels);
                if (scrubResult === "past-start" && returnScene4ToScene3) {
                    isTransitioningScene = true;
                    returnScene4ToScene3();
                }
                return;
            }

            deactivateScene4Overlay();
            return;
        }

        if (scene3IsOverlayActive) {
            if (isScene3Animating || isTransitioningScene) {
                consumeHeroSceneInput(e);
                return;
            }

            if (
                direction === "up"
                && scene3HasCompletedForward
                && scrubScene3Frames
            ) {
                consumeHeroSceneInput(e);
                isTransitioningScene = true;
                if (hideScene3SupportingCopy) {
                    hideScene3SupportingCopy(() => {
                        scene3HasCompletedForward = false;
                        isTransitioningScene = false;
                        scrubScene3Frames(scrubPixels);
                    });
                } else {
                    scene3HasCompletedForward = false;
                    isTransitioningScene = false;
                    scrubScene3Frames(scrubPixels);
                }
                return;
            }

            if (
                direction === "down"
                && scene3HasCompletedForward
                && advanceScene3ToScene4
            ) {
                consumeHeroSceneInput(e);
                setSceneScrollPrompt(3, false);
                advanceScene3ToScene4(scrubPixels);
                return;
            }

            if (scrubScene3Frames) {
                consumeHeroSceneInput(e);
                const scrubResult = scrubScene3Frames(scrubPixels);
                if (scrubResult === "past-start" && returnScene3ToScene2) {
                    isTransitioningScene = true;
                    returnScene3ToScene2();
                }
                return;
            }

            deactivateScene3Overlay();
            return;
        }

        if (scene2IsOverlayActive) {
            if (isScene2Animating || isTransitioningScene) {
                consumeHeroSceneInput(e);
            } else if (
                direction === "up"
                && scene2HasCompletedForward
                && scrubScene2Frames
            ) {
                consumeHeroSceneInput(e);
                setSceneScrollPrompt(2, false);
                scene2HasCompletedForward = false;
                scrubScene2Frames(scrubPixels);
            } else if (
                direction === "down"
                && scene2HasCompletedForward
                && advanceScene2ToScene3
            ) {
                consumeHeroSceneInput(e);
                setSceneScrollPrompt(2, false);
                advanceScene2ToScene3();
            } else if (scrubScene2Frames) {
                consumeHeroSceneInput(e);
                const scrubResult = scrubScene2Frames(scrubPixels);
                if (scrubResult === "past-start" && returnScene2ToScene0ViaZoom) {
                    isTransitioningScene = true;
                    returnScene2ToScene0ViaZoom();
                }
            } else {
                setScene2HeaderTheme(false);
                deactivateScene2Overlay();
            }
            return;
        }

        if (scene1IsOverlayActive) {
            consumeHeroSceneInput(e);
            if (isTransitioningScene) return;

            if (
                direction === "down"
                && !isScene1Animating
                && scene1HasCompletedForward
                && advanceScene1ToScene2
            ) {
                advanceScene1ToScene2();
            } else if (direction === "up") {
                isTransitioningScene = true;
                if (cancelScene1Animation) {
                    cancelScene1Animation();
                }
                const scene0BackgroundReturn = createScene0BackgroundReturnLayer();
                if (typeof gsap !== "undefined") {
                    // Fade only the frame artwork. Keeping Scene 1's Hero
                    // background opaque prevents the Scene 2 gradient below
                    // it from appearing while the title returns to Scene 0.
                    const scene1CanvasEl = document.getElementById("scene-1-canvas");
                    gsap.to(scene1CanvasEl || scene1El, {
                        autoAlpha: 0,
                        duration: 0.75,
                        ease: "power3.inOut",
                        overwrite: true
                    });
                    gsap.to(scene0BackgroundReturn, {
                        autoAlpha: 1,
                        duration: 0.75,
                        ease: "power2.inOut",
                        overwrite: true
                    });
                } else {
                    scene0BackgroundReturn.style.opacity = "1";
                    scene0BackgroundReturn.style.visibility = "visible";
                }
                handoffHeroTitleBackToScene0(() => {
                    if (lenis) {
                        lenis.scrollTo(0, { immediate: true, force: true });
                    } else {
                        window.scrollTo(0, 0);
                    }
                    deactivateScene1Overlay();
                    if (typeof resetSceneState === "function") {
                        resetSceneState(1);
                    }
                    if (typeof gsap !== "undefined") {
                        gsap.set(scene1El, { clearProps: "opacity,visibility" });
                        const scene1CanvasEl = document.getElementById("scene-1-canvas");
                        if (scene1CanvasEl) {
                            gsap.set(scene1CanvasEl, { clearProps: "opacity,visibility" });
                        }
                    }
                    removeScene0BackgroundReturnLayer(scene0BackgroundReturn);
                    isTransitioningScene = false;
                });
            }
            return;
        }

        // Single scroll DOWN on Scene 0 -> zoom through the ampersand and
        // land directly on Scene 2 frame 0105. Scene 1 is intentionally skipped.
        if (direction === "down" && currentY < 120) {
            consumeHeroSceneInput(e);
            if (isTransitioningScene || !advanceScene0ToScene2ViaZoom) return;
            advanceScene0ToScene2ViaZoom();
        }
        // Legacy Scene 1 boundary handling remains dormant while Scene 1 is skipped.
        else if (direction === "down" && Math.abs(currentY - scene1DocTop) <= 300 && scene1HasCompletedForward) {
            if (e && e.cancelable) e.preventDefault();
            if (isTransitioningScene || isScene1Animating) return;

            if (advanceScene1ToScene2) {
                advanceScene1ToScene2();
            }
        }
        // Legacy Scene 1 reverse handling remains available for state cleanup.
        else if (direction === "up" && Math.abs(currentY - scene1DocTop) <= 300) {
            if (e && e.cancelable) e.preventDefault();
            if (isTransitioningScene || isScene1Animating) return;

            isTransitioningScene = true;
            removeScene1PinnedTitle();
            resetScene0HeroTitle();
            if (lenis) {
                lenis.scrollTo("#scene-0", { duration: HERO_SCENE_TRANSITION_DURATION, lock: true });
            } else {
                scene0El.scrollIntoView({ behavior: "smooth" });
            }

            if (typeof resetSceneState === "function") {
                resetSceneState(1);
            }

            setTimeout(() => {
                isTransitioningScene = false;
            }, HERO_SCENE_TRANSITION_DURATION * 1000);
        }
    }

    if (!mobileStaticHomepage) {
        window.addEventListener("wheel", (e) => {
            if (Math.abs(e.deltaY) > 5) {
                if (e.deltaY > 0) {
                    transitionBetweenHeroScenes("down", e);
                } else if (e.deltaY < 0) {
                    transitionBetweenHeroScenes("up", e);
                }
            }
        }, { passive: false, capture: true });

        window.addEventListener("touchstart", (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        window.addEventListener("touchmove", (e) => {
            if (scene1IsOverlayActive || scene2IsOverlayActive || scene3IsOverlayActive || scene4IsOverlayActive || scene5IsOverlayActive || scene6IsOverlayActive) {
                consumeHeroSceneInput(e);
            }
        }, { passive: false, capture: true });

        window.addEventListener("touchend", (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const deltaY = touchStartY - touchEndY;
            if (deltaY > 40) {
                transitionBetweenHeroScenes("down", e, deltaY);
            } else if (deltaY < -40) {
                transitionBetweenHeroScenes("up", e, Math.abs(deltaY));
            }
        }, { passive: true });
    }

    // --------------------------------------------------------------------------
    // 3C. SCENE-1 FRAME ANIMATION ENGINE (0001 to 0145)
    // --------------------------------------------------------------------------
    const scene1Canvas = document.getElementById("scene-1-canvas");
    if (!mobileStaticHomepage && scene1Canvas && typeof gsap !== "undefined") {
        const scene1Ctx = scene1Canvas.getContext("2d");
        const scene1FrameCount = 145;
        // Scene 1 remains named and available as dormant legacy state, but its
        // removed frame files must never be requested.
        const scene1Images = window.preloadedScene1Images;
        const scene1FrameState = { frame: 0 };
        let currentTween = null;

        cancelScene1Animation = function() {
            if (currentTween) {
                currentTween.kill();
                currentTween = null;
            }
            isScene1Animating = false;
            scene1HasCompletedForward = false;
            if (scene1ScrollIndicator) {
                scene1ScrollIndicator.classList.remove("is-visible");
            }
        };

        function resizeScene1Canvas() {
            if (!scene1Canvas) return;
            scene1Canvas.width = scene1Canvas.offsetWidth || window.innerWidth;
            scene1Canvas.height = scene1Canvas.offsetHeight || window.innerHeight;
            renderScene1Frame(scene1FrameState.frame);
        }
        window.resizeScene1Canvas = resizeScene1Canvas;

        // Initial draw is intentionally blank because Scene 1 is fully skipped.
        resizeScene1Canvas();

        let targetParallaxX = 0;
        let targetParallaxY = 0;
        let currentParallaxX = 0;
        let currentParallaxY = 0;

        const scene1El = document.getElementById("scene-1");
        if (scene1El) {
            scene1El.addEventListener("mousemove", (e) => {
                const rect = scene1El.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                targetParallaxX = (e.clientX - centerX) / (rect.width / 2);
                targetParallaxY = (e.clientY - centerY) / (rect.height / 2);
            }, { passive: true });

            scene1El.addEventListener("mouseleave", () => {
                targetParallaxX = 0;
                targetParallaxY = 0;
            }, { passive: true });
        }

        function renderScene1Frame(index) {
            const frameIdx = Math.floor(index);
            const currentImg = scene1Images[frameIdx];
            if (!currentImg || !currentImg.complete || !currentImg.naturalWidth) return;
            if (!scene1Canvas || !scene1Ctx) return;

            scene1Ctx.clearRect(0, 0, scene1Canvas.width, scene1Canvas.height);

            // Scale to 100% full screen width so frames span edge-to-edge with zero side margins
            const ratio = scene1Canvas.width / currentImg.width;
            
            let centerShiftX = 0;
            let centerShiftY = (scene1Canvas.height - currentImg.height * ratio) / 2;

            // Apply interactive mouse movement parallax to final image frame
            if (frameIdx >= scene1FrameCount - 1) {
                centerShiftX += currentParallaxX * 22;
                centerShiftY += currentParallaxY * 22;
            }

            scene1Ctx.drawImage(
                currentImg,
                0, 0, currentImg.width, currentImg.height,
                centerShiftX, centerShiftY, currentImg.width * ratio, currentImg.height * ratio
            );
        }

        function updateScene1ParallaxLoop() {
            currentParallaxX += (targetParallaxX - currentParallaxX) * 0.08;
            currentParallaxY += (targetParallaxY - currentParallaxY) * 0.08;

            if (scene1HasCompletedForward && Math.floor(scene1FrameState.frame) >= scene1FrameCount - 1) {
                renderScene1Frame(scene1FrameCount - 1);
            }
            requestAnimationFrame(updateScene1ParallaxLoop);
        }

        window.addEventListener("resize", resizeScene1Canvas, { passive: true });
        resizeScene1Canvas();
        updateScene1ParallaxLoop();

        const scene1ScrollIndicator = document.getElementById("scene-1-scroll-indicator");

        // 1) Play sequence FORWARD automatically from frame 0 -> 65
        playScene1Forward = function(onCompleteCallback) {
            if (currentTween) currentTween.kill();
            isScene1Animating = true;
            if (scene1ScrollIndicator) scene1ScrollIndicator.classList.remove("is-visible");

            currentTween = gsap.to(scene1FrameState, {
                frame: scene1FrameCount - 1,
                duration: scene1FrameCount / 60,
                ease: "power2.out",
                onUpdate: () => {
                    renderScene1Frame(scene1FrameState.frame);
                },
                onComplete: () => {
                    isScene1Animating = false;
                    scene1HasCompletedForward = true;
                    if (scene1ScrollIndicator) {
                        scene1ScrollIndicator.classList.add("is-visible");
                    }
                    if (onCompleteCallback) onCompleteCallback();
                }
            });
        };

        // 2) Keep frame 0145 fixed while the rest of the page advances to Scene 2.
        advanceScene1ToScene2 = function() {
            if (isTransitioningScene) return;

            isTransitioningScene = true;
            isScene1Animating = false;
            if (scene1ScrollIndicator) scene1ScrollIndicator.classList.remove("is-visible");

            if (currentTween) currentTween.kill();
            scene1FrameState.frame = scene1FrameCount - 1;
            renderScene1Frame(scene1FrameState.frame);

            const scene2El = document.getElementById("scene-2");
            const scene2CanvasEl = document.getElementById("scene-2-canvas");
            scene1Canvas.classList.add("scene-1-sticky-frame-layer");
            document.body.appendChild(scene1Canvas);
            if (typeof resetScene2State === "function") {
                resetScene2State();
            }
            if (scene2CanvasEl) {
                scene2CanvasEl.style.opacity = "0";
                scene2CanvasEl.style.visibility = "hidden";
            }

            if (scene1IsOverlayActive) {
                const scene1Top = scene1NaturalDocTop ?? window.innerHeight;
                if (Math.abs(window.scrollY - scene1Top) > 1 && lenis) {
                    lenis.scrollTo(scene1Top, { immediate: true, force: true });
                } else if (Math.abs(window.scrollY - scene1Top) > 1) {
                    window.scrollTo(0, scene1Top);
                }
            }

            movePinnedTitleIntoPageFlow();
            document.body.classList.add("scene-1-to-scene-2");

            if (lenis && scene2El) {
                lenis.scrollTo(scene2El, {
                    duration: HERO_SCENE_TRANSITION_DURATION,
                    force: true
                });
            } else if (scene2El) {
                scene2El.scrollIntoView({ behavior: "smooth" });
            }

            setTimeout(() => {
                document.body.classList.remove("scene-1-to-scene-2");
                scene1Canvas.style.visibility = "hidden";
                scene1Canvas.classList.remove("scene-1-sticky-frame-layer");
                scene1El.insertBefore(scene1Canvas, scene1El.firstChild);
                scene1Canvas.style.visibility = "";
                scene1El.style.opacity = "0";
                scene1El.style.visibility = "hidden";
                if (scene1IsOverlayActive) {
                    deactivateScene1Overlay(false);
                }
                removeScene1PinnedTitle(true);
                resetScene0HeroTitle();
                scene1HasCompletedForward = false;
                isTransitioningScene = false;
                activateScene2Overlay();
                if (scene2CanvasEl) {
                    scene2CanvasEl.style.opacity = "1";
                    scene2CanvasEl.style.visibility = "visible";
                }
                if (playScene2Forward) {
                    requestAnimationFrame(() => playScene2Forward());
                }
            }, HERO_SCENE_TRANSITION_DURATION * 1000);
        };

        // Reverse the legacy section handoff after Scene 2 returns to frame 0105.
        returnScene2ToScene1 = function() {
            const scene2El = document.getElementById("scene-2");
            const scene2CanvasEl = document.getElementById("scene-2-canvas");
            if (!scene2El) return;

            if (scene2CanvasEl) {
                scene2CanvasEl.style.opacity = "0";
                scene2CanvasEl.style.visibility = "hidden";
            }

            scene1El.style.opacity = "";
            scene1El.style.visibility = "";
            scene1FrameState.frame = scene1FrameCount - 1;
            renderScene1Frame(scene1FrameState.frame);

            activateScene1Overlay();
            document.body.classList.add("scene-2-to-scene-1");

            gsap.set(scene2El, { y: 0 });
            gsap.to(scene2El, {
                y: window.innerHeight,
                duration: HERO_SCENE_TRANSITION_DURATION,
                ease: "power3.inOut",
                overwrite: true
            });

            scene1Canvas.classList.add("scene-1-sticky-frame-layer");
            document.body.appendChild(scene1Canvas);
            createTitleForScene2ReverseScroll();

            const scene1Top = scene1NaturalDocTop ?? getElementDocTop(scene1El);
            if (lenis) {
                lenis.scrollTo(scene1Top, {
                    duration: HERO_SCENE_TRANSITION_DURATION,
                    force: true
                });
            } else {
                scene1El.scrollIntoView({ behavior: "smooth" });
            }

            setTimeout(() => {
                // Keep Scene 2 hidden while its fixed/translated state is
                // removed. Otherwise its dark gradient can flash behind the
                // returning Hero title for one final frame.
                scene2El.style.visibility = "hidden";
                document.body.classList.remove("scene-2-to-scene-1");
                gsap.set(scene2El, { clearProps: "transform" });
                deactivateScene2Overlay(false);
                pinTitleAtCurrentViewportPosition();

                scene1Canvas.style.visibility = "hidden";
                scene1Canvas.classList.remove("scene-1-sticky-frame-layer");
                scene1El.insertBefore(scene1Canvas, scene1El.firstChild);
                scene1Canvas.style.visibility = "";

                scene1HasCompletedForward = true;
                isScene1Animating = false;
                if (scene1ScrollIndicator) {
                    scene1ScrollIndicator.classList.add("is-visible");
                }
                if (typeof resetScene2State === "function") {
                    resetScene2State();
                }
                scene2El.style.visibility = "";
                setScene2HeaderTheme(false);
                isTransitioningScene = false;
            }, HERO_SCENE_TRANSITION_DURATION * 1000);
        };

        // Universal Scene Reset Engine
        resetSceneState = function(sceneNum) {
            if (sceneNum === 1) {
                if (cancelScene1Animation) {
                    cancelScene1Animation();
                }
                scene1HasCompletedForward = false;
                isScene1Animating = false;
                scene1FrameState.frame = 0;
                if (typeof renderScene1Frame === "function") {
                    renderScene1Frame(0);
                }
                const indicator = document.getElementById("scene-1-scroll-indicator");
                if (indicator) indicator.classList.remove("is-visible");
            } else if (sceneNum === 2) {
                if (typeof resetScene2State === "function") {
                    resetScene2State();
                }
            } else if (sceneNum === 3) {
                if (typeof resetScene3State === "function") {
                    resetScene3State();
                }
            } else if (sceneNum === 4) {
                if (typeof resetScene4State === "function") {
                    resetScene4State();
                }
            } else if (sceneNum === 5) {
                if (typeof resetScene5State === "function") {
                    resetScene5State();
                }
            } else if (sceneNum === 6) {
                if (typeof resetScene6State === "function") {
                    resetScene6State();
                }
            }
            const sceneEl = document.getElementById(`scene-${sceneNum}`);
            if (sceneEl) {
                sceneEl.classList.remove("scene-active");
            }
        };

        // Trigger auto-forward animation when entering scene-1 via scroll & reset on leave back.
        // A content-entry visit jumps past this dormant scene programmatically;
        // letting its observer fire there creates a fixed blurred title clone
        // that can remain over the normal homepage content.
        if (!skipHomepageIntro && typeof ScrollTrigger !== "undefined") {
            ScrollTrigger.create({
                trigger: "#scene-1",
                start: "top 40%",
                onEnter: () => {
                    if (!isTransitioningScene && !isHeroTitleHandoffActive && !document.querySelector(".bigbee-hero-title-handoff")) {
                        createScene1PinnedTitle();
                    }
                    if (!isTransitioningScene && !scene1HasCompletedForward && !isScene1Animating && playScene1Forward) {
                        playScene1Forward();
                    }
                    if (typeof window.preloadScene === "function") {
                        window.preloadScene(2);
                        window.preloadScene(3);
                    }
                },
                onLeaveBack: () => {
                    removeScene1PinnedTitle();
                    resetScene0HeroTitle();
                    if (resetSceneState) resetSceneState(1);
                }
            });
        }
    }

    // --------------------------------------------------------------------------
    // 3D. SCENE-2 SCROLL-SCRUB ENGINE (129 WEBP FRAMES: 0105 to 0233)
    // --------------------------------------------------------------------------
    const scene2Canvas = document.getElementById("scene-2-canvas");
    let playScene2Forward = null;
    let isScene2Animating = false;
    let scene2HasCompletedForward = false;
    let resetScene2State = null;

    if (!mobileStaticHomepage && scene2Canvas && typeof gsap !== "undefined") {
        const scene2Ctx = scene2Canvas.getContext("2d");
        const scene2FrameCount = SCENE2_FRAME_NUMBERS.length;
        const scene2Images = window.scene2Images;
        const scene2FrameState = { frame: 0 };
        let currentTween2 = null;
        let scene2ScrubTarget = 0;
        let scene2ForwardHandoffQueued = false;
        let targetParallax2X = 0;
        let targetParallax2Y = 0;
        let currentParallax2X = 0;
        let currentParallax2Y = 0;

        function resizeScene2Canvas() {
            if (!scene2Canvas) return;
            scene2Canvas.width = scene2Canvas.offsetWidth || window.innerWidth;
            scene2Canvas.height = scene2Canvas.offsetHeight || window.innerHeight;
            renderScene2Frame(scene2FrameState.frame);
        }

        window.resizeScene2Canvas = resizeScene2Canvas;

        const scene2El = document.getElementById("scene-2");
        if (scene2El) {
            scene2El.addEventListener("mousemove", (e) => {
                const rect = scene2El.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                targetParallax2X = (e.clientX - centerX) / (rect.width / 2);
                targetParallax2Y = (e.clientY - centerY) / (rect.height / 2);
            }, { passive: true });

            scene2El.addEventListener("mouseleave", () => {
                targetParallax2X = 0;
                targetParallax2Y = 0;
            }, { passive: true });
        }

        function renderScene2Frame(index) {
            const frameIdx = Math.max(0, Math.min(scene2FrameCount - 1, Math.floor(index)));
            const currentImg = scene2Images[frameIdx];
            if (!currentImg || !currentImg.complete) return;
            if (!scene2Canvas || !scene2Ctx) return;

            scene2Ctx.clearRect(0, 0, scene2Canvas.width, scene2Canvas.height);
            const ratio = scene2Canvas.width / currentImg.width;
            let centerShiftX = 0;
            let centerShiftY = (scene2Canvas.height - currentImg.height * ratio) / 2;

            // Match Scene 4's endpoint interaction on Scene 2's first and last
            // frames while leaving every in-between scrub frame centered.
            if (frameIdx === 0 || frameIdx >= scene2FrameCount - 1) {
                centerShiftX += currentParallax2X * 22;
                centerShiftY += currentParallax2Y * 22;
            }

            scene2Ctx.drawImage(
                currentImg,
                0, 0, currentImg.width, currentImg.height,
                centerShiftX, centerShiftY, currentImg.width * ratio, currentImg.height * ratio
            );
        }

        function updateScene2ParallaxLoop() {
            currentParallax2X += (targetParallax2X - currentParallax2X) * 0.08;
            currentParallax2Y += (targetParallax2Y - currentParallax2Y) * 0.08;

            const frameIdx = Math.floor(scene2FrameState.frame);
            if (
                scene2IsOverlayActive
                && (frameIdx === 0 || frameIdx >= scene2FrameCount - 1)
            ) {
                renderScene2Frame(scene2FrameState.frame);
            }
            requestAnimationFrame(updateScene2ParallaxLoop);
        }

        window.addEventListener("resize", resizeScene2Canvas, { passive: true });
        resizeScene2Canvas();
        updateScene2ParallaxLoop();

        resetScene2State = function() {
            if (currentTween2) {
                currentTween2.kill();
                currentTween2 = null;
            }
            isScene2Animating = false;
            scene2HasCompletedForward = false;
            scene2ForwardHandoffQueued = false;
            scene2FrameState.frame = 0;
            scene2ScrubTarget = 0;
            renderScene2Frame(0);
            setSceneScrollPrompt(2, false);
            resetScene2SupportingCopy();
            gsap.set(scene2Canvas, { clearProps: "opacity,transform,visibility" });
            const scene2GradientLayer = document.getElementById("scene-2-gradient-layer");
            if (scene2GradientLayer) {
                gsap.set(scene2GradientLayer, { clearProps: "opacity,visibility" });
            }
        };

        playScene2Forward = function() {
            if (isScene2Animating || scene2HasCompletedForward) return;
            if (currentTween2) currentTween2.kill();

            isScene2Animating = false;
            scene2ForwardHandoffQueued = false;
            scene2FrameState.frame = 0;
            scene2ScrubTarget = 0;
            resizeScene2Canvas();
            renderScene2Frame(0);
        };

        scrubScene2Frames = function(inputPixels) {
            if (scene2HasCompletedForward && inputPixels > 0) return "at-end";
            if (inputPixels < 0) scene2ForwardHandoffQueued = false;
            if (
                inputPixels > 0
                && currentTween2
                && scene2ScrubTarget >= scene2FrameCount - 1 - 0.001
            ) {
                scene2ForwardHandoffQueued = true;
                return "handoff-queued";
            }
            if (!currentTween2 && Math.abs(scene2ScrubTarget - scene2FrameState.frame) > 1) {
                scene2ScrubTarget = scene2FrameState.frame;
            }
            if (inputPixels < 0 && scene2ScrubTarget <= 0.001) return "past-start";
            if (inputPixels > 0 && scene2ScrubTarget <= 0.001) {
                setScene2PrimaryRightCopyVisibility(false);
            }

            scene2ScrubTarget = gsap.utils.clamp(
                0,
                scene2FrameCount - 1,
                scene2ScrubTarget + getHeroSceneScrubDelta(
                    inputPixels * HERO_SCENE_SCRUB_SPEED_MULTIPLIER,
                    scene2FrameCount - 1
                )
            );
            if (inputPixels < 0 && scene2ScrubTarget <= 0.001) {
                setScene2PrimaryRightCopyVisibility(true);
            }
            if (currentTween2) currentTween2.kill();
            currentTween2 = gsap.to(scene2FrameState, {
                frame: scene2ScrubTarget,
                ease: "power3.out",
                duration: HERO_SCENE_SCRUB_GLIDE_DURATION,
                overwrite: true,
                onUpdate: () => {
                    renderScene2Frame(scene2FrameState.frame);
                    updateScene2SecondaryRightCopy(scene2FrameState.frame);
                    updateScene2BottomCopy(scene2FrameState.frame);
                },
                onComplete: () => {
                    currentTween2 = null;
                    if (scene2ScrubTarget >= scene2FrameCount - 1) {
                        scene2FrameState.frame = scene2FrameCount - 1;
                        renderScene2Frame(scene2FrameState.frame);
                        setScene2PrimaryRightCopyVisibility(false);
                        updateScene2SecondaryRightCopy(scene2FrameState.frame);
                        updateScene2BottomCopy(scene2FrameState.frame);
                        if (!scene2HasCompletedForward) {
                            scene2HasCompletedForward = true;
                            if (scene2ForwardHandoffQueued && advanceScene2ToScene3) {
                                scene2ForwardHandoffQueued = false;
                                setSceneScrollPrompt(2, false);
                                requestAnimationFrame(() => advanceScene2ToScene3());
                            } else {
                                setSceneScrollPrompt(2, true);
                            }
                        }
                    }
                }
            });
            return scene2ScrubTarget >= scene2FrameCount - 1 ? "at-end" : "scrubbing";
        };

        playScene2Reverse = function(onCompleteCallback) {
            if (isScene2Animating) return;
            if (currentTween2) currentTween2.kill();

            isScene2Animating = true;
            currentTween2 = gsap.to(scene2FrameState, {
                frame: 0,
                ease: "none",
                duration: scene2FrameCount / 60,
                onUpdate: () => {
                    renderScene2Frame(scene2FrameState.frame);
                    updateScene2SecondaryRightCopy(scene2FrameState.frame);
                    updateScene2BottomCopy(scene2FrameState.frame);
                },
                onComplete: () => {
                    scene2FrameState.frame = 0;
                    renderScene2Frame(0);
                    setScene2PrimaryRightCopyVisibility(true);
                    updateScene2SecondaryRightCopy(0);
                    updateScene2BottomCopy(0);
                    isScene2Animating = false;
                    scene2HasCompletedForward = false;
                    currentTween2 = null;
                    if (onCompleteCallback) onCompleteCallback();
                }
            });
        };

        // Keep Scene 2's final frame pinned while the white Scene 3 section
        // rises into view using the same one-screen page handoff as Scene 2.
        advanceScene2ToScene3 = function() {
            if (isTransitioningScene || isScene2Animating || !scene2HasCompletedForward) return;

            const scene2El = document.getElementById("scene-2");
            const scene3El = document.getElementById("scene-3");
            const scene3CanvasEl = document.getElementById("scene-3-canvas");
            if (!scene2El || !scene3El) return;

            isTransitioningScene = true;
            scene2FrameState.frame = scene2FrameCount - 1;
            renderScene2Frame(scene2FrameState.frame);

            hideScene2SupportingCopyForHandoff(() => {
                scene2Canvas.classList.add("scene-2-sticky-frame-layer");
                document.body.appendChild(scene2Canvas);

                if (typeof resetScene3State === "function") {
                    resetScene3State();
                }
                if (scene3CanvasEl) {
                    scene3CanvasEl.style.opacity = "0";
                    scene3CanvasEl.style.visibility = "hidden";
                }

                document.body.classList.add("scene-2-to-scene-3");
                gsap.set(scene3El, { y: window.innerHeight });
                gsap.to(scene3El, {
                    y: 0,
                    duration: HERO_SCENE_TRANSITION_DURATION,
                    ease: "power3.inOut",
                    overwrite: true
                });

                const scene3TargetScroll = window.scrollY + window.innerHeight;
                if (lenis) {
                    lenis.scrollTo(scene3TargetScroll, {
                        duration: HERO_SCENE_TRANSITION_DURATION,
                        force: true
                    });
                } else {
                    window.scrollTo({ top: scene3TargetScroll, behavior: "smooth" });
                }

                setTimeout(() => {
                    scene2Canvas.style.visibility = "hidden";
                    scene2Canvas.classList.remove("scene-2-sticky-frame-layer");
                    scene2El.insertBefore(scene2Canvas, scene2El.firstChild);
                    scene2Canvas.style.visibility = "";
                    scene2El.style.opacity = "0";
                    scene2El.style.visibility = "hidden";

                    deactivateScene2Overlay(false);
                    activateScene3Overlay();
                    document.body.classList.remove("scene-2-to-scene-3");
                    gsap.set(scene3El, { clearProps: "transform" });
                    setScene2HeaderTheme(false);

                    if (scene3CanvasEl) {
                        scene3CanvasEl.style.opacity = "1";
                        scene3CanvasEl.style.visibility = "visible";
                    }
                    isTransitioningScene = false;
                    if (playScene3Forward) {
                        requestAnimationFrame(() => playScene3Forward());
                    }
                }, HERO_SCENE_TRANSITION_DURATION * 1000);
            });
        };

        // Restore Scene 2 after Scene 3 has reversed to its first frame.
        returnScene3ToScene2 = function() {
            const scene2El = document.getElementById("scene-2");
            const scene3El = document.getElementById("scene-3");
            const scene3CanvasEl = document.getElementById("scene-3-canvas");
            if (!scene2El || !scene3El) return;

            const scene2Top = getElementDocTop(scene2El);
            if (scene3CanvasEl) {
                scene3CanvasEl.style.opacity = "0";
                scene3CanvasEl.style.visibility = "hidden";
            }

            scene2El.style.opacity = "";
            scene2El.style.visibility = "";
            scene2FrameState.frame = scene2FrameCount - 1;
            renderScene2Frame(scene2FrameState.frame);
            restoreScene2FinalSupportingCopy();

            activateScene2Overlay();
            document.body.classList.add("scene-3-to-scene-2");
            gsap.set(scene3El, { y: 0 });
            gsap.to(scene3El, {
                y: window.innerHeight,
                duration: HERO_SCENE_TRANSITION_DURATION,
                ease: "power3.inOut",
                overwrite: true
            });

            scene2Canvas.classList.add("scene-2-sticky-frame-layer");
            document.body.appendChild(scene2Canvas);

            if (lenis) {
                lenis.scrollTo(scene2Top, {
                    duration: HERO_SCENE_TRANSITION_DURATION,
                    force: true
                });
            } else {
                scene2El.scrollIntoView({ behavior: "smooth" });
            }

            setTimeout(() => {
                scene3El.style.visibility = "hidden";
                document.body.classList.remove("scene-3-to-scene-2");
                gsap.set(scene3El, { clearProps: "transform" });
                deactivateScene3Overlay(false);

                scene2Canvas.style.visibility = "hidden";
                scene2Canvas.classList.remove("scene-2-sticky-frame-layer");
                scene2El.insertBefore(scene2Canvas, scene2El.firstChild);
                scene2Canvas.style.visibility = "";

                scene2HasCompletedForward = true;
                isScene2Animating = false;
                setSceneScrollPrompt(2, true);
                if (typeof resetScene3State === "function") {
                    resetScene3State();
                }
                scene3El.style.visibility = "";
                setScene2HeaderTheme(true);
                isTransitioningScene = false;
            }, HERO_SCENE_TRANSITION_DURATION * 1000);
        };
    }

    // --------------------------------------------------------------------------
    // 3E. SCENE-3 SCROLL-SCRUB ENGINE (169 SEQUENTIAL AVIF FRAMES: 0234 to 0402)
    // --------------------------------------------------------------------------
    const scene3Canvas = document.getElementById("scene-3-canvas");
    let scene3HasCompletedForward = false;
    let resetScene3State = null;
    let scene3CounterHasRun = false;

    if (!mobileStaticHomepage && scene3Canvas && typeof gsap !== "undefined") {
        const scene3Ctx = scene3Canvas.getContext("2d");
        const scene3StartFrame = 234;
        const scene3EndFrame = 402;
        const scene3FrameCount = scene3EndFrame - scene3StartFrame + 1;
        const scene3Images = window.scene3Images;
        const scene3FrameState = { frame: 0 };
        let currentTween3 = null;
        let scene3ScrubTarget = 0;
        let scene3ForwardHandoffQueued = false;
        let scene3QueuedForwardInput = 0;

        let targetParallax3X = 0;
        let targetParallax3Y = 0;
        let currentParallax3X = 0;
        let currentParallax3Y = 0;

        let targetGlow3X = 0;
        let currentGlow3X = 0;
        let targetGlow3Y = 50;
        let currentGlow3Y = 50;
        let targetGlowRadius = 0;
        let currentGlowRadius = 0;
        let isMouseOverScene3 = false;

        function resizeScene3Canvas() {
            if (!scene3Canvas) return;
            scene3Canvas.width = scene3Canvas.offsetWidth || window.innerWidth;
            scene3Canvas.height = scene3Canvas.offsetHeight || window.innerHeight;
            renderScene3Frame(scene3FrameState.frame);
        }

        window.resizeScene3Canvas = resizeScene3Canvas;

        const scene3El = document.getElementById("scene-3");
        const scene3MainSpotlightLine = document.querySelector(".scene-3-title__line--bold");
        const scene3EntrySpotlight = document.querySelector(".scene-3-entry-copy .scene-3-supporting-copy__line--bold");
        const scene3SpotlightLines = Array.from(document.querySelectorAll(
            ".scene-3-supporting-copy .scene-3-supporting-copy__line--bold"
        ));
        if (scene3EntrySpotlight) scene3SpotlightLines.push(scene3EntrySpotlight);
        const scene3SupportingSpotlights = scene3SpotlightLines.map((line, index) => ({
            line,
            currentX: index === 0 ? 20 : 80,
            currentY: 50,
            currentRadius: 0,
            targetX: index === 0 ? 20 : 80,
            targetY: 50,
            targetRadius: 0,
            phase: index * Math.PI
        }));
        if (scene3El) {
            scene3El.addEventListener("mousemove", (e) => {
                const rect = scene3El.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                targetParallax3X = (e.clientX - centerX) / (rect.width / 2);
                targetParallax3Y = (e.clientY - centerY) / (rect.height / 2);

                isMouseOverScene3 = true;
                if (scene3MainSpotlightLine) {
                    const eRect = scene3MainSpotlightLine.getBoundingClientRect();
                    targetGlow3X = Math.max(0, Math.min(100, ((e.clientX - eRect.left) / eRect.width) * 100));
                    targetGlow3Y = Math.max(0, Math.min(100, ((e.clientY - eRect.top) / eRect.height) * 100));
                }
                scene3SupportingSpotlights.forEach((spotlight) => {
                    const lineRect = spotlight.line.getBoundingClientRect();
                    spotlight.targetX = Math.max(0, Math.min(100, ((e.clientX - lineRect.left) / lineRect.width) * 100));
                    spotlight.targetY = Math.max(0, Math.min(100, ((e.clientY - lineRect.top) / lineRect.height) * 100));
                });
            }, { passive: true });

            scene3El.addEventListener("mouseleave", () => {
                targetParallax3X = 0;
                targetParallax3Y = 0;
                isMouseOverScene3 = false;
            }, { passive: true });
        }

        function renderScene3Frame(index) {
            const frameIdx = Math.floor(index);
            const currentImg = scene3Images[frameIdx];
            if (!currentImg || !currentImg.complete) return;
            if (!scene3Canvas || !scene3Ctx) return;

            scene3Ctx.clearRect(0, 0, scene3Canvas.width, scene3Canvas.height);

            // Scale to 100% full screen width so frames span edge-to-edge with zero side margins
            const ratio = scene3Canvas.width / currentImg.width;

            let centerShiftX = 0;
            let centerShiftY = (scene3Canvas.height - currentImg.height * ratio) / 2;

            // Apply interactive mouse movement parallax to endpoint frames 0234 and 0402.
            if (frameIdx === 0 || frameIdx >= scene3FrameCount - 1) {
                centerShiftX += currentParallax3X * 22;
                centerShiftY += currentParallax3Y * 22;
            }

            scene3Ctx.drawImage(
                currentImg,
                0, 0, currentImg.width, currentImg.height,
                centerShiftX, centerShiftY, currentImg.width * ratio, currentImg.height * ratio
            );
        }

        function updateScene3ParallaxLoop() {
            currentParallax3X += (targetParallax3X - currentParallax3X) * 0.08;
            currentParallax3Y += (targetParallax3Y - currentParallax3Y) * 0.08;

            // Manage automatic / random movement of the yellow highlight
            if (!scene3CounterHasRun) {
                targetGlow3X = 0;
                targetGlow3Y = 50;
                targetGlowRadius = 0;
            } else {
                targetGlowRadius = 140; // Active circle radius
                if (!isMouseOverScene3) {
                    // Smooth continuous oscillation using independent sine/cos waves
                    targetGlow3X = 50 + Math.sin(Date.now() * 0.001) * 45;
                    targetGlow3Y = 50 + Math.cos(Date.now() * 0.0017) * 45;
                }
            }

            currentGlow3X += (targetGlow3X - currentGlow3X) * 0.05;
            currentGlow3Y += (targetGlow3Y - currentGlow3Y) * 0.05;
            currentGlowRadius += (targetGlowRadius - currentGlowRadius) * 0.05;

            if (scene3MainSpotlightLine) {
                scene3MainSpotlightLine.style.setProperty("--mouse-x", `${currentGlow3X}%`);
                scene3MainSpotlightLine.style.setProperty("--mouse-y", `${currentGlow3Y}%`);
                scene3MainSpotlightLine.style.setProperty("--spotlight-radius", `${currentGlowRadius}px`);
            }

            const now = Date.now();
            scene3SupportingSpotlights.forEach((spotlight, index) => {
                spotlight.targetRadius = scene3CounterHasRun ? 90 : 0;
                if (!isMouseOverScene3) {
                    spotlight.targetX = 50 + Math.sin(now * (0.0008 + index * 0.00022) + spotlight.phase) * 44;
                    spotlight.targetY = 50 + Math.cos(now * (0.00125 + index * 0.00018) + spotlight.phase) * 42;
                }
                spotlight.currentX += (spotlight.targetX - spotlight.currentX) * 0.055;
                spotlight.currentY += (spotlight.targetY - spotlight.currentY) * 0.055;
                spotlight.currentRadius += (spotlight.targetRadius - spotlight.currentRadius) * 0.055;
                spotlight.line.style.setProperty("--mouse-x", `${spotlight.currentX}%`);
                spotlight.line.style.setProperty("--mouse-y", `${spotlight.currentY}%`);
                spotlight.line.style.setProperty("--spotlight-radius", `${spotlight.currentRadius}px`);
            });

            const frameIdx = Math.floor(scene3FrameState.frame);
            const scene3EndpointIsVisible = scene3IsOverlayActive
                || document.body.classList.contains("scene-2-to-scene-3");
            if (
                scene3EndpointIsVisible
                && (frameIdx === 0 || frameIdx >= scene3FrameCount - 1)
            ) {
                renderScene3Frame(scene3FrameState.frame);
            }
            requestAnimationFrame(updateScene3ParallaxLoop);
        }



        // --- Abstract Color Smoke Animation in Scene 3 ---
        function initScene3Smoke() {
            const canvas = document.getElementById("scene-3-smoke-canvas");
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            const particles = [];
            const colors = [
                { r: 255, g: 192, b: 0 },   // Yellow
                { r: 0, g: 180, b: 216 },   // Cyan
                { r: 239, g: 68, b: 68 },   // Red
                { r: 168, g: 85, b: 247 },  // Purple
                { r: 249, g: 115, b: 22 }   // Orange
            ];

            class SmokeParticle {
                constructor(startX, startY) {
                    this.x = startX + (Math.random() - 0.5) * 15;
                    this.y = startY + (Math.random() - 0.5) * 15;
                    this.vx = (Math.random() - 0.5) * 0.6;
                    this.vy = -0.5 - Math.random() * 0.8;
                    this.radius = 6 + Math.random() * 6;
                    this.maxRadius = 35 + Math.random() * 25;
                    this.growth = 0.2 + Math.random() * 0.3;
                    this.color = colors[Math.floor(Math.random() * colors.length)];
                    this.opacity = 1.0;
                    this.decay = 0.01 + Math.random() * 0.012; // Faster decay so they fade away quicker
                    this.waveSpeed = 0.02 + Math.random() * 0.02;
                    this.waveRange = 0.15 + Math.random() * 0.35;
                    this.wavePhase = Math.random() * Math.PI * 2;
                }

                update() {
                    this.y += this.vy;
                    this.x += this.vx + Math.sin(Date.now() * this.waveSpeed + this.wavePhase) * this.waveRange;
                    if (this.radius < this.maxRadius) {
                        this.radius += this.growth;
                    }
                    this.opacity -= this.decay;
                }

                draw() {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    // Render with full, solid opacity (using dynamic p.opacity for fadeout)
                    ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`;
                    ctx.fill();
                }
            }

            let smokeMouseX = null;
            let smokeMouseY = null;
            const scene3 = document.getElementById("scene-3");

            if (scene3) {
                scene3.addEventListener("mousemove", (e) => {
                    const rect = canvas.getBoundingClientRect();
                    smokeMouseX = e.clientX - rect.left;
                    smokeMouseY = e.clientY - rect.top;
                }, { passive: true });

                scene3.addEventListener("mouseleave", () => {
                    smokeMouseX = null;
                    smokeMouseY = null;
                }, { passive: true });
            }

            function animateSmoke() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (smokeMouseX !== null && smokeMouseY !== null) {
                    // Sparse trail following the cursor (reduced spawn rate)
                    if (Math.random() < 0.35) {
                        particles.push(new SmokeParticle(smokeMouseX, smokeMouseY));
                    }
                } else {
                    // Ambient source aligned dynamically over the text area (reduced limit & probability)
                    if (particles.length < 10 && Math.random() < 0.06) {
                        particles.push(new SmokeParticle(canvas.width * 0.18, canvas.height * 0.5));
                    }
                }

                ctx.save();
                ctx.globalCompositeOperation = "source-over"; // Solid crisp overlapping bubbles

                for (let i = particles.length - 1; i >= 0; i--) {
                    const p = particles[i];
                    p.update();
                    
                    if (p.opacity <= 0 || p.y < -p.radius || p.x < -p.radius || p.x > canvas.width + p.radius) {
                        particles.splice(i, 1);
                        continue;
                    }

                    p.draw();
                }

                ctx.restore();
                requestAnimationFrame(animateSmoke);
            }

            animateSmoke();
        }



        let smokeWidth = 0;
        let smokeHeight = 0;

        function resizeSmokeCanvas() {
            const smokeCanvas = document.getElementById("scene-3-smoke-canvas");
            if (!smokeCanvas) return;
            smokeWidth = smokeCanvas.width = smokeCanvas.offsetWidth || window.innerWidth;
            smokeHeight = smokeCanvas.height = smokeCanvas.offsetHeight || window.innerHeight;
        }

        window.addEventListener("resize", () => {
            resizeScene3Canvas();
            resizeSmokeCanvas();
        }, { passive: true });

        resizeScene3Canvas();
        resizeSmokeCanvas();
        updateScene3ParallaxLoop();
        initScene3Smoke();

        const scene3TextLines = document.querySelectorAll("#scene-3-text .scene-3-title__line");
        const counterEl = document.getElementById("scene-3-counter");
        const smokeCanvas = document.getElementById("scene-3-smoke-canvas");
        const scene3EntryCopy = document.querySelector(".scene-3-entry-copy");
        const scene3SupportingCopy = Array.from(document.querySelectorAll(".scene-3-supporting-copy"));
        let currentCounterTween3 = null;
        let scene3SupportingCopyTimeline = null;
        let scene3SupportingCopyIsVisible = false;
        let scene3EntryCopyIsVisible = true;

        function setScene3EntryCopyVisibility(isVisible, immediate = false) {
            if (!scene3EntryCopy || (!immediate && scene3EntryCopyIsVisible === isVisible)) return;
            scene3EntryCopyIsVisible = isVisible;
            gsap.killTweensOf(scene3EntryCopy);
            const state = {
                autoAlpha: isVisible ? 1 : 0,
                x: isVisible ? 0 : Math.max(48, window.innerWidth * 0.04)
            };
            if (immediate) {
                gsap.set(scene3EntryCopy, state);
            } else {
                gsap.to(scene3EntryCopy, {
                    ...state,
                    duration: 0.55,
                    ease: "power3.out",
                    overwrite: true
                });
            }
        }

        function updateScene3EntryCopy(frameIndex, immediate = false) {
            setScene3EntryCopyVisibility(frameIndex <= 0.5, immediate);
        }

        function resetScene3SupportingCopy() {
            if (scene3SupportingCopyTimeline) {
                scene3SupportingCopyTimeline.kill();
                scene3SupportingCopyTimeline = null;
            }
            gsap.killTweensOf(scene3SupportingCopy);
            scene3SupportingCopyIsVisible = false;
            setSceneScrollPrompt(3, false);
            gsap.set(scene3SupportingCopy, {
                autoAlpha: 0,
                y: 26,
                scale: 0.88,
                filter: "blur(8px)"
            });
        }

        function showScene3SupportingCopy(onComplete) {
            resetScene3SupportingCopy();
            scene3SupportingCopyTimeline = gsap.timeline({
                onComplete: () => {
                    scene3SupportingCopyIsVisible = true;
                    scene3SupportingCopyTimeline = null;
                    if (onComplete) {
                        onComplete();
                    } else {
                        setSceneScrollPrompt(3, true);
                    }
                }
            });
            scene3SupportingCopyTimeline.to(scene3SupportingCopy, {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
                duration: 0.72,
                ease: "back.out(1.55)",
                stagger: 0.2
            });
        }

        hideScene3SupportingCopy = function(onComplete) {
            if (!scene3SupportingCopy.length) {
                if (onComplete) onComplete();
                return;
            }
            scene3SupportingCopyIsVisible = false;
            setSceneScrollPrompt(3, false);
            if (scene3SupportingCopyTimeline) scene3SupportingCopyTimeline.kill();
            gsap.killTweensOf(scene3SupportingCopy);
            scene3SupportingCopyTimeline = gsap.timeline({
                onComplete: () => {
                    scene3SupportingCopyTimeline = null;
                    if (onComplete) onComplete();
                }
            });
            scene3SupportingCopyTimeline
                .to(scene3SupportingCopy, {
                    scale: 1.06,
                    duration: 0.12,
                    ease: "power2.out",
                    stagger: { each: 0.05, from: "end" }
                })
                .to(scene3SupportingCopy, {
                    autoAlpha: 0,
                    y: -22,
                    scale: 0.78,
                    filter: "blur(8px)",
                    duration: 0.34,
                    ease: "back.in(1.45)",
                    stagger: { each: 0.08, from: "end" }
                }, "-=0.04");
        };

        function playScene3Counter() {
            if (currentCounterTween3) currentCounterTween3.kill();
            const counterState = { value: 30 };
            if (counterEl) counterEl.textContent = "30";
            scene3CounterHasRun = false;

            currentCounterTween3 = gsap.to(counterState, {
                value: 100,
                duration: 2.2,
                ease: "power1.out",
                onUpdate: () => {
                    scene3CounterHasRun = counterState.value > 30;
                    if (counterEl) counterEl.textContent = String(Math.floor(counterState.value));
                },
                onComplete: () => {
                    if (counterEl) counterEl.textContent = "100";
                    scene3CounterHasRun = true;
                    currentCounterTween3 = null;
                }
            });
        }

        resetScene3State = function() {
            if (currentTween3) {
                currentTween3.kill();
                currentTween3 = null;
            }
            if (currentCounterTween3) {
                currentCounterTween3.kill();
                currentCounterTween3 = null;
            }
            isScene3Animating = false;
            scene3HasCompletedForward = false;
            scene3ForwardHandoffQueued = false;
            scene3QueuedForwardInput = 0;
            scene3CounterHasRun = false;
            resetScene3SupportingCopy();
            scene3FrameState.frame = 0;
            scene3ScrubTarget = 0;
            updateScene3EntryCopy(0, true);
            renderScene3Frame(0);
            if (counterEl) {
                counterEl.textContent = "30";
            }
            currentGlow3X = 0;
            targetGlow3X = 0;
            currentGlow3Y = 50;
            targetGlow3Y = 50;
            currentGlowRadius = 0;
            targetGlowRadius = 0;
            if (scene3MainSpotlightLine) {
                scene3MainSpotlightLine.style.setProperty("--mouse-x", "0%");
                scene3MainSpotlightLine.style.setProperty("--mouse-y", "50%");
                scene3MainSpotlightLine.style.setProperty("--spotlight-radius", "0px");
            }
            scene3SupportingSpotlights.forEach((spotlight, index) => {
                spotlight.currentX = spotlight.targetX = index === 0 ? 20 : 80;
                spotlight.currentY = spotlight.targetY = 50;
                spotlight.currentRadius = spotlight.targetRadius = 0;
                spotlight.line.style.setProperty("--mouse-x", `${spotlight.currentX}%`);
                spotlight.line.style.setProperty("--mouse-y", "50%");
                spotlight.line.style.setProperty("--spotlight-radius", "0px");
            });
            if (scene3TextLines && scene3TextLines.length) {
                scene3TextLines.forEach((line) => {
                    gsap.set(line, { opacity: 1, x: 0 });
                });
            }
            if (smokeCanvas) {
                gsap.set(smokeCanvas, { opacity: 1 });
            }
            if (scene3Canvas) {
                gsap.set(scene3Canvas, { opacity: 1, x: 0 });
            }
        };

        // Scene 3 text is already in place. Its counter autoplays after the
        // white handoff fills, independently of the scroll-scrubbed frames.
        playScene3Forward = function() {
            if (isScene3Animating || scene3HasCompletedForward) return;
            if (currentTween3) currentTween3.kill();

            isScene3Animating = false;
            scene3ForwardHandoffQueued = false;
            scene3QueuedForwardInput = 0;
            scene3FrameState.frame = 0;
            scene3ScrubTarget = 0;
            resizeScene3Canvas();
            renderScene3Frame(0);
            updateScene3EntryCopy(0, true);
            gsap.set(scene3TextLines, { opacity: 1, x: 0 });
            gsap.set(scene3Canvas, { opacity: 1, x: 0 });
            if (smokeCanvas) gsap.set(smokeCanvas, { opacity: 1 });

            targetGlow3X = 0;
            playScene3Counter();
        };

        scrubScene3Frames = function(inputPixels) {
            if (scene3HasCompletedForward && inputPixels > 0) return "at-end";
            if (inputPixels < 0) {
                scene3ForwardHandoffQueued = false;
                scene3QueuedForwardInput = 0;
            }
            if (
                inputPixels > 0
                && currentTween3
                && scene3ScrubTarget >= scene3FrameCount - 1 - 0.001
            ) {
                scene3ForwardHandoffQueued = true;
                scene3QueuedForwardInput = inputPixels;
                return "handoff-queued";
            }
            if (!currentTween3 && Math.abs(scene3ScrubTarget - scene3FrameState.frame) > 1) {
                scene3ScrubTarget = scene3FrameState.frame;
            }
            if (inputPixels < 0 && scene3ScrubTarget <= 0.001) return "past-start";
            if (inputPixels > 0) setScene3EntryCopyVisibility(false);

            scene3ScrubTarget = gsap.utils.clamp(
                0,
                scene3FrameCount - 1,
                scene3ScrubTarget + getHeroSceneScrubDelta(
                    inputPixels * HERO_SCENE_SCRUB_SPEED_MULTIPLIER,
                    scene3FrameCount - 1
                )
            );
            if (currentTween3) currentTween3.kill();
            currentTween3 = gsap.to(scene3FrameState, {
                frame: scene3ScrubTarget,
                ease: "power3.out",
                duration: HERO_SCENE_SCRUB_GLIDE_DURATION,
                overwrite: true,
                onUpdate: () => {
                    renderScene3Frame(scene3FrameState.frame);
                    if (inputPixels < 0) updateScene3EntryCopy(scene3FrameState.frame);
                },
                onComplete: () => {
                    currentTween3 = null;
                    if (scene3ScrubTarget >= scene3FrameCount - 1) {
                        scene3FrameState.frame = scene3FrameCount - 1;
                        renderScene3Frame(scene3FrameState.frame);
                        updateScene3EntryCopy(scene3FrameState.frame, true);
                        if (!scene3HasCompletedForward) {
                            scene3HasCompletedForward = true;
                            if (scene3ForwardHandoffQueued && advanceScene3ToScene4) {
                                const queuedInput = scene3QueuedForwardInput;
                                scene3ForwardHandoffQueued = false;
                                scene3QueuedForwardInput = 0;
                                showScene3SupportingCopy(() => {
                                    setSceneScrollPrompt(3, false);
                                    requestAnimationFrame(() => advanceScene3ToScene4(queuedInput));
                                });
                            } else {
                                showScene3SupportingCopy();
                            }
                        }
                    }
                }
            });
            return scene3ScrubTarget >= scene3FrameCount - 1 ? "at-end" : "scrubbing";
        };

        playScene3Reverse = function(onCompleteCallback) {
            if (isScene3Animating) return;
            if (currentTween3) currentTween3.kill();

            isScene3Animating = true;

            currentTween3 = gsap.to(scene3FrameState, {
                frame: 0,
                ease: "none",
                duration: scene3FrameCount / 60,
                onUpdate: () => {
                    renderScene3Frame(scene3FrameState.frame);
                    updateScene3EntryCopy(scene3FrameState.frame);
                },
                onComplete: () => {
                    scene3FrameState.frame = 0;
                    renderScene3Frame(0);
                    isScene3Animating = false;
                    scene3HasCompletedForward = false;
                    scene3CounterHasRun = false;
                    currentTween3 = null;
                    if (onCompleteCallback) onCompleteCallback();
                }
            });
        };

        advanceScene3ToScene4 = function(inputPixels = 0) {
            if (isTransitioningScene || isScene3Animating || !scene3HasCompletedForward) return;

            // Preserve the final-content beat if the handoff input arrives
            // while the supporting copy is still appearing.
            if (!scene3SupportingCopyIsVisible && scene3SupportingCopyTimeline) {
                isTransitioningScene = true;
                const copyComplete = scene3SupportingCopyTimeline.eventCallback("onComplete");
                scene3SupportingCopyTimeline.eventCallback("onComplete", () => {
                    if (copyComplete) copyComplete();
                    isTransitioningScene = false;
                    advanceScene3ToScene4(inputPixels);
                });
                return;
            }

            const scene3El = document.getElementById("scene-3");
            const scene4El = document.getElementById("scene-4");
            const scene4CanvasEl = document.getElementById("scene-4-canvas");
            const scene3TextEl = document.getElementById("scene-3-text");
            if (!scene3El || !scene4El) return;

            isTransitioningScene = true;
            if (currentCounterTween3) {
                currentCounterTween3.kill();
                currentCounterTween3 = null;
            }
            if (counterEl) counterEl.textContent = "100";
            scene3CounterHasRun = false;
            const scene3Presentation = [scene3TextEl, smokeCanvas, ...scene3SupportingCopy].filter(Boolean);
            gsap.killTweensOf(scene3Presentation);
            scene3SupportingCopyIsVisible = false;
            scene3FrameState.frame = scene3FrameCount - 1;
            renderScene3Frame(scene3FrameState.frame);
            scene3Canvas.classList.add("scene-3-sticky-frame-layer");
            document.body.appendChild(scene3Canvas);

            if (typeof resetScene4State === "function") {
                resetScene4State();
            }
            if (scene4CanvasEl) {
                scene4CanvasEl.style.opacity = "1";
                scene4CanvasEl.style.visibility = "visible";
            }

            const scene3To4FadeDuration = 0.42;
            document.body.classList.add("scene-3-to-scene-4");
            gsap.set(scene4El, { y: 0, autoAlpha: 0 });
            gsap.to(scene4El, {
                autoAlpha: 1,
                duration: scene3To4FadeDuration,
                ease: "power2.inOut",
                overwrite: true
            });
            if (scrubScene4Frames) {
                scrubScene4Frames(Math.max(0, inputPixels));
            }

            const scene4TargetScroll = window.scrollY + window.innerHeight;
            if (lenis) {
                lenis.scrollTo(scene4TargetScroll, {
                    duration: scene3To4FadeDuration,
                    force: true
                });
            } else {
                window.scrollTo({ top: scene4TargetScroll, behavior: "smooth" });
            }

            gsap.to(scene3Presentation, {
                autoAlpha: 0,
                y: 0,
                duration: 0.3,
                ease: "power2.inOut",
                stagger: 0.02,
                overwrite: true
            });
            gsap.to(scene3Canvas, {
                autoAlpha: 0,
                duration: 0.3,
                ease: "power2.inOut",
                overwrite: true
            });

            setTimeout(() => {
                scene3Canvas.style.visibility = "hidden";
                scene3Canvas.classList.remove("scene-3-sticky-frame-layer");
                scene3El.insertBefore(scene3Canvas, scene3El.firstChild);
                gsap.set(scene3Canvas, { clearProps: "opacity,transform" });
                scene3Canvas.style.visibility = "";
                scene3El.style.opacity = "0";
                scene3El.style.visibility = "hidden";

                deactivateScene3Overlay(false);
                activateScene4Overlay();
                document.body.classList.remove("scene-3-to-scene-4");
                gsap.set(scene4El, { clearProps: "transform,opacity" });

                if (scene4CanvasEl) {
                    scene4CanvasEl.style.opacity = "1";
                    scene4CanvasEl.style.visibility = "visible";
                }
                isTransitioningScene = false;
                if (!scrubScene4Frames && prepareScene4ForScrub) {
                    requestAnimationFrame(() => prepareScene4ForScrub());
                }
            }, scene3To4FadeDuration * 1000);
        };

        returnScene4ToScene3 = function() {
            const scene3El = document.getElementById("scene-3");
            const scene4El = document.getElementById("scene-4");
            const scene4CanvasEl = document.getElementById("scene-4-canvas");
            const scene3TextEl = document.getElementById("scene-3-text");
            if (!scene3El || !scene4El) return;

            if (scene4CanvasEl) {
                scene4CanvasEl.style.opacity = "0";
                scene4CanvasEl.style.visibility = "hidden";
            }

            scene3El.style.opacity = "";
            scene3El.style.visibility = "";
            scene3FrameState.frame = scene3FrameCount - 1;
            renderScene3Frame(scene3FrameState.frame);
            updateScene3EntryCopy(scene3FrameState.frame, true);
            if (counterEl) counterEl.textContent = "100";
            scene3CounterHasRun = true;
            scene3HasCompletedForward = true;
            isScene3Animating = false;

            if (scene3SupportingCopyTimeline) {
                scene3SupportingCopyTimeline.kill();
                scene3SupportingCopyTimeline = null;
            }
            scene3SupportingCopyIsVisible = true;
            const scene3Presentation = [scene3TextEl, smokeCanvas, ...scene3SupportingCopy].filter(Boolean);
            gsap.set(scene3Presentation, { autoAlpha: 0, y: -14 });
            gsap.set(scene3SupportingCopy, { scale: 1, filter: "blur(0px)" });

            activateScene3Overlay();
            document.body.classList.add("scene-4-to-scene-3");
            gsap.set(scene4El, { y: 0 });
            gsap.to(scene4El, {
                y: window.innerHeight,
                duration: HERO_SCENE_TRANSITION_DURATION,
                ease: "power3.inOut",
                overwrite: true
            });
            gsap.to(scene3Presentation, {
                autoAlpha: 1,
                y: 0,
                duration: 0.58,
                delay: 0.2,
                ease: "power2.out",
                stagger: 0.045,
                overwrite: true
            });

            scene3Canvas.classList.add("scene-3-sticky-frame-layer");
            document.body.appendChild(scene3Canvas);

            const scene3TargetScroll = Math.max(0, window.scrollY - window.innerHeight);
            if (lenis) {
                lenis.scrollTo(scene3TargetScroll, {
                    duration: HERO_SCENE_TRANSITION_DURATION,
                    force: true
                });
            } else {
                window.scrollTo({ top: scene3TargetScroll, behavior: "smooth" });
            }

            setTimeout(() => {
                scene4El.style.visibility = "hidden";
                document.body.classList.remove("scene-4-to-scene-3");
                gsap.set(scene4El, { clearProps: "transform" });
                deactivateScene4Overlay(false);

                scene3Canvas.style.visibility = "hidden";
                scene3Canvas.classList.remove("scene-3-sticky-frame-layer");
                scene3El.insertBefore(scene3Canvas, scene3El.firstChild);
                scene3Canvas.style.visibility = "";

                // Reassert the completed Scene 3 state after the underlying
                // scroll move so no legacy ScrollTrigger reset can leave it
                // on frame 0234 with blurred copy and a counter of 30.
                scene3FrameState.frame = scene3FrameCount - 1;
                renderScene3Frame(scene3FrameState.frame);
                if (counterEl) counterEl.textContent = "100";
                scene3CounterHasRun = true;
                scene3HasCompletedForward = true;
                scene3SupportingCopyIsVisible = true;
                setSceneScrollPrompt(3, true);
                gsap.set([scene3TextEl, smokeCanvas].filter(Boolean), {
                    autoAlpha: 1,
                    y: 0
                });
                gsap.set(scene3SupportingCopy, {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    filter: "blur(0px)"
                });

                if (typeof resetScene4State === "function") {
                    resetScene4State();
                }
                scene4El.style.visibility = "";
                isTransitioningScene = false;
            }, HERO_SCENE_TRANSITION_DURATION * 1000);
        };
    }

    // --------------------------------------------------------------------------
    // 3F. SCENE-4 FRAME SCRUB ENGINE (358 SEQUENTIAL AVIF FRAMES: 0441 to 0798)
    // --------------------------------------------------------------------------
    const scene4Canvas = document.getElementById("scene-4-canvas");
    let scene4HasCompletedForward = false;
    let resetScene4State = null;

    if (!mobileStaticHomepage && scene4Canvas && typeof gsap !== "undefined") {
        const scene4Ctx = scene4Canvas.getContext("2d");
        const scene4StartFrame = 441;
        const scene4EndFrame = 798;
        const scene4CardsStartFrame = 650;
        const scene4FrameCount = scene4EndFrame - scene4StartFrame + 1;
        const scene4Images = window.scene4Images;
        const scene4FrameState = { frame: 0 };
        let scene4ScrubTarget = 0;
        let currentTween4 = null;
        let scene4ForwardHandoffQueued = false;
        const scene4Cards = Array.from(document.querySelectorAll(".scene-4-card"));
        let scene4CardsTimeline = null;
        let scene4CardsAreVisible = false;
        let scene4CardsThresholdActive = false;

        function resetScene4Cards() {
            if (scene4CardsTimeline) {
                scene4CardsTimeline.kill();
                scene4CardsTimeline = null;
            }
            gsap.killTweensOf(scene4Cards);
            scene4CardsAreVisible = false;
            scene4CardsThresholdActive = false;
            setSceneScrollPrompt(4, false);
            gsap.set(scene4Cards, {
                autoAlpha: 0,
                x: (_, card) => card.classList.contains("scene-4-card--left") ? -48 : 48,
                y: 0,
                scale: 1,
                rotation: 0
            });
        }

        function showScene4Cards() {
            if (scene4CardsThresholdActive) return;
            scene4CardsThresholdActive = true;
            if (scene4CardsTimeline) scene4CardsTimeline.kill();
            gsap.killTweensOf(scene4Cards);
            const randomizedCards = gsap.utils.shuffle(scene4Cards.slice());
            scene4CardsTimeline = gsap.timeline({
                onComplete: () => {
                    scene4CardsAreVisible = true;
                    scene4CardsTimeline = null;
                }
            });
            randomizedCards.forEach((card) => {
                scene4CardsTimeline.to(card, {
                    autoAlpha: 1,
                    x: 0,
                    y: 0,
                    scale: 1,
                    duration: 0.55,
                    ease: "power3.out"
                }, gsap.utils.random(0, 0.42));
            });
        }

        hideScene4Cards = function(onComplete, immediate = false) {
            if (!scene4Cards.length) {
                if (onComplete) onComplete();
                return;
            }
            if (scene4CardsTimeline) scene4CardsTimeline.kill();
            scene4CardsAreVisible = false;
            scene4CardsThresholdActive = false;
            setSceneScrollPrompt(4, false);
            gsap.killTweensOf(scene4Cards);

            if (immediate) {
                gsap.set(scene4Cards, {
                    autoAlpha: 0,
                    x: (_, card) => card.classList.contains("scene-4-card--left") ? -48 : 48,
                    y: 0,
                    scale: 1
                });
                scene4CardsTimeline = null;
                if (onComplete) onComplete();
                return;
            }

            scene4CardsTimeline = gsap.timeline({
                onComplete: () => {
                    scene4CardsTimeline = null;
                    if (onComplete) onComplete();
                }
            });
            scene4CardsTimeline.to(scene4Cards, {
                autoAlpha: 0,
                x: (_, card) => card.classList.contains("scene-4-card--left") ? -48 : 48,
                duration: 0.45,
                ease: "power3.in",
                stagger: { each: 0.04, from: "random" }
            });
        };

        function updateScene4Cards(frameIndex, immediate = false) {
            const actualFrame = scene4StartFrame + Math.floor(frameIndex);
            const shouldShow = actualFrame >= scene4CardsStartFrame;
            if (shouldShow && !scene4CardsThresholdActive) {
                showScene4Cards();
            } else if (!shouldShow && scene4CardsThresholdActive) {
                hideScene4Cards(null, immediate);
            }
        }

        let targetParallax4X = 0;
        let targetParallax4Y = 0;
        let currentParallax4X = 0;
        let currentParallax4Y = 0;

        function resizeScene4Canvas() {
            if (!scene4Canvas) return;
            scene4Canvas.width = scene4Canvas.offsetWidth || window.innerWidth;
            scene4Canvas.height = scene4Canvas.offsetHeight || window.innerHeight;
            renderScene4Frame(scene4FrameState.frame);
        }

        window.resizeScene4Canvas = resizeScene4Canvas;

        const scene4El = document.getElementById("scene-4");
        if (scene4El) {
            scene4El.addEventListener("mousemove", (e) => {
                const rect = scene4El.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                targetParallax4X = (e.clientX - centerX) / (rect.width / 2);
                targetParallax4Y = (e.clientY - centerY) / (rect.height / 2);
            }, { passive: true });

            scene4El.addEventListener("mouseleave", () => {
                targetParallax4X = 0;
                targetParallax4Y = 0;
            }, { passive: true });
        }

        function renderScene4Frame(index) {
            const frameIdx = Math.floor(index);
            const currentImg = scene4Images[frameIdx];
            if (!currentImg || !currentImg.complete) return;
            if (!scene4Canvas || !scene4Ctx) return;

            scene4Ctx.clearRect(0, 0, scene4Canvas.width, scene4Canvas.height);

            // Scale to 100% full screen width so frames span edge-to-edge
            const ratio = scene4Canvas.width / currentImg.width;

            let centerShiftX = 0;
            let centerShiftY = (scene4Canvas.height - currentImg.height * ratio) / 2;

            // Apply interactive mouse movement parallax to final frame 0798
            if (frameIdx >= scene4FrameCount - 1) {
                centerShiftX += currentParallax4X * 22;
                centerShiftY += currentParallax4Y * 22;
            }

            scene4Ctx.drawImage(
                currentImg,
                0, 0, currentImg.width, currentImg.height,
                centerShiftX, centerShiftY, currentImg.width * ratio, currentImg.height * ratio
            );
        }

        function updateScene4ParallaxLoop() {
            currentParallax4X += (targetParallax4X - currentParallax4X) * 0.08;
            currentParallax4Y += (targetParallax4Y - currentParallax4Y) * 0.08;

            if (scene4HasCompletedForward && Math.floor(scene4FrameState.frame) >= scene4FrameCount - 1) {
                renderScene4Frame(scene4FrameCount - 1);
            }
            requestAnimationFrame(updateScene4ParallaxLoop);
        }

        window.addEventListener("resize", resizeScene4Canvas, { passive: true });
        resizeScene4Canvas();
        updateScene4ParallaxLoop();

        resetScene4State = function() {
            if (currentTween4) {
                currentTween4.kill();
                currentTween4 = null;
            }
            isScene4Animating = false;
            scene4HasCompletedForward = false;
            scene4ForwardHandoffQueued = false;
            resetScene4Cards();
            scene4FrameState.frame = 0;
            scene4ScrubTarget = 0;
            renderScene4Frame(0);
            if (scene4Canvas) {
                gsap.set(scene4Canvas, { opacity: 1, y: 0 });
            }
        };

        prepareScene4ForScrub = function() {
            if (isScene4Animating || scene4HasCompletedForward) return;
            if (currentTween4) currentTween4.kill();

            isScene4Animating = false;
            scene4ForwardHandoffQueued = false;
            scene4FrameState.frame = 0;
            scene4ScrubTarget = 0;
            resizeScene4Canvas();
            renderScene4Frame(0);
            gsap.set(scene4Canvas, { opacity: 1, y: 0 });
        };

        scrubScene4Frames = function(inputPixels) {
            if (scene4HasCompletedForward && inputPixels > 0) return "at-end";
            if (inputPixels < 0) scene4ForwardHandoffQueued = false;
            if (
                inputPixels > 0
                && currentTween4
                && scene4ScrubTarget >= scene4FrameCount - 1 - 0.001
            ) {
                scene4ForwardHandoffQueued = true;
                return "handoff-queued";
            }
            if (!currentTween4 && Math.abs(scene4ScrubTarget - scene4FrameState.frame) > 1) {
                scene4ScrubTarget = scene4FrameState.frame;
            }
            if (inputPixels < 0 && scene4ScrubTarget <= 0.001) return "past-start";

            scene4ScrubTarget = gsap.utils.clamp(
                0,
                scene4FrameCount - 1,
                scene4ScrubTarget + getHeroSceneScrubDelta(
                    inputPixels * HERO_SCENE_SCRUB_SPEED_MULTIPLIER,
                    scene4FrameCount - 1
                )
            );
            if (currentTween4) currentTween4.kill();
            currentTween4 = gsap.to(scene4FrameState, {
                frame: scene4ScrubTarget,
                ease: "power3.out",
                duration: HERO_SCENE_SCRUB_GLIDE_DURATION,
                overwrite: true,
                onUpdate: () => {
                    renderScene4Frame(scene4FrameState.frame);
                    updateScene4Cards(scene4FrameState.frame);
                },
                onComplete: () => {
                    currentTween4 = null;
                    if (scene4ScrubTarget >= scene4FrameCount - 1) {
                        scene4ScrubTarget = scene4FrameCount - 1;
                        scene4FrameState.frame = scene4FrameCount - 1;
                        renderScene4Frame(scene4FrameState.frame);
                        if (!scene4HasCompletedForward) {
                            scene4HasCompletedForward = true;
                            updateScene4Cards(scene4FrameState.frame);
                            if (scene4ForwardHandoffQueued && advanceScene4ToScene5) {
                                scene4ForwardHandoffQueued = false;
                                setSceneScrollPrompt(4, false);
                                requestAnimationFrame(() => advanceScene4ToScene5());
                            } else {
                                setSceneScrollPrompt(4, true);
                            }
                        }
                    }
                }
            });
            return scene4ScrubTarget >= scene4FrameCount - 1 ? "at-end" : "scrubbing";
        };

        advanceScene4ToScene5 = function() {
            if (isTransitioningScene || isScene4Animating || !scene4HasCompletedForward) return;

            // Let the text-block entrance finish before moving the complete
            // Scene 4 composition upward as a single page.
            if (!scene4CardsAreVisible && scene4CardsTimeline) {
                isTransitioningScene = true;
                const cardsComplete = scene4CardsTimeline.eventCallback("onComplete");
                scene4CardsTimeline.eventCallback("onComplete", () => {
                    if (cardsComplete) cardsComplete();
                    isTransitioningScene = false;
                    advanceScene4ToScene5();
                });
                return;
            }

            const scene4El = document.getElementById("scene-4");
            const scene5El = document.getElementById("scene-5");
            const scene5CanvasEl = document.getElementById("scene-5-canvas");
            if (!scene4El || !scene5El || !scene5CanvasEl) return;

            isTransitioningScene = true;
            if (typeof resetScene5State === "function") {
                resetScene5State();
            }
            scene5El.style.opacity = "";
            scene5El.style.visibility = "";
            scene5CanvasEl.style.opacity = "1";
            scene5CanvasEl.style.visibility = "visible";
            if (typeof window.resizeScene5Canvas === "function") {
                window.resizeScene5Canvas();
            }

            document.body.classList.add("scene-4-to-scene-5");
            gsap.set(scene4El, { y: 0 });
            gsap.set(scene5El, { y: window.innerHeight });
            const sceneTransition = gsap.timeline({
                onComplete: () => {
                    scene4El.style.visibility = "hidden";
                    deactivateScene4Overlay(false);
                    activateScene5Overlay();
                    document.body.classList.remove("scene-4-to-scene-5");
                    gsap.set([scene4El, scene5El], { clearProps: "transform" });
                    scene5CanvasEl.style.opacity = "1";
                    scene5CanvasEl.style.visibility = "visible";
                    isTransitioningScene = false;
                    if (playScene5Forward) {
                        requestAnimationFrame(() => playScene5Forward());
                    }
                }
            });
            sceneTransition.to(scene4El, {
                y: -window.innerHeight,
                duration: HERO_SCENE_TRANSITION_DURATION,
                ease: "power3.inOut",
                overwrite: true
            }, 0);
            sceneTransition.to(scene5El, {
                y: 0,
                duration: HERO_SCENE_TRANSITION_DURATION,
                ease: "power3.inOut",
                overwrite: true
            }, 0);

            const scene5TargetScroll = window.scrollY + window.innerHeight;
            if (lenis) {
                lenis.scrollTo(scene5TargetScroll, {
                    duration: HERO_SCENE_TRANSITION_DURATION,
                    force: true
                });
            } else {
                window.scrollTo({ top: scene5TargetScroll, behavior: "smooth" });
            }

        };

        returnScene5ToScene4 = function() {
            const scene4El = document.getElementById("scene-4");
            const scene5El = document.getElementById("scene-5");
            const scene5CanvasEl = document.getElementById("scene-5-canvas");
            if (!scene4El || !scene5El) return;

            if (scene4CardsTimeline) {
                scene4CardsTimeline.kill();
                scene4CardsTimeline = null;
            }
            gsap.killTweensOf(scene4Cards);
            scene4FrameState.frame = scene4FrameCount - 1;
            scene4ScrubTarget = scene4FrameCount - 1;
            scene4HasCompletedForward = true;
            isScene4Animating = false;
            scene4CardsAreVisible = true;
            scene4CardsThresholdActive = true;
            scene4El.style.opacity = "";
            scene4El.style.visibility = "";
            scene4Canvas.style.opacity = "1";
            scene4Canvas.style.visibility = "visible";
            resizeScene4Canvas();
            renderScene4Frame(scene4FrameState.frame);
            gsap.set(scene4Cards, {
                autoAlpha: 1,
                x: 0,
                y: 0,
                scale: 1,
                rotation: 0
            });

            // Scene 4 covers the header area immediately as it returns from
            // above, so restore the dark-on-white header before page motion.
            setScene2HeaderTheme(false);
            document.body.classList.add("scene-5-to-scene-4");
            gsap.set(scene5El, { y: 0 });
            gsap.set(scene4El, { y: -window.innerHeight });
            const sceneTransition = gsap.timeline({
                onComplete: () => {
                    scene5El.style.visibility = "hidden";
                    deactivateScene5Overlay(false);
                    activateScene4Overlay();
                    document.body.classList.remove("scene-5-to-scene-4");
                    gsap.set([scene4El, scene5El], { clearProps: "transform" });
                    if (typeof resetScene5State === "function") {
                        resetScene5State();
                    }
                    if (scene5CanvasEl) {
                        scene5CanvasEl.style.visibility = "";
                    }
                    setSceneScrollPrompt(4, true);
                    isTransitioningScene = false;
                }
            });
            sceneTransition.to(scene5El, {
                y: window.innerHeight,
                duration: HERO_SCENE_TRANSITION_DURATION,
                ease: "power3.inOut",
                overwrite: true
            }, 0);
            sceneTransition.to(scene4El, {
                y: 0,
                duration: HERO_SCENE_TRANSITION_DURATION,
                ease: "power3.inOut",
                overwrite: true
            }, 0);

            const scene4TargetScroll = Math.max(0, window.scrollY - window.innerHeight);
            if (lenis) {
                lenis.scrollTo(scene4TargetScroll, {
                    duration: HERO_SCENE_TRANSITION_DURATION,
                    force: true
                });
            } else {
                window.scrollTo({ top: scene4TargetScroll, behavior: "smooth" });
            }
        };
    }

    // --------------------------------------------------------------------------
    // 3G. SCENE-5 SCROLL-SCRUB ENGINE (43 SEQUENTIAL AVIF FRAMES: 0860 to 0902)
    // --------------------------------------------------------------------------
    const scene5Canvas = document.getElementById("scene-5-canvas");
    let scene5HasCompletedForward = false;
    let resetScene5State = null;

    if (!mobileStaticHomepage && scene5Canvas && typeof gsap !== "undefined") {
        const scene5Ctx = scene5Canvas.getContext("2d");
        const scene5StartFrame = 860;
        const scene5EndFrame = 902;
        const scene5YellowHandoffStartFrame = 887;
        const scene5FrameCount = scene5EndFrame - scene5StartFrame + 1;
        const scene5Images = window.scene5Images;
        const scene5YellowHandoff = document.querySelector(".scene-5-yellow-handoff");
        const scene5FrameState = { frame: 0 };
        const scene5ScrubMax = scene5FrameCount - 1;
        const scene5ScrubState = { position: 0 };
        let scene5ScrubTarget = 0;
        let currentTween5 = null;
        let scene5ForwardHandoffQueued = false;
        let scene5QueuedForwardInput = 0;

        let targetParallax5X = 0;
        let targetParallax5Y = 0;
        let currentParallax5X = 0;
        let currentParallax5Y = 0;
        let currentScene5GlowX = 78;
        let currentScene5GlowY = 24;
        let targetScene5GlowX = 78;
        let targetScene5GlowY = 24;
        const scene5GlowCanTrackPointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches
            && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const scene5TextSpotlights = [
            {
                line: document.querySelector(".scene-5-intro-title__line--bold"),
                currentX: 25,
                currentY: 50,
                targetX: 25,
                targetY: 50,
                currentRadius: 0,
                targetRadius: 0,
                smoothing: 0.08
            },
            {
                line: document.querySelector(".scene-5-end-copy__line--bold"),
                currentX: 75,
                currentY: 50,
                targetX: 75,
                targetY: 50,
                currentRadius: 0,
                targetRadius: 0,
                smoothing: 0.055
            }
        ].filter((spotlight) => spotlight.line);

        function resizeScene5Canvas() {
            if (!scene5Canvas) return;
            scene5Canvas.width = scene5Canvas.offsetWidth || window.innerWidth;
            scene5Canvas.height = scene5Canvas.offsetHeight || window.innerHeight;
            renderScene5Frame(scene5FrameState.frame);
        }

        window.resizeScene5Canvas = resizeScene5Canvas;

        const scene5El = document.getElementById("scene-5");
        if (scene5El) {
            scene5El.addEventListener("mousemove", (e) => {
                const rect = scene5El.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                targetParallax5X = (e.clientX - centerX) / (rect.width / 2);
                targetParallax5Y = (e.clientY - centerY) / (rect.height / 2);
                if (scene5GlowCanTrackPointer) {
                    targetScene5GlowX = ((e.clientX - rect.left) / rect.width) * 100;
                    targetScene5GlowY = ((e.clientY - rect.top) / rect.height) * 100;
                }

                scene5TextSpotlights.forEach((spotlight) => {
                    const textRect = spotlight.line.getBoundingClientRect();
                    if (!textRect.width || !textRect.height) return;
                    spotlight.targetX = Math.max(0, Math.min(100, ((e.clientX - textRect.left) / textRect.width) * 100));
                    spotlight.targetY = Math.max(0, Math.min(100, ((e.clientY - textRect.top) / textRect.height) * 100));
                    spotlight.targetRadius = 110;
                });
            }, { passive: true });

            scene5El.addEventListener("mouseleave", () => {
                targetParallax5X = 0;
                targetParallax5Y = 0;
                targetScene5GlowX = 78;
                targetScene5GlowY = 24;
                scene5TextSpotlights.forEach((spotlight) => {
                    spotlight.targetRadius = 0;
                });
            }, { passive: true });
        }

        function renderScene5Frame(index) {
            const frameIdx = Math.floor(index);
            const currentImg = scene5Images[frameIdx];
            if (!currentImg || !currentImg.complete) return;
            if (!scene5Canvas || !scene5Ctx) return;

            scene5Ctx.clearRect(0, 0, scene5Canvas.width, scene5Canvas.height);

            // Scale to 100% full screen width so frames span edge-to-edge
            const ratio = scene5Canvas.width / currentImg.width;

            let centerShiftX = 0;
            let centerShiftY = (scene5Canvas.height - currentImg.height * ratio) / 2;

            // Apply interactive mouse movement parallax to endpoint frames 0860 and 0902.
            if (frameIdx === 0 || frameIdx >= scene5FrameCount - 1) {
                centerShiftX += currentParallax5X * 22;
                centerShiftY += currentParallax5Y * 22;
            }

            scene5Ctx.drawImage(
                currentImg,
                0, 0, currentImg.width, currentImg.height,
                centerShiftX, centerShiftY, currentImg.width * ratio, currentImg.height * ratio
            );
        }

        function updateScene5YellowHandoff(frameIndex) {
            if (!scene5YellowHandoff) return;
            const actualFrame = scene5StartFrame + frameIndex;
            const progress = gsap.utils.clamp(
                0,
                1,
                (actualFrame - scene5YellowHandoffStartFrame) / (scene5EndFrame - scene5YellowHandoffStartFrame)
            );
            gsap.set(scene5YellowHandoff, { yPercent: (1 - progress) * 100 });
        }

        function updateScene5ParallaxLoop() {
            currentParallax5X += (targetParallax5X - currentParallax5X) * 0.08;
            currentParallax5Y += (targetParallax5Y - currentParallax5Y) * 0.08;
            currentScene5GlowX += (targetScene5GlowX - currentScene5GlowX) * 0.08;
            currentScene5GlowY += (targetScene5GlowY - currentScene5GlowY) * 0.08;

            if (scene5El) {
                scene5El.style.setProperty("--scene-5-glow-x", `${currentScene5GlowX.toFixed(2)}%`);
                scene5El.style.setProperty("--scene-5-glow-y", `${currentScene5GlowY.toFixed(2)}%`);
            }

            scene5TextSpotlights.forEach((spotlight) => {
                spotlight.currentX += (spotlight.targetX - spotlight.currentX) * spotlight.smoothing;
                spotlight.currentY += (spotlight.targetY - spotlight.currentY) * spotlight.smoothing;
                spotlight.currentRadius += (spotlight.targetRadius - spotlight.currentRadius) * spotlight.smoothing;
                spotlight.line.style.setProperty("--mouse-x", `${spotlight.currentX}%`);
                spotlight.line.style.setProperty("--mouse-y", `${spotlight.currentY}%`);
                spotlight.line.style.setProperty("--spotlight-radius", `${spotlight.currentRadius}px`);
            });

            const frameIdx = Math.floor(scene5FrameState.frame);
            const scene5EndpointIsVisible = scene5IsOverlayActive
                || document.body.classList.contains("scene-4-to-scene-5");
            if (
                scene5EndpointIsVisible
                && (frameIdx === 0 || frameIdx >= scene5FrameCount - 1)
            ) {
                renderScene5Frame(scene5FrameState.frame);
            }
            requestAnimationFrame(updateScene5ParallaxLoop);
        }

        window.addEventListener("resize", resizeScene5Canvas, { passive: true });
        resizeScene5Canvas();
        updateScene5ParallaxLoop();
        const scene5IntroCopy = document.querySelector(".scene-5-intro-text-wrapper");
        const scene5EndCopy = document.getElementById("scene-5-end-copy");
        const scene5EndCopyMoveStartFrame = 887 - scene5StartFrame;
        const scene5EndCopyMoveEndFrame = scene5EndFrame - scene5StartFrame;
        const scene5EndCopyExtraStartOffset = 0.1;
        let scene5EndCopyStartY = 0;

        function measureScene5EndCopyTravel() {
            if (!scene5IntroCopy || !scene5EndCopy) return;
            gsap.set(scene5EndCopy, { y: 0 });
            scene5EndCopyStartY = Math.max(
                0,
                scene5IntroCopy.getBoundingClientRect().top
                    - scene5EndCopy.getBoundingClientRect().top
            ) + window.innerHeight * scene5EndCopyExtraStartOffset;
        }

        function updateScene5EndCopyPosition(frame) {
            if (!scene5EndCopy) return;
            const progress = gsap.utils.clamp(
                0,
                1,
                (frame - scene5EndCopyMoveStartFrame)
                    / (scene5EndCopyMoveEndFrame - scene5EndCopyMoveStartFrame)
            );
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            gsap.set(scene5EndCopy, {
                y: scene5EndCopyStartY * (1 - easedProgress)
            });
        }

        resetScene5State = function() {
            if (currentTween5) {
                currentTween5.kill();
                currentTween5 = null;
            }
            isScene5Animating = false;
            scene5HasCompletedForward = false;
            scene5ForwardHandoffQueued = false;
            scene5QueuedForwardInput = 0;
            setSceneScrollPrompt(5, false);
            scene5FrameState.frame = 0;
            scene5ScrubState.position = 0;
            scene5ScrubTarget = 0;
            updateScene5YellowHandoff(0);
            if (scene5IntroCopy) {
                gsap.killTweensOf(scene5IntroCopy);
                gsap.set(scene5IntroCopy, {
                    autoAlpha: 1,
                    y: 0,
                    filter: "blur(0px)"
                });
            }
            scene5TextSpotlights.forEach((spotlight, index) => {
                const startX = index === 0 ? 25 : 75;
                spotlight.currentX = startX;
                spotlight.targetX = startX;
                spotlight.currentY = 50;
                spotlight.targetY = 50;
                spotlight.currentRadius = 0;
                spotlight.targetRadius = 0;
                spotlight.line.style.setProperty("--mouse-x", `${startX}%`);
                spotlight.line.style.setProperty("--mouse-y", "50%");
                spotlight.line.style.setProperty("--spotlight-radius", "0px");
            });
            if (scene5EndCopy) {
                gsap.killTweensOf(scene5EndCopy);
                gsap.set(scene5EndCopy, {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    filter: "blur(0px)"
                });
                measureScene5EndCopyTravel();
                updateScene5EndCopyPosition(0);
            }
            if (scene5Canvas) {
                gsap.set(scene5Canvas, { x: 0, autoAlpha: 1 });
                renderScene5Frame(0);
            }
        };

        playScene5Forward = function() {
            if (isScene5Animating || scene5HasCompletedForward) return;
            if (currentTween5) currentTween5.kill();

            isScene5Animating = false;
            scene5ForwardHandoffQueued = false;
            scene5QueuedForwardInput = 0;
            scene5FrameState.frame = 0;
            scene5ScrubState.position = 0;
            scene5ScrubTarget = 0;
            resizeScene5Canvas();
            renderScene5Frame(0);
            updateScene5YellowHandoff(0);
            gsap.set(scene5Canvas, { x: 0, opacity: 1, visibility: "visible" });
        };

        function renderScene5ScrubPosition() {
            scene5FrameState.frame = gsap.utils.clamp(
                0,
                scene5FrameCount - 1,
                scene5ScrubState.position
            );
            gsap.set(scene5Canvas, { opacity: 1, visibility: "visible" });
            renderScene5Frame(scene5FrameState.frame);
            updateScene5YellowHandoff(scene5FrameState.frame);
            updateScene5EndCopyPosition(scene5FrameState.frame);
        }

        scrubScene5Frames = function(inputPixels) {
            if (scene5HasCompletedForward && inputPixels > 0) return "at-end";
            if (inputPixels < 0) {
                scene5ForwardHandoffQueued = false;
                scene5QueuedForwardInput = 0;
            }
            if (
                inputPixels > 0
                && currentTween5
                && scene5ScrubTarget >= scene5ScrubMax - 0.001
            ) {
                scene5ForwardHandoffQueued = true;
                scene5QueuedForwardInput = inputPixels;
                return "handoff-queued";
            }
            if (!currentTween5 && Math.abs(scene5FrameState.frame - (scene5FrameCount - 1)) < 1) {
                scene5ScrubState.position = scene5ScrubMax;
                scene5ScrubTarget = scene5ScrubMax;
            }
            if (inputPixels < 0 && scene5ScrubTarget <= 0.001) return "past-start";

            scene5ScrubTarget = gsap.utils.clamp(
                0,
                scene5ScrubMax,
                scene5ScrubTarget + getHeroSceneScrubDelta(
                    inputPixels * HERO_SCENE_SCRUB_SPEED_MULTIPLIER,
                    scene5ScrubMax
                )
            );
            if (currentTween5) currentTween5.kill();
            currentTween5 = gsap.to(scene5ScrubState, {
                position: scene5ScrubTarget,
                ease: "power3.out",
                duration: HERO_SCENE_SCRUB_GLIDE_DURATION,
                overwrite: true,
                onUpdate: renderScene5ScrubPosition,
                onComplete: () => {
                    currentTween5 = null;
                    if (scene5ScrubTarget < scene5ScrubMax || scene5HasCompletedForward) return;
                    scene5FrameState.frame = scene5FrameCount - 1;
                    renderScene5Frame(scene5FrameState.frame);
                    updateScene5YellowHandoff(scene5FrameState.frame);
                    scene5HasCompletedForward = true;
                    if (scene5ForwardHandoffQueued && advanceScene5ToScene6) {
                        const queuedInput = scene5QueuedForwardInput;
                        scene5ForwardHandoffQueued = false;
                        scene5QueuedForwardInput = 0;
                        setSceneScrollPrompt(5, false);
                        requestAnimationFrame(() => advanceScene5ToScene6(queuedInput));
                    } else {
                        setSceneScrollPrompt(5, true);
                    }
                }
            });
            return scene5ScrubTarget >= scene5ScrubMax ? "at-end" : "scrubbing";
        };

        playScene5Reverse = function(onCompleteCallback) {
            if (isScene5Animating) return;
            if (currentTween5) currentTween5.kill();

            isScene5Animating = true;
            gsap.set(scene5Canvas, { autoAlpha: 1 });
            currentTween5 = gsap.to(scene5FrameState, {
                frame: 0,
                ease: "none",
                duration: (scene5FrameCount - 1) / 60,
                onUpdate: () => {
                    renderScene5Frame(scene5FrameState.frame);
                    updateScene5YellowHandoff(scene5FrameState.frame);
                },
                onComplete: () => {
                    scene5FrameState.frame = 0;
                    renderScene5Frame(0);
                    updateScene5YellowHandoff(0);
                    isScene5Animating = false;
                    scene5HasCompletedForward = false;
                    currentTween5 = null;
                    if (onCompleteCallback) onCompleteCallback();
                }
            });
        };

        advanceScene5ToScene6 = function(inputPixels = 0) {
            if (isTransitioningScene || isScene5Animating || !scene5HasCompletedForward) return;

            const scene5El = document.getElementById("scene-5");
            const scene6El = document.getElementById("scene-6");
            const scene6CanvasEl = document.getElementById("scene-6-canvas");
            if (!scene5El || !scene6El || !scene6CanvasEl) return;

            isTransitioningScene = true;
            const scene5Presentation = [scene5IntroCopy, scene5EndCopy].filter(Boolean);
            gsap.killTweensOf(scene5Presentation);
            scene5FrameState.frame = scene5FrameCount - 1;
            renderScene5Frame(scene5FrameState.frame);
            scene5Canvas.classList.add("scene-5-sticky-frame-layer");
            document.body.appendChild(scene5Canvas);

            if (typeof resetScene6State === "function") {
                resetScene6State();
            }
            scene6El.style.opacity = "";
            scene6El.style.visibility = "";
            scene6CanvasEl.style.opacity = "1";
            scene6CanvasEl.style.visibility = "visible";

            const scene5To6FadeDuration = 0.5;
            document.body.classList.add("scene-5-to-scene-6");
            gsap.set(scene6El, { y: 0, autoAlpha: 0 });
            gsap.to(scene6El, {
                autoAlpha: 1,
                duration: scene5To6FadeDuration,
                ease: "power2.inOut",
                overwrite: true
            });
            if (scrubScene6Frames) {
                scrubScene6Frames(Math.max(0, inputPixels));
            }

            gsap.to(scene5Presentation, {
                autoAlpha: 0,
                y: 0,
                filter: "blur(6px)",
                duration: 0.36,
                ease: "power2.inOut",
                stagger: 0.025,
                overwrite: true
            });
            gsap.to(scene5Canvas, {
                autoAlpha: 0,
                duration: 0.36,
                ease: "power2.inOut",
                overwrite: true
            });

            const scene6TargetScroll = window.scrollY + window.innerHeight;
            if (lenis) {
                lenis.scrollTo(scene6TargetScroll, {
                    duration: scene5To6FadeDuration,
                    force: true
                });
            } else {
                window.scrollTo({ top: scene6TargetScroll, behavior: "smooth" });
            }

            setTimeout(() => {
                scene5Canvas.style.visibility = "hidden";
                scene5Canvas.classList.remove("scene-5-sticky-frame-layer");
                scene5El.appendChild(scene5Canvas);
                gsap.set(scene5Canvas, { clearProps: "opacity,transform" });
                scene5Canvas.style.visibility = "";
                scene5El.style.opacity = "0";
                scene5El.style.visibility = "hidden";

                deactivateScene5Overlay(false);
                activateScene6Overlay();
                document.body.classList.remove("scene-5-to-scene-6");
                gsap.set(scene6El, { clearProps: "transform,opacity" });
                scene6CanvasEl.style.opacity = "1";
                scene6CanvasEl.style.visibility = "visible";
                isTransitioningScene = false;
                if (!scrubScene6Frames && playScene6Forward) {
                    requestAnimationFrame(() => playScene6Forward());
                }
            }, scene5To6FadeDuration * 1000);
        };

        returnScene6ToScene5 = function() {
            const scene5El = document.getElementById("scene-5");
            const scene6El = document.getElementById("scene-6");
            if (!scene5El || !scene6El) return;

            scene5El.style.opacity = "";
            scene5El.style.visibility = "";
            scene5FrameState.frame = scene5FrameCount - 1;
            scene5HasCompletedForward = true;
            isScene5Animating = false;
            resizeScene5Canvas();
            renderScene5Frame(scene5FrameState.frame);
            updateScene5YellowHandoff(scene5FrameState.frame);
            gsap.set(scene5Canvas, { autoAlpha: 0, x: 0 });

            scene5Canvas.classList.add("scene-5-sticky-frame-layer");
            document.body.appendChild(scene5Canvas);
            setScene2HeaderTheme(true);
            document.body.classList.add("scene-6-to-scene-5");
            gsap.set(scene6El, { y: 0, autoAlpha: 1 });

            const scene6To5FadeDuration = 0.5;
            const scene5LayerFadeDuration = 0.36;
            const scene5Presentation = [scene5IntroCopy, scene5EndCopy].filter(Boolean);
            gsap.set(scene5Presentation, {
                autoAlpha: 0,
                y: 0,
                scale: 1,
                filter: "blur(6px)"
            });
            gsap.to(scene5Presentation, {
                autoAlpha: 1,
                filter: "blur(0px)",
                duration: scene5LayerFadeDuration,
                ease: "power2.inOut",
                stagger: 0.025,
                overwrite: true
            });
            gsap.to(scene5Canvas, {
                autoAlpha: 1,
                duration: scene5LayerFadeDuration,
                ease: "power2.inOut",
                overwrite: true
            });

            const sceneTransition = gsap.timeline({
                onComplete: () => {
                    scene6El.style.visibility = "hidden";
                    deactivateScene6Overlay(false);
                    activateScene5Overlay();
                    document.body.classList.remove("scene-6-to-scene-5");
                    gsap.set(scene6El, { clearProps: "transform,opacity" });

                    scene5Canvas.style.visibility = "hidden";
                    scene5Canvas.classList.remove("scene-5-sticky-frame-layer");
                    scene5El.appendChild(scene5Canvas);
                    scene5Canvas.style.visibility = "";
                    resizeScene5Canvas();
                    scene5FrameState.frame = scene5FrameCount - 1;
                    renderScene5Frame(scene5FrameState.frame);
                    updateScene5YellowHandoff(scene5FrameState.frame);

                    if (typeof resetScene6State === "function") {
                        resetScene6State();
                    }
                    scene6El.style.visibility = "";
                    setSceneScrollPrompt(5, true);
                    isTransitioningScene = false;
                }
            });
            sceneTransition.to(scene6El, {
                autoAlpha: 0,
                duration: scene6To5FadeDuration,
                ease: "power2.inOut",
                overwrite: true
            });

            const scene5TargetScroll = Math.max(0, window.scrollY - window.innerHeight);
            if (lenis) {
                lenis.scrollTo(scene5TargetScroll, {
                    duration: scene6To5FadeDuration,
                    force: true
                });
            } else {
                window.scrollTo({ top: scene5TargetScroll, behavior: "smooth" });
            }
        };
    }

    // --------------------------------------------------------------------------
    // 3H. SCENE-6 SCROLL-SCRUB ENGINE (469 FRAME POSITIONS: 0939 to 1407)
    // --------------------------------------------------------------------------
    const scene6Canvas = document.getElementById("scene-6-canvas");
    let scene6HasCompletedForward = false;
    let resetScene6State = null;
    let scene6CounterHasRun = false;

    if (!mobileStaticHomepage && scene6Canvas && typeof gsap !== "undefined") {
        const scene6Ctx = scene6Canvas.getContext("2d");
        const scene6StartFrame = 939;
        const scene6EndFrame = 1407;
        const scene6FrameCount = scene6EndFrame - scene6StartFrame + 1;
        const scene6DeliveryFadeFrame = 1100;
        const scene6DeliveryStartFrame = 1184;
        const scene6BrandStartFrame = 1290;
        const scene6DeliveryTravelDuration = ((scene6BrandStartFrame - scene6DeliveryStartFrame) / 60) - 0.08;
        const scene6Images = window.scene6Images;
        const scene6FrameState = { frame: 0 };
        let currentTween6 = null;
        let scene6ScrubTarget = 0;
        let scene6ForwardHandoffQueued = false;

        let targetParallax6X = 0;
        let targetParallax6Y = 0;
        let currentParallax6X = 0;
        let currentParallax6Y = 0;

        let targetGlow6X = 0;
        let currentGlow6X = 0;
        let targetGlow6Y = 50;
        let currentGlow6Y = 50;
        let targetGlowRadius6 = 0;
        let currentGlowRadius6 = 0;
        let isMouseOverScene6 = false;

        function resizeScene6Canvas() {
            if (!scene6Canvas) return;
            scene6Canvas.width = scene6Canvas.offsetWidth || window.innerWidth;
            scene6Canvas.height = scene6Canvas.offsetHeight || window.innerHeight;
            renderScene6Frame(scene6FrameState.frame);
        }

        window.resizeScene6Canvas = resizeScene6Canvas;

        const scene6El = document.getElementById("scene-6");
        if (scene6El) {
            scene6El.addEventListener("mousemove", (e) => {
                const rect = scene6El.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                targetParallax6X = (e.clientX - centerX) / (rect.width / 2);
                targetParallax6Y = (e.clientY - centerY) / (rect.height / 2);

                isMouseOverScene6 = true;
                const worldwideLine = document.querySelector(".scene-6-title__line--bold");
                if (worldwideLine) {
                    const pRect = worldwideLine.getBoundingClientRect();
                    targetGlow6X = Math.max(0, Math.min(100, ((e.clientX - pRect.left) / pRect.width) * 100));
                    targetGlow6Y = Math.max(0, Math.min(100, ((e.clientY - pRect.top) / pRect.height) * 100));
                }
            }, { passive: true });

            scene6El.addEventListener("mouseleave", () => {
                targetParallax6X = 0;
                targetParallax6Y = 0;
                isMouseOverScene6 = false;
            }, { passive: true });
        }

        function renderScene6Frame(index) {
            const frameIdx = Math.floor(index);
            const currentImg = scene6Images[frameIdx];
            if (!currentImg || !currentImg.complete) return;
            if (!scene6Canvas || !scene6Ctx) return;

            scene6Ctx.clearRect(0, 0, scene6Canvas.width, scene6Canvas.height);

            const ratio = scene6Canvas.width / currentImg.width;

            let centerShiftX = 0;
            let centerShiftY = (scene6Canvas.height - currentImg.height * ratio) / 2;

            if (frameIdx >= scene6FrameCount - 1) {
                centerShiftX += currentParallax6X * 22;
                centerShiftY += currentParallax6Y * 22;
            }

            scene6Ctx.drawImage(
                currentImg,
                0, 0, currentImg.width, currentImg.height,
                centerShiftX, centerShiftY, currentImg.width * ratio, currentImg.height * ratio
            );
        }

        function updateScene6ParallaxLoop() {
            currentParallax6X += (targetParallax6X - currentParallax6X) * 0.08;
            currentParallax6Y += (targetParallax6Y - currentParallax6Y) * 0.08;

            // Manage automatic / random movement of the white highlight in Scene 6
            if (!scene6CounterHasRun) {
                targetGlow6X = 0;
                targetGlow6Y = 50;
                targetGlowRadius6 = 0;
            } else {
                targetGlowRadius6 = 140; // Active circle radius
                if (!isMouseOverScene6) {
                    // Smooth continuous oscillation using independent waves
                    targetGlow6X = 50 + Math.sin(Date.now() * 0.001) * 45;
                    targetGlow6Y = 50 + Math.cos(Date.now() * 0.0017) * 45;
                }
            }

            currentGlow6X += (targetGlow6X - currentGlow6X) * 0.05;
            currentGlow6Y += (targetGlow6Y - currentGlow6Y) * 0.05;
            currentGlowRadius6 += (targetGlowRadius6 - currentGlowRadius6) * 0.05;

            const worldwideLine = document.querySelector(".scene-6-title__line--bold");
            if (worldwideLine) {
                worldwideLine.style.setProperty("--mouse-x", `${currentGlow6X}%`);
                worldwideLine.style.setProperty("--mouse-y", `${currentGlow6Y}%`);
                worldwideLine.style.setProperty("--spotlight-radius", `${currentGlowRadius6}px`);
            }

            if (scene6HasCompletedForward && Math.floor(scene6FrameState.frame) >= scene6FrameCount - 1) {
                renderScene6Frame(scene6FrameCount - 1);
            }
            requestAnimationFrame(updateScene6ParallaxLoop);
        }

        window.addEventListener("resize", resizeScene6Canvas, { passive: true });
        resizeScene6Canvas();
        updateScene6ParallaxLoop();

        const scene6Text = document.getElementById("scene-6-text");
        const scene6DeliveryCopy = document.getElementById("scene-6-delivery-copy");

        let logosTween = null;
        let scene6LogosPopped = false;
        let scene6DeliveryHasAppeared = false;
        let scene6DeliveryMotionHasStarted = false;
        let scene6TrustedHasAppeared = false;
        let scene6BrandRevealQueued = false;
        let scene6TrustedTimeline = null;
        let scene6DeliveryMotionAnimation = null;
        let scene6ReverseDeliveryMotionHasStarted = false;
        let scene6ReverseDeliveryFadeQueued = false;

        function popInLogos() {
            if (scene6LogosPopped) return;
            scene6LogosPopped = true;
            const logos = document.querySelectorAll(".scene-6-brand-logo");
            if (logos.length > 0) {
                gsap.killTweensOf(logos);
                logosTween = gsap.fromTo(logos,
                    { scale: 0, opacity: 0 },
                    { 
                        scale: 1, 
                        opacity: 1, 
                        ease: "back.out(1.7)", 
                        duration: 0.5, 
                        stagger: {
                            each: 0.08,
                            from: "random"
                        },
                        overwrite: "auto"
                    }
                );
            }
        }

        function resetLogos(immediate = false) {
            scene6LogosPopped = false;
            const logos = document.querySelectorAll(".scene-6-brand-logo");
            if (logos.length > 0) {
                if (logosTween) {
                    logosTween.kill();
                    logosTween = null;
                }
                gsap.killTweensOf(logos);
                if (immediate) {
                    gsap.set(logos, { scale: 0, opacity: 0 });
                } else {
                    gsap.to(logos, { scale: 0, opacity: 0, duration: 0.3, overwrite: "auto" });
                }
            }
        }

        restoreScene6FinalState = function() {
            if (currentTween6) {
                currentTween6.kill();
                currentTween6 = null;
            }
            if (scene6TrustedTimeline) {
                scene6TrustedTimeline.kill();
                scene6TrustedTimeline = null;
            }
            if (logosTween) {
                logosTween.kill();
                logosTween = null;
            }
            if (scene6DeliveryMotionAnimation) {
                scene6DeliveryMotionAnimation.cancel();
                scene6DeliveryMotionAnimation = null;
            }

            const title = scene6Text?.querySelector(".scene-6-title");
            const logos = Array.from(document.querySelectorAll(".scene-6-brand-logo"));
            gsap.killTweensOf([title, scene6DeliveryCopy, ...logos].filter(Boolean));

            scene6FrameState.frame = scene6FrameCount - 1;
            scene6ScrubTarget = scene6FrameCount - 1;
            scene6HasCompletedForward = true;
            scene6ForwardHandoffQueued = false;
            scene6FinalContentIsAnimating = false;
            isScene6Animating = false;
            scene6TrustedHasAppeared = true;
            scene6BrandRevealQueued = true;
            scene6LogosPopped = true;
            scene6CounterHasRun = true;
            scene6DeliveryHasAppeared = false;
            scene6DeliveryMotionHasStarted = false;
            scene6ReverseDeliveryMotionHasStarted = false;
            scene6ReverseDeliveryFadeQueued = false;
            window.scene6TextInCenter = true;
            targetGlowRadius6 = 140;
            currentGlowRadius6 = 140;

            renderScene6Frame(scene6FrameState.frame);
            gsap.set(scene6Canvas, { autoAlpha: 1, x: 0 });
            if (scene6DeliveryCopy) {
                gsap.set(scene6DeliveryCopy, { autoAlpha: 0 });
            }
            if (title) {
                gsap.set(title, {
                    autoAlpha: 1,
                    x: 0,
                    scale: 1,
                    filter: "blur(0px)"
                });
            }
            if (logos.length) {
                gsap.set(logos, { opacity: 1, scale: 1 });
            }
            setSceneScrollPrompt(6, false);
        };

        resetScene6State = function() {
            if (currentTween6) {
                currentTween6.kill();
                currentTween6 = null;
            }
            if (scene6TrustedTimeline) {
                scene6TrustedTimeline.kill();
                scene6TrustedTimeline = null;
            }
            if (scene6DeliveryMotionAnimation) {
                scene6DeliveryMotionAnimation.cancel();
                scene6DeliveryMotionAnimation = null;
            }
            isScene6Animating = false;
            scene6FinalContentIsAnimating = false;
            scene6HasCompletedForward = false;
            scene6ForwardHandoffQueued = false;
            scene6CounterHasRun = false;
            scene6DeliveryHasAppeared = false;
            scene6DeliveryMotionHasStarted = false;
            scene6ReverseDeliveryMotionHasStarted = false;
            scene6ReverseDeliveryFadeQueued = false;
            window.scene6TextInCenter = false;
            document.body.classList.remove("scene-6-text-in-center");
            scene6TrustedHasAppeared = false;
            scene6BrandRevealQueued = false;
            setSceneScrollPrompt(6, true);
            scene6FrameState.frame = 0;
            scene6ScrubTarget = 0;
            renderScene6Frame(0);
            currentGlow6X = 0;
            targetGlow6X = 0;
            currentGlow6Y = 50;
            targetGlow6Y = 50;
            currentGlowRadius6 = 0;
            targetGlowRadius6 = 0;
            const worldwideLine = document.querySelector(".scene-6-title__line--bold");
            if (worldwideLine) {
                worldwideLine.style.setProperty("--mouse-x", "0%");
                worldwideLine.style.setProperty("--mouse-y", "50%");
                worldwideLine.style.setProperty("--spotlight-radius", "0px");
            }
            if (scene6Text) {
                const title = scene6Text.querySelector(".scene-6-title");
                if (title) {
                    gsap.set(title, {
                        autoAlpha: 0,
                        x: 0,
                        scale: 0.96,
                        filter: "blur(8px)"
                    });
                }
            }
            if (scene6DeliveryCopy) {
                gsap.killTweensOf(scene6DeliveryCopy);
                gsap.set(scene6DeliveryCopy, { clearProps: "transform" });
                gsap.set(scene6DeliveryCopy, {
                    autoAlpha: 0,
                    y: 0,
                    scale: 1,
                    filter: "blur(5px)"
                });
            }
            resetLogos(true);
            if (typeof handleHeaderScroll === "function") handleHeaderScroll();
        };

        function showScene6DeliveryCopy() {
            if (scene6DeliveryHasAppeared || !scene6DeliveryCopy) return;
            scene6DeliveryHasAppeared = true;
            scene6DeliveryCopy.style.transform = "translate3d(calc(-50% + 50vw), 0, 0)";
            gsap.set(scene6DeliveryCopy, {
                opacity: 0,
                visibility: "visible",
                filter: "blur(0px)"
            });
            gsap.to(scene6DeliveryCopy, {
                opacity: 1,
                duration: 0.68,
                ease: "sine.out",
                overwrite: true
            });
        }

        function startScene6DeliveryMotion() {
            if (scene6DeliveryMotionHasStarted || !scene6DeliveryCopy) return;
            scene6DeliveryMotionHasStarted = true;
            gsap.killTweensOf(scene6DeliveryCopy);
            gsap.set(scene6DeliveryCopy, { opacity: 1, visibility: "visible" });
            scene6DeliveryMotionAnimation = scene6DeliveryCopy.animate([
                {
                    transform: "translate3d(calc(-50% + 50vw), 0, 0)",
                    opacity: 1,
                },
                {
                    transform: "translate3d(calc(-50% - 42.88vw), 0, 0)",
                    opacity: 1,
                    offset: 0.86
                },
                {
                    transform: "translate3d(calc(-50% - 58vw), 0, 0)",
                    opacity: 0
                }
            ], {
                duration: scene6DeliveryTravelDuration * 1000,
                easing: "linear",
                fill: "forwards"
            });
        }

        function showScene6TrustedBrands() {
            if (scene6TrustedHasAppeared) return;
            scene6TrustedHasAppeared = true;
            scene6FinalContentIsAnimating = true;
            setSceneScrollPrompt(6, false);
            const title = scene6Text?.querySelector(".scene-6-title");
            const logos = Array.from(document.querySelectorAll(".scene-6-brand-logo"));
            window.scene6TextInCenter = true;
            scene6CounterHasRun = true;
            targetGlowRadius6 = 140;
            if (typeof handleHeaderScroll === "function") handleHeaderScroll();

            if (scene6TrustedTimeline) scene6TrustedTimeline.kill();
            if (logosTween) {
                logosTween.kill();
                logosTween = null;
            }
            gsap.killTweensOf([title, ...logos].filter(Boolean));
            scene6TrustedTimeline = gsap.timeline({
                onComplete: () => {
                    isScene6Animating = false;
                    scene6FinalContentIsAnimating = false;
                    continueScene6ForwardHandoff();
                }
            });
            if (title) {
                scene6TrustedTimeline.to(title, {
                    autoAlpha: 1,
                    x: 0,
                    scale: 1,
                    filter: "blur(0px)",
                    duration: 1.2,
                    ease: "power2.out"
                });
            }
            if (logos.length) {
                scene6LogosPopped = true;
                scene6TrustedTimeline.fromTo(logos,
                    { scale: 0, opacity: 0 },
                    {
                        scale: 1,
                        opacity: 1,
                        ease: "back.out(1.7)",
                        duration: 0.5,
                        stagger: {
                            each: 0.08,
                            from: "random"
                        },
                        overwrite: "auto"
                    },
                    title ? 0.42 : 0
                );
            }
        }

        function hideScene6TrustedBrandsForScrub() {
            if (!scene6TrustedHasAppeared && !scene6BrandRevealQueued) return;
            const title = scene6Text?.querySelector(".scene-6-title");
            const logos = Array.from(document.querySelectorAll(".scene-6-brand-logo"));
            if (scene6TrustedTimeline) {
                scene6TrustedTimeline.kill();
                scene6TrustedTimeline = null;
            }
            if (logosTween) {
                logosTween.kill();
                logosTween = null;
            }
            gsap.killTweensOf([title, ...logos].filter(Boolean));
            if (title) gsap.set(title, { autoAlpha: 0, scale: 0.96, filter: "blur(8px)" });
            if (logos.length) gsap.set(logos, { opacity: 0, scale: 0 });
            scene6LogosPopped = false;
            scene6TrustedHasAppeared = false;
            scene6BrandRevealQueued = false;
            scene6CounterHasRun = false;
            scene6FinalContentIsAnimating = false;
            window.scene6TextInCenter = false;
            setSceneScrollPrompt(6, true);
            targetGlowRadius6 = 0;
            if (typeof handleHeaderScroll === "function") handleHeaderScroll();
        }

        function hideScene6DeliveryCopy(onComplete) {
            if (!scene6DeliveryCopy) {
                if (onComplete) onComplete();
                return;
            }
            if (scene6DeliveryMotionAnimation && scene6DeliveryMotionAnimation.playState === "running") {
                scene6DeliveryMotionAnimation.finished.then(() => {
                    scene6DeliveryMotionAnimation?.cancel();
                    scene6DeliveryMotionAnimation = null;
                    gsap.set(scene6DeliveryCopy, { autoAlpha: 0 });
                    if (onComplete) onComplete();
                }).catch(() => {});
                return;
            }
            scene6DeliveryMotionAnimation?.cancel();
            scene6DeliveryMotionAnimation = null;
            gsap.set(scene6DeliveryCopy, { autoAlpha: 0 });
            if (onComplete) onComplete();
        }

        function startScene6ReverseDeliveryMotion() {
            if (scene6ReverseDeliveryMotionHasStarted || !scene6DeliveryCopy) return;
            scene6ReverseDeliveryMotionHasStarted = true;
            scene6DeliveryHasAppeared = true;
            scene6DeliveryMotionAnimation?.cancel();
            gsap.killTweensOf(scene6DeliveryCopy);
            gsap.set(scene6DeliveryCopy, {
                opacity: 0,
                visibility: "visible",
                filter: "blur(0px)"
            });

            scene6DeliveryMotionAnimation = scene6DeliveryCopy.animate([
                {
                    transform: "translate3d(calc(-50% - 58vw), 0, 0)",
                    opacity: 0
                },
                {
                    transform: "translate3d(calc(-50% - 42.88vw), 0, 0)",
                    opacity: 1,
                    offset: 0.14
                },
                {
                    transform: "translate3d(calc(-50% + 50vw), 0, 0)",
                    opacity: 1
                }
            ], {
                duration: scene6DeliveryTravelDuration * 1000,
                easing: "linear",
                fill: "forwards"
            });
        }

        function fadeOutScene6ReverseDelivery() {
            if (scene6ReverseDeliveryFadeQueued || !scene6DeliveryCopy) return;
            scene6ReverseDeliveryFadeQueued = true;
            const reverseMotion = scene6DeliveryMotionAnimation;

            const fadeFromRightEdge = () => {
                if (scene6DeliveryMotionAnimation === reverseMotion) {
                    scene6DeliveryMotionAnimation?.cancel();
                    scene6DeliveryMotionAnimation = null;
                }
                scene6DeliveryCopy.style.transform = "translate3d(calc(-50% + 50vw), 0, 0)";
                gsap.set(scene6DeliveryCopy, {
                    opacity: 1,
                    visibility: "visible",
                    filter: "blur(0px)"
                });
                gsap.to(scene6DeliveryCopy, {
                    opacity: 0,
                    duration: 0.68,
                    ease: "sine.in",
                    overwrite: true,
                    onComplete: () => gsap.set(scene6DeliveryCopy, { visibility: "hidden" })
                });
            };

            if (reverseMotion && reverseMotion.playState === "running") {
                reverseMotion.finished.then(fadeFromRightEdge).catch(() => {});
            } else {
                fadeFromRightEdge();
            }
        }

        hideScene6FinalContent = function(onComplete) {
            const title = scene6Text?.querySelector(".scene-6-title");
            const logos = Array.from(document.querySelectorAll(".scene-6-brand-logo"));
            const reverseFrameTarget = Math.max(
                0,
                scene6BrandStartFrame - scene6StartFrame - 1
            );
            if (logosTween) {
                logosTween.kill();
                logosTween = null;
            }
            if (scene6TrustedTimeline) {
                scene6TrustedTimeline.kill();
                scene6TrustedTimeline = null;
            }
            window.scene6TextInCenter = false;
            scene6CounterHasRun = false;
            scene6FinalContentIsAnimating = true;
            setSceneScrollPrompt(6, true);
            targetGlowRadius6 = 0;
            if (typeof handleHeaderScroll === "function") handleHeaderScroll();

            const finishTrustedBrandsReverse = () => {
                scene6LogosPopped = false;
                scene6TrustedHasAppeared = false;
                scene6BrandRevealQueued = false;
                scene6FinalContentIsAnimating = false;
                scene6TrustedTimeline = null;
                scene6FrameState.frame = reverseFrameTarget;
                scene6ScrubTarget = reverseFrameTarget;
                renderScene6Frame(scene6FrameState.frame);
                renderScene6ScrubEffects();
                if (onComplete) onComplete();
            };

            // Reverse the final brand presentation and the nearly-solid-yellow
            // frame tail together. Waiting for the copy to disappear before
            // moving frame 1407 exposed a blank yellow viewport on reverse.
            gsap.killTweensOf([title, ...logos].filter(Boolean));
            scene6TrustedTimeline = gsap.timeline({
                onComplete: finishTrustedBrandsReverse
            });

            if (logos.length) {
                scene6TrustedTimeline.to(logos, {
                    scale: 0,
                    opacity: 0,
                    duration: 0.5,
                    ease: "back.in(1.7)",
                    stagger: { each: 0.08, from: "random" }
                }, 0);
            }
            if (title) {
                scene6TrustedTimeline.to(title, {
                    autoAlpha: 0,
                    scale: 0.96,
                    filter: "blur(8px)",
                    duration: 1.2,
                    ease: "power2.in",
                    overwrite: true
                }, logos.length ? 0.12 : 0);
            }
            scene6TrustedTimeline.to(scene6FrameState, {
                frame: reverseFrameTarget,
                duration: 1.32,
                ease: "power2.inOut",
                onUpdate: () => {
                    renderScene6Frame(scene6FrameState.frame);
                    renderScene6ScrubEffects();
                }
            }, 0);
        };

        playScene6Forward = function() {
            if (isScene6Animating || scene6HasCompletedForward) return;
            if (currentTween6) currentTween6.kill();

            isScene6Animating = false;
            scene6ForwardHandoffQueued = false;
            scene6FrameState.frame = 0;
            scene6ScrubTarget = 0;
            resizeScene6Canvas();
            renderScene6Frame(0);
            gsap.set(scene6Canvas, { autoAlpha: 1, x: 0 });
        };

        function renderScene6ScrubEffects() {
            const actualFrame = scene6StartFrame + Math.floor(scene6FrameState.frame);
            if (!scene6DeliveryCopy) return;

            scene6DeliveryMotionAnimation?.cancel();
            scene6DeliveryMotionAnimation = null;
            gsap.killTweensOf(scene6DeliveryCopy);

            if (actualFrame < scene6DeliveryFadeFrame || actualFrame >= scene6BrandStartFrame) {
                gsap.set(scene6DeliveryCopy, { autoAlpha: 0 });
                return;
            }

            const fadeProgress = gsap.utils.clamp(
                0,
                1,
                (actualFrame - scene6DeliveryFadeFrame) / (scene6DeliveryStartFrame - scene6DeliveryFadeFrame)
            );
            const travelProgress = gsap.utils.clamp(
                0,
                1,
                (actualFrame - scene6DeliveryStartFrame) / (scene6BrandStartFrame - scene6DeliveryStartFrame)
            );
            const xOffset = 50 - (108 * travelProgress);
            const travelOpacity = travelProgress > 0.86 ? (1 - travelProgress) / 0.14 : 1;
            scene6DeliveryCopy.style.transform = `translate3d(calc(-50% + ${xOffset}vw), 0, 0)`;
            gsap.set(scene6DeliveryCopy, {
                opacity: fadeProgress * Math.max(0, travelOpacity),
                visibility: "visible",
                filter: "blur(0px)"
            });
        }

        function continueScene6ForwardHandoff() {
            if (
                !scene6ForwardHandoffQueued
                || !scene6HasCompletedForward
                || scene6FinalContentIsAnimating
                || !advanceScene6ToContent
            ) return;
            scene6ForwardHandoffQueued = false;
            requestAnimationFrame(() => advanceScene6ToContent());
        }

        scrubScene6Frames = function(inputPixels) {
            if (scene6HasCompletedForward && inputPixels > 0) return "at-end";
            if (inputPixels < 0) scene6ForwardHandoffQueued = false;
            if (
                inputPixels > 0
                && currentTween6
                && scene6ScrubTarget >= scene6FrameCount - 1 - 0.001
            ) {
                scene6ForwardHandoffQueued = true;
                return "handoff-queued";
            }
            if (!currentTween6 && Math.abs(scene6ScrubTarget - scene6FrameState.frame) > 1) {
                scene6ScrubTarget = scene6FrameState.frame;
            }
            if (inputPixels < 0 && scene6ScrubTarget <= 0.001) return "past-start";
            if (
                inputPixels < 0
                && scene6StartFrame + scene6FrameState.frame >= scene6BrandStartFrame
                && !scene6TrustedHasAppeared
            ) {
                // Keep the final title suppressed while the user scrubs back
                // through the frames above its forward reveal threshold.
                scene6BrandRevealQueued = true;
            }

            scene6ScrubTarget = gsap.utils.clamp(
                0,
                scene6FrameCount - 1,
                scene6ScrubTarget + getHeroSceneScrubDelta(
                    inputPixels * HERO_SCENE_SCRUB_SPEED_MULTIPLIER,
                    scene6FrameCount - 1
                )
            );
            if (currentTween6) currentTween6.kill();
            currentTween6 = gsap.to(scene6FrameState, {
                frame: scene6ScrubTarget,
                ease: "power3.out",
                duration: HERO_SCENE_SCRUB_GLIDE_DURATION,
                overwrite: true,
                onUpdate: () => {
                    renderScene6Frame(scene6FrameState.frame);
                    renderScene6ScrubEffects();
                    const actualFrame = scene6StartFrame + Math.floor(scene6FrameState.frame);
                    if (actualFrame >= scene6BrandStartFrame && !scene6BrandRevealQueued) {
                        scene6BrandRevealQueued = true;
                        showScene6TrustedBrands();
                    } else if (actualFrame < scene6BrandStartFrame) {
                        hideScene6TrustedBrandsForScrub();
                    }
                },
                onComplete: () => {
                    currentTween6 = null;
                    if (scene6ScrubTarget >= scene6FrameCount - 1) {
                        scene6FrameState.frame = scene6FrameCount - 1;
                        renderScene6Frame(scene6FrameState.frame);
                        scene6HasCompletedForward = true;
                        continueScene6ForwardHandoff();
                    }
                }
            });
            return scene6ScrubTarget >= scene6FrameCount - 1 ? "at-end" : "scrubbing";
        };

        playScene6Reverse = function(onComplete) {
            if (isScene6Animating || !scene6HasCompletedForward) return;
            if (currentTween6) currentTween6.kill();

            isScene6Animating = true;
            scene6ReverseDeliveryMotionHasStarted = false;
            scene6ReverseDeliveryFadeQueued = false;
            scene6FrameState.frame = scene6FrameCount - 1;
            resizeScene6Canvas();
            renderScene6Frame(scene6FrameState.frame);
            gsap.set(scene6Canvas, { autoAlpha: 1, x: 0 });

            currentTween6 = gsap.to(scene6FrameState, {
                frame: 0,
                ease: "none",
                duration: scene6FrameCount / 60,
                onUpdate: () => {
                    renderScene6Frame(scene6FrameState.frame);
                    const actualFrame = scene6StartFrame + Math.floor(scene6FrameState.frame);
                    if (actualFrame <= scene6BrandStartFrame) {
                        startScene6ReverseDeliveryMotion();
                    }
                    if (actualFrame <= scene6DeliveryStartFrame) {
                        fadeOutScene6ReverseDelivery();
                    }
                },
                onComplete: () => {
                    scene6FrameState.frame = 0;
                    renderScene6Frame(0);
                    scene6DeliveryMotionAnimation?.cancel();
                    scene6DeliveryMotionAnimation = null;
                    gsap.killTweensOf(scene6DeliveryCopy);
                    if (scene6DeliveryCopy) {
                        gsap.set(scene6DeliveryCopy, { autoAlpha: 0, clearProps: "transform" });
                    }
                    scene6HasCompletedForward = false;
                    isScene6Animating = false;
                    currentTween6 = null;
                    if (onComplete) onComplete();
                }
            });
        };
    }

    if (!mobileStaticHomepage && !skipHomepageIntro && typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
        for (let i = 2; i <= 6; i++) {
            const sceneEl = document.getElementById(`scene-${i}`);
            if (sceneEl) {
                ScrollTrigger.create({
                    trigger: sceneEl,
                    start: "top 80%",
                    end: "bottom 20%",
                    onEnter: () => {
                        sceneEl.classList.add("scene-active");
                        if (typeof window.preloadScene === "function") {
                            if (i + 1 <= 6) window.preloadScene(i + 1);
                            if (i + 2 <= 6) window.preloadScene(i + 2);
                        }
                    },
                    onLeaveBack: () => {
                        // The custom reverse engine owns every scene state from
                        // the content boundary back to Scene 0. ScrollTrigger can
                        // interpret its programmatic viewport handoffs as natural
                        // leave events and reset an incoming canvas mid-transition.
                        if (sceneContentReverseJourneyIsActive) return;

                        const managedOverlayActive = scene1IsOverlayActive
                            || scene2IsOverlayActive
                            || scene3IsOverlayActive
                            || scene4IsOverlayActive
                            || scene5IsOverlayActive
                            || scene6IsOverlayActive;
                        // Scene 6's completed state is the reverse-entry bridge
                        // from normal homepage content. Resetting it here makes
                        // the boundary interceptor ineligible and exposes the
                        // scene's intentionally plain yellow tail in document flow.
                        if (
                            i === 6
                            && (scene6HasCompletedForward || scene6ContentHandoffIsActive)
                        ) return;
                        if (!isTransitioningScene && !managedOverlayActive && resetSceneState) {
                            resetSceneState(i);
                        }
                    }
                });
            }
        }
    }

    // --------------------------------------------------------------------------
    // 4. PURE WHITE SILK BEZIER THREAD ENGINE (DISABLED)
    // --------------------------------------------------------------------------
    // Threads animation disabled


    // --------------------------------------------------------------------------
    // 5. TESTIMONIALS CAROUSEL ENGINE
    // --------------------------------------------------------------------------
    const testimonialTrack = document.getElementById("bigbee-testimonial-track");
    const testimonialPrev = document.getElementById("testimonial-prev");
    const testimonialNext = document.getElementById("testimonial-next");
    const testimonialDots = document.getElementById("bigbee-testimonial-dots");

    if (testimonialTrack) {
        const cards = Array.from(testimonialTrack.children);
        let currentIndex = 0;
        let autoPlayTimer = null;

        function getVisibleCardsCount() {
            if (window.innerWidth <= 640) return 1;
            if (window.innerWidth <= 1024) return 2;
            return 3;
        }

        function getMaxIndex() {
            const visible = getVisibleCardsCount();
            return Math.max(0, cards.length - visible);
        }

        function renderDots() {
            if (!testimonialDots) return;
            testimonialDots.innerHTML = "";
            const maxIdx = getMaxIndex();
            
            for (let i = 0; i <= maxIdx; i++) {
                const dot = document.createElement("button");
                dot.className = `bigbee-carousel-dot${i === currentIndex ? " active" : ""}`;
                dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
                dot.addEventListener("click", () => goToSlide(i));
                testimonialDots.appendChild(dot);
            }
        }

        function updateCarouselPosition() {
            if (cards.length === 0) return;
            const cardStyle = window.getComputedStyle(cards[0]);
            const cardWidth = cards[0].offsetWidth;
            const cardGap = parseFloat(window.getComputedStyle(testimonialTrack).gap) || 28;
            const moveAmount = (cardWidth + cardGap) * currentIndex;
            
            testimonialTrack.style.transform = `translateX(-${moveAmount}px)`;
            
            // Update Dots
            if (testimonialDots) {
                const dots = Array.from(testimonialDots.children);
                dots.forEach((dot, idx) => {
                    dot.classList.toggle("active", idx === currentIndex);
                });
            }
        }

        function goToSlide(index) {
            const maxIdx = getMaxIndex();
            currentIndex = Math.max(0, Math.min(index, maxIdx));
            updateCarouselPosition();
            resetAutoPlay();
        }

        function nextSlide() {
            const maxIdx = getMaxIndex();
            if (currentIndex >= maxIdx) {
                currentIndex = 0;
            } else {
                currentIndex++;
            }
            updateCarouselPosition();
        }

        function prevSlide() {
            const maxIdx = getMaxIndex();
            if (currentIndex <= 0) {
                currentIndex = maxIdx;
            } else {
                currentIndex--;
            }
            updateCarouselPosition();
        }

        // AutoPlay Functionality (5 seconds interval)
        function startAutoPlay() {
            stopAutoPlay();
            autoPlayTimer = setInterval(() => {
                nextSlide();
            }, 5000);
        }

        function stopAutoPlay() {
            if (autoPlayTimer) clearInterval(autoPlayTimer);
        }

        function resetAutoPlay() {
            stopAutoPlay();
            startAutoPlay();
        }

        if (testimonialNext) {
            testimonialNext.addEventListener("click", () => {
                nextSlide();
                resetAutoPlay();
            });
        }

        if (testimonialPrev) {
            testimonialPrev.addEventListener("click", () => {
                prevSlide();
                resetAutoPlay();
            });
        }

        // Pause autoplay on mouse hover
        testimonialTrack.addEventListener("mouseenter", stopAutoPlay);
        testimonialTrack.addEventListener("mouseleave", startAutoPlay);

        // Touch swipe support for mobile
        let startX = 0;
        let isSwiping = false;

        testimonialTrack.addEventListener("touchstart", (e) => {
            if (e.touches && e.touches.length > 0) {
                startX = e.touches[0].clientX;
                isSwiping = true;
                stopAutoPlay();
            }
        }, { passive: true });

        testimonialTrack.addEventListener("touchend", (e) => {
            if (!isSwiping || !e.changedTouches || e.changedTouches.length === 0) return;
            const endX = e.changedTouches[0].clientX;
            const diffX = startX - endX;

            if (Math.abs(diffX) > 40) {
                if (diffX > 0) {
                    nextSlide();
                } else {
                    prevSlide();
                }
            }
            isSwiping = false;
            startAutoPlay();
        }, { passive: true });

        window.addEventListener("resize", () => {
            const maxIdx = getMaxIndex();
            if (currentIndex > maxIdx) currentIndex = maxIdx;
            renderDots();
            updateCarouselPosition();
        });

        // Initialize Carousel
        renderDots();
        updateCarouselPosition();
        startAutoPlay();
    }

    // --------------------------------------------------------------------------
    // DYNAMIC MOUSE-FOLLOWING SLANTED SPLIT SCREEN (WHAT WE MAKE SECTION)
    // --------------------------------------------------------------------------
    const waysWrapper = document.getElementById("bigbee-ways-interactive");
    const svgLine = document.getElementById("bigbee-way-divider-svg-line");

    if (waysWrapper) {
        let currentSplit = 52;
        let targetSplit = 52;
        let currentMouseX = 0;
        let targetMouseX = 0;
        let currentMouseY = 0;
        let targetMouseY = 0;
        let isHovered = false;
        let animationFrameId = null;

        function updateSvgLine() {
            if (!svgLine) return;
            if (window.innerWidth <= 768) {
                svgLine.setAttribute("x1", "0");
                svgLine.setAttribute("y1", "47.5");
                svgLine.setAttribute("x2", "100");
                svgLine.setAttribute("y2", "51.5");
            } else {
                svgLine.setAttribute("x1", currentSplit);
                svgLine.setAttribute("y1", "0");
                svgLine.setAttribute("x2", currentSplit - 12);
                svgLine.setAttribute("y2", "100");
            }
        }

        function animateSplitLoop() {
            if (window.innerWidth <= 768) {
                updateSvgLine();
                animationFrameId = null;
                return;
            }

            // Smooth lerp easing factor (0.07 for silky fluid tracking)
            currentSplit += (targetSplit - currentSplit) * 0.07;
            waysWrapper.style.setProperty("--split-pos", `${currentSplit}%`);

            // Smooth lerp mouse parallax coordinates for text block movement
            currentMouseX += (targetMouseX - currentMouseX) * 0.07;
            currentMouseY += (targetMouseY - currentMouseY) * 0.07;
            waysWrapper.style.setProperty("--mouse-x", currentMouseX.toFixed(4));
            waysWrapper.style.setProperty("--mouse-y", currentMouseY.toFixed(4));

            // Synchronize SVG line coordinates with exact clip-path polygon
            updateSvgLine();

            if (Math.abs(targetSplit - currentSplit) > 0.04 || Math.abs(targetMouseX - currentMouseX) > 0.001 || isHovered) {
                animationFrameId = requestAnimationFrame(animateSplitLoop);
            } else {
                animationFrameId = null;
            }
        }

        function triggerSplitAnimation() {
            if (!animationFrameId) {
                animationFrameId = requestAnimationFrame(animateSplitLoop);
            }
        }

        // Initialize SVG line position immediately and on window resize
        updateSvgLine();
        window.addEventListener("resize", updateSvgLine);

        waysWrapper.addEventListener("mousemove", (e) => {
            if (window.innerWidth <= 768) return;
            isHovered = true;
            const rect = waysWrapper.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const rawPercentage = (mouseX / rect.width) * 100;

            // When hovering left, left side EXPANDS (targetSplit -> 76%)
            // When hovering right, right side EXPANDS (targetSplit -> 24%)
            const expandedPercentage = 100 - rawPercentage;

            // Clamp split percentage between 24% and 76% for optimal expansion room
            targetSplit = Math.max(24, Math.min(76, expandedPercentage));

            // Calculate normalized mouse offsets (-1 to +1) for text block parallax
            targetMouseX = ((mouseX / rect.width) - 0.5) * 2;
            targetMouseY = ((mouseY / rect.height) - 0.5) * 2;

            triggerSplitAnimation();
        });

        waysWrapper.addEventListener("mouseleave", () => {
            if (window.innerWidth <= 768) return;
            isHovered = false;
            targetSplit = 52; // Return to center 52% default
            targetMouseX = 0;
            targetMouseY = 0;
            triggerSplitAnimation();
        });

        // Touch drag support for tablet (disabled on mobile <= 768px for fixed slanted split)
        waysWrapper.addEventListener("touchmove", (e) => {
            if (window.innerWidth <= 768) return;
            if (e.touches && e.touches.length > 0) {
                const rect = waysWrapper.getBoundingClientRect();
                const touchX = e.touches[0].clientX - rect.left;
                const touchY = e.touches[0].clientY - rect.top;
                const rawPercentage = (touchX / rect.width) * 100;
                targetSplit = Math.max(24, Math.min(76, 100 - rawPercentage));
                targetMouseX = ((touchX / rect.width) - 0.5) * 2;
                targetMouseY = ((touchY / rect.height) - 0.5) * 2;
                triggerSplitAnimation();
            }
        }, { passive: true });
    }

    // --------------------------------------------------------------------------
    // MOUSE-FOLLOWING YELLOW GLOW (CTA SECTION)
    // --------------------------------------------------------------------------
    const ctaCard = document.getElementById("bigbee-cta-card");

    if (ctaCard) {
        let currentGlowX = 80;
        let targetGlowX = 80;
        let currentGlowY = 20;
        let targetGlowY = 20;
        let isGlowHovered = false;
        let ctaAnimFrame = null;

        function animateCtaGlowLoop() {
            // Silky smooth lerp easing factor (0.08)
            currentGlowX += (targetGlowX - currentGlowX) * 0.08;
            currentGlowY += (targetGlowY - currentGlowY) * 0.08;

            ctaCard.style.setProperty("--glow-x", `${currentGlowX.toFixed(2)}%`);
            ctaCard.style.setProperty("--glow-y", `${currentGlowY.toFixed(2)}%`);

            if (Math.abs(targetGlowX - currentGlowX) > 0.05 || Math.abs(targetGlowY - currentGlowY) > 0.05 || isGlowHovered) {
                ctaAnimFrame = requestAnimationFrame(animateCtaGlowLoop);
            } else {
                ctaAnimFrame = null;
            }
        }

        function triggerCtaGlowAnimation() {
            if (!ctaAnimFrame) {
                ctaAnimFrame = requestAnimationFrame(animateCtaGlowLoop);
            }
        }

        ctaCard.addEventListener("mousemove", (e) => {
            isGlowHovered = true;
            const rect = ctaCard.getBoundingClientRect();
            targetGlowX = ((e.clientX - rect.left) / rect.width) * 100;
            targetGlowY = ((e.clientY - rect.top) / rect.height) * 100;
            triggerCtaGlowAnimation();
        });

        ctaCard.addEventListener("mouseleave", () => {
            isGlowHovered = false;
            targetGlowX = 80; // Float back to top-right corner
            targetGlowY = 20;
            triggerCtaGlowAnimation();
        });

        ctaCard.addEventListener("touchmove", (e) => {
            if (e.touches && e.touches.length > 0) {
                const rect = ctaCard.getBoundingClientRect();
                targetGlowX = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
                targetGlowY = ((e.touches[0].clientY - rect.top) / rect.height) * 100;
                triggerCtaGlowAnimation();
            }
        }, { passive: true });
    }

    // --------------------------------------------------------------------------
    // FLOATING DECORATIVE ASSETS (SCROLL ENTRANCE & MOUSE PARALLAX ENGINE)
    // --------------------------------------------------------------------------
    function initFloatingAssets() {
        const wrappers = document.querySelectorAll(".bigbee-floating-asset-wrapper");
        if (!wrappers.length) return;

        wrappers.forEach((wrapper) => {
            wrapper._hasEntered = false;
            const entranceDir = wrapper.getAttribute("data-entrance") || "left";
            // Calculate off-canvas offset based on viewport width
            const offScreenDistance = Math.max(600, window.innerWidth * 0.5);
            const startX = entranceDir === "left" ? -offScreenDistance : offScreenDistance;
            const startRotation = entranceDir === "left" ? -25 : 30;

            // Set initial off-canvas hidden state for entrance animation
            if (typeof gsap !== "undefined") {
                gsap.set(wrapper, {
                    x: startX,
                    opacity: 0,
                    rotation: startRotation
                });
            }

            const parentSection = wrapper.closest("section") || wrapper.parentElement || wrapper;

            // Use IntersectionObserver to guarantee entrance triggers ONLY when the section is physically visible in the viewport
            if ("IntersectionObserver" in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            if (typeof gsap !== "undefined") {
                                gsap.to(wrapper, {
                                    x: 0,
                                    opacity: 1,
                                    rotation: 0,
                                    duration: 1.6,
                                    ease: "power3.out",
                                    onComplete: () => {
                                        wrapper._hasEntered = true;
                                    }
                                });
                            }
                            observer.unobserve(entry.target);
                        }
                    });
                }, {
                    threshold: 0.15,
                    rootMargin: "0px 0px -10% 0px"
                });

                observer.observe(parentSection);
            } else {
                if (typeof gsap !== "undefined") {
                    gsap.to(wrapper, {
                        x: 0,
                        opacity: 1,
                        rotation: 0,
                        duration: 1.6,
                        delay: 0.3,
                        ease: "power3.out",
                        onComplete: () => {
                            wrapper._hasEntered = true;
                        }
                    });
                }
            }
        });

        // Parallax mouse follow movement listener (Only active after entrance completes)
        window.addEventListener("mousemove", (e) => {
            const normalizedX = (e.clientX / window.innerWidth - 0.5);
            const normalizedY = (e.clientY / window.innerHeight - 0.5);

            wrappers.forEach((wrapper) => {
                if (!wrapper._hasEntered) return;

                const speed = parseFloat(wrapper.getAttribute("data-speed")) || 20;
                const targetX = normalizedX * speed;
                const targetY = normalizedY * speed;

                if (typeof gsap !== "undefined") {
                    gsap.to(wrapper, {
                        x: targetX,
                        y: targetY,
                        duration: 0.8,
                        ease: "power1.out",
                        overwrite: "auto"
                    });
                }
            });
        }, { passive: true });
    }

    initFloatingAssets();

    // --------------------------------------------------------------------------
    // MOBILE NAVIGATION DRAWER CONTROLLER
    // --------------------------------------------------------------------------
    // INTERACTIVE JACKET SHOWCASE (JACKET MASTERS)
    // Dynamic background color transitions & product variant switcher
    // --------------------------------------------------------------------------
    function initJacketShowcase() {
        const showcase = document.getElementById("jacket-showcase");
        if (!showcase) return;

        const mainImg = document.getElementById("showcase-main-img");
        const thumbImg = document.getElementById("showcase-thumb-img");
        const priceEl = document.getElementById("showcase-price");
        const swatches = document.querySelectorAll(".bigbee-swatch");
        const sizeBtns = document.querySelectorAll(".bigbee-size-btn");
        const pillBtns = document.querySelectorAll(".bigbee-showcase-pill");
        const prevBtn = document.getElementById("showcase-prev");
        const nextBtn = document.getElementById("showcase-next");

        let activeIndex = 0;

        const categoryEl = document.getElementById("showcase-category");
        const titleEl = document.getElementById("showcase-title");
        const descEl = document.getElementById("showcase-desc");
        const tagsEl = document.getElementById("showcase-tags");

        const variants = [
            {
                theme: "purple",
                category: "Hoodies",
                title: "Streetwear",
                desc: "Heavyweight hoodies and signature oversized fits engineered for high-street fashion labels. Built with premium French terry and custom drop-shoulder cuts.",
                tags: ["Oversized tees", "Cargos", "Jorts", "Denim", "Varsity jackets"],
                imgSrc: "/assets/images/streetwear.png"
            },
            {
                theme: "teal",
                category: "Gym Wear",
                title: "Activewear",
                desc: "Engineered high-performance gym wear crafted with moisture-wicking and 4-way stretch fabrics. Built for durability, flexibility, and athletic motion.",
                tags: ["Leggings", "Compression wear", "Performance apparel"],
                imgSrc: "/assets/images/gym-suit.png"
            },
            {
                theme: "red",
                category: "Team Uniforms American Football",
                title: "Sportswear",
                desc: "Custom athletic jerseys and football team kits manufactured to pro-grade standards. Fully customizable with sublimation, tackle twill, and breathable mesh.",
                tags: ["Jerseys", "Training kits", "Custom sports apparel"],
                imgSrc: "/assets/images/sportswear.png"
            },
            {
                theme: "slate",
                category: "Windbreakers Set",
                title: "Outerwear",
                desc: "All-weather technical windbreakers and heavy-duty bomber jackets. Featuring weather-resistant shells, custom hardware, and micro-fleece insulation.",
                tags: ["Bombers", "Fleece", "Rain jackets"],
                imgSrc: "/assets/images/windbreaker.png"
            },
            {
                theme: "lemon-green",
                category: "Industrial Apparel",
                title: "Workwear",
                desc: "Heavy-duty industrial apparel and corporate uniforms built for extreme durability. Reinforced stitching, utility pocketing, and protective workwear standards.",
                tags: ["Corporate Uniforms", "Utility garments"],
                imgSrc: "/assets/images/workwear.png"
            },
            {
                theme: "espresso",
                category: "Leather Jackets",
                title: "Leather Wear",
                desc: "Luxury faux and genuine leather jackets crafted with precision tailoring. Designed with heavy zippers, custom lining, and rich tactile finishes.",
                tags: ["Pants", "Vests", "Premium faux leather"],
                imgSrc: "/assets/images/leather.png"
            },
            {
                theme: "cyan",
                category: "Bikinis",
                title: "Swimwear",
                desc: "High-grade bikinis and quick-dry rash guards with UV 50+ protection. Chlorine-resistant stretch textiles designed for active beachwear brands.",
                tags: ["Swim Shorts", "Rash guards"],
                imgSrc: "/assets/images/swimsuit.png"
            },
            {
                theme: "yellow",
                category: "Caps",
                title: "Accessories",
                desc: "Complete custom headwear, knit beanies, socks, and custom brand packaging. Elevate your apparel line with bespoke finishing accessories.",
                tags: ["Beanies", "Socks", "Bags", "Labels", "Packaging"],
                imgSrc: "/assets/images/accessories-cap.png"
            },
            {
                theme: "denim",
                category: "Denim Jackets",
                title: "Denim Wear",
                desc: "Custom denim jackets, jeans, shirts, and coordinated sets developed with durable constructions, precision washes, and brand-ready finishing details.",
                tags: ["Denim jackets", "Jeans", "Denim shirts", "Denim sets", "Custom washes"],
                imgSrc: "/assets/images/denim-jacket.png"
            }
        ];

        const showcaseLoader = document.getElementById("showcase-image-loader");
        const showcaseLoaderLabel = document.getElementById("showcase-loader-label");
        let showcaseImagesReady = false;
        let showcasePreloadStarted = false;
        let pendingShowcaseVariant = null;

        function applyPendingShowcaseVariant() {
            if (!showcaseImagesReady || !pendingShowcaseVariant) return;
            if (isAnimating) {
                window.setTimeout(applyPendingShowcaseVariant, 80);
                return;
            }

            const pending = pendingShowcaseVariant;
            pendingShowcaseVariant = null;
            applyVariant(pending.index, pending.direction);
        }

        function preloadShowcaseImages() {
            if (showcasePreloadStarted) return;
            showcasePreloadStarted = true;

            const imageUrls = [...new Set([
                ...variants.map((variant) => variant.imgSrc),
                "/assets/images/hoodie.png"
            ])];
            let settledCount = 0;

            showcase.setAttribute("aria-busy", "true");
            if (showcaseLoader) {
                showcaseLoader.classList.add("is-loading");
                showcaseLoader.setAttribute("aria-hidden", "false");
            }

            const settleImage = () => {
                settledCount += 1;
                if (showcaseLoaderLabel) {
                    showcaseLoaderLabel.textContent = `Loading products ${settledCount}/${imageUrls.length}`;
                }
                if (settledCount < imageUrls.length) return;

                showcaseImagesReady = true;
                showcase.removeAttribute("aria-busy");
                if (showcaseLoaderLabel) showcaseLoaderLabel.textContent = "Products ready";
                window.setTimeout(() => {
                    if (showcaseLoader) {
                        showcaseLoader.classList.remove("is-loading");
                        showcaseLoader.setAttribute("aria-hidden", "true");
                    }
                }, 260);
                applyPendingShowcaseVariant();
            };

            imageUrls.forEach((url) => {
                const image = new Image();
                image.onload = settleImage;
                image.onerror = settleImage;
                image.src = url;
            });
        }

        const bgPulse = document.getElementById("showcase-bg-pulse");
        let isAnimating = false;

        function applyVariant(index, direction = 1) {
            if (isAnimating) return;
            if (index < 0) index = variants.length - 1;
            if (index >= variants.length) index = 0;

            if (!showcaseImagesReady && index !== 0) {
                pendingShowcaseVariant = { index, direction };
                preloadShowcaseImages();
                return;
            }

            isAnimating = true;
            const isReverse = direction < 0;
            const prevVariantIndex = activeIndex;
            const prevVariant = variants[prevVariantIndex];
            activeIndex = index;
            const v = variants[activeIndex];

            // 1. Smooth Fade-In/Fade-Out Section Background Transition
            showcase.setAttribute("data-theme", v.theme);

            if (!window.gsap) {
                if (categoryEl) categoryEl.textContent = v.category;
                if (titleEl) titleEl.innerHTML = v.title;
                if (descEl) descEl.textContent = v.desc;
                if (tagsEl && Array.isArray(v.tags)) {
                    tagsEl.innerHTML = v.tags.map(t => `<span class="bigbee-showcase-tag">${t}</span>`).join("");
                }
                if (mainImg) {
                    mainImg.src = v.imgSrc;
                    mainImg.alt = `${v.title} Showcase`;
                }
                isAnimating = false;
                return;
            }

            // Create floating clone of outgoing hoodie for SIMULTANEOUS motion
            let clone = null;
            if (mainImg && mainImg.parentElement) {
                clone = mainImg.cloneNode(true);
                clone.id = "showcase-main-img-clone";
                clone.style.position = "absolute";
                clone.style.top = "0";
                clone.style.left = "0";
                clone.style.width = "100%";
                clone.style.height = "100%";
                clone.style.pointerEvents = "none";
                clone.style.zIndex = "10";
                mainImg.parentElement.appendChild(clone);
            }

            // Immediately set mainImg to the NEW variant image
            if (mainImg) {
                mainImg.src = v.imgSrc;
                mainImg.alt = `${v.title} Showcase`;
                mainImg.onerror = () => {
                    mainImg.src = "/assets/images/hoodie.png";
                };
            }

            // Master GSAP Timeline
            const tl = gsap.timeline({
                onComplete: () => {
                    if (clone && clone.parentElement) {
                        clone.parentElement.removeChild(clone);
                    }
                    isAnimating = false;
                }
            });

            const shadowEl = document.getElementById("showcase-main-shadow");

            if (window.innerWidth <= 1024) {
                // MOBILE & TABLET (<= 1024px): Simple horizontal left-to-right slide
                const slideOffset = 220;

                if (!isReverse) {
                    // FORWARD MOTION (Next product):
                    if (clone) {
                        tl.to(clone, {
                            x: -slideOffset,
                            y: 0,
                            opacity: 0,
                            duration: 0.55,
                            ease: "power2.inOut"
                        }, 0);
                    }

                    if (mainImg) {
                        tl.fromTo(mainImg, 
                            { x: slideOffset, y: 0, opacity: 0 },
                            { x: 0, y: 0, opacity: 1, duration: 0.55, ease: "power3.out" },
                            0
                        );
                    }
                } else {
                    // REVERSE MOTION (Prev product):
                    if (clone) {
                        tl.to(clone, {
                            x: slideOffset,
                            y: 0,
                            opacity: 0,
                            duration: 0.55,
                            ease: "power2.inOut"
                        }, 0);
                    }

                    if (mainImg) {
                        tl.fromTo(mainImg, 
                            { x: -slideOffset, y: 0, opacity: 0 },
                            { x: 0, y: 0, opacity: 1, duration: 0.55, ease: "power3.out" },
                            0
                        );
                    }
                }
            } else {
                // DESKTOP (> 1024px): Floating clone trajectory animation (mainImg <-> thumbnail card / top-left)
                let targetX = 360;
                let targetY = 240;
                const thumbCard = document.getElementById("showcase-thumb-card");
                if (mainImg && thumbCard) {
                    const mainRect = mainImg.getBoundingClientRect();
                    const thumbRect = thumbCard.getBoundingClientRect();
                    if (mainRect.width > 0 && thumbRect.width > 0) {
                        targetX = (thumbRect.left + thumbRect.width / 2) - (mainRect.left + mainRect.width / 2);
                        targetY = (thumbRect.top + thumbRect.height / 2) - (mainRect.top + mainRect.height / 2);
                    }
                }

                const startTopLeftX = -Math.max(window.innerWidth * 0.35, 340);
                const startTopLeftY = -Math.max(window.innerHeight * 0.35, 260);

                if (!isReverse) {
                    // FORWARD MOTION:
                    if (clone) {
                        tl.to(clone, {
                            x: targetX,
                            y: targetY,
                            scale: 0.22,
                            opacity: 0,
                            duration: 0.72,
                            ease: "power2.inOut"
                        }, 0);
                    }

                    if (mainImg) {
                        tl.fromTo(mainImg, 
                            { x: startTopLeftX, y: startTopLeftY, scale: 0.25, opacity: 0 },
                            { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.72, ease: "power3.out" },
                            0
                        );
                    }
                } else {
                    // REVERSE MOTION:
                    if (clone) {
                        tl.to(clone, {
                            x: startTopLeftX,
                            y: startTopLeftY,
                            scale: 0.25,
                            opacity: 0,
                            duration: 0.72,
                            ease: "power2.inOut"
                        }, 0);
                    }

                    if (mainImg) {
                        tl.fromTo(mainImg, 
                            { x: targetX, y: targetY, scale: 0.22, opacity: 0 },
                            { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.72, ease: "power3.out" },
                            0
                        );
                    }
                }
            }

            // Animate Drop Shadow Synchronized with Product Motion
            if (shadowEl) {
                tl.to(shadowEl, {
                    scaleX: 0.25,
                    scaleY: 0.25,
                    opacity: 0,
                    duration: 0.3,
                    ease: "power2.in",
                    onComplete: () => {
                        gsap.fromTo(shadowEl,
                            { scaleX: 0.25, scaleY: 0.25, opacity: 0 },
                            { scaleX: 1, scaleY: 1, opacity: 1, duration: 0.5, ease: "power3.out" }
                        );
                    }
                }, 0);
            }

            // Title, Category & Description Slide & Fade Stagger
            const textTargetEls = [categoryEl, titleEl, descEl, tagsEl].filter(Boolean);
            if (textTargetEls.length > 0) {
                tl.to(textTargetEls, {
                    y: isReverse ? 15 : -15,
                    opacity: 0,
                    duration: 0.25,
                    stagger: 0.04,
                    ease: "power2.in",
                    onComplete: () => {
                        if (categoryEl) categoryEl.textContent = v.category;
                        if (titleEl) titleEl.innerHTML = v.title;
                        if (descEl) descEl.textContent = v.desc;
                        if (tagsEl && Array.isArray(v.tags)) {
                            tagsEl.innerHTML = v.tags.map(t => `<span class="bigbee-showcase-tag">${t}</span>`).join("");
                        }
                        gsap.fromTo(textTargetEls,
                            { y: isReverse ? -20 : 20, opacity: 0 },
                            { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: "power3.out" }
                        );
                    }
                }, 0);
            }

            // Thumbnail image update & card pop as outgoing hoodie arrives
            tl.add(() => {
                if (thumbImg) {
                    const nextThumbVariant = isReverse 
                        ? variants[(activeIndex - 1 + variants.length) % variants.length]
                        : prevVariant;
                    thumbImg.src = nextThumbVariant.imgSrc;
                    thumbImg.onerror = () => {
                        thumbImg.src = "/assets/images/hoodie.png";
                    };
                }
            }, 0.35);

            if (thumbCard) {
                tl.fromTo(thumbCard,
                    { scale: 0.85, opacity: 0.7 },
                    { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.4)" },
                    0.4
                );
            }
        }

        // Auto-scroll Timer Logic (Disabled)
        function startAutoScroll() {
            // Disabled
        }

        function stopAutoScroll() {
            // Disabled
        }

        // Click on prev / next buttons
        if (prevBtn) {
            prevBtn.addEventListener("click", () => {
                applyVariant(activeIndex - 1, -1);
                startAutoScroll();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                applyVariant(activeIndex + 1, 1);
                startAutoScroll();
            });
        }

        // Clicking the thumbnail card returns to the previous product
        const thumbCard = document.getElementById("showcase-thumb-card");
        if (thumbCard) {
            thumbCard.style.cursor = "pointer";
            thumbCard.addEventListener("click", () => {
                applyVariant(activeIndex - 1, -1);
                startAutoScroll();
            });
        }

        // Touch Swipe Gesture Support for Mobile & Tablet
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        const SWIPE_THRESHOLD = 35; // minimum horizontal swipe distance in pixels

        if (showcase) {
            showcase.addEventListener("touchstart", (e) => {
                if (e.touches && e.touches.length === 1) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                }
            }, { passive: true });

            showcase.addEventListener("touchend", (e) => {
                if (e.changedTouches && e.changedTouches.length === 1) {
                    touchEndX = e.changedTouches[0].clientX;
                    touchEndY = e.changedTouches[0].clientY;

                    const diffX = touchEndX - touchStartX;
                    const diffY = touchEndY - touchStartY;

                    // Trigger horizontal swipe if horizontal displacement is greater than vertical displacement
                    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) >= SWIPE_THRESHOLD) {
                        if (diffX < 0) {
                            // Swiped Left -> Advance to Next Product
                            applyVariant(activeIndex + 1, 1);
                            startAutoScroll();
                        } else {
                            // Swiped Right -> Return to Previous Product
                            applyVariant(activeIndex - 1, -1);
                            startAutoScroll();
                        }
                    }
                }
            }, { passive: true });
        }

        // Initial setup
        applyVariant(0, 1);

        const scrollToShowcaseVariant = (index) => {
            const targetEl = document.getElementById("jacket-showcase");
            if (!targetEl) return;
            if (lenis) {
                lenis.scrollTo(targetEl, { offset: -80, duration: 1.2 });
            } else {
                window.scrollTo({
                    top: Math.max(0, getElementDocTop(targetEl) - 80),
                    behavior: "smooth"
                });
            }
            applyVariant(index, 1);
        };

        // Mega menu and sub-menu expertise links interaction to change active product variant
        const expertiseLinks = document.querySelectorAll(".bigbee-expertise-link");
        expertiseLinks.forEach((link) => {
            link.addEventListener("click", (e) => {
                const href = link.getAttribute("href");
                if (href && href !== "#jacket-showcase") return;
                const index = parseInt(link.getAttribute("data-index"));
                if (!isNaN(index)) {
                    e.preventDefault();
                    scrollToShowcaseVariant(index);
                }
            });
        });

        const mobileExpertiseLinks = document.querySelectorAll(".bigbee-mobile-expertise-link");
        mobileExpertiseLinks.forEach((link) => {
            link.addEventListener("click", (e) => {
                const href = link.getAttribute("href");
                if (href && href !== "#jacket-showcase") return;
                const index = parseInt(link.getAttribute("data-index"));
                if (!isNaN(index)) {
                    e.preventDefault();
                    const drawer = document.getElementById("bigbee-mobile-drawer");
                    const hamburger = document.getElementById("bigbee-hamburger");
                    if (drawer && hamburger) {
                        drawer.classList.remove("is-open");
                        hamburger.classList.remove("open");
                        drawer.setAttribute("aria-hidden", "true");
                        document.body.style.overflow = "";
                    }
                    scrollToShowcaseVariant(index);
                }
            });
        });

        if ("IntersectionObserver" in window) {
            const showcasePreloadObserver = new IntersectionObserver((entries, observer) => {
                if (!entries.some((entry) => entry.isIntersecting)) return;
                observer.disconnect();
                preloadShowcaseImages();
            }, { rootMargin: "900px 0px" });
            showcasePreloadObserver.observe(showcase);
        } else {
            window.setTimeout(preloadShowcaseImages, 1200);
        }
    }

    initJacketShowcase();

    // --------------------------------------------------------------------------
    function initMobileMenu() {
        const hamburger = document.getElementById("bigbee-hamburger");
        const drawer = document.getElementById("bigbee-mobile-drawer");
        const closeBtn = document.getElementById("bigbee-drawer-close");
        const overlay = document.getElementById("bigbee-drawer-overlay");
        const mobileLinks = document.querySelectorAll(".bigbee-mobile-nav__link");

        if (!hamburger || !drawer) return;

        function openDrawer() {
            drawer.classList.add("is-open");
            hamburger.classList.add("open");
            drawer.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
        }

        function closeDrawer() {
            drawer.classList.remove("is-open");
            hamburger.classList.remove("open");
            drawer.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
        }

        hamburger.addEventListener("click", () => {
            if (drawer.classList.contains("is-open")) {
                closeDrawer();
            } else {
                openDrawer();
            }
        });

        if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
        if (overlay) overlay.addEventListener("click", closeDrawer);

        mobileLinks.forEach((link) => {
            link.addEventListener("click", (e) => {
                // If link has a subnav toggle, don't close drawer unless user clicks an actual sublink or direct link
                const item = link.closest(".bigbee-mobile-nav__item--has-sub");
                if (!item) {
                    closeDrawer();
                }
            });
        });

        // Submenu accordion toggles
        const subToggles = document.querySelectorAll(".bigbee-mobile-nav__toggle");
        subToggles.forEach((toggle) => {
            toggle.addEventListener("click", (e) => {
                e.stopPropagation();
                const parentItem = toggle.closest(".bigbee-mobile-nav__item--has-sub");
                if (parentItem) {
                    parentItem.classList.toggle("is-expanded");
                }
            });
        });

        // Close drawer on clicking subnav links
        const subLinks = document.querySelectorAll(".bigbee-mobile-subnav__link");
        subLinks.forEach((subLink) => {
            subLink.addEventListener("click", closeDrawer);
        });

        // Close on Escape key
        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && drawer.classList.contains("is-open")) {
                closeDrawer();
            }
        });
    }

    // --------------------------------------------------------------------------
    // HERO BACKGROUND HOVER REVEAL & TEXT SPOTLIGHT EFFECTS
    // --------------------------------------------------------------------------
    function initHeroHoverReveal() {
        const hero = document.getElementById("bigbee-hero");
        const overlay = document.querySelector(".bigbee-hero__hover-overlay");
        const cutSewText = document.querySelector(".bigbee-hero__title-line--bold");
        if (!hero || !overlay) return;

        // Background mask variables
        let currentX = 0;
        let targetX = 0;
        let currentY = 0;
        let targetY = 0;
        let currentRadius = 0;
        let targetRadius = 0;

        // Title text spotlight variables
        let currentGlowX = 50;
        let targetGlowX = 50;
        let currentGlowY = 50;
        let targetGlowY = 50;
        let currentGlowRadius = 0;
        let targetGlowRadius = 140;

        let isHovered = false;
        let circleEffectIsAttached = true;
        let animFrame = null;

        detachScene0HeroCircleEffect = () => {
            circleEffectIsAttached = false;
            isHovered = false;
            currentRadius = 0;
            targetRadius = 0;
            currentGlowX = 50;
            targetGlowX = 50;
            currentGlowY = 50;
            targetGlowY = 50;
            currentGlowRadius = 0;
            targetGlowRadius = 0;
            hero.classList.add("is-circle-effect-detached");
            overlay.style.setProperty("--hover-radius", "0px");
            if (cutSewText) {
                cutSewText.style.setProperty("--mouse-x", "50%");
                cutSewText.style.setProperty("--mouse-y", "50%");
                cutSewText.style.setProperty("--spotlight-radius", "0px");
            }
        };

        attachScene0HeroCircleEffect = () => {
            circleEffectIsAttached = true;
            currentGlowRadius = 0;
            targetGlowRadius = 140;
            hero.classList.remove("is-circle-effect-detached");
        };

        function animateLoop() {
            if (!circleEffectIsAttached) {
                animFrame = requestAnimationFrame(animateLoop);
                return;
            }
            // Smooth LERP (0.08) for background coordinates
            currentX += (targetX - currentX) * 0.08;
            currentY += (targetY - currentY) * 0.08;
            currentRadius += (targetRadius - currentRadius) * 0.08;

            overlay.style.setProperty("--hover-x", `${currentX.toFixed(1)}px`);
            overlay.style.setProperty("--hover-y", `${currentY.toFixed(1)}px`);
            overlay.style.setProperty("--hover-radius", `${currentRadius.toFixed(1)}px`);

            // White text spotlight calculations
            if (cutSewText) {
                if (isHovered) {
                    const textRect = cutSewText.getBoundingClientRect();
                    const heroRect = hero.getBoundingClientRect();
                    const relMouseX = (currentX + heroRect.left) - textRect.left;
                    const relMouseY = (currentY + heroRect.top) - textRect.top;
                    targetGlowX = (relMouseX / textRect.width) * 100;
                    targetGlowY = (relMouseY / textRect.height) * 100;
                    targetGlowRadius = 140;
                } else {
                    targetGlowX = 50 + Math.sin(Date.now() * 0.001) * 45;
                    targetGlowY = 50 + Math.cos(Date.now() * 0.0017) * 45;
                    targetGlowRadius = 140;
                }

                currentGlowX += (targetGlowX - currentGlowX) * 0.05;
                currentGlowY += (targetGlowY - currentGlowY) * 0.05;
                currentGlowRadius += (targetGlowRadius - currentGlowRadius) * 0.05;

                cutSewText.style.setProperty("--mouse-x", `${currentGlowX.toFixed(2)}%`);
                cutSewText.style.setProperty("--mouse-y", `${currentGlowY.toFixed(2)}%`);
                cutSewText.style.setProperty("--spotlight-radius", `${currentGlowRadius.toFixed(1)}px`);
            }

            animFrame = requestAnimationFrame(animateLoop);
        }

        animFrame = requestAnimationFrame(animateLoop);

        hero.addEventListener("mousemove", (e) => {
            if (!circleEffectIsAttached) return;
            isHovered = true;
            const rect = hero.getBoundingClientRect();
            targetX = e.clientX - rect.left;
            targetY = e.clientY - rect.top;
            targetRadius = 220;
        });

        hero.addEventListener("mouseleave", () => {
            if (!circleEffectIsAttached) return;
            isHovered = false;
            targetRadius = 0;
        });

        hero.addEventListener("touchmove", (e) => {
            if (!circleEffectIsAttached) return;
            if (e.touches && e.touches.length > 0) {
                isHovered = true;
                const rect = hero.getBoundingClientRect();
                targetX = e.touches[0].clientX - rect.left;
                targetY = e.touches[0].clientY - rect.top;
                targetRadius = 220;
            }
        }, { passive: true });

        hero.addEventListener("touchend", () => {
            if (!circleEffectIsAttached) return;
            isHovered = false;
            targetRadius = 0;
        });
    }

    if (!mobileStaticHomepage) initHeroHoverReveal();

    initMobileMenu();

    if (skipHomepageIntro && mobileStaticHomepage) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (lenis) {
                    lenis.scrollTo(0, { immediate: true, force: true });
                }
                window.scrollTo(0, 0);
                homepageContentEntryReady = true;
                document.documentElement.classList.remove("bigbee-homepage--content-entry");
                document.body.classList.remove("bigbee-home-content-entry");
                document.getElementById("bigbee-header")?.classList.remove("scrolled");
                if (typeof handleHeaderScroll === "function") handleHeaderScroll();
                history.replaceState(history.state, "", window.location.pathname);
            });
        });
    } else if (skipHomepageIntro) {
        const aboutSection = document.getElementById("about-bigbee");
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const targetTop = aboutSection ? getElementDocTop(aboutSection) : 0;
                if (lenis) {
                    lenis.scrollTo(targetTop, { immediate: true, force: true });
                }
                window.scrollTo(0, targetTop);
                document.getElementById("bigbee-header")?.classList.add("scrolled");

                if (typeof window.preloadScene === "function") {
                    const finalizeContentEntry = () => {
                        // Defensive cleanup for the legacy Scene 1 title handoff.
                        // Content-entry mode never uses Scene 1, so no fixed
                        // headline clone should survive over regular content.
                        removeScene1PinnedTitle(true);

                        if (typeof restoreScene6FinalState === "function") {
                            restoreScene6FinalState();
                        }
                        scene6ContentHandoffIsActive = true;
                        homepageContentEntryReady = true;
                        setContentEntryPreloadStatus("ready");

                        // Keep an untouched content-entry visit anchored to the
                        // About section after the hidden hero becomes ready. If
                        // the visitor already scrolled down, preserve their new
                        // position instead of pulling them back.
                        if (!homepageContentEntryUserScrolled && aboutSection) {
                            const settledTargetTop = getElementDocTop(aboutSection);
                            if (lenis) {
                                lenis.scrollTo(settledTargetTop, { immediate: true, force: true });
                            }
                            window.scrollTo(0, settledTargetTop);
                        }

                        document.documentElement.classList.add("bigbee-homepage--content-entry-ready");
                        if (typeof handleHeaderScroll === "function") handleHeaderScroll();

                        requestAnimationFrame(() => {
                            if (!homepageContentEntryUserScrolled && aboutSection) {
                                const settledTargetTop = getElementDocTop(aboutSection);
                                if (lenis) {
                                    lenis.scrollTo(settledTargetTop, { immediate: true, force: true });
                                }
                                window.scrollTo(0, settledTargetTop);
                            }

                            history.replaceState(history.state, "", window.location.pathname);

                            if (
                                homepageContentEntryReverseQueued
                                && typeof returnContentToScene6 === "function"
                                && aboutSection
                                && window.scrollY <= getElementDocTop(aboutSection) + 8
                            ) {
                                homepageContentEntryReverseQueued = false;
                                returnContentToScene6();
                            }
                        });
                    };

                    // A reverse visit can travel from Scene 6 all the way back
                    // to Scene 0. Do not reveal/enable that path until every
                    // active frame sequence is available, otherwise a quick
                    // reverse can arrive at an unloaded, blank canvas.
                    const preloadReverseSequence = (sceneNumber) => {
                        if (sceneNumber < 2) {
                            finalizeContentEntry();
                            return;
                        }
                        window.preloadScene(sceneNumber, () => preloadReverseSequence(sceneNumber - 1));
                    };

                    preloadReverseSequence(6);
                } else {
                    scene6ContentHandoffIsActive = true;
                    homepageContentEntryReady = true;
                    document.documentElement.classList.add("bigbee-homepage--content-entry-ready");
                    history.replaceState(history.state, "", window.location.pathname);
                }
            });
        });
    } else {
        // The full-page loader owns the complete desktop hero-frame queue.
        // Below-the-fold sections use natural/lazy loading or local loaders.
        initSitePreloader();
    }
};

/**
 * Scroll-triggered fade/slide-in reveal for every non-homepage page
 * (bigbee-streetwear-page and bigbee-bespoke-page templates). The homepage
 * keeps its own bespoke scene-animation engine untouched (see
 * HOMEPAGE_HANDOFF.md) and is skipped entirely by the class check below.
 *
 * No hardcoded per-page selectors: it walks each page's <main> once and
 * auto-tags elements using the site's existing BEM-ish naming conventions
 * (repeated "*-card"/"*-item"/"*-grid" siblings get a staggered fade-up,
 * "*__copy"/"*__content" text blocks stagger line by line, and two/three
 * panel "media | copy" layouts alternate a left/right slide). This lets new
 * pages that follow the same conventions pick up the effect automatically.
 */
function initScrollReveal() {
    const isRevealPage = document.body.classList.contains("bigbee-streetwear-page") || document.body.classList.contains("bigbee-bespoke-page");
    if (!isRevealPage) return;

    const main = document.querySelector("main.bigbee-main");
    if (!main) return;

    // Elements/components with their own JS-driven positioning or motion —
    // never touch these with an added transform (carousel track, filterable
    // tech grid + lightbox, before/after compare slider, sticky solution media).
    const EXCLUDE_SELECTOR = ".streetwear-latest-work__track, .bigbee-carousel-dots, #techGrid, #techLightbox, .compare, .solution-block__media, .solution-block__media-inner";
    const SKIP_TAGS = new Set(["SVG", "PATH", "CIRCLE", "RECT", "LINE", "POLYGON", "POLYLINE", "G", "DEFS", "LINEARGRADIENT", "STOP", "BUTTON", "INPUT", "TEXTAREA", "SELECT", "LABEL", "SCRIPT", "STYLE"]);
    const isExcluded = (el) => SKIP_TAGS.has(el.tagName) || el.closest(EXCLUDE_SELECTOR) !== null || el.closest("svg") !== null;

    // .solution-block sections wrap a position:sticky media panel; giving the
    // section itself a transform (even via a descendant-safe reveal) creates a
    // new containing block and silently breaks that child's stickiness — the
    // exact fragile pattern documented in CLAUDE.md. Never tag the section
    // itself, only its non-sticky content side (handled by Tier 2/3 below).
    const NEVER_TAG_SELF_SELECTOR = ".solution-block";

    const tagged = new Set();
    const tag = (el, dirClass, index) => {
        if (!el || tagged.has(el) || isExcluded(el) || el.matches(NEVER_TAG_SELF_SELECTOR)) return;
        el.classList.add("bb-reveal");
        if (dirClass) el.classList.add(dirClass);
        el.style.setProperty("--bb-reveal-i", String(Math.min(index, 6)));
        tagged.add(el);
    };

    // Tier 1 — repeated-sibling groups: cards, grid/list items, tag pills,
    // timeline steps, testimonial cards, paragraphs in a copy block, etc.
    // Detected generically (same tag + same first class, 2-14 siblings).
    main.querySelectorAll("*").forEach((parent) => {
        if (isExcluded(parent)) return;
        const children = Array.from(parent.children).filter((c) => !isExcluded(c));
        if (children.length < 2) return;
        const buckets = new Map();
        children.forEach((c) => {
            const firstClass = (c.getAttribute("class") || "").trim().split(/\s+/)[0] || "";
            const key = c.tagName + "." + firstClass;
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key).push(c);
        });
        buckets.forEach((items) => {
            if (items.length >= 2 && items.length <= 14) {
                items.forEach((el, i) => tag(el, null, i));
            }
        });
    });

    // Tier 2 — "copy"/"content" text wrappers: stagger each child in
    // reading order (eyebrow, heading, paragraph, CTA...).
    main.querySelectorAll('[class*="__copy"], [class*="-copy"], [class*="__content"]').forEach((wrap) => {
        if (isExcluded(wrap) || tagged.has(wrap)) return;
        Array.from(wrap.children).forEach((child, i) => tag(child, null, i));
    });

    // Tier 3 — two/three panel "media | copy" split layouts: alternate a
    // slide-in from left (first panel) and right (last panel).
    main.querySelectorAll('section, [class*="container"], [class*="__grid"], [class*="__inner"]').forEach((parent) => {
        if (isExcluded(parent)) return;
        const children = Array.from(parent.children).filter((c) => !isExcluded(c) && !tagged.has(c));
        if (children.length < 2 || children.length > 3) return;
        children.forEach((el, i) => {
            const dir = i === 0 ? "bb-reveal--left" : i === children.length - 1 ? "bb-reveal--right" : null;
            tag(el, dir, 0);
        });
    });

    // Tier 4 — standalone headings/media/cards not caught above.
    main.querySelectorAll('h1, h2, h3, .eyebrow, [class*="__media"], [class*="__visual"], [class*="-image"], [class*="-card"], [class*="__card"], [class*="-badge"]').forEach((el) => {
        tag(el, null, 0);
    });

    const targets = Array.from(tagged);
    if (!targets.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
        targets.forEach((el) => el.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

    targets.forEach((el) => observer.observe(el));
}

/**
 * Scroll-spy for the sticky capability navigation bar on
 * manufacturing-solutions.html (#mse-nav). No-ops on every other page since
 * that id doesn't exist elsewhere.
 */
function initCapabilityNav() {
    const nav = document.getElementById("mse-nav");
    if (!nav) return;

    const links = Array.from(nav.querySelectorAll(".mse-nav__item"));
    const sections = links
        .map((link) => document.querySelector(link.getAttribute("href")))
        .filter(Boolean);
    if (!sections.length || !("IntersectionObserver" in window)) return;

    const setActive = (id) => {
        links.forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`));
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) setActive(entry.target.id);
        });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });

    sections.forEach((section) => observer.observe(section));
}

/**
 * Cursor-following glow and process-tile highlights for the Bulk Production
 * chapter on manufacturing-solutions.html. No-ops on every other page.
 */
function initMseBulkInteractions() {
    const section = document.getElementById("mse-03");
    const system = section?.querySelector(".mse-system");
    if (!section || !system || !window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let currentX = 76;
    let currentY = 22;
    let targetX = 76;
    let targetY = 22;
    let hovered = false;
    let frame = null;

    const animateGlow = () => {
        currentX += (targetX - currentX) * .08;
        currentY += (targetY - currentY) * .08;
        section.style.setProperty("--mse-glow-x", `${currentX.toFixed(2)}%`);
        section.style.setProperty("--mse-glow-y", `${currentY.toFixed(2)}%`);

        if (hovered || Math.abs(targetX - currentX) > .05 || Math.abs(targetY - currentY) > .05) frame = requestAnimationFrame(animateGlow);
        else frame = null;
    };

    const startGlow = () => {
        if (!frame) frame = requestAnimationFrame(animateGlow);
    };

    section.addEventListener("pointermove", (event) => {
        const rect = section.getBoundingClientRect();
        hovered = true;
        targetX = ((event.clientX - rect.left) / rect.width) * 100;
        targetY = ((event.clientY - rect.top) / rect.height) * 100;
        section.classList.add("is-pointer-active");
        startGlow();
    });

    section.addEventListener("pointerleave", () => {
        hovered = false;
        targetX = 76;
        targetY = 22;
        section.classList.remove("is-pointer-active");
        startGlow();
    });

    system.querySelectorAll(".mse-system__item").forEach((item) => {
        item.addEventListener("pointermove", (event) => {
            const rect = item.getBoundingClientRect();
            item.style.setProperty("--mse-item-x", `${event.clientX - rect.left}px`);
            item.style.setProperty("--mse-item-y", `${event.clientY - rect.top}px`);
        });
    });
}

/**
 * Cursor-following glow and local column highlights for the Our Ethics
 * section on about-us.html. No-ops on every other page.
 */
function initAuEthicsInteractions() {
    const section = document.querySelector(".au-ethics");
    const grid = section?.querySelector(".au-ethics__grid");
    if (!section || !grid || !window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let currentX = 76;
    let currentY = 22;
    let targetX = 76;
    let targetY = 22;
    let hovered = false;
    let frame = null;

    const animateGlow = () => {
        currentX += (targetX - currentX) * .08;
        currentY += (targetY - currentY) * .08;
        section.style.setProperty("--au-ethics-glow-x", `${currentX.toFixed(2)}%`);
        section.style.setProperty("--au-ethics-glow-y", `${currentY.toFixed(2)}%`);

        if (hovered || Math.abs(targetX - currentX) > .05 || Math.abs(targetY - currentY) > .05) frame = requestAnimationFrame(animateGlow);
        else frame = null;
    };

    const startGlow = () => {
        if (!frame) frame = requestAnimationFrame(animateGlow);
    };

    section.addEventListener("pointermove", (event) => {
        const rect = section.getBoundingClientRect();
        hovered = true;
        targetX = ((event.clientX - rect.left) / rect.width) * 100;
        targetY = ((event.clientY - rect.top) / rect.height) * 100;
        section.classList.add("is-pointer-active");
        startGlow();
    });

    section.addEventListener("pointerleave", () => {
        hovered = false;
        targetX = 76;
        targetY = 22;
        section.classList.remove("is-pointer-active");
        startGlow();
    });

    grid.querySelectorAll(".au-ethics__col").forEach((column) => {
        column.addEventListener("pointermove", (event) => {
            const rect = column.getBoundingClientRect();
            column.style.setProperty("--au-ethics-item-x", `${event.clientX - rect.left}px`);
            column.style.setProperty("--au-ethics-item-y", `${event.clientY - rect.top}px`);
        });
    });
}

function initFixedFooterSpacer() {
    const mainElem = document.querySelector("main.bigbee-main");
    const footerElem = document.getElementById("footer");
    if (!mainElem || !footerElem) return;

    function updateFooterSpacer() {
        const footerHeight = footerElem.offsetHeight;
        mainElem.style.marginBottom = `${footerHeight}px`;
        if (window.ScrollTrigger) {
            ScrollTrigger.refresh();
        }
    }

    updateFooterSpacer();
    window.addEventListener("resize", updateFooterSpacer);
}

function initGlobalCursor() {
    if (!window.matchMedia("(pointer: fine)").matches || document.querySelector(".bigbee-cursor-follower")) return;

    const cursor = document.createElement("div");
    cursor.className = "bigbee-cursor-follower is-hidden";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = "<span></span>";
    document.body.appendChild(cursor);

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let pointerVisible = false;

    const pointIsInsideHero = (x, y) => {
        const heroes = document.querySelectorAll(".bigbee-hero, #bespokeCompare");
        return Array.from(heroes).some((hero) => {
            const rect = hero.getBoundingClientRect();
            return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        });
    };

    const updateVisibility = (target) => {
        const isInteractive = target && target.closest("a, button, input, textarea, select, label, [role='button'], [data-cursor-hide]");
        const shouldHide = !pointerVisible || Boolean(isInteractive) || pointIsInsideHero(targetX, targetY);
        cursor.classList.toggle("is-hidden", shouldHide);
    };

    document.addEventListener("pointermove", (event) => {
        if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
        targetX = event.clientX;
        targetY = event.clientY;
        pointerVisible = true;
        updateVisibility(event.target);
    }, { passive: true });

    document.addEventListener("pointerdown", () => cursor.classList.add("is-pressed"));
    document.addEventListener("pointerup", () => cursor.classList.remove("is-pressed"));
    document.addEventListener("pointercancel", () => cursor.classList.remove("is-pressed"));
    document.addEventListener("mouseout", (event) => {
        if (!event.relatedTarget) {
            pointerVisible = false;
            cursor.classList.add("is-hidden");
        }
    });

    window.addEventListener("scroll", () => {
        if (!pointerVisible) return;
        updateVisibility(document.elementFromPoint(targetX, targetY));
    }, { passive: true });

    const animateCursor = () => {
        currentX += (targetX - currentX) * 0.16;
        currentY += (targetY - currentY) * 0.16;
        cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        requestAnimationFrame(animateCursor);
    };

    requestAnimationFrame(animateCursor);
}

function initBespokePage() {
    const header=document.querySelector('#bigbee-header');
    header.classList.add('scrolled');

    const hamburger=document.querySelector('#bigbee-hamburger');
    const drawer=document.querySelector('#bigbee-mobile-drawer');
    const closeButton=document.querySelector('#bigbee-drawer-close');
    const drawerOverlay=document.querySelector('#bigbee-drawer-overlay');
    const openDrawer=()=>{drawer.classList.add('is-open');hamburger.classList.add('open');drawer.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'};
    const closeDrawer=()=>{drawer.classList.remove('is-open');hamburger.classList.remove('open');drawer.setAttribute('aria-hidden','true');document.body.style.overflow=''};
    if(hamburger&&drawer){
      hamburger.addEventListener('click',()=>drawer.classList.contains('is-open')?closeDrawer():openDrawer());
      closeButton?.addEventListener('click',closeDrawer);
      drawerOverlay?.addEventListener('click',closeDrawer);
      document.querySelectorAll('.bigbee-mobile-nav__link:not(.bigbee-mobile-nav__item--has-sub .bigbee-mobile-nav__link),.bigbee-mobile-subnav__link').forEach(link=>link.addEventListener('click',closeDrawer));
      document.querySelectorAll('.bigbee-mobile-nav__toggle').forEach(toggle=>toggle.addEventListener('click',event=>{event.stopPropagation();toggle.closest('.bigbee-mobile-nav__item--has-sub')?.classList.toggle('is-expanded')}));
      addEventListener('keydown',event=>{if(event.key==='Escape'&&drawer.classList.contains('is-open'))closeDrawer()});
    }
    const techniques=[
      {name:'Screen Printing',category:'prints',image:'/assets/images/bespoke-embalishment/screen-printing.jpg'},
      {name:'DTG Printing',category:'prints',image:'/assets/images/bespoke-embalishment/dtg-printing.jpg'},
      {name:'DTF Printing',category:'prints',image:'/assets/images/bespoke-embalishment/dtf-printing.jpg'},
      {name:'Sublimation Printing',category:'prints',image:'/assets/images/bespoke-embalishment/sublimation-printing.jpg'},
      {name:'Puff Printing',category:'prints',image:'/assets/images/bespoke-embalishment/puff-printing.jpg'},
      {name:'High Density Print',category:'prints',image:'/assets/images/bespoke-embalishment/high-density-print.jpg'},
      {name:'Glitter Print',category:'prints',image:'/assets/images/bespoke-embalishment/glitter-print.jpg'},
      {name:'Reflective Printing',category:'prints',image:'/assets/images/bespoke-embalishment/reflective-printing.jpg'},
      {name:'Silicone Printing',category:'prints',image:'/assets/images/bespoke-embalishment/silicon-printing.jpg'},
      {name:'Flat Embroidery',category:'embroidery',image:'/assets/images/bespoke-embalishment/flat-embroidery.jpg'},
      {name:'3D Embroidery',category:'embroidery',image:'/assets/images/bespoke-embalishment/3d-embroidery.jpg'},
      {name:'Chenille Embroidery',category:'embroidery',image:'/assets/images/bespoke-embalishment/chenille-embroidery.jpg'},
      {name:'Chain Stitch Embroidery',category:'embroidery',image:'/assets/images/bespoke-embalishment/chain-stitch-embroidery.jpg'},
      {name:'Distressed Embroidery',category:'embroidery',image:'/assets/images/bespoke-embalishment/distressed-embroidery.jpg'},
      {name:'Rhinestones',category:'embroidery',image:'/assets/images/bespoke-embalishment/rhinestones.jpg'},
      {name:'Pearl Stones',category:'embroidery',image:'/assets/images/bespoke-embalishment/pearl-stones.jpg'},
      {name:'Hook Stones',category:'embroidery',image:'/assets/images/bespoke-embalishment/hook-stones.jpg'},
      {name:'Embossing',category:'finish',image:'/assets/images/bespoke-embalishment/embossing.jpg'},
      {name:'Debossing',category:'finish',image:'/assets/images/bespoke-embalishment/debossing.jpg'},
      {name:'Distressing',category:'finish',image:'/assets/images/bespoke-embalishment/distressing.jpg'}
    ];
    const techGrid=document.querySelector('#techGrid');
    const renderTechniques=filter=>{
      const visible=filter==='all'?techniques:techniques.filter(item=>item.category===filter);
      techGrid.innerHTML=visible.map(item=>`<article class="tech-item" data-image="${item.image}" data-name="${item.name}" data-category="${item.category==='finish'?'DYE &amp; FINISH':item.category.toUpperCase()}" tabindex="0" role="button" aria-label="View ${item.name} example"><img src="${item.image}" alt="${item.name} apparel example" loading="lazy"><div class="tech-item-copy"><small>${item.category==='finish'?'DYE &amp; FINISH':item.category.toUpperCase()}</small><strong>${item.name}</strong></div></article>`).join('');
    };
    renderTechniques('all');
    document.querySelectorAll('.technique-filters button').forEach(button=>button.addEventListener('click',()=>{
      document.querySelectorAll('.technique-filters button').forEach(item=>item.classList.remove('is-active'));
      button.classList.add('is-active');
      renderTechniques(button.dataset.filter);
    }));

    const techLightbox=document.querySelector('#techLightbox');
    if(techLightbox){
      const techLightboxImg=document.querySelector('#techLightboxImg');
      const techLightboxTitle=document.querySelector('#techLightboxTitle');
      const techLightboxCategory=document.querySelector('#techLightboxCategory');
      let techLightboxIndex=0;
      const showTechLightboxItem=index=>{
        const items=Array.from(techGrid.querySelectorAll('.tech-item'));
        if(!items.length)return;
        techLightboxIndex=(index+items.length)%items.length;
        const item=items[techLightboxIndex];
        techLightboxImg.src=item.dataset.image;
        techLightboxImg.alt=`${item.dataset.name} apparel example`;
        techLightboxTitle.textContent=item.dataset.name;
        techLightboxCategory.innerHTML=item.dataset.category;
      };
      const openTechLightbox=index=>{
        showTechLightboxItem(index);
        techLightbox.classList.add('is-open');
        techLightbox.setAttribute('aria-hidden','false');
        document.body.style.overflow='hidden';
      };
      const closeTechLightbox=()=>{
        techLightbox.classList.remove('is-open');
        techLightbox.setAttribute('aria-hidden','true');
        document.body.style.overflow='';
      };
      techGrid.addEventListener('click',event=>{
        const item=event.target.closest('.tech-item');
        if(item)openTechLightbox(Array.from(techGrid.querySelectorAll('.tech-item')).indexOf(item));
      });
      techGrid.addEventListener('keydown',event=>{
        if(event.key!=='Enter'&&event.key!==' ')return;
        const item=event.target.closest('.tech-item');
        if(item){event.preventDefault();openTechLightbox(Array.from(techGrid.querySelectorAll('.tech-item')).indexOf(item))}
      });
      document.querySelector('#techLightboxClose').addEventListener('click',closeTechLightbox);
      document.querySelector('#techLightboxPrev').addEventListener('click',event=>{event.stopPropagation();showTechLightboxItem(techLightboxIndex-1)});
      document.querySelector('#techLightboxNext').addEventListener('click',event=>{event.stopPropagation();showTechLightboxItem(techLightboxIndex+1)});
      techLightbox.addEventListener('click',event=>{if(event.target===techLightbox)closeTechLightbox()});
      addEventListener('keydown',event=>{
        if(!techLightbox.classList.contains('is-open'))return;
        if(event.key==='Escape')closeTechLightbox();
        else if(event.key==='ArrowLeft')showTechLightboxItem(techLightboxIndex-1);
        else if(event.key==='ArrowRight')showTechLightboxItem(techLightboxIndex+1);
      });
    }
    
    const menuIcons=[
      ['#FFC000','<path d="M12 7c-1.5 0-2.5-1-3-2L4 7 1 11l3 2 1-1v9h14v-9l1 1 3-2-3-4-5 2c-.5 1-1.5 2-3 2z"/>'],
      ['#EAB308','<path d="M8 4c0 1.5 1.5 3 4 3s4-1.5 4-3l2 3-1 4v10H7V11L6 7l2-3z"/>'],
      ['#3B82F6','<path d="M12 6L8 4 3 6 1 10l3 2 1-1v9h14v-9l1 1 3-2-2-6-4 2z"/><path d="M9 4l3 4 3-4M12 8v12"/>'],
      ['#A855F7','<path d="M12 4l-4 2-4 3-2 4 3 2 1-1v9h12v-9l1 1 3-2-2-4-4-3zM12 3c-1.5 0-3 1.5-3 3h6c0-1.5-1.5-3-3-3zM12 6v15"/>'],
      ['#EC4899','<path d="M12 5L6 8v12h12V8zM12 5v15M6 10h12"/>'],
      ['#64748B','<path d="M12 4L6 7 3 11l2 2 1-1v8h12v-8l1 1 2-2-3-4zM9 7l1 3H6m9-3-1 3h4M10 7l3 13"/>'],
      ['#06B6D4','<path d="M6 6h12v11h-5l-1-2-1 2H6V6zM6 9h12M12 6l-1 3m1-3 1 3"/>'],
      ['#F43F5E','<path d="M5 15c0-6 3-8 7-8s7 2 7 8H5zM19 14c2 0 4 1 4 3s-2 2-4 2c-2 0-3-1-4-3 1-1 2-2 4-2z"/>'],
      ['#FFC000','<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>'],
      ['#10B981','<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>'],
      ['#A855F7','<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>'],
      ['#FFC000','<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>'],
      ['#EAB308','<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'],
      ['#10B981','<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>'],
      ['#3B82F6','<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>']
    ];
    document.querySelectorAll('.mega-links i').forEach((icon,index)=>{const [color,shape]=menuIcons[index];icon.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`});
    
    const compare=document.querySelector('#bespokeCompare');
    const compareBefore=compare.querySelector('.compare-before');
    const compareHandle=document.querySelector('#compareHandle');
    let compareValue=50;
    let compareDragging=false;
    
    function setComparePosition(value){
      compareValue=Math.max(2,Math.min(98,value));
      compareBefore.style.width=`${compareValue}%`;
      compareHandle.style.left=`${compareValue}%`;
      compareHandle.setAttribute('aria-valuenow',Math.round(compareValue));
    }
    
    function positionFromPointer(event){
      const rect=compare.getBoundingClientRect();
      setComparePosition(((event.clientX-rect.left)/rect.width)*100);
    }
    
    compare.addEventListener('pointerdown',event=>{
      if(event.button!==0&&event.pointerType==='mouse')return;
      compareDragging=true;
      compare.classList.add('is-dragging');
      compare.setPointerCapture(event.pointerId);
      positionFromPointer(event);
    });
    
    compare.addEventListener('pointermove',event=>{
      if(!compareDragging)return;
      positionFromPointer(event);
    });
    
    function stopCompareDrag(event){
      if(!compareDragging)return;
      compareDragging=false;
      compare.classList.remove('is-dragging');
      if(compare.hasPointerCapture(event.pointerId))compare.releasePointerCapture(event.pointerId);
    }
    
    compare.addEventListener('pointerup',stopCompareDrag);
    compare.addEventListener('pointercancel',stopCompareDrag);
    compareHandle.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();
      if(event.key==='Home')setComparePosition(2);
      else if(event.key==='End')setComparePosition(98);
      else setComparePosition(compareValue+(event.key==='ArrowRight'?2:-2));
    });

    const bespokeCtaCard=document.querySelector('#bigbee-cta-card');
    if(bespokeCtaCard){
      let currentX=80,currentY=20,targetX=80,targetY=20,frame=null,hovered=false;
      const animateGlow=()=>{
        currentX+=(targetX-currentX)*.08;
        currentY+=(targetY-currentY)*.08;
        bespokeCtaCard.style.setProperty('--glow-x',`${currentX.toFixed(2)}%`);
        bespokeCtaCard.style.setProperty('--glow-y',`${currentY.toFixed(2)}%`);
        if(hovered||Math.abs(targetX-currentX)>.05||Math.abs(targetY-currentY)>.05)frame=requestAnimationFrame(animateGlow);else frame=null;
      };
      const startGlow=()=>{if(!frame)frame=requestAnimationFrame(animateGlow)};
      bespokeCtaCard.addEventListener('pointermove',event=>{const rect=bespokeCtaCard.getBoundingClientRect();hovered=true;targetX=((event.clientX-rect.left)/rect.width)*100;targetY=((event.clientY-rect.top)/rect.height)*100;startGlow()});
      bespokeCtaCard.addEventListener('pointerleave',()=>{hovered=false;targetX=80;targetY=20;startGlow()});
    }
    
    
}

function initStreetwearPage() {
    const header = document.querySelector('#bigbee-header');
    header?.classList.add('scrolled');

    const hamburger = document.querySelector('#bigbee-hamburger');
    const drawer = document.querySelector('#bigbee-mobile-drawer');
    const closeButton = document.querySelector('#bigbee-drawer-close');
    const drawerOverlay = document.querySelector('#bigbee-drawer-overlay');
    const openDrawer = () => {
        drawer?.classList.add('is-open');
        hamburger?.classList.add('open');
        drawer?.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    };
    const closeDrawer = () => {
        drawer?.classList.remove('is-open');
        hamburger?.classList.remove('open');
        drawer?.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    };

    if (hamburger && drawer) {
        hamburger.addEventListener('click', () => drawer.classList.contains('is-open') ? closeDrawer() : openDrawer());
        closeButton?.addEventListener('click', closeDrawer);
        drawerOverlay?.addEventListener('click', closeDrawer);
        document.querySelectorAll('.bigbee-mobile-nav__link:not(.bigbee-mobile-nav__item--has-sub .bigbee-mobile-nav__link), .bigbee-mobile-subnav__link, .bigbee-mobile-expertise-link').forEach((link) => link.addEventListener('click', closeDrawer));
        document.querySelectorAll('.bigbee-mobile-nav__toggle').forEach((toggle) => toggle.addEventListener('click', (event) => {
            event.stopPropagation();
            toggle.closest('.bigbee-mobile-nav__item--has-sub')?.classList.toggle('is-expanded');
        }));
        addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
        });
    }

    populateStreetwearMenuIcons();

    const heroVisual = document.querySelector('.streetwear-hero__visual');
    const heroHalo = document.querySelector('.streetwear-hero__halo');
    if (heroVisual && heroHalo && window.matchMedia('(pointer: fine)').matches) {
        let targetX = 0;
        let targetY = 0;
        let currentX = 0;
        let currentY = 0;
        let haloFrame = null;
        const animateHalo = () => {
            currentX += (targetX - currentX) * .09;
            currentY += (targetY - currentY) * .09;
            heroHalo.style.setProperty('--halo-x', `${currentX.toFixed(2)}px`);
            heroHalo.style.setProperty('--halo-y', `${currentY.toFixed(2)}px`);
            if (Math.abs(targetX - currentX) > .05 || Math.abs(targetY - currentY) > .05) haloFrame = requestAnimationFrame(animateHalo);
            else haloFrame = null;
        };
        const startHalo = () => { if (!haloFrame) haloFrame = requestAnimationFrame(animateHalo); };
        heroVisual.addEventListener('pointermove', (event) => {
            const rect = heroVisual.getBoundingClientRect();
            targetX = ((event.clientX - rect.left) / rect.width - .5) * 80;
            targetY = ((event.clientY - rect.top) / rect.height - .5) * 60;
            startHalo();
        });
        heroVisual.addEventListener('pointerleave', () => {
            targetX = 0;
            targetY = 0;
            startHalo();
        });
    }

    const ctaCard = document.querySelector('#bigbee-cta-card');
    if (ctaCard) {
        let currentX = 80;
        let currentY = 20;
        let targetX = 80;
        let targetY = 20;
        let frame = null;
        let hovered = false;
        const animateGlow = () => {
            currentX += (targetX - currentX) * .08;
            currentY += (targetY - currentY) * .08;
            ctaCard.style.setProperty('--glow-x', `${currentX.toFixed(2)}%`);
            ctaCard.style.setProperty('--glow-y', `${currentY.toFixed(2)}%`);
            if (hovered || Math.abs(targetX - currentX) > .05 || Math.abs(targetY - currentY) > .05) frame = requestAnimationFrame(animateGlow);
            else frame = null;
        };
        const startGlow = () => { if (!frame) frame = requestAnimationFrame(animateGlow); };
        ctaCard.addEventListener('pointermove', (event) => {
            const rect = ctaCard.getBoundingClientRect();
            hovered = true;
            targetX = ((event.clientX - rect.left) / rect.width) * 100;
            targetY = ((event.clientY - rect.top) / rect.height) * 100;
            startGlow();
        });
        ctaCard.addEventListener('pointerleave', () => {
            hovered = false;
            targetX = 80;
            targetY = 20;
            startGlow();
        });
    }

    initLatestWorkCarousel();
}

function initLatestWorkCarousel() {
    const track = document.querySelector('#latest-work-track');
    const prevBtn = document.querySelector('#latest-work-prev');
    const nextBtn = document.querySelector('#latest-work-next');
    const dotsWrap = document.querySelector('#latest-work-dots');
    if (!track) return;

    const items = Array.from(track.children);
    const section = track.closest('.streetwear-latest-work');
    let currentIndex = 0;

    const positionArrows = () => {
        if (!section || (!prevBtn && !nextBtn)) return;
        const referenceImg = track.querySelector('.streetwear-latest-work__img');
        if (!referenceImg) return;
        const sectionRect = section.getBoundingClientRect();
        const imgRect = referenceImg.getBoundingClientRect();
        const top = imgRect.top - sectionRect.top + imgRect.height / 2;
        if (prevBtn) prevBtn.style.top = `${top}px`;
        if (nextBtn) nextBtn.style.top = `${top}px`;
    };

    const getStep = () => {
        const gap = parseFloat(getComputedStyle(track).gap) || 24;
        return items.length ? items[0].offsetWidth + gap : 0;
    };
    const getVisibleCount = () => {
        const step = getStep();
        return step ? Math.max(1, Math.floor(track.parentElement.offsetWidth / step)) : 1;
    };
    const getMaxIndex = () => Math.max(0, items.length - getVisibleCount());

    const renderDots = () => {
        if (!dotsWrap) return;
        dotsWrap.innerHTML = '';
        const maxIdx = getMaxIndex();
        for (let i = 0; i <= maxIdx; i++) {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `bigbee-carousel-dot${i === currentIndex ? ' active' : ''}`;
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
            dot.addEventListener('click', () => goToSlide(i));
            dotsWrap.appendChild(dot);
        }
    };

    const updatePosition = () => {
        track.style.transform = `translateX(-${getStep() * currentIndex}px)`;
        if (dotsWrap) {
            Array.from(dotsWrap.children).forEach((dot, idx) => dot.classList.toggle('active', idx === currentIndex));
        }
    };

    const goToSlide = (index) => {
        currentIndex = Math.max(0, Math.min(index, getMaxIndex()));
        updatePosition();
    };

    const nextSlide = () => goToSlide(currentIndex >= getMaxIndex() ? 0 : currentIndex + 1);
    const prevSlide = () => goToSlide(currentIndex <= 0 ? getMaxIndex() : currentIndex - 1);

    nextBtn?.addEventListener('click', nextSlide);
    prevBtn?.addEventListener('click', prevSlide);

    let isPointerDown = false;
    let hasDragged = false;
    let pointerId = null;
    let dragStartX = 0;
    let dragStartOffset = 0;
    const dragThreshold = 5;

    track.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        isPointerDown = true;
        hasDragged = false;
        pointerId = event.pointerId;
        dragStartX = event.clientX;
        dragStartOffset = -(getStep() * currentIndex);
    });

    track.addEventListener('pointermove', (event) => {
        if (!isPointerDown) return;
        const delta = event.clientX - dragStartX;
        if (!hasDragged) {
            if (Math.abs(delta) < dragThreshold) return;
            hasDragged = true;
            track.classList.add('is-dragging');
            try { track.setPointerCapture(pointerId); } catch (err) {}
        }
        track.style.transform = `translateX(${dragStartOffset + delta}px)`;
    });

    let suppressClick = false;
    const endDrag = (event) => {
        if (!isPointerDown) return;
        isPointerDown = false;
        if (!hasDragged) return;
        hasDragged = false;
        track.classList.remove('is-dragging');
        const diffX = dragStartX - event.clientX;
        if (Math.abs(diffX) > 40) {
            suppressClick = true;
            diffX > 0 ? nextSlide() : prevSlide();
        } else {
            updatePosition();
        }
    };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('dragstart', (event) => event.preventDefault());
    track.addEventListener('click', (event) => {
        if (suppressClick) {
            event.preventDefault();
            suppressClick = false;
        }
    }, true);

    window.addEventListener('resize', () => {
        currentIndex = Math.min(currentIndex, getMaxIndex());
        renderDots();
        updatePosition();
        positionArrows();
    });

    renderDots();
    updatePosition();
    positionArrows();
    window.addEventListener('load', positionArrows);
}

function populateStreetwearMenuIcons() {
    const menuIcons = [
        ['#FFC000','<path d="M12 7c-1.5 0-2.5-1-3-2L4 7 1 11l3 2 1-1v9h14v-9l1 1 3-2-3-4-5 2c-.5 1-1.5 2-3 2z"/>'],
        ['#EAB308','<path d="M8 4c0 1.5 1.5 3 4 3s4-1.5 4-3l2 3-1 4v10H7V11L6 7l2-3z"/>'],
        ['#3B82F6','<path d="M12 6L8 4 3 6 1 10l3 2 1-1v9h14v-9l1 1 3-2-2-6-4 2z"/><path d="M9 4l3 4 3-4M12 8v12"/>'],
        ['#A855F7','<path d="M12 4l-4 2-4 3-2 4 3 2 1-1v9h12v-9l1 1 3-2-2-4-4-3zM12 3c-1.5 0-3 1.5-3 3h6c0-1.5-1.5-3-3-3zM12 6v15"/>'],
        ['#EC4899','<path d="M12 5L6 8v12h12V8zM12 5v15M6 10h12"/>'],
        ['#64748B','<path d="M12 4L6 7 3 11l2 2 1-1v8h12v-8l1 1 2-2-3-4zM9 7l1 3H6m9-3-1 3h4M10 7l3 13"/>'],
        ['#06B6D4','<path d="M6 6h12v11h-5l-1-2-1 2H6V6zM6 9h12M12 6l-1 3m1-3 1 3"/>'],
        ['#F43F5E','<path d="M5 15c0-6 3-8 7-8s7 2 7 8H5zM19 14c2 0 4 1 4 3s-2 2-4 2c-2 0-3-1-4-3 1-1 2-2 4-2z"/>'],
        ['#FFC000','<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>'],
        ['#10B981','<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>'],
        ['#A855F7','<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>'],
        ['#FFC000','<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>'],
        ['#EAB308','<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'],
        ['#10B981','<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>'],
        ['#3B82F6','<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>']
    ];
    document.querySelectorAll('.mega-links i').forEach((icon, index) => {
        const entry = menuIcons[index];
        if (!entry) return;
        const [color, shape] = entry;
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`;
    });
}
