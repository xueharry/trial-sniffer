import { Copy } from 'lucide-react';
import { SkeletonSection, SkeletonTable } from './skeleton-loader';

interface OrgDataPanelProps {
  orgData: any;
  loading: boolean;
}

export function OrgDataPanel({ orgData, loading }: OrgDataPanelProps) {
  if (!orgData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-500">No data loaded</p>
      </div>
    );
  }

  if (orgData.error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600">
          <p className="font-medium">Error loading organization data</p>
          <p className="text-sm">{orgData.error}</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (!value) return '0';
    return new Intl.NumberFormat('en-US').format(value);
  };

  const orgInfo = orgData.orgInfo?.data?.[0];
  const conversionData = orgData.conversionTime?.data?.[0];
  const arr = orgData.arrData?.data?.[0];
  const infraHosts = orgData.infraHosts?.data?.[0];
  const cloudHosts = orgData.cloudHosts?.data?.[0];
  const dashboards = orgData.dashboards?.data || [];
  const monitors = orgData.monitors?.data || [];
  const integrations = orgData.integrations?.data || [];
  const activeUsers = orgData.activeUsers?.data || [];
  const billableUsage = orgData.billableUsage?.data || [];
  const pageviews = orgData.pageviews?.data || [];

  const calculateDaysToConversion = () => {
    if (!orgInfo?.ORG_CREATED_DATE || !conversionData?.START_TIMESTAMP) return null;
    const created = new Date(orgInfo.ORG_CREATED_DATE);
    const converted = new Date(conversionData.START_TIMESTAMP);
    const days = Math.floor((converted.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysToConversion = calculateDaysToConversion();

  return (
    <div className="p-6 space-y-4 bg-gray-50 min-h-full">
      {/* Account Overview Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        {/* Org Information */}
        <Section title="Organization Information" error={orgData.orgInfo?.error} loading={orgData.orgInfo?.loading}>
          {orgInfo ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center py-1 flex-wrap">
                <span className="text-gray-600 mr-2">Name:</span>
                <span className="font-medium text-gray-900 mr-1">{orgInfo.ORG_NAME || 'N/A'}</span>
                <span className="text-gray-600 mr-1">(</span>
                <a
                  href={`https://supportdog.us1.prod.dog/accounts/org?detail_tab=details&org=${orgInfo.ORG_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-datadog-purple hover:text-datadog-purple-dark hover:underline mr-1"
                >
                  {orgInfo.ORG_ID}
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(orgInfo.ORG_ID.toString());
                  }}
                  className="text-gray-400 hover:text-datadog-purple transition-colors mr-1"
                  title="Copy Org ID"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <span className="text-gray-600 mr-2">)</span>
                {orgInfo.DATACENTER && (
                  <span className="inline-block px-2 py-0.5 text-xs bg-purple-50 text-datadog-purple rounded border border-purple-200">
                    {orgInfo.DATACENTER}
                  </span>
                )}
              </div>
              <DataRow
                label="Trial Started"
                value={orgInfo.ORG_CREATED_DATE ? new Date(orgInfo.ORG_CREATED_DATE).toLocaleDateString() : 'N/A'}
              />
              {conversionData && (
                <>
                  <div className="flex py-1">
                    <span className="text-gray-600 mr-2">Converted At:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(conversionData.START_TIMESTAMP).toLocaleDateString()}
                    </span>
                    {daysToConversion !== null && (
                      <span className={`ml-2 ${daysToConversion <= 7 ? 'text-green-600 font-medium' : daysToConversion <= 14 ? 'text-blue-600' : 'text-gray-600'}`}>
                        ({daysToConversion} days)
                      </span>
                    )}
                  </div>
                </>
              )}
              {arr && (
                <>
                  <div className="pt-2 mt-2 border-t border-gray-200"></div>
                  <DataRow
                    label="Total ARR"
                    value={formatCurrency(arr.TOTAL_ARR)}
                    valueClassName="font-semibold text-datadog-purple"
                  />
                  <DataRow label="Committed ARR" value={formatCurrency(arr.COMMITTED_ARR)} />
                  <DataRow label="Usage ARR" value={formatCurrency(arr.USAGE_ARR)} />
                  <DataRow label="On-Demand ARR" value={formatCurrency(arr.ON_DEMAND_ARR)} />
                  <DataRow label="Monthly MRR" value={formatCurrency(arr.TOTAL_MRR)} />
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No organization data</p>
          )}
        </Section>
      </div>

      {/* Usage Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Hosts and Billable Usage - Two Column */}
        <div className="grid grid-cols-2 gap-4">
          {/* Hosts */}
          <Section title="Hosts" error={orgData.infraHosts?.error || orgData.cloudHosts?.error} loading={orgData.infraHosts?.loading || orgData.cloudHosts?.loading}>
            <div className="text-sm space-y-1">
              <div className="flex py-1">
                <span className="text-gray-600 mr-2">Infra:</span>
                <span className="font-medium text-gray-900">{formatNumber(infraHosts?.AGENT_HOST_COUNT)}</span>
              </div>
              {cloudHosts && (
                <>
                  <div className="flex py-1">
                    <span className="text-gray-600 mr-2">AWS:</span>
                    <span className="font-medium text-gray-900">{formatNumber(cloudHosts.AWS_HOST_COUNT)}</span>
                  </div>
                  <div className="flex py-1">
                    <span className="text-gray-600 mr-2">Azure:</span>
                    <span className="font-medium text-gray-900">{formatNumber(cloudHosts.AZURE_HOST_COUNT)}</span>
                  </div>
                  <div className="flex py-1">
                    <span className="text-gray-600 mr-2">GCP:</span>
                    <span className="font-medium text-gray-900">{formatNumber(cloudHosts.GCP_HOST_COUNT)}</span>
                  </div>
                  <div className="flex py-1">
                    <span className="text-gray-600 mr-2">OCI:</span>
                    <span className="font-medium text-gray-900">{formatNumber(cloudHosts.OCI_HOST_COUNT)}</span>
                  </div>
                </>
              )}
            </div>
          </Section>

          {/* Billable Usage */}
          <Section title="Billable Product Usage" error={orgData.billableUsage?.error} loading={orgData.billableUsage?.loading} skeletonType="table">
            {billableUsage.length > 0 ? (
              <div className="max-h-60 overflow-y-auto space-y-1">
                {billableUsage.map((item: any, idx: number) => (
                  <div key={idx} className="flex text-sm py-1 border-b border-gray-100">
                    <span className="text-gray-600 mr-2">{item.BILLING_DIMENSION}:</span>
                    <span className="font-medium text-gray-900 font-mono">
                      {formatNumber(item.ORG_USAGE)} {item.USAGE_UNIT}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No billable usage data</p>
            )}
          </Section>
        </div>
      </div>

      {/* Dashboards & Monitors Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Dashboards and Monitors - Two Column */}
        <div className="grid grid-cols-2 gap-4">
          {/* Dashboards */}
          <Section
            title={`Dashboards Created (${dashboards.length})`}
            error={orgData.dashboards?.error}
            loading={orgData.dashboards?.loading}
            skeletonType="table"
          >
            {dashboards.length > 0 ? (
              <div className="max-h-60 overflow-y-auto">
                {dashboards.map((dashboard: any) => (
                  <div key={dashboard.ID} className="flex justify-between items-start text-sm py-2 border-b border-gray-100">
                    <p className="font-medium text-gray-900 flex-1 mr-4">{dashboard.TITLE}</p>
                    <p className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(dashboard.CREATED_AT).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No dashboards created</p>
            )}
          </Section>

          {/* Monitors */}
          <Section
            title={`Monitors Created (${monitors.length})`}
            error={orgData.monitors?.error}
            loading={orgData.monitors?.loading}
            skeletonType="table"
          >
            {monitors.length > 0 ? (
              <div className="max-h-60 overflow-y-auto">
                {monitors.map((monitor: any) => (
                  <div key={monitor.ID} className="flex justify-between items-start text-sm py-2 border-b border-gray-100">
                    <p className="font-medium text-gray-900 flex-1 mr-4">{monitor.NAME}</p>
                    <p className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(monitor.CREATED_TIMESTAMP).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No monitors created</p>
            )}
          </Section>
        </div>
      </div>

      {/* Integrations Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Integrations */}
        <Section
          title={`Integrations Enabled (${integrations.length})`}
          error={orgData.integrations?.error}
          loading={orgData.integrations?.loading}
        >
        {integrations.length > 0 ? (
          <div className="max-h-60 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {integrations.map((integration: any, idx: number) => (
                <span
                  key={idx}
                  className="inline-block px-2 py-1 text-xs bg-purple-50 text-datadog-purple rounded border border-purple-200"
                >
                  {integration.INTEGRATION_NAME}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No integrations enabled</p>
        )}
        </Section>
      </div>

      {/* Top Pages Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <Section
          title={`Top Pages (by Pageviews)`}
          error={orgData.pageviews?.error}
          loading={orgData.pageviews?.loading}
          skeletonType="table"
        >
          {pageviews.length > 0 ? (
            <div className="space-y-1">
              {pageviews.map((page: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-100">
                  <span className="text-gray-700">{page.PAGE_DIRECTORY_LEVEL1}</span>
                  <span className="font-medium text-gray-900">
                    {formatNumber(page.PAGEVIEW_COUNT)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No pageview data</p>
          )}
        </Section>
      </div>

      {/* Most Active Users Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Most Active Users */}
        <Section
          title={`Most Active Users (Top ${activeUsers.length})`}
          error={orgData.activeUsers?.error}
          loading={orgData.activeUsers?.loading}
          skeletonType="table"
        >
        {activeUsers.length > 0 ? (
          <div className="max-h-60 overflow-y-auto space-y-2">
            {activeUsers.map((user: any, idx: number) => (
              <div key={idx} className="text-sm border-b border-gray-100 pb-2">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{user.USER_NAME || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{user.USER_EMAIL}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-gray-700">{formatNumber(user.PAGEVIEW_COUNT)} pageviews</p>
                    <p className="text-gray-500">{formatNumber(user.SESSION_COUNT)} sessions</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No active users data</p>
        )}
      </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  error,
  loading,
  skeletonType = 'section'
}: {
  title: string;
  children: React.ReactNode;
  error?: string | null;
  loading?: boolean;
  skeletonType?: 'section' | 'table';
}) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      {loading ? (
        skeletonType === 'table' ? <SkeletonTable /> : <SkeletonSection />
      ) : error ? (
        <p className="text-sm text-red-600">Error: {error}</p>
      ) : (
        children
      )}
    </div>
  );
}

function DataRow({
  label,
  value,
  valueClassName = ''
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="flex py-1">
      <span className="text-gray-600 mr-2">{label}:</span>
      <span className={`font-medium text-gray-900 ${valueClassName}`}>{value}</span>
    </div>
  );
}
