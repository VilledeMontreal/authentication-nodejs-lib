/*!
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

import { IMethodHookArgs } from './IMethodHookArgs';
import { TypedProperty } from '../types/TypedProperty';

const hookedProperty = new TypedProperty<boolean>(Symbol('isHooked'));

/**
 * hooks the method of a specific instance
 * @param instance the instance to be hooked
 * @param methodName the name of the method to be hooked
 * @param handler the function that will extend the behaviour of the hooked method
 */
export function hookMethod(
  instance: any,
  methodName: string,
  handler: (args: IMethodHookArgs) => Promise<void>,
): void {
  const hookedMethod = instance[methodName];
  if (!hookedMethod) {
    throw new Error(`Method '${methodName}' does not exist!`);
  }
  if (hookedProperty.get(hookedMethod) === true) {
    throw new Error(`Method '${methodName}' has already been hooked!`);
  }
  const newMethod = (...args: any[]) => {
    const handlerArgs: IMethodHookArgs = {
      hookedMethod,
      instance,
      invokeHookedMethod: true,
      methodArgs: [...args],
      methodName,
      restoreHookedMethod: false,
    };
    handler(handlerArgs)
      .then(() => {
        if (handlerArgs.restoreHookedMethod) {
          handlerArgs.instance[methodName] = handlerArgs.hookedMethod;
        }
        if (handlerArgs.invokeHookedMethod) {
          handlerArgs.hookedMethod.apply(
            handlerArgs.instance,
            handlerArgs.methodArgs,
          );
        }
      })
      .catch(reason => {
        if (handlerArgs.restoreHookedMethod) {
          handlerArgs.instance[methodName] = handlerArgs.hookedMethod;
        }
      });
  };
  hookedProperty.set(newMethod, true);
  // eslint-disable-next-line no-param-reassign
  instance[methodName] = newMethod;
}
