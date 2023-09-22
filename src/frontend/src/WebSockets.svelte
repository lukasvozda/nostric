<script lang="ts">
  import { NostricHandler } from "./websockets/nostric";
  import { onMount } from "svelte";

  let public_key = "7c3a7e0bce2f99be4d3c7ca146097c0c5344b691e859d33f60a7e4386f488bc4";
  let private_key = "e349f55622c9682ec8bdc05d66cc1600a23099796cb02c95946621f4c2402046";
  let nostric_handler;

  onMount(async () => {
    console.log("initializing nostric handler");
    nostric_handler = new NostricHandler(private_key, public_key);
    console.log("initializing private relay");
    await nostric_handler.init_private_relay();
    console.log("initializing pool");
    await nostric_handler.init_pool([], public_key);
    console.log("pushing to private relay");
    await nostric_handler.publish_to_private_relay("hello world");
  })

</script>
