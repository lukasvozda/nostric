import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export type AttributeKey = string;
export type AttributeValue = { 'int' : bigint } |
  { 'float' : number } |
  { 'tuple' : Array<AttributeValuePrimitive> } |
  { 'blob' : Uint8Array | number[] } |
  { 'bool' : boolean } |
  { 'candy' : CandyShared } |
  { 'text' : string } |
  { 'tree' : Tree } |
  { 'arrayBool' : Array<boolean> } |
  { 'arrayText' : Array<string> } |
  { 'arrayInt' : Array<bigint> } |
  { 'arrayFloat' : Array<number> };
export type AttributeValuePrimitive = { 'int' : bigint } |
  { 'float' : number } |
  { 'bool' : boolean } |
  { 'text' : string };
export type AttributeValueRBTreeValue = { 'int' : bigint } |
  { 'float' : number } |
  { 'tuple' : Array<AttributeValuePrimitive> } |
  { 'blob' : Uint8Array | number[] } |
  { 'bool' : boolean } |
  { 'candy' : CandyShared } |
  { 'text' : string } |
  { 'arrayBool' : Array<boolean> } |
  { 'arrayText' : Array<string> } |
  { 'arrayInt' : Array<bigint> } |
  { 'arrayFloat' : Array<number> };
export type CandyShared = { 'Int' : bigint } |
  { 'Map' : Array<[string, CandyShared]> } |
  { 'Nat' : bigint } |
  { 'Set' : Array<CandyShared> } |
  { 'Nat16' : number } |
  { 'Nat32' : number } |
  { 'Nat64' : bigint } |
  { 'Blob' : Uint8Array | number[] } |
  { 'Bool' : boolean } |
  { 'Int8' : number } |
  { 'Ints' : Array<bigint> } |
  { 'Nat8' : number } |
  { 'Nats' : Array<bigint> } |
  { 'Text' : string } |
  { 'Bytes' : Uint8Array | number[] } |
  { 'Int16' : number } |
  { 'Int32' : number } |
  { 'Int64' : bigint } |
  { 'Option' : [] | [CandyShared] } |
  { 'Floats' : Array<number> } |
  { 'Float' : number } |
  { 'Principal' : Principal } |
  { 'Array' : Array<CandyShared> } |
  { 'ValueMap' : Array<[CandyShared, CandyShared]> } |
  { 'Class' : Array<PropertyShared> };
export type Color = { 'B' : null } |
  { 'R' : null };
export interface File { 'content' : Uint8Array | number[], 'name' : string }
export type PK = string;
export interface PropertyShared {
  'value' : CandyShared,
  'name' : string,
  'immutable' : boolean,
}
export interface RemoveOptions { 'pk' : PK, 'sk' : SK }
export type SK = string;
export interface ScanOptions {
  'pk' : PK,
  'limit' : bigint,
  'ascending' : [] | [boolean],
  'skLowerBound' : SK,
  'skUpperBound' : SK,
}
export type Tree = { 'leaf' : null } |
  { 'node' : [Color, Tree, [string, [] | [AttributeValueRBTreeValue]], Tree] };
export interface _SERVICE {
  'create' : ActorMethod<[File], undefined>,
  'download_wrapper' : ActorMethod<[string], Uint8Array | number[]>,
  'get' : ActorMethod<[string], [] | [File]>,
  'remove' : ActorMethod<[RemoveOptions], [] | [File]>,
  'scan' : ActorMethod<[ScanOptions], Array<[] | [File]>>,
  'update' : ActorMethod<
    [
      {
        'pk' : PK,
        'sk' : SK,
        'attributesToUpdate' : Array<[AttributeKey, AttributeValue]>,
      },
    ],
    [] | [File]
  >,
  'upload_wrapper' : ActorMethod<[string, Uint8Array | number[]], undefined>,
}
