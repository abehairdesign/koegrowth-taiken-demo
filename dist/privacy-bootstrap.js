(function () {
  "use strict";

  const allowed = {
    source: ["ppt_lastpage"],
    utm_source: ["sales_deck"],
    utm_medium: ["pptx"],
    utm_campaign: ["selfstart_trial_202609"],
    utm_id: ["kg_ss_demo_202609"],
    utm_content: ["slide8_primary", "slide8_qr"]
  };
  const current = new URL(window.location.href);
  const safeHash = ["#top", "#privacy"].includes(current.hash) ? current.hash : "";
  const cleaned = new URL(current.pathname + safeHash, current.origin);
  Object.keys(allowed).forEach((name) => {
    const value = current.searchParams.get(name) || "";
    if (allowed[name].includes(value)) cleaned.searchParams.set(name, value);
  });
  if (cleaned.href !== current.href) history.replaceState(null, "", cleaned.href);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag("consent", "default", { analytics_storage: "denied" });
  window.KG_ALLOWED_QUERY_VALUES = allowed;
})();
