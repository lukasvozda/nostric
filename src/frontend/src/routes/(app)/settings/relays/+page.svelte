<script lang="ts">
  import { Circle } from "svelte-feathers";
  import { nostrHandler, NostrUserHandler } from "$lib/nostr";
  import { authUser } from "$lib/stores/Auth";
  import { relays } from "$lib/stores/Relays";
  import RelayCard from "$lib/components/relays/RelayCard.svelte";
  import { getToastStore } from "@skeletonlabs/skeleton";

  let disabled : boolean = false;
  let loading : boolean = false;
  let newRelay : string = "";
  const toastStore = getToastStore();

  const addRelay = async () => {
    loading = true;
    disabled = true;
    nostrHandler.addRelay(newRelay);
    const nostrUserHandler : NostrUserHandler = authUser.getNostrUserHandler();
    if (nostrUserHandler) {
      await nostrUserHandler.addUserPreferredRelay(newRelay);
    }
    loading = false;
    disabled = false;
    toastStore.trigger({
      message: "Relay successfully added",
      background: "variant-filled-success",
    });
  }

</script>

<h1 class="h1 m-4">Relays</h1>
<div class="m-8">You can manage your relay servers here.</div>
<div class="m-8">
  <input
    type="text"
    bind:value={newRelay}
    class="input p-4"
    placeholder="Enter new relay URL"
    disabled={disabled}
  />
  <button
    on:click={addRelay}
    class="btn variant-filled-primary mt-4 w-full font-medium"
    disabled={disabled || newRelay.length === 0}
  >
    {#if loading}
      <span class="mr-2">
        <Circle size="15" color="white" unit="px"></Circle>
      </span>
    {/if}
    Add Relay
  </button>
</div>

<div class="m-4 p-4">
  {#each $relays as relay}
    <RelayCard {relay} />
  {/each}
</div>
