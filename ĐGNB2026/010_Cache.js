/**
 * 010_Cache.js
 * Cache keys, versions, and invalidation.
 *
 * This project uses the shared global scope of Google Apps Script.
 */

function getCacheVersion_(scope) {
  const props = PropertiesService.getScriptProperties();
  const normalizedScope = normalizeCacheVersionScope_(scope);
  const key = APP_CACHE_PREFIX + ':VERSION:' + normalizedScope;
  const version = props.getProperty(key);
  if (version) return version;
  props.setProperty(key, '1');
  return '1';
}

function invalidateAppCache_(scope) {
  const props = PropertiesService.getScriptProperties();
  const normalizedScope = normalizeCacheVersionScope_(scope);
  const key = APP_CACHE_PREFIX + ':VERSION:' + normalizedScope;
  props.setProperty(key, String(Date.now()));
}

function isDynamicDataCacheVersionScope_(scope) {
  const text = String(scope || '');
  return text.indexOf(CACHE_SCOPE_DATA + ':khoa:') === 0 || text.indexOf(CACHE_SCOPE_DATA + ':form:') === 0;
}

function normalizeCacheVersionScope_(scope) {
  return isDynamicDataCacheVersionScope_(scope) ? CACHE_SCOPE_DATA : String(scope || CACHE_SCOPE_DATA);
}

function cleanupObsoleteCacheVersionProperties_() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  const prefix = APP_CACHE_PREFIX + ':VERSION:';
  const obsoleteKeys = Object.keys(allProps).filter(key => {
    if (key.indexOf(prefix) !== 0) return false;
    const scope = key.slice(prefix.length);
    return isDynamicDataCacheVersionScope_(scope);
  });

  obsoleteKeys.forEach(key => props.deleteProperty(key));
  return {
    success: true,
    deleted: obsoleteKeys.length
  };
}

function getRuntimePropertyStats_() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const keys = Object.keys(props);
  const cacheVersionPrefix = APP_CACHE_PREFIX + ':VERSION:';
  const sessionStorePrefix = typeof SESSION_PROP_PREFIX !== 'undefined' ? SESSION_PROP_PREFIX : 'SESSION_STORE_V1_';
  const obsoleteCacheVersionCount = keys.filter(key => {
    if (key.indexOf(cacheVersionPrefix) !== 0) return false;
    return isDynamicDataCacheVersionScope_(key.slice(cacheVersionPrefix.length));
  }).length;

  return {
    total: keys.length,
    cacheVersions: keys.filter(key => key.indexOf(cacheVersionPrefix) === 0).length,
    obsoleteCacheVersions: obsoleteCacheVersionCount,
    sessionStores: keys.filter(key => key.indexOf(sessionStorePrefix) === 0).length
  };
}

function invalidateConfigCaches_() {
  invalidateAppCache_(CACHE_SCOPE_CONFIG);
  invalidateAppCache_(CACHE_SCOPE_SETTINGS);
  invalidateAppCache_(CACHE_SCOPE_DEPARTMENT);
  invalidateAppCache_(CACHE_SCOPE_DATA);
  invalidateAppCache_(CACHE_SCOPE_DASHBOARD);
}

function buildCacheKey_(scope, name) {
  const raw = [
    APP_CACHE_PREFIX,
    scope,
    getCacheVersion_(scope),
    name
  ].join(':');
  return raw.length <= 240 ? raw : raw.slice(0, 180) + ':' + sha256Hex_(raw).slice(0, 40);
}

function getCachedJson_(scope, name, ttlSeconds, producer) {
  const cache = CacheService.getScriptCache();
  const key = buildCacheKey_(scope, name);
  const cached = cache.get(key);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.__cacheChunked === true && parsed.base && parsed.count) {
        const chunkKeys = [];
        for (let i = 0; i < Number(parsed.count || 0); i++) {
          chunkKeys.push(parsed.base + ':p:' + i);
        }
        const chunks = cache.getAll(chunkKeys);
        const raw = chunkKeys.map(chunkKey => chunks[chunkKey] || '').join('');
        if (raw && raw.length === Number(parsed.length || 0)) {
          return JSON.parse(raw);
        }
        cache.remove(key);
      } else {
        return parsed;
      }
    } catch (e) {
      cache.remove(key);
    }
  }

  const value = producer();
  if (value && typeof value === 'object' && value.success === false) {
    return value;
  }
  try {
    const raw = JSON.stringify(value);
    if (raw.length <= APP_CACHE_MAX_CHARS) {
      cache.put(key, raw, ttlSeconds || CACHE_TTL_SHORT_SECONDS);
    } else if (raw.length <= APP_CACHE_MAX_TOTAL_CHARS) {
      const ttl = ttlSeconds || CACHE_TTL_SHORT_SECONDS;
      const base = buildCacheKey_(scope, name + ':chunkbase:' + sha256Hex_(name).slice(0, 16));
      const chunks = {};
      const count = Math.ceil(raw.length / APP_CACHE_CHUNK_CHARS);
      for (let i = 0; i < count; i++) {
        chunks[base + ':p:' + i] = raw.slice(i * APP_CACHE_CHUNK_CHARS, (i + 1) * APP_CACHE_CHUNK_CHARS);
      }
      cache.putAll(chunks, ttl);
      cache.put(key, JSON.stringify({
        __cacheChunked: true,
        base: base,
        count: count,
        length: raw.length
      }), ttl);
    }
  } catch (e) {}
  return value;
}

function buildUserDataCacheName_(user, viewName, params) {
  const raw = JSON.stringify({
    view: viewName,
    username: user && user.username,
    role: user && user.role,
    roles: user && user.roles,
    quyenTruyCap: user && user.quyenTruyCap,
    phanCong: user && user.phanCong,
    params: params || {}
  });
  return viewName + ':' + sha256Hex_(raw);
}

function buildDataKhoaScope_(khoa) {
  return CACHE_SCOPE_DATA + ':khoa:' + sha256Hex_(foldText_(khoa || '')).slice(0, 16);
}

function buildDataFormScope_(idKetQua, maGop) {
  const raw = String(idKetQua || '').trim() + '|' + foldText_(maGop || '');
  return CACHE_SCOPE_DATA + ':form:' + sha256Hex_(raw).slice(0, 16);
}

function buildScopedCacheName_(baseName, extraScopes) {
  const scopes = Array.isArray(extraScopes) ? extraScopes.filter(Boolean) : [];
  if (scopes.length === 0) return baseName;
  const versionToken = scopes.map(scope => scope + '=' + getCacheVersion_(scope)).join('|');
  return baseName + ':sv:' + sha256Hex_(versionToken).slice(0, 24);
}

function buildScopedUserDataCacheName_(user, viewName, params, extraScopes) {
  return buildScopedCacheName_(buildUserDataCacheName_(user, viewName, params), extraScopes);
}

function invalidateDataCacheForChange_(khoa, maGop, idKetQua) {
  if (khoa) invalidateAppCache_(buildDataKhoaScope_(khoa));
  if (maGop || idKetQua) invalidateAppCache_(buildDataFormScope_(idKetQua, maGop));
  invalidateAppCache_(CACHE_SCOPE_DASHBOARD);
}
