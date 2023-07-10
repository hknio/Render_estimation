#!/bin/bash

set -m
clockwork localnet --bpf-program tmanSNYRXcGp4nSy1zPK9imYApmh7UvrVrY6CiucMPD target/deploy/token_manager.so --bpf-program circVph7iut5KFFEdc45V6whruKEduiCTnDDQ1iB1am target/deploy/circuit_breaker.so --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s ./deps/metaplex-program-library/test-programs/mpl_token_metadata.so --url https://api.devnet.solana.com --clone C2QvUPBiU3fViSyqA4nZgGyYqLgYf9PRpd8B8oLoo48w &
sleep 8
./scripts/init-idls.sh
jobs
fg %1
