<script lang="ts">
  import { onMount } from "svelte";
  import NDKUserProfile, { NDKUser } from "@nostr-dev-kit/ndk";
  import Spinner from "../utils/Spinner.svelte";
  import NostrPost from "../nostr/NostrPost.svelte";
  import NostrAvatar from "../nostr/NostrAvatar.svelte";
  import { nostr_service, nostric_service, auth_user } from "../../store/auth";
  import { nostr_events, nostr_followees } from "../../store/nostr";
  import {
    nostric_events,
    nostric_relays_count,
    nostric_relays_eose_count
  } from "../../store/nostric";
  import { Icon } from "svelte-feathers";
  import {Actor, HttpAgent} from "@dfinity/agent";
  import {idlFactory} from "../../lib/candb_file_upload_declarations";

  let user : NDKUser = null;
  let profile : NDKUserProfile = null;
  let private_key : string = "";
  let initializing : boolean = true;
  let hexpubkey : string = "";
  let publishing : boolean = false;
  let message : string | null = null;
  let initialized : boolean = false;
  let active_subscriptions : number = 0;

  let feed_events = {};

  export let currentRoute;
  export let params;

  const create_post = async () => {
    publishing = true;
    if (auth_user.is_pro) {
      let finished_event = await nostric_service.publish_to_private_relay(message);
      await nostr_service.publish(finished_event);
    } else {
      await nostr_service.create_and_publish(message);
    }
  }

  const parse_events = () => {
    let events = {};
    for (let nostric_event of $nostric_events) {
      if (nostric_event.event.pubkey === hexpubkey) {
        events[nostric_event.event.id] = nostric_event
      }
    }
    for (let event of $nostr_events) {
      if (event.pubkey === hexpubkey) {
        if (!(event.id in events)) {
          events[event.id] = {
            event, gateway_url: null, canister_id: null
          }
        }
      }
    }
    feed_events = Object.values(events);
    publishing = false;
    message = null;
  }

  $: initialized && $nostr_events, parse_events();
  $: initialized && $nostric_events, parse_events();

  // TODO what is such profile does not exist in nostr, but exists in our canister?
  onMount(async () => {
    user = await nostr_service.get_user();
    hexpubkey = user.hexpubkey();
    profile = user.profile;
    private_key = nostr_service.get_private_key();
    initializing = false;
    parse_events();
    if (auth_user.is_pro) {
      active_subscriptions = await nostric_service.get_number_of_subscriptions();
    }
    initialized = true;
  });

  const actor = async ()  => {
    let ic_network = "http://localhost:8000";
    let local = true;
    let persist_keys = true;

    if (process.env.DFX_NETWORK === "ic") {
      ic_network = "https://icp0.io";
      local = false;
    }

    const agent = new HttpAgent({host: ic_network});
    if (process.env.DFX_NETWORK !== "ic") {
      await agent.fetchRootKey();
    }

    const actor = await Actor.createActor(idlFactory, {
      agent,
      canisterId: "by6od-j4aaa-aaaaa-qaadq-cai",
    });

    return actor;
  }


  let file;
  let imgBlob;

  const handleUploadSubmit = async (event) => {
    event.preventDefault();
    blobFromFile().then((blob) => {
      imgBlob = blob;
    });
    let new_actor = await actor();
    await new_actor.upload_wrapper("TEST", imgBlob);
    file = undefined;
  };

  const handleDownloadButton = async () => {
    let new_actor = await actor();
    let result = await new_actor.download_wrapper("TEST");
    downloadUint8ArrayAsJpeg(result, "test.jpeg");
  };

  export const blobFromFile = async () => {
    let input = <HTMLInputElement>document.getElementById("image");
    if (input && input.files && input.files[0]) {
      let ab = await input.files[0].arrayBuffer();
      return [...new Uint8Array(ab)];
    } else {
      return null;
    }
  };

  function downloadUint8ArrayAsJpeg(uint8Array, filename) {
    // Create a Blob from the Uint8Array
    const blob = new Blob([uint8Array], { type: 'image/jpeg' });

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element and set the download attributes
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;

    // Append the anchor to the body, click it, and then remove it
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Release the created object URL
    URL.revokeObjectURL(url);
  }

</script>


{#if initializing}
  <div class="d-flex justify-center content-center">
    <div class="text-center opacity-70">
      <Spinner width="10"/>
    </div>
  </div>
{:else}
  <div class="drawer">

    <input id="add-followees-drawer" type="checkbox" class="drawer-toggle" />
    <div class="drawer-content">

      <div class="max-w-2xl mx-auto">
        <div class="flex items-center">
          <div><NostrAvatar profile={ user.profile } size="170"/></div>
          <div class="ml-4 break-all">
            <h1 class="text-3xl font-bold mb-2">@{ profile?.name }</h1>
            <div class="text-gray-500 text-sm" title="Your public key.">{ hexpubkey }</div>
            <div class="text-sm mt-1">{ profile?.bio }</div>

            <div class="stats">
              <div class="stat">
                <div class="stat-title">Follows</div>
                <div class="stat-value">{ $nostr_followees.length }</div>
              </div>
              <div class="stat">
                <div class="stat-title">Following</div>
                <div class="stat-value">{ active_subscriptions }</div>
              </div>
              <div class="stat">
                <div class="stat-title">Relays</div>
                <div class="stat-value">
                  { auth_user.followed_relays.nostr.length + auth_user.followed_relays.nostric.length }
                </div>
              </div>
            </div>

          </div>
        </div>


        <div class="divider"></div>
        <div class="form-control">
          <textarea
            bind:value={message}
            disabled={ publishing }
            class="textarea textarea-lg border-primary rounded-3xl border-2"
            maxlength="200"
            placeholder="Write something..."></textarea>
        </div>

        <div class="flex justify-between mt-6">
          <div>
            <label for="add-followees-drawer" class="btn btn-primary drawer-button text-white">
              <Icon name="image"></Icon>
              Upload image
            </label>
          </div>
          <div>
            <button
              disabled={ !message || publishing }
              class="btn btn-primary text-right"
              class:btn-disabled={ !message || publishing }
              on:click={ async () => await create_post() }
            >
              {#if publishing}
                <Spinner/>
              {/if}
              <span class="text-white">Create post</span>
            </button>
          </div>
        </div>
        <div class="divider"></div>
        <div class="mt-12">
          {#if !initialized || (feed_events.length === 0 && $nostric_relays_count !== $nostric_relays_eose_count) }
            <div class="d-flex justify-center content-center mb-4">
              <div class="justify-center opacity-70 flex items-center">
                <Spinner width="3"/>
                <span class="ml-2">Live loading messages</span>
              </div>
            </div>
          {/if}
          {#if feed_events.length > 0 && initialized }
            {#each feed_events as event}
              <div class="mb-6">
                <NostrPost
                  event={ event.event }
                  gateway_url={ event.gateway_url }
                  canister_id={ event.canister_id }
                  { user }
                />
              </div>
            {/each}
          {/if}
        </div>
      </div>

    </div>
    <div class="drawer-side">
      <label for="add-followees-drawer"  class="drawer-overlay"></label>
      <div id="drawer-bottom-add" class="fixed bottom-0 h-2/3 left-0 right-0 z-40 bg-base-100 mx-10 rounded-2xl p-10 overflow-y-auto transition-transform transform-none" tabindex="-1" aria-labelledby="drawer-bottom-label">
        <div class="grid grid-cols-6">
          <div>
            <label>Choose a file to upload:</label>
            <input type="file" accept="image/*" bind:value={file} id="image" />
            <button on:click={handleUploadSubmit} disabled={!file}>Upload</button>
            <button on:click={handleDownloadButton}>Download</button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}



<style lang="postcss">
  .drawer-toggle:checked~.drawer-side>*:not(.drawer-overlay) {
    transform: translateY(0) !important;
  }
  .drawer-side>*:not(.drawer-overlay) {
    transform: translateY(100%) !important;
  }
</style>
