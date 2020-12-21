/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import {
  createDefaultDeserializers,
  findSerializer,
  guessContentTypeFrom,
  HttpClientError,
  IHttpClient,
  IHttpDefaults,
  IHttpRequest,
  IHttpResponse,
  ILogger,
} from '@villemontreal/auth-core';
import superagent from 'superagent';
import { OutgoingHttpHeaders } from 'http';
import { requestLogger } from './requestLogger';
import { requestCorrelator } from './requestCorrelator';

/**
 * An implementation of the IHttpClient using the Superagent library
 */
export class SuperagentHttpClient implements IHttpClient {
  /**
   * creates a new instance of a SuperagentHttpClient
   * @param defaults HTTP default values
   */
  constructor(
    private readonly logger: ILogger,
    private readonly defaults: IHttpDefaults = {},
  ) {}

  /**
   * Sends a HTTP request to a remote server
   * @param req the HTTP request to send to a remote server
   * @returns a HTTP response from the server
   * @throws HttpClientError when response status code is not within 200 to 299 range,
   *         or for any other exception.
   */
  public async send(req: IHttpRequest): Promise<IHttpResponse> {
    const method = req.method || 'GET';
    let request = superagent(method, req.url);
    copyHeaders(this.defaults.headers || {}, request);
    copyHeaders(req.headers || {}, request);
    if (req.body !== undefined) {
      const contentType = ensureContentType(request, req.body);
      const content = validateRequestContentType(
        contentType,
        req.body,
        method,
        req.url,
      );
      request.send(content);
    }
    const timeout = req.timeout || this.defaults.timeout;
    if (timeout) {
      request.timeout(timeout);
    }
    const retries = req.retries || this.defaults.retries;
    if (retries) {
      request.retry(retries);
    }
    if (this.defaults.logRequests !== false) {
      request = request.use(requestLogger(this.logger));
    }
    if (this.defaults.correlator) {
      request = request.use(requestCorrelator(this.defaults.correlator));
    }
    try {
      const resp = await request;
      const { res } = resp as any;
      const body = evalBody(resp.body, resp.text);
      return {
        body,
        headers: resp.header,
        statusCode: resp.status,
        statusMessage: res.statusMessage,
      };
    } catch (err) {
      throw remapError(err, method, request.url);
    }
  }
}

function copyHeaders(
  srcHeaders: OutgoingHttpHeaders,
  dest: superagent.SuperAgentRequest,
) {
  for (const [k, v] of Object.entries(srcHeaders)) {
    if (typeof v === 'string') {
      dest.set(k, v);
    } else if (Array.isArray(v) && k.toLowerCase() === 'cookie') {
      dest.set('Cookie', v);
    }
  }
}

function evalBody(body: any, text: string): any {
  if (body && Object.keys(body).length === 0) {
    if (text) {
      return text;
    }
    return null;
  }
  return body;
}

function ensureContentType(req: superagent.SuperAgentRequest, body: any) {
  let contentType = req.get('content-type');
  if (contentType) {
    contentType = contentType.split(';')[0].trim();
  } else {
    contentType = guessContentTypeFrom(body) as string;
    req.set('content-type', contentType);
  }
  return contentType;
}

function validateRequestContentType(
  contentType: string,
  content: any,
  method: string,
  url: string,
) {
  if (isAlreadySerializedContent(contentType, content)) {
    if (
      content instanceof Buffer &&
      (contentType === 'application/json' ||
        contentType === 'application/x-www-form-urlencoded')
    ) {
      return content.toString();
    }
    if (
      content instanceof URLSearchParams &&
      contentType === 'application/x-www-form-urlencoded'
    ) {
      return content.toString();
    }
    return content;
  }
  let serializationError = new Error(
    `Could not find a serializer for contentType '${contentType}'`,
  );
  const serializers = createDefaultDeserializers();
  const serializer = findSerializer(contentType, serializers);
  if (serializer) {
    try {
      return serializer.serialize(content);
    } catch (err) {
      serializationError = err;
    }
  }
  throw new HttpClientError(
    `${method} ${url} => Could not serialize body`,
    'ESerialization',
    undefined,
    undefined,
    content,
    serializationError,
  );
}

function isAlreadySerializedContent(contentType: string, content: any) {
  if (superagent.serialize[contentType]) {
    return true;
  }
  if (typeof content === 'string') {
    return true;
  }
  if (content instanceof Buffer) {
    return true;
  }
  return false;
}

/**
 * remaps an error thrown while sending a request into a HttpClientError
 * @param err the error thrown while sending the request
 * @param method the method of the request
 * @param url the url of the request
 * @returns a HttpClientError
 */
export function remapError(err: any, method: string, url: string) {
  const resp: any = err.response || {};
  const res: any = resp.res || {};
  let { code, statusCode } = err;
  let statusMessage: string | undefined;
  let errorMessage;
  if (res.statusCode) {
    statusCode = res.statusCode;
    statusMessage = res.statusMessage;
    code = 'EBadHttpResponseStatusCode';
    errorMessage = `${method} ${url} => ${statusCode}`;
  } else {
    errorMessage = `${method} ${url} => ${err.message}`;
  }
  if (code === 'ECONNABORTED') {
    code = 'ETIMEDOUT';
    errorMessage = `${method} ${url} => timed out after ${err.timeout} ms`;
  }
  if (!code && errorMessage.indexOf('JSON') >= 0) {
    code = 'ESerialization';
    errorMessage = `${method} ${url} => could not deserialize response body`;
  }
  // note that we clone and trim the error and response objects to avoid
  // displaying too much information in the logs.
  const jsonErr = { ...err, message: err.message };
  delete jsonErr.req;
  delete jsonErr.res;
  delete jsonErr.response;
  const jsonResp = resp.toJSON ? resp.toJSON() : resp;
  delete jsonResp.text;
  return new HttpClientError(
    errorMessage,
    code,
    statusCode,
    statusMessage,
    evalBody(resp.body, resp.text),
    jsonErr,
    jsonResp,
  );
}
