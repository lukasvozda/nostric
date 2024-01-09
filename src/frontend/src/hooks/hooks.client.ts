import { localKeyStorage } from "$lib/stores/LocalStorage";
import { get } from "svelte/store";
import { NostrUserHandler } from "$lib/nostr";
import { authUser } from "$lib/stores/Auth";

const privateKey: string | null = get(localKeyStorage);

if (privateKey) {
  const nostrUser: NostrUserHandler = NostrUserHandler.getInstance(privateKey);
  nostrUser.initExistingUser().then(() => {
    authUser.setNostrUserHandler(nostrUser);
    authUser.setNostrAuthenticated();
  });
}

export async function handleError({ error, event, status, message }) {
  console.error(error, event, status, message);
}
