/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/**
 * The the context provided to a handler while hooking a method
 */
export interface IMethodHookArgs {
  /**
   * the instance beeing hooked
   */
  readonly instance: any;
  /**
   * a flag specifying if the hook should invoke the original method.
   * Same a invoking super in an overridden method.
   * This is true by default.
   */
  invokeHookedMethod: boolean;
  /**
   * a list of arguments received by the hooked method.
   * Note that you can modify those arguments if you need to override
   * the behaviour of the original method.
   */
  readonly methodArgs: any[];
  /**
   * the name of the hooked method
   */
  readonly methodName: string;
  /**
   * the original method being hooked
   */
  readonly hookedMethod: (...args: any[]) => any;
  /**
   * a flag specifying if we need to restore the original method
   * after executing the hook.
   * This is true by default.
   */
  restoreHookedMethod: boolean;
}
