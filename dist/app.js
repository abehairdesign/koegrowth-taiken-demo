(function () {
  "use strict";

  const CONFIG = {
    applicationUrl: "",
    gtmContainerId: "",
    storageKey: "koegrowth_trial_events_v1",
    sessionKey: "koegrowth_trial_session_v1",
    consentKey: "koegrowth_trial_consent_v1",
    onceKey: "koegrowth_trial_once_v1",
    localRetentionDays: 7
  };

  const ALLOWED_QUERY_VALUES = {
    source: ["ppt_lastpage"],
    utm_source: ["sales_deck"],
    utm_medium: ["pptx"],
    utm_campaign: ["selfstart_trial_202609"],
    utm_id: ["kg_ss_demo_202609"],
    utm_content: ["slide8_primary", "slide8_qr"]
  };

  const ONCE_PER_SESSION = new Set([
    "trial_page_view", "trial_start", "draft_generated", "trial_complete", "application_click"
  ]);
  const pendingEvents = [];
  let analyticsScriptLoaded = false;
  let consentState = sessionStorage.getItem(CONFIG.consentKey) || "pending";

  function normalizeAttributionUrl() {
    const current = new URL(window.location.href);
    const safeHash = ["#top", "#privacy"].includes(current.hash) ? current.hash : "";
    const cleaned = new URL(current.pathname + safeHash, current.origin);
    Object.keys(ALLOWED_QUERY_VALUES).forEach((name) => {
      const value = current.searchParams.get(name) || "";
      if (ALLOWED_QUERY_VALUES[name].includes(value)) cleaned.searchParams.set(name, value);
    });
    if (cleaned.href !== current.href) history.replaceState(null, "", cleaned.href);
  }

  normalizeAttributionUrl();
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  const screens = Array.from(document.querySelectorAll(".screen"));
  const progressCopy = document.getElementById("progress-copy");
  const progressBar = document.getElementById("progress-bar");
  const freeText = document.getElementById("free-text");
  const charCount = document.getElementById("char-count");
  const draftText = document.getElementById("draft-text");
  const selectionError = document.getElementById("selection-error");
  const confirmError = document.getElementById("confirm-error");
  const confirmCheckbox = document.getElementById("confirm-checkbox");
  const applicationDialog = document.getElementById("application-dialog");
  const consentBanner = document.getElementById("consent-banner");

  const progress = {
    intro: ["はじめに", "12%"],
    select: ["感じたこと", "40%"],
    draft: ["下書き確認", "72%"],
    complete: ["体験完了", "100%"]
  };

  function safeParam(name) {
    const value = new URLSearchParams(window.location.search).get(name) || "";
    return (ALLOWED_QUERY_VALUES[name] || []).includes(value) ? value : "";
  }

  function getSessionId() {
    let id = sessionStorage.getItem(CONFIG.sessionKey);
    if (!id) {
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "trial-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      sessionStorage.setItem(CONFIG.sessionKey, id);
    }
    return id;
  }

  function alreadyTracked(eventName) {
    if (!ONCE_PER_SESSION.has(eventName)) return false;
    const seen = new Set(JSON.parse(sessionStorage.getItem(CONFIG.onceKey) || "[]"));
    if (seen.has(eventName)) return true;
    seen.add(eventName);
    sessionStorage.setItem(CONFIG.onceKey, JSON.stringify([...seen]));
    return false;
  }

  function emit(event) {
    window.dataLayer.push(event);
    try {
      const cutoff = Date.now() - CONFIG.localRetentionDays * 24 * 60 * 60 * 1000;
      const saved = JSON.parse(localStorage.getItem(CONFIG.storageKey) || "[]")
        .filter((item) => Date.parse(item.timestamp || 0) >= cutoff);
      saved.push(event);
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(saved.slice(-200)));
    } catch (_) {
      // Storage can be unavailable in privacy mode. The experience must still work.
    }
    document.dispatchEvent(new CustomEvent("koegrowth:analytics", { detail: event }));
  }

  function loadAnalyticsAfterConsent() {
    if (analyticsScriptLoaded || !CONFIG.gtmContainerId || consentState !== "granted") return;
    analyticsScriptLoaded = true;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(CONFIG.gtmContainerId);
    document.head.appendChild(script);
  }

  function track(eventName, properties) {
    if (consentState === "denied") return;
    if (alreadyTracked(eventName)) return;
    const event = {
      event: eventName,
      timestamp: new Date().toISOString(),
      trial_session_id: getSessionId(),
      source: safeParam("source") || "direct",
      utm_source: safeParam("utm_source"),
      utm_medium: safeParam("utm_medium"),
      utm_campaign: safeParam("utm_campaign"),
      utm_id: safeParam("utm_id"),
      utm_content: safeParam("utm_content"),
      ...properties
    };
    if (consentState === "granted") emit(event);
    else if (consentState === "pending") pendingEvents.push(event);
  }

  function setConsent(nextState) {
    consentState = nextState;
    sessionStorage.setItem(CONFIG.consentKey, nextState);
    consentBanner.hidden = true;
    if (nextState === "granted") {
      gtag("consent", "update", { analytics_storage: "granted" });
      loadAnalyticsAfterConsent();
      pendingEvents.splice(0).forEach(emit);
    } else {
      pendingEvents.length = 0;
      localStorage.removeItem(CONFIG.storageKey);
      sessionStorage.removeItem(CONFIG.sessionKey);
      sessionStorage.removeItem(CONFIG.onceKey);
    }
  }

  if (consentState !== "pending") consentBanner.hidden = true;
  if (consentState === "granted") {
    gtag("consent", "update", { analytics_storage: "granted" });
    loadAnalyticsAfterConsent();
  }
  document.getElementById("consent-allow").addEventListener("click", () => setConsent("granted"));
  document.getElementById("consent-deny").addEventListener("click", () => setConsent("denied"));

  function showScreen(name) {
    screens.forEach((screen) => screen.classList.toggle("is-active", screen.dataset.screen === name));
    progressCopy.textContent = progress[name][0];
    progressBar.style.width = progress[name][1];
    document.querySelector(".trial-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectedValues() {
    return Array.from(document.querySelectorAll('.choice input[type="checkbox"]:checked')).map((input) => input.value);
  }

  function normalizeSentence(value) {
    const cleaned = value.trim().replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ");
    if (!cleaned) return "";
    return /[。！？!?]$/.test(cleaned) ? cleaned : cleaned + "。";
  }

  function buildDraft() {
    const selected = selectedValues();
    const ownWords = normalizeSentence(freeText.value);
    return selected.concat(ownWords ? [ownWords] : []).join("");
  }

  function buildApplicationUrl() {
    const destination = new URL(CONFIG.applicationUrl, window.location.href);
    destination.searchParams.set("trial_session_id", getSessionId());
    ["source", "utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_content"].forEach((name) => {
      const value = safeParam(name);
      if (value) destination.searchParams.set(name, value);
    });
    return destination.toString();
  }

  document.getElementById("start-button").addEventListener("click", () => {
    track("trial_start", { step: 1 });
    showScreen("select");
  });

  document.querySelectorAll('.choice input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", () => {
      selectionError.textContent = "";
      track("option_select", {
        category: input.dataset.category,
        action: input.checked ? "select" : "deselect",
        selected_count: selectedValues().length
      });
    });
  });

  freeText.addEventListener("input", () => {
    charCount.textContent = freeText.value.length + " / 120";
    selectionError.textContent = "";
  });

  document.getElementById("generate-button").addEventListener("click", () => {
    const selectedCount = selectedValues().length;
    if (selectedCount === 0 && !freeText.value.trim()) {
      selectionError.textContent = "当てはまるものを1つ選ぶか、自分の言葉を入力してください。";
      return;
    }
    draftText.value = buildDraft();
    confirmCheckbox.checked = false;
    track("draft_generated", {
      selected_count: selectedCount,
      free_text_used: Boolean(freeText.value.trim()),
      draft_length_bucket: draftText.value.length < 60 ? "short" : draftText.value.length < 120 ? "medium" : "long"
    });
    showScreen("draft");
  });

  document.getElementById("copy-button").addEventListener("click", async (event) => {
    try {
      await navigator.clipboard.writeText(draftText.value);
      event.currentTarget.textContent = "コピーしました";
    } catch (_) {
      draftText.select();
      event.currentTarget.textContent = "文章を選択しました";
    }
  });

  document.getElementById("complete-button").addEventListener("click", () => {
    if (!confirmCheckbox.checked) {
      confirmError.textContent = "内容が自分の気持ちと合っているか確認してください。";
      return;
    }
    confirmError.textContent = "";
    track("trial_complete", { completion_type: "confirmed" });
    showScreen("complete");
  });

  document.getElementById("stop-button").addEventListener("click", () => {
    track("trial_complete", { completion_type: "not_posted" });
    showScreen("complete");
  });

  document.getElementById("application-button").addEventListener("click", () => {
    track("application_click", { destination_configured: Boolean(CONFIG.applicationUrl) });
    if (CONFIG.applicationUrl) {
      window.location.href = buildApplicationUrl();
    } else {
      applicationDialog.showModal();
    }
  });

  document.querySelectorAll("[data-back]").forEach((button) => {
    button.addEventListener("click", () => showScreen(button.dataset.back));
  });

  document.getElementById("restart-button").addEventListener("click", () => {
    document.querySelectorAll('.choice input[type="checkbox"]').forEach((input) => { input.checked = false; });
    freeText.value = "";
    charCount.textContent = "0 / 120";
    draftText.value = "";
    confirmCheckbox.checked = false;
    showScreen("intro");
  });

  document.querySelector(".dialog-close").addEventListener("click", () => applicationDialog.close());
  document.querySelector(".dialog-ok").addEventListener("click", () => applicationDialog.close());

  track("trial_page_view", { page: "review_draft_trial" });
})();
