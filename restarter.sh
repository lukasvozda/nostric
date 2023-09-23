dfx canister create internet_identity --specified-id be2us-64aaa-aaaaa-qaabq-cai
dfx deploy internet_identity --argument '(null)'


dfx canister create vetkd_system_api --specified-id br5f7-7uaaa-aaaaa-qaaca-cai
dfx deploy vetkd_system_api


dfx canister create backend --specified-id bkyz2-fmaaa-aaaaa-qaaaq-cai
dfx deploy backend


dfx canister create frontend --specified-id bw4dl-smaaa-aaaaa-qaacq-cai
dfx deploy frontend


dfx canister create relay --specified-id bd3sg-teaaa-aaaaa-qaaba-cai
dfx deploy relay


dfx canister create foreign_relay --specified-id b77ix-eeaaa-aaaaa-qaada-cai
dfx deploy foreign_relay


#uncomment this if foreign_relay.wasm is missing
#cargo build --target wasm32-unknown-unknown --release --package foreign_relay
wasm-opt target/wasm32-unknown-unknown/release/foreign_relay.wasm --strip-debug -Oz -o target/wasm32-unknown-unknown/release/foreign_relay-opt.wasm
dfx canister create dynamic_relays --specified-id avqkn-guaaa-aaaaa-qaaea-cai
dfx deploy dynamic_relays


