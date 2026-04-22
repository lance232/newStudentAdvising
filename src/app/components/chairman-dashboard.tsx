import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Users, UserCog, XCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Advisor {
  id: number | string;
  name: string;
  email: string;
  advisorId: string;
  assignedYearLevel: string | null;
  assignedYearLevelId?: number | string | null;
  assignmentId?: number | string | null;
  status: 'active' | 'inactive';
}

interface YearLevelOption {
  id: string;
  label: string;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'https://localhost:53005/api';

function getApiBaseCandidates(): string[] {
  const candidates: string[] = [];

  if (API_BASE_URL) {
    candidates.push(API_BASE_URL);
  }

  if (API_BASE_URL.endsWith('/api')) {
    candidates.push(API_BASE_URL.slice(0, -4));
  } else {
    candidates.push(`${API_BASE_URL}/api`);
  }

  return Array.from(new Set(candidates.map((value) => value.replace(/\/$/, ''))));
}

async function fetchWithApiFallback(path: string, init?: RequestInit): Promise<Response> {
  const bases = getApiBaseCandidates();
  let lastResponse: Response | null = null;

  for (const base of bases) {
    const response = await fetch(`${base}${path}`, init);
    if (response.status !== 404) {
      return response;
    }

    lastResponse = response;
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw new Error('Unable to reach adviser endpoints.');
}

function toYearLevelLabel(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return null;
  }

  return raw;
}

function getYearLevelLabelFromItem(item: any, fallbackId?: string): string {
  const label =
    toYearLevelLabel(
      item?.yearLevelName
      ?? item?.name
      ?? item?.yearLevel
      ?? item?.description
      ?? item?.label
      ?? item?.displayName
      ?? item?.title
      ?? item?.code,
    ) ?? '';

  if (label) {
    return label;
  }

  if (fallbackId) {
    return `Year Level ${fallbackId}`;
  }

  return 'Year Level';
}

function getAuthToken(): string | null {
  const rawToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (!rawToken) {
    return null;
  }

  return rawToken.replace(/^Bearer\s+/i, '').trim();
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const data = payload as { message?: string; error?: string; title?: string };
  return data.message || data.error || data.title || fallback;
}

export function ChairmanDashboard() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [yearLevels, setYearLevels] = useState<YearLevelOption[]>([]);
  const [yearLevelsError, setYearLevelsError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedYearByAdvisor, setSelectedYearByAdvisor] = useState<Record<string, string>>({});
  const [savingAdvisorId, setSavingAdvisorId] = useState<string | null>(null);

  const loadAdvisors = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = getAuthToken();
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetchWithApiFallback('/Advisers', {
        headers: {
          ...headers,
        },
      });

      const payload = await response.json().catch(() => ([]));
      if (response.status === 403) {
        throw new Error('Access denied for adviser list endpoint. Backend permission for Chairman is required on GET /api/Advisers.');
      }
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Unable to fetch advisers from backend.'));
      }

      const adviserRows = Array.isArray(payload) ? payload : [];

      const yearLevelById = new Map<string, string>();
      setYearLevelsError('');

      const normalizeYearLevelRows = (rows: any[]): YearLevelOption[] => {
        return rows
          .map((item: any) => {
            const id = String(item.yearLevelId ?? item.id ?? item.value ?? '').trim();
              const label = getYearLevelLabelFromItem(item, id);

            if (id) {
                yearLevelById.set(id, label);
            }

            return {
              id,
                label,
            };
          })
          .filter((row) => row.id);
      };

      const tryLoadYearLevels = async (path: string): Promise<YearLevelOption[] | null> => {
        try {
          const response = await fetchWithApiFallback(path, {
            headers: {
              ...headers,
            },
          });

          const payload = await response.json().catch(() => ([]));
          if (!response.ok) {
            return null;
          }

          const rows = Array.isArray(payload) ? payload : [];
          return normalizeYearLevelRows(rows);
        } catch {
          return null;
        }
      };

      const fromStudentsYearLevels = await tryLoadYearLevels('/Students/year-levels');
      if (fromStudentsYearLevels && fromStudentsYearLevels.length > 0) {
        setYearLevels(fromStudentsYearLevels);
      } else {
        const fromLegacyYearLevels = await tryLoadYearLevels('/YearLevels');
        if (fromLegacyYearLevels && fromLegacyYearLevels.length > 0) {
          setYearLevels(fromLegacyYearLevels);
        } else {
          setYearLevels([]);
          setYearLevelsError('Year levels endpoint is unavailable. Please check backend /api/Students/year-levels (500).');
        }
      }

      const assignmentsByAdvisorId = new Map<string, { yearLevel: string | null; yearLevelId?: number | string | null; assignmentId?: number | string | null }>();
      try {
        const assignmentsResponse = await fetchWithApiFallback('/AdviserAssignments', {
          headers: {
            ...headers,
          },
        });

        if (assignmentsResponse.ok) {
          const assignmentsPayload = await assignmentsResponse.json().catch(() => ([]));
          const assignments = Array.isArray(assignmentsPayload) ? assignmentsPayload : [];

          assignments.forEach((item: any) => {
            const advisorRef = item.adviserId ?? item.advisorId ?? item.adviser?.id ?? item.advisor?.id;
            const yearLevelId = item.yearLevelId ?? item.yearlevelId ?? item.levelId ?? null;
            const yearFromId = yearLevelId !== null && yearLevelId !== undefined
              ? yearLevelById.get(String(yearLevelId)) ?? null
              : null;
            const yearValue =
              yearFromId
              ?? toYearLevelLabel(item.yearLevel ?? item.assignedYearLevel ?? item.year ?? item.level);
            const assignmentId = item.adviserAssignmentId ?? item.advisorAssignmentId ?? item.id;
            if (yearLevelId !== null && yearLevelId !== undefined && !yearLevelById.has(String(yearLevelId))) {
              const fallbackLabel = toYearLevelLabel(item.yearLevel ?? item.assignedYearLevel ?? item.year ?? item.level)
                ?? `Year Level ${yearLevelId}`;
              yearLevelById.set(String(yearLevelId), fallbackLabel);
            }
            if (advisorRef !== undefined && advisorRef !== null) {
              assignmentsByAdvisorId.set(String(advisorRef), { yearLevel: yearValue, yearLevelId, assignmentId });
            }
          });

          if (yearLevels.length === 0 && yearLevelById.size > 0) {
            const inferred = Array.from(yearLevelById.entries()).map(([id, label]) => ({ id, label }));
            setYearLevels(inferred);
          }
        }
      } catch {
        // Assignment endpoint failure should not block adviser listing.
      }

      const normalizedAdvisors: Advisor[] = adviserRows.map((item: any) => {
        const rowId = item.id ?? item.adviserId ?? item.advisorId ?? item.userId ?? item.username;
        const advisorCode = item.adviserId ?? item.advisorId ?? item.user?.username ?? item.username ?? rowId;
        const firstName = String(item.firstName ?? item.user?.firstName ?? '').trim();
        const lastName = String(item.lastName ?? item.user?.lastName ?? '').trim();
        const fullName = `${firstName} ${lastName}`.trim();
        const directYearLevelId = item.yearLevelId ?? item.yearlevelId ?? item.levelId ?? null;
        const directYearFromId = directYearLevelId !== null && directYearLevelId !== undefined
          ? yearLevelById.get(String(directYearLevelId)) ?? null
          : null;
        const directYearLevel =
          directYearFromId
          ?? toYearLevelLabel(item.yearLevel ?? item.assignedYearLevel ?? item.year ?? item.level);
        const assignmentMeta = assignmentsByAdvisorId.get(String(rowId))
          ?? assignmentsByAdvisorId.get(String(advisorCode))
          ?? null;
        const yearLevel = directYearLevel ?? assignmentMeta?.yearLevel ?? null;
        const yearLevelId = directYearLevelId ?? assignmentMeta?.yearLevelId ?? null;

        return {
          id: rowId,
          name: fullName || String(item.username ?? 'Unknown Adviser'),
          email: String(item.email ?? item.user?.email ?? item.username ?? 'No email provided'),
          advisorId: String(advisorCode ?? ''),
          assignedYearLevel: yearLevel,
          assignedYearLevelId: yearLevelId,
          assignmentId: assignmentMeta?.assignmentId ?? null,
          status: yearLevel ? 'active' : 'inactive',
        };
      });

      setAdvisors(normalizedAdvisors);
      const nextSelected: Record<string, string> = {};
      normalizedAdvisors.forEach((advisor) => {
        if (advisor.assignedYearLevelId !== null && advisor.assignedYearLevelId !== undefined) {
          nextSelected[String(advisor.id)] = String(advisor.assignedYearLevelId);
        }
      });
      setSelectedYearByAdvisor(nextSelected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch advisers from backend.');
      setAdvisors([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdvisors();
  }, []);

  const assignAdvisorToYearLevel = async (advisor: Advisor) => {
    const selectedYearLevelId = selectedYearByAdvisor[String(advisor.id)]
      || (advisor.assignedYearLevelId !== null && advisor.assignedYearLevelId !== undefined ? String(advisor.assignedYearLevelId) : '');
    if (!selectedYearLevelId) {
      setError('Please select a year level before assigning an adviser.');
      return;
    }

    const currentAssignedYearLevelId = advisor.assignedYearLevelId !== null && advisor.assignedYearLevelId !== undefined
      ? String(advisor.assignedYearLevelId)
      : '';
    if (advisor.assignmentId && currentAssignedYearLevelId && currentAssignedYearLevelId === selectedYearLevelId) {
      setError('This adviser is already assigned to the selected year level.');
      return;
    }

    setSavingAdvisorId(String(advisor.id));
    setError('');

    try {
      const token = getAuthToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const normalizedYearLevelId = /^\d+$/.test(selectedYearLevelId)
        ? Number(selectedYearLevelId)
        : selectedYearLevelId;

      const payload = {
        adviserId: advisor.id,
        yearLevelId: normalizedYearLevelId,
      };

      const response = advisor.assignmentId
        ? await fetchWithApiFallback(`/AdviserAssignments/${advisor.assignmentId}/reassign`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
          })
        : await fetchWithApiFallback('/AdviserAssignments', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });

      const responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(responsePayload, 'Unable to assign adviser.'));
      }

      await loadAdvisors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to assign adviser.');
    } finally {
      setSavingAdvisorId(null);
    }
  };

  const filteredAdvisors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return advisors;
    }

    return advisors.filter((advisor) => {
      return (
        advisor.name.toLowerCase().includes(query) ||
        advisor.email.toLowerCase().includes(query) ||
        advisor.advisorId.toLowerCase().includes(query)
      );
    });
  }, [advisors, searchTerm]);

  const preferredYearOrder = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  const availableYearLevels = yearLevels.length > 0
    ? yearLevels.map((y) => y.label)
    : preferredYearOrder;

  const yearLevelCounts = availableYearLevels.reduce((acc, yearLabel) => {
    acc[yearLabel] = advisors.filter((a) => a.assignedYearLevel === yearLabel).length;
    return acc;
  }, {} as Record<string, number>);

  const unassignedCount = advisors.filter((a) => !a.assignedYearLevel).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="tracking-tight">Advisor Management</h2>
          <p className="text-gray-600">Advisers shown below are loaded from backend endpoints (/api/Advisers and /api/AdviserAssignments).</p>
        </div>
        <Button
          onClick={loadAdvisors}
          variant="outline"
          className="border-green-300 text-green-800 hover:bg-green-50"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh Advisers'}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <XCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border-green-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{availableYearLevels[0] ?? '1st Year'}</p>
                <p className="text-2xl font-bold text-green-900">{yearLevelCounts[availableYearLevels[0] ?? '1st Year'] ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Advisor{(yearLevelCounts[availableYearLevels[0] ?? '1st Year'] ?? 0) !== 1 ? 's' : ''} Assigned</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{availableYearLevels[1] ?? '2nd Year'}</p>
                <p className="text-2xl font-bold text-green-900">{yearLevelCounts[availableYearLevels[1] ?? '2nd Year'] ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Advisor{(yearLevelCounts[availableYearLevels[1] ?? '2nd Year'] ?? 0) !== 1 ? 's' : ''} Assigned</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{availableYearLevels[2] ?? '3rd Year'}</p>
                <p className="text-2xl font-bold text-green-900">{yearLevelCounts[availableYearLevels[2] ?? '3rd Year'] ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Advisor{(yearLevelCounts[availableYearLevels[2] ?? '3rd Year'] ?? 0) !== 1 ? 's' : ''} Assigned</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{availableYearLevels[3] ?? '4th Year'}</p>
                <p className="text-2xl font-bold text-green-900">{yearLevelCounts[availableYearLevels[3] ?? '4th Year'] ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Advisor{(yearLevelCounts[availableYearLevels[3] ?? '4th Year'] ?? 0) !== 1 ? 's' : ''} Assigned</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Unassigned</p>
                <p className="text-2xl font-bold text-yellow-700">{unassignedCount}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting Assignment</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <UserCog className="h-6 w-6 text-yellow-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-green-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-green-900">Faculty Advisors</CardTitle>
              <CardDescription>Live adviser records from backend (Chairman-safe endpoints)</CardDescription>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-300">
              {advisors.filter(a => a.status === 'active').length} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-6">
            <Label htmlFor="search">Search Advisors</Label>
            <Input
              id="search"
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-2"
            />
          </div>

          <div className="space-y-3">
            {filteredAdvisors.map((advisor) => (
              <div 
                key={advisor.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-600 to-yellow-500 flex items-center justify-center shadow">
                      <span className="text-sm font-bold text-white">
                        {advisor.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{advisor.name}</h4>
                      <p className="text-sm text-gray-600">{advisor.email}</p>
                      <p className="text-xs text-gray-500">ID: {advisor.advisorId}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {(() => {
                      const selectedId = selectedYearByAdvisor[String(advisor.id)]
                        ?? (advisor.assignedYearLevelId !== null && advisor.assignedYearLevelId !== undefined ? String(advisor.assignedYearLevelId) : '');
                      const assignedId = advisor.assignedYearLevelId !== null && advisor.assignedYearLevelId !== undefined
                        ? String(advisor.assignedYearLevelId)
                        : '';
                      const hasExistingAssignment = Boolean(advisor.assignmentId || assignedId);
                      const isNoChange = Boolean(hasExistingAssignment && selectedId && assignedId && selectedId === assignedId);

                      return (
                        <>
                    <Select
                      value={selectedYearByAdvisor[String(advisor.id)] ?? (advisor.assignedYearLevelId !== null && advisor.assignedYearLevelId !== undefined ? String(advisor.assignedYearLevelId) : '')}
                      onValueChange={(value) =>
                        setSelectedYearByAdvisor((prev) => ({
                          ...prev,
                          [String(advisor.id)]: value,
                        }))
                      }
                    >
                      <SelectTrigger className="w-[130px] h-8">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearLevels.length === 0 ? (
                          <SelectItem value="__none" disabled>Year levels unavailable</SelectItem>
                        ) : (
                          yearLevels.map((yearLevel) => (
                            <SelectItem key={yearLevel.id} value={yearLevel.id}>{yearLevel.label}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
                      onClick={() => assignAdvisorToYearLevel(advisor)}
                      disabled={savingAdvisorId === String(advisor.id) || yearLevels.length === 0 || !selectedId || isNoChange}
                    >
                      {savingAdvisorId === String(advisor.id)
                        ? 'Saving...'
                        : hasExistingAssignment
                          ? 'Reassign'
                          : 'Assign'}
                    </Button>

                        </>
                      );
                    })()}

                    {advisor.assignedYearLevel ? (
                      <Badge className="bg-green-100 text-green-800 border-green-300 px-3 py-1">
                        {advisor.assignedYearLevel}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-600 px-3 py-1">
                        Unassigned
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isLoading && filteredAdvisors.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No advisers found from backend matching your search.</p>
            </div>
          )}

          {yearLevelsError && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {yearLevelsError}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-green-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
          <CardTitle className="text-green-900">Year Level Overview</CardTitle>
          <CardDescription>Distribution of advisors across year levels</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(availableYearLevels.length > 0 ? availableYearLevels : preferredYearOrder).slice(0, 4).map((yearLevel) => {
              const assignedAdvisors = advisors.filter(a => a.assignedYearLevel === yearLevel);
              return (
                <div key={yearLevel} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{yearLevel}</h4>
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      {assignedAdvisors.length} Advisor{assignedAdvisors.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  {assignedAdvisors.length > 0 ? (
                    <div className="space-y-2">
                      {assignedAdvisors.map((advisor) => (
                        <div key={advisor.id} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-gray-700">{advisor.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No advisor assigned yet</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
