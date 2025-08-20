// Mobile menu toggle
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.querySelector(".hamburger");
  const navMenu = document.querySelector(".nav-menu");

  hamburger?.addEventListener("click", function () {
    navMenu.classList.toggle("active");
  });

  // Close mobile menu when clicking on a link
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("active");
    });
  });
});

// Download functionality
function downloadCarousel() {
  // In a real implementation, this would download the actual file
  // For demo purposes, we'll show an alert with download info

  const downloadUrl =
    "https://sagarsantra1.github.io/GSAPCarousel/gsap-carousel.min.js";

  // Create a temporary link element and trigger download
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = "gsap-carousel.min.js";
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Show success message
  showNotification("Download started! Check your downloads folder.", "success");
}

// Code copying functionality
function copyCode(elementId) {
  const codeElement = document.getElementById(elementId);
  const text = codeElement.textContent;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      showNotification("Code copied to clipboard!", "success");
    })
    .catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      showNotification("Code copied to clipboard!", "success");
    });
}

// Notification system
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  notification.style.cssText = `
          position: fixed;
          top: 90px;
          right: 20px;
          background: ${type === "success" ? "#16C47F" : "#fd7c1a"};
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          font-weight: 500;
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.3s ease;
      `;

  document.body.appendChild(notification);

  // Animate in
  requestAnimationFrame(() => {
    notification.style.opacity = "1";
    notification.style.transform = "translateX(0)";
  });

  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateX(100%)";
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}
