export const ROUTES = {
  FEED: "feed",
  EXPLORE: "explore",
  NOTIFICATIONS: "notifications",
  PROFILE: "profile",
  BOOKMARKS: "bookmarks",
  SETTINGS: "settings",
  RELAYS: "relays",
  PRO: "pro",
  SIGN_IN: "sign-in",
  USER: "user",
  POST: "post",
  INBOX: "inbox",
  SEARCH: "search",
  IMAGES: "images",
  FOLLOWERS: "followers",
  FOLLOWING: "following"
};

export const get_path = (...names: string[]): string => {
  return `/${names.join("/")}`;
};
