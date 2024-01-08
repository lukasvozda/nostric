<script lang="ts">
  import { onMount } from "svelte";
  import { ChevronLeft } from "svelte-feathers";
  import type { NDKUser } from "@nostr-dev-kit/ndk";
  import { nostrHandler } from "$lib/nostr";
  import { page } from "$app/stores";
  import { ROUTES, get_path } from "$lib/utils/routes";

  let userPromise: Promise<NDKUser>;
  // Probably there will be more efficient way so we don't need to fetch user data again
  onMount(async () => {
    // @ts-ignore
    userPromise = nostrHandler.fetchUserProfileByPublicKey($page.params.slug);
  });
</script>

{#await userPromise then user}
  {#if user}
    <a
      href={get_path(ROUTES.USER, user?.pubkey || "")}
      class="inline-flex items-center gap-2 mx-2 p-2 anchor rounded-md transition hover:bg-primary-hover-token"
    >
      <ChevronLeft /> <span>{user.profile?.name || ""}</span>
    </a>
    <slot />
  {/if}
{/await}
