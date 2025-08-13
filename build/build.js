const fs = require("fs");
const { minify } = require("terser");

async function buildLibrary() {
  const source = fs.readFileSync("src/gsap-carousel.js", "utf8");

  // Copy unminified version
  fs.writeFileSync("dist/gsap-carousel.js", source);

  // Create minified version
  const minified = await minify(source, {
    compress: true,
    mangle: true,
  });

  fs.writeFileSync("dist/gsap-carousel.min.js", minified.code);
  console.log("Build complete!");
}

buildLibrary();
