'use client';

import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Check, Info } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';
import { Tooltip } from '@/components/ui/tooltip';
import { OrgDataPanel } from '@/components/org-data-panel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface TrialAnalysis {
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

interface ApiResponse {
  data: TrialAnalysis[];
  total: number;
  limit: number;
  offset: number;
}

export default function Home() {
  const [trials, setTrials] = useState<TrialAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrial, setSelectedTrial] = useState<TrialAnalysis | null>(null);
  const [selectedTrialIndex, setSelectedTrialIndex] = useState<number>(-1);
  const [copiedOrgId, setCopiedOrgId] = useState<number | null>(null);
  const [orgData, setOrgData] = useState<any>(null);
  const [orgDataLoading, setOrgDataLoading] = useState(false);
  const [orgDataCache, setOrgDataCache] = useState<Map<number, any>>(new Map());

  // Filters
  const [orgId, setOrgId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [valueMoments, setValueMoments] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchTrials = async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: ((page - 1) * limit).toString(),
    });

    if (orgId) params.append('orgId', orgId);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (valueMoments.length > 0) {
      valueMoments.forEach(vm => params.append('valueMoments', vm));
    }
    if (searchText) params.append('search', searchText);

    try {
      const response = await fetch(`/api/trials?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trials');
      }
      const data: ApiResponse = await response.json();
      setTrials(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrials();
  }, [page]);

  // Keyboard navigation for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedTrial) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevTrial();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextTrial();
      } else if (e.key === 'Escape') {
        handleCloseModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrial, selectedTrialIndex, trials]);

  const handleSearch = () => {
    setPage(1);
    fetchTrials();
  };

  const handleReset = () => {
    setOrgId('');
    setDateFrom('');
    setDateTo('');
    setValueMoments([]);
    setSearchText('');
    setPage(1);
    setTimeout(fetchTrials, 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const parseAreasOfFocus = (areasJson: string) => {
    try {
      return JSON.parse(areasJson);
    } catch {
      return null;
    }
  };

  const copyOrgId = (orgId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(orgId.toString());
    setCopiedOrgId(orgId);
    setTimeout(() => setCopiedOrgId(null), 2000);
  };

  const fetchOrgData = async (orgId: number) => {
    // Check cache first
    if (orgDataCache.has(orgId)) {
      setOrgData(orgDataCache.get(orgId));
      return;
    }

    setOrgDataLoading(true);
    setOrgData(null);

    try {
      const response = await fetch(`/api/org-data/${orgId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch org data');
      }
      const data = await response.json();
      setOrgData(data);

      // Cache the result
      setOrgDataCache(new Map(orgDataCache.set(orgId, data)));
    } catch (err) {
      console.error('Error fetching org data:', err);
      setOrgData({ error: 'Failed to load org data' });
    } finally {
      setOrgDataLoading(false);
    }
  };

  const handleTrialClick = (trial: TrialAnalysis, index: number) => {
    setSelectedTrial(trial);
    setSelectedTrialIndex(index);
    fetchOrgData(trial.ORG_ID);
  };

  const handleNextTrial = () => {
    if (selectedTrialIndex < trials.length - 1) {
      const newIndex = selectedTrialIndex + 1;
      const newTrial = trials[newIndex];
      setSelectedTrial(newTrial);
      setSelectedTrialIndex(newIndex);
      fetchOrgData(newTrial.ORG_ID);
    }
  };

  const handlePrevTrial = () => {
    if (selectedTrialIndex > 0) {
      const newIndex = selectedTrialIndex - 1;
      const newTrial = trials[newIndex];
      setSelectedTrial(newTrial);
      setSelectedTrialIndex(newIndex);
      fetchOrgData(newTrial.ORG_ID);
    }
  };

  const handleCloseModal = () => {
    setSelectedTrial(null);
    setSelectedTrialIndex(-1);
  };

  const totalPages = Math.ceil(total / limit);

  const valueMomentOptions = [
    { value: 'Infrastructure Monitoring', label: 'Infrastructure Monitoring' },
    { value: 'Logs', label: 'Logs' },
    { value: 'APM', label: 'APM' },
    { value: 'Billing', label: 'Billing' },
    { value: 'User Management', label: 'User Management' },
    { value: 'Agent Installation', label: 'Agent Installation' },
    { value: 'Integrations', label: 'Integrations' },
    { value: 'Monitors', label: 'Monitors' },
    { value: 'Billing and Subscription Management', label: 'Billing & Subscription' },
    { value: 'Organization Settings', label: 'Organization Settings' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <img
              src="/logo.png"
              alt="TrialSniffer Logo"
              className="w-16 h-16 object-contain"
            />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-datadog-purple to-datadog-purple-light bg-clip-text text-transparent">
              TrialSniffer
            </h1>
          </div>
          <p className="text-gray-600 ml-20">
            Sniff out insights from successful Datadog trial conversions
          </p>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-datadog-purple" />
            <h2 className="text-lg font-semibold text-gray-900">Search & Filter</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="searchText" className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                Search Trial Summaries
                <Tooltip content="Trial summaries are generated via LLM analysis of RUM actions for successful conversions">
                  <Info className="w-4 h-4 text-gray-400 hover:text-datadog-purple cursor-help" />
                </Tooltip>
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="searchText"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search for keywords in trial summaries..."
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="orgId" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Org ID
                </label>
                <Input
                  id="orgId"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="1300829892"
                />
              </div>
              <div>
                <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date From
                </label>
                <Input
                  type="date"
                  id="dateFrom"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              <div>
                <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date To
                </label>
                <Input
                  type="date"
                  id="dateTo"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              <div>
                <label htmlFor="valueMoment" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Value Moments
                </label>
                <MultiSelect
                  options={valueMomentOptions}
                  value={valueMoments}
                  onChange={setValueMoments}
                  placeholder="Select value moments..."
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleSearch} className="flex-1 md:flex-none md:px-8">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <Button onClick={handleReset} variant="outline">
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold">{trials.length}</span> of{' '}
                <span className="font-semibold">{total}</span> successful conversions
              </div>
            </div>
            {totalPages > 1 && (
              <div className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-datadog-purple mb-4"></div>
            <p className="text-gray-600">Loading trial data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Org ID</TableHead>
                  <TableHead className="w-[110px]">Date</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1.5">
                      Trial Summary
                      <Tooltip content="LLM-generated summaries of RUM actions for successful trial conversions">
                        <Info className="w-3.5 h-3.5 text-gray-400 hover:text-datadog-purple cursor-help" />
                      </Tooltip>
                    </div>
                  </TableHead>
                  <TableHead className="w-[180px]">Value Moment</TableHead>
                  <TableHead className="w-[100px] text-center">Confidence</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                      No results found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  trials.map((trial, index) => (
                    <TableRow
                      key={`${trial.ORG_ID}-${trial.ANALYSIS_TIMESTAMP}-${index}`}
                      className="cursor-pointer"
                      onClick={() => handleTrialClick(trial, index)}
                    >
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://supportdog.us1.prod.dog/accounts/org?detail_tab=details&org=${trial.ORG_ID}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-datadog-purple hover:text-datadog-purple-dark hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {trial.ORG_ID}
                          </a>
                          <button
                            onClick={(e) => copyOrgId(trial.ORG_ID, e)}
                            className="text-gray-400 hover:text-datadog-purple transition-colors"
                            title="Copy Org ID"
                          >
                            {copiedOrgId === trial.ORG_ID ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(trial.ANALYSIS_DATE).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-900 line-clamp-2">
                          {trial.TRIAL_SUMMARY}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700">
                          {trial.PRIMARY_VALUE_MOMENT_PRODUCT_AREA}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-50 text-datadog-purple font-semibold text-sm">
                          {(trial.CONFIDENCE_SCORE * 100).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTrialClick(trial, index);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              onClick={() => setPage(1)}
              disabled={page === 1}
              variant="outline"
              size="sm"
            >
              <ChevronsLeft className="w-4 h-4 mr-1" />
              First
            </Button>
            <Button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="px-4 py-2 text-sm text-gray-700 bg-white rounded-md border border-gray-200">
              Page {page} of {totalPages}
            </div>
            <Button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              variant="outline"
              size="sm"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              variant="outline"
              size="sm"
            >
              Last
              <ChevronsRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedTrial} onOpenChange={(open) => !open && handleCloseModal()}>
          {selectedTrial && (
            <DialogContent onClose={handleCloseModal}>
              {/* Header - spans full width */}
              <div className="p-6 pb-4 border-b border-gray-200 pr-16">
                <div className="flex items-center justify-between mb-2">
                  <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
                    Trial Analysis
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevTrial}
                      disabled={selectedTrialIndex === 0}
                      className="h-8"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-gray-500">
                      {selectedTrialIndex + 1} / {trials.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextTrial}
                      disabled={selectedTrialIndex === trials.length - 1}
                      className="h-8"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <DialogDescription>
                  Analysis Date: {new Date(selectedTrial.ANALYSIS_DATE).toLocaleDateString()} •
                  Confidence: {(selectedTrial.CONFIDENCE_SCORE * 100).toFixed(0)}%
                </DialogDescription>
              </div>

              {/* Two-column layout */}
              <div className="flex flex-1 overflow-hidden">
                {/* Left Column - Trial Summary */}
                <div className="w-2/5 p-6 overflow-y-auto">
                  <div className="space-y-6">
                    {/* Trial Summary */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Trial Summary</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {selectedTrial.TRIAL_SUMMARY}
                      </p>
                    </div>

                    {/* Primary Value Moment */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                        Primary Value Moment
                      </h4>
                      <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                        <div>
                          <Badge variant="default">{selectedTrial.PRIMARY_VALUE_MOMENT_PRODUCT_AREA}</Badge>
                        </div>
                        <p className="text-sm text-gray-700">
                          {selectedTrial.PRIMARY_VALUE_MOMENT_DESCRIPTION}
                        </p>
                        <div className="pt-2 border-t border-purple-100">
                          <p className="text-sm text-gray-600">
                            <strong>Evidence:</strong> {selectedTrial.PRIMARY_VALUE_MOMENT_SUPPORTING_EVIDENCE}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Areas of Focus */}
                    {(() => {
                      const areasOfFocus = parseAreasOfFocus(selectedTrial.AREAS_OF_FOCUS_ACTIONS);
                      return areasOfFocus ? (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            Areas of Focus & Actions
                          </h4>
                          <div className="space-y-3">
                            {Object.entries(areasOfFocus).map(([key, value]) => (
                              <div key={key} className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm font-medium text-gray-900 mb-1">{key}</p>
                                <p className="text-sm text-gray-600">{value as string}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Metadata */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="space-y-1 text-xs text-gray-500">
                        <div>
                          <span className="font-medium">Model:</span> {selectedTrial.MODEL_USED}
                        </div>
                        <div>
                          <span className="font-medium">Timestamp:</span>{' '}
                          {new Date(selectedTrial.ANALYSIS_TIMESTAMP).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vertical Divider */}
                <div className="w-px bg-gray-200 flex-shrink-0"></div>

                {/* Right Column - Org Data */}
                <div className="w-3/5 overflow-y-auto">
                  <OrgDataPanel orgData={orgData} loading={orgDataLoading} />
                </div>
              </div>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </div>
  );
}
