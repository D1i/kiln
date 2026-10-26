import { appName } from '../src/main';

describe('scaffold', () => {
  it('exposes the app name', () => {
    expect(appName).toBe('warmup');
  });
});
