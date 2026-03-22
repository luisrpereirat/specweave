/**
 * Tests for DAG Dependency Validator
 */
import { describe, it, expect } from 'vitest';
import {
  parseUserStoryIds,
  parseDependencies,
  validateDAG,
  formatDAGResult,
} from '../../../src/validators/dependency-dag-validator.js';

describe('dependency-dag-validator', () => {
  describe('parseUserStoryIds', () => {
    it('should parse XML user story IDs', () => {
      const content = `
<user_stories>
  <user_story id="US-001" project="my-app">content</user_story>
  <user_story id="US-002" project="my-app">content</user_story>
</user_stories>`;
      expect(parseUserStoryIds(content)).toEqual(['US-001', 'US-002']);
    });

    it('should parse compound XML user story IDs', () => {
      const content = `
<user_story id="US-FE-001" project="frontend">content</user_story>
<user_story id="US-BE-001" project="backend">content</user_story>`;
      expect(parseUserStoryIds(content)).toEqual(['US-FE-001', 'US-BE-001']);
    });

    it('should fall back to legacy markdown format', () => {
      const content = `
### US-001: Story One
### US-002: Story Two`;
      expect(parseUserStoryIds(content)).toEqual(['US-001', 'US-002']);
    });

    it('should return empty for no user stories', () => {
      expect(parseUserStoryIds('no stories here')).toEqual([]);
    });
  });

  describe('parseDependencies', () => {
    it('should parse dependency edges with reasons', () => {
      const content = `
<dependencies>
  - US-002 depends on US-001 (file management requires upload)
  - US-003 depends on US-002 (reporting needs file data)
</dependencies>`;
      const edges = parseDependencies(content);
      expect(edges).toHaveLength(2);
      expect(edges[0]).toEqual({ from: 'US-002', to: 'US-001', reason: 'file management requires upload' });
      expect(edges[1]).toEqual({ from: 'US-003', to: 'US-002', reason: 'reporting needs file data' });
    });

    it('should parse edges without reasons', () => {
      const content = `
<dependencies>
  - US-002 depends on US-001
</dependencies>`;
      const edges = parseDependencies(content);
      expect(edges).toHaveLength(1);
      expect(edges[0]).toEqual({ from: 'US-002', to: 'US-001', reason: '' });
    });

    it('should return empty for no dependencies section', () => {
      expect(parseDependencies('no deps section')).toEqual([]);
    });

    it('should return empty for empty dependencies section', () => {
      const content = `
<dependencies>
</dependencies>`;
      expect(parseDependencies(content)).toEqual([]);
    });
  });

  describe('validateDAG', () => {
    it('should pass for valid DAG with dependencies', () => {
      const content = `
<user_stories>
  <user_story id="US-001" project="app">Upload</user_story>
  <user_story id="US-002" project="app">Manage</user_story>
  <user_story id="US-003" project="app">Report</user_story>
</user_stories>
<dependencies>
  - US-002 depends on US-001 (manage requires upload)
  - US-003 depends on US-002 (report requires manage)
</dependencies>`;
      const result = validateDAG(content);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.executionOrder).toEqual(['US-001', 'US-002', 'US-003']);
      expect(result.roots).toEqual(['US-001']);
      expect(result.leafs).toEqual(['US-003']);
    });

    it('should pass for no dependencies (all independent)', () => {
      const content = `
<user_stories>
  <user_story id="US-001" project="app">A</user_story>
  <user_story id="US-002" project="app">B</user_story>
</user_stories>`;
      const result = validateDAG(content);
      expect(result.valid).toBe(true);
      expect(result.executionOrder).toEqual(['US-001', 'US-002']);
      expect(result.roots).toEqual(['US-001', 'US-002']);
      expect(result.leafs).toEqual(['US-001', 'US-002']);
    });

    it('should detect cycles', () => {
      const content = `
<user_stories>
  <user_story id="US-001" project="app">A</user_story>
  <user_story id="US-002" project="app">B</user_story>
</user_stories>
<dependencies>
  - US-001 depends on US-002 (A needs B)
  - US-002 depends on US-001 (B needs A)
</dependencies>`;
      const result = validateDAG(content);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Circular dependency'))).toBe(true);
    });

    it('should detect self-dependencies', () => {
      const content = `
<user_stories>
  <user_story id="US-001" project="app">A</user_story>
</user_stories>
<dependencies>
  - US-001 depends on US-001 (self)
</dependencies>`;
      const result = validateDAG(content);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Self-dependency'))).toBe(true);
    });

    it('should detect missing references', () => {
      const content = `
<user_stories>
  <user_story id="US-001" project="app">A</user_story>
</user_stories>
<dependencies>
  - US-002 depends on US-001 (B needs A)
</dependencies>`;
      const result = validateDAG(content);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('non-existent story: US-002'))).toBe(true);
    });

    it('should warn when no user stories found', () => {
      const result = validateDAG('empty content');
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('No user stories');
    });

    it('should handle diamond dependencies', () => {
      const content = `
<user_stories>
  <user_story id="US-001" project="app">Base</user_story>
  <user_story id="US-002" project="app">Left</user_story>
  <user_story id="US-003" project="app">Right</user_story>
  <user_story id="US-004" project="app">Join</user_story>
</user_stories>
<dependencies>
  - US-002 depends on US-001 (left needs base)
  - US-003 depends on US-001 (right needs base)
  - US-004 depends on US-002 (join needs left)
  - US-004 depends on US-003 (join needs right)
</dependencies>`;
      const result = validateDAG(content);
      expect(result.valid).toBe(true);
      expect(result.roots).toEqual(['US-001']);
      expect(result.leafs).toEqual(['US-004']);
      // US-001 must come first, US-004 must come last
      expect(result.executionOrder.indexOf('US-001')).toBeLessThan(result.executionOrder.indexOf('US-004'));
    });
  });

  describe('formatDAGResult', () => {
    it('should format passing result', () => {
      const text = formatDAGResult({
        valid: true,
        errors: [],
        warnings: [],
        executionOrder: ['US-001', 'US-002'],
        roots: ['US-001'],
        leafs: ['US-002'],
        edges: [{ from: 'US-002', to: 'US-001', reason: 'test' }],
      });
      expect(text).toContain('PASSED');
      expect(text).toContain('US-001 -> US-002');
    });

    it('should format failing result', () => {
      const text = formatDAGResult({
        valid: false,
        errors: ['Circular dependency detected involving US-001'],
        warnings: [],
        executionOrder: [],
        roots: [],
        leafs: [],
        edges: [],
      });
      expect(text).toContain('FAILED');
      expect(text).toContain('Circular dependency');
    });
  });
});
