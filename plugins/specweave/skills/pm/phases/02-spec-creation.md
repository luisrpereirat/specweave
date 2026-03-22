# PM Phase 2: Spec Creation

## Spec File Location

```
.specweave/increments/####-name/spec.md
```

## Spec Structure

The spec uses XML tags as section boundaries with free-form content inside.
No DTD, no `<?xml>` declaration. Users can hand-edit by adding bullets within
any tag block.

```xml
<increment>
  <id>####-feature-name</id>
  <title>Feature Title</title>
  <status>active</status>
  <priority>P0</priority>
  <type>feature</type>
  <created>YYYY-MM-DD</created>

  <problem_statement>
    [Why does this feature exist? What problem does it solve?]
  </problem_statement>

  <goals>
    - [Goal 1 with measurable target]
    - [Goal 2 with measurable target]
  </goals>

  <user_stories>

    <user_story id="US-001" project="[project-name]">
      As a [role]
      I want [capability]
      So that [benefit]

      <acceptance_criteria>
        - [ ] AC-US1-01: Given [precondition], when [action], then [single expected result]
        - [ ] AC-US1-02: [Another criterion -- BDD format, no "or" conditions]
      </acceptance_criteria>
    </user_story>

    <user_story id="US-002" project="[project-name]">
      ...
    </user_story>

  </user_stories>

  <out_of_scope>
    - [What this feature does NOT include]: OUT. Architectural hook: [extensibility note]
  </out_of_scope>

  <!-- All 8 hardening blocks required -->
  <error_handling>
    - If [error condition], then [user-visible behavior with hex color, px, timing]
  </error_handling>

  <responsive_design>
    - Below [N]px: [layout change]. Above [N]px: [layout change]
  </responsive_design>

  <accessibility>
    - [Element] has aria-label "[label]". Focus indicators: [Npx] solid [#hex]
  </accessibility>

  <initial_states>
    - First load: [exact visual with colors and text]
  </initial_states>

  <security_and_compliance>
    - [Input validation, auth, sanitization rules]
  </security_and_compliance>

  <performance_and_capacity>
    - p95 [operation] latency: under [N]ms. Max [resource]: [N]
  </performance_and_capacity>

  <operational_constraints>
    - [Runtime, platform, infrastructure requirements]
  </operational_constraints>

  <anti_requirements>
    - Must not [security anti-pattern] (reason)
  </anti_requirements>

  <technology_stack>
    - Frontend: [framework]. Backend: [runtime]. Database: [engine]
  </technology_stack>

  <non_functional_requirements>
    - [Performance target with units]
    - [Security considerations]
  </non_functional_requirements>

  <edge_cases>
    - [Boundary condition]: [Expected behavior]
  </edge_cases>

  <risks>
    - [Risk] (P=[0.0-1.0], I=[1-10], mitigation: [strategy])
  </risks>

  <success_metrics>
    - [Metric]: [target value with units]
  </success_metrics>

  <dependencies>
    - US-002 depends on US-001 ([reason])
  </dependencies>

</increment>
```

## Dependency Inference

After writing all user stories, analyze their relationships to populate `<dependencies>`:

1. **Identify data flow.** If Story B consumes an API, schema, or data artifact that Story A produces, then `US-B depends on US-A`.
2. **Identify shared infrastructure.** If Story B requires a component, service, or database table that Story A creates, declare the dependency.
3. **Skip transitive edges.** If A -> B -> C, do not add A -> C. The graph implies it.
4. **Default to independent.** If two stories share no technical prerequisite, leave them independent. Independent stories can execute in parallel, which is faster.
5. **Validate mentally.** For each dependency, ask: "Could a developer start Story B with Story A incomplete and still make meaningful progress?" If yes, the dependency is not real -- remove it.

If all stories are independent, omit the `<dependencies>` section entirely.

## Chunking Large Specs

**If spec has 6+ user stories, CHUNK IT:**

### Chunk 1: Metadata + US-001 to US-003
```
Write <increment> metadata, <problem_statement>, <goals>, and first 3 user stories.
Stop and report progress.
```

### Chunk 2: US-004 to US-006 + hardening blocks
```
Edit spec.md to append remaining user stories and all 8 hardening blocks.
Report completion.
```

## Multi-Project Story Assignment

Every user story MUST have a `project` attribute on the `<user_story>` tag -- no exceptions.

1. **Decompose by repo ownership**: Each user story targets ONE repo via `project="..."`
2. **Cross-cutting features**: Split into separate stories per repo (e.g., frontend UI + backend API)
3. **Use prefixed IDs**: When multiple repos are involved, use `US-FE-001`, `US-BE-001`
4. **Shared/infra work**: Set `project` to the workspace name
5. **Single-project workspaces**: All stories get `project="<workspace.name>"`

**Example split for "user login" (multi-repo):**
- `<user_story id="US-FE-001" project="frontend">` -- Login Page
- `<user_story id="US-BE-001" project="backend">` -- Auth API Endpoint
- `<user_story id="US-BE-002" project="backend">` -- JWT Token Service

## User Story Guidelines

### Good User Story
- **Specific**: Clear, testable outcome
- **Independent**: Can be implemented alone
- **Valuable**: Delivers user value
- **Estimable**: Can estimate effort
- **Small**: Fits in one increment

### Acceptance Criteria Format

```
- [ ] AC-US1-01: Given [precondition], when [action], then [result]
```

- **ALWAYS use BDD format** (Given/When/Then) -- not optional
- **No "or" conditions** -- each AC must have a single, unambiguous expected outcome
  - Bad: "button is disabled or hidden" -- pick ONE
  - Good: "button has the disabled attribute"
- **Measurable outcomes** -- use concrete values, not subjective descriptions
  - Bad: "appears visually dimmed"
  - Good: "text has opacity 0.7"
- **One assertion per AC** -- if verifying multiple things, split into separate ACs
- Include edge cases
- 2-5 criteria per user story

### Quantified Specs

All hardening blocks and ACs must use measurable values:
- Bad: "fast", "smooth", "small", "nice", "subtle"
- Good: "under 200ms", "300ms ease-in-out", "under 10MB", "4.5:1 contrast", "2px solid"

## Output After Spec Creation

```markdown
spec.md created

**Summary**:
- User Stories: [N]
- Acceptance Criteria: [N]
- Hardening Blocks: 8/8
- Priority: [P0/P1/P2]

**Next**: Ready to invoke Architect for plan.md?
```

## Token Budget: 400-600 tokens per chunk
