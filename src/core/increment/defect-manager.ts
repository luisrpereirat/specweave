/**
 * Defect Manager
 *
 * CRUD operations for per-increment defect tracking via defects.json.
 * Manages the 3-state lifecycle: open -> fixed -> verified.
 *
 * Pattern reused from ac-status-manager.ts (same file read/write, JSON parse approach).
 *
 * @module defect-manager
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type {
  DefectEntry,
  DefectStatus,
  DefectSource,
  DefectSeverity,
  DefectsFile,
} from '../types/defect.js';

// ============================================================================
// Constants
// ============================================================================

const DEFECTS_FILENAME = 'defects.json';
const DEFECTS_VERSION = '1.0';

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Parse defects from an increment's defects.json.
 * Returns empty array if file does not exist.
 */
export function parseDefects(incrementPath: string): DefectEntry[] {
  const filePath = join(incrementPath, DEFECTS_FILENAME);

  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data: DefectsFile = JSON.parse(content);
    return data.defects || [];
  } catch {
    return [];
  }
}

/**
 * Write defects to an increment's defects.json.
 */
function writeDefects(incrementPath: string, defects: DefectEntry[]): void {
  const filePath = join(incrementPath, DEFECTS_FILENAME);

  // Ensure increment directory exists
  if (!existsSync(incrementPath)) {
    mkdirSync(incrementPath, { recursive: true });
  }

  const data: DefectsFile = {
    version: DEFECTS_VERSION,
    defects,
  };

  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Get the next sequential DEF-NNN ID for an increment.
 */
function nextDefectId(defects: DefectEntry[]): string {
  if (defects.length === 0) return 'DEF-001';

  const maxNum = defects.reduce((max, d) => {
    const match = d.id.match(/^DEF-(\d+)$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);

  return `DEF-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Create a new defect entry.
 *
 * Appends to defects.json with auto-assigned DEF-NNN ID.
 * Existing entries are never modified by this function.
 *
 * @returns The created defect entry with its assigned ID
 */
export function createDefect(
  incrementPath: string,
  defect: {
    acId: string;
    description: string;
    source: DefectSource;
    severity: DefectSeverity;
    taskId?: string;
    evidence?: string[];
    stepsToReproduce?: string[];
  }
): DefectEntry {
  const defects = parseDefects(incrementPath);
  const id = nextDefectId(defects);

  const entry: DefectEntry = {
    id,
    status: 'open',
    acId: defect.acId,
    taskId: defect.taskId,
    description: defect.description,
    evidence: defect.evidence || [],
    stepsToReproduce: defect.stepsToReproduce,
    source: defect.source,
    severity: defect.severity,
    reportedAt: new Date().toISOString(),
    resolvedAt: null,
    verifiedAt: null,
  };

  defects.push(entry);
  writeDefects(incrementPath, defects);

  return entry;
}

/**
 * Update a defect's status.
 *
 * Valid transitions:
 *   open -> fixed (sets resolvedAt)
 *   fixed -> verified (sets verifiedAt)
 *   open -> verified (fast-track, sets both timestamps)
 *
 * @returns The updated defect, or null if not found
 */
export function updateDefectStatus(
  incrementPath: string,
  defectId: string,
  newStatus: DefectStatus
): DefectEntry | null {
  const defects = parseDefects(incrementPath);
  const defect = defects.find(d => d.id === defectId);

  if (!defect) return null;

  const now = new Date().toISOString();

  // Validate transitions
  if (defect.status === 'verified') {
    // Already verified, no further transitions
    return defect;
  }

  if (newStatus === 'fixed' && defect.status === 'open') {
    defect.status = 'fixed';
    defect.resolvedAt = now;
  } else if (newStatus === 'verified') {
    defect.status = 'verified';
    defect.verifiedAt = now;
    if (!defect.resolvedAt) {
      defect.resolvedAt = now; // fast-track: open -> verified
    }
  }

  writeDefects(incrementPath, defects);
  return defect;
}

/**
 * Append evidence to an existing defect.
 */
export function appendEvidence(
  incrementPath: string,
  defectId: string,
  evidence: string
): DefectEntry | null {
  const defects = parseDefects(incrementPath);
  const defect = defects.find(d => d.id === defectId);

  if (!defect) return null;

  defect.evidence.push(evidence);
  writeDefects(incrementPath, defects);
  return defect;
}

/**
 * Get all open defects (status !== 'verified').
 */
export function getOpenDefects(incrementPath: string): DefectEntry[] {
  return parseDefects(incrementPath).filter(d => d.status !== 'verified');
}

/**
 * Get defects for a specific AC.
 */
export function getDefectsForAC(incrementPath: string, acId: string): DefectEntry[] {
  return parseDefects(incrementPath).filter(d => d.acId === acId);
}

/**
 * Check if all defects are verified (ready for closure).
 */
export function allDefectsVerified(incrementPath: string): boolean {
  const defects = parseDefects(incrementPath);
  if (defects.length === 0) return true;
  return defects.every(d => d.status === 'verified');
}

/**
 * Get defect summary statistics.
 */
export function getDefectSummary(incrementPath: string): {
  total: number;
  open: number;
  fixed: number;
  verified: number;
  bySeverity: Record<DefectSeverity, number>;
} {
  const defects = parseDefects(incrementPath);

  const summary = {
    total: defects.length,
    open: 0,
    fixed: 0,
    verified: 0,
    bySeverity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    } as Record<DefectSeverity, number>,
  };

  for (const d of defects) {
    summary[d.status]++;
    summary.bySeverity[d.severity]++;
  }

  return summary;
}
