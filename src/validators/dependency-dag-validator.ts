/**
 * DAG Dependency Validator
 *
 * Parses `<dependencies>` section from spec.md and validates the user-story
 * dependency graph:
 *   - All referenced US-IDs exist in `<user_stories>`
 *   - No self-dependencies
 *   - No cycles (DFS-based)
 *   - Computes topological execution order
 *
 * Pattern reused from:
 *   - src/core/auto/plan-approval.ts (cycle detection)
 *   - src/core/auto/increment-planner.ts (topological sort)
 *
 * @module dependency-dag-validator
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Types
// ============================================================================

export interface DependencyEdge {
  from: string;  // dependent US-ID
  to: string;    // dependency US-ID
  reason: string;
}

export interface DAGValidationResult {
  valid: boolean;
  errors: string[];        // blocking: cycles, missing refs, self-deps
  warnings: string[];      // non-blocking: orphan stories, empty deps
  executionOrder: string[]; // topologically sorted US-IDs
  roots: string[];          // US-IDs with no incoming deps
  leafs: string[];          // US-IDs with no outgoing deps
  edges: DependencyEdge[];  // parsed dependency edges
}

// ============================================================================
// Parsing
// ============================================================================

/**
 * Parse user story IDs from spec.md content.
 * Supports XML-fenced format: `<user_story id="US-001" ...>`
 * Falls back to legacy markdown: `### US-001:`
 */
export function parseUserStoryIds(content: string): string[] {
  const ids: string[] = [];

  // XML format
  const xmlPattern = /<user_story\s+id="(US-(?:[A-Za-z]+-)*\d+)"/g;
  let match;
  while ((match = xmlPattern.exec(content)) !== null) {
    ids.push(match[1]);
  }
  if (ids.length > 0) return ids;

  // Legacy markdown format
  const mdPattern = /###\s+(US-(?:[A-Z]+-)*\d+):/g;
  while ((match = mdPattern.exec(content)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

/**
 * Parse `<dependencies>` section from spec.md content.
 * Format: `- US-002 depends on US-001 (reason text)`
 */
export function parseDependencies(content: string): DependencyEdge[] {
  const edges: DependencyEdge[] = [];

  // Extract <dependencies> block
  const depsMatch = content.match(/<dependencies>([\s\S]*?)<\/dependencies>/);
  if (!depsMatch) return edges;

  const depsContent = depsMatch[1];
  const linePattern = /^\s*-\s+(US-(?:[A-Za-z]+-)*\d+)\s+depends\s+on\s+(US-(?:[A-Za-z]+-)*\d+)(?:\s*\(([^)]*)\))?/gm;

  let match;
  while ((match = linePattern.exec(depsContent)) !== null) {
    edges.push({
      from: match[1],
      to: match[2],
      reason: match[3]?.trim() || '',
    });
  }

  return edges;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate the dependency DAG for a spec.md file.
 *
 * Checks:
 * 1. All referenced US-IDs exist in user_stories
 * 2. No self-dependencies
 * 3. No cycles
 * 4. Computes topological execution order
 *
 * @param content - spec.md file content
 * @returns DAG validation result
 */
export function validateDAG(content: string): DAGValidationResult {
  const result: DAGValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    executionOrder: [],
    roots: [],
    leafs: [],
    edges: [],
  };

  const userStoryIds = parseUserStoryIds(content);
  const edges = parseDependencies(content);
  result.edges = edges;

  if (userStoryIds.length === 0) {
    result.warnings.push('No user stories found in spec.md');
    return result;
  }

  if (edges.length === 0) {
    // No dependencies -- all stories are independent roots
    result.executionOrder = [...userStoryIds];
    result.roots = [...userStoryIds];
    result.leafs = [...userStoryIds];
    return result;
  }

  const knownIds = new Set(userStoryIds);

  // 1. Check for missing references
  for (const edge of edges) {
    if (!knownIds.has(edge.from)) {
      result.valid = false;
      result.errors.push(
        `Dependency references non-existent story: ${edge.from} (in "${edge.from} depends on ${edge.to}")`
      );
    }
    if (!knownIds.has(edge.to)) {
      result.valid = false;
      result.errors.push(
        `Dependency references non-existent story: ${edge.to} (in "${edge.from} depends on ${edge.to}")`
      );
    }
  }

  // 2. Check for self-dependencies
  for (const edge of edges) {
    if (edge.from === edge.to) {
      result.valid = false;
      result.errors.push(`Self-dependency detected: ${edge.from} depends on itself`);
    }
  }

  // 3. Cycle detection + topological sort (DFS)
  // Build adjacency list: for each story, list its dependencies (outgoing edges point to deps)
  const dependsOn = new Map<string, string[]>();
  const dependedBy = new Map<string, string[]>();

  for (const id of userStoryIds) {
    dependsOn.set(id, []);
    dependedBy.set(id, []);
  }

  for (const edge of edges) {
    if (knownIds.has(edge.from) && knownIds.has(edge.to) && edge.from !== edge.to) {
      dependsOn.get(edge.from)!.push(edge.to);
      dependedBy.get(edge.to)!.push(edge.from);
    }
  }

  // DFS topological sort with cycle detection
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sorted: string[] = [];
  let hasCycle = false;

  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      hasCycle = true;
      result.valid = false;
      result.errors.push(`Circular dependency detected involving ${id}`);
      return;
    }

    visiting.add(id);

    for (const dep of dependsOn.get(id) || []) {
      visit(dep);
      if (hasCycle) return;
    }

    visiting.delete(id);
    visited.add(id);
    sorted.push(id);
  }

  for (const id of userStoryIds) {
    if (!visited.has(id)) {
      visit(id);
      if (hasCycle) break;
    }
  }

  if (!hasCycle) {
    // sorted is in reverse topological order (dependencies first)
    result.executionOrder = sorted;
  }

  // 4. Identify roots (no incoming deps) and leafs (no outgoing deps)
  for (const id of userStoryIds) {
    const incoming = dependedBy.get(id) || [];
    const outgoing = dependsOn.get(id) || [];

    if (outgoing.length === 0) {
      result.roots.push(id);  // no prerequisites -> can start first
    }
    if (incoming.length === 0) {
      result.leafs.push(id);  // nothing depends on this -> finishes last
    }
  }

  return result;
}

// ============================================================================
// File-based entry point
// ============================================================================

/**
 * Validate DAG for an increment by reading its spec.md.
 *
 * @param incrementPath - Path to increment directory
 * @returns DAG validation result
 */
export function validateIncrementDAG(incrementPath: string): DAGValidationResult {
  const specPath = join(incrementPath, 'spec.md');

  if (!existsSync(specPath)) {
    return {
      valid: false,
      errors: [`spec.md not found: ${specPath}`],
      warnings: [],
      executionOrder: [],
      roots: [],
      leafs: [],
      edges: [],
    };
  }

  const content = readFileSync(specPath, 'utf-8');
  return validateDAG(content);
}

/**
 * Format DAG validation result as human-readable text.
 */
export function formatDAGResult(result: DAGValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('DAG Validation: PASSED');
    if (result.edges.length === 0) {
      lines.push('  No dependencies declared (all stories independent)');
    } else {
      lines.push(`  ${result.edges.length} dependency edge(s) validated`);
      lines.push(`  Execution order: ${result.executionOrder.join(' -> ')}`);
      lines.push(`  Roots (start first): ${result.roots.join(', ')}`);
      lines.push(`  Leafs (finish last): ${result.leafs.join(', ')}`);
    }
  } else {
    lines.push('DAG Validation: FAILED');
    for (const error of result.errors) {
      lines.push(`  ERROR: ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      lines.push(`  WARNING: ${warning}`);
    }
  }

  return lines.join('\n');
}
