/* global IC WebSocket */
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
import { verifySignature, validateEvent } from './event';
import { matchFilters } from './filter';
import { getHex64, getSubscriptionId } from './fakejson';
import { MessageQueue } from './utils';
import IcWebSocket from "ic-websocket-js";
import { IDL } from "@dfinity/candid";
export const AppMessageIdl = IDL.Record({
    'text': IDL.Text,
    'timestamp': IDL.Nat64,
});
export const serializeAppMessage = (message) => {
    return new Uint8Array(IDL.encode([AppMessageIdl], [message]));
};
export const deserializeAppMessage = (bytes) => {
    return IDL.decode([AppMessageIdl], bytes)[0];
};
const newListeners = () => ({
    connect: [],
    disconnect: [],
    error: [],
    notice: [],
    auth: [],
});
export function relayInit(gateway_url, canister_actor, canister_id, ic_url, local, persist_key, options = {}) {
    let { listTimeout = 3000, getTimeout = 3000, countTimeout = 3000 } = options;
    var ws;
    var openSubs = {};
    var listeners = newListeners();
    var subListeners = {};
    var pubListeners = {};
    var connectionPromise;
    function connectICRelay() {
        if (connectionPromise) {
            return connectionPromise;
        }
        connectionPromise = new Promise((resolve, reject) => {
            try {
                ws = new IcWebSocket(gateway_url, undefined, {
                    canisterActor: canister_actor,
                    canisterId: canister_id,
                    networkUrl: ic_url,
                    localTest: local,
                    persistKey: persist_key,
                });
            }
            catch (err) {
                reject(err);
            }
            ws.onopen = () => {
                console.log("v onerror");
                listeners.connect.forEach(cb => cb());
                resolve();
            };
            ws.onerror = (error) => {
                console.log("v onerror", error);
                connectionPromise = undefined;
                listeners.error.forEach(cb => cb());
                reject();
            };
            ws.onclose = async () => {
                console.log("v onclose");
                connectionPromise = undefined;
                listeners.disconnect.forEach(cb => cb());
            };
            let incomingMessageQueue = new MessageQueue();
            let handleNextInterval;
            ws.onmessage = async (event) => {
                incomingMessageQueue.enqueue(event.data);
                if (!handleNextInterval) {
                    handleNextInterval = setInterval(handleNext, 0);
                }
            };
            function handleNext() {
                var _a, _b, _c;
                if (incomingMessageQueue.size === 0) {
                    clearInterval(handleNextInterval);
                    handleNextInterval = null;
                    return;
                }
                let data = incomingMessageQueue.dequeue();
                if (data === null) {
                    return;
                }
                const decoded = deserializeAppMessage(data);
                // get the message to be in the expected format for this crazy (unnecessary?) thing below
                const fake_json = decoded.text
                    .replace(/"action":|"subscription_id":|"event":/g, "")
                    .replace(/^{/, "[")
                    .replace(/}$/, "]");
                let subid = getSubscriptionId(fake_json);
                console.log(subid);
                if (subid) {
                    let so = openSubs[subid];
                    if (so && so.alreadyHaveEvent && so.alreadyHaveEvent(getHex64(fake_json, 'id'), canister_id)) {
                        return;
                    }
                }
                try {
                    let data = JSON.parse(fake_json);
                    console.log(data);
                    // we won't do any checks against the data since all failures (i.e. invalid messages from relays)
                    // will naturally be caught by the encompassing try..catch block
                    switch (data[0]) {
                        case 'EVENT': {
                            let id = data[1];
                            let event = data[2];
                            console.log("validate event: ", validateEvent(event));
                            console.log("openSubs[id]: ", openSubs[id]);
                            console.log("openSubs[id].skipVerification: ", openSubs[id].skipVerification);
                            console.log("verifySignature(event): ", verifySignature(event));
                            console.log("matchFilters(openSubs[id].filters, event): ", matchFilters(openSubs[id].filters, event));
                            if (validateEvent(event) &&
                                openSubs[id] &&
                                (openSubs[id].skipVerification || verifySignature(event)) &&
                                matchFilters(openSubs[id].filters, event)) {
                                openSubs[id];
                                (((_a = subListeners[id]) === null || _a === void 0 ? void 0 : _a.event) || []).forEach(cb => cb(event));
                            }
                            return;
                        }
                        case 'COUNT':
                            let id = data[1];
                            let payload = data[2];
                            if (openSubs[id]) {
                                ;
                                (((_b = subListeners[id]) === null || _b === void 0 ? void 0 : _b.count) || []).forEach(cb => cb(payload));
                            }
                            return;
                        case 'EOSE': {
                            let id = data[1];
                            if (id in subListeners) {
                                subListeners[id].eose.forEach(cb => cb());
                                subListeners[id].eose = []; // 'eose' only happens once per sub, so stop listeners here
                            }
                            return;
                        }
                        case 'OK': {
                            let id = data[1];
                            let ok = data[2];
                            let reason = data[3] || '';
                            if (id in pubListeners) {
                                let { resolve, reject } = pubListeners[id];
                                if (ok)
                                    resolve(null);
                                else
                                    reject(new Error(reason));
                            }
                            return;
                        }
                        case 'NOTICE':
                            let notice = data[1];
                            listeners.notice.forEach(cb => cb(notice));
                            return;
                        case 'AUTH': {
                            let challenge = data[1];
                            (_c = listeners.auth) === null || _c === void 0 ? void 0 : _c.forEach(cb => cb(challenge));
                            return;
                        }
                    }
                }
                catch (err) {
                    return;
                }
            }
        });
        return connectionPromise;
    }
    async function connect() {
        return connectICRelay();
    }
    async function trySend(params) {
        let message = {
            text: JSON.stringify(params),
            timestamp: BigInt(Date.now())
        };
        try {
            await ws.send(serializeAppMessage(message));
        }
        catch (err) {
            console.log(err);
        }
    }
    const sub = (filters, { verb = 'REQ', skipVerification = false, alreadyHaveEvent = null, id = Math.random().toString().slice(2), } = {}) => {
        let subid = id;
        openSubs[subid] = {
            id: subid,
            filters,
            skipVerification,
            alreadyHaveEvent,
        };
        trySend([verb, subid]);
        let subscription = {
            sub: (newFilters, newOpts = {}) => sub(newFilters || filters, {
                skipVerification: newOpts.skipVerification || skipVerification,
                alreadyHaveEvent: newOpts.alreadyHaveEvent || alreadyHaveEvent,
                id: subid,
            }),
            unsub: async () => {
                delete openSubs[subid];
                delete subListeners[subid];
                await trySend(['CLOSE', subid]);
            },
            on: (type, cb) => {
                subListeners[subid] = subListeners[subid] || {
                    event: [],
                    count: [],
                    eose: [],
                };
                subListeners[subid][type].push(cb);
            },
            off: (type, cb) => {
                let listeners = subListeners[subid];
                let idx = listeners[type].indexOf(cb);
                if (idx >= 0)
                    listeners[type].splice(idx, 1);
            },
            get events() {
                return eventsGenerator(subscription);
            },
        };
        return subscription;
    };
    function _publishEvent(event, type) {
        return new Promise(async (resolve, reject) => {
            if (!event.id) {
                reject(new Error(`event ${event} has no id`));
                return;
            }
            let id = event.id;
            await trySend([type, event]);
            pubListeners[id] = { resolve, reject };
        });
    }
    return {
        gateway_url,
        canister_actor,
        canister_id,
        ic_url,
        local,
        persist_key,
        sub,
        on: (type, cb) => {
            listeners[type].push(cb);
        },
        off: (type, cb) => {
            let index = listeners[type].indexOf(cb);
            if (index !== -1)
                listeners[type].splice(index, 1);
        },
        list: (filters, opts) => new Promise(resolve => {
            let s = sub(filters, opts);
            let events = [];
            let timeout = setTimeout(() => {
                s.unsub();
                resolve(events);
            }, listTimeout);
            s.on('eose', () => {
                s.unsub();
                clearTimeout(timeout);
                resolve(events);
            });
            s.on('event', event => {
                events.push(event);
            });
        }),
        get: (filter, opts) => new Promise(resolve => {
            let s = sub([filter], opts);
            let timeout = setTimeout(() => {
                s.unsub();
                resolve(null);
            }, getTimeout);
            s.on('event', event => {
                s.unsub();
                clearTimeout(timeout);
                resolve(event);
            });
        }),
        count: (filters) => new Promise(resolve => {
            let s = sub(filters, Object.assign(Object.assign({}, sub), { verb: 'COUNT' }));
            let timeout = setTimeout(() => {
                s.unsub();
                resolve(null);
            }, countTimeout);
            s.on('count', (event) => {
                s.unsub();
                clearTimeout(timeout);
                resolve(event);
            });
        }),
        async publish(event) {
            await _publishEvent(event, 'EVENT');
        },
        async auth(event) {
            await _publishEvent(event, 'AUTH');
        },
        connect,
        close() {
            listeners = newListeners();
            subListeners = {};
            pubListeners = {};
            ws.close();
        },
    };
}
export function eventsGenerator(sub) {
    return __asyncGenerator(this, arguments, function* eventsGenerator_1() {
        let nextResolve;
        const eventQueue = [];
        const pushToQueue = (event) => {
            if (nextResolve) {
                nextResolve(event);
                nextResolve = undefined;
            }
            else {
                eventQueue.push(event);
            }
        };
        sub.on('event', pushToQueue);
        try {
            while (true) {
                if (eventQueue.length > 0) {
                    yield yield __await(eventQueue.shift());
                }
                else {
                    const event = yield __await(new Promise(resolve => {
                        nextResolve = resolve;
                    }));
                    yield yield __await(event);
                }
            }
        }
        finally {
            sub.off('event', pushToQueue);
        }
    });
}
//# sourceMappingURL=relay.js.map