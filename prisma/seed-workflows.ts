import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type JsonValue = Record<string, unknown> | Array<unknown>;

type ColumnSeed = {
  name: string;
  taskType: string | null;
  ord: number;
  defaultRole: string | null;
  requiredArtifacts: JsonValue;
  requiredGates: JsonValue;
};

async function upsertTaskColumn(column: ColumnSeed): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO task_columns (name, task_type, ord, default_role, required_artifacts, required_gates)
    VALUES (
      ${column.name},
      ${column.taskType},
      ${column.ord},
      ${column.defaultRole},
      ${JSON.stringify(column.requiredArtifacts)}::jsonb,
      ${JSON.stringify(column.requiredGates)}::jsonb
    )
    ON CONFLICT (name, task_type)
    DO UPDATE SET
      ord = EXCLUDED.ord,
      default_role = EXCLUDED.default_role,
      required_artifacts = EXCLUDED.required_artifacts,
      required_gates = EXCLUDED.required_gates
    RETURNING id;
  `;

  return rows[0].id;
}

async function upsertWorkflowTemplate(params: {
  name: string;
  taskType: string;
  columnIds: string[];
  stageRules: JsonValue;
}) {
  await prisma.$executeRaw`
    INSERT INTO workflow_templates (name, task_type, column_ids, stage_rules)
    VALUES (
      ${params.name},
      ${params.taskType},
      ${params.columnIds}::uuid[],
      ${JSON.stringify(params.stageRules)}::jsonb
    )
    ON CONFLICT (name, task_type)
    DO UPDATE SET
      column_ids = EXCLUDED.column_ids,
      stage_rules = EXCLUDED.stage_rules;
  `;
}

async function main() {
  console.log('🌱 Seeding workflow columns and templates...');

  const sharedColumns: ColumnSeed[] = [
    { name: 'Backlog', taskType: null, ord: 1, defaultRole: null, requiredArtifacts: [], requiredGates: [] },
    { name: 'Ready', taskType: null, ord: 2, defaultRole: null, requiredArtifacts: [], requiredGates: [] },
    { name: 'Blocked', taskType: null, ord: 3, defaultRole: null, requiredArtifacts: [], requiredGates: [] },
    { name: 'Done', taskType: null, ord: 4, defaultRole: null, requiredArtifacts: [], requiredGates: [] },
  ];

  const devColumns: ColumnSeed[] = [
    { name: 'In Dev', taskType: 'dev', ord: 5, defaultRole: 'Developer', requiredArtifacts: [], requiredGates: [] },
    {
      name: 'In Review',
      taskType: 'dev',
      ord: 6,
      defaultRole: 'Reviewer',
      requiredArtifacts: [
        { key: 'pr', label: 'PR link', requiredForMoveToThisColumn: true },
      ],
      requiredGates: [],
    },
    {
      name: 'In Test',
      taskType: 'dev',
      ord: 7,
      defaultRole: 'Tester',
      requiredArtifacts: [],
      requiredGates: [
        { key: 'reviewApproved', label: 'Review approved', type: 'bool' },
      ],
    },
    {
      name: 'In Deploy',
      taskType: 'dev',
      ord: 8,
      defaultRole: 'Deployer',
      requiredArtifacts: [],
      requiredGates: [
        {
          key: 'testPassed',
          label: 'Test passed',
          type: 'run',
          config: { runType: 'test', requiredStatus: 'success' },
        },
      ],
    },
  ];

  const researchColumns: ColumnSeed[] = [
    { name: 'Scoping', taskType: 'research', ord: 5, defaultRole: 'Admin', requiredArtifacts: [], requiredGates: [] },
    { name: 'Researching', taskType: 'research', ord: 6, defaultRole: 'Researcher', requiredArtifacts: [], requiredGates: [] },
    {
      name: 'Synthesis',
      taskType: 'research',
      ord: 7,
      defaultRole: 'Writer',
      requiredArtifacts: [{ key: 'evidence', label: 'Evidence links' }],
      requiredGates: [],
    },
    {
      name: 'Review',
      taskType: 'research',
      ord: 8,
      defaultRole: 'Reviewer',
      requiredArtifacts: [{ key: 'draft', label: 'Draft doc' }],
      requiredGates: [],
    },
  ];

  const allColumns = [...sharedColumns, ...devColumns, ...researchColumns];
  const columnIdsByKey = new Map<string, string>();

  for (const column of allColumns) {
    const id = await upsertTaskColumn(column);
    const key = `${column.taskType ?? 'shared'}:${column.name}`;
    columnIdsByKey.set(key, id);
  }

  const devFlowColumnIds = [
    columnIdsByKey.get('shared:Backlog')!,
    columnIdsByKey.get('shared:Ready')!,
    columnIdsByKey.get('dev:In Dev')!,
    columnIdsByKey.get('dev:In Review')!,
    columnIdsByKey.get('dev:In Test')!,
    columnIdsByKey.get('dev:In Deploy')!,
    columnIdsByKey.get('shared:Blocked')!,
    columnIdsByKey.get('shared:Done')!,
  ];

  const researchFlowColumnIds = [
    columnIdsByKey.get('shared:Backlog')!,
    columnIdsByKey.get('shared:Ready')!,
    columnIdsByKey.get('research:Scoping')!,
    columnIdsByKey.get('research:Researching')!,
    columnIdsByKey.get('research:Synthesis')!,
    columnIdsByKey.get('research:Review')!,
    columnIdsByKey.get('shared:Blocked')!,
    columnIdsByKey.get('shared:Done')!,
  ];

  await upsertWorkflowTemplate({
    name: 'Dev Flow',
    taskType: 'dev',
    columnIds: devFlowColumnIds,
    stageRules: {
      linear: ['Backlog', 'Ready', 'In Dev', 'In Review', 'In Test', 'In Deploy', 'Done'],
      alwaysAvailable: ['Blocked'],
      rules: {
        'In Review': ['pr artifact required'],
        'In Test': ['reviewApproved gate required'],
        'In Deploy': ['testPassed run gate required'],
      },
    },
  });

  await upsertWorkflowTemplate({
    name: 'Research Flow',
    taskType: 'research',
    columnIds: researchFlowColumnIds,
    stageRules: {
      linear: ['Backlog', 'Ready', 'Scoping', 'Researching', 'Synthesis', 'Review', 'Done'],
      alwaysAvailable: ['Blocked'],
      rules: {
        Synthesis: ['evidence artifact recommended'],
        Review: ['draft artifact required'],
      },
    },
  });

  console.log('✅ Workflow seed complete (idempotent upserts).');
}

main()
  .catch((error) => {
    console.error('❌ Workflow seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
