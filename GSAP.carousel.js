/**
 * Creates a seamless, responsive, looping horizontal carousel using GSAP.
 * Production-ready version with enhanced error handling, performance, and accessibility.
 * @param {string|HTMLElement} containerEl - Selector or DOM element containing slide items.
 * @param {Object} [config] - Configuration options.
 * @param {Object|null} [config.responsive=null] - Responsive breakpoints mapping to itemsPerRow.
 * @param {number} [config.speed=1] - Speed multiplier (1 ≈ 100px/s).
 * @param {string} [config.gap='0px'] - Gap between items (CSS length).
 * @param {boolean} [config.draggable=false] - Enable Draggable support.
 * @param {number} [config.repeat=0] - Number of loop repeats (-1 for infinite).
 * @param {boolean} [config.paused=true] - Whether to start paused.
 * @param {number} [config.autoplayTimeout=0] - Delay between auto-advances (s).
 * @param {boolean} [config.reversed=false] - Reverse loop direction.
 * @param {boolean} [config.navigation=false] - Enable prev/next buttons.
 * @param {boolean} [config.dots=false] - Enable pagination dots.
 * @param {number|false} [config.snap=1] - Snap increment (false to disable).
 * @param {Function|null} [config.onChange=null] - Callback on slide change.
 * @param {boolean} [config.center=false] - Center mode.
 * @param {boolean} [config.updateOnlyOnSettle=false] - Fire onChange only when user interaction settles at final destination, not during intermediate slide changes.
 * @param {boolean} [config.navStyle=false] - Inject navigation CSS styles.
 * @param {Function|null} [config.onInitialized=null] - Called after initialization.
 * @param {boolean} [config.debug=false] - Enable debug logging.
 * @returns {GSAPTimeline|null} Configured GSAP timeline with controls and cleanup method.
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
  const container = validateAndGetContainer(itemsContainer);
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

  // Debug logging
  const log = createLogger(debug);
  log("Initializing horizontal loop with config:", validatedConfig);

  // State management
  const state = {
    isDestroyed: false,
    timeline: null,
    navigation: null,
    dots: [],
    resizeObserver: null,
    autoplayTimeout: null,
    eventListeners: new Map(),
    isProgrammaticNavigation: false,
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
 * Validates container element and returns it if valid
 */
function validateAndGetContainer(itemsContainer) {
  try {
    let container;

    if (typeof itemsContainer === "string") {
      container = document.querySelector(itemsContainer);
      if (!container) {
        console.error(
          `horizontalLoop: Element with selector "${itemsContainer}" not found`
        );
        return null;
      }
    } else if (itemsContainer instanceof Element) {
      container = itemsContainer;
    } else {
      console.error(
        "horizontalLoop: Container must be a string selector or DOM Element"
      );
      return null;
    }

    // Additional container validation
    if (!container.parentNode) {
      console.error("horizontalLoop: Container must be attached to the DOM");
      return null;
    }

    return container;
  } catch (error) {
    console.error("horizontalLoop: Error validating container:", error);
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
    updateOnlyOnSettle: false,
    onInitialized: null,
    debug: false,
    // Production-specific options
    errorRecovery: true,
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

    case "autoplayTimeout":
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

  // Inject styles if needed
  if (config.navStyle) {
    injectCarouselStyles();
  }

  // Create GSAP context for proper cleanup
  return gsap.context(() => {
    const timeline = createTimeline(container, items, config, state, log);

    if (!timeline) return null;

    // Setup additional features
    setupNavigation(timeline, container, config, state, log);
    setupDots(timeline, items, container, config, state, log);
    setupAutoplay(timeline, config, state, log);
    setupAccessibility(timeline, container, items, config, state, log);

    // Setup error recovery
    if (config.errorRecovery) {
      setupErrorRecovery(timeline, config, log);
    }

    state.timeline = timeline;

    // Call initialization callback
    if (config.onInitialized) {
      try {
        config.onInitialized(createPayload(0, timeline, items, config));
      } catch (error) {
        log("Error in onInitialized callback:", error);
      }
    }

    return timeline;
  });
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
      paused: config.autoplayTimeout > 0 || config.paused,
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
    if (config.reversed && !config.autoplayTimeout) {
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

    const container =
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
      let b1 = container.getBoundingClientRect();
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
        ? (tl.duration() * (container.offsetWidth / 2)) / totalWidth
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
    tl._container = container;

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
/**
 * Adds navigation methods to timeline with center support
 */
function addNavigationMethods(tl, items, config, state, log) {
  const length = items.length;
  const timeWrap = tl._timeWrap;
  let curIndex = 0;
  let indexIsDirty = false;

  // Enhanced refresh function with center support
  const refresh = (deep) => {
    if (state.isDestroyed) return;

    try {
      let progress = tl.progress();
      tl.progress(0, true);
      tl._populateWidths();

      if (deep) {
        // Rebuild timeline if deep refresh
        populateTimeline(tl, tl._container, items, config, log);
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

  // Enhanced toIndex method with center support
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

  tl.current = () => (indexIsDirty ? tl.closestIndex(true) : curIndex);
  tl.next = (vars) => tl.toIndex(tl.current() + 1, vars);
  tl.previous = (vars) => tl.toIndex(tl.current() - 1, vars);
  tl.refresh = refresh;

  // Add resize handler
  const onResize = () => refresh(true);
  window.addEventListener("resize", onResize);

  // Store cleanup reference
  state.eventListeners.set("timeline-resize", onResize);
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
    addEventListener("resize", updateResponsiveStyles, { passive: true });
    state.eventListeners.set("resize", updateResponsiveStyles);
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

/**
 * Enhanced autoplay setup
 */
function setupAutoplay(timeline, config, state, log) {
  if (config.paused || config.autoplayTimeout <= 0) return;

  // Clear any existing timer using gsap.delayedCall kill()
  if (state.autoplayTimeout) state.autoplayTimeout.kill();

  // Setup visibility change handling
  const handleVisibilityChange = () => {
    if (state.isDestroyed) return;
    if (document.hidden) {
      timeline.pause();
      if (state.autoplayTimeout) state.autoplayTimeout.kill();
    } else if (!config.paused) {
      if (!timeline.paused()) {
        config.reversed ? timeline.reverse() : timeline.play();
      }
      scheduleAutoplay(timeline, config, state, log);
    }
  };
  addEventListener("visibilitychange", handleVisibilityChange);
  state.eventListeners.set("visibilitychange", handleVisibilityChange);

  if (!config.paused) {
    scheduleAutoplay(timeline, config, state, log);
  }
}

/**
 * Schedules autoplay with error handling
 */
function scheduleAutoplay(timeline, config, state, log) {
  if (config.paused || config.autoplayTimeout <= 0 || state.isDestroyed) return;

  if (state.autoplayTimeout) state.autoplayTimeout.kill();

  state.autoplayTimeout = gsap.delayedCall(config.autoplayTimeout, () => {
    if (state.isDestroyed) return;
    try {
      config.reversed || timeline.reversed()
        ? timeline.previous()
        : timeline.next();
    } catch (error) {
      log("Error in autoplay:", error);
    }
  });
}

/**
 * Enhanced navigation setup
 */
function setupNavigation(timeline, container, config, state, log) {
  if (!config.navigation) return;

  try {
    const navigation = createNavigationElements(
      timeline,
      container,
      config,
      log
    );
    state.navigation = navigation;
  } catch (error) {
    log("Error setting up navigation:", error);
  }
}

/**
 * Creates navigation elements
 */
function createNavigationElements(timeline, container, config, log) {
  const existingPrev = config.prevNav
    ? document.querySelector(config.prevNav)
    : null;
  const existingNext = config.nextNav
    ? document.querySelector(config.nextNav)
    : null;
  const navContainer = config.navigationContainer
    ? document.querySelector(config.navigationContainer)
    : null;

  let prevBtn = existingPrev;
  let nextBtn = existingNext;
  let wrapper = null;
  const createdElements = [];

  // Event handlers
  const handlePrev = (e) => {
    e.preventDefault();
    timeline.previous();
  };

  const handleNext = (e) => {
    e.preventDefault();
    timeline.next();
  };

  // Create buttons if needed
  if (!prevBtn || !nextBtn) {
    wrapper = document.createElement("div");
    wrapper.className = "gsap-carousel-nav";
    createdElements.push(wrapper);

    if (!prevBtn) {
      prevBtn = createButton("Previous", "gsap-carousel-prev", handlePrev);
      wrapper.appendChild(prevBtn);
      createdElements.push(prevBtn);
    }

    if (!nextBtn) {
      nextBtn = createButton("Next", "gsap-carousel-next", handleNext);
      wrapper.appendChild(nextBtn);
      createdElements.push(nextBtn);
    }

    // Append to container
    if (navContainer) {
      navContainer.appendChild(wrapper);
    } else if (container.parentNode) {
      container.parentNode.insertBefore(wrapper, container.nextSibling);
    }
  }

  // Add listeners to existing buttons
  if (existingPrev) existingPrev.addEventListener("click", handlePrev);
  if (existingNext) existingNext.addEventListener("click", handleNext);

  return {
    destroy() {
      if (existingPrev) existingPrev.removeEventListener("click", handlePrev);
      if (existingNext) existingNext.removeEventListener("click", handleNext);

      createdElements.forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    },
    prevButton: prevBtn,
    nextButton: nextBtn,
    wrapper,
  };
}

/**
 * Creates a navigation button
 */
function createButton(text, className, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  button.className = className;
  button.setAttribute("aria-label", text);
  button.addEventListener("click", handler);
  return button;
}

/**
 * Enhanced dots setup
 */
function setupDots(timeline, items, container, config, state, log) {
  if (!config.dots) return;

  try {
    const dots = createDotsElements(timeline, items, container, config, log);
    state.dots = dots;
  } catch (error) {
    log("Error setting up dots:", error);
  }
}

/**
 * Creates dots elements
 */
function createDotsElements(timeline, items, container, config, log) {
  const customContainer = config.dotsContainer
    ? document.querySelector(config.dotsContainer)
    : null;

  const wrapper = document.createElement("div");
  wrapper.className = "gsap-carousel-dots";

  const fragment = document.createDocumentFragment();
  const dots = [];

  // Create dots
  for (let i = 0; i < items.length; i++) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "gsap-carousel-dot";
    dot.setAttribute("data-index", i.toString());
    dot.setAttribute("aria-label", `Go to slide ${i + 1}`);

    if (i === 0) dot.classList.add("active");

    fragment.appendChild(dot);
    dots.push(dot);
  }

  wrapper.appendChild(fragment);

  // Event delegation
  wrapper.addEventListener("click", (e) => {
    const dot = e.target.closest(".gsap-carousel-dot");
    if (!dot) return;

    const index = parseInt(dot.getAttribute("data-index"), 10);
    if (!isNaN(index)) {
      timeline.toIndex(index);
    }
  });

  // Keyboard navigation
  wrapper.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.target.click();
    }
  });

  // Append to container
  if (customContainer) {
    customContainer.appendChild(wrapper);
  } else if (container.parentNode) {
    container.parentNode.insertBefore(wrapper, container.nextSibling);
  }

  return dots;
}

/**
 * Updates active dot
 */
function updateDots(dots, index) {
  if (!dots || !dots.length) return;

  try {
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
      dot.setAttribute("aria-selected", i === index ? "true" : "false");
    });
  } catch (error) {
    // Silent fail for dots update
  }
}

/**
 * Sets up accessibility features
 */
function setupAccessibility(timeline, container, items, config, state, log) {
  if (!config.accessibilityEnabled) return;

  try {
    // Container accessibility
    container.setAttribute("role", "region");
    container.setAttribute("aria-label", "carousel");

    // Items accessibility
    items.forEach((item, index) => {
      item.setAttribute("role", "group");
      item.setAttribute("aria-roledescription", "slide");
      item.setAttribute("aria-label", `${index + 1} of ${items.length}`);
    });

    // Keyboard navigation
    const handleKeydown = (e) => {
      if (!container.contains(document.activeElement)) return;

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

    container.addEventListener("keydown", handleKeydown);
    container.setAttribute("tabindex", "0");

    // Store cleanup
    state.eventListeners.set("keydown", handleKeydown);
  } catch (error) {
    log("Error setting up accessibility:", error);
  }
}

/**
 * Sets up error recovery mechanisms
 */
function setupErrorRecovery(timeline, config, log) {
  // Global error handler
  const originalOnError = window.onerror;

  window.onerror = function (message, source, lineno, colno, error) {
    if (message.includes("horizontalLoop") || message.includes("gsap")) {
      log("Carousel error detected:", {
        message,
        source,
        lineno,
        colno,
        error,
      });

      // Attempt recovery
      try {
        if (timeline && !timeline.paused()) {
          timeline.pause();
        }
      } catch (e) {
        log("Error recovery failed:", e);
      }
    }

    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
  };
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
 * Injects carousel styles
 */
function injectCarouselStyles() {
  if (document.getElementById("gsap-carousel-styles")) return;

  const css = `
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
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: #fff;
      color: #333;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
    }
    
    .gsap-carousel-nav button:hover:not(:disabled) {
      background-color: #f5f5f5;
      border-color: #999;
    }
    
    .gsap-carousel-nav button:active:not(:disabled) {
      transform: scale(0.95);
    }
    
    .gsap-carousel-nav button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .gsap-carousel-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
      padding: 10px 0;
    }
    
    .gsap-carousel-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: var(--gsap-carousel-dot-bg, #ccc);
      cursor: pointer;
      border: none;
      padding: 0;
      transition: all 0.3s ease;
    }
    
    .gsap-carousel-dot:hover {
      background-color: var(--gsap-carousel-dot-bg-hover, #999);
    }
    
    .gsap-carousel-dot.active {
      background-color: var(--gsap-carousel-dot-bg-active, #333);
    }
    
    @media (prefers-reduced-motion: reduce) {
      .gsap-carousel-nav button,
      .gsap-carousel-dot {
        transition: none;
      }
    }
  `;

  const style = document.createElement("style");
  style.id = "gsap-carousel-styles";
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
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
      // Clear timeouts
      clearTimeout(state.autoplayTimeout);

      // Clean up ResizeObserver
      if (state.resizeObserver) {
        state.resizeObserver.disconnect();
        state.resizeObserver = null;
      }

      // Remove event listeners
      state.eventListeners.forEach((handler, event) => {
        window.removeEventListener(event, handler);
      });
      state.eventListeners.clear();

      // Clean up navigation
      if (state.navigation) {
        state.navigation.destroy();
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
          if (state.autoplayTimeout) state.autoplayTimeout.kill();
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

          if (!config.paused && config.autoplayTimeout > 0) {
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
