/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { ILogger } from './ILogger';

export interface ILogEntry {
  messageObj: any;
  txtMsg?: string;
  logType: 'debug' | 'info' | 'warning' | 'error';
}

/** A fake logger used to accumulate log entries during unit tests */
export class FakeLogger implements ILogger {
  public entries: ILogEntry[] = [];

  /** returns the last log entry */
  public last(): ILogEntry {
    return this.entries[this.entries.length - 1];
  }

  /** clears all log entries */
  public reset() {
    this.entries = [];
  }

  /** logs a message with the 'debug' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  public debug(messageObj: any, txtMsg?: string): void {
    this.entries.push({ messageObj, txtMsg, logType: 'debug' });
  }

  /** logs a message with the 'info' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  public info(messageObj: any, txtMsg?: string): void {
    this.entries.push({ messageObj, txtMsg, logType: 'info' });
  }

  /** logs a message with the 'warning' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  public warning(messageObj: any, txtMsg?: string): void {
    this.entries.push({ messageObj, txtMsg, logType: 'warning' });
  }

  /** logs a message with the 'error' verbosity level
   * @param messageObj a dictionary of metadata
   * @param txtMsg a text message to report
   */
  public error(messageObj: any, txtMsg?: string): void {
    this.entries.push({ messageObj, txtMsg, logType: 'error' });
  }
}
