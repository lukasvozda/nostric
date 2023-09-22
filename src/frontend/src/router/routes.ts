import Login from "../components/Login.svelte";
import Feed from "../components/Feed.svelte";
import Profile from "../components/profile/Profile.svelte";
import CreateProfile from "../components/profile/CreateProfile.svelte";
import Settings from "../components/Settings.svelte";
import BasicLayout from "../layouts/BasicLayout.svelte";
import { is_registered, is_not_registered } from "../store/auth";
import WebSockets from "../WebSockets.svelte";

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  CREATE_PROFILE: "/create-profile",
  SETTINGS: "/settings",
  PROFILE: "/profile",
  EDIT_PROFILE: "/edit-profile",
  RELAYS: "/relays",
  NOSTRIC_PRO: "/pro",
  FOLLOWING: "/following",
}

export const routes = [
  {
    name: ROUTES.HOME,
    component: Feed,
    layout: BasicLayout,
    onlyIf: {
      guard: () => is_registered(),
      redirect: is_not_registered() ? ROUTES.CREATE_PROFILE : ROUTES.LOGIN,
    }
  },
  { name: ROUTES.LOGIN, component: Login },
  {
    name: ROUTES.CREATE_PROFILE,
    component: CreateProfile,
    onlyIf: {
      guard: () => is_not_registered(),
      redirect: is_registered() ? ROUTES.HOME : ROUTES.LOGIN,
    }
  },
  {
    name: ROUTES.SETTINGS,
    layout: BasicLayout,
    component: Settings,
    onlyIf: {
      guard: () => is_registered(),
      redirect: is_not_registered() ? ROUTES.CREATE_PROFILE : ROUTES.LOGIN,
    }
  },
  {
    name: ROUTES.PROFILE,
    layout: BasicLayout,
    component: Profile,
    onlyIf: {
      guard: () => is_registered(),
      redirect: is_not_registered() ? ROUTES.CREATE_PROFILE : ROUTES.LOGIN,
    }
  },
  {
    name: ROUTES.SETTINGS + ROUTES.EDIT_PROFILE,
    layout: BasicLayout,
    component: Settings,
    onlyIf: {
      guard: () => is_registered(),
      redirect: is_not_registered() ? ROUTES.CREATE_PROFILE : ROUTES.LOGIN,
    }
  },
  {
    name: ROUTES.SETTINGS + ROUTES.RELAYS,
    layout: BasicLayout,
    component: Settings,
    onlyIf: {
      guard: () => is_registered(),
      redirect: is_not_registered() ? ROUTES.CREATE_PROFILE : ROUTES.LOGIN,
    }
  },
  {
    name: ROUTES.SETTINGS + ROUTES.FOLLOWING,
    layout: BasicLayout,
    component: Settings,
    onlyIf: {
      guard: () => is_registered(),
      redirect: is_not_registered() ? ROUTES.CREATE_PROFILE : ROUTES.LOGIN,
    }
  },
  {
    name: ROUTES.SETTINGS + ROUTES.NOSTRIC_PRO,
    layout: BasicLayout,
    component: Settings,
    onlyIf: {
      guard: () => is_registered(),
      redirect: is_not_registered() ? ROUTES.CREATE_PROFILE : ROUTES.LOGIN,
    }
  },
  {
    name: "ws-dev",
    component: WebSockets,
  },
]
