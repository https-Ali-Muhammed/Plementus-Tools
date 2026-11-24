import { assessTabObservation } from "./tab-observation.mjs";

// Chrome serializes this function into the page; keep it self-contained.
export function readGithubPage(repositoryCandidate) {
  try {
    if (location.origin !== "https://github.com" || typeof repositoryCandidate !== "string" ||
        !/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repositoryCandidate) ||
        ![`/${repositoryCandidate}`, `/${repositoryCandidate}/`].includes(location.pathname) ||
        typeof document.title !== "string") return null;

    const clean = value => value.replace(/[\u0000-\u001f\u007f\s]+/g, " ").trim();
    const fullTitle = clean(document.title);
    const urlSecrets = [location.search, location.hash,
      ...new URLSearchParams(location.search).values()]
      .map(value => value.replace(/^[?#]/, ""))
      .flatMap(value => {
        try { return [value, decodeURIComponent(value)]; } catch { return [value]; }
      }).filter(Boolean);
    if (!fullTitle || urlSecrets.some(value => fullTitle.includes(value) ||
        (value.length > 160 && fullTitle.startsWith(value.slice(0, 160))))) return null;
    const title = fullTitle.slice(0, 160).trim();

    const headingText = document.querySelector("#repository-container-header h1")?.textContent;
    const heading = typeof headingText === "string" ? clean(headingText) : "";
    return {
      origin: "https://github.com",
      repositoryCandidate,
      title,
      heading: heading.length <= 140 && heading.replace(/\s*\/\s*/, "/") === repositoryCandidate ? heading : null,
    };
  } catch {
    return null;
  }
}

export function validateGithubPageResult(value, repositoryCandidate) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join(",") !== "heading,origin,repositoryCandidate,title" ||
      value.origin !== "https://github.com" || value.repositoryCandidate !== repositoryCandidate ||
      typeof value.title !== "string" || !value.title || value.title.length > 160 ||
      value.title !== value.title.trim() || /[\u0000-\u001f\u007f]/.test(value.title) ||
      !(value.heading === null || (typeof value.heading === "string" &&
        value.heading.length <= 140 && value.heading.replace(/\s*\/\s*/, "/") === repositoryCandidate))) return null;
  return value;
}

export function sameGithubTab(tab, reviewed) {
  const result = assessTabObservation(tab);
  return Boolean(reviewed && tab && tab.id === reviewed.id && tab.windowId === reviewed.windowId &&
    tab.url === reviewed.url && result.state === "github" &&
    result.repositoryCandidate === reviewed.repositoryCandidate);
}
