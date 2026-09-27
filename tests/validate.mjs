import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dist = path.join(root, "dist");

const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const css = fs.readFileSync(path.join(dist, "styles.css"), "utf8");
const js = fs.readFileSync(path.join(dist, "app.js"), "utf8");
const bootstrap = fs.readFileSync(path.join(dist, "privacy-bootstrap.js"), "utf8");

new vm.Script(js);
new vm.Script(bootstrap);

const requiredFiles = ["index.html", "styles.css", "app.js", "privacy-bootstrap.js"];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(dist, file))) throw new Error(`Missing ${file}`);
}

const requiredEvents = [
  "trial_page_view",
  "trial_start",
  "option_select",
  "draft_generated",
  "trial_complete",
  "application_click"
];
for (const event of requiredEvents) {
  if (!js.includes(`\"${event}\"`)) throw new Error(`Missing event ${event}`);
}

const forbiddenNames = ["Escort", "Uru", "エスコート", "ウル", "hair-escort.info"];
for (const value of forbiddenNames) {
  if (html.includes(value) || js.includes(value) || css.includes(value)) {
    throw new Error(`Real store identifier found: ${value}`);
  }
}

for (const ref of ["./styles.css", "./app.js"]) {
  if (!html.includes(ref)) throw new Error(`Missing asset reference ${ref}`);
}

if (!css.includes("@media (max-width: 760px)")) throw new Error("Missing mobile breakpoint");
if (!html.includes("複数でも選べます") && !html.includes("1つでも2つでも選べます")) throw new Error("Missing multiple-selection guidance");
if (!html.includes("投稿せずに終了")) throw new Error("Missing no-post choice");
if (!js.includes("localStorage") || !js.includes("sessionStorage")) throw new Error("Missing anonymous local measurement");
for (const marker of ["trial_session_id", "utm_id", "utm_content", "ALLOWED_QUERY_VALUES", "localRetentionDays", "normalizeAttributionUrl", "ONCE_PER_SESSION"]) {
  if (!js.includes(marker)) throw new Error(`Missing privacy/attribution marker ${marker}`);
}
for (const marker of ["analytics_storage", "denied", "history.replaceState", "#privacy"]) {
  if (!bootstrap.includes(marker)) throw new Error(`Missing early privacy bootstrap marker ${marker}`);
}
if (html.indexOf("privacy-bootstrap.js") > html.indexOf("./styles.css")) throw new Error("Privacy bootstrap must be in head before later tags/GTM");
if (!js.includes("sessionStorage.removeItem(CONFIG.sessionKey)") || !js.includes("sessionStorage.removeItem(CONFIG.onceKey)")) throw new Error("Consent denial must remove measurement session data");
if (!/function track\([^)]*\) \{\s*if \(consentState === "denied"\) return;/.test(js)) throw new Error("Denied consent must return before creating measurement session data");
if (!js.includes("loadAnalyticsAfterConsent") || !js.includes('consentState !== "granted"')) throw new Error("Analytics script must load only after consent");
if (html.includes("googletagmanager.com") || bootstrap.includes("googletagmanager.com")) throw new Error("HTML/bootstrap must not load GTM before consent");
if (js.includes("freeText.value,")) throw new Error("Possible raw free text in event payload");

console.log("PASS: static assets, JavaScript syntax, privacy guard, events, and responsive marker validated.");
