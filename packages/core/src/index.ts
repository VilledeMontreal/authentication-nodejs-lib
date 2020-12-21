/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

export { IHttpClient } from './http/IHttpClient';
export { IHttpDefaults } from './http/IHttpDefaults';
export { IHttpRequest } from './http/IHttpRequest';
export { IHttpRequestCorrelator } from './http/IHttpRequestCorrelator';
export { IHttpResponse } from './http/IHttpResponse';
export { HttpClientError } from './http/HttpClientError';
export {
  IHttpContent,
  IHttpContext,
  DefaultHttpClient,
  extractMessageFromError,
  serialize,
  deserialize,
  formatErrorMessage,
  isAlreadySerialized,
  isInvalidStatusCode,
  getHeaderAsString,
} from './http/DefaultHttpClient';
// eslint-disable-next-line import/no-cycle
export { StandardContentTypes } from './http/StandardContentTypes';
// eslint-disable-next-line import/no-cycle
export { StandardHttpHeaders } from './http/StandardHttpHeaders';
// eslint-disable-next-line import/no-cycle
export { initHttpClientTestSuite } from './http/HttpClientTestSuite';
export { isTransientHttpError } from './http/isTransientHttpError';
export { combinePath } from './http/combinePath';
export { HttpRequestCorrelator } from './http/HttpRequestCorrelator';
export { FakeHttpRequestCorrelator } from './http/FakeHttpRequestCorrelator';
export { FakeHttpClient, IHttpCall, IHttpMock } from './http/FakeHttpClient';
export { createDefaultDeserializers } from './http/serialization/createDefaultSerializers';
export { findSerializer } from './http/serialization/findSerializer';
export { ISerializer } from './http/serialization/ISerializer';
export { ISerializers } from './http/serialization/ISerializers';
export { guessContentTypeFrom } from './http/serialization/guessContentType';
export { ILogger } from './logging/ILogger';
export { FakeLogger } from './logging/FakeLogger';
export { NoopLogger } from './logging/NoopLogger';
export { ConsoleLogger } from './logging/ConsoleLogger';
export { Cache } from './caching/Cache';
export { SynchronizedAsyncValue } from './concurrency/SynchronizedAsyncValue';
export { SynchronizedAsyncCachedValue } from './concurrency/SynchronizedAsyncCachedValue';
export { hookMethod } from './hooks/hookMethod';
export { IMethodHookArgs } from './hooks/IMethodHookArgs';
export { capitalize } from './text/capitalize';
export { ITimeProvider } from './time/ITimeProvider';
export { FakeTimeProvider } from './time/FakeTimeProvider';
export { SystemTimeProvider } from './time/SystemTimeProvider';
export { delay } from './time/delay';
export { Stopwatch } from './time/Stopwatch';
export { retryAction } from './resilience/retryAction';
export { TypedProperty } from './types/TypedProperty';
