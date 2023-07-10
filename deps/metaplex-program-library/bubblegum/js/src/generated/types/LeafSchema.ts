/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as web3 from '@solana/web3.js';
import * as beet from '@metaplex-foundation/beet';
import * as beetSolana from '@metaplex-foundation/beet-solana';
/**
 * This type is used to derive the {@link LeafSchema} type as well as the de/serializer.
 * However don't refer to it in your code but use the {@link LeafSchema} type instead.
 *
 * @category userTypes
 * @category enums
 * @category generated
 * @private
 */
export type LeafSchemaRecord = {
  V1: {
    id: web3.PublicKey;
    owner: web3.PublicKey;
    delegate: web3.PublicKey;
    nonce: beet.bignum;
    dataHash: number[] /* size: 32 */;
    creatorHash: number[] /* size: 32 */;
  };
};

/**
 * Union type respresenting the LeafSchema data enum defined in Rust.
 *
 * NOTE: that it includes a `__kind` property which allows to narrow types in
 * switch/if statements.
 * Additionally `isLeafSchema*` type guards are exposed below to narrow to a specific variant.
 *
 * @category userTypes
 * @category enums
 * @category generated
 */
export type LeafSchema = beet.DataEnumKeyAsKind<LeafSchemaRecord>;

export const isLeafSchemaV1 = (x: LeafSchema): x is LeafSchema & { __kind: 'V1' } =>
  x.__kind === 'V1';

/**
 * @category userTypes
 * @category generated
 */
export const leafSchemaBeet = beet.dataEnum<LeafSchemaRecord>([
  [
    'V1',
    new beet.BeetArgsStruct<LeafSchemaRecord['V1']>(
      [
        ['id', beetSolana.publicKey],
        ['owner', beetSolana.publicKey],
        ['delegate', beetSolana.publicKey],
        ['nonce', beet.u64],
        ['dataHash', beet.uniformFixedSizeArray(beet.u8, 32)],
        ['creatorHash', beet.uniformFixedSizeArray(beet.u8, 32)],
      ],
      'LeafSchemaRecord["V1"]',
    ),
  ],
]) as beet.FixableBeet<LeafSchema>;