/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

// eslint-disable-next-line max-classes-per-file
import {
  createDefaultDeserializers,
  guessContentTypeFrom,
  HttpClientError,
  IHttpClient,
  IHttpDefaults,
  IHttpRequest,
  IHttpResponse,
  ILogger,
  IHttpContent,
  IHttpContext,
  retryAction,
  isTransientHttpError,
  serialize,
  deserialize,
  isInvalidStatusCode,
  formatErrorMessage,
  getHeaderAsString,
} from '@villedemontreal/auth-core';
import * as http from 'http';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { requestCorrelator } from './requestCorrelator';
import { requestLogger } from './requestLogger';

/**
 * An implementation of the IHttpClient using the Axios library
 */
export class AxiosHttpClient implements IHttpClient {
  constructor(private logger: ILogger, private defaults: IHttpDefaults = {}) {}

  /**
   * Sends a HTTP request to a remote server
   * @param request the HTTP request to send to a remote server
   * @returns a HTTP response from the server
   * @throws HttpClientError when response status code is not within 200 to 299 range,
   *         or for any other exception.
   */
  public async send(request: Readonly<IHttpRequest>): Promise<IHttpResponse> {
    return retryAction({
      maxRetries: request.retries || this.defaults.retries || 0,
      action: (attempt, lastError) => this.doSend(request),
      canRetry: (attempt, error) =>
        Promise.resolve(
          isTransientHttpError(error.response?.status, error.code),
        ),
    });
  }

  private async doSend(
    request: Readonly<IHttpRequest>,
  ): Promise<IHttpResponse> {
    const context = this.createRequestContext(request);
    const content = this.createRequestContent(context);
    const config: AxiosRequestConfig = {
      method: request.method,
      url: request.url,
      headers: context.headers,
      timeout: context.options.timeout,
      responseType: 'arraybuffer',
      validateStatus: status => true,
    };
    if (content) {
      config.headers['content-type'] = content.contentType;
      config.headers['content-length'] = content.contentLength;
      config.data = content.content;
    }
    if (this.defaults.correlator) {
      requestCorrelator(this.defaults.correlator).bind(config);
    }
    if (this.defaults.logRequests !== false) {
      requestLogger(this.logger).bind(config);
    }
    try {
      const response = await axios.request(config);
      return this.processResponse(context, response);
    } catch (err) {
      throw remapError(err, context);
    }
  }

  private createRequestContext(request: Readonly<IHttpRequest>): IHttpContext {
    const serializers = createDefaultDeserializers();
    const url = new URL(request.url);
    const method = request.method || 'GET';
    const headers: http.OutgoingHttpHeaders = {
      ...this.defaults.headers,
      ...request.headers,
    };
    if (Array.isArray(headers.cookie)) {
      headers.cookie = headers.cookie.join('; ');
    }

    const options: http.RequestOptions = {
      headers,
      method,
      // tslint:disable-next-line: object-literal-sort-keys
      hostname: url.hostname,
      path: url.pathname + url.search,
      port: url.port,
      protocol: url.protocol,
      timeout: request.timeout || this.defaults.timeout,
    };
    return {
      headers,
      method,
      options,
      request,
      serializers,
      url,
    };
  }

  private createRequestContent(
    context: IHttpContext,
  ): IHttpContent | undefined {
    // ensure we have a content-type
    let contentType = getHeaderAsString(context.headers['content-type']);
    if (!contentType) {
      contentType = guessContentTypeFrom(context.request.body);
    }
    if (contentType) {
      // serialize and update headers
      let contentLength = 0;
      const content = serialize(context, context.request.body, contentType);
      if (typeof content === 'string') {
        contentLength = Buffer.byteLength(content);
      } else {
        contentLength = content.length;
      }
      return {
        content,
        contentLength,
        contentType,
      };
    }
    return undefined;
  }

  private processResponse(
    context: IHttpContext,
    res: AxiosResponse<any>,
  ): IHttpResponse {
    const incomingData = deserialize(
      context,
      res,
      res.data,
      res.headers['content-type'],
    );
    const response: IHttpResponse = {
      body: incomingData,
      headers: res.headers,
      statusCode: res.status,
      statusMessage: res.statusText,
    };
    // reject on bad status
    if (isInvalidStatusCode(res.status)) {
      throw new HttpClientError(
        formatErrorMessage(context, `${res.status}`),
        'EBadHttpResponseStatusCode',
        res.status,
        res.statusText,
        incomingData,
        undefined,
        res,
      );
    }
    return response;
  }
}

/**
 * remaps an error thrown while sending a request into a HttpClientError
 * @param err the error thrown while sending the request
 * @param context the current context
 * @returns a HttpClientError
 */
export function remapError(err: any, context: IHttpContext) {
  if (err instanceof HttpClientError) {
    return err;
  }
  const resp: any = err.response || {};
  let { code, statusCode } = err;
  let statusMessage: string | undefined;
  let errorMessage;
  if (resp.status) {
    statusCode = resp.status;
    statusMessage = resp.statusText;
    code = 'EBadHttpResponseStatusCode';
    errorMessage = formatErrorMessage(context, statusCode.toString());
  } else {
    errorMessage = formatErrorMessage(context, err.message);
  }
  if (code === 'ECONNABORTED') {
    code = 'ETIMEDOUT';
    errorMessage = formatErrorMessage(
      context,
      `timed out after ${context.options.timeout} ms`,
    );
  }
  // note that we clone and trim the error and response objects to avoid
  // displaying too much information in the logs.
  const jsonErr = { ...err, message: err.message };
  delete jsonErr.config;
  delete jsonErr.request;
  delete jsonErr.response;
  delete jsonErr.toJSON;
  return new HttpClientError(
    errorMessage,
    code,
    statusCode,
    statusMessage,
    resp.data,
    jsonErr,
    resp,
  );
}
