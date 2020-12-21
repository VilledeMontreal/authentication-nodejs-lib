/*
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */

/**
 * Provides a strongly typed access to a property of an object.
 * This allows to attach custom data to any existing instance.
 * @example
 * const ageProp = new TypedProperty<number, IUser>(Symbol('age'));
 * ageProp.set(someInstance, 33);
 * const age = ageProp.get() || 0;
 */
export class TypedProperty<TProperty, TObject = any> {
  constructor(private readonly propertyName: string | symbol) {}

  /**
   * tells if the property of the target instance is defined or not
   * @param target the target object to inspect
   */
  isUndefined(target: TObject) {
    return (target as any)[this.propertyName] === undefined;
  }

  /**
   * gets the current value of the target instance or return undefined
   * @param target the target object to inspect
   */
  get(target: TObject): TProperty | undefined {
    const value = (target as any)[this.propertyName];
    if (value !== undefined) {
      return value as TProperty;
    }
    return undefined;
  }

  /**
   * assigns a new value to the property in the target instance
   * @param target the target object to modify
   * @param value the new value
   */
  set(target: TObject, value: TProperty | undefined): void {
    if (value === undefined) {
      this.clear(target);
    } else {
      // eslint-disable-next-line no-param-reassign
      (target as any)[this.propertyName] = value;
    }
  }

  /**
   * clears the property of the target instance
   * @param target the target object to modify
   */
  clear(target: TObject): void {
    // eslint-disable-next-line no-param-reassign
    delete (target as any)[this.propertyName];
  }

  /**
   * gets the current value of the target instance or invokes the value provider and sets the property
   * @param target the target object to inspect or modify
   * @param valueProvider the sync value provider that will be invoked if the property is undefined
   */
  getOrSet(target: TObject, valueProvider: () => TProperty): TProperty {
    let value = this.get(target);
    if (value === undefined) {
      value = valueProvider();
      this.set(target, value);
    }
    return value;
  }

  /**
   * gets the current value of the target instance or invokes the async value provider and sets the property
   * @param target the target object to inspect or modify
   * @param valueProvider the async value provider that will be invoked if the property is undefined
   */
  async getOrSetAsync(
    target: TObject,
    valueProvider: () => Promise<TProperty>,
  ) {
    let value = this.get(target);
    if (value === undefined) {
      value = await valueProvider();
      this.set(target, value);
    }
    return value;
  }
}
