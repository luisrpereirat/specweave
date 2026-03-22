/**
 * Defect and Test Manifest Type Definitions
 *
 * Types for per-increment defect tracking and per-AC regression tracking.
 * Used by defect-manager.ts and test-manifest-manager.ts.
 *
 * @module defect-types
 */

// ============================================================================
// Defect Tracking Types
// ============================================================================

export type DefectStatus = 'open' | 'fixed' | 'verified';

export type DefectSource = 'grill' | 'e2e' | 'manual' | 'judge';

export type DefectSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface DefectEntry {
  /** Unique ID: DEF-NNN (sequential per increment, never reused) */
  id: string;
  /** Current lifecycle status */
  status: DefectStatus;
  /** AC-ID from spec.md that this defect relates to */
  acId: string;
  /** Task from tasks.md that introduced or should fix the defect (optional) */
  taskId?: string;
  /** Human-readable description of the defect */
  description: string;
  /** Evidence trail: grill findings, console errors, screenshots, etc. */
  evidence: string[];
  /** Steps to reproduce (optional) */
  stepsToReproduce?: string[];
  /** How the defect was discovered */
  source: DefectSource;
  /** Severity classification */
  severity: DefectSeverity;
  /** ISO timestamp when the defect was reported */
  reportedAt: string;
  /** ISO timestamp when the defect was fixed (null until fixed) */
  resolvedAt: string | null;
  /** ISO timestamp when the fix was verified (null until verified) */
  verifiedAt: string | null;
}

export interface DefectsFile {
  version: string;
  defects: DefectEntry[];
}

// ============================================================================
// Test Manifest Types
// ============================================================================

export type AutomationType = 'manual' | 'unit' | 'e2e';

export type TestResult = 'pass' | 'fail' | 'blocked';

export interface ACTestEntry {
  /** AC-ID from spec.md */
  acId: string;
  /** Type of test automation */
  automationType: AutomationType;
  /** Path to test file (null for manual tests) */
  testFile: string | null;
  /** Test function/describe name (null for manual tests) */
  testName: string | null;
  /** ISO timestamp of last test execution (null if never run) */
  lastRunDate: string | null;
  /** Result of last test execution (null if never run) */
  lastRunResult: TestResult | null;
}

export interface TestManifestCoverage {
  totalACs: number;
  automatedACs: number;
  manualACs: number;
  automationPercentage: number;
}

export interface TestManifestFile {
  version: string;
  lastUpdated: string;
  acTests: ACTestEntry[];
  coverage: TestManifestCoverage;
}

// ============================================================================
// Test Execution History (for metadata.json extension)
// ============================================================================

export interface TestExecutionEntry {
  timestamp: string;
  runner: string;
  totalACs: number;
  passedACs: number;
  failedACs: number;
  automatedRuns: number;
  manualChecks: number;
  defectsCreated: number;
}

// ============================================================================
// Grill Report Regression Extension
// ============================================================================

export interface ACRegressionMetadata {
  automationType: AutomationType;
  testFile: string | null;
  testName: string | null;
  lastRunDate: string | null;
  lastRunResult: TestResult | null;
}
