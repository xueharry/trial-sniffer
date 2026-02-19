import { NextRequest, NextResponse } from 'next/server';
import { getConnection, executeQuery, clearCachedConnection } from '@/lib/snowflake';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  try {
    const connection = await getConnection();

    // Execute all queries in parallel for better performance
    const [
      orgInfo,
      conversionTime,
      arrData,
      billableUsage,
      infraHosts,
      cloudHosts,
      dashboards,
      monitors,
      integrations,
      pageviews,
      activeUsers,
    ] = await Promise.allSettled([
      // Org Info
      executeQuery(connection, `
        SELECT o.id as org_id, o.name as org_name, o.public_id as org_public_id,
               o.datacenter, o.created_timestamp as org_created_date,
               sa.name as salesforce_account_name, sa.id as salesforce_account_id,
               sa.sales_segment, sa.billing_country, sa.type as account_type, sa.industry,
               csm_user.name as customer_success_manager, csm_user.email as csm_email,
               owner_user.name as account_owner, owner_user.email as account_owner_email,
               se_user.name as sales_engineer, se_user.email as sales_engineer_email
        FROM reporting.general.dim_org o
        LEFT JOIN reporting.general.dim_salesforce_account sa ON sa.org_id = o.id
        LEFT JOIN reporting.general.dim_salesforce_user csm_user
          ON sa.customer_success_rep_salesforce_user_id = csm_user.id_case_sensitive
        LEFT JOIN reporting.general.dim_salesforce_user owner_user
          ON sa.owner_salesforce_user_id = owner_user.id_case_sensitive
        LEFT JOIN reporting.general.dim_salesforce_user se_user
          ON sa.account_sales_engineer = se_user.id_case_sensitive
        WHERE o.id = ${orgId}
      `),

      // Conversion Time
      executeQuery(connection, `
        SELECT ORG_ID, start_timestamp
        FROM general.fact_org_billing_plan_history
        WHERE billing_plan IN ('pro', 'enterprise')
          AND ORG_ID = ${orgId}
        ORDER BY start_timestamp ASC
        LIMIT 1
      `),

      // ARR Data
      executeQuery(connection, `
        SELECT revenue_month,
               ROUND(total_arr, 0) as total_arr,
               ROUND(committed_arr, 0) as committed_arr,
               ROUND(usage_arr, 0) as usage_arr,
               ROUND(on_demand_arr, 0) as on_demand_arr,
               ROUND(total_mrr, 0) as total_mrr,
               is_first_usage_month, is_most_recent_month
        FROM reporting.billing.fact_usage_and_committed_revenue_monthly
        WHERE "ORG_ID" = ${orgId}
          AND is_most_recent_month = TRUE
      `),

      // Billable Usage
      executeQuery(connection, `
        SELECT ORG_ID, BILLING_DIMENSION,
               TO_DATE(TO_TIMESTAMP_LTZ(FIRST_BILLABLE_USAGE_HOUR)) AS FIRST_BILLABLE_USAGE_HOUR,
               TO_DATE(TO_TIMESTAMP_LTZ(LAST_BILLABLE_USAGE_HOUR)) AS LAST_BILLABLE_USAGE_HOUR,
               ORG_USAGE, USAGE_UNIT, AGGREGATION_FUNCTION, IS_PRODUCT_BILLABLE
        FROM REPORTING.GENERAL.FACT_ORG_BILLABLE_USAGE_MONTHLY
        WHERE IS_MOST_RECENT_MONTH = TRUE
          AND ORG_ID = ${orgId}
        ORDER BY BILLING_DIMENSION ASC
      `),

      // Infra Hosts
      executeQuery(connection, `
        SELECT max_by(agent_host_count, usage_hour) as agent_host_count
        FROM general.fact_org_infra_usage_hourly_view
        WHERE agent_host_count > 0
          AND "ORG_ID" = ${orgId}
      `),

      // Cloud Provider Hosts
      executeQuery(connection, `
        SELECT max_by(aws_host_count, usage_hour) as aws_host_count,
               max_by(azure_host_count, usage_hour) as azure_host_count,
               max_by(gcp_host_count, usage_hour) as gcp_host_count,
               max_by(oci_host_count, usage_hour) as oci_host_count
        FROM general.fact_org_infra_usage_hourly_view
        WHERE "ORG_ID" = ${orgId}
      `),

      // Dashboards
      executeQuery(connection, `
        SELECT id, title, created_at
        FROM general.dim_dashboard
        WHERE widget_count > 0
          AND title NOT ILIKE '%(cloned)%'
          AND "ORG_ID" = ${orgId}
        ORDER BY created_at DESC
      `),

      // Monitors
      executeQuery(connection, `
        SELECT DISTINCT id, name, HAS_NOTIFICATION_HANDLE, created_timestamp
        FROM REPORTING.GENERAL.DIM_MONITOR,
             LATERAL FLATTEN(input => monitor_tags) AS tag_values
        WHERE monitor_tags::STRING NOT LIKE '%"tag_key":"monitor_pack"%'
          AND "ORG_ID" = ${orgId}
        ORDER BY created_timestamp DESC
      `),

      // Integrations
      executeQuery(connection, `
        SELECT DISTINCT integration_name
        FROM general.DIM_ORG_ENABLED_DATADOG_INTEGRATION e
        JOIN general.DIM_DATADOG_INTEGRATION i ON i.integration_id = e.integration_id
        WHERE e."ORG_ID" = ${orgId}
        ORDER BY integration_name
      `),

      // Pageviews by Directory - Top 10
      executeQuery(connection, `
        SELECT "PAGE_DIRECTORY_LEVEL1",
               COUNT(DISTINCT "PAGEVIEW_ID") AS pageview_count
        FROM REPORTING.GENERAL.FACT_APP_PAGEVIEW_HISTORY
        WHERE "ORG_ID" = ${orgId}
          AND "PAGE_DIRECTORY_LEVEL1" IS NOT NULL
        GROUP BY "PAGE_DIRECTORY_LEVEL1"
        ORDER BY pageview_count DESC
        LIMIT 10
      `),

      // Most Active Users
      executeQuery(connection, `
        SELECT "Datadog User"."ID" AS user_id,
               "Datadog User"."NAME" AS user_name,
               "Datadog User"."EMAIL" AS user_email,
               COUNT(DISTINCT "FACT_APP_PAGEVIEW_HISTORY"."PAGEVIEW_ID") AS pageview_count,
               COUNT(DISTINCT "FACT_APP_PAGEVIEW_HISTORY"."SESSION_ID") AS session_count,
               SUM("FACT_APP_PAGEVIEW_HISTORY"."INTERACTIONS_COUNT") AS interactions,
               SUM("FACT_APP_PAGEVIEW_HISTORY"."TIME_SPENT_ON_PAGE_SECONDS") AS time_spent_seconds
        FROM REPORTING.GENERAL.FACT_APP_PAGEVIEW_HISTORY
        LEFT JOIN REPORTING.GENERAL.DIM_DATADOG_USER AS "Datadog User"
          ON "FACT_APP_PAGEVIEW_HISTORY"."DATADOG_USER_ID" = "Datadog User"."ID"
          AND "FACT_APP_PAGEVIEW_HISTORY"."ORG_ID" = "Datadog User"."ORG_ID"
        WHERE "FACT_APP_PAGEVIEW_HISTORY"."ORG_ID" = ${orgId}
        GROUP BY "Datadog User"."ID", "Datadog User"."NAME", "Datadog User"."EMAIL"
        ORDER BY pageview_count DESC
        LIMIT 10
      `),
    ]);

    // Helper to extract data or error
    const getData = (result: PromiseSettledResult<any[]>) => {
      if (result.status === 'fulfilled') {
        return { data: result.value, error: null };
      } else {
        return { data: null, error: result.reason?.message || 'Query failed' };
      }
    };

    return NextResponse.json({
      orgInfo: getData(orgInfo),
      conversionTime: getData(conversionTime),
      arrData: getData(arrData),
      billableUsage: getData(billableUsage),
      infraHosts: getData(infraHosts),
      cloudHosts: getData(cloudHosts),
      dashboards: getData(dashboards),
      monitors: getData(monitors),
      integrations: getData(integrations),
      pageviews: getData(pageviews),
      activeUsers: getData(activeUsers),
    });

  } catch (err: any) {
    console.error('Org data fetch error:', err);

    if (err.code === '390144' || err.message?.includes('authentication')) {
      clearCachedConnection();
    }

    return NextResponse.json(
      { error: 'Failed to fetch org data', details: err.message || String(err) },
      { status: 500 }
    );
  }
}
