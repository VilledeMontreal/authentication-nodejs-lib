/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { HttpClientError } from './HttpClientError';

test('toJSON', () => {
  const resp = {
    status: 200,
    headers: { foo: 'bar' },
  };
  const inner = new HttpClientError(
    'inner msg',
    'inner code',
    400,
    'bad request',
    'inner body',
  );
  const error = new HttpClientError(
    'msg',
    'code',
    404,
    'not found',
    'body',
    inner,
    resp,
  );
  const jsonError = error.toJSON();
  expect(jsonError.stack).toBeDefined();
  expect(jsonError.innerError.stack).toBeDefined();
  delete jsonError.stack;
  delete jsonError.innerError.stack;
  expect(jsonError).toEqual({
    message: 'msg',
    code: 'code',
    statusCode: 404,
    statusMessage: 'not found',
    body: 'body',
    innerError: {
      message: 'inner msg',
      code: 'inner code',
      statusCode: 400,
      statusMessage: 'bad request',
      body: 'inner body',
      innerError: undefined,
    },
  });
  delete error.stack;
  delete error.innerError.stack;
  const txt = JSON.stringify(error);
  expect(txt).toBe(
    '{"message":"msg","code":"code","statusCode":404,"statusMessage":"not found","body":"body","innerError":{"message":"inner msg","code":"inner code","statusCode":400,"statusMessage":"bad request","body":"inner body"}}',
  );
});
