#dfx deploy internet_identity --argument '(null)'

dfx canister create vetkd_system_api --specified-id br5f7-7uaaa-aaaaa-qaaca-cai
dfx deploy vetkd_system_api

dfx canister create internet_identity --specified-id b77ix-eeaaa-aaaaa-qaada-cai
dfx deploy internet_identity

#dfx canister create ckbtc_ledger --specified-id mxzaz-hqaaa-aaaar-qaada-cai

#dfx deploy ckbtc_ledger
#PRINCIPAL=$(dfx identity get-principal) && dfx deploy ckbtc_ledger --argument \"(variant {Init = record {minting_account = record { owner = principal \\\"$PRINCIPAL\\\" };transfer_fee = 10;token_symbol = \\\"ckBTC\\\";token_name = \\\"Token ckBTC\\\";metadata = vec {};initial_balances = vec {record { record {owner = principal \\\"$PRINCIPAL\\\"}; 100_000_000_000 } };archive_options = record {num_blocks_to_archive = 10_000;trigger_threshold = 20_000;cycles_for_archive_creation = opt 4_000_000_000_000;controller_id = principal \\\"$PRINCIPAL\\\";};}})\"  --mode=reinstall -y
#PRINCIPAL=$(dfx identity get-principal)
#dfx deploy ckbtc_ledger --argument "(variant {Init = record {minting_account = record { owner = principal \"$PRINCIPAL\" };transfer_fee = 0;token_symbol = \"ckBTC\";token_name = \"Token ckBTC\";metadata = vec {};initial_balances = vec {};archive_options = record {num_blocks_to_archive = 10_000;trigger_threshold = 20_000;cycles_for_archive_creation = opt 4_000_000_000_000;controller_id = principal \"$PRINCIPAL\";};}})"

dfx canister create backend --specified-id bkyz2-fmaaa-aaaaa-qaaaq-cai
dfx deploy backend

dfx canister create frontend --specified-id be2us-64aaa-aaaaa-qaabq-cai
dfx deploy frontend

dfx canister create relay --specified-id bw4dl-smaaa-aaaaa-qaacq-cai
dfx deploy relay

dfx canister create foreign_relay --specified-id bd3sg-teaaa-aaaaa-qaaba-cai
dfx deploy foreign_relay


