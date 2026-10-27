import { describe, expect, it } from 'vitest';
import { RECORDING_STATUS } from './status';

describe('popup scaffold', () => {
  it('clearly states the volatile observation limit', () => {
    expect(RECORDING_STATUS).toBe('Limited action/navigation categories — memory only; lost on worker restart (Phase 05)');
  });
});
