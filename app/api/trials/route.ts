import { NextRequest, NextResponse } from 'next/server';
import { getConnection, clearCachedConnection } from '@/lib/snowflake';

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
      FROM (
        SELECT *,
               ROW_NUMBER() OVER (PARTITION BY ORG_ID ORDER BY ANALYSIS_DATE DESC) as rn
        FROM REPORTING.GENERAL.FACT_TRIAL_ANALYSIS
        ${whereClause}
      ) subquery
      WHERE rn = 1
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

    // Get total count for pagination (deduplicated by org_id)
    const countQuery = `
      SELECT COUNT(*) as TOTAL
      FROM (
        SELECT ORG_ID,
               ROW_NUMBER() OVER (PARTITION BY ORG_ID ORDER BY ANALYSIS_DATE DESC) as rn
        FROM REPORTING.GENERAL.FACT_TRIAL_ANALYSIS
        ${whereClause}
      ) subquery
      WHERE rn = 1
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
      clearCachedConnection();
    }

    return NextResponse.json(
      { error: 'Failed to query Snowflake', details: err.message || String(err) },
      { status: 500 }
    );
  }
}
