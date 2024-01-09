import { writable } from "svelte/store";
import type { Writable } from "svelte/store";
import type { NDKRelay, NDKRelayStatus, NDKRelayUrl } from "@nostr-dev-kit/ndk";

export type RelayObject = {
  object: NDKRelay;
  status: NDKRelayStatus;
};

export type RelayObjects = {
  [key: NDKRelayUrl]: RelayObject;
};

function getRelays() {
  const relays: Writable<RelayObjects> = writable<RelayObjects>({});
  const { subscribe, update, set } = relays;

  const fill = (relays: NDKRelay[]): void => {
    const parsed: RelayObjects = {};
    for (const relay of relays) {
      parsed[relay.url] = {
        object: relay,
        status: relay.status,
      };
    }
    set(parsed);
  };

  const updateRelayStatus = (
    url: NDKRelayUrl,
    status: NDKRelayStatus,
  ): void => {
    update((relays: RelayObjects): RelayObjects => {
      relays[url].status = status;
      return relays;
    });
  };
  const clear = () => set({});

  return {
    subscribe,
    clear,
    fill,
    updateRelayStatus,
  };
}

export const relays = getRelays();
