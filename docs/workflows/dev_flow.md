# Dev Flow

The **Dev Flow** template defines a shared board progression for software delivery work.

## Columns

1. Backlog (shared)
2. Ready (shared)
3. In Dev (`task_type='dev'`, default role: Developer)
4. In Review (`task_type='dev'`, default role: Reviewer)
5. In Test (`task_type='dev'`, default role: Tester)
6. In Deploy (`task_type='dev'`, default role: Deployer)
7. Blocked (shared)
8. Done (shared)

## Stage constraints

- **In Review** requires artifact:
  - `pr`: PR link (`requiredForMoveToThisColumn=true`)
- **In Test** requires gate:
  - `reviewApproved` (boolean)
- **In Deploy** requires gate:
  - `testPassed` (run gate with `runType=test`, `requiredStatus=success`)

## Seed source

This workflow is seeded by `prisma/seed-workflows.ts` as template name **Dev Flow**.
