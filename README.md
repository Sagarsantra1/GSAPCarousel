# Horizontal Loop Carousel

A production-ready, seamless horizontal carousel component built with GSAP (GreenSock Animation Platform). Features responsive design, touch/mouse dragging, autoplay, navigation controls, pagination dots, and comprehensive accessibility support.

## Features

- 🔄 **Seamless infinite looping** with no gaps or jumps
- 📱 **Fully responsive** with breakpoint-based configuration
- 🎯 **Touch & mouse dragging** with momentum scrolling
- ⚡ **High performance** using GSAP's optimized animations
- ♿ **Accessibility compliant** with ARIA support and keyboard navigation
- 🎮 **Navigation controls** with customizable prev/next buttons
- 📍 **Pagination dots** with click-to-navigate functionality
- ⏯️ **Autoplay support** with pause on interaction
- 🎨 **Center mode** for highlighting active slides
- 🛠️ **Extensive API** for programmatic control
- 🐛 **Debug mode** for development
- 🧹 **Proper cleanup** to prevent memory leaks

## Dependencies

### Required

- [GSAP](https://greensock.com/gsap/) 3.x

### Optional

- [Draggable Plugin](https://greensock.com/draggable/) - For touch/mouse dragging
- [InertiaPlugin](https://greensock.com/inertia/) - For momentum-based scrolling (requires GSAP membership)

## Installation

```bash
# Install GSAP
npm install gsap

# Or include via CDN
```

```html

```

## Quick Start

### Basic HTML Structure

```html
Slide 1 Slide 2 Slide 3 Slide 4 Previous Next
```

### Basic CSS

```css
.carousel-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.carousel-item {
  min-width: 300px;
  height: 200px;
  background: #f0f0f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Pagination dots styling */
.carousel-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  background: #ccc;
  margin: 0 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.carousel-dot.active {
  background: #007bff;
}
```

### Basic JavaScript

```javascript
// Simple initialization
const carousel = horizontalLoop(".carousel-container");

// With navigation and options
const carousel = horizontalLoop(".carousel-container", {
  speed: 1,
  gap: "20px",
  draggable: true,
  autoplayDelay: 3,
  prevNav: "#prev-btn",
  nextNav: "#next-btn",
  dots: "#dots-container",
});
```

## Configuration Options

| Option                 | Type                     | Default      | Description                                    |
| ---------------------- | ------------------------ | ------------ | ---------------------------------------------- |
| `responsive`           | `Object\|null`           | `null`       | Responsive breakpoints mapping                 |
| `speed`                | `number`                 | `1`          | Speed multiplier (1 ≈ 100px/s)                 |
| `gap`                  | `string`                 | `"0px"`      | Gap between items (CSS length)                 |
| `draggable`            | `boolean`                | `false`      | Enable mouse/touch dragging                    |
| `repeat`               | `number`                 | `0`          | Number of loop repeats (-1 for infinite)       |
| `paused`               | `boolean`                | `true`       | Whether carousel starts paused                 |
| `autoplayDelay`        | `number`                 | `0`          | Delay in seconds between advances (0 disables) |
| `reversed`             | `boolean`                | `false`      | Reverse loop direction                         |
| `prevNav`              | `Element\|string\|Array` | `null`       | Previous navigation element                    |
| `nextNav`              | `Element\|string\|Array` | `null`       | Next navigation element                        |
| `dots`                 | `Element\|string\|Array` | `null`       | Pagination dots container                      |
| `snap`                 | `number\|false`          | `1`          | Snap increment in slides (false to disable)    |
| `onChange`             | `Function\|null`         | `null`       | Callback when visible slide changes            |
| `center`               | `boolean`                | `false`      | Enable center mode                             |
| `updateOnlyOnSettle`   | `boolean`                | `false`      | Fire onChange only after settling              |
| `onInitialized`        | `Function\|null`         | `null`       | Callback after initialization                  |
| `ariaLabel`            | `string`                 | `"Carousel"` | ARIA label for accessibility                   |
| `debug`                | `boolean`                | `false`      | Enable debug logging                           |
| `accessibilityEnabled` | `boolean`                | `true`       | Enable accessibility features                  |

## Advanced Examples

### Responsive Carousel

```javascript
const carousel = horizontalLoop(".carousel-container", {
  responsive: {
    0: { items: 1 }, // Mobile: 1 item
    768: { items: 2 }, // Tablet: 2 items
    1024: { items: 3 }, // Desktop: 3 items
    1440: { items: 4 }, // Large: 4 items
  },
  gap: "20px",
  draggable: true,
  autoplayDelay: 4,
});
```

### Full-Featured Carousel

```javascript
const carousel = horizontalLoop(".carousel-container", {
  // Layout
  gap: "24px",
  center: true,

  // Behavior
  speed: 1.2,
  draggable: true,
  snap: 1,

  // Autoplay
  autoplayDelay: 5,
  paused: false,
  reversed: false,

  // Navigation
  prevNav: ["#prev-btn", { duration: 0.5, ease: "power2.inOut" }],
  nextNav: ["#next-btn", { duration: 0.5, ease: "power2.inOut" }],
  dots: ["#dots-container", { duration: 0.3 }],

  // Callbacks
  onChange: (data) => {
    console.log("Current slide:", data.currentIndex);
    updateSlideInfo(data);
  },

  onInitialized: (data) => {
    console.log("Carousel initialized with", data.totalItems, "slides");
  },

  // Performance
  updateOnlyOnSettle: true,

  // Accessibility
  ariaLabel: "Product showcase carousel",
  accessibilityEnabled: true,

  // Debug
  debug: false,
});

function updateSlideInfo(data) {
  document.querySelector("#slide-counter").textContent = `${
    data.currentIndex + 1
  } / ${data.totalItems}`;
}
```

### Programmatic Control

```javascript
const carousel = horizontalLoop(".carousel-container", {
  draggable: true,
  dots: "#dots-container",
});

// Navigation methods
carousel.next(); // Go to next slide
carousel.previous(); // Go to previous slide
carousel.toIndex(2); // Go to specific slide
carousel.toIndex(5, { duration: 1 }); // With custom animation

// Playback control
carousel.playAutoplay(); // Start autoplay
carousel.pauseAutoplay(); // Pause autoplay

// State methods
const currentIndex = carousel.current(); // Get current slide index
const closestIndex = carousel.closestIndex(); // Get closest slide

// Refresh after DOM changes
carousel.refresh(); // Light refresh (recalc dimensions)

// Cleanup when done
carousel.cleanup(); // Remove all listeners and animations
```

## API Reference

### Methods

#### `toIndex(index, options?)`

Navigate to a specific slide index.

```javascript
carousel.toIndex(3); // Jump to slide 3
carousel.toIndex(0, { duration: 1 }); // Animate to first slide
carousel.toIndex(-1, { ease: "bounce.out" }); // Go to last slide
```

#### `next(options?)` / `previous(options?)`

Navigate to the next or previous slide.

```javascript
carousel.next(); // Next slide
carousel.previous({ duration: 0.8 }); // Previous with custom timing
```

#### `current()`

Get the current slide index.

```javascript
const currentSlide = carousel.current(); // Returns number
```

#### `closestIndex(setCurrent?)`

Get the index of the slide closest to the current position.

```javascript
const closest = carousel.closestIndex(); // Get index
const closest = carousel.closestIndex(true); // Get and set as current
```

#### `playAutoplay()` / `pauseAutoplay()`

Control autoplay functionality.

```javascript
carousel.playAutoplay(); // Start autoplay
carousel.pauseAutoplay(); // Stop autoplay
```

#### `refresh(deep?)`

Recalculate dimensions and positions.

```javascript
carousel.refresh(); // Light refresh
carousel.refresh(true); // Deep refresh (rebuilds timeline)
```

#### `cleanup()`

Destroy the carousel and clean up all resources.

```javascript
carousel.cleanup(); // Clean up everything
```

### Callback Data

Both `onChange` and `onInitialized` callbacks receive a data object:

```javascript
{
  currentItem: HTMLElement,    // Current slide element
  currentIndex: number,        // Current slide index
  totalItems: number,          // Total number of slides
  progress: number,            // Timeline progress (0-1)
  slideWidth: number,          // Width of current slide
  timeline: GSAPTimeline,      // GSAP timeline instance
  config: Object              // Merged configuration
}
```

## Responsive Configuration

The `responsive` option allows different settings at different screen widths:

```javascript
const carousel = horizontalLoop(".carousel-container", {
  responsive: {
    0: {
      items: 1,
      // Add other mobile-specific options here
    },
    768: {
      items: 2,
      // Add tablet-specific options here
    },
    1024: {
      items: 3,
      // Add desktop-specific options here
    },
  },
});
```

Currently, only the `items` property is supported in responsive breakpoints, which controls how many items are visible at each breakpoint.

## Accessibility Features

The carousel includes comprehensive accessibility support:

- **ARIA attributes**: Proper roles and labels
- **Keyboard navigation**: Arrow keys, Home, End
- **Screen reader support**: Slide announcements
- **Focus management**: Proper tab order
- **Semantic HTML**: Uses appropriate roles and landmarks

### Keyboard Controls

- `←` / `→` Arrow keys: Navigate slides
- `Home`: Go to first slide
- `End`: Go to last slide
- `Enter` / `Space`: Activate navigation buttons and dots

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- iOS Safari 12+
- Android Chrome 60+

## Performance Tips

1. **Use `will-change: transform`** on carousel items for better performance
2. **Limit the number of slides** for optimal performance (< 50 recommended)
3. **Use `updateOnlyOnSettle: true`** for heavy onChange callbacks
4. **Enable `debug: false`** in production
5. **Call `cleanup()`** when removing carousels to prevent memory leaks

## Common Issues & Solutions

### Slides not visible

Ensure slides have proper dimensions and the container has a defined width.

```css
.carousel-item {
  min-width: 300px; /* Ensure minimum width */
  height: 200px; /* Ensure height */
}
```

### Dragging not working

Make sure the Draggable plugin is loaded and `draggable: true` is set.

### Autoplay not starting

Check that `autoplayDelay` is greater than 0 and `paused` is false.

### Layout issues with responsive

Ensure your CSS supports the CSS custom properties used by the responsive system.

## License

This carousel component is built on top of GSAP. Please ensure you have the appropriate GSAP license for your use case:

- **Free for most use cases** including commercial websites
- **Paid license required** for some applications (check GSAP licensing)

## Contributing

Contributions are welcome! Please:

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Test across different browsers

## Changelog

### Version 1.0.0

- Initial release
- Full feature set with accessibility
- Production-ready error handling
- Comprehensive API

---

For more examples and advanced usage, check the `/examples` directory in the repository.
