/** Returns low-detail CRUD health metadata without exposing raw configuration. */
export function getCrudHealthReport() {
  const memory = process.memoryUsage();
  let cloudHost = 'unavailable';
  try {
    cloudHost = new URL(
      process.env.CLOUD_URL || 'https://keledon.tuyoisaza.com',
    ).hostname;
  } catch {
    // A malformed URL is not useful diagnostic output; never echo it back.
  }
  return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(memory.rss / 1024 / 1024) + 'MB',
      external: Math.round(memory.external / 1024 / 1024) + 'MB',
    },
    env: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      CLOUD_HOST: cloudHost,
      KELEDON_LAUNCH_SECRET: process.env.KELEDON_LAUNCH_SECRET
        ? 'set'
        : 'not set',
    },
    versions: {
      cloud: process.env.npm_package_version || '0.0.92',
    },
  };
}
