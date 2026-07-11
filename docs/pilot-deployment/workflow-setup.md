# Workflow Setup

Workflow setup should model the smallest real approval paths needed for pilot testing.

## Steps

1. Open `/workflow-templates`.
2. Confirm the seeded examples are understandable.
3. Create or update pilot workflow templates only if needed.
4. Add ordered workflow steps with department, role, due days, escalation days, and notification options.
5. Use `/workflow-assignment` or `/admin/workflow-assignments` to assign workflows to document types.
6. Test at least one workflow that completes successfully.
7. Test one returned workflow task.
8. Test one rejected workflow task.
9. Confirm `/workflow-history` records immutable history.

## Expected result

Documents no longer rely on ad hoc routing alone; pilot document types have clear workflow templates and assigned approval paths.
