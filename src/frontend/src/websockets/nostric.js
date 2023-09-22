import { SimplePool, finishEvent } from "../nostric-tools";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { Actor, HttpAgent } from "@dfinity/agent";
import { createActor, idlFactory } from "../../../declarations/relay/index.js";
export class NostricHandler {
    constructor(private_key, public_key) {
        // todo make not hard coded
        this.gateway_url = "ws://127.0.0.1:8080";
        this.ic_url = "http://127.0.0.1:4943";
        this.private_relay_canister_id = process.env.RELAY || "";
        this.local = true;
        this.persist_keys = false;
        this.private_relay_canister_actor = null;
        this.relay_pool = null;
        this.active_subs = null;
        this.private_key = private_key;
        this.public_key = public_key;
    }
    async init_private_relay() {
        let options = {
            agentOptions: { host: this.ic_url }
        };
        this.private_relay_canister_actor = await createActor(this.private_relay_canister_id, options);
    }
    async init_foreign_relay(gateway_url, canister_id) {
        // init the agent for the foreign relay using the universal candid of relays
        // the private relay does not have to be activated
        const agent = new HttpAgent();
        if (process.env.DFX_NETWORK !== "ic") {
            agent.fetchRootKey().catch(err => {
                console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
                console.error(err);
            });
        }
        const actor = await Actor.createActor(idlFactory, {
            agent,
            canisterId: canister_id,
        });
        return {
            gateway_url,
            ic_url: this.ic_url,
            canister_id,
            canister_actor: actor,
            local: this.local,
            persist_keys: this.persist_keys
        };
    }
    get_private_relay_params() {
        if (this.private_relay_canister_actor)
            return {
                gateway_url: this.gateway_url,
                ic_url: this.ic_url,
                canister_id: this.private_relay_canister_id,
                canister_actor: this.private_relay_canister_actor,
                local: this.local,
                persist_keys: this.persist_keys
            };
        else {
            return null;
        }
    }
    async init_pool(relays, authors) {
        // todo do we wanna subscribe to ourselves?
        if (this.private_relay_canister_actor) {
            relays = [...relays, this.get_private_relay_params()];
        }
        this.relay_pool = new SimplePool();
        this.active_subs = this.relay_pool.sub(relays, [{ authors, kinds: [NDKKind.Text] }]);
        this.active_subs.on("event", (event) => {
            console.log('we got the event we wanted:', event);
        });
    }
    async publish_to_private_relay(content) {
        if (this.private_relay_canister_actor) {
            let event = {
                kind: NDKKind.Text,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                content,
                pubkey: this.public_key,
            };
            const signed_event = finishEvent(event, this.private_key);
            await this.private_relay_canister_actor.add_new_event(signed_event);
        }
    }
}
//# sourceMappingURL=nostric.js.map