# Spec Template

Copy and customize this template for new increments. The file uses XML tags as
section boundaries with free-form human-readable content inside. No DTD, no
`<?xml>` declaration. Users can hand-edit by adding bullet items within any tag.

```xml
<increment>
  <id>####-feature-name</id>
  <title>Feature Title</title>
  <status>active</status>
  <priority>P0</priority>
  <type>feature</type>
  <created>YYYY-MM-DD</created>

  <problem_statement>
    [Describe the problem this feature solves. Be specific about the pain point.]
  </problem_statement>

  <goals>
    - [Primary goal with measurable target]
    - [Secondary goal with measurable target]
    - [Measurable outcome]
  </goals>

  <user_stories>

    <user_story id="US-001" project="[project-name]">
      As a [user role]
      I want [capability/action]
      So that [benefit/value]

      <acceptance_criteria>
        - [ ] AC-US1-01: Given [precondition], when [action], then [expected result]
        - [ ] AC-US1-02: [Another criterion -- BDD format, no "or" conditions]
        - [ ] AC-US1-03: [Edge case handling with measurable outcome]
      </acceptance_criteria>
    </user_story>

    <user_story id="US-002" project="[project-name]">
      As a [user role]
      I want [capability/action]
      So that [benefit/value]

      <acceptance_criteria>
        - [ ] AC-US2-01: [Criterion with concrete value]
        - [ ] AC-US2-02: [Criterion with concrete value]
      </acceptance_criteria>
    </user_story>

    <user_story id="US-003" project="[project-name]">
      As a [user role]
      I want [capability/action]
      So that [benefit/value]

      <acceptance_criteria>
        - [ ] AC-US3-01: [Criterion]
        - [ ] AC-US3-02: [Criterion]
      </acceptance_criteria>
    </user_story>

  </user_stories>

  <out_of_scope>
    - [Feature explicitly NOT included]: OUT. Architectural hook: [how to add later]
    - [Feature deferred to future increment]: OUT. Architectural hook: [design for extensibility]
    - [Technical limitation accepted for MVP]
  </out_of_scope>

  <!-- Hardening blocks (all 8 required) -->

  <error_handling>
    - If [error condition], then [specific user-visible behavior with hex color, px size, timing]
    - If [API failure], show [exact error message] in [#hex color], [Npx font], [auto-dismiss after Ns]
    - If [network error], [specific recovery behavior]
  </error_handling>

  <responsive_design>
    - Below [N]px: [specific layout change]
    - Above [N]px: [specific layout change]
    - Minimum supported viewport: [N]px
    - All touch targets at least 44x44px
  </responsive_design>

  <accessibility>
    - [Element] has aria-label "[exact label text]"
    - [Interactive element] uses role="[role]" with [aria attributes]
    - All color combinations meet WCAG 2.1 AA (4.5:1 normal text)
    - Focus indicators: [Npx] solid [#hex], [Npx] offset
    - [Modal/dialog] traps focus; Escape closes it
  </accessibility>

  <initial_states>
    - First load: [exact visual description with colors, sizes, text content]
    - Empty state: [exact message text] centered in [#hex color]
    - Loading: [specific animation description with timing]
  </initial_states>

  <security_and_compliance>
    - [Input validation rule with specific constraint]
    - [Authentication/authorization requirement]
    - [Data sanitization rule]
  </security_and_compliance>

  <performance_and_capacity>
    - p95 [operation] latency: under [N]ms
    - Maximum [resource]: [N] [unit]
    - Maximum concurrent [operations]: [N] (queued beyond that)
  </performance_and_capacity>

  <operational_constraints>
    - [Runtime/platform requirement]
    - [Infrastructure constraint]
  </operational_constraints>

  <anti_requirements>
    - Must not [security anti-pattern] (reason: [security/reliability])
    - Must not [dangerous operation] under any circumstance
    - Must not [data handling violation]
  </anti_requirements>

  <technology_stack>
    - Frontend: [framework] with [build tool], [CSS approach]
    - Backend: [runtime] with [framework]
    - Database: [engine] with [driver/ORM]
    - [Other]: [specifics]
  </technology_stack>

  <non_functional_requirements>
    - [Performance target with units, e.g., "API response time under 200ms at p95"]
    - [Scalability target, e.g., "Support 100 concurrent users"]
    - [Reliability target, e.g., "99.9% uptime"]
  </non_functional_requirements>

  <edge_cases>
    - [Boundary condition]: [expected behavior, e.g., "Empty file (0 bytes): reject with error"]
    - [Unusual input]: [expected behavior with specific sanitization rules]
    - [Race condition]: [expected behavior with specific handling]
    - [Cleanup scenario]: [expected behavior with timing]
  </edge_cases>

  <risks>
    - [Risk description] (P=[0.0-1.0], I=[1-10], mitigation: [specific strategy])
    - [Risk description] (P=[0.0-1.0], I=[1-10], mitigation: [specific strategy])
  </risks>

  <success_metrics>
    - [Metric]: [target value with units]
    - [Metric]: [target value with units]
    - [Qualitative success criteria with measurable proxy]
  </success_metrics>

  <!-- DAG: user story dependencies (omit if no dependencies) -->
  <dependencies>
    - US-002 depends on US-001 ([reason])
  </dependencies>

</increment>
```

## Guidelines

### User Story Sizing
- **Small**: 1-2 tasks, 1-2 days
- **Medium**: 3-5 tasks, 3-5 days
- **Large**: 6+ tasks -- consider splitting

### Acceptance Criteria Count
- Minimum: 2 per user story
- Maximum: 5 per user story
- If more needed, split the user story

### AC ID Format
```
AC-US{story_number}-{criterion_number}

Examples:
- AC-US1-01 (User Story 1, Criterion 1)
- AC-US2-03 (User Story 2, Criterion 3)
- AC-US10-01 (User Story 10, Criterion 1)
```

### Priority Levels
- **P0**: Critical, blocks release
- **P1**: Important, should be in release
- **P2**: Nice to have, can defer

### AC Quality Rules (MANDATORY)

**Every AC must be unambiguous and single-outcome:**

- **No "or" conditions**: "disabled or hidden" is ambiguous -- pick ONE expected behavior
  - Bad: `AC-US1-01: Button is disabled or hidden`
  - Good: `AC-US1-01: Button has the disabled attribute and shows tooltip "Not available"`
- **Measurable outcomes**: Use concrete values, not subjective descriptions
  - Bad: `AC-US1-01: Card appears visually dimmed`
  - Good: `AC-US1-01: Card text has opacity 0.7 and uses var(--text-tertiary) color`
- **BDD format preferred**: `Given [precondition], when [action], then [single expected result]`
- **One assertion per AC**: If you need to verify multiple things, split into separate ACs
- **No subjective verbs**: Avoid "looks good", "is clear", "feels responsive" -- use testable criteria

### Mandatory Hardening Blocks

Every spec.md MUST include all 8 hardening blocks as XML tags. The validator flags missing blocks as errors:

1. `<error_handling>` -- user-visible error behavior with exact messages, colors, timing
2. `<responsive_design>` -- breakpoints, layout changes, minimum viewport
3. `<accessibility>` -- ARIA labels, roles, focus management, WCAG compliance
4. `<initial_states>` -- first load, empty state, loading state with exact visuals
5. `<security_and_compliance>` -- input validation, auth, data sanitization
6. `<performance_and_capacity>` -- latency targets, resource limits, concurrency
7. `<operational_constraints>` -- runtime, platform, infrastructure requirements
8. `<anti_requirements>` -- things the system must NOT do

### Quantified Specs Rule

Hardening blocks and acceptance criteria must use **measurable values**, not vague adjectives. The validator warns on unquantified terms:

- Bad: "fast response time", "smooth animation", "small file size"
- Good: "response time under 200ms at p95", "animation at 60fps with 300ms duration", "file size under 10MB"

### Mandatory Spec Sections

Every spec.md MUST include these XML sections (QA scoring penalizes missing sections):

1. `<problem_statement>` -- why this exists
2. `<goals>` -- what success looks like (measurable)
3. `<user_stories>` -- with ACs in BDD format inside `<acceptance_criteria>` tags
4. `<out_of_scope>` -- explicit boundaries with architectural hooks
5. `<error_handling>` through `<anti_requirements>` -- all 8 hardening blocks
6. `<non_functional_requirements>` -- performance, security, accessibility, compatibility
7. `<edge_cases>` -- boundary conditions, error states, unusual scenarios
8. `<risks>` -- P x I scored with mitigations
9. `<success_metrics>` -- measurable outcomes

### Dependencies Section

If user stories have ordering dependencies, include `<dependencies>`:
- Format: `- US-NNN depends on US-NNN (reason)`
- The DAG validator checks for cycles, missing references, and self-dependencies
- Omit the section entirely if all stories are independent

#### Dependency Authoring Principles

The dependency model should be **intentionally boring** -- easy to reason about and easy to diff:

1. **Direct prerequisites only.** If US-003 depends on US-002 and US-002 depends on US-001, do NOT add `US-003 depends on US-001`. Transitive dependencies are implied by the graph. Adding them creates redundant edges that are hard to maintain and obscure the real structure.

2. **Only real technical prerequisites.** A dependency means "this story cannot start until the other is done." Do not add ordering preferences or nice-to-haves. Ask: "Would starting this story without the other being complete cause a build failure, missing API, or data integrity issue?" If no, they are independent -- leave them independent so they can run in parallel.

3. **Keep chains short.** Aim for a maximum depth of 3-4 stories in any dependency chain. Long chains create sequential bottlenecks. If you find yourself writing a chain of 5+, reconsider whether some stories can be parallelized or merged.

4. **Reason is mandatory context.** The parenthetical reason (e.g., `(file management requires upload capability)`) must explain the **technical** reason for the ordering, not just restate the dependency. Good: `(API routes need DB schema)`. Bad: `(US-002 comes after US-001)`.

5. **Review on insertion.** When a new user story is added mid-increment, review existing dependencies. The new story may need to depend on existing stories, or existing stories may need to depend on the new one. Update the `<dependencies>` section and re-validate.

6. **Diamond shapes are fine.** Two stories depending on the same prerequisite, then converging on a shared successor, is a valid and common pattern. The DAG validator handles this correctly.

#### What the DAG Validator Checks

The validator runs automatically during `sw:validate` and `sw:done` Gate 0:

| Check | Severity | What it means |
|-------|----------|---------------|
| Cycle detected | ERROR (blocking) | Two or more stories form a circular dependency -- impossible to execute |
| Missing reference | ERROR (blocking) | A dependency references a US-ID that does not exist in `<user_stories>` |
| Self-dependency | ERROR (blocking) | A story depends on itself |
| No user stories found | WARNING | The spec has a `<dependencies>` section but no `<user_stories>` -- likely a structural error |
| Disconnected nodes | INFO | Stories with no incoming or outgoing dependencies (roots and leaves) -- reported for awareness |

The validator also computes a **topological execution order** -- the deterministic sequence in which stories can be implemented respecting all dependencies. The `sw:do` skill uses this to determine which story to work on next.
