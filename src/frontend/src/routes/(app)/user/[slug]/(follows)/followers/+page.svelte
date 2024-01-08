<script lang="ts">
  import { Avatar } from "@skeletonlabs/skeleton";
  import { UserMinus, UserPlus } from "svelte-feathers";
</script>

<h1 class="h1 m-4">Followers</h1>
<div class="px-4">
  {#each Array.from({ length: 30 }) as item}
    <div
      class="post-head mx-auto my-4 flex md:flex-row flex-col justify-between items-start"
    >
      <!-- Avatar, Username and Link -->
      <a href="/user/1" class="flex items-start">
        <div>
          <Avatar
            src="/img/ape.jpeg"
            class="mr-4 mt-1"
            initials="LV"
            width="w-10"
            background="bg-primary-500"
          />
        </div>
        <div>
          <div class="font-bold">Lukas Vozda</div>
          <span class="text-sm username"
            >npub241BKSDASUDSAasDASFASDFADFASDFSasdfs
          </span>
        </div>
      </a>

      <!-- Follow Button – we follow only some people that follow us -->
      {#if Math.random() < 0.5 }
      <button type="button" class="btn variant-filled-primary font-normal">
        <span>
          <UserPlus size="16" class="lg:mx-auto xl:mx-0"></UserPlus>
        </span>
        <span class="text-sm"> Follow </span>
      </button>
      {:else}
      <button type="button" class="btn variant-filled-warning font-normal">
        <span>
          <UserMinus size="16" class="lg:mx-auto xl:mx-0"></UserMinus>
        </span>
        <span class="text-sm"> Unfollow </span>
      </button>
      {/if}      
    </div>
  {/each}
</div>
