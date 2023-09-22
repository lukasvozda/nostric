/* global IC WebSocket */

import { verifySignature, validateEvent, type Event } from './event'
import { matchFilters, type Filter } from './filter'
import { getHex64, getSubscriptionId } from './fakejson'
import { MessageQueue } from './utils'
import IcWebSocket from "ic-websocket-js";
import { IDL } from "@dfinity/candid";


export const AppMessageIdl = IDL.Record({
  'text': IDL.Text,
  'timestamp': IDL.Nat64,
});

export type AppMessage = { "text" : string, "timestamp" : bigint }

export const serializeAppMessage = (message: AppMessage): Uint8Array => {
  return new Uint8Array(IDL.encode([AppMessageIdl], [message]));
};

export const deserializeAppMessage = (bytes: Buffer | ArrayBuffer | Uint8Array): AppMessage => {
  return IDL.decode([AppMessageIdl], bytes)[0] as unknown as AppMessage;
};


type RelayEvent = {
  connect: () => void |  Promise<void>
  disconnect: () => void | Promise<void>
  error: () => void | Promise<void>
  notice: (msg: string) => void | Promise<void>
  auth: (challenge: string) => void | Promise<void>
}
export type CountPayload = {
  count: number
}
export type SubEvent<K extends number> = {
  event: (event: Event<K>) => void | Promise<void>
  count: (payload: CountPayload) => void | Promise<void>
  eose: () => void | Promise<void>
}
export type Relay = {
  gateway_url: string
  canister_actor: any
  canister_id: string
  ic_url: string
  local: boolean
  persist_key: boolean
  connect: () => Promise<void>
  close: () => void
  sub: <K extends number = number>(filters: Filter<K>[], opts?: SubscriptionOptions) => Sub<K>
  list: <K extends number = number>(filters: Filter<K>[], opts?: SubscriptionOptions) => Promise<Event<K>[]>
  get: <K extends number = number>(filter: Filter<K>, opts?: SubscriptionOptions) => Promise<Event<K> | null>
  count: (filters: Filter[], opts?: SubscriptionOptions) => Promise<CountPayload | null>
  publish: (event: Event<number>) => Promise<void>
  auth: (event: Event<number>) => Promise<void>
  off: <T extends keyof RelayEvent, U extends RelayEvent[T]>(event: T, listener: U) => void
  on: <T extends keyof RelayEvent, U extends RelayEvent[T]>(event: T, listener: U) => void
}
export type Sub<K extends number = number> = {
  sub: <K extends number = number>(filters: Filter<K>[], opts: SubscriptionOptions) => Sub<K>
  unsub: () => void
  on: <T extends keyof SubEvent<K>, U extends SubEvent<K>[T]>(event: T, listener: U) => void
  off: <T extends keyof SubEvent<K>, U extends SubEvent<K>[T]>(event: T, listener: U) => void
  events: AsyncGenerator<Event<K>, void, unknown>
}

export type SubscriptionOptions = {
  id?: string
  verb?: 'REQ' | 'COUNT'
  skipVerification?: boolean
  alreadyHaveEvent?: null | ((id: string, relay: string) => boolean)
  eoseSubTimeout?: number
}

const newListeners = (): { [TK in keyof RelayEvent]: RelayEvent[TK][] } => ({
  connect: [],
  disconnect: [],
  error: [],
  notice: [],
  auth: [],
})

export function relayInit(
    gateway_url: string,
  canister_actor: any,
  canister_id: string,
  ic_url: string,
  local: boolean,
  persist_key: boolean,
  options: {
    getTimeout?: number
    listTimeout?: number
    countTimeout?: number
  } = {},
): Relay {
  let { listTimeout = 3000, getTimeout = 3000, countTimeout = 3000 } = options

  var ws: IcWebSocket<any>
  var openSubs: { [id: string]: { filters: Filter[] } & SubscriptionOptions } = {}
  var listeners = newListeners()
  var subListeners: {
    [subid: string]: { [TK in keyof SubEvent<any>]: SubEvent<any>[TK][] }
  } = {}
  var pubListeners: {
    [eventid: string]: {
      resolve: (_: unknown) => void
      reject: (err: Error) => void
    }
  } = {}

  var connectionPromise: Promise<void> | undefined
  function connectICRelay(): Promise<void> {

    if (connectionPromise) {
      return connectionPromise
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
      } catch (err) {
        reject(err)
      }

      ws.onopen = () => {
        console.log("v onerror");
        listeners.connect.forEach(cb => cb());
        resolve()
      }
      ws.onerror = (error) => {
        console.log("v onerror", error);
        connectionPromise = undefined
        listeners.error.forEach(cb => cb())
        reject()
      }
      ws.onclose = async () => {
        console.log("v onclose");
        connectionPromise = undefined
        listeners.disconnect.forEach(cb => cb())
      }

      let incomingMessageQueue: MessageQueue = new MessageQueue()
      let handleNextInterval: any

      ws.onmessage = async (event)  => {
        incomingMessageQueue.enqueue(event.data)
        if (!handleNextInterval) {
          handleNextInterval = setInterval(handleNext, 0)
        }
      }

      function handleNext() {

        if (incomingMessageQueue.size === 0) {
          clearInterval(handleNextInterval)
          handleNextInterval = null
          return
        }

        let data = incomingMessageQueue.dequeue()
        if (data === null) {
          return;
        }

        const decoded : AppMessage = deserializeAppMessage(data);

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
            return
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

              if (
                validateEvent(event) &&
                openSubs[id] &&
                (openSubs[id].skipVerification || verifySignature(event)) &&
                matchFilters(openSubs[id].filters, event)
              ) {
                openSubs[id]
                ;(subListeners[id]?.event || []).forEach(cb => cb(event))
              }
              return
            }
            case 'COUNT':
              let id = data[1]
              let payload = data[2]
              if (openSubs[id]) {
                ;(subListeners[id]?.count || []).forEach(cb => cb(payload))
              }
              return
            case 'EOSE': {
              let id = data[1]
              if (id in subListeners) {
                subListeners[id].eose.forEach(cb => cb())
                subListeners[id].eose = [] // 'eose' only happens once per sub, so stop listeners here
              }
              return
            }
            case 'OK': {
              let id: string = data[1]
              let ok: boolean = data[2]
              let reason: string = data[3] || ''
              if (id in pubListeners) {
                let { resolve, reject } = pubListeners[id]
                if (ok) resolve(null)
                else reject(new Error(reason))
              }
              return
            }
            case 'NOTICE':
              let notice = data[1]
              listeners.notice.forEach(cb => cb(notice))
              return
            case 'AUTH': {
              let challenge = data[1]
              listeners.auth?.forEach(cb => cb(challenge))
              return
            }
          }
        } catch (err) {
          return
        }
      }
    });

    return connectionPromise
  }

  async function connect(): Promise<void> {
    return connectICRelay();
  }

  async function trySend(params: [string, ...any]) {
    let message : AppMessage = {
      text: JSON.stringify(params),
      timestamp: BigInt(Date.now())
    };
    try {
      await ws.send(serializeAppMessage(message));
    } catch (err) {
      console.log(err)
    }
  }

  const sub = <K extends number = number>(
    filters: Filter<K>[],
    {
      verb = 'REQ',
      skipVerification = false,
      alreadyHaveEvent = null,
      id = Math.random().toString().slice(2),
    }: SubscriptionOptions = {},
  ): Sub<K> => {
    let subid = id

    openSubs[subid] = {
      id: subid,
      filters,
      skipVerification,
      alreadyHaveEvent,
    }
    trySend([verb, subid])

    let subscription: Sub<K> = {
      sub: (newFilters, newOpts = {}) =>
        sub((newFilters || filters), {
          skipVerification: newOpts.skipVerification || skipVerification,
          alreadyHaveEvent: newOpts.alreadyHaveEvent || alreadyHaveEvent,
          id: subid,
        }),
      unsub: async () => {
        delete openSubs[subid]
        delete subListeners[subid]
        await trySend(['CLOSE', subid])
      },
      on: (type, cb) => {
        subListeners[subid] = subListeners[subid] || {
          event: [],
          count: [],
          eose: [],
        }
        subListeners[subid][type].push(cb)
      },
      off: (type, cb): void => {
        let listeners = subListeners[subid]
        let idx = listeners[type].indexOf(cb)
        if (idx >= 0) listeners[type].splice(idx, 1)
      },
      get events() {
        return eventsGenerator(subscription)
      },
    }

    return subscription
  }

  function _publishEvent(event: Event<number>, type: string) {
    return new Promise(async (resolve, reject) => {
      if (!event.id) {
        reject(new Error(`event ${event} has no id`))
        return
      }

      let id = event.id
      await trySend([type, event])
      pubListeners[id] = { resolve, reject }
    })
  }

  return {
    gateway_url,
    canister_actor,
    canister_id,
    ic_url,
    local,
    persist_key,
    sub,
    on: <T extends keyof RelayEvent, U extends RelayEvent[T]>(type: T, cb: U): void => {
      listeners[type].push(cb)
    },
    off: <T extends keyof RelayEvent, U extends RelayEvent[T]>(type: T, cb: U): void => {
      let index = listeners[type].indexOf(cb)
      if (index !== -1) listeners[type].splice(index, 1)
    },
    list: (filters, opts?: SubscriptionOptions) =>
      new Promise(resolve => {
        let s = sub(filters, opts)
        let events: Event<any>[] = []
        let timeout = setTimeout(() => {
          s.unsub()
          resolve(events)
        }, listTimeout)
        s.on('eose', () => {
          s.unsub()
          clearTimeout(timeout)
          resolve(events)
        })
        s.on('event', event => {
          events.push(event)
        })
      }),
    get: (filter, opts?: SubscriptionOptions) =>
      new Promise(resolve => {
        let s = sub([filter], opts)
        let timeout = setTimeout(() => {
          s.unsub()
          resolve(null)
        }, getTimeout)
        s.on('event', event => {
          s.unsub()
          clearTimeout(timeout)
          resolve(event)
        })
      }),
    count: (filters: Filter[]): Promise<CountPayload | null> =>
      new Promise(resolve => {
        let s = sub(filters, { ...sub, verb: 'COUNT' })
        let timeout = setTimeout(() => {
          s.unsub()
          resolve(null)
        }, countTimeout)
        s.on('count', (event: CountPayload) => {
          s.unsub()
          clearTimeout(timeout)
          resolve(event)
        })
      }),
    async publish(event): Promise<void> {
      await _publishEvent(event, 'EVENT')
    },
    async auth(event): Promise<void> {
      await _publishEvent(event, 'AUTH')
    },
    connect,
    close(): void {
      listeners = newListeners()
      subListeners = {}
      pubListeners = {}
      ws.close();
    },
  }
}

export async function* eventsGenerator<K extends number>(sub: Sub<K>): AsyncGenerator<Event<K>, void, unknown> {
  let nextResolve: ((event: Event<K>) => void) | undefined
  const eventQueue: Event<K>[] = []

  const pushToQueue = (event: Event<K>) => {
    if (nextResolve) {
      nextResolve(event)
      nextResolve = undefined
    } else {
      eventQueue.push(event)
    }
  }

  sub.on('event', pushToQueue)

  try {
    while (true) {
      if (eventQueue.length > 0) {
        yield eventQueue.shift()!
      } else {
        const event = await new Promise<Event<K>>(resolve => {
          nextResolve = resolve
        })
        yield event
      }
    }
  } finally {
    sub.off('event', pushToQueue)
  }
}
