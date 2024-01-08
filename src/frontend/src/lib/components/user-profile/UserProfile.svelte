<script lang="ts">
  import Post from "$lib/components/post/Post.svelte";
  import type { NDKEvent, NDKUser, NDKUserProfile } from "@nostr-dev-kit/ndk";
  import { onMount } from "svelte";
  import Avatar from "$lib/components/user-profile/Avatar.svelte";
  import { nostrHandler } from "$lib/nostr";
  import { NDKKind } from "@nostr-dev-kit/ndk";
  import { ROUTES, get_path } from "$lib/utils/routes";

  let profile: NDKUserProfile | undefined;
  let userEvents: Promise<NDKEvent[]>;

  onMount(async () => {
    profile = user?.profile;
    if (!events) {
      userEvents = await nostrHandler.fetchEventsByAuthorPubkey(user.pubkey);
      console.log(user)
    }
  });

  export let user: NDKUser;
  export let events: NDKEvent[];

  $: if (events) {
    userEvents = Promise.resolve(events);
  }
</script>

<h1 class="h1 m-4">User profile</h1>

<div class="mx-auto flex md:flex-row flex-col ml-4 mt-8">
  <div class="w-1/5">
    <Avatar {profile} />
  </div>
  <div class="w-4/5 px-4 flex flex-col justify-center">
    <div class="font-bold text-xl">{profile?.displayName || profile?.name}</div>
    <span class="text-md">@{profile?.name}</span>
    <div class="text-sm break-words">{user?.npub}</div>
    <div class="flex mt-4">
      <a
        href={get_path(ROUTES.USER, user?.pubkey || "", ROUTES.FOLLOWERS)}
        class="flex flex-col items-center mr-6 p-2 follow hover:bg-primary-hover-token rounded-md transition"
      >
        <span>Followers</span>
        <span class="text-4xl font-bold">50</span>
      </a>
      <a
      href={get_path(ROUTES.USER, user?.pubkey || "", ROUTES.FOLLOWING)}
        class="flex flex-col items-center p-2 follow hover:bg-primary-hover-token rounded-md transition"
      >
        <span>Following</span>
        <span class="text-4xl font-bold">78</span>
      </a>
    </div>
  </div>
</div>
<div class="m-4 mb-10">
  {profile?.bio ||
    "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Morbi commodo, ipsum sed pharetra gravida, orci magna rhoncus neque, id pulvinar odio lorem non turpis. Nullam sit amet enim."}
</div>

<hr class="!border-t-2 mx-4" />

<div class="text-3xl my-8 mx-4 font-bold">Posts</div>

{#await userEvents then fetchedEvents}
  {#if fetchedEvents}
    {#each fetchedEvents.filter((e) => e.kind === NDKKind.Text) as event}
      <Post {event} author={user} />
    {/each}
  {/if}
{/await}
