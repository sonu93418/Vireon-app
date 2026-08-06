'use client';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useReactTable, getCoreRowModel, getPaginationRowModel, flexRender, ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { Users, Search, UserCheck, UserX, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { formatDate, cn } from '@/lib/utils';
import type { Metadata } from 'next';

interface User {
  _id: string; fullName: string; email: string; phone: string;
  role: string; status: string; isEmailVerified: boolean; createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'vireon-badge-green',
  INACTIVE: 'vireon-badge-warning',
  SUSPENDED: 'vireon-badge-danger',
  PENDING_VERIFICATION: 'vireon-badge-warning',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '15', ...(search ? { search } : {}) });
      const res = await apiClient.get<{ data: User[]; meta: { total: number; totalPages: number } }>(`/users?${params}`);
      return res.data;
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) =>
      apiClient.patch(`/users/${userId}/status`, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'fullName',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-vireon-accent-green/10 border border-vireon-accent-green/20 flex items-center justify-center text-xs font-bold text-vireon-success flex-shrink-0">
            {row.original.fullName.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-vireon-text-primary">{row.original.fullName}</p>
            <p className="text-xs text-vireon-text-muted">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    { accessorKey: 'phone', header: 'Phone', cell: ({ getValue }) => <span className="text-sm text-vireon-text-secondary">{getValue() as string}</span> },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ getValue }) => (
        <span className={cn('vireon-badge text-[10px]', (getValue() as string).includes('ADMIN') ? 'vireon-badge-warning' : 'vireon-badge-green')}>
          {(getValue() as string).replace('_', ' ')}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <span className={cn('vireon-badge text-[10px]', STATUS_COLORS[getValue() as string] ?? 'vireon-badge-green')}>{getValue() as string}</span>,
    },
    { accessorKey: 'createdAt', header: 'Joined', cell: ({ getValue }) => <span className="text-xs text-vireon-text-muted">{formatDate(getValue() as string)}</span> },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.status === 'ACTIVE' ? (
            <button
              onClick={() => toggleStatusMutation.mutate({ userId: row.original._id, status: 'SUSPENDED' })}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-vireon-text-muted hover:text-red-400 transition-colors"
              title="Suspend user"
            >
              <UserX className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => toggleStatusMutation.mutate({ userId: row.original._id, status: 'ACTIVE' })}
              className="p-1.5 rounded-lg hover:bg-vireon-accent-green/10 text-vireon-text-muted hover:text-vireon-success transition-colors"
              title="Activate user"
            >
              <UserCheck className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.meta.totalPages ?? 1,
  });

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-vireon-text-primary">Users</h1>
          <p className="text-sm text-vireon-text-muted mt-0.5">
            Manage user accounts • {data?.meta.total ?? 0} total
          </p>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="vireon-card p-6 space-y-4">
        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vireon-text-muted" />
            <input
              id="users-search"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="vireon-input pl-9"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto text-xs text-vireon-text-muted">
            <Users className="w-3.5 h-3.5" />
            {data?.meta.total ?? 0} users
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="vireon-table w-full">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {columns.map((_, j) => (
                        <td key={j}><div className="vireon-skeleton h-5 w-full rounded" /></td>
                      ))}
                    </tr>
                  ))
                : table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <span className="text-xs text-vireon-text-muted">
            Page {page} of {data?.meta.totalPages ?? 1}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="vireon-btn-secondary py-1.5 px-2.5 disabled:opacity-40"
              id="users-prev-page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data?.meta.totalPages ?? 1, p + 1))}
              disabled={page >= (data?.meta.totalPages ?? 1)}
              className="vireon-btn-secondary py-1.5 px-2.5 disabled:opacity-40"
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
