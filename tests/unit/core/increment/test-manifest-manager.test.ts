/**
 * Tests for Test Manifest Manager
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  parseTestManifest,
  computeCoverage,
  initializeManifest,
  updateACTest,
  updateACTestResult,
  batchUpdateResults,
  getUncoveredACs,
  getFailingACs,
  getAutomationPercentage,
} from '../../../../src/core/increment/test-manifest-manager.js';

describe('test-manifest-manager', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'manifest-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('parseTestManifest', () => {
    it('should return null if test-manifest.json does not exist', () => {
      expect(parseTestManifest(tempDir)).toBeNull();
    });
  });

  describe('computeCoverage', () => {
    it('should compute 0% for all manual ACs', () => {
      const coverage = computeCoverage([
        { acId: 'AC-US1-01', automationType: 'manual', testFile: null, testName: null, lastRunDate: null, lastRunResult: null },
        { acId: 'AC-US1-02', automationType: 'manual', testFile: null, testName: null, lastRunDate: null, lastRunResult: null },
      ]);

      expect(coverage.totalACs).toBe(2);
      expect(coverage.automatedACs).toBe(0);
      expect(coverage.manualACs).toBe(2);
      expect(coverage.automationPercentage).toBe(0);
    });

    it('should compute 100% when all ACs are automated', () => {
      const coverage = computeCoverage([
        { acId: 'AC-US1-01', automationType: 'e2e', testFile: 'test.ts', testName: 'test', lastRunDate: null, lastRunResult: null },
        { acId: 'AC-US1-02', automationType: 'unit', testFile: 'test2.ts', testName: 'test2', lastRunDate: null, lastRunResult: null },
      ]);

      expect(coverage.totalACs).toBe(2);
      expect(coverage.automatedACs).toBe(2);
      expect(coverage.manualACs).toBe(0);
      expect(coverage.automationPercentage).toBe(100);
    });

    it('should compute correct percentage for mixed ACs', () => {
      const coverage = computeCoverage([
        { acId: 'AC-US1-01', automationType: 'e2e', testFile: 'test.ts', testName: 'test', lastRunDate: null, lastRunResult: null },
        { acId: 'AC-US1-02', automationType: 'manual', testFile: null, testName: null, lastRunDate: null, lastRunResult: null },
        { acId: 'AC-US1-03', automationType: 'unit', testFile: 'test3.ts', testName: 'test3', lastRunDate: null, lastRunResult: null },
      ]);

      expect(coverage.totalACs).toBe(3);
      expect(coverage.automatedACs).toBe(2);
      expect(coverage.manualACs).toBe(1);
      expect(coverage.automationPercentage).toBe(67);
    });

    it('should return 0% for empty array', () => {
      const coverage = computeCoverage([]);
      expect(coverage.totalACs).toBe(0);
      expect(coverage.automationPercentage).toBe(0);
    });
  });

  describe('initializeManifest', () => {
    it('should create manifest with all ACs as manual', () => {
      const manifest = initializeManifest(tempDir, ['AC-US1-01', 'AC-US1-02', 'AC-US2-01']);

      expect(manifest.version).toBe('1.0');
      expect(manifest.lastUpdated).toBeTruthy();
      expect(manifest.acTests).toHaveLength(3);

      for (const entry of manifest.acTests) {
        expect(entry.automationType).toBe('manual');
        expect(entry.testFile).toBeNull();
        expect(entry.testName).toBeNull();
        expect(entry.lastRunDate).toBeNull();
        expect(entry.lastRunResult).toBeNull();
      }

      expect(manifest.coverage.totalACs).toBe(3);
      expect(manifest.coverage.automatedACs).toBe(0);
      expect(manifest.coverage.automationPercentage).toBe(0);
    });

    it('should persist to disk', () => {
      initializeManifest(tempDir, ['AC-US1-01']);

      const parsed = parseTestManifest(tempDir);
      expect(parsed).not.toBeNull();
      expect(parsed!.acTests).toHaveLength(1);
      expect(parsed!.acTests[0].acId).toBe('AC-US1-01');
    });
  });

  describe('updateACTest', () => {
    it('should update automation type and test file', () => {
      initializeManifest(tempDir, ['AC-US1-01', 'AC-US1-02']);

      const updated = updateACTest(tempDir, 'AC-US1-01', {
        automationType: 'e2e',
        testFile: 'tests/e2e/upload.spec.ts',
        testName: 'should upload file',
      });

      expect(updated).not.toBeNull();
      const entry = updated!.acTests.find(t => t.acId === 'AC-US1-01');
      expect(entry!.automationType).toBe('e2e');
      expect(entry!.testFile).toBe('tests/e2e/upload.spec.ts');
      expect(entry!.testName).toBe('should upload file');
    });

    it('should update coverage when promoting to automated', () => {
      initializeManifest(tempDir, ['AC-US1-01', 'AC-US1-02']);

      const updated = updateACTest(tempDir, 'AC-US1-01', {
        automationType: 'e2e',
      });

      expect(updated!.coverage.automatedACs).toBe(1);
      expect(updated!.coverage.automationPercentage).toBe(50);
    });

    it('should return null for non-existent AC', () => {
      initializeManifest(tempDir, ['AC-US1-01']);

      const result = updateACTest(tempDir, 'AC-US9-99', { automationType: 'e2e' });
      expect(result).toBeNull();
    });

    it('should return null if no manifest exists', () => {
      const result = updateACTest(tempDir, 'AC-US1-01', { automationType: 'e2e' });
      expect(result).toBeNull();
    });
  });

  describe('updateACTestResult', () => {
    it('should update last run date and result', () => {
      initializeManifest(tempDir, ['AC-US1-01']);

      const updated = updateACTestResult(tempDir, 'AC-US1-01', 'pass');

      expect(updated).not.toBeNull();
      const entry = updated!.acTests.find(t => t.acId === 'AC-US1-01');
      expect(entry!.lastRunDate).toBeTruthy();
      expect(entry!.lastRunResult).toBe('pass');
    });

    it('should return null for non-existent AC', () => {
      initializeManifest(tempDir, ['AC-US1-01']);

      const result = updateACTestResult(tempDir, 'AC-US9-99', 'fail');
      expect(result).toBeNull();
    });
  });

  describe('batchUpdateResults', () => {
    it('should update multiple ACs at once', () => {
      initializeManifest(tempDir, ['AC-US1-01', 'AC-US1-02', 'AC-US2-01']);

      const updated = batchUpdateResults(tempDir, [
        { acId: 'AC-US1-01', result: 'pass' },
        { acId: 'AC-US1-02', result: 'fail' },
        { acId: 'AC-US2-01', result: 'pass' },
      ]);

      expect(updated).not.toBeNull();
      expect(updated!.acTests.find(t => t.acId === 'AC-US1-01')!.lastRunResult).toBe('pass');
      expect(updated!.acTests.find(t => t.acId === 'AC-US1-02')!.lastRunResult).toBe('fail');
      expect(updated!.acTests.find(t => t.acId === 'AC-US2-01')!.lastRunResult).toBe('pass');
    });

    it('should skip non-existent ACs without error', () => {
      initializeManifest(tempDir, ['AC-US1-01']);

      const updated = batchUpdateResults(tempDir, [
        { acId: 'AC-US1-01', result: 'pass' },
        { acId: 'AC-NONEXISTENT', result: 'fail' },
      ]);

      expect(updated).not.toBeNull();
      expect(updated!.acTests).toHaveLength(1);
      expect(updated!.acTests[0].lastRunResult).toBe('pass');
    });

    it('should return null if no manifest exists', () => {
      const result = batchUpdateResults(tempDir, [{ acId: 'AC-US1-01', result: 'pass' }]);
      expect(result).toBeNull();
    });
  });

  describe('getUncoveredACs', () => {
    it('should return ACs with manual type and no results', () => {
      initializeManifest(tempDir, ['AC-US1-01', 'AC-US1-02', 'AC-US2-01']);

      // Promote one to automated
      updateACTest(tempDir, 'AC-US1-01', { automationType: 'e2e' });
      // Give one a manual result
      updateACTestResult(tempDir, 'AC-US1-02', 'pass');

      const uncovered = getUncoveredACs(tempDir);
      expect(uncovered).toHaveLength(1);
      expect(uncovered[0].acId).toBe('AC-US2-01');
    });

    it('should return empty array if no manifest', () => {
      expect(getUncoveredACs(tempDir)).toEqual([]);
    });
  });

  describe('getFailingACs', () => {
    it('should return ACs with failing test results', () => {
      initializeManifest(tempDir, ['AC-US1-01', 'AC-US1-02', 'AC-US2-01']);

      batchUpdateResults(tempDir, [
        { acId: 'AC-US1-01', result: 'pass' },
        { acId: 'AC-US1-02', result: 'fail' },
        { acId: 'AC-US2-01', result: 'fail' },
      ]);

      const failing = getFailingACs(tempDir);
      expect(failing).toHaveLength(2);
      expect(failing.map(f => f.acId)).toEqual(['AC-US1-02', 'AC-US2-01']);
    });

    it('should return empty array if no manifest', () => {
      expect(getFailingACs(tempDir)).toEqual([]);
    });
  });

  describe('getAutomationPercentage', () => {
    it('should return 0 if no manifest', () => {
      expect(getAutomationPercentage(tempDir)).toBe(0);
    });

    it('should return correct percentage', () => {
      initializeManifest(tempDir, ['AC-US1-01', 'AC-US1-02']);
      updateACTest(tempDir, 'AC-US1-01', { automationType: 'e2e' });

      expect(getAutomationPercentage(tempDir)).toBe(50);
    });
  });
});
