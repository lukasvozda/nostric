import Map "mo:base/HashMap";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Option "mo:base/Option";
import Blob "mo:base/Blob";
import Iter "mo:base/Iter";
import Hex "./utils/Hex";

// Declare a shared actor class
// Bind the caller and the initializer
shared({ caller = initializer }) actor class() {

    type Profile = {
        pk: Text;
        encrypted_sk: Text;
        username: Text;
        about: Text;
        avatar_url: Text;
        is_pro: Bool;
        private_relay: NostricRelay;
        followed_relays: FollowedRelays;
    };

    type Error = {
        #NotAuthenticated;
        #ProfileNotFound;
        #UnableToCreate;
    };

    type NostricRelay = {
        gateway_url: Text;
        canister_id: Text;
     };

     type FollowedRelays = {
        nostr: [Text];
        nostric: [NostricRelay];
     };

    private var profiles = Map.HashMap<Principal, Profile>(0, Principal.equal, Principal.hash);

    private stable var stableprofiles : [(Principal, Profile)] = [];

    public shared (msg) func addProfile(p: Profile) : async Result.Result<Profile, Error> {

        if(Principal.isAnonymous(msg.caller)){ // Only allows signed users to register profile
            return #err(#NotAuthenticated); // If the caller is anonymous Principal "2vxsx-fae" then return an error
        };

        let profile : Profile = {
            pk = p.pk;
            encrypted_sk = p.encrypted_sk;
            username = p.username;
            about = p.about;
            avatar_url = p.avatar_url;
            is_pro = p.is_pro;
            private_relay = p.private_relay;
            followed_relays = p.followed_relays;
        };

        profiles.put(msg.caller, profile);
        let saved_profile = profiles.get(msg.caller);
        return Result.fromOption(saved_profile, #UnableToCreate);
    };

    public query (msg) func getProfile() : async Result.Result<Profile, Error> {
         let profile = profiles.get(msg.caller);
         return Result.fromOption(profile, #ProfileNotFound);
     };

    public shared (msg) func updateProfile(p: Profile) : async Result.Result<(Profile), Error> {

        if(Principal.isAnonymous(msg.caller)){ // Only allows signed users to register profile
            return #err(#NotAuthenticated); // If the caller is anonymous Principal "2vxsx-fae" then return an error
        };

        let id = msg.caller;
        let result = profiles.get(id);

        switch (result) {
        case null {
            return #err(#ProfileNotFound);
        };
        case (?v) {
            let profile : Profile = {
                pk = v.pk;
                encrypted_sk = v.encrypted_sk;
                username = p.username;
                about = p.about;
                avatar_url = p.avatar_url;
                is_pro = p.is_pro;
                private_relay = p.private_relay;
                followed_relays = p.followed_relays;
                };
                profiles.put(id, profile);
                return #ok(profile);
            };
        };
    };  

    public shared (msg) func deleteProfile() : async Result.Result<(()), Error> {

        if(Principal.isAnonymous(msg.caller)){ 
            return #err(#NotAuthenticated); 
        };

        profiles.delete(msg.caller);
        return #ok(());
    };
/*
    public shared (msg) func addNostricRelay(gateway_url: Text, canister_id: Text) : async Result.Result<(()), Error> {
      if(Principal.isAnonymous(msg.caller)){
          return #err(#NotAuthenticated);
      };

      //let profile = profiles.get(msg.caller);
      // Check if the relay already exists
      var relayExists = false;
      label l for (relay in profile.followed_relays.nostric) {
          if (relay.gateway_url == gateway_url and relay.canister_id == canister_id) {
              relayExists := true;
              break l;
          }
      };

      // If the relay doesn't exist, add it
      if (relayExists == false) {
          let newRelay: NostricRelay = {gateway_url = gateway_url; canister_id = canister_id};
          //profile.followed_relays.nostric := profile.followed_relays.nostric.add(newRelay);
      };

      //profiles.put(msg.caller, profile);
      return #ok(());
    };

    public shared (msg) func removeNostricRelay(gateway_url: Text, canister_id: Text) : async Result.Result<(()), Error> {
        if(Principal.isAnonymous(msg.caller)){
            return #err(#NotAuthenticated);
        };

        let profile = profiles.get(msg.caller);

        // Filter the relays that don't match the provided relay
        profile.followed_relays.nostric := Array.filter(
            func (relay: NostricRelay) : Bool {
                return relay.gateway_url != gateway_url or relay.canister_id != canister_id;
            },
            profile.followed_relays.nostric
        );

        profiles.put(msg.caller, profile);
        return #ok(());
    };

    public shared (msg) func addRelay(relay_url: Text) : async Result.Result<(()), Error> {
      if(Principal.isAnonymous(msg.caller)){
          return #err(#NotAuthenticated);
      };

      let result = profiles.get(msg.caller);
      var relayExists = false;

      switch (result) {
        case null {
            return #err(#ProfileNotFound);
        };
        case (?profile) {
          /*label l for (relay in profile.followed_relays.nostr) {
              if (relay == relay_url) {
                  relayExists := true;
                  break l;
              }
          };*/
        }
      };

      // If the relay doesn't exist, add it
      if (relayExists == false) {
          profile.followed_relays.nostr.add(relay_url);
      };

      profiles.put(msg.caller, profile);
      return #ok(());
    };

    public shared (msg) func removeNostrRelay(relay_url: Text) : async Result.Result<(()), Error> {
        if(Principal.isAnonymous(msg.caller)){
            return #err(#NotAuthenticated);
        };
        let result = profiles.get(msg.caller);


        switch (result) {
          case null {
            return #err(#ProfileNotFound);
          };
          case (?v) {
            profiles.put(msg.caller, profile);
          }
        };

        // Filter out the provided gateway_url from the nostr array
        /*
        profile.followed_relays.nostr := Array.filter(
            func (url: Text) : Bool {
                return url != relay_url;
            },
            profile.followed_relays.nostr
        );
        */

        return #ok(());
    };
*/
    // Only the ecdsa methods in the IC management canister is required here.
    type VETKD_SYSTEM_API = actor {
        vetkd_public_key : ({
            canister_id : ?Principal;
            derivation_path : [Blob];
            key_id : { curve: { #bls12_381; } ; name: Text };
        }) -> async ({ public_key : Blob; });
        vetkd_encrypted_key : ({
            public_key_derivation_path : [Blob];
            derivation_id : Blob;
            key_id : { curve: { #bls12_381; } ; name: Text };
            encryption_public_key : Blob;
        }) -> async ({ encrypted_key : Blob });
    };

    let vetkd_system_api : VETKD_SYSTEM_API = actor("br5f7-7uaaa-aaaaa-qaaca-cai");

    public shared({ caller }) func app_vetkd_public_key(derivation_path: [Blob]): async Text {
        let { public_key } = await vetkd_system_api.vetkd_public_key({
            canister_id = null;
            derivation_path;
            key_id = { curve = #bls12_381; name = "test_key_1" };
        });
        Hex.encode(Blob.toArray(public_key))
    };

    public shared({ caller }) func symmetric_key_verification_key(): async Text {
        let { public_key } = await vetkd_system_api.vetkd_public_key({
            canister_id = null;
            derivation_path = Array.make(Text.encodeUtf8("symmetric_key"));
            key_id = { curve = #bls12_381; name = "test_key_1" };
        });
        Hex.encode(Blob.toArray(public_key))
    };

    public shared ({ caller }) func encrypted_symmetric_key_for_caller(encryption_public_key : Blob) : async Text {
        let caller_blob = Principal.toBlob(caller);
        let { encrypted_key } = await vetkd_system_api.vetkd_encrypted_key({
            derivation_id = Principal.toBlob(caller);
            public_key_derivation_path = Array.make(Text.encodeUtf8("symmetric_key"));
            key_id = { curve = #bls12_381; name = "test_key_1" };
            encryption_public_key;
        });
        Hex.encode(Blob.toArray(encrypted_key));
    };

    system func preupgrade() {
        stableprofiles := Iter.toArray(profiles.entries());
    };

    system func postupgrade() {
        profiles := Map.fromIter<Principal, Profile>(
            stableprofiles.vals(),
            10,
            Principal.equal,
            Principal.hash,
        );
        stableprofiles := []; 
    };
};
