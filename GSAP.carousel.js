/**
 * Creates a seamless, responsive, looping horizontal carousel using GSAP.
 * @param {string|HTMLElement} containerEl - Selector or DOM element containing slide items.
 * @param {Object} [config] - Configuration options.
 * @param {Object|null} [options.responsive=null] - Responsive breakpoints mapping to itemsPerRow.
 * @param {number} [options.speed=1] - Speed multiplier (1 ≈ 100px/s).
 * @param {string} [options.gap='0px'] - Gap between items (CSS length).
 * @param {boolean} [options.draggable=false] - Enable Draggable support.
 * @param {number} [options.repeat=0] - Number of loop repeats (-1 for infinite).
 * @param {boolean} [options.autoplay=false] - Auto-advance slides.
 * @param {number} [options.autoplayTimeout=0] - Delay between auto-advances (ms).
 * @param {boolean} [options.reversed=false] - Reverse loop direction.
 * @param {boolean} [options.navigation=false] - Enable prev/next buttons.
 * @param {boolean} [options.dots=false] - Enable pagination dots.
 * @param {number|false} [options.snap=1] - Snap increment (false to disable).
 * @param {Function|null} [options.onChange=null] - Callback on slide change (item, index).
 * @param {boolean} [options.center=false] - Center mode (items loop from center).
 * @returns {GSAPTimeline} Configured GSAP timeline with extra controls and a .cleanup() method.
 */
function horizontalLoop(itemsContainer, config) {
  // Resolve container (selector string or DOM element)
  const container =
    typeof itemsContainer === "string"
      ? document.querySelector(itemsContainer)
      : itemsContainer;

  if (!container) {
    throw new Error(`horizontalLoop: container "${itemsContainer}" not found`);
  }
  let timeline;
  const items = gsap.utils.toArray(container.children);

  // Consolidated config defaults for better readability
  config = config || {};
  config = {
    responsive: config.responsive || null,
    speed: config.speed || 1,
    gap: config.gap || "0px",
    draggable: config.draggable || false,
    repeat: config.repeat || 0,
    paused: !config.autoplay || false,
    autoplayTimeout: config.autoplayTimeout || 0,
    reversed: config.reversed || false,
    navigation:
      typeof config.navigation !== "undefined" ? config.navigation : false,
    prevNav: config.prevNav || null,
    nextNav: config.nextNav || null,
    navigationContainer: config.navigationContainer || null,
    dots: typeof config.dots !== "undefined" ? config.dots : false,
    dotsContainer: config.dotsContainer || null,
    snap: config.snap || 1,
    onChange: config.onChange || null,
    center: config.center || false,
    // ...add any additional config defaults as needed...
  };

  // --- helper function for basic styles ---

  function initStyles(container, items, config) {
    container.style.setProperty("--gap", config.gap);
    container.style.display = "flex";
    container.style.gap = "var(--gap)";
    container.style.overflowX = "hidden";
    if (!config.responsive) {
      items.forEach((child) => {
        child.style.flex = "0 0 auto";
      });
    }
  }

  initStyles(container, items, config);

  // --- helper function for responsive styles ---
  function setupResponsiveStyles(container, items, config) {
    const breakpoints = Object.keys(config.responsive)
      .map(Number)
      .sort((a, b) => a - b);
    let itemsPerRow = config.responsive[breakpoints[0]].items || 1;

    for (let bp of breakpoints) {
      if (window.innerWidth >= bp) {
        itemsPerRow = config.responsive[bp].items;
      }
    }
    container.style.setProperty("--items-per-row", itemsPerRow);
    items.forEach((child) => {
      child.style.flex =
        "0 0 calc(100% / var(--items-per-row) - (var(--gap) * (var(--items-per-row) - 1) / var(--items-per-row)))";
    });
  }

  // --- helper function to setup navigation ---
  function setupNavigation(tl, container, config) {
    let prevBtn, nextBtn, navWrapper;
    if (config.prevNav && document.querySelector(config.prevNav)) {
      prevBtn = document.querySelector(config.prevNav);
    }
    if (config.nextNav && document.querySelector(config.nextNav)) {
      nextBtn = document.querySelector(config.nextNav);
    }
    // Use named functions for click handling
    function handlePrev() {
      tl.previous();
    }
    function handleNext() {
      tl.next();
    }
    if (!prevBtn || !nextBtn) {
      navWrapper = document.createElement("div");
      navWrapper.className = "gsap-carousel-nav";
      if (!prevBtn) {
        prevBtn = document.createElement("button");
        prevBtn.type = "button";
        prevBtn.innerText = "Previous";
        prevBtn.className = "gsap-carousel-prev";
        prevBtn.addEventListener("click", handlePrev);
        navWrapper.appendChild(prevBtn);
      }
      if (!nextBtn) {
        nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.innerText = "Next";
        nextBtn.className = "gsap-carousel-next";
        nextBtn.addEventListener("click", handleNext);
        navWrapper.appendChild(nextBtn);
      }
      if (
        config.navigationContainer &&
        document.querySelector(config.navigationContainer)
      ) {
        document
          .querySelector(config.navigationContainer)
          .appendChild(navWrapper);
      } else {
        container.parentNode.insertBefore(navWrapper, container.nextSibling);
      }
    }
    if (prevBtn) {
      prevBtn.addEventListener("click", handlePrev);
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", handleNext);
    }
  }

  // nav and dot default styles
  function injectCarouselStyles() {
    // avoid injecting twice
    if (document.getElementById("gsap-carousel-dots-styles")) return;

    let css = "";

    // only add navigation styles if requested
    if ((config.navigation && !config.prevNav) || !config.nextNav) {
      css += `
    .gsap-carousel-nav {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
    }

    .gsap-carousel-nav button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 12px;
      font-size: 14px;
      line-height: 1;
      border: none;
      border-radius: 4px;
      background-color: #eee;
      color: #333;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.2s, transform 0.1s;
    }

    .gsap-carousel-nav button:hover,
    .gsap-carousel-nav button:focus {
      background-color: #ddd;
      outline: none;
    }

    .gsap-carousel-nav button:active {
      transform: scale(0.95);
    }

    `;
    }

    // only add dots styles if requested
    if (config.dots) {
      css += `
    .gsap-carousel-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
      padding: 10px 0;
    }
    .gsap-carousel-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: var(--gsap-carousel-dot-bg, #ccc);
      border: none;
      cursor: pointer;
      padding: 0;
      transition: var(--gsap-carousel-dot-transition, background-color 0.3s);
    }
    .gsap-carousel-dot.active {
      background-color: var(--gsap-carousel-dot-bg-active, #333);
    }
    `;
    }

    // if there's nothing to inject, bail out
    if (!css.trim()) return;

    const style = document.createElement("style");
    style.id = "gsap-carousel-dots-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }
  injectCarouselStyles();

  // --- helper function to setup dots ---
  function setupDots(tl, items, container, config) {
    let dotsWrapper = document.createElement("div");
    dotsWrapper.className = "gsap-carousel-dots";
    const dots = [];
    for (let i = 0; i < items.length; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "gsap-carousel-dot";
      dot.setAttribute("data-index", i);
      dot.addEventListener("click", () => tl.toIndex(i));
      dotsWrapper.appendChild(dot);
      dots.push(dot);
    }
    if (config.dotsContainer && document.querySelector(config.dotsContainer)) {
      document.querySelector(config.dotsContainer).appendChild(dotsWrapper);
    } else {
      container.parentNode.insertBefore(dotsWrapper, container.nextSibling);
    }
    // Set first dot active
    if (dots[0]) {
      dots[0].classList.add("active");
    }
    return dots;
  }

  // Function to schedule autoplay
  let pendingCall;
  function scheduleAutoplay(tl) {
    if (config.autoplayTimeout > 0 && !config.paused) {
      clearTimeout(pendingCall);
      pendingCall = setTimeout(() => {
        if (config.reversed) {
          tl.previous();
        } else {
          tl.next();
        }
      }, config.autoplayTimeout);
    }
  }

  if (config.responsive) {
    // Replace inline updateResponsiveStyles with helper function
    const updateResponsiveStyles = () =>
      setupResponsiveStyles(container, items, config);
    updateResponsiveStyles();
    window.addEventListener("resize", updateResponsiveStyles);
    config._updateResponsiveStyles = updateResponsiveStyles;
  }
  gsap.context(() => {
    // use a context so that if this is called from within another context or a gsap.matchMedia(), we can perform proper cleanup like the "resize" event handler on the window
    let onChange = config.onChange,
      lastIndex = 0,
      tl = gsap.timeline({
        repeat: config.repeat,
        onUpdate:
          onChange &&
          function (self) {
            let i = tl.closestIndex();
            if (lastIndex !== i) {
              lastIndex = i;
              onChange(items[i], i);
            }
          },
        paused: config.autoplayTimeout ? true : config.paused,
        defaults: { ease: "none" },
        onReverseComplete: () =>
          tl.totalTime(tl.rawTime() + tl.duration() * 100),
      }),
      length = items.length,
      startX = items[0].offsetLeft,
      times = [],
      widths = [],
      spaceBefore = [],
      xPercents = [],
      curIndex = 0,
      indexIsDirty = false,
      center = config.center,
      pixelsPerSecond = config.speed * 100,
      snap =
        config.snap === false ? (v) => v : gsap.utils.snap(config.snap || 1),
      timeOffset = 0,
      container =
        center === true
          ? items[0].parentNode
          : gsap.utils.toArray(center)[0] || items[0].parentNode,
      totalWidth,
      getTotalWidth = () =>
        items[length - 1].offsetLeft +
        (xPercents[length - 1] / 100) * widths[length - 1] -
        startX +
        spaceBefore[0] +
        items[length - 1].offsetWidth *
          gsap.getProperty(items[length - 1], "scaleX") +
        (parseFloat(config.gap) || 0),
      populateWidths = () => {
        let b1 = container.getBoundingClientRect(),
          b2;
        items.forEach((el, i) => {
          widths[i] = parseFloat(gsap.getProperty(el, "width", "px"));
          xPercents[i] = snap(
            (parseFloat(gsap.getProperty(el, "x", "px")) / widths[i]) * 100 +
              gsap.getProperty(el, "xPercent")
          );
          b2 = el.getBoundingClientRect();
          spaceBefore[i] = b2.left - (i ? b1.right : b1.left);
          b1 = b2;
        });
        gsap.set(items, {
          xPercent: (i) => xPercents[i],
        });
        totalWidth = getTotalWidth();
      },
      timeWrap,
      populateOffsets = () => {
        timeOffset = center
          ? (tl.duration() * (container.offsetWidth / 2)) / totalWidth
          : 0;
        center &&
          times.forEach((t, i) => {
            times[i] = timeWrap(
              tl.labels["label" + i] +
                (tl.duration() * widths[i]) / 2 / totalWidth -
                timeOffset
            );
          });
      },
      getClosest = (values, value, wrap) => {
        let i = values.length,
          closest = 1e10,
          index = 0,
          d;
        while (i--) {
          d = Math.abs(values[i] - value);
          if (d > wrap / 2) {
            d = wrap - d;
          }
          if (d < closest) {
            closest = d;
            index = i;
          }
        }
        return index;
      },
      populateTimeline = () => {
        let i, item, curX, distanceToStart, distanceToLoop;
        tl.clear();
        for (i = 0; i < length; i++) {
          item = items[i];
          curX = (xPercents[i] / 100) * widths[i];
          distanceToStart = item.offsetLeft + curX - startX + spaceBefore[0];
          distanceToLoop =
            distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");
          tl.to(
            item,
            {
              xPercent: snap(((curX - distanceToLoop) / widths[i]) * 100),
              duration: distanceToLoop / pixelsPerSecond,
            },
            0
          )
            .fromTo(
              item,
              {
                xPercent: snap(
                  ((curX - distanceToLoop + totalWidth) / widths[i]) * 100
                ),
              },
              {
                xPercent: xPercents[i],
                duration:
                  (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond,
                immediateRender: false,
              },
              distanceToLoop / pixelsPerSecond
            )
            .add("label" + i, distanceToStart / pixelsPerSecond);
          times[i] = distanceToStart / pixelsPerSecond;
        }
        timeWrap = gsap.utils.wrap(0, tl.duration());
      },
      refresh = (deep) => {
        let progress = tl.progress();
        tl.progress(0, true);
        populateWidths();
        deep && populateTimeline();
        populateOffsets();
        deep && tl.draggable && tl.paused()
          ? tl.time(times[curIndex], true)
          : tl.progress(progress, true);
      },
      onResize = () => refresh(true),
      proxy;
    gsap.set(items, { x: 0 });
    populateWidths();
    populateTimeline();
    populateOffsets();
    window.addEventListener("resize", onResize);

    // Helper: debounce for resize
    function debounce(fn, delay) {
      let timer;
      return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    }
    window.removeEventListener("resize", onResize);
    window.addEventListener("resize", debounce(onResize, 100));

    function toIndex(index, vars) {
      vars = vars || {};
      Math.abs(index - curIndex) > length / 2 &&
        (index += index > curIndex ? -length : length);
      let newIndex = gsap.utils.wrap(0, length, index),
        time = times[newIndex];
      if (time > tl.time() !== index > curIndex && index !== curIndex) {
        time += tl.duration() * (index > curIndex ? 1 : -1);
      }
      if (time < 0 || time > tl.duration()) {
        vars.modifiers = { time: timeWrap };
      }
      curIndex = newIndex;
      vars.overwrite = true;
      gsap.killTweensOf(proxy);

      scheduleAutoplay(tl);
      return vars.duration === 0
        ? tl.time(timeWrap(time))
        : tl.tweenTo(time, vars);
    }
    scheduleAutoplay(tl);

    tl.toIndex = (index, vars) => toIndex(index, vars);
    tl.closestIndex = (setCurrent) => {
      let index = getClosest(times, tl.time(), tl.duration());
      if (setCurrent) {
        curIndex = index;
        indexIsDirty = false;
      }
      return index;
    };

    tl.current = () => (indexIsDirty ? tl.closestIndex(true) : curIndex);
    tl.next = (vars) => toIndex(tl.current() + 1, vars);
    tl.previous = (vars) => toIndex(tl.current() - 1, vars);
    tl.times = times;
    tl.progress(1, true).progress(0, true);
    if (config.reversed && !config.autoplayTimeout) {
      tl.vars.onReverseComplete();
      tl.reverse();
    }
    if (config.draggable && typeof Draggable === "function") {
      proxy = document.createElement("div");
      let wrap = gsap.utils.wrap(0, 1),
        ratio,
        startProgress,
        draggable,
        dragSnap,
        lastSnap,
        initChangeX,
        wasPlaying,
        align = () =>
          tl.progress(
            wrap(startProgress + (draggable.startX - draggable.x) * ratio)
          ),
        syncIndex = () => tl.closestIndex(true);
      typeof InertiaPlugin === "undefined" &&
        console.warn(
          "InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club"
        );
      draggable = Draggable.create(proxy, {
        trigger: items[0].parentNode,
        type: "x",
        onPressInit() {
          let x = this.x;
          gsap.killTweensOf(tl);
          wasPlaying = !tl.paused();
          tl.pause();
          startProgress = tl.progress();
          refresh();
          ratio = 1 / totalWidth;
          initChangeX = startProgress / -ratio - x;
          gsap.set(proxy, { x: startProgress / -ratio });
        },
        onDrag: align,
        onThrowUpdate: align,
        overshootTolerance: 0,
        inertia: true,
        snap(value) {
          if (Math.abs(startProgress / -ratio - this.x) < 10) {
            return lastSnap + initChangeX;
          }
          let time = -(value * ratio) * tl.duration(),
            wrappedTime = timeWrap(time),
            snapTime = times[getClosest(times, wrappedTime, tl.duration())],
            dif = snapTime - wrappedTime;
          Math.abs(dif) > tl.duration() / 2 &&
            (dif += dif < 0 ? tl.duration() : -tl.duration());
          lastSnap = (time + dif) / tl.duration() / -ratio;
          return lastSnap;
        },
        onRelease() {
          syncIndex();
          draggable.isThrowing && (indexIsDirty = true);
        },
        onThrowComplete: () => {
          syncIndex();
          wasPlaying && tl.play();
        },
      })[0];
      tl.draggable = draggable;
    }

    // Navigation buttons
    if (config.navigation === true) {
      const navContainer = items[0].parentNode;
      setupNavigation(tl, navContainer, config);
    }

    // Setup dots navigation if enabled
    let dots = [];
    if (config.dots === true) {
      const dotsContainer = items[0].parentNode;
      dots = setupDots(tl, items, dotsContainer, config);
    }

    // Ensure dots update on timeline update:
    function updateDots(index) {
      if (config.dots === true && dots.length) {
        dots.forEach((dot, i) => {
          dot.classList.toggle("active", i === index);
        });
      }
    }

    // Patch onChange to also update dots
    if (config.dots === true || onChange) {
      const userOnChange = onChange;
      tl.eventCallback("onUpdate", function () {
        let i = tl.closestIndex();
        if (lastIndex !== i) {
          lastIndex = i;
          if (config.dots === true) updateDots(i);
          if (userOnChange) userOnChange(items[i], i);
        }
      });
    }

    // Accessibility: add aria-labels for nav/dots
    if (config.navigation === true) {
      const navBtns = document.querySelectorAll(
        ".gsap-carousel-nav button, .gsap-carousel-prev, .gsap-carousel-next"
      );
      navBtns.forEach((btn) => {
        btn.setAttribute("tabindex", "0");
        if (!btn.hasAttribute("aria-label")) {
          btn.setAttribute(
            "aria-label",
            btn.classList.contains("gsap-carousel-prev")
              ? "Previous Slide"
              : "Next Slide"
          );
        }
      });
    }
    if (config.dots === true && dots.length) {
      dots.forEach((dot, i) => {
        dot.setAttribute("tabindex", "0");
        dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
        dot.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            tl.toIndex(i);
          }
        });
      });
    }

    timeline = tl;
    // Cleanup function
    timeline.cleanup = () => {
      window.removeEventListener("resize", onResize);
      if (config.responsive && config._updateResponsiveStyles) {
        window.removeEventListener("resize", config._updateResponsiveStyles);
      }
      if (tl._removeKeyHandler) tl._removeKeyHandler();
    };
    return () => {
      timeline.cleanup();
    };
  });
  return timeline;
}
