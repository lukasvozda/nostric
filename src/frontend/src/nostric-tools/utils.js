export const utf8Decoder = new TextDecoder('utf-8');
export const utf8Encoder = new TextEncoder();
export function normalizeURL(url, canister_id) {
    console.log("normalizeURL ", url);
    let p = new URL(url);
    p.pathname = p.pathname.replace(/\/+/g, '/');
    if (p.pathname.endsWith('/'))
        p.pathname = p.pathname.slice(0, -1);
    if ((p.port === '80' && p.protocol === 'ws:') || (p.port === '443' && p.protocol === 'wss:'))
        p.port = '';
    p.searchParams.sort();
    p.hash = '';
    return p.toString() + "_" + canister_id;
}
//
// fast insert-into-sorted-array functions adapted from https://github.com/terrymorse58/fast-sorted-array
//
export function insertEventIntoDescendingList(sortedArray, event) {
    var _a;
    let start = 0;
    let end = sortedArray.length - 1;
    let midPoint;
    let position = start;
    if (end < 0) {
        position = 0;
    }
    else if (event.created_at < sortedArray[end].created_at) {
        position = end + 1;
    }
    else if (event.created_at >= sortedArray[start].created_at) {
        position = start;
    }
    else
        while (true) {
            if (end <= start + 1) {
                position = end;
                break;
            }
            midPoint = Math.floor(start + (end - start) / 2);
            if (sortedArray[midPoint].created_at > event.created_at) {
                start = midPoint;
            }
            else if (sortedArray[midPoint].created_at < event.created_at) {
                end = midPoint;
            }
            else {
                // aMidPoint === num
                position = midPoint;
                break;
            }
        }
    // insert when num is NOT already in (no duplicates)
    if (((_a = sortedArray[position]) === null || _a === void 0 ? void 0 : _a.id) !== event.id) {
        return [...sortedArray.slice(0, position), event, ...sortedArray.slice(position)];
    }
    return sortedArray;
}
export function insertEventIntoAscendingList(sortedArray, event) {
    var _a;
    let start = 0;
    let end = sortedArray.length - 1;
    let midPoint;
    let position = start;
    if (end < 0) {
        position = 0;
    }
    else if (event.created_at > sortedArray[end].created_at) {
        position = end + 1;
    }
    else if (event.created_at <= sortedArray[start].created_at) {
        position = start;
    }
    else
        while (true) {
            if (end <= start + 1) {
                position = end;
                break;
            }
            midPoint = Math.floor(start + (end - start) / 2);
            if (sortedArray[midPoint].created_at < event.created_at) {
                start = midPoint;
            }
            else if (sortedArray[midPoint].created_at > event.created_at) {
                end = midPoint;
            }
            else {
                // aMidPoint === num
                position = midPoint;
                break;
            }
        }
    // insert when num is NOT already in (no duplicates)
    if (((_a = sortedArray[position]) === null || _a === void 0 ? void 0 : _a.id) !== event.id) {
        return [...sortedArray.slice(0, position), event, ...sortedArray.slice(position)];
    }
    return sortedArray;
}
export class MessageNode {
    constructor(message) {
        this._value = message;
        this._next = null;
    }
    get value() {
        return this._value;
    }
    set value(message) {
        this._value = message;
    }
    get next() {
        return this._next;
    }
    set next(node) {
        this._next = node;
    }
}
export class MessageQueue {
    constructor() {
        this._first = null;
        this._last = null;
        this._size = 0;
    }
    get first() {
        return this._first;
    }
    set first(messageNode) {
        this._first = messageNode;
    }
    get last() {
        return this._last;
    }
    set last(messageNode) {
        this._last = messageNode;
    }
    get size() {
        return this._size;
    }
    set size(v) {
        this._size = v;
    }
    enqueue(message) {
        const newNode = new MessageNode(message);
        if (this._size === 0 || !this._last) {
            this._first = newNode;
            this._last = newNode;
        }
        else {
            this._last.next = newNode;
            this._last = newNode;
        }
        this._size++;
        return true;
    }
    dequeue() {
        if (this._size === 0 || !this._first)
            return null;
        let prev = this._first;
        this._first = prev.next;
        prev.next = null;
        this._size--;
        return prev.value;
    }
}
//# sourceMappingURL=utils.js.map