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
  NDKRelayStatus,
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
    const options: NDKConstructorParams = {
      explicitRelayUrls: this.explicitRelays,
    };
    this.nostrKit = new NDK(options);
  }

  public async startConnection(): Promise<void> {
    await this.nostrKit.connect();
    relays.fill([...this.nostrKit.pool.relays.values()]);
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
    relays.fill([...this.nostrKit.pool.relays.values()]);
  }

  public removeRelay(url: NDKRelayUrl): void {
    this.nostrKit?.pool.removeRelay(url);
    relays.fill([...this.nostrKit.pool.relays.values()]);
  }

  public async reconnectRelay(relay: NDKRelay): Promise<void> {
    relay.disconnect();
    relays.updateRelayStatus(relay.url, NDKRelayStatus.DISCONNECTED);
    setTimeout(async (): Promise<void> => {
      await relay.connect();
      setTimeout(() => {
        relays.fill(this.listRelays());
        this.emit("reconnect-finished");
      }, 1000);
    }, 1000);
  }

  public listRelays(): NDKRelay[] {
    if (this.nostrKit && this.nostrKit.pool && this.nostrKit.pool.relays) {
      return [...this.nostrKit.pool.relays.values()];
    }
    return [];
  }

  public async addSubscription(filter: NDKFilter): Promise<void> {
    /**
     * Adds new subscription to the list of subscriptions
     *
     * @param filter - Filter for the subscription
     */
    const options: NDKSubscriptionOptions = { closeOnEose: false };
    const subscription: NDKSubscription = this.nostrKit.subscribe(
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
    for (const subscription of this.subscriptions) {
      try {
        subscription.stop();
      } catch {
        console.log("subscription: error");
      }
    }
    events.clear();
  }

  public async fetchRandomEvents(): Promise<NDKEvent[]> {
    const filters: NDKFilter = {
      kinds: [NDKKind.Text],
      limit: 5,
    };
    const events: Set<NDKEvent> = await this.nostrKit.fetchEvents(filters);
    return [...events];
  }

  public async fetchEventById(eventId: string): Promise<NDKEvent | null> {
    return this.nostrKit.fetchEvent(eventId);
  }

  public async fetchEventReplies(event: NDKEvent): Promise<NDKEvent[]> {
    const filters: NDKFilter = {
      kinds: [NDKKind.Text],
      "#e": [event.id, "", "root"],
      limit: 5,
    };
    const events: Set<NDKEvent> = await this.nostrKit.fetchEvents(filters);
    return [...events];
  }

  public async fetchEventsByAuthorPubkey(pubkey: string): Promise<NDKEvent[]> {
    const filters: NDKFilter = {
      kinds: [NDKKind.Text],
      authors: [pubkey],
      limit: 5,
    };
    const events: Set<NDKEvent> = await this.nostrKit.fetchEvents(filters);
    return [...events];
  }

  /**
   * @returns A json containing newly generate private and public key pair
   */
  public async generateKeyPair(): Promise<{
    privateKey: string;
    publicKey: string;
  }> {
    const signer: NDKPrivateKeySigner = NDKPrivateKeySigner.generate();
    const user: NDKUser = await signer.user();
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
    const signer: NDKPrivateKeySigner = new NDKPrivateKeySigner(privateKey);
    const user: NDKUser = await signer.user();
    return user.pubkey;
  }

  /**
   * @param publicKey - The public key of the user to be fetched
   * @returns An instance of NDKUser matching the public key, with their profile.
   */
  public async fetchUserProfileByPublicKey(
    publicKey: string,
  ): Promise<NDKUser> {
    const user: NDKUser = new NDKUser({ pubkey: publicKey });
    user.ndk = this.nostrKit;
    await user.fetchProfile();
    return user;
  }

  /**
   * @param query - A string containing a query to search for
   * @returns An instance of NDKUser matching the public key, with their profile.
   */
  public async searchByQuery(query: string): Promise<UsersObject> {
    const events: Set<NDKEvent> = await this.nostrKit.fetchEvents({
      search: query,
      limit: 15,
      kinds: [NDKKind.Metadata],
    });

    const users: UsersObject = {};

    for (const event of events) {
      const user: NDKUser = new NDKUser({ pubkey: event.pubkey });
      user.ndk = this.nostrKit;
      const pubkey: string = user.pubkey;

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
