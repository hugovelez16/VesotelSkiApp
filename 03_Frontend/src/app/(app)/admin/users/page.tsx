"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, updateUserStatus } from "@/lib/api/users";
import api from "@/lib/api";
import { User, Token } from "@/lib/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { UserCreateWorkLogDialog } from "@/components/work-log/user-dialog";
import { UserDialog } from "@/components/admin/user-dialog";
import { UserEditDialog } from "@/components/admin/user-edit-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, FileText, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { FilterBar, FilterConfig } from "@/components/ui/filter-bar";

export default function AdminUsersPage() {
    const router = useRouter();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Filtering State
    const [filters, setFilters] = useState<Record<string, any>>({});

    const { data: users = [], isLoading } = useQuery({
        queryFn: getUsers,
        queryKey: ["users"],
    });

    const toggleStatusMutation = useMutation({
        mutationFn: ({ userId, isActive }: { userId: string, isActive: boolean }) =>
            updateUserStatus(userId, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast({ title: "Status updated" });
        },
        onError: () => toast({ title: "Failed", variant: "destructive" })
    });

    // Handle Simulate Login
    const handleSimulateUser = async (userId: string) => {
        // ... (existing logic)
        try {
            const response = await fetch('/api/auth/impersonate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });

            if (response.ok) {
                // Force reload to update session
                window.location.href = '/dashboard';
            } else {
                toast({ title: "Impersonation failed", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error simulating user", variant: "destructive" });
        }
    };

    // Sorting State
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    // Filter & Sort Logic
    const filteredUsers = useMemo(() => {
        let result = [...users];

        // 1. Text Search (Global)
        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(u =>
                u.first_name?.toLowerCase().includes(q) ||
                u.last_name?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q)
            );
        }

        // 2. Role Filter
        if (filters.role && filters.role.length > 0) {
            result = result.filter(u => filters.role.includes(u.role));
        }

        // 3. Status Filter (Active)
        if (filters.status && filters.status.length > 0) {
            result = result.filter(u => {
                const status = u.is_active ? "active" : "inactive";
                return filters.status.includes(status);
            });
        }

        // 4. Worker Status
        if (filters.is_active_worker === true) {
            result = result.filter(u => u.is_active_worker);
        }

        // 5. Sorting
        if (sortConfig) {
            result.sort((a, b) => {
                const aVal = a[sortConfig.key as keyof User];
                const bVal = b[sortConfig.key as keyof User];

                // Handle null/undefined (move to bottom or top?)
                // Default: empty strings if null
                const aValue = aVal ?? "";
                const bValue = bVal ?? "";

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [users, filters, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current && current.key === key) {
                if (current.direction === 'asc') return { key, direction: 'desc' };
                return null; // Toggle off or cycle? Usually Asc -> Desc -> Null
            }
            return { key, direction: 'asc' };
        });
    };

    const filterConfig: FilterConfig[] = [
        {
            id: "role",
            label: "Role",
            type: "select",
            options: [
                { label: "Admin", value: "admin" },
                { label: "User", value: "user" },
                { label: "Manager", value: "manager" },
            ]
        },
        {
            id: "status",
            label: "Status",
            type: "select",
            options: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
            ]
        },
        {
            id: "is_active_worker",
            label: "Active Worker Only",
            type: "boolean"
        },
        {
            id: "groupBy",
            label: "Group By",
            type: "select",
            options: [
                { label: "None", value: "none" },
                { label: "Role", value: "role" },
            ]
        }
    ];

    if (isLoading) {
        return <div className="p-8">Loading users...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                </div>
                <UserDialog />
            </div>

            <FilterBar config={filterConfig} onFilterChange={setFilters} />

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-900 hover:bg-slate-900 border-none">
                            <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50 rounded-tl-md" onClick={() => handleSort('first_name')}>
                                <div className="flex items-center gap-1">
                                    Name
                                    {sortConfig?.key === 'first_name' ? (
                                        sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                    ) : <ArrowUpDown className="h-4 w-4 text-slate-50/50" />}
                                </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50" onClick={() => handleSort('email')}>
                                <div className="flex items-center gap-1">
                                    Email
                                    {sortConfig?.key === 'email' ? (
                                        sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                    ) : <ArrowUpDown className="h-4 w-4 text-slate-50/50" />}
                                </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50" onClick={() => handleSort('role')}>
                                <div className="flex items-center gap-1">
                                    Role
                                    {sortConfig?.key === 'role' ? (
                                        sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                    ) : <ArrowUpDown className="h-4 w-4 text-slate-50/50" />}
                                </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50" onClick={() => handleSort('is_active_worker')}>
                                <div className="flex items-center gap-1">
                                    Worker?
                                    {sortConfig?.key === 'is_active_worker' ? (
                                        sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                    ) : <ArrowUpDown className="h-4 w-4 text-slate-50/50" />}
                                </div>
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50 rounded-tr-md" onClick={() => handleSort('is_active')}>
                                <div className="flex items-center gap-1">
                                    Status
                                    {sortConfig?.key === 'is_active' ? (
                                        sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                    ) : <ArrowUpDown className="h-4 w-4 text-slate-50/50" />}
                                </div>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No users found matching your filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.reduce((acc: React.ReactNode[], user, index, array) => {
                                if (filters.groupBy === 'role') {
                                    const currentRole = user.role;
                                    const prevRole = index > 0 ? array[index - 1].role : null;

                                    if (currentRole !== prevRole) {
                                        acc.push(
                                            <TableRow key={`header-${currentRole}`} className="bg-muted/50 hover:bg-muted/50">
                                                <TableCell colSpan={6} className="font-semibold text-sm py-2 capitalize pl-4">
                                                    {currentRole}s
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }
                                }

                                acc.push(
                                    <TableRow
                                        key={user.id}
                                        className="cursor-pointer transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 even:bg-slate-100 dark:even:bg-slate-800"
                                        onClick={() => router.push(`/admin/users/${user.id}`)}
                                    >
                                        <TableCell className="font-medium py-2">{user.first_name} {user.last_name}</TableCell>
                                        <TableCell className="py-2">{user.email}</TableCell>
                                        <TableCell className="py-2">
                                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-2">
                                            {user.is_active_worker ? (
                                                <Badge variant="outline" className="border-green-500 text-green-600">Yes</Badge>
                                            ) : <span className="text-muted-foreground text-xs">No</span>}
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()} className="py-2">
                                            <span className={user.is_active ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                                {user.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                );
                                return acc;
                            }, [])
                        )}
                    </TableBody>
                </Table>
            </div>
            {/* Sheet removed as we navigate to page */}
        </div>
    );
}
