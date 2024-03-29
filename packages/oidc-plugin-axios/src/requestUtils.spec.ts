/*
 * Copyright (c) 2020 Ville de Montreal. All rights reserved.
 * Licensed under the MIT license.
 * See LICENSE file in the project root for full license information.
 */
import { AxiosRequestConfig } from 'axios';
import { getHeader, getRequestInfo } from './requestUtils';

describe('requestUtils', () => {
  test('empty config should produce GET /', () => {
    const config: AxiosRequestConfig = {};
    const { method, url } = getRequestInfo(config);
    expect(method).toBe('GET');
    expect(url).toBe('/');
  });

  test('method only in config', () => {
    const config: AxiosRequestConfig = {
      method: 'post',
    };
    const { method, url } = getRequestInfo(config);
    expect(method).toBe('POST');
    expect(url).toBe('/');
  });

  test('method and partial url in config', () => {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: 'foo',
    };
    const { method, url } = getRequestInfo(config);
    expect(method).toBe('POST');
    expect(url).toBe('foo');
  });

  test('method and absolute url in config', () => {
    const config: AxiosRequestConfig = {
      method: 'PUT',
      url: 'https://zorg.ca/foo',
    };
    const { method, url } = getRequestInfo(config);
    expect(method).toBe('PUT');
    expect(url).toBe('https://zorg.ca/foo');
  });

  test('method and partial url and baseURL in config', () => {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: 'foo',
      baseURL: 'https://zorg.ca',
    };
    const { method, url } = getRequestInfo(config);
    expect(method).toBe('POST');
    expect(url).toBe('https://zorg.ca/foo');
  });

  test('method and absolute url and baseURL in config', () => {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: 'http://localhost/bar',
      baseURL: 'https://zorg.ca',
    };
    const { method, url } = getRequestInfo(config);
    expect(method).toBe('POST');
    expect(url).toBe('http://localhost/bar');
  });

  test('getHeader without headers should return undefined', () => {
    const config: AxiosRequestConfig = {
      method: 'PUT',
      url: 'https://zorg.ca/foo',
    };
    const value = getHeader(config, 'Authorization');
    expect(value).toBeUndefined();
  });
  test('getHeader with headers and unknown header should return undefined', () => {
    const config: AxiosRequestConfig = {
      method: 'PUT',
      url: 'https://zorg.ca/foo',
      headers: {},
    };
    const value = getHeader(config, 'Authorization');
    expect(value).toBeUndefined();
  });
  test('getHeader with headers and known header should return a value', () => {
    const config: AxiosRequestConfig = {
      method: 'PUT',
      url: 'https://zorg.ca/foo',
      headers: {
        Authorization: 'my auth',
      },
    };
    const value = getHeader(config, 'Authorization');
    expect(value).toBe('my auth');
  });
});
