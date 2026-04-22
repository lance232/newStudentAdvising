import { useEffect, useMemo, useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { CheckCircle2, Plus, ShieldCheck, Trash2, UserCog, Users, XCircle } from 'lucide-react';

type AdminRole = 'ADMIN' | 'CHAIRMAN' | 'ADVISER' | 'STUDENT';

interface ManagedUser {
  id: number | string;
  username: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  yearLevel?: string | null;
}

interface CreateUserPayload {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  yearLevelId?: string | null;
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

  throw new Error('Unable to reach year level endpoint.');
}

function getAuthToken(): string | null {
  const rawToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  if (!rawToken) {
    return null;
  }

  return rawToken.replace(/^Bearer\s+/i, '').trim();
}

function clearAuthToken() {
  localStorage.removeItem('auth_token');
  sessionStorage.removeItem('auth_token');
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const data = payload as { message?: string; error?: string; title?: string };
  return data.message || data.error || data.title || fallback;
}

export function AdminUserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [yearLevels, setYearLevels] = useState<YearLevelOption[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<ManagedUser | null>(null);
  const [newUser, setNewUser] = useState<CreateUserPayload>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'STUDENT',
    yearLevelId: null,
  });

  const loadYearLevels = async () => {
    try {
      const token = getAuthToken();
      const response = await fetchWithApiFallback('/Students/year-levels', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const payload = await response.json().catch(() => ([]));
      if (!response.ok) {
        return;
      }

      const rows = Array.isArray(payload) ? payload : [];
      const normalized = rows
        .map((item: any) => {
          const id = String(item.yearLevelId ?? item.id ?? item.value ?? '').trim();
          const label = String(item.yearLevelName ?? item.name ?? item.yearLevel ?? item.label ?? '').trim();
          if (!id) {
            return null;
          }

          return {
            id,
            label: label || `Year Level ${id}`,
          };
        })
        .filter((item: YearLevelOption | null): item is YearLevelOption => Boolean(item));

      setYearLevels(normalized);
      if (normalized.length > 0) {
        setNewUser((prev) => {
          if (prev.role !== 'STUDENT' || prev.yearLevelId) {
            return prev;
          }

          return {
            ...prev,
            yearLevelId: normalized[0].id,
          };
        });
      }
    } catch {
      // Keep create form available even if year-level endpoint is down.
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const payload = await response.json().catch(() => ([]));
      if (response.status === 401) {
        clearAuthToken();
        throw new Error('Unauthorized. Please sign in again using an ADMIN account.');
      }
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Unable to fetch users.'));
      }

      const parsed = Array.isArray(payload) ? payload : [];
      const normalizedUsers: ManagedUser[] = parsed.map((item: any) => ({
        id: item.id ?? item.userId ?? item.username,
        username: item.username ?? '',
        firstName: item.firstName ?? '',
        lastName: item.lastName ?? '',
        role: (item.role ?? 'STUDENT').toUpperCase(),
        yearLevel: item.yearLevel ?? null,
      }));

      setUsers(normalizedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadYearLevels();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      return (
        user.username.toLowerCase().includes(query) ||
        fullName.includes(query) ||
        user.role.toLowerCase().includes(query)
      );
    });
  }, [search, users]);

  const handleCreateUser = async () => {
    setError('');
    setSuccess('');

    if (!newUser.username || !newUser.email || !newUser.firstName || !newUser.lastName) {
      setError('Please complete all required fields.');
      return;
    }

    if (newUser.role === 'STUDENT' && !newUser.yearLevelId) {
      setError('Year level is required when creating a student account.');
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          username: newUser.username,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          yearLevelId: newUser.role === 'STUDENT' && newUser.yearLevelId
            ? Number(newUser.yearLevelId)
            : null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Failed to create user.'));
      }

      setSuccess('User created successfully.');
      setNewUser({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        role: 'STUDENT',
        yearLevelId: yearLevels[0]?.id ?? null,
      });

      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user.');
    }
  };

  const handleDeleteUser = async (id: number | string) => {
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Failed to delete user.'));
      }

      setSuccess('User deleted successfully.');
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user.');
    }
  };

  const openDeleteDialog = (user: ManagedUser) => {
    setPendingDeleteUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteUser) {
      return;
    }

    await handleDeleteUser(pendingDeleteUser.id);
    setIsDeleteDialogOpen(false);
    setPendingDeleteUser(null);
  };

  const handleRoleChange = async (id: number | string, role: AdminRole) => {
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/admin/users/${id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Failed to update role.'));
      }

      setSuccess('User role updated.');
      setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, role } : user)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role.');
    }
  };

  const roleBadgeClass = (role: AdminRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'CHAIRMAN':
        return 'bg-amber-100 text-amber-800';
      case 'ADVISER':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="tracking-tight">Admin User Management</h2>
          <p className="text-gray-600">Control who can access the system and assign authorized roles.</p>
        </div>
        <Button
          onClick={loadUsers}
          variant="outline"
          className="border-green-300 text-green-800 hover:bg-green-50"
          disabled={isLoading}
        >
          Refresh Users
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-0 shadow-md bg-gradient-to-br from-green-600 to-emerald-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Accounts</p>
                <p className="text-3xl font-bold">{users.length}</p>
              </div>
              <Users className="h-9 w-9 opacity-90" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-500 to-orange-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Authorized Staff</p>
                <p className="text-3xl font-bold">{users.filter((u) => u.role !== 'STUDENT').length}</p>
              </div>
              <ShieldCheck className="h-9 w-9 opacity-90" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md bg-gradient-to-br from-sky-600 to-blue-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Students</p>
                <p className="text-3xl font-bold">{users.filter((u) => u.role === 'STUDENT').length}</p>
              </div>
              <UserCog className="h-9 w-9 opacity-90" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-green-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
          <CardTitle className="text-green-900">Create User</CardTitle>
          <CardDescription>Create a pre-registered account using official ID and assign role before first login.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <XCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="admin-user-username">Username (ID)</Label>
              <Input
                id="admin-user-username"
                value={newUser.username}
                onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="2021001234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-user-firstname">First Name</Label>
              <Input
                id="admin-user-firstname"
                value={newUser.firstName}
                onChange={(e) => setNewUser((prev) => ({ ...prev, firstName: e.target.value }))}
                placeholder="Juan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-user-lastname">Last Name</Label>
              <Input
                id="admin-user-lastname"
                value={newUser.lastName}
                onChange={(e) => setNewUser((prev) => ({ ...prev, lastName: e.target.value }))}
                placeholder="Dela Cruz"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-user-email">Email Address</Label>
              <Input
                id="admin-user-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="juan@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: AdminRole) =>
                  setNewUser((prev) => ({
                    ...prev,
                    role: value,
                    yearLevelId: value === 'STUDENT' ? prev.yearLevelId ?? yearLevels[0]?.id ?? null : null,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="CHAIRMAN">Chairman</SelectItem>
                  <SelectItem value="ADVISER">Adviser</SelectItem>
                  <SelectItem value="STUDENT">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUser.role === 'STUDENT' && (
              <div className="space-y-2">
                <Label>Year Level</Label>
                <Select
                  value={newUser.yearLevelId ?? ''}
                  onValueChange={(value) => setNewUser((prev) => ({ ...prev, yearLevelId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={yearLevels.length === 0 ? 'No year levels available' : 'Select year level'} />
                  </SelectTrigger>
                  <SelectContent>
                    {yearLevels.length === 0 ? (
                      <SelectItem value="__none" disabled>No year levels available</SelectItem>
                    ) : (
                      yearLevels.map((item) => (
                        <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button
              onClick={handleCreateUser}
              className="bg-gradient-to-r from-green-600 to-yellow-500 hover:from-green-700 hover:to-yellow-600 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-200">
          <CardTitle className="text-green-900">User Directory</CardTitle>
          <CardDescription>Search accounts, update roles, and remove unauthorized users.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username, name, or role"
          />

          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-gray-600">
                {isLoading ? 'Loading users...' : 'No users found'}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="grid gap-3 rounded-lg border border-green-200 bg-white p-4 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-center"
                >
                  <div>
                    <p className="font-semibold text-green-900">{user.firstName} {user.lastName}</p>
                    <p className="text-sm text-gray-600">Username: {user.username}</p>
                    {user.yearLevel && <p className="text-xs text-gray-500">Year Level: {user.yearLevel}</p>}
                  </div>
                  <div>
                    <Badge className={roleBadgeClass(user.role)}>{user.role}</Badge>
                  </div>
                  <div>
                    <Select
                      value={user.role}
                      onValueChange={(value: AdminRole) => handleRoleChange(user.id, value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="CHAIRMAN">Chairman</SelectItem>
                        <SelectItem value="ADVISER">Adviser</SelectItem>
                        <SelectItem value="STUDENT">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => openDeleteDialog(user)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setPendingDeleteUser(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure you want to delete the account for{' '}
              <span className="font-semibold text-foreground">
                {pendingDeleteUser ? `${pendingDeleteUser.firstName} ${pendingDeleteUser.lastName}`.trim() || pendingDeleteUser.username : 'this user'}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirmDelete}
            >
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
