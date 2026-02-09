"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompaniesDetailed, updateMemberStatus } from "@/lib/api/companies";
import { User } from "@/lib/types";
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
import { MemberSettingsDialog } from "@/components/admin/member-settings-dialog";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react"; // Match admin icon
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterBar, FilterConfig } from "@/components/ui/filter-bar";

export default function SupervisorUsersPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const companyIdParam = searchParams.get("companyId");

    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Filtering State
    const [filters, setFilters] = useState<Record<string, any>>({});
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    // Fetch Managed Key Data
    const { data: companies = [], isLoading } = useQuery({
        queryFn: getCompaniesDetailed,
        queryKey: ["companiesDetailed"],
    });

    const memberStatusMutation = useMutation({
        mutationFn: ({ companyId, userId, status }: { companyId: string; userId: string; status: string }) =>
            updateMemberStatus(companyId, userId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["companiesDetailed"] });
            toast({ title: "Status updated" });
        },
        onError: () => toast({ title: "Failed", variant: "destructive" })
    });


    // Deduplicate Users from Companies
    const uniqueUsersWithMeta = useMemo(() => {
        const map = new Map<string, any>();

        // Filter companies if companyId param is present
        const filteredCompanies = companyIdParam
            ? companies.filter((c: any) => c.id === companyIdParam)
            : companies;

        filteredCompanies.forEach((company: any) => {
            if (!company.members) return;
            company.members.forEach((member: any) => {
                if (!map.has(member.user_id)) {
                    map.set(member.user_id, {
                        ...member.user,
                        // Add meta for supervisor actions
                        _companyId: company.id,
                        _status: member.status,
                        _role: member.role // Company role? Or we use User Global Role? Admin page uses Global Role?
                        // member.user.role is global. member.role is company.
                        // I will display GLOBAL role to match Admin UI.
                    });
                }
            });
        });
        return Array.from(map.values());
    }, [companies, companyIdParam]);


    // Filter Logic (Copied from Admin but applied to uniqueUsers)
    const filteredUsers = useMemo(() => {
        let result = [...uniqueUsersWithMeta];

        // 1. Text Search (Global)
        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(u =>
                u.first_name?.toLowerCase().includes(q) ||
                u.last_name?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q)
            );
        }

        // 2. Role Filter (Global Role)
        if (filters.role && filters.role.length > 0) {
            result = result.filter(u => filters.role.includes(u.role));
        }

        // 3. Status Filter (Company Status essentially, mapped to Active/Inactive)
        if (filters.status && filters.status.length > 0) {
            result = result.filter(u => {
                // Map 'active' member status to 'active', others to 'inactive'
                const status = u._status === 'active' ? "active" : "inactive";
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
                const aVal = a[sortConfig.key];
                const bVal = b[sortConfig.key];

                const aValue = aVal ?? "";
                const bValue = bVal ?? "";

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [uniqueUsersWithMeta, filters, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current && current.key === key) {
                if (current.direction === 'asc') return { key, direction: 'desc' };
                return null;
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
        // We use MEMBER status here effectively
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

    // Toggle logic: Updates the company membership status
    const handleToggle = (user: any, checked: boolean) => {
        if (!user._companyId) return;
        const newStatus = checked ? 'active' : 'rejected'; // or 'inactive'? Schema usually has active/pending/rejected?
        // Admin page used `updateUserStatus` (Global). Supervisor uses `updateMemberStatus` (Company).
        // Let's assume we toggle company access.
        memberStatusMutation.mutate({
            companyId: user._companyId,
            userId: user.id,
            status: newStatus
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                </div>
                {/* No Dialog for creating users provided for now, as supervisor usually invites? */}
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
                            <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50 rounded-tr-md" onClick={() => handleSort('_status')}>
                                <div className="flex items-center gap-1">
                                    Status
                                    {sortConfig?.key === '_status' ? (
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
                                        onClick={() => {
                                            const query = companyIdParam ? `?companyId=${companyIdParam}` : "";
                                            router.push(`/supervisor/users/${user.id}${query}`);
                                        }}
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
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    checked={user._status === 'active'}
                                                    onCheckedChange={(checked) => handleToggle(user, checked)}
                                                    className={user._status === 'active' ? "data-[state=checked]:bg-green-600" : "data-[state=unchecked]:bg-slate-200"}
                                                />
                                                <span className={user._status === 'active' ? "text-green-600" : "text-red-600"}>
                                                    {user._status === 'active' ? "Active" : "Inactive"}
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                                return acc;
                            }, [])
                        )}
                    </TableBody>
                </Table>
            </div>
        </div >
    );
}
