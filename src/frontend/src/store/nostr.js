import { writable } from "svelte/store";
import { get } from "svelte/store";
function fetch_nostr_events() {
    const { subscribe, update, set } = writable([]);
    const add = (event) => update((events) => {
        if (!events.find((past_event) => past_event.id === event.id)) {
            events = events.concat(event);
            events.sort((x, y) => y.created_at - x.created_at);
        }
        return events;
    });
    const clear = () => set([]);
    return {
        subscribe,
        add,
        clear,
    };
}
export const nostr_events = fetch_nostr_events();
function fetch_nostr_followees() {
    const followees = writable([]);
    const { subscribe, update, set } = followees;
    const init = (followees) => set(followees);
    const find_user = (npub) => {
        return get(followees).find((followee) => followee.hexpubkey() === npub);
    };
    const search_match = (query) => {
        return get(followees).filter((followee) => {
            var _a, _b;
            return followee.hexpubkey().includes(query) ||
                (((_a = followee.profile) === null || _a === void 0 ? void 0 : _a.name) || "").includes(query) ||
                (((_b = followee.profile) === null || _b === void 0 ? void 0 : _b.displayName) || "").includes(query);
        });
    };
    const add_user = (new_user) => update((followees) => {
        let new_hexpubkey = new_user.hexpubkey();
        if (!followees.find((followee) => followee.hexpubkey() === new_hexpubkey)) {
            followees = followees.concat(new_user);
        }
        return followees;
    });
    const remove_user = (user) => update((followees) => {
        let new_hexpubkey = user.hexpubkey();
        return followees.filter((followee) => followee.hexpubkey() !== new_hexpubkey);
    });
    const clear = () => set([]);
    return {
        subscribe,
        init,
        find_user,
        add_user,
        remove_user,
        clear,
        search_match,
    };
}
export const nostr_followees = fetch_nostr_followees();
//# sourceMappingURL=nostr.js.map