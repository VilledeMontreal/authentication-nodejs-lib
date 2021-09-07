/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { retryAction } from './retryAction';

describe('retryAction', () => {
  test('should call action only once if there is no error', async () => {
    const result = await retryAction({
      maxRetries: 3,
      action: (attempt, lastError) => {
        return Promise.resolve(attempt);
      },
      canRetry: (attempt, error) => Promise.resolve(true),
    });
    expect(result).toBe(0);
  });

  test('should call action only once if canRetry returns false', async () => {
    let counter = 0;
    try {
      await retryAction({
        maxRetries: 3,
        action: (attempt, lastError) => {
          counter += 1;
          throw new Error('some error');
        },
        canRetry: (attempt, error) => Promise.resolve(false),
      });
    } catch (err: any) {
      expect(counter).toBe(1);
      expect(err.message).toBe('some error');
    }
  });

  test('should retry once and succeed', async () => {
    const result = await retryAction({
      maxRetries: 3,
      action: (attempt, lastError) => {
        if (attempt === 0) {
          throw new Error('first attempt failed');
        }
        return Promise.resolve(attempt);
      },
      canRetry: (attempt, error) => Promise.resolve(true),
    });
    expect(result).toBe(1);
  });

  test('should retry until it finally fails', async () => {
    let counter = 0;
    try {
      await retryAction({
        maxRetries: 3,
        action: (attempt, lastError) => {
          counter += 1;
          throw new Error('some error');
        },
        canRetry: (attempt, error) => Promise.resolve(true),
      });
    } catch (err: any) {
      expect(counter).toBe(4);
      expect(err.message).toBe('some error');
    }
  });

  test('should not retry when maxRetries is zero', async () => {
    let counter = 0;
    try {
      await retryAction({
        maxRetries: 0,
        action: (attempt, lastError) => {
          counter += 1;
          throw new Error('some error');
        },
        canRetry: (attempt, error) => Promise.resolve(true),
      });
    } catch (err: any) {
      expect(counter).toBe(1);
      expect(err.message).toBe('some error');
    }
  });
});
