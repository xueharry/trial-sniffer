import { NextRequest, NextResponse } from 'next/server';
import snowflake from 'snowflake-sdk';

// Type definition for trial data
export interface TrialAnalysis {
  ORG_ID: number;
  ANALYSIS_DATE: string;
  ANALYSIS_TIMESTAMP: string;
  TRIAL_SUMMARY: string;
  AREAS_OF_FOCUS_ACTIONS: string;
  PRIMARY_VALUE_MOMENT_PRODUCT_AREA: string;
  PRIMARY_VALUE_MOMENT_DESCRIPTION: string;
  PRIMARY_VALUE_MOMENT_SUPPORTING_EVIDENCE: string;
  CONFIDENCE_SCORE: number;
  MODEL_USED: string;
  DAG_RUN_ID: string;
}

// Cache the Snowflake connection to avoid re-authentication
let cachedConnection: any = null;

async function getConnection() {
  if (cachedConnection && cachedConnection.isUp()) {
    return cachedConnection;
  }

  // Create new connection if none exists or connection is down
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.get('limit') || '20';
  const offset = searchParams.get('offset') || '0';
  const orgId = searchParams.get('orgId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const valueMoments = searchParams.getAll('valueMoments');
  const searchText = searchParams.get('search');

  try {
    // Get cached connection (or create new one if needed)
    const connection = await getConnection();

    // Build WHERE clause based on filters
    let whereClause = '';
    const conditions: string[] = [];

    if (orgId) {
      conditions.push(`ORG_ID = ${orgId}`);
    }
    if (dateFrom) {
      conditions.push(`ANALYSIS_DATE >= '${dateFrom}'`);
    }
    if (dateTo) {
      conditions.push(`ANALYSIS_DATE <= '${dateTo}'`);
    }
    if (valueMoments.length > 0) {
      const valueMomentsStr = valueMoments.map(vm => `'${vm}'`).join(', ');
      conditions.push(`PRIMARY_VALUE_MOMENT_PRODUCT_AREA IN (${valueMomentsStr})`);
    }
    if (searchText) {
      // Use ILIKE for case-insensitive search in Snowflake
      const escapedSearch = searchText.replace(/'/g, "''");
      conditions.push(`TRIAL_SUMMARY ILIKE '%${escapedSearch}%'`);
    }

    if (conditions.length > 0) {
      whereClause = ` WHERE ${conditions.join(' AND ')}`;
    }

    const query = `
      SELECT *
      FROM REPORTING.GENERAL.FACT_TRIAL_ANALYSIS
      ${whereClause}
      ORDER BY ANALYSIS_DATE DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Execute main query
    const rows = await new Promise<any[]>((resolve, reject) => {
      connection.execute({
        sqlText: query,
        complete: (err, stmt, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        },
      });
    });

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as TOTAL
      FROM REPORTING.GENERAL.FACT_TRIAL_ANALYSIS
      ${whereClause}
    `;

    const countRows = await new Promise<any[]>((resolve, reject) => {
      connection.execute({
        sqlText: countQuery,
        complete: (err, stmt, countRows) => {
          if (err) {
            reject(err);
          } else {
            resolve(countRows || []);
          }
        },
      });
    });

    const total = countRows[0]?.TOTAL || 0;

    return NextResponse.json({
      data: rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

  } catch (err: any) {
    console.error('Snowflake error:', err);

    // If authentication fails, clear the cached connection
    if (err.code === '390144' || err.message?.includes('authentication')) {
      cachedConnection = null;
    }

    return NextResponse.json(
      { error: 'Failed to query Snowflake', details: err.message || String(err) },
      { status: 500 }
    );
  }
}
