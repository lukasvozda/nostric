import { get, writable } from "svelte/store";
import { AuthClient } from "@dfinity/auth-client";
import { CryptoService } from "../lib/crypto";
import { NostrHandler } from "../lib/nostr";
import { createActor } from "../../../declarations/backend";
import { navigateTo } from "svelte-router-spa";
import { alert } from "./alert";
import { ROUTES } from "../router/routes";
export var AuthStates;
(function (AuthStates) {
    AuthStates[AuthStates["ANONYMOUS"] = 0] = "ANONYMOUS";
    AuthStates[AuthStates["IDENTIFIED"] = 1] = "IDENTIFIED";
    AuthStates[AuthStates["AUTHENTICATED"] = 2] = "AUTHENTICATED";
    AuthStates[AuthStates["NOT_YET_REGISTERED"] = 3] = "NOT_YET_REGISTERED";
    AuthStates[AuthStates["REGISTERED"] = 4] = "REGISTERED";
    AuthStates[AuthStates["ERROR"] = 5] = "ERROR";
})(AuthStates || (AuthStates = {}));
function fetch_auth_state() {
    const { subscribe, set } = writable(AuthStates.ANONYMOUS);
    const set_anonymous = () => set(AuthStates.ANONYMOUS);
    const set_identified = () => set(AuthStates.IDENTIFIED);
    const set_authenticated = () => set(AuthStates.AUTHENTICATED);
    const set_not_registered = () => set(AuthStates.NOT_YET_REGISTERED);
    const set_registered = () => set(AuthStates.REGISTERED);
    const set_error = () => set(AuthStates.ERROR);
    return {
        subscribe,
        set_anonymous,
        set_identified,
        set_authenticated,
        set_not_registered,
        set_registered,
        set_error
    };
}
export const auth_state = fetch_auth_state();
export const is_anonymous = () => get(auth_state) === AuthStates.ANONYMOUS;
export const is_identified = () => get(auth_state) === AuthStates.IDENTIFIED;
export const is_authenticated = () => get(auth_state) === AuthStates.AUTHENTICATED;
export const is_not_registered = () => get(auth_state) === AuthStates.NOT_YET_REGISTERED;
export const is_registered = () => get(auth_state) === AuthStates.REGISTERED;
export const is_error = () => get(auth_state) === AuthStates.ERROR;
export let actor = null;
export let auth_client = null;
export let crypto_service = null;
export let nostr_service = null;
export async function init() {
    // let auth_cookie = getCookie("nostrAuth");
    // if (auth_cookie !== "") {
    //   auth_client = await AuthClient.create(JSON.parse(auth_cookie.identity));
    // } else {
    //   auth_client = await AuthClient.create();
    // }
    auth_client = await AuthClient.create();
    if (await auth_client.isAuthenticated()) {
        auth_state.set_identified();
        await init_structures();
    }
}
export async function init_nostr_structures(profile) {
    let private_key = await crypto_service.decrypt(profile.encrypted_sk);
    await nostr_service.init(private_key);
    auth_state.set_registered();
    await navigateTo(ROUTES.HOME);
}
export async function init_structures() {
    try {
        alert.clear();
        const host = process.env.DFX_NETWORK === "ic" ?
            `https://${process.env.BACKEND_CANISTER_ID}.ic0.app` :
            "http://localhost:8000";
        actor = createActor(process.env.BACKEND_CANISTER_ID, {
            agentOptions: {
                identity: auth_client.getIdentity(),
                host: host
            }
        });
        crypto_service = new CryptoService(actor);
        await crypto_service.init();
        auth_state.set_authenticated();
        try {
            nostr_service = new NostrHandler();
            try {
                let response = await actor.getProfile();
                await init_nostr_structures(response["ok"]);
            }
            catch (_a) {
                auth_state.set_not_registered();
                await navigateTo(ROUTES.CREATE_PROFILE);
            }
        }
        catch (error) {
            alert.error("Unable to initiate Nostr functionality");
            auth_state.set_error();
        }
    }
    catch (error) {
        alert.error("Unable to initialize vetkeys");
        console.error(error);
        auth_state.set_error();
    }
}
export async function login_to_ii() {
    if (is_anonymous() || is_error()) {
        let identityProvider = process.env.DFX_NETWORK === "ic" ?
            "https://identity.ic0.app/#authorize" :
            `http://${process.env.INTERNET_IDENTITY_CANISTER_ID}.localhost:8000/#authorize`;
        await auth_client.login({
            identityProvider,
            onSuccess: async () => {
                auth_state.set_identified();
                await init_structures();
            },
            onError: () => {
                alert.error("Unable to login to Internet Identity");
                auth_state.set_error();
            }
        });
    }
}
export async function logout_from_ii() {
    crypto_service.logout();
    auth_client.logout();
    auth_state.set_anonymous();
    await actor.deleteProfile(); // todo get rid of this in production
    navigateTo(ROUTES.LOGIN);
}
//# sourceMappingURL=auth.js.map