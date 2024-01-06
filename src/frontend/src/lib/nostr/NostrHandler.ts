import type {
  NDKConstructorParams,
  NDKFilter,
  NDKRelayUrl,
  NDKSubscriptionOptions,
} from "@nostr-dev-kit/ndk";
import NDK, {
  NDKEvent,
  NDKKind,
  NDKPrivateKeySigner,
  NDKRelay,
  NDKSubscription,
  NDKUser,
} from "@nostr-dev-kit/ndk";

import { EventEmitter } from "tseep";

import { events } from "$lib/stores/Events";
import type { UsersObject } from "$lib/nostr";
import { relays } from "$lib/stores/Relays";

export class NostrHandler extends EventEmitter {
  public nostrKit: NDK;
  private subscriptions: NDKSubscription[] = [];

  public explicitRelays: string[] = [
    "wss://relay.nostr.band",
    "wss://nostr.girino.org",
    "wss://nostr-pub.wellorder.net",
  ];

  constructor() {
    super();
    let options: NDKConstructorParams = {
      explicitRelayUrls: this.explicitRelays,
    };
    this.nostrKit = new NDK(options);
  }

  public async startConnection(): Promise<void> {
    await this.nostrKit.connect();
    relays.fill(this.listRelays());
  }

  public setSigner(signer: NDKPrivateKeySigner): void {
    this.nostrKit.signer = signer;
  }

  public resetSigner(): void {
    this.nostrKit.signer = NDKPrivateKeySigner.generate();
  }

  public addRelay(url: NDKRelayUrl): void {
    // with this we do not need to check whether it already exists,
    // otherwise we would have used addRelay method
    this.nostrKit?.pool.getRelay(url);
    relays.fill(this.listRelays());
  }
  
  public removeRelay(url: NDKRelayUrl): void {
    this.nostrKit?.pool.removeRelay(url);
    relays.fill(this.listRelays());
  }

  public async reconnectRelay(relay: NDKRelay): Promise<void> {
    // this magic is here because the NDK relay connectivity class
    // does not every emit change of status, and we must check it manually.
    relay.disconnect();
    relays.updateRelayStatus(relay.url, relay.connectivity.status);
    setTimeout(async () : Promise<void> => {
      try {
        await relay.connect();
      } catch {
        relays.updateRelayStatus(relay.url, relay.connectivity.status);
      } finally {
        this.emit("reconnect-finished");
      }
    }, 1000);
  }

  public listRelays(): NDKRelay[] {
    return [...this.nostrKit?.pool.relays.values()];
  }

  public async addSubscription(filter: NDKFilter): Promise<void> {
    /**
     * Adds new subscription to the list of subscriptions
     *
     * @param filter - Filter for the subscription
     */
    let options: NDKSubscriptionOptions = { closeOnEose: false };
    let subscription: NDKSubscription = this.nostrKit.subscribe(
      filter,
      options,
    );

    subscription.on("event", (event: NDKEvent): void => {
      // if the message is encrypted, decrypt it right away
      if (event.kind === NDKKind.EncryptedDirectMessage) {
        event.decrypt();
      }
      events.add(event);
    });

    this.subscriptions.push(subscription);
  }

  /**
   * Clears all active subscriptions and stored events
   */
  public async clearSubscriptions(): Promise<void> {
    for (let subscription of this.subscriptions) {
      try {
        subscription.stop();
      } catch {}
    }
    events.clear();
  }

  public async fetchRandomEvents(): Promise<NDKEvent[]> {
    let filters: NDKFilter = {
      kinds: [NDKKind.Text],
      limit: 5,
    };
    let events: Set<NDKEvent> = await this.nostrKit.fetchEvents(filters);
    return [...events];
  }

  public async fetchEventById(eventId: string): Promise<NDKEvent | null> {
    return this.nostrKit.fetchEvent(eventId);
  }

  public async fetchEventReplies(event: NDKEvent): Promise<NDKEvent[]> {
    let filters: NDKFilter = {
      kinds: [NDKKind.Text],
      "#e": [event.id, "", "root"],
      limit: 5,
    };
    let events: Set<NDKEvent> = await this.nostrKit.fetchEvents(filters);
    return [...events];
  }

  public async fetchEventsByAuthorPubkey(pubkey: string): Promise<NDKEvent[]> {
    let filters: NDKFilter = {
      kinds: [NDKKind.Text],
      authors: [pubkey],
      limit: 5,
    };
    let events: Set<NDKEvent> = await this.nostrKit.fetchEvents(filters);
    return [...events];
  }

  /**
   * @returns A json containing newly generate private and public key pair
   */
  public async generateKeyPair(): Promise<{
    privateKey: string;
    publicKey: string;
  }> {
    let signer: NDKPrivateKeySigner = NDKPrivateKeySigner.generate();
    let user: NDKUser = await signer.user();
    return {
      privateKey: signer.privateKey,
      publicKey: user.pubkey,
    };
  }

  /**
   * @returns A generated public key
   */
  public async generatePublicKeyFromPrivateKey(
    privateKey: string,
  ): Promise<string> {
    let signer: NDKPrivateKeySigner = new NDKPrivateKeySigner(privateKey);
    let user: NDKUser = await signer.user();
    return user.pubkey;
  }

  /**
   * @param publicKey - The public key of the user to be fetched
   * @returns An instance of NDKUser matching the public key, with their profile.
   */
  public async fetchUserProfileByPublicKey(
    publicKey: string,
  ): Promise<NDKUser> {
    let user: NDKUser = new NDKUser({ pubkey: publicKey });
    user.ndk = this.nostrKit;
    await user.fetchProfile();
    return user;
  }

  /**
   * @param query - A string containing a query to search for
   * @returns An instance of NDKUser matching the public key, with their profile.
   */
  public async searchByQuery(query: string): Promise<UsersObject> {
    let events: Set<NDKEvent> = await this.nostrKit.fetchEvents({
      search: query,
      limit: 15,
      kinds: [NDKKind.Metadata],
    });

    let users: UsersObject = {};

    for (const event of events) {
      let user: NDKUser = new NDKUser({ pubkey: event.pubkey });
      user.ndk = this.nostrKit;
      let pubkey: string = user.pubkey;

      // we already have this user in this list
      if (pubkey in users) {
        continue;
      }

      await user.fetchProfile();

      if (
        (user.profile?.name || "").includes(query) ||
        pubkey.includes(query) ||
        user.npub.includes(query)
      ) {
        users[pubkey] = user;
      }
    }

    return users;
  }
}

export const nostrHandler: NostrHandler = new NostrHandler();
nostrHandler.startConnection();
