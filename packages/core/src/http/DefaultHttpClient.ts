/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import * as http from 'http';
import * as https from 'https';
import { ILogger } from '../logging/ILogger';
import { HttpClientError } from './HttpClientError';
import { IHttpClient } from './IHttpClient';
import { IHttpDefaults } from './IHttpDefaults';
import { IHttpRequest } from './IHttpRequest';
import { IHttpResponse } from './IHttpResponse';
import { createDefaultDeserializers } from './serialization/createDefaultSerializers';
import { findSerializer } from './serialization/findSerializer';
import { guessContentTypeFrom } from './serialization/guessContentType';
import { ISerializers } from './serialization/ISerializers';
import { retryAction } from '../resilience/retryAction';
import { isTransientHttpError } from './isTransientHttpError';
import { Stopwatch } from '../time/Stopwatch';
import { StandardHttpHeaders } from './StandardHttpHeaders';
import { cleanupHttpError } from './cleanupHttpError';

/**
 * Describes a payload that can be sent or received using the HTTP protocol
 */
export interface IHttpContent {
  /**
   * the content object
   */
  content: string | Buffer;
  /**
   * the content-type of the content object
   */
  contentType: string;
  /**
   * the length of the content object in bytes
   */
  contentLength: number;
}

/**
 * the HTTP context used while sending a request
 */
export interface IHttpContext {
  /**
   * the request being sent
   */
  request: Readonly<IHttpRequest>;
  /**
   * the HTTP request options
   */
  options: http.RequestOptions;
  /**
   * the method of the request (GET/PUT/POST...)
   */
  method: string;
  /**
   * the url of the request
   */
  url: URL;
  /**
   * the headers of the request
   */
  headers: http.OutgoingHttpHeaders;
  /**
   * the serializers that can be used to serialize the outgoing body
   * and deserialize the incoming body.
   */
  serializers: ISerializers;
}

/**
 * Default implementation of the IHttpClient interface.
 * Each http client binding should provide its own implementation of IHttpClient.
 */
export class DefaultHttpClient implements IHttpClient {
  constructor(
    private readonly logger: ILogger,
    private readonly defaults: IHttpDefaults = {},
  ) {}

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
      action: async (attempt, lastError) => {
        const watch = this.logStart(request, attempt + 1);
        try {
          const response = await this.doSendAsync(request);

          this.logEnd(request, response, watch, attempt + 1);
          return response;
        } catch (err) {
          this.logError(request, err, watch, attempt + 1);
          throw err;
        }
      },
      canRetry: (attempt, error) =>
        Promise.resolve(isTransientHttpError(error.statusCode, error.code)),
    });
  }

  private doSendAsync(request: Readonly<IHttpRequest>): Promise<IHttpResponse> {
    return new Promise((resolve, reject) => {
      try {
        this.doSendWithCallback(request, resolve, reject);
      } catch (err) {
        reject(remapError(err));
      }
    });
  }

  private doSendWithCallback(
    request: Readonly<IHttpRequest>,
    resolve: (value?: any) => void,
    reject: (reason?: any) => void,
  ): void {
    const context = this.createRequestContext(request);
    const content = this.createRequestContent(context);

    const httpRequest =
      context.url.protocol === 'https:' ? https.request : http.request;

    const req = httpRequest(context.options, res => {
      const incomingBodyChunks: any[] = [];

      res.on('data', chunk => {
        incomingBodyChunks.push(chunk);
      });

      res.on('end', () => {
        try {
          resolve(this.processResponse(context, res, incomingBodyChunks));
        } catch (err) {
          reject(remapError(err));
        }
      });
    });

    req.on('error', err => {
      reject(
        new HttpClientError(
          formatErrorMessage(context, err.message),
          (err as any).code,
          undefined,
          undefined,
          undefined,
          err,
        ),
      );
    });

    req.on('timeout', () => {
      req.abort();
    });

    req.on('abort', (e: any) => {
      reject(
        new HttpClientError(
          formatErrorMessage(context, `timed out after ${request.timeout} ms`),
          'ETIMEDOUT',
        ),
      );
    });

    if (content) {
      req.setHeader(StandardHttpHeaders.ContentType, content.contentType);
      req.setHeader(StandardHttpHeaders.ContentLenth, content.contentLength);
      req.write(content.content);
    }

    req.end();
  }

  private createRequestContext(request: Readonly<IHttpRequest>): IHttpContext {
    const serializers = createDefaultDeserializers();
    const url = new URL(request.url);
    const method = request.method || 'GET';
    const headers: http.OutgoingHttpHeaders = {
      ...this.defaults.headers,
      ...request.headers,
    };
    this.injectCorrelationId(headers);

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
    let contentType = getHeaderAsString(
      context.headers[StandardHttpHeaders.ContentType],
    );
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

  private injectCorrelationId(headers: http.OutgoingHttpHeaders) {
    // inject a correlation ID if not already defined and if we have a provider
    if (!headers['x-correlation-id'] && this.defaults.correlator) {
      const correlationId = this.defaults.correlator.getId();
      if (correlationId) {
        // eslint-disable-next-line no-param-reassign
        headers['x-correlation-id'] = correlationId;
      }
    }
  }

  private processResponse(
    context: IHttpContext,
    res: http.IncomingMessage,
    incomingBodyChunks: any[],
  ): IHttpResponse {
    const incomingData = deserialize(
      context,
      res,
      Buffer.concat(incomingBodyChunks),
      res.headers[StandardHttpHeaders.ContentType],
    );
    const response: IHttpResponse = {
      body: incomingData,
      headers: res.headers,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
    };
    // reject on bad status
    if (isInvalidStatusCode(res.statusCode)) {
      throw new HttpClientError(
        formatErrorMessage(context, `${res.statusCode}`),
        'EBadHttpResponseStatusCode',
        res.statusCode,
        res.statusMessage,
        incomingData,
        undefined,
        res,
      );
    }
    return response;
  }

  private logStart(request: IHttpRequest, attempt: number) {
    if (this.defaults.logRequests !== false) {
      const { url } = request;
      const method = request.method || 'GET';
      this.logger.debug({ attempt, method, url }, `Start of ${method} ${url}`);
    }
    return Stopwatch.startNew();
  }

  private logEnd(
    request: IHttpRequest,
    response: IHttpResponse,
    watch: Stopwatch,
    attempt: number,
  ) {
    if (this.defaults.logRequests !== false) {
      const elapsedTimeInMS = watch.elapsedTimeInMS();
      const { url } = request;
      const method = request.method || 'GET';
      const { statusCode } = response;
      this.logger.debug(
        { attempt, method, url, elapsedTimeInMS, statusCode },
        `End of ${method} ${url} => ${statusCode} in ${elapsedTimeInMS} ms`,
      );
    }
  }

  private logError(
    request: IHttpRequest,
    error: any,
    watch: Stopwatch,
    attempt: number,
  ) {
    if (this.defaults.logRequests !== false) {
      const elapsedTimeInMS = watch.elapsedTimeInMS();
      const { url } = request;
      const method = request.method || 'GET';
      const errorMessage = extractMessageFromError(error);
      this.logger.error(
        {
          attempt,
          method,
          url,
          elapsedTimeInMS,
          error: cleanupHttpError(error),
        },
        `Attempt #${attempt} of ${method} ${url} failed in ${elapsedTimeInMS} ms: ${errorMessage}`,
      );
    }
  }
}

/**
 * Serializes the submitted content either as a string or as a buffer,
 * depending on the content type and the serializer.
 * @param context the http context
 * @param content the content that needs to be serialized
 * @param contentType the content-type of the content
 */
export function serialize(
  context: IHttpContext,
  content: unknown,
  contentType: string,
): any {
  try {
    const serializer = findSerializer(contentType, context.serializers);
    if (serializer) {
      return serializer.serialize(content);
    }
    if (isAlreadySerialized(content)) {
      return content;
    }
    throw new Error(
      `Could not find a serializer for contentType '${contentType}'`,
    );
  } catch (e) {
    throw new HttpClientError(
      formatErrorMessage(context, 'Could not serialize body'),
      'ESerialization',
      undefined,
      undefined,
      content,
      e,
    );
  }
}

/**
 * deserializes the payload of the received http response
 * @param context the http context
 * @param res the internal http response object
 * @param content the received content
 * @param [contentType] the content-type of the received content
 */
export function deserialize(
  context: IHttpContext,
  res: unknown,
  content: Buffer,
  contentType?: string,
) {
  try {
    if (content.length === 0) {
      return null;
    }
    if (!contentType) {
      return content;
    }
    const serializer = findSerializer(contentType, context.serializers);
    if (serializer) {
      return serializer.deserialize(content);
    }
    return content;
  } catch (e) {
    throw new HttpClientError(
      formatErrorMessage(context, 'could not deserialize response body'),
      'ESerialization',
      undefined,
      undefined,
      content,
      e,
      res,
    );
  }
}

/**
 * maps internal errors into standard HttpClientError objects
 * @param err the original error
 */
export function remapError(err: any): HttpClientError {
  if (err instanceof HttpClientError) {
    return err;
  }
  return new HttpClientError(
    err?.message || 'Unknown error',
    err?.code || 'EUNKNOWN',
    undefined,
    undefined,
    undefined,
    err,
  );
}

/**
 * gets the value of a http request or response header
 * @param value the name of the header
 */
export function getHeaderAsString(
  value: number | string | string[] | undefined,
): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

/**
 * Tries to extract the message property from
 * the submitted error object.
 * @param error the error object
 */
export function extractMessageFromError(error: any) {
  if (error) {
    if (error.message) {
      return error.message;
    }
    return error.toString();
  }
  return 'Unknown error';
}

/**
 * formats a message by adding information about the request beeing executed
 * @param context the http context
 * @param message the message to format
 */
export function formatErrorMessage(context: IHttpContext, message: string) {
  return `${context.method} ${context.request.url} => ${message}`;
}

/**
 * tells if the content was already serialized or not
 * @param content an instance
 */
export function isAlreadySerialized(content: unknown) {
  if (content === undefined) {
    return true;
  }
  if (content === null) {
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
 * tells if the submitted status code is invalid
 * @param [statusCode] a standard HTTP status code
 */
export function isInvalidStatusCode(statusCode?: number) {
  if (!statusCode) {
    return true;
  }
  return statusCode < 200 || statusCode >= 300;
}
