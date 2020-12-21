/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/**
 * Error thrown by any IHttpClient implementation, either when wrapping a connection error,
 * or when the http response code is not within 200 to 299.
 */
export class HttpClientError extends Error {
  /**
   * Creates a new instance of a HttpClientError
   * @param message the error message
   * @param code the standardized error code
   * @param statusCode the HTTP status code
   * @param statusMessage the display text for the HTTP status code
   * @param body the body returned in the HTTP Response that failed
   * @param innerError the original error message wrapped by this error
   * @param response the original HTTP response object
   */
  constructor(
    message: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly statusMessage?: string,
    public readonly body?: any,
    public readonly innerError?: any,
    public readonly response?: any,
  ) {
    super(message);
  }

  /**
   * returns the properties that are suitable to a JSON serialization.
   * @remarks it will skip the response property which might be a complex object
   * (such as the response from the http module)
   */
  public toJSON(): any {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      statusMessage: this.statusMessage,
      body: this.body,
      innerError:
        this.innerError instanceof HttpClientError
          ? this.innerError.toJSON()
          : this.innerError,
      stack: this.stack,
    };
  }
}
