const RESERVED_PATHS = new Set([
  "about", "apps", "collections", "codespaces", "events", "explore", "features", "issues",
  "login", "marketplace", "new", "notifications", "organizations", "orgs", "pricing",
  "pulls", "search", "security", "settings", "signup", "sponsors", "topics", "trending",
]);

export function assessTabObservation(tab) {
  if (!tab || !Number.isInteger(tab.id) || tab.id < 0 ||
      !Number.isInteger(tab.windowId) || tab.windowId < 0 ||
      tab.active !== true || tab.incognito !== false || tab.status !== "complete" ||
      tab.pendingUrl != null || typeof tab.url !== "string" || !tab.url) {
    return { state: "access-unavailable" };
  }

  let url;
  try {
    url = new URL(tab.url);
  } catch {
    return { state: "unsupported" };
  }
  if (url.origin !== "https://github.com" || url.username || url.password) {
    return { state: "unsupported" };
  }

  const match = /^\/([^/]+)\/([^/]+)\/?$/.exec(url.pathname);
  const owner = match?.[1];
  const repository = match?.[2];
  const validOwner = owner && owner.length <= 39 &&
    /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(owner) &&
    !RESERVED_PATHS.has(owner.toLowerCase());
  const validRepository = repository && repository.length <= 100 &&
    /^[A-Za-z0-9._-]+$/.test(repository) && repository !== "." && repository !== "..";
  return {
    state: "github",
    repositoryCandidate: validOwner && validRepository ? `${owner}/${repository}` : null,
  };
}
