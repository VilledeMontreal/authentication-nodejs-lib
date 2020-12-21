/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { ILogger } from './ILogger';

/** Simple logger that displays log entries in the console */
export class ConsoleLogger implements ILogger {
  constructor(
    private readonly correlationIdProvider?: () => string | undefined,
  ) {}

  /** logs a message with the 'debug' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  public debug(messageObj: any, txtMsg?: string): void {
    // eslint-disable-next-line no-console
    this.doLog(console.debug, 'Debug', messageObj, txtMsg);
  }

  /** logs a message with the 'info' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  public info(messageObj: any, txtMsg?: string): void {
    // eslint-disable-next-line no-console
    this.doLog(console.info, 'Info', messageObj, txtMsg);
  }

  /** logs a message with the 'warning' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  public warning(messageObj: any, txtMsg?: string): void {
    // eslint-disable-next-line no-console
    this.doLog(console.warn, 'Warning', messageObj, txtMsg);
  }

  /** logs a message with the 'error' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  public error(messageObj: any, txtMsg?: string): void {
    // eslint-disable-next-line no-console
    this.doLog(console.error, 'Error', messageObj, txtMsg);
  }

  private doLog(
    logger: (...args: any[]) => void,
    logType: string,
    messageObj: any,
    txtMsg?: string,
  ) {
    const args = [new Date().toJSON(), `[${logType.toLocaleUpperCase()}]`];
    if (this.correlationIdProvider) {
      const cid = this.correlationIdProvider();
      if (cid) {
        args.push(`[Cid: ${cid}]`);
      }
    }
    if (txtMsg) {
      args.push(txtMsg);
    }
    if (messageObj) {
      args.push(messageObj);
    }
    logger(...args);
  }
}
