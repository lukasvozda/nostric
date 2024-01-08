<script>

    import { Avatar } from "@skeletonlabs/skeleton";
    import { UserMinus } from "svelte-feathers";

</script>
<h1 class="h1 m-4">Following</h1>

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
      <!-- We can only unfollow people that we follow -->
      <button type="button" class="btn variant-filled-warning font-normal">
        <span>
          <UserMinus size="16" class="lg:mx-auto xl:mx-0"></UserMinus>
        </span>
        <span class="text-sm"> Unfollow </span>
      </button> 
    </div>
  {/each}
</div>