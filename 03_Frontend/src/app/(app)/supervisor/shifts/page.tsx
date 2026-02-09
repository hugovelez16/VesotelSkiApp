"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCompaniesDetailed } from "@/lib/api/companies";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { useState, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { Loader2, ArrowUp, ArrowDown, ArrowUpDown, User as UserIcon, Calendar, Sparkles, Moon } from "lucide-react";
import { WorkLog } from "@/lib/types";
import { FilterBar, FilterConfig } from "@/components/ui/filter-bar";
import { Button } from "@/components/ui/button";

export default function SupervisorShiftsPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const [filters, setFilters] = useState<Record<string, any>>({});
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    // Fetch companies
    const { data: companies = [], isLoading: loadingCompanies } = useQuery({
        queryFn: getCompaniesDetailed,
        queryKey: ["companiesDetailed"],
    });

    // Derive selected company from URL or default to first
    const companyIdFromUrl = searchParams.get("companyId");
    const selectedCompanyId = companyIdFromUrl || (companies.length > 0 ? companies[0].id : null);

    // Fetch logs for selected company
    const { data: workLogs = [], isLoading: loadingLogs } = useQuery({
        queryFn: async () => {
            if (!selectedCompanyId) return [];
            const res = await api.get<WorkLog[]>(`/work-logs/?company_id=${selectedCompanyId}`);
            return res.data;
        },
        queryKey: ["companyWorkLogs", selectedCompanyId],
        enabled: !!selectedCompanyId
    });

    // Derive Members for Filter Options
    const selectedCompany = useMemo(() => companies.find(c => c.id === selectedCompanyId), [companies, selectedCompanyId]);
    const memberOptions = useMemo(() => {
        if (!selectedCompany) return [];
        return selectedCompany.members
            .filter(m => m.user)
            .map(m => ({
                label: `${m.user!.first_name} ${m.user!.last_name}`,
                value: m.user_id
            }));
    }, [selectedCompany]);

    // Filtering & Sorting Logic
    const filteredLogs = useMemo(() => {
        let result = [...workLogs];

        // 1. Filter
        if (filters.date) {
            const { from, to } = filters.date;
            result = result.filter((log) => {
                const date = new Date(log.date || log.startDate || log.createdAt);
                return (!from || date >= from) && (!to || date <= to);
            });
        }
        if (filters.userId && filters.userId.length > 0) {
            result = result.filter(log => filters.userId.includes(log.userId));
        }
        if (filters.type && filters.type.length > 0) {
            const types = Array.isArray(filters.type) ? filters.type : [filters.type];
            // handle boolean or array (FilterBar 'select' returns array of strings)
            result = result.filter(log => types.includes(log.type));
        }

        // 2. Sort (with Grouping priority)
        result.sort((a, b) => {
            // Priority 1: Group By
            const groupBy = Array.isArray(filters.groupBy) ? filters.groupBy[0] : filters.groupBy;
            if (groupBy && groupBy !== 'none') {
                let groupA = "";
                let groupB = "";

                if (groupBy === 'user') {
                    const getMemberName = (uid: string) => {
                        const m = selectedCompany?.members.find(mem => mem.user_id === uid);
                        return m ? `${m.user?.first_name} ${m.user?.last_name}` : '';
                    };
                    groupA = getMemberName(a.userId);
                    groupB = getMemberName(b.userId);
                } else if (groupBy === 'type') {
                    groupA = a.type;
                    groupB = b.type;
                }

                if (groupA < groupB) return -1;
                if (groupA > groupB) return 1;
            }

            // Priority 2: Selected Sort
            if (sortConfig) {
                let aVal: any = "";
                let bVal: any = "";

                const getMemberName = (uid: string) => {
                    const m = selectedCompany?.members.find(mem => mem.user_id === uid);
                    return m ? `${m.user?.first_name} ${m.user?.last_name}` : '';
                };

                switch (sortConfig.key) {
                    case 'user':
                        aVal = getMemberName(a.userId);
                        bVal = getMemberName(b.userId);
                        break;
                    case 'type':
                        aVal = a.type;
                        bVal = b.type;
                        break;
                    case 'date':
                        aVal = a.type === 'tutorial' ? a.startDate : a.date;
                        bVal = b.type === 'tutorial' ? b.startDate : b.date;
                        break;
                    case 'client':
                        aVal = a.client || "";
                        bVal = b.client || "";
                        break;
                    case 'duration':
                        aVal = Number(a.durationHours) || 0;
                        bVal = Number(b.durationHours) || 0;
                        break;
                    case 'amount':
                        aVal = Number(a.amount) || 0;
                        bVal = Number(b.amount) || 0;
                        break;
                    default:
                        aVal = "";
                        bVal = "";
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            } else {
                // Default Sort: Date Desc
                const dateA = new Date(a.date || a.startDate || 0);
                const dateB = new Date(b.date || b.startDate || 0);
                return dateB.getTime() - dateA.getTime();
            }
        });

        return result;
    }, [workLogs, filters, sortConfig, selectedCompany]);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current && current.key === key) {
                if (current.direction === 'asc') return { key, direction: 'desc' };
                return null;
            }
            return { key, direction: 'asc' };
        });
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/30" />;
        return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
    };


    if (loadingCompanies) {
        return <div className="p-8 flex items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading companies...</div>;
    }

    const filterConfig: FilterConfig[] = [
        {
            id: "date",
            label: "Date Range",
            type: "date-range"
        },
        {
            id: "userId",
            label: "User",
            type: "select",
            options: memberOptions
        },
        {
            id: "type",
            label: "Type",
            type: "select",
            options: [
                { label: "Particular", value: "particular" },
                { label: "Tutorial", value: "tutorial" }
            ]
        },
        {
            id: "groupBy",
            label: "Group By",
            type: "select",
            options: [
                { label: "None", value: "none" },
                { label: "User", value: "user" },
                { label: "Type", value: "type" }
            ]
        }
    ];

    const activeGroupBy = Array.isArray(filters.groupBy) ? filters.groupBy[0] : filters.groupBy;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Shifts & Work Logs</h1>
                    <p className="text-muted-foreground">View and manage work logs for your companies.</p>
                </div>

            </div>

            <div className="space-y-4">
                <FilterBar config={filterConfig} onFilterChange={setFilters} />

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-900 hover:bg-slate-900 border-none">
                                {activeGroupBy !== 'user' && (
                                    <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50 rounded-tl-md" onClick={() => handleSort('user')}>
                                        <div className="flex items-center gap-1">
                                            User <SortIcon column="user" />
                                        </div>
                                    </TableHead>
                                )}
                                <TableHead className={`cursor-pointer hover:bg-slate-800 transition-colors text-slate-50 ${activeGroupBy === 'user' ? 'rounded-tl-md' : ''}`} onClick={() => handleSort('date')}>
                                    <div className="flex items-center gap-1">
                                        Date <SortIcon column="date" />
                                    </div>
                                </TableHead>
                                <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50" onClick={() => handleSort('type')}>
                                    <div className="flex items-center gap-1">
                                        Type <SortIcon column="type" />
                                    </div>
                                </TableHead>
                                <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50" onClick={() => handleSort('client')}>
                                    <div className="flex items-center gap-1">
                                        Client <SortIcon column="client" />
                                    </div>
                                </TableHead>
                                <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50" onClick={() => handleSort('flags')}>
                                    <div className="flex items-center gap-1">
                                        Flags
                                    </div>
                                </TableHead>
                                <TableHead className="text-right cursor-pointer hover:bg-slate-800 transition-colors text-slate-50 rounded-tr-md" onClick={() => handleSort('amount')}>
                                    <div className="flex items-center justify-end gap-1">
                                        Amount <SortIcon column="amount" />
                                    </div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loadingLogs ? (
                                <TableRow>
                                    <TableCell colSpan={activeGroupBy === 'user' ? 5 : 6} className="text-center py-12">
                                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground/50" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={activeGroupBy === 'user' ? 5 : 6} className="text-center py-12 text-muted-foreground">
                                        No work logs found matching your filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLogs.reduce((acc: React.ReactNode[], log, index, array) => {
                                    // Resolve User Name
                                    const company = companies.find(c => c.id === selectedCompanyId);
                                    const member = company?.members.find(m => m.user_id === log.userId);
                                    const userName = member ? `${member.user?.first_name} ${member.user?.last_name}` : 'Unknown';
                                    const userEmail = member?.user?.email;

                                    // Grouping Logic
                                    if (activeGroupBy && activeGroupBy !== 'none') {
                                        let currentGroupVal = "";
                                        let prevGroupVal = "";
                                        let groupContent: React.ReactNode = null;

                                        if (activeGroupBy === 'user') {
                                            currentGroupVal = log.userId; // Use ID for uniqueness check
                                            if (index > 0) prevGroupVal = array[index - 1].userId;

                                            if (index === 0 || currentGroupVal !== prevGroupVal) {
                                                // Calculate Group Stats
                                                const groupLogs = array.filter(l => l.userId === currentGroupVal);
                                                const groupTotal = groupLogs.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
                                                const groupCount = groupLogs.length;

                                                // Generar iniciales
                                                const initials = userName
                                                    .split(' ')
                                                    .map((n) => n[0])
                                                    .join('')
                                                    .toUpperCase()
                                                    .slice(0, 2);

                                                groupContent = (
                                                    <div className="flex items-center justify-between w-full pr-4">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarFallback className="bg-slate-200 text-slate-700 font-bold text-xs">
                                                                    {initials}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-slate-900">{userName}</span>
                                                                <span className="text-xs text-muted-foreground">{userEmail}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-4 text-sm text-slate-600">
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-bold">{groupCount}</span> Shifts
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                Total: <span className="font-bold">€{groupTotal.toFixed(2)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        } else if (activeGroupBy === 'type') {
                                            currentGroupVal = log.type;
                                            if (index > 0) prevGroupVal = array[index - 1].type;

                                            if (index === 0 || currentGroupVal !== prevGroupVal) {
                                                groupContent = <Badge variant="outline" className="capitalize">{currentGroupVal}</Badge>;
                                            }
                                        }

                                        if (groupContent) {
                                            acc.push(
                                                <TableRow key={`group-${index}-${currentGroupVal}`} className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                                                    <TableCell colSpan={activeGroupBy === 'user' ? 5 : 6} className="py-3 pl-4">
                                                        {groupContent}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }
                                    }

                                    acc.push(
                                        <TableRow key={log.id} className="cursor-default transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 even:bg-slate-100 dark:even:bg-slate-800">
                                            {activeGroupBy !== 'user' && (
                                                <TableCell className="py-2">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{userName}</span>
                                                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">{userEmail}</span>
                                                    </div>
                                                </TableCell>
                                            )}
                                            <TableCell className="py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium whitespace-nowrap">
                                                        {log.type === 'tutorial' && log.startDate && log.endDate
                                                            ? `${format(parseISO(log.startDate), "dd/MM/yyyy")} - ${format(parseISO(log.endDate), "dd/MM/yyyy")}`
                                                            : (log.date ? format(parseISO(log.date), "dd/MM/yyyy") : "-")}
                                                    </span>
                                                    {log.type === 'particular' && log.startTime && log.endTime && (
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {log.startTime} - {log.endTime}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="capitalize py-2">
                                                <Badge
                                                    variant={log.type === 'tutorial' ? 'secondary' : 'default'}
                                                    className={log.type === 'tutorial' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}
                                                >
                                                    {log.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="flex items-center gap-2 max-w-[150px] md:max-w-[200px] truncate" title={log.client || ''}>
                                                    {log.client && <UserIcon className="h-3 w-3 text-muted-foreground shrink-0" />}
                                                    <span className="truncate block">{log.client || '-'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2 hidden md:table-cell">
                                                <div className="flex gap-1">
                                                    {log.hasCoordination && (
                                                        <div className="p-1 bg-yellow-50 text-yellow-700 rounded border border-yellow-100" title="Coordination">
                                                            <Sparkles className="h-3 w-3" />
                                                        </div>
                                                    )}
                                                    {log.hasNight && (
                                                        <div className="p-1 bg-indigo-50 text-indigo-700 rounded border border-indigo-100" title="Night Shift">
                                                            <Moon className="h-3 w-3" />
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium py-2">
                                                {log.amount ? `€${Number(log.amount).toFixed(2)}` : '-'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                    return acc;
                                }, [])
                            )}
                        </TableBody>
                    </Table>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                    Showing {filteredLogs.length} records
                </div>
            </div>
        </div>
    );
}
