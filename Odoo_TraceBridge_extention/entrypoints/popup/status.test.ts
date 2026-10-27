import { describe, expect, it } from 'vitest';
import { RECORDING_STATUS } from './status';

describe('popup scaffold', () => {
  it('clearly states the no-capture limit', () => {
    expect(RECORDING_STATUS).toBe('Lifecycle only — no diagnostic signals collected (Phase 04)');
  });
});
