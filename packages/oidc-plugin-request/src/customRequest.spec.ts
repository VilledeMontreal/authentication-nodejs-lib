/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  catchErrors,
  overrideMethod,
  patchClass,
  customInit,
} from './customRequest';

/* eslint-disable no-underscore-dangle */

describe('customRequest', () => {
  test('catchErrors should catch any error', () => {
    catchErrors(() => {
      throw new Error('Some error...');
    });
  });

  test('overrideMethod should fail if the method does not exist', () => {
    try {
      overrideMethod({}, 'foo');
      throw new Error('expected error');
    } catch (err: any) {
      expect(err.message).toBe("Could not find method 'foo' in Request class");
    }
  });

  test('patchClass should only patch once', () => {
    // eslint-disable-next-line func-names
    const ctor = function () { };
    const prototype = {
      init() { },
      write() { },
      end() { },
      pipe() { },
    };
    const protoCopy: any = { ...prototype };
    ctor.prototype = protoCopy;
    patchClass(ctor);
    expect(protoCopy.oldInit).toBe(prototype.init);
    expect(protoCopy.init).not.toBe(prototype.init);
    expect(protoCopy.end).not.toBe(prototype.end);
    expect(protoCopy.pipe).not.toBe(prototype.pipe);
    const protoCopy2: any = { ...protoCopy };
    patchClass(ctor);
    expect(protoCopy.oldInit).toBe(prototype.init);
    expect(protoCopy.init).toBe(protoCopy2.init);
    expect(protoCopy.end).toBe(protoCopy2.end);
    expect(protoCopy.pipe).toBe(protoCopy2.pipe);
  });

  test('custom init should wrap the callback only once', () => {
    const options: any = {};
    const req: any = {
      oldInit() { },
      _callback() { },
    };
    req.init = customInit;
    req.init(options); // 1st time
    const currentCallback = req._callback;
    req.init(options); // 2nd time
    expect(req._callback).toBe(currentCallback);
  });
});
