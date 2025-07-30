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
 * @param {boolean} [options.navStyle=false] - Injects complete CSS for navigation styles.
 * @returns {GSAPTimeline} Configured GSAP timeline with extra controls and a .cleanup() method.
 */
function horizontalLoop(itemsContainer, config) {
  // Get the container element, supporting both string selectors and DOM nodes
  const container =
    typeof itemsContainer === "string"
      ? document.querySelector(itemsContainer)
      : itemsContainer;

  if (!(container instanceof Element)) {
    throw new Error(
      `horizontalLoop: container "${itemsContainer}" not found or is not a valid Element.`
    );
  }

  // Ensure items is an array of Element children
  const items = Array.from(container.children);
  let timeline;

  //  defaults
  const defaultConfig = {
    responsive: null,
    speed: 1,
    gap: "0px",
    draggable: false,
    repeat: 0,
    autoplay: false,
    paused: true,
    autoplayTimeout: 0,
    reversed: false,
    navigation: false,
    prevNav: null,
    nextNav: null,
    navigationContainer: null,
    dots: false,
    dotsContainer: null,
    snap: 1,
    onChange: null,
    center: false,
    navStyle: false,
  };

  // Merge user config with defaults
  config = {
    ...defaultConfig,
    ...config,
  };

  // Handle the autoplay/paused relationship logic
  if ("autoplay" in config) {
    config.paused = !config.autoplay;
  } else if (!("paused" in config)) {
    config.paused = true; // Default behavior when neither is specified
  }

  // Type validation for critical numeric properties
  if (typeof config.speed === "string") {
    config.speed = parseFloat(config.speed) || defaultConfig.speed;
  }
  if (typeof config.snap === "string") {
    config.snap = parseInt(config.snap, 10) || defaultConfig.snap;
  }

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

  // Apply initial styles
  initStyles(container, items, config);

  // helper for responsive styles
  function setupResponsiveStyles(container, items, config) {
    // Cache the current window width to avoid repeated property accesses
    const winWidth = window.innerWidth;

    const breakpoints = Object.keys(config.responsive)
      .map(Number)
      .sort((a, b) => a - b); // Determine the correct itemsPerRow for the current breakpoint

    let itemsPerRow = config.responsive[breakpoints[0]]?.items || 1;
    for (const bp of breakpoints) {
      if (winWidth >= bp && config.responsive[bp]?.items) {
        itemsPerRow = config.responsive[bp].items;
      }
    } // Set CSS variable only when changed

    if (
      container.style.getPropertyValue("--items-per-row") !==
      String(itemsPerRow)
    ) {
      container.style.setProperty("--items-per-row", itemsPerRow);
    } // Calculate flex-basis with `itemsPerRow` only once for all children

    const basis = `0 0 calc(100% / var(--items-per-row) - (var(--gap) * (var(--items-per-row) - 1) / var(--items-per-row)))`;
    for (const child of items) {
      // Set only if not already set to reduce style recalculations
      if (child.style.flex !== basis) {
        child.style.flex = basis;
      }
    }
  }

  // helper function for navigation setup with cleanup capability
  function setupNavigation(tl, container, config) {
    // Usage with cleanup capability
    // const navigation = setupNavigation(timeline, container, config);

    // Later, when cleaning up:
    // navigation.destroy();

    // Validate inputs early
    if (!tl || !(container instanceof Element) || !config) {
      throw new Error("setupNavigation: Invalid parameters provided");
    }

    // Cache DOM queries to avoid repeated lookups
    const existingPrevBtn = config.prevNav
      ? document.querySelector(config.prevNav)
      : null;
    const existingNextBtn = config.nextNav
      ? document.querySelector(config.nextNav)
      : null;
    const navigationContainer = config.navigationContainer
      ? document.querySelector(config.navigationContainer)
      : null;

    let prevBtn = existingPrevBtn;
    let nextBtn = existingNextBtn;
    let navWrapper = null;
    let createdElements = [];

    // Named event handlers for better performance and cleanup
    const handlePrev = () => {
      if (tl && typeof tl.previous === "function") {
        tl.previous();
      }
    };

    const handleNext = () => {
      if (tl && typeof tl.next === "function") {
        tl.next();
      }
    };

    // Create navigation wrapper and buttons if needed
    if (!prevBtn || !nextBtn) {
      navWrapper = document.createElement("div");
      navWrapper.className = "gsap-carousel-nav";
      createdElements.push(navWrapper);

      // Create previous button if not provided
      if (!prevBtn) {
        prevBtn = createNavigationButton(
          "Previous",
          "gsap-carousel-prev",
          handlePrev
        );
        navWrapper.appendChild(prevBtn);
        createdElements.push(prevBtn);
      }

      // Create next button if not provided
      if (!nextBtn) {
        nextBtn = createNavigationButton(
          "Next",
          "gsap-carousel-next",
          handleNext
        );
        navWrapper.appendChild(nextBtn);
        createdElements.push(nextBtn);
      }

      // Append navigation to appropriate container
      appendNavigationToContainer(navWrapper, navigationContainer, container);
    }

    // Add event listeners to existing buttons (avoid double-adding for created buttons)
    if (existingPrevBtn) {
      existingPrevBtn.addEventListener("click", handlePrev);
    }
    if (existingNextBtn) {
      existingNextBtn.addEventListener("click", handleNext);
    }

    // Return cleanup function for proper memory management
    return {
      destroy() {
        // Remove event listeners
        if (existingPrevBtn) {
          existingPrevBtn.removeEventListener("click", handlePrev);
        }
        if (existingNextBtn) {
          existingNextBtn.removeEventListener("click", handleNext);
        }

        // Remove created elements
        createdElements.forEach((element) => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        });

        // Clear references
        createdElements.length = 0;
      },

      // Expose button references for external control
      prevButton: prevBtn,
      nextButton: nextBtn,
      wrapper: navWrapper,
    };
  }

  // Helper function to create navigation buttons
  function createNavigationButton(text, className, clickHandler) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.className = className;
    button.addEventListener("click", clickHandler);

    // Add accessibility attributes
    button.setAttribute("aria-label", text);

    return button;
  }

  // Helper function to append navigation to container
  function appendNavigationToContainer(
    navWrapper,
    navigationContainer,
    fallbackContainer
  ) {
    try {
      if (navigationContainer) {
        navigationContainer.appendChild(navWrapper);
      } else if (fallbackContainer.parentNode) {
        fallbackContainer.parentNode.insertBefore(
          navWrapper,
          fallbackContainer.nextSibling
        );
      } else {
        throw new Error("No valid container found for navigation");
      }
    } catch (error) {
      console.warn("Navigation container error:", error.message);
      // Fallback: append to document body
      document.body.appendChild(navWrapper);
    }
  }

  // carousel styles injection - injects complete CSS when navStyle=true
  function injectCarouselStyles(config = {}) {
    // Early return if already injected (performance)
    const existingStyles = document.getElementById("gsap-carousel-styles");
    if (existingStyles) return;

    // Early return if navStyle is not requested (performance)
    if (!config.navStyle) return;

    // Complete CSS template - all styles in one place for maintainability
    const completeCSS = `
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
    }`;

    // Create and inject styles in one operation (optimal performance)
    const styleElement = document.createElement("style");
    styleElement.id = "gsap-carousel-styles";
    styleElement.textContent = completeCSS;

    // Robust DOM insertion with fallback
    (document.head || document.documentElement).appendChild(styleElement);
  }

  injectCarouselStyles(config);

  function setupDots(tl, items, container, config) {
    // Input validation
    if (!tl?.toIndex || !Array.isArray(items) || !container || !config) {
      console.warn("setupDots: Invalid parameters provided");
      return [];
    }

    // Constants for better maintainability
    const CSS_CLASSES = {
      WRAPPER: "gsap-carousel-dots",
      DOT: "gsap-carousel-dot",
      ACTIVE: "active",
    };

    const DATA_ATTRIBUTES = {
      INDEX: "data-index",
    };

    // Cache DOM query result
    const customContainer = config.dotsContainer
      ? document.querySelector(config.dotsContainer)
      : null;

    // Create dots wrapper
    const dotsWrapper = document.createElement("div");
    dotsWrapper.className = CSS_CLASSES.WRAPPER;

    // Use DocumentFragment for efficient DOM manipulation
    const fragment = document.createDocumentFragment();
    const dots = [];

    // Create all dots in memory first
    for (let i = 0; i < items.length; i++) {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = CSS_CLASSES.DOT;
      dot.setAttribute(DATA_ATTRIBUTES.INDEX, i.toString());

      // Set first dot as active during creation
      if (i === 0) {
        dot.classList.add(CSS_CLASSES.ACTIVE);
      }

      fragment.appendChild(dot);
      dots.push(dot);
    }

    // Append all dots at once
    dotsWrapper.appendChild(fragment);

    // Use event delegation instead of individual listeners
    dotsWrapper.addEventListener("click", handleDotClick);

    // Insert dots wrapper into DOM
    insertDotsWrapper(dotsWrapper, customContainer, container);

    function handleDotClick(event) {
      const dot = event.target.closest(`.${CSS_CLASSES.DOT}`);
      if (!dot) return;

      const index = parseInt(dot.getAttribute(DATA_ATTRIBUTES.INDEX), 10);
      if (!isNaN(index) && typeof tl.toIndex === "function") {
        tl.toIndex(index);
      }
    }

    function insertDotsWrapper(wrapper, customContainer, fallbackContainer) {
      try {
        if (customContainer) {
          customContainer.appendChild(wrapper);
        } else if (fallbackContainer?.parentNode) {
          fallbackContainer.parentNode.insertBefore(
            wrapper,
            fallbackContainer.nextSibling
          );
        } else {
          console.warn(
            "setupDots: Unable to insert dots wrapper - no valid container found"
          );
        }
      } catch (error) {
        console.error("setupDots: Error inserting dots wrapper:", error);
      }
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
    //  updateResponsiveStyles
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
    window.removeEventListener("resize", onResize);

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
    config.center
      ? tl.time(times[0], true)
      : tl.progress(1, true).progress(0, true);

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
      // setupNavigation(tl, navContainer, config);
      // Usage with cleanup capability
      const navigation = setupNavigation(tl, navContainer, config);
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
      if (navigation) {
        navigation.destroy(); // Clean up navigation
      }
      if (tl._removeKeyHandler) tl._removeKeyHandler();
    };
    return () => {
      timeline.cleanup();
    };
  });
  return timeline;
}
