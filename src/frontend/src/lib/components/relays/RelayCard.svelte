<script lang="ts">
  import { RefreshCcw, Server, XCircle } from "svelte-feathers";
  import { nostrHandler, NostrUserHandler } from "$lib/nostr";
  import { NDKRelayStatus } from "@nostr-dev-kit/ndk";
  import { slide } from "svelte/transition";
  import { Circle } from "svelte-loading-spinners";
  import type { RelayObject } from "$lib/stores/Relays";
  import { authUser } from "$lib/stores/Auth";
  import { getToastStore } from "@skeletonlabs/skeleton";

  const toastStore = getToastStore();

  let loading : boolean = false;
  let disabledLocal : boolean = false;
  let statusColor : string = "";

  $: explicitRelay = nostrHandler.explicitRelays.includes(relay.object.url);

  $: if (relay.status === NDKRelayStatus.CONNECTED) {
    statusColor = "variant-filled-success";
  } else if (relay.status === NDKRelayStatus.DISCONNECTED) {
    statusColor = "variant-filled-error";
  } else {
    statusColor = "variant-filled-warning";
  }

  const attemptReconnect = async () => {
    loading = true;
    disabledLocal = true;
    await nostrHandler.reconnectRelay(relay.object);
    nostrHandler.on("reconnect-finished", () => {
      loading = false;
      disabledLocal = false;
    });
  }

  const removeRelay = async () => {
    loading = true;
    disabledLocal = true;
    nostrHandler.removeRelay(relay.object.url);
    const nostrUserHandler : NostrUserHandler = authUser.getNostrUserHandler();
    if (nostrUserHandler) {
      await nostrUserHandler.removeUserPreferredRelay(relay.object.url);
    }
    loading = false;
    disabledLocal = false;
    toastStore.trigger({
      message: "Relay successfully removed",
      background: "variant-filled-success",
    });
  }

  export let relay : RelayObject;
  export let disabled : boolean | undefined = undefined;

  export let verbose : boolean | undefined = true;

</script>

{#if verbose}
  <div
    class="p-4 card-hover variant-glass-tertiary flex items-center rounded-xl my-4 flex-wrap"
    in:slide={{ duration: 300 }}
    out:slide={{ duration: 300 }}
  >
    <div class="flex items-center mr-4 md:block hidden"><Server/></div>
    <div>
      <div class="flex mb-1">
        <div class="text-xs uppercase font-semibold min-w-[65px] flex items-center">
          URL
        </div>
        <div class="text-xs font-mono">{relay.object?.url}</div>
      </div>
      <div class="flex mb-1">
        <div class="text-xs uppercase font-semibold min-w-[65px] flex items-center">
          mode
        </div>
        <div class="text-xs font-mono">read & write</div>
      </div>
      <div class="flex grow">
        <div class="text-xs uppercase font-semibold min-w-[65px] flex items-center">
          status
        </div>
        <div class="badge text-xs font-light font-mono py-0 px-2 rounded-xl lowercase {statusColor}">
          {NDKRelayStatus[relay.status]}
        </div>
      </div>
    </div>
    <div class="md:ml-auto mt-4 md:mt-0 grow-0 w-full md:max-w-[200px] xl:max-w-[100px] flex md:flex-col">
      <div class="mb-1 w-1/2 md:w-auto mr-1 md:mr-0">
        <button
          on:click={removeRelay}
          title="Delete relay"
          class="btn btn-sm rounded-2xl variant-filled-error w-full"
          disabled={disabled || disabledLocal || explicitRelay}
        >
          <span><XCircle size="15"/></span>
          <span>remove</span>
        </button>
      </div>
      <div class="w-1/2 md:w-auto ml-1 md:ml-0">
        <button
          on:click={attemptReconnect}
          title="Delete relay"
          class="btn btn-sm rounded-2xl variant-filled-primary w-full"
          disabled={disabled || disabledLocal}
        >
          {#if loading}
            <span class="mr-2">
              <Circle size="15" color="white" unit="px"></Circle>
            </span>
          {:else}
            <span><RefreshCcw size="14"/></span>
          {/if}
          <span>refesh</span>
        </button>
      </div>
    </div>
  </div>
{:else}
  <div class="variant-glass-tertiary rounded-xl p-2 flex mb-2">
    <div class="flex items-center ml-2 mr-3"><Server/></div>
    <div>
      <div class="font-mono text-xs">{relay.object?.url}</div>
      <div class="badge text-xs font-light font-mono py-0 px-2 rounded-xl lowercase {statusColor}">
        {NDKRelayStatus[relay.status]}
      </div>
    </div>
  </div>
{/if}

