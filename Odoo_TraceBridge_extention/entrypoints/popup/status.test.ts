import { describe, expect, it } from 'vitest';
import { RECORDING_STATUS } from './status';

describe('popup scaffold', () => {
  it('clearly states that recording is unavailable', () => {
    expect(RECORDING_STATUS).toBe('Recording unavailable — not implemented');
  });
});
