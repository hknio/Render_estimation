#!/bin/bash
### USAGE: './init-idls.sh' will init the idls on localnet. './init-idls.sh <cluster>' will init the idls on <cluster>

anchor idl init distx4dCjTQQRNVoUn3pM1rVDUBoWRRYh1SK74xCGNA --filepath target/idl/rewards_distributor.json --provider.cluster ${1:-localnet} --provider.wallet ~/.config/solana/id.json &
anchor idl init cred9X51LcyZgyDrJt3CmsLc1Y6v7kjyXbUL4VUJMjz --filepath target/idl/render_credits.json --provider.cluster ${1:-localnet} --provider.wallet ~/.config/solana/id.json &
#anchor idl init hdaoVTCqhfHHo75XdAMxBKdUqvq1i5bF23sisBqVgGR --filepath target/idl/helium_sub_daos.json --provider.cluster ${1:-localnet} --provider.wallet ~/.config/solana/id.json &
anchor idl init circVph7iut5KFFEdc45V6whruKEduiCTnDDQ1iB1am --filepath target/idl/circuit_breaker.json --provider.cluster ${1:-localnet} --provider.wallet ~/.config/solana/id.json &
#anchor idl init porcSnvH9pvcYPmQ65Y8qcZSRxQBiBBQX7UV5nmBegy --filepath target/idl/price_oracle.json --provider.cluster ${1:-localnet} --provider.wallet ~/.config/solana/id.json &
#anchor idl init rorcfdX4h9m9swCKgcypaHJ8NGYVANBpmV9EHn3cYrF --filepath target/idl/rewards_oracle.json --provider.cluster ${1:-localnet} --provider.wallet ~/.config/solana/id.json &
anchor idl init brdgwnNUvW8rGAVzRrpiQiRv8dGBVvrJW79UB61sa16 --filepath target/idl/bridge.json --provider.cluster ${1:-localnet} --provider.wallet ~/.config/solana/id.json &

# Wait for all idls to complete
wait
