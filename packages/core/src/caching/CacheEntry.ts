/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/**
 * The class used to store a value in the cache, with its associated ttl
 */
export class CacheEntry<T> {
  /** creates a new CacheEntry
   * @param value the cached value
   * @param expiresAt the time after which the cached entry can be flushed
   */
  constructor(
    public readonly value: T,
    public readonly expiresAt: Date,
  ) {}
}
