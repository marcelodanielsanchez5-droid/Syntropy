export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  years: (userId: string) => ['academic-years', userId] as const,
  subjects: (userId: string, yearId?: string) =>
    yearId ? (['subjects', userId, yearId] as const) : (['subjects', userId] as const),
  subject: (userId: string, subjectId: string) =>
    ['subject', userId, subjectId] as const,
  grading: (userId: string) => ['grading-settings', userId] as const,
  settings: (userId: string) => ['user-settings', userId] as const,
}
