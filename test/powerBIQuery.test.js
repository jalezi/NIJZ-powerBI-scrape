import { old } from './powerBIQueryOld.js';
import { q_odmerek1, q_odmerek2 } from '../src/nijz-dash-fetch.js';

describe('Power BI Queries', () => {
  it('should be equal to old queries', () => {
    expect(q_odmerek1).toEqual(old.q_odmerek1);
    expect(q_odmerek2).toEqual(old.q_odmerek2);
  });
});
