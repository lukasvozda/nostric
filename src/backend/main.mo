import vetkd_system_api "canister:vetkd_system_api";
import Hex "./utils/Hex";
import Blob "mo:base/Blob";
import Array "mo:base/Array";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Account "./utils/Account";
import Map "mo:base/HashMap";
import Result "mo:base/Result";

actor this {
	public func greet(name : Text) : async Text {
		return "Hello, " # name # "!";
	};

	type NostrProfile = {
		pk : Text;
		encrypted_sk : Text;
		username : Text;
		about : Text;
		avatar_url : Text;
	};

	type Profile = {
		nostr_profile : NostrProfile;
		is_pro : Bool;
	};

	private var profiles = Map.HashMap<Principal, Profile>(0, Principal.equal, Principal.hash);

	private stable var stableprofiles : [(Principal, Profile)] = [];

	type Error = {
		#NotAuthenticated;
		#ProfileNotFound;
		#UnableToCreate;
		#ProfileAlreadyHasRelay;
		#UnableToCreateRelay;
	};

	public shared (msg) func addProfile(p : NostrProfile) : async Result.Result<Profile, Error> {
		// Only allows signed users to register profile
		if (Principal.isAnonymous(msg.caller)) {
			// If the caller is anonymous Principal "2vxsx-fae" then return an error
			return #err(#NotAuthenticated);
		};

		let nostr_profile : NostrProfile = {
			pk = p.pk;
			encrypted_sk = p.encrypted_sk;
			username = p.username;
			about = p.about;
			avatar_url = p.avatar_url;
		};

		let profile : Profile = {
			nostr_profile = nostr_profile;
			is_pro = false;
		};

		profiles.put(msg.caller, profile);
		let saved_profile = profiles.get(msg.caller);
		return Result.fromOption(saved_profile, #UnableToCreate);
	};

	public query (msg) func getProfile() : async Result.Result<Profile, Error> {
		let profile = profiles.get(msg.caller);
		return Result.fromOption(profile, #ProfileNotFound);
	};

	public shared (msg) func updateProfile(p : NostrProfile) : async Result.Result<(Profile), Error> {
		// Only allows signed users to register profile
		if (Principal.isAnonymous(msg.caller)) {
			// If the caller is anonymous Principal "2vxsx-fae" then return an error
			return #err(#NotAuthenticated);
		};

		let id = msg.caller;
		let result = profiles.get(id);

		switch (result) {
			case null {
				return #err(#ProfileNotFound);
			};
			case (?profile) {
				let nostr_profile : NostrProfile = {
					pk = profile.nostr_profile.pk;
					encrypted_sk = profile.nostr_profile.encrypted_sk;
					username = p.username;
					about = p.about;
					avatar_url = p.avatar_url;
				};
				let updated_profile = { profile with nostr_profile = nostr_profile };
				profiles.put(id, updated_profile);
				return #ok(profile);
			};
		};
	};

	public shared (msg) func deleteProfile() : async Result.Result<(()), Error> {
		// Only allows signed users to register profile
		if (Principal.isAnonymous(msg.caller)) {
			// If the caller is anonymous Principal "2vxsx-fae" then return an error
			return #err(#NotAuthenticated);
		};
		profiles.delete(msg.caller);
		return #ok(());
	};

	public type AccountType = { owner : Principal; subaccount : ?Blob };

	public type Actor = actor {
		icrc1_balance_of : (acc : AccountType) -> async Nat;
	};

	public shared (msg) func getBalance() : async Nat {
		let acc : AccountType = {
			owner = Principal.fromActor(this);
			subaccount = ?Account.toSubaccount(msg.caller);
		};
		var response : Nat = await ledgerActor.icrc1_balance_of(acc);
		return response;
	};

	private stable var ledgerActor : Actor = actor ("mxzaz-hqaaa-aaaar-qaada-cai") : Actor;

	public shared ({ caller }) func app_vetkd_public_key(derivation_path : [Blob]) : async Text {
		let { public_key } = await vetkd_system_api.vetkd_public_key({
			canister_id = null;
			derivation_path;
			key_id = { curve = #bls12_381; name = "test_key_1" };
		});
		Hex.encode(Blob.toArray(public_key));
	};

	public shared ({ caller }) func symmetric_key_verification_key() : async Text {
		let { public_key } = await vetkd_system_api.vetkd_public_key({
			canister_id = null;
			derivation_path = Array.make(Text.encodeUtf8("symmetric_key"));
			key_id = { curve = #bls12_381; name = "test_key_1" };
		});
		Hex.encode(Blob.toArray(public_key));
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
};
