import { schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
// @ts-ignore
import { getPublicKey } from './keys';
import { utf8Encoder } from './utils';
/** Designates a verified event signature. */
export const verifiedSymbol = Symbol('verified');
/** @deprecated Use numbers instead. */
/* eslint-disable no-unused-vars */
export var Kind;
(function (Kind) {
    Kind[Kind["Metadata"] = 0] = "Metadata";
    Kind[Kind["Text"] = 1] = "Text";
    Kind[Kind["RecommendRelay"] = 2] = "RecommendRelay";
    Kind[Kind["Contacts"] = 3] = "Contacts";
    Kind[Kind["EncryptedDirectMessage"] = 4] = "EncryptedDirectMessage";
    Kind[Kind["EventDeletion"] = 5] = "EventDeletion";
    Kind[Kind["Repost"] = 6] = "Repost";
    Kind[Kind["Reaction"] = 7] = "Reaction";
    Kind[Kind["BadgeAward"] = 8] = "BadgeAward";
    Kind[Kind["ChannelCreation"] = 40] = "ChannelCreation";
    Kind[Kind["ChannelMetadata"] = 41] = "ChannelMetadata";
    Kind[Kind["ChannelMessage"] = 42] = "ChannelMessage";
    Kind[Kind["ChannelHideMessage"] = 43] = "ChannelHideMessage";
    Kind[Kind["ChannelMuteUser"] = 44] = "ChannelMuteUser";
    Kind[Kind["Blank"] = 255] = "Blank";
    Kind[Kind["Report"] = 1984] = "Report";
    Kind[Kind["ZapRequest"] = 9734] = "ZapRequest";
    Kind[Kind["Zap"] = 9735] = "Zap";
    Kind[Kind["RelayList"] = 10002] = "RelayList";
    Kind[Kind["ClientAuth"] = 22242] = "ClientAuth";
    Kind[Kind["HttpAuth"] = 27235] = "HttpAuth";
    Kind[Kind["ProfileBadge"] = 30008] = "ProfileBadge";
    Kind[Kind["BadgeDefinition"] = 30009] = "BadgeDefinition";
    Kind[Kind["Article"] = 30023] = "Article";
    Kind[Kind["FileMetadata"] = 1063] = "FileMetadata";
})(Kind || (Kind = {}));
// export function getBlankEvent(): EventTemplate<Kind.Blank>
// export function getBlankEvent<K extends number>(kind: K): EventTemplate<K>
// export function getBlankEvent<K>(kind: K | Kind.Blank = Kind.Blank) {
//   return {
//     kind,
//     content: '',
//     tags: [],
//     created_at: 0,
//   }
// }
export function finishEvent(t, privateKey) {
    const event = t;
    event.pubkey = getPublicKey(privateKey);
    event.id = getEventHash(event);
    event.sig = getSignature(event, privateKey);
    event[verifiedSymbol] = true;
    return event;
}
export function serializeEvent(evt) {
    if (!validateEvent(evt))
        throw new Error("can't serialize event with wrong or missing properties");
    return JSON.stringify([0, evt.pubkey, evt.created_at, evt.kind, evt.tags, evt.content]);
}
export function getEventHash(event) {
    let eventHash = sha256(utf8Encoder.encode(serializeEvent(event)));
    return bytesToHex(eventHash);
}
const isRecord = (obj) => obj instanceof Object;
export function validateEvent(event) {
    if (!isRecord(event))
        return false;
    if (typeof event.kind !== 'number')
        return false;
    if (typeof event.content !== 'string')
        return false;
    if (typeof event.created_at !== 'number')
        return false;
    if (typeof event.pubkey !== 'string')
        return false;
    if (!event.pubkey.match(/^[a-f0-9]{64}$/))
        return false;
    if (!Array.isArray(event.tags))
        return false;
    for (let i = 0; i < event.tags.length; i++) {
        let tag = event.tags[i];
        if (!Array.isArray(tag))
            return false;
        for (let j = 0; j < tag.length; j++) {
            if (typeof tag[j] === 'object')
                return false;
        }
    }
    return true;
}
/** Verify the event's signature. This function mutates the event with a `verified` symbol, making it idempotent. */
export function verifySignature(event) {
    if (typeof event[verifiedSymbol] === 'boolean')
        return event[verifiedSymbol];
    const hash = getEventHash(event);
    if (hash !== event.id) {
        return (event[verifiedSymbol] = false);
    }
    try {
        return (event[verifiedSymbol] = schnorr.verify(event.sig, hash, event.pubkey));
    }
    catch (err) {
        return (event[verifiedSymbol] = false);
    }
}
/** @deprecated Use `getSignature` instead. */
export function signEvent(event, key) {
    console.warn('nostr-tools: `signEvent` is deprecated and will be removed or changed in the future. Please use `getSignature` instead.');
    return getSignature(event, key);
}
/** Calculate the signature for an event. */
export function getSignature(event, key) {
    return bytesToHex(schnorr.sign(getEventHash(event), key));
}
//# sourceMappingURL=event.js.map