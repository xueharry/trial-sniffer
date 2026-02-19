import snowflake from 'snowflake-sdk';

// Shared connection cache across all API routes
let cachedConnection: any = null;

export async function getConnection() {
  if (cachedConnection && cachedConnection.isUp()) {
    return cachedConnection;
  }

  const connection = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT!,
    username: process.env.SNOWFLAKE_USER!,
    authenticator: 'EXTERNALBROWSER',
    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE || 'REPORTING',
    schema: 'GENERAL',
  });

  await new Promise<void>((resolve, reject) => {
    connection.connectAsync((err, conn) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });

  cachedConnection = connection;
  return connection;
}

export async function executeQuery(connection: any, query: string) {
  return new Promise<any[]>((resolve, reject) => {
    connection.execute({
      sqlText: query,
      complete: (err: any, stmt: any, rows: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      },
    });
  });
}

export function clearCachedConnection() {
  cachedConnection = null;
}
