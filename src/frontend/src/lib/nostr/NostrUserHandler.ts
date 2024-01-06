import {
  NDKEvent,
  NDKKind,
  NDKPrivateKeySigner,
  NDKUser
} from "@nostr-dev-kit/ndk";

import type {
  NDKFilter,
  NDKTag,
  NDKUserProfile,
  NDKRelayList,
  NDKRelayUrl,
} from "@nostr-dev-kit/ndk";

import { nostrHandler, Reactions } from "$lib/nostr";
import type { NostrHandler, UsersObject } from "$lib/nostr";

export class NostrUserHandler {
  private nostrUser: NDKUser;
  private readonly signer: NDKPrivateKeySigner;
  private nostrHandler: NostrHandler;

  private followedUsers: UsersObject = {};

  public static instance: NostrUserHandler;

  /**
   * @param privateKey - Private key of the user which is to be instantiated
   */
  private constructor(privateKey?: string) {
    let signer: NDKPrivateKeySigner;
    if (!privateKey) {
      // no private key given, generate new
      signer = NDKPrivateKeySigner.generate();
    } else {
      // init private key signer based on the existing private key
      signer = new NDKPrivateKeySigner(privateKey);
    }
    this.signer = signer;
    this.nostrHandler = nostrHandler;
    this.nostrHandler.setSigner(this.signer);
  }

  /**
   * Singleton pattern. Returns instance if it exists, creates new one if it does not.
   *
   * @param privateKey - Private key of the user which is to be instantiated
   * @returns Singleton instance
   */
  public static getInstance(privateKey?: string): NostrUserHandler {
    if (!NostrUserHandler.instance) {
      NostrUserHandler.instance = new NostrUserHandler(privateKey);
    }
    return NostrUserHandler.instance;
  }

  /**
   * Sets up with an existing user, fetches their profile, their relays, their user follow list,
   * and starts subscriptions for this list
   */
  public async initExistingUser(): Promise<void> {
    this.nostrUser = await this.signer.user();
    this.nostrUser.ndk = nostrHandler.nostrKit;

    let userPreferredRelays: NDKRelayList | undefined =
      await this.nostrUser.relayList();
    
    if (userPreferredRelays) {
      for (let relay of userPreferredRelays.relays) {
        nostrHandler.addRelay(relay);
      }
    }

    await this.nostrUser.fetchProfile();
    this.followedUsers = await this.fetchFollowedUsersWithProfiles();

    let filters: NDKFilter = {
      kinds: [
        NDKKind.Text,
        NDKKind.Reaction,
        NDKKind.Repost,
        NDKKind.EncryptedDirectMessage,
      ],
      authors: [this.nostrUser.pubkey, ...Object.keys(this.followedUsers)],
    };
    // subscribe to the users in addition to the current user's posts
    await this.nostrHandler.addSubscription(filters);
  }

  /**
   * Connects NDK, gets the user from signer, fills up their profile,
   * publishes the new user to Nostr and starts subscribing to themselves
   *
   * @param profile - The profile to fill the user data
   */
  public async initNewUser(profile: NDKUserProfile): Promise<void> {
    this.nostrUser = await this.signer.user();
    this.nostrUser.ndk = nostrHandler.nostrKit;

    this.nostrUser.profile = profile;
    await this.nostrUser.publish();

    let filters: NDKFilter = {
      kinds: [
        NDKKind.Text,
        NDKKind.Reaction,
        NDKKind.Repost,
        NDKKind.EncryptedDirectMessage,
      ],
      authors: [this.nostrUser.pubkey],
    };
    await this.nostrHandler.addSubscription(filters);
  }

  /**
   * @returns the wrapped NDK instance of the current user
   */
  public getUser(): NDKUser | undefined {
    return this.nostrUser;
  }
  
  /**
   * Add new relay to user's relay metadata list, as per NIP-65
   *
   * @param url - The url of the relay to add
   */
  public async addUserPreferredRelay(url : NDKRelayUrl) : Promise<void> {
    let userPreferredRelays: NDKRelayList | undefined = await this.nostrUser.relayList();
    let relayTags : NDKTag[] = [];
    
    if (userPreferredRelays) {
      relayTags = userPreferredRelays.getMatchingTags("r");
    }
    if (!relayTags.find((tag : NDKTag) => tag[1] === url)) {
      relayTags.push(["r", url]);
      await this.createAndPublishEvent("", NDKKind.RelayList, relayTags);
    }
  }
  
  /**
   * Removes a relay from user's relay metadata list, as per NIP-65
   *
   * @param url - The url of the relay to remove
   */
  public async removeUserPreferredRelay(url : NDKRelayUrl) : Promise<void> {
    let userPreferredRelays: NDKRelayList | undefined = await this.nostrUser.relayList();
    let relayTags : NDKTag[] = [];
    if (userPreferredRelays) {
      relayTags = userPreferredRelays.getMatchingTags("r");
      relayTags = relayTags.filter((tag : NDKTag) => tag[1] !== url);
      await this.createAndPublishEvent("", NDKKind.RelayList, relayTags);
    }
  }

  /**
   * Updates the current active user profile info
   *
   * @param profile - The profile to use for updating
   */
  public async updateProfile(profile: NDKUserProfile): Promise<void> {
    this.nostrUser.profile = profile;
    await this.nostrUser.publish();
  }
  
  /**
   * @returns private key of the current active Nostr user
   */
  public getPrivateKey(): string | undefined {
    return this.signer?.privateKey;
  }

  /**
   * Creates and publishes an event
   *
   * @param content - The content of the event
   * @param kind - The kind of the message, Text by default
   * @param tags - The list of NDKTags to include in the message
   */
  public async createAndPublishEvent(
    content: string,
    kind: NDKKind = NDKKind.Text,
    tags?: NDKTag[],
  ): Promise<void> {
    const nostrEvent: NDKEvent = new NDKEvent(this.nostrHandler.nostrKit);
    nostrEvent.kind = kind;
    nostrEvent.content = content;
    nostrEvent.tags = tags || [];
    await nostrEvent.publish();
  }

  /**
   * Creates and publishes an encrypted private event
   *
   * @param content - The content to be encrypted
   * @param kind - The kind of the message, Text by default
   * @param tags - The list of NDKTags to include in the event
   * @param recipient - The recipient of the private event
   */
  public async createAndPublishEncryptedEvent(
    content: string,
    kind: NDKKind = NDKKind.Text,
    recipient: NDKUser,
    tags?: NDKTag[],
  ): Promise<void> {
    const nostrEvent: NDKEvent = new NDKEvent(this.nostrHandler.nostrKit);
    nostrEvent.kind = kind;
    nostrEvent.content = content;
    nostrEvent.tags = [...(tags || []), ["p", recipient.pubkey]];
    await nostrEvent.encrypt(recipient);
    await nostrEvent.publish();
  }

  /**
   * Reposts an event, based on
   * https://github.com/nostr-dev-kit/ndk/blob/master/ndk/src/events/repost.ts
   *
   * @param eventToRepost - The NDKEvent event to repost
   */
  public async repostEvent(eventToRepost: NDKEvent): Promise<void> {
    await eventToRepost.repost();
  }

  /**
   * A base method for reacting to an event, based on
   * https://github.com/nostr-protocol/nips/blob/master/25.md
   *
   * @param eventToReactTo - The NDKEvent event to react to
   * @param reaction - The reaction type
   */
  public async reactToEvent(
    eventToReactTo: NDKEvent,
    reaction: Reactions,
  ): Promise<void> {
    await eventToReactTo.react(reaction);
  }

  /**
   * Creates a dislike reaction event for an event.
   * and restarts the subscriptions using this new list.
   *
   * @param eventToReactTo - The NDKEvent event to react to
   */
  public async dislikeEvent(eventToReactTo: NDKEvent): Promise<void> {
    await this.reactToEvent(eventToReactTo, Reactions.DISLIKE);
  }

  /**
   * Creates a like reaction event for an event.
   * and restarts the subscriptions using this new list.
   *
   * @param eventToReactTo - The NDKEvent event to react to
   */
  public async likeEvent(eventToReactTo: NDKEvent): Promise<void> {
    await this.reactToEvent(eventToReactTo, Reactions.LIKE);
  }

  /**
   * Fetch followed users along with their profiles
   *
   * @returns followed users as values denoted by their public keys as keys in json
   */
  public async fetchFollowedUsersWithProfiles(): Promise<UsersObject> {
    let users: NDKUser[] = [...(await this.nostrUser.follows())];
    let fetchedUsersProfiles: UsersObject = {};
    for (const user of users) {
      user.ndk = this.nostrHandler.nostrKit;
      await user.fetchProfile();
      fetchedUsersProfiles[user.pubkey] = user;
    }
    return fetchedUsersProfiles;
  }

  /**
   * Updates the Nostr contact list, adds the user to our local followed users list
   * and restarts the subscriptions using this new list.
   *
   * @param user - The NDKUser user to be added to the follow list
   * @returns True if successfully removed, False if not
   */
  public async addUserToFollowedUsers(user: NDKUser): Promise<Boolean> {
    if (await this.nostrUser.follow(user)) {
      this.followedUsers[user.pubkey] = user;
      // we need to renew subscription to receive new events
      // await this.startSubscriptions(Object.keys(this.followedUsers));
      return true;
    } else {
      return false;
    }
  }

  /**
   * Create a copy of the follow list sans the user to be deleted, updates the Nostr contact list,
   * restarts the subscriptions using this new shortened user list and if this operation
   * was successful, it saves the new list into the old list.
   *
   * @param user - The NDKUser user to be removed from the follow list
   * @returns True if successfully removed, False if not
   */
  public async removeUserFromFollowedUsers(user: NDKUser): Promise<Boolean> {
    let newFollowedUsers = JSON.parse(JSON.stringify(this.followedUsers));
    delete newFollowedUsers[user.pubkey];
    try {
      // mirrored from NDK
      const event: NDKEvent = new NDKEvent(this.nostrHandler.nostrKit, {
        kind: NDKKind.Contacts,
      });
      for (const user of Object.values(newFollowedUsers)) {
        event.tag(user);
      }
      await event.publish();
      // we need to renew subscription to cancel receiving the removed user posts
      // await this.startSubscriptions(Object.keys(newFollowedUsers));
      // we were successful, so we save the shortened list into the real list
      this.followedUsers = newFollowedUsers;
      return true;
    } catch {
      return false;
    }
  }
}
