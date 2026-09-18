export interface EnvConfig {
  databaseUrl: string;
  objectStorage: {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadEnv(): EnvConfig {
  return {
    databaseUrl: required('DATABASE_URL'),
    objectStorage: {
      endpoint: required('OBJECT_STORAGE_ENDPOINT'),
      region: process.env['OBJECT_STORAGE_REGION'] ?? 'us-east-1',
      accessKeyId: required('OBJECT_STORAGE_ACCESS_KEY_ID'),
      secretAccessKey: required('OBJECT_STORAGE_SECRET_ACCESS_KEY'),
      bucket: required('OBJECT_STORAGE_BUCKET'),
    },
  };
}
