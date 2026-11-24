// After a build, tag the stylesheet and script links in index.html with a short hash of their
// contents (site.css?v=1a2b3c4d), so browsers fetch the new files right after a deploy instead
// of mixing a fresh page with a cached stylesheet.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

const hash = (f) => createHash("sha1").update(readFileSync(f)).digest("hex").slice(0, 8);
let html = readFileSync("index.html", "utf8");
html = html.replace(/href="css\/site\.css(\?v=\w+)?"/, `href="css/site.css?v=${hash("css/site.css")}"`);
html = html.replace(/src="js\/app\.js(\?v=\w+)?"/, `src="js/app.js?v=${hash("js/app.js")}"`);
writeFileSync("index.html", html);
