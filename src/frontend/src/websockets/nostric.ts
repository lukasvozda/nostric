import { SimplePool, Sub, finishEvent } from "../nostric-tools";
import type { ActorSubclass } from "@dfinity/agent";
import type { _SERVICE } from "../../../relay/relay.did";
import { NDKKind } from "@nostr-dev-kit/ndk";
import { Actor, HttpAgent } from "@dfinity/agent";
import { createActor, idlFactory } from "../../../declarations/relay/index.js";

export class NostricHandler {

  // todo make not hard coded
  private gateway_url : string = "ws://localhost:8089";
  private ic_url : string = "http://localhost:8000";
  private private_relay_canister_id : string = process.env.RELAY || "";
  private local : boolean = true;
  private persist_keys : boolean = false;
  private private_relay_canister_actor : ActorSubclass<_SERVICE> | null = null;

  private relay_pool : SimplePool | null = null;
  private active_subs : Sub | null = null;

  private private_key : string;
  private public_key : string;


  constructor(private_key : string, public_key : string) {
    this.private_key = private_key;
    this.public_key = public_key;
  }


  public async init_private_relay() {
    let options = {
      agentOptions: {host: this.ic_url}
    }
    this.private_relay_canister_actor = await createActor(
      this.private_relay_canister_id, options
    );
  }

  public async init_foreign_relay(gateway_url : string, canister_id : string) {
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
    }
  }

  private get_private_relay_params() {
    if (this.private_relay_canister_actor)
      return {
        gateway_url: this.gateway_url,
        ic_url: this.ic_url,
        canister_id: this.private_relay_canister_id,
        canister_actor: this.private_relay_canister_actor,
        local: this.local,
        persist_keys: this.persist_keys
      }
    else {
      return null;
    }
  }

  public async init_pool(relays, authors) {
    // todo do we wanna subscribe to ourselves?
    if (this.private_relay_canister_actor) {
      relays = [...relays, this.get_private_relay_params()];
    }
    this.relay_pool = new SimplePool();
    this.active_subs = this.relay_pool.sub(relays, [{authors, kinds: [NDKKind.Text]}]);
    this.active_subs.on("event", (event : any) => {
      console.log('we got the event we wanted:', event)
    });
  }

  public async publish_to_private_relay(content : string) {
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
