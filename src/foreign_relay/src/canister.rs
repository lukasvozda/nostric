use candid::{CandidType, encode_one, decode_one};
use ic_cdk::{print, api::time};

use ic_websocket_cdk::{
    ws_send, ClientPublicKey, OnCloseCallbackArgs, OnMessageCallbackArgs, OnOpenCallbackArgs,
};

#[derive(CandidType, Clone, Debug, Deserialize, Serialize, Eq, PartialEq)]
pub struct AppMessage {
    pub text: String,
    pub timestamp: u64,
}

// moje
use serde_json::Value;
// use serde_json::Number;
use std::error::Error;
// use secp256k1::{Message};
// use bitcoin_hashes::{sha256, Hash};
use serde::{Deserialize, Deserializer, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub enum ReceiveActionType {
    REQ,
    CLOSE,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub enum SendActionType {
    EVENT,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ReceiveMessageStruct {
    action: ReceiveActionType,
    subscription_id: String,
}

#[derive(Serialize, Deserialize, PartialEq, Eq, Debug, Clone, CandidType)]
pub struct EventData {
  id: String,
  pubkey: String,
  created_at: u32,
  kind: u32,
  tags: Vec<Vec<String>>,
  content: String,
  sig: String,
}

#[derive(Serialize, Deserialize, PartialEq, Eq, Debug, Clone)]
pub struct UserEventInput {
  pub pubkey: String,
  pub created_at: u64,
  pub kind: u64,
  pub content: String,
  pub tags: Vec<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SendMessageType {
    action: SendActionType,
    subscription_id: String,
    event: EventData,
}

impl AppMessage {
    fn candid_serialize(&self) -> Vec<u8> {
        encode_one(&self).unwrap()
    }
}

use ic_cdk::{update};
use std::sync::Mutex;
use lazy_static::lazy_static;

lazy_static! {
    static ref RECEIVED_EVENTS: Mutex<Vec<EventData>> = Mutex::new(Vec::new());
}

#[update]
pub fn add_new_event(event : EventData) {
  print(format!("Received event on foreign backend: {:?}", event));
  RECEIVED_EVENTS.lock().unwrap().push(event.clone());
}

pub fn on_open(args: OnOpenCallbackArgs) {
//     let msg = AppMessage {
//         text: String::from("ping"),
//         timestamp: time(),
//     };
//     send_app_message(args.client_key, msg);
}



pub fn on_message(args: OnMessageCallbackArgs) {
    let app_msg: AppMessage = decode_one(&args.message).unwrap();
    print(format!("Received message: {:?}", app_msg.text));

    // Define deserialize_json as an inline function (closure)
    let deserialize_req = |msg: &str| -> Result<ReceiveMessageStruct, Box<dyn Error>> {
        let req_message: ReceiveMessageStruct = serde_json::from_str(msg)?;
        Ok(req_message)
    };

    match deserialize_req(&app_msg.text) {
        Ok(deserialized) => {
            // Print the deserialized data
            print(format!("action: {:?}", deserialized.action));
            print(format!("subscription_id: {:?}", deserialized.subscription_id));

            match deserialized.action {
                ReceiveActionType::REQ => {

                    // private key e349f55622c9682ec8bdc05d66cc1600a23099796cb02c95946621f4c2402046
//                     let user_input = UserEventInput {
//                       pubkey: String::from("7c3a7e0bce2f99be4d3c7ca146097c0c5344b691e859d33f60a7e4386f488bc4"),
//                       created_at: time() as u64,
//                       kind: 1_u64,
//                       content: String::from("hello world"),
//                       tags: Vec::new(),
//                     };
                    let events = RECEIVED_EVENTS.lock().unwrap();

                    let response = SendMessageType {
                      action: SendActionType::EVENT,
                      subscription_id: deserialized.subscription_id,
                      event: events.get(0).unwrap().clone(),
                    };

                    let serialized = serde_json::to_string(&response).expect("Failed to serialize to JSON");
                    let new_msg = AppMessage {
                        text: serialized,
                        timestamp: time(),
                    };

                    print(format!("going to send: {:?}", new_msg.text));

                    send_app_message(args.client_key, new_msg);
                }
                ReceiveActionType::CLOSE => {
                    // Do something else when action is "CLOSE"
                    println!("Received CLOSE message with subscription_id: {}", deserialized.subscription_id);
                }
            }
        }
        Err(err) => {
            // Handle the error and print your custom message
            eprintln!("Failed to deserialize JSON: {}", err);
        }
    }


//     let new_msg = AppMessage {
//         text: String::from("ping"),
//         timestamp: time(),
//     };

//     send_app_message(args.client_key, new_msg)
}

fn send_app_message(client_key: ClientPublicKey, msg: AppMessage) {
    print(format!("Sending message: {:?}", msg));
    if let Err(e) = ws_send(client_key, msg.candid_serialize()) {
        println!("Could not send message: {}", e);
    }
}

pub fn on_close(args: OnCloseCallbackArgs) {
    print(format!("Client {:?} disconnected", args.client_key));
}


// create event functionality. This is usually done byt the client,
// but we need this to convert messages received from actor to broadcast to listening users

// pub fn to_canonical(user_input: UserEventInput) -> Option<String> {
//     // create a JsonValue for each event element
//     let mut c: Vec<Value> = vec![];
//     // id must be set to 0
//     let id = Number::from(0_u64);
//     c.push(serde_json::Value::Number(id));
//     // public key
//     c.push(Value::String(user_input.pubkey.clone()));
//     // creation time
//     let created_at = Number::from(user_input.created_at);
//     c.push(serde_json::Value::Number(created_at));
//     // kind
//     let kind = Number::from(user_input.kind);
//     c.push(serde_json::Value::Number(kind));
//     // tags
//     c.push(tags_to_canonical(user_input.tags));
//     // content
//     c.push(Value::String(user_input.content.clone()));
//     serde_json::to_string(&Value::Array(c)).ok()
// }
//
// /// Convert tags to a canonical form for signing.
// fn tags_to_canonical(user_tags : Tag) -> Value {
//     let mut tags = Vec::<Value>::new();
//     // iterate over self tags,
//     for t in &user_tags {
//         // each tag is a vec of strings
//         let mut a = Vec::<Value>::new();
//         for v in t.iter() {
//             a.push(serde_json::Value::String(v.clone()));
//         }
//         tags.push(serde_json::Value::Array(a));
//     }
//     serde_json::Value::Array(tags)
// }
//
/// Deserializer that ensures we always have a [`Tag`].
fn tag_from_string<'de, D>(deserializer: D) -> Result<Vec<Vec<String>>, D::Error>
where
    D: Deserializer<'de>,
{
    let opt = Option::deserialize(deserializer)?;
    Ok(opt.unwrap_or_default())
}

// fn user_input_to_event(user_input: UserEventInput) -> EventData {
//   // To obtain the event.id, we sha256 the serialized event.
//   // The serialization is done over the UTF-8 JSON-serialized string (with no white space or line breaks).
//
//   // to canonical form
//   let c_opt = to_canonical(user_input.clone());
//   let c = c_opt.unwrap();
//   // compute the sha256sum
//   let digest: sha256::Hash = sha256::Hash::hash(c.as_bytes());
//   // to hex, this is the event id
//   let id = format!("{digest:x}");
//   let message = secp256k1::Message::from_slice(digest.as_ref()).unwrap();
//   let byte_slice = message.to_string();
//
//   return EventData {
//     id: id,
//     pubkey: user_input.pubkey,
//     created_at: user_input.created_at,
//     kind: user_input.kind,
//     tags: user_input.tags,
//     content: user_input.content,
//     sig: byte_slice,
//   };
// }
//
// // signing the event:
// use secp256k1::{Message, Secp256k1, SecretKey, PublicKey, KeyPair};
// use secp256k1::ecdsa::Signature;
// fn sign_event(digest : &[u8]) -> String {
//   // Define the testing keys
//   let private_key_hex = "e349f55622c9682ec8bdc05d66cc1600a23099796cb02c95946621f4c2402046";
//   let public_key_hex = "7c3a7e0bce2f99be4d3c7ca146097c0c5344b691e859d33f60a7e4386f488bc4";
//
//   let private_key_bytes = hex::decode(private_key_hex).expect("Failed to decode private key");
//   let public_key_bytes = hex::decode(public_key_hex).expect("Failed to decode public key");
//
//   let secret_key = SecretKey::from_slice(&private_key_bytes).expect("Invalid private key");
//   let public_key = PublicKey::from_slice(&public_key_bytes).expect("Invalid public key");
//   let key_pair = KeyPair::new(secret_key, &mut public_key);
//   let message = Message::from_slice(digest.as_ref()).expect("Invalid digest");
//   let signature = key_pair.sign_schnorr(message);
//
//   return hex::encode(signature.as_ref());
//
// }
