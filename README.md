## Contracts

### render-credits
burns RNDR for RC at a dollar-equivalent value based on current RNDR market price provided by a https://pyth.network feed

### rewards-distributor
mints RNDR based on an emissions schedule to several escrow accounts

### bridge
transfers pre-minted RNDR from bridge escrow account to users bridging over their ETH RNDR

### circuit-breaker
prevents large movements of tokens in case of a hack

## Development

build `packages` with `yarn build`

you can start a test validator via amman `yarn amman start` which tends to 
be slightly faster and the logs are inlined in the session. or via `anchor localnet`
where logs will go to `.anchor/program-logs`

## Tests

`TESTING=true anchor test`

`TESTING=true` required for `bridge.ts` test

### Running clockwork tests

Clockwork uses a validator geyser plugin which geyser plugins do not appear to be supported in the `test.validator` config in `Anchor.toml` and clockwork confirmed they haven't integrated clockwork with `anchor test` yet so in order to run the clockwork tests
start the clockwork validator and init the idls:
`./scripts/clockwork-validator.sh` and in a seperate session
`TESTING=true anchor run clockwork-test`


