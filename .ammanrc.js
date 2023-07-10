const x = require('@metaplex-foundation/amman');

module.exports = {
	validator: {
		killRunningValidators: true,
		programs: [
			{
				label: 'lazy-distributor',
				programId: 'BCbFtfD3KzAHDAANE7Qz2iR8JndYqSGQW5eciqmU4sok',
				deployPath: 'target/deploy/lazy_distributor.so',
			},
			{
				label: 'rewards-distributor',
				programId: 'distx4dCjTQQRNVoUn3pM1rVDUBoWRRYh1SK74xCGNA',
				deployPath: 'target/deploy/rewards_distributor.so',
			},
			{
				label: 'render-credits',
				programId: 'cred9X51LcyZgyDrJt3CmsLc1Y6v7kjyXbUL4VUJMjz',
				deployPath: 'target/deploy/render_credits.so',
			},
			{
				label: 'bridge',
				programId: 'brdgwnNUvW8rGAVzRrpiQiRv8dGBVvrJW79UB61sa16',
				deployPath: 'target/deploy/bridge.so',
			},
			{
				label: 'circuit-breaker',
				programId: 'circVph7iut5KFFEdc45V6whruKEduiCTnDDQ1iB1am',
				deployPath: 'target/deploy/circuit_breaker.so',
			},
			/*{
				label: 'treasury-management',
				programId: 'treaf4wWBBty3fHdyBpo35Mz84M8k3heKXmjmi9vFt5',
				deployPath: 'target/deploy/treasury_management.so',
			},*/
			/*{
				label: 'lazy-transactions',
				programId: '1atrmQs3eq1N2FEYWu6tyTXbCjP4uQwExpjtnhXtS8h',
				deployPath: 'target/deploy/lazy_transactions.so',
			},*/
			{
				label: 'price-oracle',
				programId: 'porcmvguSJnXqqapWY8QjvDhZzpxDPY6RfQxmU4LEPf',
				deployPath: 'target/deploy/price_oracle.so',
			},
			/*{
				label: 'rewards-oracle',
				programId: 'rorcfdX4h9m9swCKgcypaHJ8NGYVANBpmV9EHn3cYrF',
				deployPath: 'target/deploy/rewards_oracle.so',
			},*/
			/*{
				label: 'fanout',
				programId: 'fanqeMu3fw8R4LwKNbahPtYXJsyLL6NXyfe2BqzhfB6',
				deployPath: 'target/deploy/fanout.so',
			},*/
			{
				label: 'mpl-token-metadata',
				programId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
				deployPath: './deps/metaplex-program-library/test-programs/mpl_token_metadata.so',
			},
			{
				label: 'mpl-bubblegum',
				programId: 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY',
				deployPath: './deps/metaplex-program-library/bubblegum/program/target/deploy/mpl_bubblegum.so',
			},
			{
				label: 'spl-noop',
				programId: 'noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV',
				deployPath: './deps/solana-program-library/account-compression/target/deploy/spl_noop.so',
			},
			{
				label: 'spl-account-compression',
				programId: 'cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK',
				deployPath: './deps/solana-program-library/account-compression/target/deploy/spl_account_compression.so',
			},
			{
				label: 'clockwork-network-program',
				programId: 'F8dKseqmBoAkHx3c58Lmb9TgJv5qeTf3BbtZZSEzYvUa',
				deployPath: './deps/clockwork/target/deploy/clockwork_network_program.so'
			},
			{
				label: 'clockwork-thread-program',
				programId: 'CLoCKyJ6DXBJqqu2VWx9RLbgnwwR6BMHHuyasVmfMzBh',
				deployPath: './deps/clockwork/target/deploy/clockwork_thread_program.so'
			},
			{
				label: 'clockwork-webhook-program',
				programId: 'E7p5KFo8kKCDm6BUnWtnVFkQSYh6ZA6xaGAuvpv8NXTa',
				deployPath: './deps/clockwork/target/deploy/clockwork_webhook_program.so'
			},
		],
		accounts: [
			{
				label: 'spl-governance',
				accountId: 'hgovkRU6Ghe1Qoyb54HdSLdqN7VtxaifBzRmh9jtd3S',
				cluster: 'https://api.mainnet-beta.solana.com',
				executable: true,
			},
			{
				label: 'required-by-spl-governance',
				accountId: 'ENmcpFCpxN1CqyUjuog9yyUVfdXBKF3LVCwLr7grJZpk',
				cluster: 'https://api.mainnet-beta.solana.com',
				executable: false,
			},
			{
				label: 'pyth-price-oracle',
				accountId: 'C2QvUPBiU3fViSyqA4nZgGyYqLgYf9PRpd8B8oLoo48w',
				cluster: 'https://api.devnet.solana.com',
				executable: false,
			},
			{
				label: 'switchboard',
				accountId: 'SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f',
				cluster: 'https://api.mainnet-beta.solana.com',
				executable: true,
			},
			{
				label: 'switchboard-aggregator-1',
				accountId: 'E3cqnoFvTeKKNsGmC8YitpMjo2E39hwfoyt2Aiem7dCb',
				cluster: 'https://api.mainnet-beta.solana.com',
				executable: false,
			},
			{
				label: 'switchboard-aggregator-2',
				accountId: 'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR',
				cluster: 'https://api.mainnet-beta.solana.com',
				executable: false,
			},
			{
				label: 'switchboard-aggregator-history',
				accountId: 'Fi8vncGpNKbq62gPo56G4toCehWNy77GgqGkTaAF5Lkk',
				cluster: 'https://api.mainnet-beta.solana.com',
				executable: false,
			},
			{
				label: 'squads',
				accountId: 'SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu',
				cluster: 'https://api.mainnet-beta.solana.com',
				executable: true,
			},
			/*{
				label: 'vellum-wallet',
				accountId: 'CKLspUGqoE7JBKoZttzhHvYBjtRCHe4fuD9UZr35tja7',
				executable: false,
			}*/
		],
		jsonRpcUrl: x.LOCALHOST,
		websocketUrl: '',
		commitment: 'confirmed',
		ledgerDir: x.tmpLedgerDir(),
		resetLedger: true,
		verifyFees: false,
		detached: process.env.CI != null,
	},
	relay: {
		enabled: process.env.CI == null,
		killRunningRelay: true,
	},
	storage: {
		enabled: process.env.CI == null,
		storageId: 'mock-storage1',
		clearOnStart: true,
	},
	streamTransactionLogs: true,
	assetsFolder: '.amman',
};
