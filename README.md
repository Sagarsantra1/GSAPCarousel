# GSAP Carousel

A production-ready, seamless horizontal carousel component built with GSAP (GreenSock Animation Platform). This carousel provides smooth infinite scrolling, responsive design, accessibility features, and extensive customization options.

## Features

- **Seamless Infinite Loop** - Smooth continuous scrolling without visible resets
- **Responsive Design** - Configurable breakpoints with different items per row
- **Touch & Mouse Dragging** - Optional drag-to-scroll functionality with momentum
- **Autoplay** - Configurable automatic advancement with pause/resume controls
- **Navigation Controls** - Previous/next buttons with keyboard support
- **Pagination Dots** - Visual indicators with click-to-navigate functionality
- **Accessibility Ready** - Full ARIA support, keyboard navigation, and screen reader compatibility
- **Center Mode** - Option to center the active slide in the viewport
- **Performance Optimized** - Debounced updates, efficient DOM manipulation, and memory management
- **Production Ready** - Comprehensive error handling, cleanup methods, and debugging tools

## Installation

## Installation Guide

Download the minified JavaScript file from [GSAP Carousel Downloads](https://sagarsantra1.github.io/GSAPCarousel/). Once downloaded, include the file in your project by adding the following script tag to your HTML:

```html
<script src="path/to/gsap-carousel.min.js"></script>
```

Replace "path/to" with the actual path where you saved the file.

### Prerequisites

This carousel requires GSAP (GreenSock Animation Platform):

```html
<!-- Required -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>

<!-- Optional: For drag functionality -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/Draggable.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/InertiaPlugin.min.js"></script>
```

### Include the Script

```html
<script src="path/to/gsap-carousel.min.js"></script>
```

Or import as a module:

```javascript
import horizontalLoop from "./gsap-carousel.min.js";
```

## Basic Usage

### HTML Structure

```html
<div id="carousel-container">
  <div class="slide">Slide 1</div>
  <div class="slide">Slide 2</div>
  <div class="slide">Slide 3</div>
  <div class="slide">Slide 4</div>
</div>
```

### Initialize Carousel

```javascript
// Basic initialization
const carousel = horizontalLoop("#carousel-container", {
  speed: 1,
  gap: "20px",
  paused: false,
});

// With full configuration
const carousel = horizontalLoop("#carousel-container", {
  responsive: {
    0: { items: 1 },
    768: { items: 2 },
    1024: { items: 3 },
  },
  speed: 1.5,
  gap: "20px",
  draggable: true,
  autoplayDelay: 3,
  prevNav: "#prev-btn",
  nextNav: "#next-btn",
  dots: "#dots-container",
  center: true,
  onChange: (payload) => {
    console.log("Current slide:", payload.currentIndex);
  },
});
```

## Configuration Options

| Option                 | Type                         | Default      | Description                                      |
| ---------------------- | ---------------------------- | ------------ | ------------------------------------------------ |
| `responsive`           | `Object\|null`               | `null`       | Breakpoint configuration for responsive behavior |
| `speed`                | `number`                     | `1`          | Animation speed multiplier (1 ≈ 100px/s)         |
| `gap`                  | `string`                     | `"0px"`      | Space between carousel items                     |
| `draggable`            | `boolean`                    | `false`      | Enable touch/mouse dragging                      |
| `repeat`               | `number`                     | `0`          | Number of loop cycles (-1 for infinite)          |
| `paused`               | `boolean`                    | `true`       | Start in paused state                            |
| `autoplayDelay`        | `number`                     | `0`          | Seconds between auto-advances (0 disables)       |
| `reversed`             | `boolean`                    | `false`      | Reverse animation direction                      |
| `prevNav`              | `HTMLElement\|string\|Array` | `null`       | Previous button element or selector              |
| `nextNav`              | `HTMLElement\|string\|Array` | `null`       | Next button element or selector                  |
| `dots`                 | `HTMLElement\|string\|Array` | `null`       | Dots container element or selector               |
| `snap`                 | `number\|false`              | `1`          | Snap increment in slides                         |
| `center`               | `boolean`                    | `false`      | Center active slide in viewport                  |
| `updateOnlyOnSettle`   | `boolean`                    | `false`      | Fire onChange only after animations complete     |
| `onChange`             | `Function\|null`             | `null`       | Callback when active slide changes               |
| `onInitialized`        | `Function\|null`             | `null`       | Callback after carousel initialization           |
| `ariaLabel`            | `string`                     | `"Carousel"` | ARIA label for accessibility                     |
| `debug`                | `boolean`                    | `false`      | Enable console debugging                         |
| `accessibilityEnabled` | `boolean`                    | `true`       | Enable accessibility features                    |

## API Methods

### Navigation Methods

```javascript
// Navigate to specific slide
carousel.toIndex(2);

// Navigate with animation options
carousel.toIndex(2, { duration: 1, ease: "power2.out" });

// Navigate to next/previous
carousel.next();
carousel.previous();

// Get current slide index
const currentIndex = carousel.current();
```

### Playback Control

```javascript
// Pause/resume autoplay
carousel.pauseAutoplay();
carousel.playAutoplay();

// Standard GSAP timeline controls
carousel.play();
carousel.pause();
carousel.reverse();
```

### Utility Methods

```javascript
// Refresh layout (useful after dynamic content changes)
carousel.refresh();

// Deep refresh (rebuilds timeline)
carousel.refresh(true);

// Get closest slide index to current position
const index = carousel.closestIndex();

// Cleanup (remove all event listeners and animations)
carousel.cleanup();
```

## Responsive Configuration

Configure different layouts for various screen sizes:

```javascript
const carousel = horizontalLoop("#carousel", {
  responsive: {
    0: { items: 1 }, // Mobile: 1 item
    640: { items: 2 }, // Tablet: 2 items
    1024: { items: 3 }, // Desktop: 3 items
    1280: { items: 4 }, // Large: 4 items
  },
  gap: "20px",
});
```

## Event Callbacks

### onChange Callback

Fired when the active slide changes:

```javascript
const carousel = horizontalLoop("#carousel", {
  onChange: (payload) => {
    console.log("Current item:", payload.currentItem);
    console.log("Current index:", payload.currentIndex);
    console.log("Total items:", payload.totalItems);
    console.log("Progress:", payload.progress);
    console.log("Slide width:", payload.slideWidth);
  },
});
```

### onInitialized Callback

Fired after carousel setup completes:

```javascript
const carousel = horizontalLoop("#carousel", {
  onInitialized: (payload) => {
    console.log("Carousel ready!", payload);
  },
});
```

## Advanced Examples

### Full-Featured Carousel

```html
<div class="carousel-wrapper">
  <button id="prev">←</button>
  <div id="carousel">
    <div class="slide">Content 1</div>
    <div class="slide">Content 2</div>
    <div class="slide">Content 3</div>
  </div>
  <button id="next">→</button>
  <div id="dots"></div>
</div>
```

```javascript
const carousel = horizontalLoop("#carousel", {
  responsive: {
    0: { items: 1 },
    768: { items: 2 },
    1024: { items: 3 },
  },
  speed: 1.2,
  gap: "24px",
  draggable: true,
  autoplayDelay: 4,
  prevNav: "#prev",
  nextNav: "#next",
  dots: "#dots",
  center: true,
  onChange: ({ currentIndex, currentItem }) => {
    // Update UI based on current slide
    updateSlideCounter(currentIndex);
    updateSlideContent(currentItem);
  },
});
```

### Dynamic Content Updates

```javascript
// Add new slides dynamically
function addSlides(newSlides) {
  const container = document.querySelector("#carousel");
  newSlides.forEach((slide) => container.appendChild(slide));

  // Refresh carousel to recognize new slides
  carousel.refresh(true);
}

// Remove slides
function removeSlide(index) {
  const slides = document.querySelectorAll("#carousel .slide");
  if (slides[index]) {
    slides[index].remove();
    carousel.refresh(true);
  }
}
```

## Styling

### Basic CSS

```css
.carousel-container {
  overflow: hidden;
  width: 100%;
}

.slide {
  min-width: 0; /* Allows flex shrinking */
  /* Your slide styles */
}

/* Navigation buttons */
.nav-button {
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  padding: 12px 16px;
  cursor: pointer;
  border-radius: 4px;
}

.nav-button:hover {
  background: rgba(0, 0, 0, 0.7);
}

/* Pagination dots */
.carousel-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.3);
  margin: 0 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.carousel-dot.active {
  background: #007bff;
}
```

## Browser Support

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile**: iOS Safari 12+, Chrome Mobile 60+
- **Requirements**: ES6 support, GSAP 3.x

## Performance Tips

1. **Use `updateOnlyOnSettle`** for expensive onChange callbacks
2. **Enable `debug: false`** in production
3. **Call `cleanup()`** when removing carousels from DOM
4. **Use CSS transforms** instead of changing layout properties
5. **Optimize images** and content within slides

## Troubleshooting

### Common Issues

**Carousel not initializing:**

- Ensure GSAP is loaded before the carousel script
- Check that the container element exists in the DOM
- Verify container has child elements

**Dragging not working:**

- Include GSAP Draggable plugin
- Set `draggable: true` in configuration
- Ensure InertiaPlugin is loaded for momentum scrolling

**Responsive not updating:**

- Check that responsive object syntax is correct
- Verify breakpoints are in ascending order
- Call `refresh(true)` after dynamic layout changes

### Debug Mode

Enable debug mode for detailed logging:

```javascript
const carousel = horizontalLoop("#carousel", {
  debug: true,
});

// Access debug information
console.log(carousel.getState());
```

## License

This project is available under the MIT License.

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting pull requests.

## Support

For issues and questions:

- Check the troubleshooting section
- Review GSAP documentation
- Open an issue with a minimal reproduction case
