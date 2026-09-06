// Auth tables (Better Auth managed)
export {
  user,
  session,
  account,
  verification,
  userRelations,
  sessionRelations,
  accountRelations,
} from "./auth";

// Business tables
export {
  workspace,
  workspaceMember,
  workspaceRelations,
  workspaceMemberRelations,
} from "./workspaces";

export {
  repository,
  repositorySync,
  repositoryRelations,
  repositorySyncRelations,
} from "./repositories";

export {
  activityLog,
  activityLogRelations,
} from "./activity";

export {
  setting,
  userApiKey,
  settingRelations,
  userApiKeyRelations,
} from "./settings";

export {
  codeChunk,
  codeChunkRelations,
} from "./code-chunks";

export {
  qaHistory,
  qaHistoryRelations,
} from "./qa-history";

export {
  prReview,
  prReviewRelations,
} from "./pr-reviews";

export {
  codeNotes,
  codeNotesRelations,
  codePages,
  codePagesRelations,
} from "./code-notes";
