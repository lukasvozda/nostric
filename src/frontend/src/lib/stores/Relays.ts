import type { Writable } from "svelte/store";
import { writable } from "svelte/store";
import type { NDKRelay, NDKRelayUrl } from "@nostr-dev-kit/ndk";
import { NDKRelayStatus } from "@nostr-dev-kit/ndk";

export type RelayObject = {
  url: NDKRelayUrl;
  object: NDKRelay;
  status: NDKRelayStatus;
};

export type RelayObjects = {
  [key: NDKRelayUrl]: RelayObject;
};

function getRelays() {
  const relays: Writable<RelayObject[]> = writable<RelayObject[]>([]);
  const { subscribe, update, set } = relays;

  const fill = (relays: NDKRelay[]): void => {
    let parsed: RelayObject[] = [];
    let injectedStatus : NDKRelayStatus | null = null;
    
    for (let relay of relays) {
      parsed.push({
        url: relay.url,
        object: relay,
        status: relay.status
      });
      
      relay.on("connect", () => {
        updateRelayStatus(relay.url, relay.connectivity.status);
      });
      relay.on("disconnect", () => {
        updateRelayStatus(relay.url, relay.connectivity.status);
      });
    }
    set(parsed);
  };

  const updateRelayStatus = (
    url: NDKRelayUrl,
    status: NDKRelayStatus,
  ): void => {
    update((relays: RelayObject[]): RelayObject[] => {
      let index : number = relays.findIndex((relay : RelayObject) => relay.url === url);
      if (index !== -1) {
        relays[index].status = status;
      }
      return relays;
    });
  };
  const clear = () => set([]);

  return {
    subscribe,
    clear,
    fill,
    updateRelayStatus,
  };
}

export const relays = getRelays();
