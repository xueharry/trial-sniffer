import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getConnection } from '@/lib/snowflake';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters } = body;

    // Build WHERE clause from filters
    let whereClause = '';
    const conditions: string[] = [];

    if (filters.orgId) {
      conditions.push(`ORG_ID = ${filters.orgId}`);
    }
    if (filters.dateFrom) {
      conditions.push(`ANALYSIS_DATE >= '${filters.dateFrom}'`);
    }
    if (filters.dateTo) {
      conditions.push(`ANALYSIS_DATE <= '${filters.dateTo}'`);
    }
    if (filters.valueMoments?.length > 0) {
      const valueMomentsStr = filters.valueMoments.map((vm: string) => `'${vm}'`).join(', ');
      conditions.push(`PRIMARY_VALUE_MOMENT_PRODUCT_AREA IN (${valueMomentsStr})`);
    }
    if (filters.searchText) {
      const escapedSearch = filters.searchText.replace(/'/g, "''");
      conditions.push(`TRIAL_SUMMARY ILIKE '%${escapedSearch}%'`);
    }

    if (conditions.length > 0) {
      whereClause = ` WHERE ${conditions.join(' AND ')}`;
    }

    // Get most recent 50 trials matching filters (deduplicated by org_id)
    const connection = await getConnection();

    const query = `
      SELECT ORG_ID, TRIAL_SUMMARY, PRIMARY_VALUE_MOMENT_PRODUCT_AREA, ANALYSIS_DATE
      FROM (
        SELECT *,
               ROW_NUMBER() OVER (PARTITION BY ORG_ID ORDER BY ANALYSIS_DATE DESC) as rn
        FROM REPORTING.GENERAL.FACT_TRIAL_ANALYSIS
        ${whereClause}
      ) subquery
      WHERE rn = 1
      ORDER BY ANALYSIS_DATE DESC
      LIMIT 50
    `;

    const rows = await new Promise<any[]>((resolve, reject) => {
      connection.execute({
        sqlText: query,
        complete: (err, stmt, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        },
      });
    });

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No trials found matching filters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prepare context for Claude
    const trialContext = rows.map((row) =>
      `Org ${row.ORG_ID} (${row.PRIMARY_VALUE_MOMENT_PRODUCT_AREA}):\n${row.TRIAL_SUMMARY}`
    ).join('\n\n');

    const dateRange = rows.length > 0
      ? `${new Date(rows[rows.length - 1].ANALYSIS_DATE).toLocaleDateString()} - ${new Date(rows[0].ANALYSIS_DATE).toLocaleDateString()}`
      : 'N/A';

    // Build filter context for prompt
    const filterContext: string[] = [];
    if (filters.orgId) filterContext.push(`Org ID: ${filters.orgId}`);
    if (filters.dateFrom) filterContext.push(`Date from: ${filters.dateFrom}`);
    if (filters.dateTo) filterContext.push(`Date to: ${filters.dateTo}`);
    if (filters.valueMoments?.length > 0) filterContext.push(`Value moments: ${filters.valueMoments.join(', ')}`);
    if (filters.searchText) filterContext.push(`Search keywords: "${filters.searchText}"`);

    const filterSummary = filterContext.length > 0
      ? `\n\n**Applied Filters:**\n${filterContext.map(f => `- ${f}`).join('\n')}\n`
      : '';

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send metadata first
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'metadata',
            trialCount: rows.length,
            dateRange: dateRange,
          })}\n\n`));

          // Stream Claude's response
          const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
          const messageStream = await anthropic.messages.stream({
            model: model,
            max_tokens: 4096,
            messages: [{
              role: 'user',
              content: `Analyze these ${rows.length} trial conversion summaries and provide a concise analysis (1500 words or fewer).
${filterSummary}
## 1. Common Patterns Across Successful Conversions
Identify recurring themes, behaviors, and value moments.

## 2. Most Frequent Value Moments
What product areas are driving the most conversions?

## 3. Notable Outliers or Unique Behavior
Highlight any trials with interesting or unusual patterns.

## 4. Strategic Recommendations for Product/Roadmap
Based on the patterns above, provide actionable insights:
- **High Impact Opportunities**: What features or workflows should be prioritized?
- **Segments to Optimize For**: Which customer segments or use cases show the strongest conversion signals?
- **Emerging Patterns to Monitor**: What trends are beginning to appear that warrant attention?

Here are the trial summaries:

${trialContext}

Your audience is product managers weighing roadmap decisions. Be concise but insightful - focus on the most impactful findings and actionable recommendations backed by the data.

When referencing specific trials, use their Datadog org_id (e.g., "Org 12345" rather than "Trial 3").`
            }],
          });

          for await (const chunk of messageStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'content',
                text: chunk.delta.text,
              })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        } catch (error: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: error.message || 'Failed to generate summary',
          })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Meta-summary error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to generate summary' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
