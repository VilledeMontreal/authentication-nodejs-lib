/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/** Abstract logger interface.
 *  A log entry is made of two parts:
 *  - a map of key/value pairs used to provide additional metadata
 *  - a text message
 */
export interface ILogger {
  /** logs a message with the 'debug' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  debug(messageObj: any, txtMsg?: string): void;

  /** logs a message with the 'info' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  info(messageObj: any, txtMsg?: string): void;

  /** logs a message with the 'warning' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  warning(messageObj: any, txtMsg?: string): void;

  /** logs a message with the 'error' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  error(messageObj: any, txtMsg?: string): void;
}
