/**
 * Spec Parser - Extract User Stories and Acceptance Criteria from spec.md
 *
 * Parses increment spec.md files to extract:
 * - User Story IDs (US-001, US-002, etc.)
 * - Acceptance Criteria IDs (AC-US1-01, AC-US1-02, etc.)
 * - User Story titles and metadata
 *
 * Supports XML-fenced format (primary) and legacy markdown heading format (fallback).
 *
 * Used by AC coverage validator to cross-reference tasks with requirements.
 */

import { readFileSync } from 'fs';

/**
 * User Story metadata
 */
export interface UserStory {
  /** User Story ID (e.g., "US-001") */
  id: string;

  /** User Story title */
  title: string;

  /** Priority (P0, P1, P2, P3) */
  priority?: string;

  /** Project that owns this user story */
  project?: string;

  /** Acceptance Criteria IDs for this US */
  acceptanceCriteria: string[];

  /** Full text of the user story */
  description?: string;

  /** Line number in spec.md */
  lineNumber?: number;
}

/**
 * Spec metadata
 */
export interface SpecMetadata {
  /** Increment ID */
  incrementId: string;

  /** Increment title */
  title: string;

  /** All User Stories */
  userStories: UserStory[];

  /** All AC-IDs (flattened from all user stories) */
  allACIds: string[];
}

/**
 * Parse spec.md to extract User Stories and Acceptance Criteria
 *
 * Detects format automatically: XML-fenced (<increment>) or legacy markdown (---frontmatter---).
 *
 * @param specPath - Path to spec.md file
 * @returns Spec metadata with User Stories and AC-IDs
 * @throws Error if spec.md cannot be read or is malformed
 */
export function parseSpecMd(specPath: string): SpecMetadata {
  try {
    const content = readFileSync(specPath, 'utf-8');
    const lines = content.split('\n');

    // Detect format: XML-fenced or legacy markdown
    const isXmlFormat = content.includes('<increment>');

    let incrementId: string;
    let title: string;
    let userStories: UserStory[];

    if (isXmlFormat) {
      ({ incrementId, title } = parseXmlMetadata(content));
      userStories = extractUserStoriesXml(content, lines);
    } else {
      ({ incrementId, title } = parseLegacyFrontmatter(lines));
      userStories = extractUserStoriesLegacy(lines);
    }

    // Flatten all AC-IDs
    const allACIds = userStories.flatMap(us => us.acceptanceCriteria);

    return {
      incrementId,
      title,
      userStories,
      allACIds
    };
  } catch (error) {
    throw new Error(`Failed to parse spec.md at ${specPath}: ${error}`);
  }
}

// ---------------------------------------------------------------------------
// XML-fenced format parsing (primary)
// ---------------------------------------------------------------------------

/**
 * Extract increment metadata from XML tags.
 *
 * Matches simple tag patterns like <id>0042-file-upload</id>.
 */
function parseXmlMetadata(content: string): { incrementId: string; title: string } {
  const idMatch = content.match(/<id>\s*(.+?)\s*<\/id>/);
  const titleMatch = content.match(/<title>\s*(.+?)\s*<\/title>/);

  if (!idMatch) {
    throw new Error(
      'No <id> tag found in spec.md.\n\n' +
      'XML-fenced spec.md must contain:\n' +
      '<increment>\n' +
      '  <id>0001-feature-name</id>\n' +
      '  <title>Feature Title</title>\n' +
      '  ...\n' +
      '</increment>'
    );
  }

  const incrementId = idMatch[1].trim();

  // Validate increment ID format (0001-feature-name, 0417J-name, 0111E-name)
  const incrementIdRegex = /^[0-9]{4}[EGJA]?-[a-z0-9-]+$/;
  if (!incrementIdRegex.test(incrementId)) {
    throw new Error(
      `Invalid increment ID format: "${incrementId}"\n\n` +
      'Expected format: 4-digit number + hyphen + kebab-case name\n\n' +
      'Valid examples:\n' +
      '  - 0001-feature-name\n' +
      '  - 0042-bug-fix\n' +
      '  - 0099-refactor'
    );
  }

  return {
    incrementId,
    title: titleMatch ? titleMatch[1].trim() : incrementId
  };
}

/**
 * Extract User Stories from XML-fenced format.
 *
 * Matches <user_story id="US-001" project="my-app"> blocks and extracts
 * ACs from the <acceptance_criteria> section within each story.
 */
function extractUserStoriesXml(content: string, lines: string[]): UserStory[] {
  const userStories: UserStory[] = [];

  // Match <user_story> opening tags with attributes
  const usTagRegex = /<user_story\s+id="(US-(?:[A-Za-z]{2,6}-)?\d{3,}E?)"\s*(?:project="([^"]*)")?\s*>/g;

  // AC pattern: supports both bold and non-bold AC-IDs
  // - [ ] AC-US1-01: ...  OR  - [ ] **AC-US1-01**: ...
  const acRegex = /^-\s*\[[x ]\]\s*\*{0,2}(AC-US\d+E?-\d{2})\*{0,2}/;

  // Priority pattern
  const priorityRegex = /\*\*Priority\*\*:\s*(P[0-3])/;

  let usMatch;
  while ((usMatch = usTagRegex.exec(content)) !== null) {
    const usId = usMatch[1];
    const project = usMatch[2] || undefined;
    const tagStartOffset = usMatch.index;

    // Find the line number of this tag
    const textBeforeTag = content.substring(0, tagStartOffset);
    const lineNumber = textBeforeTag.split('\n').length;

    // Find the closing </user_story> tag
    const closingTag = '</user_story>';
    const closeOffset = content.indexOf(closingTag, tagStartOffset);
    if (closeOffset === -1) continue;

    // Extract the block content between opening and closing tags
    const blockContent = content.substring(tagStartOffset, closeOffset + closingTag.length);
    const blockLines = blockContent.split('\n');

    // Extract title from the first meaningful text line (As a... / story text)
    let title = usId; // fallback
    for (const bLine of blockLines) {
      const trimmed = bLine.trim();
      if (trimmed.startsWith('As a') || trimmed.startsWith('As an')) {
        title = trimmed;
        break;
      }
    }

    // Extract ACs from this block
    const acceptanceCriteria: string[] = [];
    let priority: string | undefined;
    let inAcSection = false;

    for (const bLine of blockLines) {
      const trimmed = bLine.trim();

      // Detect AC section
      if (trimmed === '<acceptance_criteria>' || trimmed.includes('<acceptance_criteria>')) {
        inAcSection = true;
        continue;
      }
      if (trimmed === '</acceptance_criteria>' || trimmed.includes('</acceptance_criteria>')) {
        inAcSection = false;
        continue;
      }

      if (inAcSection) {
        const acMatch = trimmed.match(acRegex);
        if (acMatch) {
          acceptanceCriteria.push(acMatch[1]);
        }
      }

      // Extract priority if present
      const priMatch = bLine.match(priorityRegex);
      if (priMatch && !priority) {
        priority = priMatch[1];
      }
    }

    userStories.push({
      id: usId,
      title,
      project,
      priority,
      acceptanceCriteria,
      lineNumber
    });
  }

  return userStories;
}

// ---------------------------------------------------------------------------
// Legacy markdown heading format (fallback)
// ---------------------------------------------------------------------------

/**
 * Parse YAML frontmatter from legacy markdown format.
 *
 * Kept for backward compatibility with existing increments.
 */
function parseLegacyFrontmatter(lines: string[]): { incrementId: string; title: string } {
  let yaml: typeof import('js-yaml') | undefined;
  try {
    yaml = require('js-yaml');
  } catch {
    // js-yaml not available; fall back to regex
  }

  let inFrontmatter = false;
  const frontmatterLines: string[] = [];
  let frontmatterStart = -1;
  let frontmatterEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        frontmatterStart = i + 1;
        continue;
      } else {
        frontmatterEnd = i + 1;
        break;
      }
    }
    if (inFrontmatter) {
      frontmatterLines.push(line);
    }
  }

  if (frontmatterLines.length === 0) {
    throw new Error(
      'No frontmatter or <increment> tag found in spec.md.\n\n' +
      'Spec.md must use either XML-fenced format:\n' +
      '<increment>\n' +
      '  <id>0001-feature-name</id>\n' +
      '  ...\n' +
      '</increment>\n\n' +
      'Or legacy YAML frontmatter:\n' +
      '---\n' +
      'increment: 0001-feature-name\n' +
      '---'
    );
  }

  // Try yaml library if available, fall back to regex
  let incrementId: string | undefined;
  let title: string | undefined;

  if (yaml) {
    try {
      const parsed: any = yaml.load(frontmatterLines.join('\n'));
      if (parsed && typeof parsed === 'object') {
        incrementId = parsed.increment;
        title = parsed.title;
      }
    } catch (error: any) {
      throw new Error(
        `Malformed YAML frontmatter (lines ${frontmatterStart}-${frontmatterEnd}):\n\n` +
        `${error.message || String(error)}`
      );
    }
  } else {
    // Regex fallback when js-yaml is not available
    for (const fLine of frontmatterLines) {
      const idMatch = fLine.match(/^increment:\s*(.+)$/);
      if (idMatch) incrementId = idMatch[1].trim();
      const titleMatch = fLine.match(/^title:\s*["']?(.+?)["']?\s*$/);
      if (titleMatch) title = titleMatch[1].trim();
    }
  }

  if (!incrementId) {
    throw new Error(
      'Missing required field: increment\n\n' +
      'Add to frontmatter:\n' +
      'increment: 0001-feature-name'
    );
  }

  // Validate increment ID format
  const incrementIdRegex = /^[0-9]{4}[EGJA]?-[a-z0-9-]+$/;
  if (!incrementIdRegex.test(incrementId)) {
    throw new Error(
      `Invalid increment ID format: "${incrementId}"\n\n` +
      'Expected format: 4-digit number + hyphen + kebab-case name'
    );
  }

  return {
    incrementId,
    title: title || incrementId
  };
}

/**
 * Extract User Stories from legacy markdown heading format.
 */
function extractUserStoriesLegacy(lines: string[]): UserStory[] {
  const userStories: UserStory[] = [];
  let currentUS: UserStory | null = null;
  let inACSection = false;

  // Regex patterns
  const usHeaderRegex = /^###?\s+(US-(?:[A-Za-z]{2,6}-)?\d{3,}E?):\s*(.+)$/;
  const acRegex = /^-\s*\[[x ]\]\s*\*{0,2}(AC-US\d+E?-\d{2})\*{0,2}/;
  const priorityRegex = /\*\*Priority\*\*:\s*(P[0-3])/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Check for User Story header
    const usMatch = line.match(usHeaderRegex);
    if (usMatch) {
      if (currentUS) {
        userStories.push(currentUS);
      }

      currentUS = {
        id: usMatch[1],
        title: usMatch[2],
        acceptanceCriteria: [],
        lineNumber
      };
      inACSection = false;

      // Extract project from **Project**: field
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const projMatch = lines[j].match(/\*\*Project\*\*:\s*(.+)/);
        if (projMatch) {
          currentUS.project = projMatch[1].trim();
          break;
        }
      }

      continue;
    }

    if (!currentUS) continue;

    // Check for Acceptance Criteria section
    if (line.includes('**Acceptance Criteria**:') || line.includes('Acceptance Criteria')) {
      inACSection = true;
      continue;
    }

    // Check for end of AC section
    if (line.startsWith('##') && !line.match(usHeaderRegex)) {
      inACSection = false;
    }

    // Extract AC-IDs
    if (inACSection) {
      const acMatch = line.match(acRegex);
      if (acMatch) {
        currentUS.acceptanceCriteria.push(acMatch[1]);
      }
    }

    // Extract priority
    const priorityMatch = line.match(priorityRegex);
    if (priorityMatch && !currentUS.priority) {
      currentUS.priority = priorityMatch[1];
    }
  }

  if (currentUS) {
    userStories.push(currentUS);
  }

  return userStories;
}

/**
 * Get all User Story IDs from spec
 */
export function getAllUSIds(specPath: string): string[] {
  return parseSpecMd(specPath).userStories.map(us => us.id);
}

/**
 * Get all AC-IDs from spec
 */
export function getAllACIds(specPath: string): string[] {
  return parseSpecMd(specPath).allACIds;
}

/**
 * Get AC-IDs for a specific User Story
 */
export function getACsForUS(specPath: string, usId: string): string[] {
  const us = parseSpecMd(specPath).userStories.find(story => story.id === usId);
  return us?.acceptanceCriteria ?? [];
}

/**
 * Validate that an AC-ID belongs to the correct User Story
 *
 * @param acId - AC-ID to validate (e.g., "AC-US1-01")
 * @param usId - Expected User Story ID (e.g., "US-001")
 * @returns True if AC belongs to US, false otherwise
 */
export function validateACBelongsToUS(acId: string, usId: string): boolean {
  // Extract US number from AC-ID: AC-US1-01 → 1
  const acMatch = acId.match(/^AC-US(\d+)-\d{2}$/);
  if (!acMatch) return false;

  const acUSNumber = parseInt(acMatch[1], 10);

  // Extract US number from US-ID: US-001 → 1, US-1000 → 1000
  const usMatch = usId.match(/^US-(\d{3,})$/);
  if (!usMatch) return false;

  const usNumber = parseInt(usMatch[1], 10);

  return acUSNumber === usNumber;
}
