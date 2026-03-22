/**
 * Tests for Defect Manager
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  parseDefects,
  createDefect,
  updateDefectStatus,
  appendEvidence,
  getOpenDefects,
  getDefectsForAC,
  allDefectsVerified,
  getDefectSummary,
} from '../../../../src/core/increment/defect-manager.js';

describe('defect-manager', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'defect-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('parseDefects', () => {
    it('should return empty array if defects.json does not exist', () => {
      expect(parseDefects(tempDir)).toEqual([]);
    });
  });

  describe('createDefect', () => {
    it('should create first defect with DEF-001 ID', () => {
      const defect = createDefect(tempDir, {
        acId: 'AC-US1-01',
        description: 'Progress bar missing',
        source: 'grill',
        severity: 'critical',
      });

      expect(defect.id).toBe('DEF-001');
      expect(defect.status).toBe('open');
      expect(defect.acId).toBe('AC-US1-01');
      expect(defect.source).toBe('grill');
      expect(defect.severity).toBe('critical');
      expect(defect.reportedAt).toBeTruthy();
      expect(defect.resolvedAt).toBeNull();
      expect(defect.verifiedAt).toBeNull();
    });

    it('should auto-increment defect IDs', () => {
      createDefect(tempDir, {
        acId: 'AC-US1-01',
        description: 'First',
        source: 'grill',
        severity: 'high',
      });
      const second = createDefect(tempDir, {
        acId: 'AC-US1-02',
        description: 'Second',
        source: 'e2e',
        severity: 'medium',
      });

      expect(second.id).toBe('DEF-002');
    });

    it('should preserve existing defects when appending', () => {
      createDefect(tempDir, {
        acId: 'AC-US1-01',
        description: 'First',
        source: 'grill',
        severity: 'high',
      });
      createDefect(tempDir, {
        acId: 'AC-US1-02',
        description: 'Second',
        source: 'e2e',
        severity: 'medium',
      });

      const all = parseDefects(tempDir);
      expect(all).toHaveLength(2);
      expect(all[0].id).toBe('DEF-001');
      expect(all[1].id).toBe('DEF-002');
    });
  });

  describe('updateDefectStatus', () => {
    it('should transition open -> fixed', () => {
      createDefect(tempDir, {
        acId: 'AC-US1-01',
        description: 'Bug',
        source: 'grill',
        severity: 'high',
      });

      const updated = updateDefectStatus(tempDir, 'DEF-001', 'fixed');
      expect(updated?.status).toBe('fixed');
      expect(updated?.resolvedAt).toBeTruthy();
      expect(updated?.verifiedAt).toBeNull();
    });

    it('should transition fixed -> verified', () => {
      createDefect(tempDir, {
        acId: 'AC-US1-01',
        description: 'Bug',
        source: 'grill',
        severity: 'high',
      });
      updateDefectStatus(tempDir, 'DEF-001', 'fixed');

      const updated = updateDefectStatus(tempDir, 'DEF-001', 'verified');
      expect(updated?.status).toBe('verified');
      expect(updated?.verifiedAt).toBeTruthy();
    });

    it('should fast-track open -> verified', () => {
      createDefect(tempDir, {
        acId: 'AC-US1-01',
        description: 'Bug',
        source: 'grill',
        severity: 'low',
      });

      const updated = updateDefectStatus(tempDir, 'DEF-001', 'verified');
      expect(updated?.status).toBe('verified');
      expect(updated?.resolvedAt).toBeTruthy();
      expect(updated?.verifiedAt).toBeTruthy();
    });

    it('should return null for non-existent defect', () => {
      expect(updateDefectStatus(tempDir, 'DEF-999', 'fixed')).toBeNull();
    });
  });

  describe('appendEvidence', () => {
    it('should append evidence to existing defect', () => {
      createDefect(tempDir, {
        acId: 'AC-US1-01',
        description: 'Bug',
        source: 'grill',
        severity: 'high',
        evidence: ['initial finding'],
      });

      appendEvidence(tempDir, 'DEF-001', 'screenshot at upload.ts:42');
      const defects = parseDefects(tempDir);
      expect(defects[0].evidence).toEqual(['initial finding', 'screenshot at upload.ts:42']);
    });
  });

  describe('getOpenDefects', () => {
    it('should return only non-verified defects', () => {
      createDefect(tempDir, { acId: 'AC-US1-01', description: 'A', source: 'grill', severity: 'high' });
      createDefect(tempDir, { acId: 'AC-US1-02', description: 'B', source: 'e2e', severity: 'medium' });
      updateDefectStatus(tempDir, 'DEF-001', 'verified');

      const open = getOpenDefects(tempDir);
      expect(open).toHaveLength(1);
      expect(open[0].id).toBe('DEF-002');
    });
  });

  describe('getDefectsForAC', () => {
    it('should filter by AC-ID', () => {
      createDefect(tempDir, { acId: 'AC-US1-01', description: 'A', source: 'grill', severity: 'high' });
      createDefect(tempDir, { acId: 'AC-US2-01', description: 'B', source: 'grill', severity: 'medium' });
      createDefect(tempDir, { acId: 'AC-US1-01', description: 'C', source: 'e2e', severity: 'low' });

      const forAC = getDefectsForAC(tempDir, 'AC-US1-01');
      expect(forAC).toHaveLength(2);
    });
  });

  describe('allDefectsVerified', () => {
    it('should return true when no defects', () => {
      expect(allDefectsVerified(tempDir)).toBe(true);
    });

    it('should return false when open defects exist', () => {
      createDefect(tempDir, { acId: 'AC-US1-01', description: 'Bug', source: 'grill', severity: 'high' });
      expect(allDefectsVerified(tempDir)).toBe(false);
    });

    it('should return true when all verified', () => {
      createDefect(tempDir, { acId: 'AC-US1-01', description: 'Bug', source: 'grill', severity: 'high' });
      updateDefectStatus(tempDir, 'DEF-001', 'verified');
      expect(allDefectsVerified(tempDir)).toBe(true);
    });
  });

  describe('getDefectSummary', () => {
    it('should compute correct summary', () => {
      createDefect(tempDir, { acId: 'AC-US1-01', description: 'A', source: 'grill', severity: 'critical' });
      createDefect(tempDir, { acId: 'AC-US1-02', description: 'B', source: 'e2e', severity: 'high' });
      createDefect(tempDir, { acId: 'AC-US2-01', description: 'C', source: 'manual', severity: 'low' });
      updateDefectStatus(tempDir, 'DEF-001', 'fixed');
      updateDefectStatus(tempDir, 'DEF-002', 'verified');

      const summary = getDefectSummary(tempDir);
      expect(summary.total).toBe(3);
      expect(summary.open).toBe(1);
      expect(summary.fixed).toBe(1);
      expect(summary.verified).toBe(1);
      expect(summary.bySeverity.critical).toBe(1);
      expect(summary.bySeverity.high).toBe(1);
      expect(summary.bySeverity.low).toBe(1);
    });
  });
});
