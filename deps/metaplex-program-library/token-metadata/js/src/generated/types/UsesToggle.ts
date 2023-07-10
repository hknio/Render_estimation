/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet';
import { Uses, usesBeet } from './Uses';
/**
 * This type is used to derive the {@link UsesToggle} type as well as the de/serializer.
 * However don't refer to it in your code but use the {@link UsesToggle} type instead.
 *
 * @category userTypes
 * @category enums
 * @category generated
 * @private
 */
export type UsesToggleRecord = {
  None: void /* scalar variant */;
  Clear: void /* scalar variant */;
  Set: { fields: [Uses] };
};

/**
 * Union type respresenting the UsesToggle data enum defined in Rust.
 *
 * NOTE: that it includes a `__kind` property which allows to narrow types in
 * switch/if statements.
 * Additionally `isUsesToggle*` type guards are exposed below to narrow to a specific variant.
 *
 * @category userTypes
 * @category enums
 * @category generated
 */
export type UsesToggle = beet.DataEnumKeyAsKind<UsesToggleRecord>;

export const isUsesToggleNone = (x: UsesToggle): x is UsesToggle & { __kind: 'None' } =>
  x.__kind === 'None';
export const isUsesToggleClear = (x: UsesToggle): x is UsesToggle & { __kind: 'Clear' } =>
  x.__kind === 'Clear';
export const isUsesToggleSet = (x: UsesToggle): x is UsesToggle & { __kind: 'Set' } =>
  x.__kind === 'Set';

/**
 * @category userTypes
 * @category generated
 */
export const usesToggleBeet = beet.dataEnum<UsesToggleRecord>([
  ['None', beet.unit],
  ['Clear', beet.unit],
  [
    'Set',
    new beet.BeetArgsStruct<UsesToggleRecord['Set']>(
      [['fields', beet.fixedSizeTuple([usesBeet])]],
      'UsesToggleRecord["Set"]',
    ),
  ],
]) as beet.FixableBeet<UsesToggle, UsesToggle>;
