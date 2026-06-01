// Public store + contact links for the marketing site.
//
// The app is pre-submission, so the store URLs are intentionally empty: the
// <AppStoreBadge> renders its "Coming soon" state while a URL is blank, and
// turns into a live link the moment one is filled in. Flip these on at launch —
// no other change to the site is required.

export const APP_STORE_URL = "";
export const PLAY_STORE_URL = "";

export const CONTACT_EMAIL = "contact.theosis@gmail.com";

/** True once a real store URL has been set above. */
export const isAppStoreLive = APP_STORE_URL.length > 0;
export const isPlayStoreLive = PLAY_STORE_URL.length > 0;
