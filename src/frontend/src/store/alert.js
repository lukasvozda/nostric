import { writable } from "svelte/store";
export var Alerts;
(function (Alerts) {
    Alerts["INFO"] = "info";
    Alerts["SUCCESS"] = "success";
    Alerts["WARNING"] = "warning";
    Alerts["ERROR"] = "error";
})(Alerts || (Alerts = {}));
function fetch_alert() {
    const { subscribe, set } = writable(null);
    const create = (text, time = null, level) => set({
        text, level, time: time || new Date().toLocaleTimeString()
    });
    const error = (text, time = null) => create(text, time, Alerts.ERROR);
    const info = (text, time = null) => create(text, time, Alerts.INFO);
    const warning = (text, time = null) => create(text, time, Alerts.WARNING);
    const success = (text, time = null) => create(text, time, Alerts.SUCCESS);
    const clear = () => set(null);
    return {
        subscribe,
        error,
        info,
        warning,
        success,
        clear
    };
}
export const alert = fetch_alert();
//# sourceMappingURL=alert.js.map