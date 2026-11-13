export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  years: (userId: string) => ['academic-years', userId] as const,
  subjects: (userId: string, yearId?: string) =>
    yearId ? (['subjects', userId, yearId] as const) : (['subjects', userId] as const),
  subject: (userId: string, subjectId: string) =>
    ['subject', userId, subjectId] as const,
  grading: (userId: string) => ['grading-settings', userId] as const,
  settings: (userId: string) => ['user-settings', userId] as const,
  reminders: (userId: string) => ['reminders', userId] as const,

  // Tareas, exámenes y sesiones se consultan por grupo de asignaturas (las del
  // año activo o una sola). El prefijo `all…` invalida todos los grupos a la vez.
  allTasks: (userId: string) => ['tasks', userId] as const,
  tasks: (userId: string, subjectIds: string[]) =>
    ['tasks', userId, subjectIds.join(',')] as const,
  allExams: (userId: string) => ['exams', userId] as const,
  exams: (userId: string, subjectIds: string[]) =>
    ['exams', userId, subjectIds.join(',')] as const,
  allStudySessions: (userId: string) => ['study-sessions', userId] as const,
  allSchedule: (userId: string) => ['schedule', userId] as const,
  schedule: (userId: string, yearId: string) => ['schedule', userId, yearId] as const,
  allNodes: (userId: string) => ['nodes', userId] as const,
  nodes: (userId: string, subjectIds: string[]) => ['nodes', userId, subjectIds.join(',')] as const,
  nodeLinks: (userId: string) => ['node-links', userId] as const,
  allSources: (userId: string) => ['sources', userId] as const,
  nodeSources: (userId: string, nodeId: string) => ['sources', userId, 'node', nodeId] as const,
  allAssessments: (userId: string) => ['assessments', userId] as const,
  assessments: (userId: string, subjectIds: string[]) =>
    ['assessments', userId, subjectIds.join(',')] as const,
  studySessions: (userId: string, examIds: string[]) =>
    ['study-sessions', userId, examIds.join(',')] as const,
}
