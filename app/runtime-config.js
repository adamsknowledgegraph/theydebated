const inferredApiBase = (() => {
  const host = window.location.hostname;
  if (host === "theydebated.com" || host === "www.theydebated.com") {
    return "https://api.theydebated.com";
  }
  return "";
})();

window.theyDebatedConfig = Object.assign(
  {
    apiBase: inferredApiBase,
    adminMode: false,
    adminToken: ""
  },
  window.theyDebatedConfig || {}
);
