#!/bin/bash
### USAGE: './init-idls.sh' will init the idls on localnet. './init-idls.sh <cluster>' will init the idls on <cluster>

#anchor idl upgrade brdgwnNUvW8rGAVzRrpiQiRv8dGBVvrJW79UB61sa16 --filepath target/idl/bridge.json --provider.cluster ${1:-localnet} --provider.wallet ~/.config/solana/id.json &
anchor idl upgrade circVph7iut5KFFEdc45V6whruKEduiCTnDDQ1iB1am --filepath target/idl/circuit_breaker.json --provider.cluster ${1:-localnet} --provider.wallet ~/.config/solana/id.json &

# Wait for all idls to complete
wait
