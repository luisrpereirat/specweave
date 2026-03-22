# PM Phase 3: Validation

## Validation Checklist

Before marking increment ready, verify:

### 1. XML Structure
- [ ] `<increment>` root tag present
- [ ] `<id>`, `<title>`, `<status>`, `<priority>`, `<type>`, `<created>` metadata tags present
- [ ] `<user_stories>` section with `<user_story>` children
- [ ] Each `<user_story>` has `id` and `project` attributes
- [ ] Each `<user_story>` contains `<acceptance_criteria>` block

### 2. Spec Quality
- [ ] All user stories have acceptance criteria in BDD format
- [ ] AC IDs follow format: AC-US{N}-{NN}
- [ ] Problem statement is clear and specific
- [ ] Success metrics defined with measurable targets
- [ ] No vague adjectives in hardening blocks (no "fast", "smooth", "nice")

### 3. Hardening Blocks (all 8 required)
- [ ] `<error_handling>` -- user-visible error behavior with colors, sizes, timing
- [ ] `<responsive_design>` -- breakpoints in px, layout changes
- [ ] `<accessibility>` -- ARIA labels, roles, WCAG compliance levels
- [ ] `<initial_states>` -- first load, empty, loading with exact visuals
- [ ] `<security_and_compliance>` -- validation, auth, sanitization
- [ ] `<performance_and_capacity>` -- latency targets, resource limits
- [ ] `<operational_constraints>` -- runtime, platform requirements
- [ ] `<anti_requirements>` -- things the system must NOT do

### 4. File Structure
- [ ] `spec.md` in increment root
- [ ] `plan.md` in increment root (if architecture done)
- [ ] `tasks.md` in increment root (if planning done)
- [ ] `metadata.json` exists with correct status

### 5. Metadata Check

```json
{
  "increment": "0001-feature-name",
  "status": "active",
  "priority": "P0",
  "type": "feature",
  "created": "2026-01-06"
}
```

### 6. Cross-Reference Check
- [ ] User stories reference correct project via `project` attribute
- [ ] Tasks link to user stories (T-001 satisfies AC-US1-01)
- [ ] Acceptance criteria are traceable
- [ ] `<dependencies>` section (if present) has no cycles or missing references

## Common Issues

### Missing AC IDs
```
Bad:
- [ ] User can log in

Good:
- [ ] AC-US1-01: Given valid credentials, when user submits login form, then redirect to dashboard
```

### Missing Hardening Block
```
Bad: spec.md has 6 of 8 hardening blocks (missing <accessibility> and <anti_requirements>)

Good: All 8 hardening blocks present with quantified values
```

### Vague Specs
```
Bad:
<error_handling>
  - Show a nice error message when things go wrong
</error_handling>

Good:
<error_handling>
  - If API returns 500, show inline banner with #FFF3E0 background and
    #E65100 text: "Something went wrong. Please try again." with "Retry"
    button. Auto-dismiss after 5 seconds.
</error_handling>
```

### Orphan Files
```
Bad:
.specweave/increments/0001-auth/PM-REPORT.md

Good:
.specweave/increments/0001-auth/reports/PM-REPORT.md
```

### Status Mismatch
```
Bad:
metadata.json says "completed" but tasks.md has unchecked tasks

Good:
All tasks [x] completed -> status can be "completed"
```

## Validation Report Format

```markdown
## Increment Validation Report

**Increment**: 0001-feature-name
**Status**: VALID / ISSUES FOUND

### Checks
| Check | Status | Notes |
|-------|--------|-------|
| XML structure | pass | Valid <increment> with all metadata |
| Spec quality | pass | 5 US, 18 ACs, BDD format |
| Hardening blocks | pass | 8/8 present, all quantified |
| File structure | pass | All files correct |
| Metadata | pass | Status matches |
| Cross-references | pass | All linked |
| Dependencies DAG | pass | No cycles, valid execution order |

### Issues (if any)
- [Issue 1]
- [Issue 2]

### Recommendation
[Ready for implementation / Needs fixes]
```

## Token Budget: 200-400 tokens
