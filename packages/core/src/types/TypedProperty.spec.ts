/*
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */
import { TypedProperty } from './TypedProperty';

interface IUser {
  name: string;
}

describe('TypedProperty', () => {
  describe('with string property name', () => {
    test('string property', async () => {
      const obj: any = {};
      const nameProp = new TypedProperty<string>('name');
      expect(nameProp.isUndefined(obj)).toBeTruthy();
      expect(nameProp.get(obj)).toBeUndefined();
      nameProp.set(obj, 'Foobar');
      expect(nameProp.isUndefined(obj)).toBeFalsy();
      expect(nameProp.get(obj)).toBe('Foobar');
      expect(obj.name).toBe('Foobar');
      nameProp.clear(obj);
      expect(nameProp.isUndefined(obj)).toBeTruthy();
      expect(nameProp.get(obj)).toBeUndefined();
      expect(nameProp.getOrSet(obj, () => 'bar')).toBe('bar');
      expect(nameProp.isUndefined(obj)).toBeFalsy();
      expect(nameProp.get(obj)).toBe('bar');
      // provider should not be invoked if value already exists
      expect(nameProp.getOrSet(obj, () => '')).toBe('bar');
      nameProp.set(obj, undefined);
      expect(nameProp.isUndefined(obj)).toBeTruthy();
      expect(nameProp.get(obj)).toBeUndefined();
      await expect(
        nameProp.getOrSetAsync(obj, () => Promise.resolve('zorg')),
      ).resolves.toBe('zorg');
      expect(nameProp.isUndefined(obj)).toBeFalsy();
      expect(nameProp.get(obj)).toBe('zorg');
      // provider should not be invoked if value already exists
      await expect(
        nameProp.getOrSetAsync(obj, () => Promise.resolve('')),
      ).resolves.toBe('zorg');
    });
  });

  describe('with symbol property name', () => {
    test('number property', async () => {
      const obj: IUser = { name: 'Foobar' };
      const ageProp = new TypedProperty<number, IUser>(Symbol('age'));
      expect(ageProp.isUndefined(obj)).toBeTruthy();
      expect(ageProp.get(obj)).toBeUndefined();
      ageProp.set(obj, 33);
      expect(ageProp.isUndefined(obj)).toBeFalsy();
      expect(ageProp.get(obj)).toBe(33);
      ageProp.clear(obj);
      expect(ageProp.isUndefined(obj)).toBeTruthy();
      expect(ageProp.get(obj)).toBeUndefined();
      expect(ageProp.getOrSet(obj, () => 44)).toBe(44);
      expect(ageProp.isUndefined(obj)).toBeFalsy();
      expect(ageProp.get(obj)).toBe(44);
      // provider should not be invoked if value already exists
      expect(ageProp.getOrSet(obj, () => 0)).toBe(44);
      ageProp.set(obj, undefined);
      expect(ageProp.isUndefined(obj)).toBeTruthy();
      expect(ageProp.get(obj)).toBeUndefined();
      await expect(
        ageProp.getOrSetAsync(obj, () => Promise.resolve(55)),
      ).resolves.toBe(55);
      expect(ageProp.isUndefined(obj)).toBeFalsy();
      expect(ageProp.get(obj)).toBe(55);
      // provider should not be invoked if value already exists
      await expect(
        ageProp.getOrSetAsync(obj, () => Promise.resolve(0)),
      ).resolves.toBe(55);
    });
  });
});
