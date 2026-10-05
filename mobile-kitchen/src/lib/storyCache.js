let cachedStoryGroups = []

export function getCachedStoryGroups() {
  return cachedStoryGroups
}

export function setCachedStoryGroups(groups) {
  cachedStoryGroups = Array.isArray(groups) ? groups : []
  return cachedStoryGroups
}
