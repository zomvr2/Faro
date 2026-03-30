export type AppwriteEnv = {
  endpoint: string;
  projectId: string;
  databaseId: string;
  reportsCollectionId: string;
  reportsBucketId: string;
};

export function getAppwriteEnv(): AppwriteEnv {
  const requiredAppwriteEnv = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
    reportsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REPORTS_COLLECTION_ID,
    reportsBucketId: process.env.EXPO_PUBLIC_APPWRITE_REPORTS_BUCKET_ID,
  };

  const missing = Object.entries(requiredAppwriteEnv)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing Appwrite env vars: ${missing.join(", ")}. Set EXPO_PUBLIC_APPWRITE_* values in your .env file.`
    );
  }

  return requiredAppwriteEnv as AppwriteEnv;
}
