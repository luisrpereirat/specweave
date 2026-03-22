/**
 * Test Manifest Manager
 *
 * Manages per-AC test linkage via test-manifest.json.
 * Maps each AC to its automation type, test file, and last execution results.
 *
 * @module test-manifest-manager
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type {
  ACTestEntry,
  AutomationType,
  TestResult,
  TestManifestCoverage,
  TestManifestFile,
} from '../types/defect.js';

// ============================================================================
// Constants
// ============================================================================

const MANIFEST_FILENAME = 'test-manifest.json';
const MANIFEST_VERSION = '1.0';

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Parse test manifest from an increment's test-manifest.json.
 * Returns null if file does not exist.
 */
export function parseTestManifest(incrementPath: string): TestManifestFile | null {
  const filePath = join(incrementPath, MANIFEST_FILENAME);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as TestManifestFile;
  } catch {
    return null;
  }
}

/**
 * Write test manifest to an increment's test-manifest.json.
 */
function writeManifest(incrementPath: string, manifest: TestManifestFile): void {
  if (!existsSync(incrementPath)) {
    mkdirSync(incrementPath, { recursive: true });
  }

  const filePath = join(incrementPath, MANIFEST_FILENAME);
  writeFileSync(filePath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
}

/**
 * Compute coverage statistics from AC test entries.
 */
export function computeCoverage(acTests: ACTestEntry[]): TestManifestCoverage {
  const totalACs = acTests.length;
  const automatedACs = acTests.filter(t => t.automationType !== 'manual').length;
  const manualACs = totalACs - automatedACs;

  return {
    totalACs,
    automatedACs,
    manualACs,
    automationPercentage: totalACs > 0 ? Math.round((automatedACs / totalACs) * 100) : 0,
  };
}

/**
 * Initialize a test manifest with AC-IDs from spec.md.
 * All entries default to manual with no test results.
 *
 * @param incrementPath - Path to increment directory
 * @param acIds - Array of AC-IDs from spec.md
 * @returns The created manifest
 */
export function initializeManifest(
  incrementPath: string,
  acIds: string[]
): TestManifestFile {
  const acTests: ACTestEntry[] = acIds.map(acId => ({
    acId,
    automationType: 'manual' as AutomationType,
    testFile: null,
    testName: null,
    lastRunDate: null,
    lastRunResult: null,
  }));

  const manifest: TestManifestFile = {
    version: MANIFEST_VERSION,
    lastUpdated: new Date().toISOString(),
    acTests,
    coverage: computeCoverage(acTests),
  };

  writeManifest(incrementPath, manifest);
  return manifest;
}

/**
 * Update the test linkage for a specific AC.
 * Promotes from manual to automated when a test file is assigned.
 *
 * @returns The updated manifest, or null if AC not found
 */
export function updateACTest(
  incrementPath: string,
  acId: string,
  update: {
    automationType?: AutomationType;
    testFile?: string | null;
    testName?: string | null;
  }
): TestManifestFile | null {
  const manifest = parseTestManifest(incrementPath);
  if (!manifest) return null;

  const entry = manifest.acTests.find(t => t.acId === acId);
  if (!entry) return null;

  if (update.automationType !== undefined) entry.automationType = update.automationType;
  if (update.testFile !== undefined) entry.testFile = update.testFile;
  if (update.testName !== undefined) entry.testName = update.testName;

  manifest.lastUpdated = new Date().toISOString();
  manifest.coverage = computeCoverage(manifest.acTests);

  writeManifest(incrementPath, manifest);
  return manifest;
}

/**
 * Update the test execution result for a specific AC.
 *
 * @returns The updated manifest, or null if AC not found
 */
export function updateACTestResult(
  incrementPath: string,
  acId: string,
  result: TestResult
): TestManifestFile | null {
  const manifest = parseTestManifest(incrementPath);
  if (!manifest) return null;

  const entry = manifest.acTests.find(t => t.acId === acId);
  if (!entry) return null;

  entry.lastRunDate = new Date().toISOString();
  entry.lastRunResult = result;

  manifest.lastUpdated = new Date().toISOString();

  writeManifest(incrementPath, manifest);
  return manifest;
}

/**
 * Batch update test results (e.g., after running a test suite).
 */
export function batchUpdateResults(
  incrementPath: string,
  results: Array<{ acId: string; result: TestResult }>
): TestManifestFile | null {
  const manifest = parseTestManifest(incrementPath);
  if (!manifest) return null;

  const now = new Date().toISOString();

  for (const { acId, result } of results) {
    const entry = manifest.acTests.find(t => t.acId === acId);
    if (entry) {
      entry.lastRunDate = now;
      entry.lastRunResult = result;
    }
  }

  manifest.lastUpdated = now;

  writeManifest(incrementPath, manifest);
  return manifest;
}

/**
 * Get ACs that have no automated tests.
 */
export function getUncoveredACs(incrementPath: string): ACTestEntry[] {
  const manifest = parseTestManifest(incrementPath);
  if (!manifest) return [];

  return manifest.acTests.filter(
    t => t.automationType === 'manual' && t.lastRunResult === null
  );
}

/**
 * Get ACs that have failing tests.
 */
export function getFailingACs(incrementPath: string): ACTestEntry[] {
  const manifest = parseTestManifest(incrementPath);
  if (!manifest) return [];

  return manifest.acTests.filter(t => t.lastRunResult === 'fail');
}

/**
 * Get the automation coverage percentage.
 */
export function getAutomationPercentage(incrementPath: string): number {
  const manifest = parseTestManifest(incrementPath);
  if (!manifest) return 0;
  return manifest.coverage.automationPercentage;
}
