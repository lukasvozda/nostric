import { relayInit, eventsGenerator } from './relay';
import { normalizeURL } from './utils';
import { matchFilters } from './filter';
export class SimplePool {
    constructor(options = {}) {
        this._seenOn = {}; // a map of all events we've seen in each relay
        this.batchedByKey = {};
        this.seenOnEnabled = true;
        this.batchInterval = 100;
        this._conn = {};
        this.eoseSubTimeout = options.eoseSubTimeout || 3400;
        this.getTimeout = options.getTimeout || 3400;
        this.seenOnEnabled = options.seenOnEnabled !== false;
        this.batchInterval = options.batchInterval || 100;
    }
    close(relays) {
        relays.forEach(({ url, canister_id }) => {
            let relay = this._conn[normalizeURL(url, canister_id)];
            if (relay)
                relay.close();
        });
    }
    async ensureRelay(gateway_url, canister_actor, canister_id, ic_url, local, persist_key) {
        const nm = normalizeURL(gateway_url, canister_id);
        if (!this._conn[nm]) {
            let options = {
                getTimeout: this.getTimeout * 0.9,
                listTimeout: this.getTimeout * 0.9,
            };
            this._conn[nm] = relayInit(gateway_url, canister_actor, canister_id, ic_url, local, persist_key, options);
        }
        const relay = this._conn[nm];
        await relay.connect();
        console.log(`connected to ${nm}`);
        return relay;
    }
    sub(relays, filters, opts) {
        let _knownIds = new Set();
        let modifiedOpts = Object.assign({}, (opts || {}));
        modifiedOpts.alreadyHaveEvent = (id, url) => {
            var _a;
            if ((_a = opts === null || opts === void 0 ? void 0 : opts.alreadyHaveEvent) === null || _a === void 0 ? void 0 : _a.call(opts, id, url)) {
                return true;
            }
            if (this.seenOnEnabled) {
                let set = this._seenOn[id] || new Set();
                set.add(url);
                this._seenOn[id] = set;
            }
            return _knownIds.has(id);
        };
        console.log("som v sub");
        let subs = [];
        let eventListeners = new Set();
        let eoseListeners = new Set();
        let eosesMissing = relays.length;
        let eoseSent = false;
        let eoseTimeout = setTimeout(() => {
            eoseSent = true;
            for (let cb of eoseListeners.values())
                cb();
        }, (opts === null || opts === void 0 ? void 0 : opts.eoseSubTimeout) || this.eoseSubTimeout);
        console.log("som pred relays", relays);
        relays
            .filter((r, i, a) => a.indexOf(r) === i)
            .forEach(async ({ gateway_url, canister_actor, canister_id, ic_url, local, persist_key }) => {
            let r;
            try {
                r = await this.ensureRelay(gateway_url, canister_actor, canister_id, ic_url, local, persist_key);
                console.log("relay ensured");
            }
            catch (err) {
                console.error("relay not ensured", err);
                handleEose();
                return;
            }
            if (!r)
                return;
            let s = r.sub(filters, modifiedOpts);
            s.on('event', event => {
                _knownIds.add(event.id);
                for (let cb of eventListeners.values())
                    cb(event);
            });
            s.on('eose', () => {
                if (eoseSent)
                    return;
                handleEose();
            });
            subs.push(s);
            function handleEose() {
                eosesMissing--;
                if (eosesMissing === 0) {
                    clearTimeout(eoseTimeout);
                    for (let cb of eoseListeners.values())
                        cb();
                }
            }
        });
        let greaterSub = {
            sub(filters, opts) {
                subs.forEach(sub => sub.sub(filters, opts));
                return greaterSub;
            },
            unsub() {
                subs.forEach(sub => sub.unsub());
            },
            on(type, cb) {
                if (type === 'event') {
                    eventListeners.add(cb);
                }
                else if (type === 'eose') {
                    eoseListeners.add(cb);
                }
            },
            off(type, cb) {
                if (type === 'event') {
                    eventListeners.delete(cb);
                }
                else if (type === 'eose')
                    eoseListeners.delete(cb);
            },
            get events() {
                return eventsGenerator(greaterSub);
            },
        };
        return greaterSub;
    }
    get(relays, filter, opts) {
        return new Promise(resolve => {
            let sub = this.sub(relays, [filter], opts);
            let timeout = setTimeout(() => {
                sub.unsub();
                resolve(null);
            }, this.getTimeout);
            sub.on('event', event => {
                resolve(event);
                clearTimeout(timeout);
                sub.unsub();
            });
        });
    }
    list(relays, filters, opts) {
        return new Promise(resolve => {
            let events = [];
            let sub = this.sub(relays, filters, opts);
            sub.on('event', event => {
                events.push(event);
            });
            // we can rely on an eose being emitted here because pool.sub() will fake one
            sub.on('eose', () => {
                sub.unsub();
                resolve(events);
            });
        });
    }
    batchedList(batchKey, relays, filters) {
        return new Promise(resolve => {
            if (!this.batchedByKey[batchKey]) {
                this.batchedByKey[batchKey] = [
                    {
                        filters,
                        relays,
                        resolve,
                        events: [],
                    },
                ];
                setTimeout(() => {
                    Object.keys(this.batchedByKey).forEach(async (batchKey) => {
                        const batchedRequests = this.batchedByKey[batchKey];
                        const filters = [];
                        const relays = [];
                        batchedRequests.forEach(br => {
                            filters.push(...br.filters);
                            relays.push(...br.relays);
                        });
                        const sub = this.sub(relays, filters);
                        sub.on('event', event => {
                            batchedRequests.forEach(br => matchFilters(br.filters, event) && br.events.push(event));
                        });
                        sub.on('eose', () => {
                            sub.unsub();
                            batchedRequests.forEach(br => br.resolve(br.events));
                        });
                        delete this.batchedByKey[batchKey];
                    });
                }, this.batchInterval);
            }
            else {
                this.batchedByKey[batchKey].push({
                    filters,
                    relays,
                    resolve,
                    events: [],
                });
            }
        });
    }
    publish(relays, event) {
        return relays.map(async ({ gateway_url, canister_actor, canister_id, ic_url, local, persist_key }) => {
            let r = await this.ensureRelay(gateway_url, canister_actor, canister_id, ic_url, local, persist_key);
            return r.publish(event);
        });
    }
    seenOn(id) {
        var _a, _b;
        return Array.from(((_b = (_a = this._seenOn[id]) === null || _a === void 0 ? void 0 : _a.values) === null || _b === void 0 ? void 0 : _b.call(_a)) || []);
    }
}
//# sourceMappingURL=pool.js.map