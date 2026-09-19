export interface EnvConfig {
  databaseUrl: string;
  objectStorage: {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
  };
  redis: {
    url: string;
  };
}

// Bekannte Platzhalterwerte aus docker-compose.yml/.env.example. Wenn diese in
// Produktion landen, ist JWT-Fälschung möglich – siehe Issue #29.
const KNOWN_DEFAULT_JWT_SECRETS = new Set([
  'local-dev-secret-change-me',
  'change-me-to-a-long-random-string',
]);

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requiredSecret(name: string, knownDefaults: Set<string>): string {
  const value = required(name);
  if (process.env['NODE_ENV'] === 'production' && knownDefaults.has(value)) {
    throw new Error(`Environment variable ${name} still has an insecure default value. Set a strong secret before running in production.`);
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
    auth: {
      jwtSecret: requiredSecret('JWT_SECRET', KNOWN_DEFAULT_JWT_SECRETS),
      jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '8h',
    },
    // Geteilter Rate-Limit-Zähler über mehrere App-Instanzen hinweg (Issue #41).
    redis: {
      url: required('REDIS_URL'),
    },
  };
}
