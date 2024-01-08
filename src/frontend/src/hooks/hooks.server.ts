import type { Handle } from "@sveltejs/kit";
import { get_path, ROUTES } from "$lib/utils/routes";
import { redirect } from "@sveltejs/kit";
import { building } from "$app/environment";

export const handle: Handle = async ({ event, resolve }): Promise<Response> => {
  // hooks are being run during build and it causes error,
  // this prevents it;
  if (building) {
    return resolve(event);
  }

  let currentPath: string = event.url.pathname;
  const { cookies } = event;
  const userStatus: string | undefined = cookies.get("auth");

  if (userStatus) {
    event.locals.user = userStatus;
  } else if (
    !currentPath.startsWith(get_path(ROUTES.EXPLORE)) &&
    !currentPath.startsWith(get_path(ROUTES.POST)) &&
    !currentPath.startsWith(get_path(ROUTES.USER)) &&
    !currentPath.startsWith(get_path(ROUTES.SIGN_IN))
  ) {
    throw redirect(303, get_path(ROUTES.SIGN_IN));
  }

  return resolve(event);
};
