'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useReactTable, getCoreRowModel, flexRender, ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { Users, Search, UserCheck, UserX, ChevronLeft, ChevronRight, RefreshCw, Shield } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { formatDate, cn } from '@/lib/utils';

interface User {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  isEmailVerified: boolean;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  INACTIVE: 'bg-slate-100 text-slate-700 border-slate-200',
  SUSPENDED: 'bg-rose-50 text-rose-800 border-rose-200',
  PENDING_VERIFICATION: 'bg-amber-50 text-amber-800 border-amber-200',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['users', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '15', ...(search ? { search } : {}) });
      const res = await apiClient.get<{ data: User[]; meta: { total: number; totalPages: number } }>(`/users?${params}`);
      return res.data;
    },
    refetchInterval: 5000, // Real-time polling every 5 seconds
    refetchOnWindowFocus: true,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) =>
      apiClient.patch(`/users/${userId}/status`, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'fullName',
      header: 'User Name & Email',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-xs font-black text-emerald-600 flex-shrink-0">
            {row.original.fullName ? row.original.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-slate-900 truncate">{row.original.fullName || 'User'}</p>
            <p className="text-[11px] text-slate-500 truncate">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ getValue }) => <span className="text-xs font-semibold text-slate-700">{getValue() as string || 'N/A'}</span>
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ getValue }) => {
        const val = String(getValue() || 'STUDENT');
        const isSuperAdmin = val === 'SUPER_ADMIN' || val === 'ADMIN';
        return (
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider',
            isSuperAdmin ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          )}>
            {val.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const statusVal = String(getValue() || 'ACTIVE');
        return (
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider',
            STATUS_COLORS[statusVal] ?? 'bg-slate-100 text-slate-700 border-slate-200'
          )}>
            {statusVal}
          </span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined Date',
      cell: ({ getValue }) => <span className="text-xs font-medium text-slate-500">{getValue() ? formatDate(getValue() as string) : 'Recent'}</span>
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          {row.original.status === 'ACTIVE' ? (
            <button
              onClick={() => toggleStatusMutation.mutate({ userId: row.original._id, status: 'SUSPENDED' })}
              className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-200 transition-all"
              title="Suspend User"
            >
              <UserX className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => toggleStatusMutation.mutate({ userId: row.original._id, status: 'ACTIVE' })}
              className="p-1.5 rounded-xl hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border border-transparent hover:border-emerald-200 transition-all"
              title="Activate User"
            >
              <UserCheck className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const userList = data?.data || [];
  const meta = data?.meta || { total: userList.length, totalPages: 1 };

  const table = useReactTable({
    data: userList,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: meta.totalPages || 1,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-black text-slate-900">User Management</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Real-time registered users list • {meta.total} total registered
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-500/20 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-all shadow-xs"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 text-emerald-600', isFetching && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters + Table Container */}
      <div className="bg-white border border-emerald-500/15 rounded-3xl p-5 shadow-sm space-y-4">
        {/* Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="users-search"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="clay-input pl-10 py-2.5 text-sm w-full"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <Users className="w-4 h-4 text-emerald-600" />
            {meta.total} Users Found
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200/80">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {columns.map((_, j) => (
                        <td key={j} className="py-3 px-4">
                          <div className="h-5 bg-slate-100 rounded-lg animate-pulse w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                : table.getRowModel().rows.length === 0
                ? (
                    <tr>
                      <td colSpan={columns.length} className="py-10 text-center text-slate-400 text-xs font-semibold">
                        No registered users found.
                      </td>
                    </tr>
                  )
                : table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-emerald-50/40 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="py-3 px-4">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500">
            Page {page} of {meta.totalPages || 1}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-emerald-50 text-slate-700 disabled:opacity-40 transition-all"
              id="users-prev-page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages || 1, p + 1))}
              disabled={page >= (meta.totalPages || 1)}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-emerald-50 text-slate-700 disabled:opacity-40 transition-all"
              id="users-next-page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
