/**
 * Creates a seamless, responsive, looping horizontal carousel using GSAP.
 * Production-ready version with enhanced error handling, performance, and accessibility.
 *
 * @param {string|HTMLElement} containerEl
 *   Selector string or DOM element containing the slide items.
 *
 * @param {Object} [config={}]
 *   Carousel configuration options.
 *
 * @param {Object.<number, {items:number}>|null} [config.responsive=null]
 *   Responsive breakpoints mapping, e.g., `{ 768: { items: 2 } }`.
 *
 * @param {number} [config.speed=1]
 *   Speed multiplier (1 ≈ 100px/s).
 *
 * @param {string} [config.gap="0px"]
 *   Gap between items (CSS length value).
 *
 * @param {boolean} [config.draggable=false]
 *   Enables mouse/touch dragging.
 *
 * @param {number} [config.repeat=0]
 *   Number of loop repeats (`-1` for infinite).
 *
 * @param {boolean} [config.paused=true]
 *   Whether the carousel starts paused.
 *
 * @param {number} [config.autoplayDelay =0]
 *   Delay **in seconds** between automatic advances (`0` disables autoplay).
 *
 * @param {boolean} [config.reversed=false]
 *   Reverses the loop direction.
 *
 * @param {HTMLElement|[HTMLElement, Object]|null} [config.prevNav=null]
 *   Previous navigation element, or `[element, options]` tuple.
 *
 * @param {HTMLElement|[HTMLElement, Object]|null} [config.nextNav=null]
 *   Next navigation element, or `[element, options]` tuple.
 *
 * @param {HTMLElement|[HTMLElement, Object]|null} [config.dots=null]
 *   Pagination dots container, or `[container, options]` tuple.
 *
 * @param {number|false} [config.snap=1]
 *   Snap increment in slides (`false` to disable snapping).
 *
 * @param {Function|null} [config.onChange=null]
 *   Callback fired when the visible slide changes.
 *
 * @param {boolean} [config.center=false]
 *   Enables center mode (active slide centered in view).
 *
 * @param {boolean} [config.updateOnlyOnSettle=false]
 *   If true, fires `onChange` only after drag/scroll settles.
 *
 * @param {Function|null} [config.onInitialized=null]
 *   Callback fired after carousel initialization completes.
 *
 * @param {string} [config.ariaLabel="Carousel"]
 *  ARIA label for the carousel container, used for accessibility.
 *
 * @param {boolean} [config.debug=false]
 *   Enables debug logging to console.
 *
 * @param {boolean} [config.accessibilityEnabled=true]
 *   Enables ARIA roles, keyboard navigation, and other accessibility features.
 *
 * @returns {GSAPTimeline|null}
 *   Configured GSAP timeline instance with control methods and a `cleanup()` method.
 */

function horizontalLoop(itemsContainer, config = {}) {
  // Environment checks
  if (typeof window === "undefined") {
    console.error("horizontalLoop: Window object not available");
    return null;
  }

  if (typeof gsap === "undefined") {
    console.error("horizontalLoop: GSAP library not found");
    return null;
  }

  // Validate and get container element
  const container = resolveElement(itemsContainer);
  if (!container) return null;

  // Validate children
  const items = Array.from(container.children);
  if (items.length === 0) {
    console.warn("horizontalLoop: No child elements found in container");
    return null;
  }

  // Configuration with enhanced validation
  const validatedConfig = validateAndMergeConfig(config);
  const { debug } = validatedConfig;
  const log = createLogger(debug);

  log("Initializing horizontal loop with config:", validatedConfig);

  // State management
  const state = {
    isDestroyed: false,
    timeline: null,
    navigation: null,
    dots: [],
    resizeObserver: null,
    autoplayDelay: null,
    eventListeners: new Map(),
    isProgrammaticNavigation: false,
    eventManager: makeEventManager(),
  };

  try {
    // Initialize carousel
    const timeline = initializeCarousel(
      container,
      items,
      validatedConfig,
      state,
      log
    );

    if (!timeline) {
      log("Failed to initialize carousel");
      return null;
    }

    // Enhanced cleanup function
    timeline.cleanup = createCleanupFunction(state, validatedConfig, log);

    // Production debugging helpers
    if (debug) {
      timeline.getState = () => ({ ...state, config: validatedConfig });
      timeline.log = log;
    }

    log("Carousel initialized successfully");
    return timeline;
  } catch (error) {
    console.error("horizontalLoop: Initialization failed:", error);
    cleanup(state, validatedConfig, log);
    return null;
  }
}

/**
 * Validates and merges configuration with defaults
 */
function validateAndMergeConfig(userConfig) {
  const defaultConfig = {
    responsive: null,
    speed: 1,
    gap: "0px",
    draggable: false,
    repeat: 0,
    paused: true,
    autoplayDelay: 0,
    reversed: false,
    prevNav: null,
    nextNav: null,
    dots: null,
    snap: 1,
    onChange: null,
    center: false,
    updateOnlyOnSettle: false,
    onInitialized: null,
    ariaLabel: "Carousel",
    debug: false,
    accessibilityEnabled: true,
  };

  // Deep merge with validation
  const config = { ...defaultConfig };

  for (const [key, value] of Object.entries(userConfig)) {
    if (key in defaultConfig) {
      config[key] = validateConfigValue(key, value, defaultConfig[key]);
    } else {
      console.warn(`horizontalLoop: Unknown config option "${key}"`);
    }
  }

  // Validate responsive configuration
  if (config.responsive && typeof config.responsive !== "object") {
    console.warn("horizontalLoop: responsive config must be an object");
    config.responsive = null;
  }

  return config;
}

/**
 * Validates individual config values
 */
function validateConfigValue(key, value, defaultValue) {
  switch (key) {
    case "speed":
      const speed = typeof value === "string" ? parseFloat(value) : value;
      return typeof speed === "number" && speed > 0 ? speed : defaultValue;

    case "snap":
      if (value === false) return false;
      const snap = typeof value === "string" ? parseInt(value, 10) : value;
      return typeof snap === "number" && snap >= 0 ? snap : defaultValue;

    case "gap":
      if (typeof value === "number") return `${value}px`;
      if (typeof value === "string" && value.trim()) return value.trim();
      return defaultValue;

    case "autoplayDelay":
      const timeout = typeof value === "number" ? value : parseInt(value, 10);
      return timeout >= 0 ? timeout : defaultValue;

    case "onChange":
    case "onInitialized":
      return typeof value === "function" ? value : defaultValue;

    default:
      return value;
  }
}

/**
 * Creates a logger function
 */
function createLogger(debug) {
  return debug ? console.log.bind(console, "[HorizontalLoop]") : () => {};
}

// lightweight event manager for consistent add/remove
function makeEventManager() {
  const listeners = [];
  return {
    on(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      listeners.push({ target, type, handler, options });
      return handler;
    },
    offAll() {
      for (const { target, type, handler, options } of listeners) {
        try {
          target.removeEventListener(type, handler, options);
        } catch (e) {}
      }
      listeners.length = 0;
    },
  };
}

// Resolve element from selector or Element
function resolveElement(target) {
  if (typeof target === "string") {
    // Use GSAP utils for better selector handling (works with NodeLists, etc.)
    const el = gsap.utils.toArray(target)[0] || null;
    if (!el) {
      console.error(
        `resolveElement: No element found for selector "${target}"`
      );
    }
    return el;
  }

  if (target instanceof Element) {
    return target;
  }

  console.error(
    `resolveElement: Invalid target, expected selector or Element. Not "${typeof target}" ${target}"`
  );
  return null;
}

/**
 * Main carousel initialization function
 */
function initializeCarousel(container, items, config, state, log) {
  // Initialize styles
  initStyles(container, items, config);

  // Setup responsive handling if needed
  if (config.responsive) {
    setupResponsiveHandling(container, items, config, state, log);
  }

  const timeline = createTimeline(container, items, config, state, log);

  if (!timeline) return null;

  // Setup additional features
  setupNavigation(timeline, container, config, state, log);
  createDotsElements(timeline, items, container, config, state, log);
  setupAutoplay(timeline, config, state, log);
  setupAccessibility(timeline, container, items, config, state, log);

  state.timeline = timeline;
  // Initial active dot positioning
  updateDots(state.dots, 0);

  // Call initialization callback
  if (config.onInitialized) {
    try {
      config.onInitialized(createPayload(0, timeline, items, config));
    } catch (error) {
      log("Error in onInitialized callback:", error);
    }
  }

  log("Carousel initialized successfully");
  return timeline;
}

/**
 * Creates the main GSAP timeline
 */
function createTimeline(container, items, config, state, log) {
  try {
    let timeline;
    let lastIndex = 0;

    // Core timeline setup with error handling
    const tl = gsap.timeline({
      repeat: config.repeat,
      paused: config.autoplayDelay > 0 || config.paused,
      defaults: { ease: "none" },
      onReverseComplete: function () {
        if (!state.isDestroyed) {
          tl.totalTime(tl.rawTime() + tl.duration() * 100);
        }
      },
    });

    // Timeline population with error recovery
    if (!populateTimeline(tl, container, items, config, log)) {
      return null;
    }

    // Add navigation methods with error handling
    addNavigationMethods(tl, items, config, state, log);

    // Setup change detection with debouncing
    setupChangeDetection(tl, items, config, state, lastIndex, log);

    // Setup draggable if requested and available
    if (config.draggable && typeof Draggable !== "undefined") {
      setupDraggable(tl, items, config, state, log);
    }
    // Handle reversed mode
    if (config.reversed && !config.autoplayDelay) {
      tl.vars.onReverseComplete();
      tl.reverse();
    }

    timeline = tl;
    return timeline;
  } catch (error) {
    log("Error creating timeline:", error);
    return null;
  }
}

/**
 * Populates the GSAP timeline with animations
 */
function populateTimeline(tl, container, items, config, log) {
  /**
   * Populates the GSAP timeline with animations and center support
   */
  try {
    const length = items.length;
    const pixelsPerSecond = config.speed * 100;
    const gap = parseFloat(config.gap) || 0;
    const snap =
      config.snap === false ? (v) => v : gsap.utils.snap(config.snap || 1);
    const center = config.center;

    const loopContainer =
      center === true
        ? items[0].parentNode
        : gsap.utils.toArray(center)[0] || items[0].parentNode;

    const startX = items[0].offsetLeft;

    let widths = [];
    let xPercents = [];
    let spaceBefore = [];
    let times = [];
    let timeOffset = 0;
    let totalWidth;

    // Helper function to get total width
    const getTotalWidth = () =>
      items[length - 1].offsetLeft +
      (xPercents[length - 1] / 100) * widths[length - 1] -
      startX +
      spaceBefore[0] +
      items[length - 1].offsetWidth *
        gsap.getProperty(items[length - 1], "scaleX") +
      gap;

    // Populate widths and positions
    const populateWidths = () => {
      let b1 = loopContainer.getBoundingClientRect();
      let b2;

      items.forEach((el, i) => {
        try {
          widths[i] = parseFloat(gsap.getProperty(el, "width", "px")) || 0;
          xPercents[i] = snap(
            (parseFloat(gsap.getProperty(el, "x", "px")) / widths[i]) * 100 +
              gsap.getProperty(el, "xPercent")
          );
          b2 = el.getBoundingClientRect();
          spaceBefore[i] = b2.left - (i ? b1.right : b1.left);
          b1 = b2;
        } catch (error) {
          log(`Error calculating dimensions for item ${i}:`, error);
          return false;
        }
      });

      gsap.set(items, { xPercent: (i) => xPercents[i] });
      totalWidth = getTotalWidth();
    };

    // Time wrapping utility
    let timeWrap;

    // Populate offsets with center support
    const populateOffsets = () => {
      timeOffset = center
        ? (tl.duration() * (loopContainer.offsetWidth / 2)) / totalWidth
        : 0;

      if (center) {
        times.forEach((t, i) => {
          times[i] = timeWrap(
            tl.labels["label" + i] +
              (tl.duration() * widths[i]) / 2 / totalWidth -
              timeOffset
          );
        });
      }
    };

    // Build timeline animations
    gsap.set(items, { x: 0 });
    populateWidths();

    // Clear timeline and populate
    tl.clear();

    for (let i = 0; i < length; i++) {
      const item = items[i];
      const curX = (xPercents[i] / 100) * widths[i];
      const distanceToStart = item.offsetLeft + curX - startX + spaceBefore[0];
      const distanceToLoop =
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

    // Set up time wrapping
    timeWrap = gsap.utils.wrap(0, tl.duration());

    // Populate offsets after timeline is built
    populateOffsets();

    // Initial positioning based on center mode
    if (center) {
      tl.time(times[0], true);
    } else {
      tl.progress(1, true).progress(0, true);
    }

    // Store references for other functions
    tl._widths = widths;
    tl._times = times;
    tl._xPercents = xPercents;
    tl._timeWrap = timeWrap;
    tl._totalWidth = totalWidth;
    tl._timeOffset = timeOffset;
    tl._populateWidths = populateWidths;
    tl._populateOffsets = populateOffsets;
    tl._loopContainer = loopContainer;
    tl._config = config;

    return true;
  } catch (error) {
    log("Error populating timeline:", error);
    return false;
  }
}

/**
 * Calculates total width of all items
 */
function getTotalWidth(items, widths, xPercents, startX, spaceBefore, gap) {
  const length = items.length;
  return (
    items[length - 1].offsetLeft +
    (xPercents[length - 1] / 100) * widths[length - 1] -
    startX +
    spaceBefore[0] +
    items[length - 1].offsetWidth *
      gsap.getProperty(items[length - 1], "scaleX") +
    gap
  );
}

/**
 * Adds navigation methods to timeline
 */
function addNavigationMethods(tl, items, config, state, log) {
  const length = items.length;
  const timeWrap = tl._timeWrap;
  let curIndex = 0;
  let indexIsDirty = false;

  const refresh = (deep) => {
    if (state.isDestroyed) return;

    try {
      let progress = tl.progress();
      tl.progress(0, true);
      tl._populateWidths();

      if (deep) {
        // Rebuild timeline if deep refresh
        populateTimeline(tl, tl._loopContainer, items, config, log);
      }

      tl._populateOffsets();

      if (deep && tl.draggable && tl.paused()) {
        tl.time(tl._times[curIndex], true);
      } else {
        tl.progress(progress, true);
      }
    } catch (error) {
      log("Error in refresh:", error);
    }
  };

  tl.toIndex = function (index, vars = {}) {
    if (state.isDestroyed) return this;

    try {
      const times = this._times;
      Math.abs(index - curIndex) > length / 2 &&
        (index += index > curIndex ? -length : length);

      let newIndex = gsap.utils.wrap(0, length, index);
      let time = times[newIndex];

      if (time > this.time() !== index > curIndex && index !== curIndex) {
        time += this.duration() * (index > curIndex ? 1 : -1);
      }

      if (time < 0 || time > this.duration()) {
        vars.modifiers = { time: timeWrap };
      }

      curIndex = newIndex;
      vars.overwrite = true;

      // Kill any existing proxy tweens
      if (this._proxy) {
        gsap.killTweensOf(this._proxy);
      }

      scheduleAutoplay(this, config, state, log);

      // Handle updateOnlyOnSettle for programmatic navigation
      if (config.updateOnlyOnSettle && vars.duration !== 0) {
        state.isProgrammaticNavigation = true;

        // Store original onComplete callback if exists
        const originalOnComplete = vars.onComplete;

        vars.onComplete = function () {
          // Reset the flag
          state.isProgrammaticNavigation = false;

          // Manually trigger the change detection for the final position
          if (!state.isDestroyed) {
            const finalIndex = tl.closestIndex(true);

            // Update dots
            updateDots(state.dots, finalIndex);

            // Fire onChange callback
            if (config.onChange) {
              try {
                config.onChange(createPayload(finalIndex, tl, items, config));
              } catch (error) {
                log("Error in onChange callback:", error);
              }
            }
          }

          // Call original onComplete if it existed
          if (originalOnComplete) {
            originalOnComplete.call(this);
          }
        };
      }

      return vars.duration === 0
        ? this.time(timeWrap(time))
        : this.tweenTo(time, vars);
    } catch (error) {
      log("Error in toIndex:", error);
      return this;
    }
  };

  // Other navigation methods remain the same
  tl.closestIndex = function (setCurrent) {
    if (state.isDestroyed) return 0;

    try {
      const times = this._times;
      const index = getClosest(times, this.time(), this.duration());
      if (setCurrent) {
        curIndex = index;
        indexIsDirty = false;
      }
      return index;
    } catch (error) {
      log("Error in closestIndex:", error);
      return 0;
    }
  };

  tl.pauseAutoplay = () => {
    if (state.isDestroyed) return;
    tl.pause();
    killAutoplay(state);
  };

  tl.playAutoplay = () => {
    if (state.isDestroyed) return;
    if (!config.autoplayDelay > 0) {
      config.reversed ? tl.reverse() : tl.play();
    } else {
      scheduleAutoplay(tl, config, state, log);
    }
  };

  tl.current = () => (indexIsDirty ? tl.closestIndex(true) : curIndex);
  tl.next = (vars) => tl.toIndex(tl.current() + 1, vars);
  tl.previous = (vars) => tl.toIndex(tl.current() - 1, vars);
  tl.refresh = refresh;

  // Add resize handler
  const onResize = () => refresh(true);
  state.eventManager.on(window, "resize", onResize);
}

/**
 * Gets closest value from array
 */
function getClosest(values, value, wrap) {
  let i = values.length;
  let closest = 1e10;
  let index = 0;
  let d;

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
}

/**
 * Sets up change detection with debouncing
 */
function setupChangeDetection(tl, items, config, state, lastIndex, log) {
  if (!config.onChange && !config.dots) return;

  let changeTimeout;

  tl.eventCallback("onUpdate", function () {
    if (state.isDestroyed) return;

    try {
      // If updateOnlyOnSettle is true, skip updates during dragging/throwing
      const shouldUpdate =
        !config.updateOnlyOnSettle ||
        (!tl.draggable?.isDragging &&
          !tl.draggable?.isThrowing &&
          !state.isProgrammaticNavigation);

      if (shouldUpdate) {
        const currentIndex = this.closestIndex();
        if (lastIndex !== currentIndex) {
          lastIndex = currentIndex;

          // Debounce rapid changes
          clearTimeout(changeTimeout);
          changeTimeout = setTimeout(() => {
            if (!state.isDestroyed) {
              updateDots(state.dots, currentIndex);
              if (config.onChange) {
                config.onChange(
                  createPayload(currentIndex, this, items, config)
                );
              }
            }
          }, 16); // ~60fps debouncing
        }
      }
    } catch (error) {
      log("Error in change detection:", error);
    }
  });
}

/**
 * Creates payload for callbacks
 */
function createPayload(index, timeline, items, config) {
  return {
    currentItem: items[index],
    currentIndex: index,
    totalItems: items.length,
    progress: timeline.progress(),
    slideWidth: timeline._widths?.[index] || 0,
    timeline: timeline,
    config: { ...config },
  };
}

/**
 * Sets up responsive handling with ResizeObserver
 */
function setupResponsiveHandling(container, items, config, state, log) {
  const updateResponsiveStyles = throttle(() => {
    if (state.isDestroyed) return;
    setupResponsiveStyles(container, items, config, log);
  }, 250);

  // Use ResizeObserver if available, fallback to window resize
  if (typeof ResizeObserver !== "undefined") {
    state.resizeObserver = new ResizeObserver(updateResponsiveStyles);
    state.resizeObserver.observe(container);
  } else {
    state.eventManager.on(window, "resize", updateResponsiveStyles, {
      passive: true,
    });
  }

  // Initial setup
  updateResponsiveStyles();
}

/**
 * Throttle utility
 */
function throttle(func, delay) {
  let timeoutId;
  let lastExecTime = 0;

  return function (...args) {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

/**
 * Sets up responsive styles
 */
function setupResponsiveStyles(container, items, config, log) {
  try {
    const winWidth = window.innerWidth;
    const breakpoints = Object.keys(config.responsive)
      .map(Number)
      .sort((a, b) => a - b);

    let itemsPerRow = config.responsive[breakpoints[0]]?.items || 1;

    for (const bp of breakpoints) {
      if (winWidth >= bp && config.responsive[bp]?.items) {
        itemsPerRow = config.responsive[bp].items;
      }
    }

    if (
      container.style.getPropertyValue("--items-per-row") !==
      String(itemsPerRow)
    ) {
      container.style.setProperty("--items-per-row", itemsPerRow);

      const basis = `0 0 calc(100% / var(--items-per-row) - (var(--gap) * (var(--items-per-row) - 1) / var(--items-per-row)))`;

      items.forEach((child) => {
        if (child.style.flex !== basis) {
          child.style.flex = basis;
        }
      });
    }
  } catch (error) {
    log("Error in responsive styles:", error);
  }
}

/* normalize kill for autoplay call */
function killAutoplay(state) {
  if (state.autoplayCall) {
    try {
      state.autoplayCall.kill();
    } catch (e) {
      console.log("Error killing autoplay call:", e);
    }
    state.autoplayCall = null;
  }
}

/* schedule autoplay (self-reschedules) */
function scheduleAutoplay(timeline, config, state, log) {
  // guard conditions
  if (config.paused || config.autoplayDelay <= 0 || state.isDestroyed) return;

  // clear any previous scheduled call
  killAutoplay(state);

  // schedule next tick
  state.autoplayCall = gsap.delayedCall(config.autoplayDelay, () => {
    if (state.isDestroyed) return;

    try {
      // advance one step
      if (config.reversed) {
        timeline.previous();
      } else {
        timeline.next();
      }
    } catch (err) {
      log?.error
        ? log.error("Autoplay advance error", err)
        : console.error(err);
    }

    // re-schedule the next autoplay only if still allowed
    if (!config.paused && !state.isDestroyed && config.autoplayDelay > 0) {
      scheduleAutoplay(timeline, config, state, log);
    }
  });
}

/* improved setupAutoplay */
function setupAutoplay(timeline, config, state, log) {
  // nothing to do
  if (config.paused || config.autoplayDelay <= 0) return;

  // ensure any previous call is killed
  killAutoplay(state);

  // Page visibility handler (pause when hidden, resume when visible)
  const handleVisibilityChange = () => {
    if (state.isDestroyed) return;
    if (document.hidden) {
      timeline.pause();
      killAutoplay(state);
    } else if (!config.paused) {
      if (!timeline.paused()) {
        config.reversed ? timeline.reverse() : timeline.play();
      }
      scheduleAutoplay(timeline, config, state, log);
    }
  };

  // Optionally pause on blur and resume on focus — reduces wasted CPU when user switches tabs/windows
  const handleBlur = () => {
    if (!state.isDestroyed) {
      timeline.pause();
      killAutoplay(state);
    }
  };
  const handleFocus = () => {
    if (!state.isDestroyed && !config.paused)
      scheduleAutoplay(timeline, config, state, log);
  };

  // Register events via event manager (so cleanup is trivial)
  state.eventManager.on(document, "visibilitychange", handleVisibilityChange, {
    passive: true,
  });
  state.eventManager.on(window, "blur", handleBlur, { passive: true });
  state.eventManager.on(window, "focus", handleFocus, { passive: true });

  // Kick off autoplay
  if (!config.paused) scheduleAutoplay(timeline, config, state, log);
}

function setupNavigation(timeline, container, config, state, log) {
  if (!(config.prevNav || config.nextNav)) return;
  try {
    state.navigation = createNavigationElements(
      timeline,
      container,
      config,
      state,
      log
    );
  } catch (err) {
    (log?.error || console.error)("setupNavigation error:", err);
  }
}

function createNavigationElements(timeline, container, config, state, log) {
  const em = state.eventManager;

  const normalize = (v) => (Array.isArray(v) ? v : [v, {}]);
  const [prevCand, prevOpts] = normalize(config.prevNav || null);
  const [nextCand, nextOpts] = normalize(config.nextNav || null);

  const prevEl = prevCand ? resolveElement(prevCand) : null;
  const nextEl = nextCand ? resolveElement(nextCand) : null;

  if (!prevEl && !nextEl) return { prevButton: null, nextButton: null };

  // unified handler for both click and keydown
  const makeHandler = (dir, opts) => {
    return (e) => {
      if (state.isDestroyed) return;

      // use currentTarget to get the element we attached the listener to
      const ctrl =
        e.currentTarget instanceof HTMLElement ? e.currentTarget : e.target;

      // keyboard: only Enter / Space should activate; preventDefault to avoid native click
      if (e.type === "keydown") {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault(); // important: stops browser from also firing a click later
      }

      // click on anchors should not navigate away
      if (
        e.type === "click" &&
        (ctrl.tagName === "A" || e.target.tagName === "A")
      ) {
        e.preventDefault();
      }

      try {
        if (dir === "prev") timeline.previous(opts);
        else timeline.next(opts);
      } catch (err) {
        (log?.error || console.error)("nav handler error:", err);
      }
    };
  };

  const prevHandler = prevEl ? makeHandler("prev", prevOpts) : null;
  const nextHandler = nextEl ? makeHandler("next", nextOpts) : null;

  // Attach handlers and make elements keyboard-accessible
  if (prevEl) {
    prevEl.setAttribute("role", "button");
    if (!prevEl.hasAttribute("aria-label"))
      prevEl.setAttribute("aria-label", "Previous slide");
    prevEl.tabIndex = prevEl.tabIndex >= 0 ? prevEl.tabIndex : 0;

    em.on(prevEl, "click", prevHandler);
    em.on(prevEl, "keydown", prevHandler); // attach same handler for keydown (no synthetic click)
  }

  if (nextEl) {
    nextEl.setAttribute("role", "button");
    if (!nextEl.hasAttribute("aria-label"))
      nextEl.setAttribute("aria-label", "Next slide");
    nextEl.tabIndex = nextEl.tabIndex >= 0 ? nextEl.tabIndex : 0;

    em.on(nextEl, "click", nextHandler);
    em.on(nextEl, "keydown", nextHandler);
  }

  return { prevButton: prevEl, nextButton: nextEl };
}

// createDotsElements: uses delegation, batches DOM writes, links dots <-> slides for accessibility
function createDotsElements(timeline, items, container, config, state, log) {
  // ensure event manager
  const em = state.eventManager;

  // support tuple [selectorOrElement, opts] or string/element
  const dotsCandidate = Array.isArray(config.dots)
    ? config.dots[0]
    : config.dots;
  const dotsEl = dotsCandidate ? resolveElement(dotsCandidate) : null;

  if (!dotsEl) {
    (log?.debug || console.debug)("Dots: No dots container provided.");
    state.dots = [];
    return [];
  }

  // clear content once using a fragment to minimize reflow
  dotsEl.innerHTML = "";
  const frag = document.createDocumentFragment();
  const buttons = new Array(items.length);

  for (let i = 0; i < items.length; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "carousel-dot";
    btn.dataset.index = String(i);
    btn.id = `carousel-dot-${i}`;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", "false");
    btn.setAttribute("aria-label", `Go to slide ${i + 1}`);
    btn.tabIndex = 0;
    frag.appendChild(btn);
    buttons[i] = btn;
  }

  // set container role (tablist) for better semantics
  dotsEl.setAttribute("role", "tablist");
  dotsEl.appendChild(frag);

  // store for later updates
  state.dots = buttons;

  // single delegated click handler
  const onClick = (e) => {
    if (state.isDestroyed) return;
    const btn = e.target.closest("button[data-index]");
    if (!btn || !dotsEl.contains(btn)) return;
    // allow anchors default only if not our buttons
    e.preventDefault();
    const idx = parseInt(btn.dataset.index, 10);
    timeline.toIndex(
      idx,
      Array.isArray(config.dots) && config.dots[1] ? config.dots[1] : {}
    );
  };

  // single delegated keyboard handler for Enter/Space
  const onKeydown = (e) => {
    if (state.isDestroyed) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    const btn = e.target.closest("button[data-index]");
    if (!btn || !dotsEl.contains(btn)) return;
    e.preventDefault();
    btn.click();
  };

  em.on(dotsEl, "click", onClick);
  em.on(dotsEl, "keydown", onKeydown);

  // set initial active dot (index 0)
  updateDots(
    state.dots,
    timeline.closestIndex ? timeline.closestIndex(true) : 0
  );

  return buttons;
}

// improved updateDots: sets aria-selected and aria-current and toggles active class
function updateDots(dots, index) {
  if (!dots || !dots.length) return;
  // simple, safe loop (avoid try/catch swallowing errors)
  for (let i = 0; i < dots.length; i++) {
    const dot = dots[i];
    const active = i === index;
    dot.classList.toggle("active", active);
    dot.setAttribute("aria-selected", active ? "true" : "false");
    // aria-current is a helpful state for assistive tech (use "true" when active)
    if (active) dot.setAttribute("aria-current", "true");
    else dot.removeAttribute("aria-current");
  }
}

function setupAccessibility(
  timeline,
  container,
  items,
  config = {},
  state = {},
  log
) {
  if (!config.accessibilityEnabled) return;
  const em = state.eventManager || {
    on: (el, ev, fn) => el.addEventListener(ev, fn),
    off: (el, ev, fn) => el.removeEventListener(ev, fn),
  };

  // container role/name/tabindex
  container.setAttribute("role", "region");
  container.setAttribute("aria-roledescription", "carousel");
  if (config.ariaLabel) container.setAttribute("aria-label", config.ariaLabel);
  if (!container.hasAttribute("tabindex"))
    container.setAttribute("tabindex", "0");

  // ensure slides have ids and base attributes
  items.forEach((it, i) => {
    if (!it.id)
      it.id = `hloop-slide-${Math.random().toString(36).slice(2, 9)}-${i}`;
    it.setAttribute("role", "group");
    it.setAttribute("aria-roledescription", "slide");
    it.setAttribute("aria-label", `${i + 1} of ${items.length}`);
    it.setAttribute("aria-hidden", "true");
    it.tabIndex = -1;
  });

  // update active slide accessibility state
  const updateActive = (index) => {
    if (index < 0 || index >= items.length) return;
    items.forEach((s, i) => {
      const active = i === index;
      s.setAttribute("aria-hidden", active ? "false" : "true");
      s.tabIndex = active ? 0 : -1;
      s.classList.toggle("active", active);
    });
  };

  // initial
  updateActive(0);

  // keyboard handler on container
  const onKey = (e) => {
    const activeEl = document.activeElement;
    if (!container.contains(activeEl) && activeEl !== container) return;

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        timeline.previous();
        break;
      case "ArrowRight":
        e.preventDefault();
        timeline.next();
        break;
      case "Home":
        e.preventDefault();
        timeline.toIndex(0);
        break;
      case "End":
        e.preventDefault();
        timeline.toIndex(items.length - 1);
        break;
    }
  };
  em.on(container, "keydown", onKey);

  // timeline update -> updateActive
  const onTimelineUpdate = () => {
    if (state.isDestroyed) return;
    const idx =
      typeof timeline.closestIndex === "function"
        ? timeline.closestIndex(false)
        : 0;
    updateActive(idx);
  };
  if (typeof timeline.eventCallback === "function") {
    timeline.eventCallback("onUpdate", onTimelineUpdate);
    state._accessibilityCallback = { type: "eventCallback" };
  } else {
    // fallback: cheap polling (optional in minimal build)
    let last = -1;
    const ticker = () => {
      const idx =
        typeof timeline.closestIndex === "function"
          ? timeline.closestIndex(false)
          : 0;
      if (idx !== last) {
        last = idx;
        updateActive(idx);
      }
    };
    if (window.gsap && window.gsap.ticker) {
      window.gsap.ticker.add(ticker);
      state._accessibilityTicker = ticker;
      state._accessibilityCallback = { type: "ticker" };
    }
  }

  state.accessibility = { updateActive, onTimelineUpdate, onKey };
}

/**
 * Initializes basic styles
 */
function initStyles(container, items, config) {
  try {
    container.style.setProperty("--gap", config.gap);
    container.style.display = "flex";
    container.style.gap = "var(--gap)";
    container.style.overflowX = "hidden";

    if (!config.responsive) {
      items.forEach((child) => {
        child.style.flex = "0 0 auto";
      });
    }
  } catch (error) {
    console.warn("Error initializing styles:", error);
  }
}

/**
 * Creates comprehensive cleanup function
 */
function createCleanupFunction(state, config, log) {
  return function cleanup() {
    if (state.isDestroyed) return;

    log("Cleaning up carousel...");
    state.isDestroyed = true;

    try {
      // kill the delayedCall for autoplay
      killAutoplay(state);

      // Remove event listeners
      state.eventManager.offAll();

      // Clean up ResizeObserver
      if (state.resizeObserver) {
        state.resizeObserver.disconnect();
        state.resizeObserver = null;
      }

      // Clean up navigation
      if (state.navigation) {
        state.navigation = null;
      }

      // Clean up timeline
      if (state.timeline) {
        state.timeline.kill();
        state.timeline = null;
      }

      log("Cleanup completed");
    } catch (error) {
      log("Error during cleanup:", error);
    }
  };
}

/**
 * Standalone cleanup function
 */
function cleanup(state, config, log) {
  if (state.isDestroyed) return;
  createCleanupFunction(state, config, log)();
}

// Enhanced draggable setup (if needed)
function setupDraggable(timeline, items, config, state, log) {
  if (typeof Draggable === "undefined") {
    log("Draggable plugin not found");
    return;
  }

  if (typeof InertiaPlugin === "undefined") {
    log("InertiaPlugin recommended for momentum-based scrolling and snapping");
  }

  try {
    const proxy = document.createElement("div");
    const wrap = gsap.utils.wrap(0, 1);

    const timeWrap = gsap.utils.wrap(0, timeline.duration());
    const times = timeline._times;
    const widths = timeline._widths;
    const snap =
      config.snap === false ? (v) => v : gsap.utils.snap(config.snap || 1);

    let ratio, startProgress, draggable, wasPlaying;
    let lastSnap, initChangeX;

    const getTotalWidth = () => {
      const length = items.length;
      const xPercents = timeline._xPercents || [];
      const startX = items[0].offsetLeft;
      const spaceBefore = timeline._spaceBefore || [];

      return (
        items[length - 1].offsetLeft +
        (xPercents[length - 1] / 100) * widths[length - 1] -
        startX +
        (spaceBefore[0] || 0) +
        items[length - 1].offsetWidth *
          gsap.getProperty(items[length - 1], "scaleX") +
        (parseFloat(config.gap) || 0)
      );
    };

    const align = () => {
      if (!state.isDestroyed && timeline && draggable) {
        timeline.progress(
          wrap(startProgress + (draggable.startX - draggable.x) * ratio)
        );
      }
    };

    const syncIndex = () => {
      if (!state.isDestroyed && timeline) {
        timeline.closestIndex(true);
      }
    };

    const snapFunction = function (value) {
      if (Math.abs(startProgress / -ratio - this.x) < 10) {
        return lastSnap + initChangeX;
      }

      const duration = timeline.duration();
      let time = -(value * ratio) * duration;
      let wrappedTime = timeWrap(time);

      const currentTime = timeline.time();
      timeline.time(wrappedTime);
      const closestIndex = timeline.closestIndex(false); // Don't set current
      timeline.time(currentTime); // Restore original time

      let snapTime = times[closestIndex];
      let dif = snapTime - wrappedTime;

      if (Math.abs(dif) > duration / 2) {
        dif += dif < 0 ? duration : -duration;
      }

      lastSnap = (time + dif) / duration / -ratio;
      return lastSnap;
    };

    draggable = Draggable.create(proxy, {
      trigger: items[0].parentNode,
      type: "x",
      onPressInit() {
        if (state.isDestroyed) return;

        const x = this.x;
        gsap.killTweensOf(timeline);
        wasPlaying = !timeline.paused();
        timeline.pause();
        startProgress = timeline.progress();

        const totalWidth = getTotalWidth();
        ratio = totalWidth > 0 ? 1 / totalWidth : 1;

        initChangeX = startProgress / -ratio - x;
        gsap.set(proxy, { x: startProgress / -ratio });

        log("Drag init - reusing existing calculations");
      },
      onDrag: align,
      onThrowUpdate: align,
      overshootTolerance: 0,
      inertia: true,
      snap: snapFunction,
      onPress: function () {
        if (!state.isDestroyed) {
          // Stop autoplay using gsap.delayedCall's kill()
          killAutoplay(state);
        }
      },
      onRelease() {
        if (!state.isDestroyed) {
          syncIndex();
          if (draggable.isThrowing) {
            state.indexIsDirty = true;
          }
        }
      },
      onThrowComplete() {
        if (!state.isDestroyed) {
          syncIndex();
          if (wasPlaying) {
            if (config.reversed) {
              timeline.reverse();
            } else {
              timeline.play();
            }
          }

          // Handle updateOnlyOnSettle callback here
          if (config.updateOnlyOnSettle && (config.onChange || config.dots)) {
            try {
              const finalIndex = timeline.closestIndex(true);
              // Update dots if enabled
              if (config.dots && state.dots?.length > 0) {
                updateDots(state.dots, finalIndex);
              }

              // Fire onChange callback if provided
              if (config.onChange && typeof config.onChange === "function") {
                const payload = createPayload(
                  finalIndex,
                  timeline,
                  items,
                  config
                );
                config.onChange(payload);
              }
              log(
                `onThrowComplete: Final position reached at index ${finalIndex}`
              );
            } catch (error) {
              log("Error in updateOnlyOnSettle callback:", error);
            }
          }

          if (!config.paused && config.autoplayDelay > 0) {
            // console.warn("Autoplay is enabled. It will resume after dragging.");
            scheduleAutoplay(timeline, config, state, log);
          }
        }
      },
    })[0];

    timeline.draggable = draggable;
  } catch (error) {
    log("Error setting up draggable:", error);
  }
}

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = horizontalLoop;
} else if (typeof define === "function" && define.amd) {
  define([], () => horizontalLoop);
}
