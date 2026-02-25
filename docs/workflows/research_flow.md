# Research Flow

The **Research Flow** template defines a shared board progression for research-heavy tasks.

## Columns

1. Backlog (shared)
2. Ready (shared)
3. Scoping (`task_type='research'`, default role: Admin)
4. Researching (`task_type='research'`, default role: Researcher)
5. Synthesis (`task_type='research'`, default role: Writer)
6. Review (`task_type='research'`, default role: Reviewer)
7. Blocked (shared)
8. Done (shared)

## Stage constraints

- **Synthesis** includes artifact hint:
  - `evidence`: Evidence links
- **Review** includes artifact:
  - `draft`: Draft doc

## Seed source

This workflow is seeded by `prisma/seed-workflows.ts` as template name **Research Flow**.
