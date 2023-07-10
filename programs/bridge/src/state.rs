use anchor_lang::prelude::*;

#[account]
#[derive(Debug)]
pub struct BridgeTransferV0 {
    pub eth_addr: Pubkey,
    pub sol_addr: Pubkey,
    pub amount: u64,
    pub bump: u8,
}

#[account]
#[derive(Debug)]
pub struct BridgeV0 {
    pub authority: Pubkey,
    pub bump: u8,
}

pub const SEED_BRIDGE: &[u8] = b"bridge";
