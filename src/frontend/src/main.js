import App from "./App.svelte";
import { default as vetkd_init } from "../../../vetkd_user_lib/ic_vetkd_utils.js";
import vetkd_wasm from "../../../vetkd_user_lib/ic_vetkd_utils_bg.wasm";
import { init as init_auth } from "./store/auth";
const init = async () => {
    await vetkd_init(await vetkd_wasm());
    const app = new App({
        target: document.body,
    });
    await init_auth();
};
init();
//# sourceMappingURL=main.js.map