# run this to get the blob of the subAccount of specific user
# get the Principal of the logged in user from the UI
dfx canister call backend getSubaccountForPrincipal '("zktkv-op6a5-tdzpu-jruy3-dasoe-t4opo-cytkb-ykshi-3q7lv-yyxbr-7ae")'


# run this to make a payment locally
# owner principal should be a backend canister ID
# subaccount should be a blob that you can get from getSubaccount call
dfx canister call ckbtc_ledger icrc1_transfer '(
record {
    to = record {
      owner = principal "asrmz-lmaaa-aaaaa-qaaeq-cai";
      subaccount = opt blob "\00\00\1d\fe\07f<\be\89\8d1\b1\82N$\f8\e7\b8X\9a\83\85H\e8\dc>\ba\e3\17\0c~\02";
    };
    amount = 100 : nat;
  },
)'
