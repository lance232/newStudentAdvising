import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Users, UserCog, XCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface Advisor {
  id: number | string;
  name: string;
  email: string;
  advisorId: string;
  assignedYearLevel: string | null;
  status: 'active' | 'inactive';
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

function normalizeYearLevel(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return null;
  }

  const upper = raw.toUpperCase();
  if (upper === 'BSCPE-1' || upper === '1ST YEAR' || upper === '1') {
    return 'BSCPE-1';
  }
  if (upper === 'BSCPE-2' || upper === '2ND YEAR' || upper === '2') {
    return 'BSCPE-2';
  }
  if (upper === 'BSCPE-3' || upper === '3RD YEAR' || upper === '3') {
    return 'BSCPE-3';
  }
  if (upper === 'BSCPE-4' || upper === '4TH YEAR' || upper === '4') {
    return 'BSCPE-4';
  }

  return raw;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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

      const assignmentsByAdvisorId = new Map<string, string | null>();
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
            const yearValue = normalizeYearLevel(item.yearLevel ?? item.assignedYearLevel ?? item.year ?? item.level);
            if (advisorRef !== undefined && advisorRef !== null) {
              assignmentsByAdvisorId.set(String(advisorRef), yearValue);
            }
          });
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
        const directYearLevel = normalizeYearLevel(item.yearLevel ?? item.assignedYearLevel ?? item.year ?? item.level);
        const assignmentYearLevel = assignmentsByAdvisorId.get(String(rowId))
          ?? assignmentsByAdvisorId.get(String(advisorCode))
          ?? null;
        const yearLevel = directYearLevel ?? assignmentYearLevel;

        return {
          id: rowId,
          name: fullName || String(item.username ?? 'Unknown Adviser'),
          email: String(item.email ?? item.user?.email ?? item.username ?? 'No email provided'),
          advisorId: String(advisorCode ?? ''),
          assignedYearLevel: yearLevel,
          status: yearLevel ? 'active' : 'inactive',
        };
      });

      setAdvisors(normalizedAdvisors);
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

  const yearLevelCounts = {
    'BSCPE-1': advisors.filter(a => a.assignedYearLevel === 'BSCPE-1').length,
    'BSCPE-2': advisors.filter(a => a.assignedYearLevel === 'BSCPE-2').length,
    'BSCPE-3': advisors.filter(a => a.assignedYearLevel === 'BSCPE-3').length,
    'BSCPE-4': advisors.filter(a => a.assignedYearLevel === 'BSCPE-4').length,
    'Unassigned': advisors.filter(a => !a.assignedYearLevel).length,
  };

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
                <p className="text-sm text-gray-600 mb-1">BSCPE-1</p>
                <p className="text-2xl font-bold text-green-900">{yearLevelCounts['BSCPE-1']}</p>
                <p className="text-xs text-gray-500 mt-1">Advisor{yearLevelCounts['BSCPE-1'] !== 1 ? 's' : ''} Assigned</p>
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
                <p className="text-sm text-gray-600 mb-1">BSCPE-2</p>
                <p className="text-2xl font-bold text-green-900">{yearLevelCounts['BSCPE-2']}</p>
                <p className="text-xs text-gray-500 mt-1">Advisor{yearLevelCounts['BSCPE-2'] !== 1 ? 's' : ''} Assigned</p>
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
                <p className="text-sm text-gray-600 mb-1">BSCPE-3</p>
                <p className="text-2xl font-bold text-green-900">{yearLevelCounts['BSCPE-3']}</p>
                <p className="text-xs text-gray-500 mt-1">Advisor{yearLevelCounts['BSCPE-3'] !== 1 ? 's' : ''} Assigned</p>
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
                <p className="text-sm text-gray-600 mb-1">BSCPE-4</p>
                <p className="text-2xl font-bold text-green-900">{yearLevelCounts['BSCPE-4']}</p>
                <p className="text-xs text-gray-500 mt-1">Advisor{yearLevelCounts['BSCPE-4'] !== 1 ? 's' : ''} Assigned</p>
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
                <p className="text-2xl font-bold text-yellow-700">{yearLevelCounts['Unassigned']}</p>
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
        </CardContent>
      </Card>

      <Card className="border-green-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
          <CardTitle className="text-green-900">Year Level Overview</CardTitle>
          <CardDescription>Distribution of advisors across year levels</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['BSCPE-1', 'BSCPE-2', 'BSCPE-3', 'BSCPE-4'].map((yearLevel) => {
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
