/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { ILogger } from './ILogger';

/** default logger used to ignore log entries */
export class NoopLogger implements ILogger {
  /** logs a message with the 'debug' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  // tslint:disable-next-line: no-empty
  public debug(messageObj: any, txtMsg?: string): void {}

  /** logs a message with the 'info' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  // tslint:disable-next-line: no-empty
  public info(messageObj: any, txtMsg?: string): void {}

  /** logs a message with the 'warning' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  // tslint:disable-next-line: no-empty
  public warning(messageObj: any, txtMsg?: string): void {}

  /** logs a message with the 'error' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  // tslint:disable-next-line: no-empty
  public error(messageObj: any, txtMsg?: string): void {}
}
