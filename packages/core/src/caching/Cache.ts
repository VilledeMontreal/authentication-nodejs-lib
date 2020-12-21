/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { ITimeProvider } from '../time/ITimeProvider';
import { CacheEntry } from './CacheEntry';

/**
 *  A simple generic cache implementation that can expire entries using a ttl.
 *  Note that the ttl cleanup will happen only when modifying the cache,
 *  but not when reading entries.
 */
export class Cache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  /**
   *  Creates a new instance of a Cache
   *  @param timeProvider the time provider used to know when the ttl expires.
   */
  constructor(private readonly timeProvider: ITimeProvider) {}

  /**
   *  finds an entry in the cache
   *  @param key the key used to find the entry
   *  @returns either the associated value or undefined.
   */
  public get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (entry) {
      if (this.hasExpired(entry)) {
        this.entries.delete(key);
        return undefined;
      }
      return entry.value;
    }
    return undefined;
  }

  /**
   *  add or edit a cache entry
   *  @param key the key used to store the value
   *  @param value the value associated to the key
   *  @param ttl a number of seconds to keep the value available
   */
  public set(key: string, value: T, ttl: number) {
    this.deleteExpiredEntries();
    const expiresAt = new Date(
      this.timeProvider.getNow().getTime() + ttl * 1000,
    );
    const entry = new CacheEntry<T>(value, expiresAt);
    this.entries.set(key, entry);
  }

  /**
   * delete an existing cache entry.
   * Note that it is safe to delete an entry that doesn't exist.
   * @param key the key used to find and delete the entry
   */
  public delete(key: string): void {
    this.entries.delete(key);
    this.deleteExpiredEntries();
  }

  private hasExpired(entry: CacheEntry<T>) {
    return this.timeProvider.getNow().getTime() >= entry.expiresAt.getTime();
  }

  private deleteExpiredEntries() {
    for (const [k, v] of this.entries.entries()) {
      if (this.hasExpired(v)) {
        this.entries.delete(k);
      }
    }
  }
}
