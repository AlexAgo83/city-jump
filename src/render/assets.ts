declare const __APP_VERSION__: string;

/**
 * render.yaml serves /buildings/* for a year with immutable caching; every model URL must carry
 * this package-derived query key so a release that changes assets also refreshes returning users.
 */
export const ASSET_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "test";
