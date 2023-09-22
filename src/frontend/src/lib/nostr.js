import NDK from "@nostr-dev-kit/ndk";
import { NDKEvent, NDKKind, NDKPrivateKeySigner, NDKUser } from "@nostr-dev-kit/ndk";
import { nostr_events, nostr_followees } from "../store/nostr";
import { get } from "svelte/store";
export class NostrHandler {
    constructor() {
        this.nostr_kit = null;
        this.nostr_user = null;
        this.signer = null;
        this.subscription = null;
        this.RELAYS = [
            "wss://relay.nostr.band",
            "wss://nostr.girino.org",
            "wss://nostr-pub.wellorder.net",
        ];
    }
    async init(private_key) {
        // init private key signer based on the existing private key
        this.signer = new NDKPrivateKeySigner(private_key);
        this.nostr_user = await this.signer.user();
        this.nostr_kit = new NDK({
            explicitRelayUrls: this.RELAYS,
            signer: this.signer,
        });
        await this.nostr_kit.connect();
        this.nostr_user.ndk = this.nostr_kit;
        // get followees for this user using nostr
        let followees = await this.get_followees();
        // subscribe to them in addition to the users posts
        await this.subscribe(followees.map((followee) => followee.hexpubkey()));
    }
    async get_user() {
        await this.nostr_user.fetchProfile();
        return this.nostr_user;
    }
    async get_private_key() {
        return this.signer.privateKey;
    }
    async search_match(query) {
        let events = await this.nostr_kit.fetchEvents({
            search: query,
            limit: 10,
            kinds: [NDKKind.Metadata]
        });
        let users = {};
        for (const event of events) {
            let user = new NDKUser({ hexpubkey: event.pubkey });
            user.ndk = this.nostr_kit;
            let hexpubkey = user.hexpubkey();
            // we already follow this user, or we already have them in this list
            if (nostr_followees.find_user(hexpubkey) || hexpubkey in users) {
                continue;
            }
            await user.fetchProfile();
            if ((user.profile.name || "").includes(query) || hexpubkey.includes(query)) {
                users[hexpubkey] = user;
            }
        }
        return Object.values(users);
    }
    async subscribe(following_list = []) {
        nostr_events.clear();
        try {
            this.subscription.stop();
        }
        catch (_a) {
        }
        let filters = {
            kinds: [NDKKind.Text],
            authors: [this.nostr_user.hexpubkey(), ...following_list],
            limit: 10, // TODO get rid of this
        };
        let options = { closeOnEose: false };
        this.subscription = this.nostr_kit.subscribe(filters, options);
        this.subscription.on("event", event => {
            nostr_events.add(event);
        });
    }
    async publish_event(content, kind = NDKKind.Text) {
        const nostr_event = new NDKEvent(this.nostr_kit);
        nostr_event.kind = kind;
        nostr_event.content = content;
        await nostr_event.publish();
    }
    async update_user(profile) {
        if (!this.nostr_user.profile) {
            await this.nostr_user.fetchProfile();
        }
        this.nostr_user.profile.name = profile.username;
        this.nostr_user.profile.bio = profile.about;
        this.nostr_user.profile.image = profile.avatar_url;
        await this.nostr_user.publish();
    }
    async add_followee(followee) {
        if (await this.nostr_user.follow(followee)) {
            nostr_followees.add_user(followee);
            // we need to renew subscription to receive new events
            await this.subscribe(get(nostr_followees).map((followee) => followee.hexpubkey()));
            return true;
        }
        else {
            return false;
        }
    }
    // todo move to our forked NDK
    async remove_followee(user) {
        nostr_followees.remove_user(user);
        try {
            let follow_list = get(nostr_followees);
            // mirrored from NDK
            const event = new NDKEvent(this.nostr_kit, { kind: NDKKind.Contacts });
            for (const follow of follow_list) {
                event.tag(follow);
            }
            await event.publish();
            // we need to renew subscription to cancel receiving the removed user posts
            await this.subscribe(get(nostr_followees).map((followee) => followee.hexpubkey()));
            return true;
        }
        catch (_a) {
            // revert changes in case of error
            nostr_followees.add_user(user);
            return false;
        }
    }
    async get_followees() {
        let users = await this.nostr_user.follows();
        for (const user of users) {
            user.ndk = this.nostr_kit;
            await user.fetchProfile();
        }
        let list_users = [...users]; // from set to array
        nostr_followees.init(list_users);
        return list_users;
    }
}
//# sourceMappingURL=nostr.js.map