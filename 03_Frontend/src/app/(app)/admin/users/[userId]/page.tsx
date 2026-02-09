
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUser, getUserCompanies, getUserRates } from "@/lib/api/users";
import { getWorkLogs, deleteWorkLog } from "@/lib/api/work-logs";
import { getMyCompanies } from "@/lib/api/companies"; // Imported getMyCompanies
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Building2, Wallet, Database, ArrowLeft, Pencil, ArrowUp, ArrowDown, ArrowUpDown, Trash2, Moon, Sparkles, User as UserIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { UserEditDialog } from "@/components/admin/user-edit-dialog";

import { FilterBar, FilterConfig } from "@/components/ui/filter-bar";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";

import { WorkLogDetailsDialog } from "@/components/work-log/details-dialog";
import { UserCreateWorkLogDialog } from "@/components/work-log/user-dialog";
import { User, WorkLog } from "@/lib/types";

// V3 Components
import { OverviewV3 } from "@/components/dashboard/overview-v2";
import { AnalyticsV2 as AnalyticsV3 } from "@/components/dashboard/analytics-v2";

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient(); // useQueryClient
    const { toast } = useToast();
    const userId = params.userId as string;

    const [filters, setFilters] = useState<Record<string, any>>({});
    const [selectedLog, setSelectedLog] = useState<any>(null);
    const [editLogState, setEditLogState] = useState<{ open: boolean, data?: Partial<any> }>({ open: false }); // Edit State

    const { data: user, isLoading: loadingUser } = useQuery({
        queryFn: () => getUser(userId),
        queryKey: ["user", userId],
    });

    const { data: companies = [], isLoading: loadingCompanies } = useQuery({
        queryFn: () => getUserCompanies(userId),
        queryKey: ["user-companies", userId],
        enabled: !!userId,
    });

    const { data: rates = [], isLoading: loadingRates } = useQuery({
        queryFn: () => getUserRates(userId),
        queryKey: ["user-rates", userId],
        enabled: !!userId,
    });

    const { data: workLogs = [], isLoading: loadingLogs } = useQuery({
        queryFn: () => getWorkLogs({ user_id: userId }), // Fetch all logs for this user
        queryKey: ["work-logs", userId],
        enabled: !!userId,
    });

    const handleLogUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ["work-logs", userId] });
    };

    const [dashboardTab, setDashboardTab] = useState("overview");
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    // Dashboard Date State
    const [selectedDate, setSelectedDate] = useState(new Date());
    const handlePrevMonth = () => setSelectedDate(prev => subMonths(prev, 1));
    const handleNextMonth = () => setSelectedDate(prev => addMonths(prev, 1));

    const { data: myCompanies = [] } = useQuery({
        queryFn: getMyCompanies,
        queryKey: ["myCompanies"],
    });

    // Filtering Logic:
    // If we have 'myCompanies', we assume the current user is a manager restricted to those companies.
    // If 'myCompanies' is empty (but we are admin), we might be a superuser/global admin unless logic says otherwise.
    // However, usually managers see a subset. If myCompanies is empty, maybe they are global?
    // Let's assume: if myCompanies.length > 0, filter. Else show all (Global Admin).

    // NOTE: This is a client-side heuristic. Ideally backend should filter.
    const amIGlobalAdmin = myCompanies.length === 0;

    const visibleCompanies = useMemo(() => {
        if (amIGlobalAdmin) return companies;
        return companies.filter((c: any) => myCompanies.some((mc: any) => mc.id === c.id));
    }, [companies, myCompanies, amIGlobalAdmin]);

    // Also filter workLogs to only those belonging to visible companies
    const visibleWorkLogs = useMemo(() => {
        if (amIGlobalAdmin) return workLogs;
        return workLogs.filter((log: any) =>
            // Either log has no company (system?) or belongs to one of visible companies
            !log.companyId || visibleCompanies.some((c: any) => c.id === log.companyId)
        );
    }, [workLogs, visibleCompanies, amIGlobalAdmin]);


    // Re-derive filteredLogs based on visibleWorkLogs instead of all workLogs
    const filteredLogs = useMemo(() => {
        let result = [...visibleWorkLogs];

        // 1. Search (Description or Company Name matching)
        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter((log: any) => {
                const companyName = companies.find((c: any) => c.id === log.companyId)?.name || "";
                return (
                    (log.description && log.description.toLowerCase().includes(q)) ||
                    companyName.toLowerCase().includes(q)
                );
            });
        }

        // 2. Type Filter
        if (filters.type && filters.type.length > 0) {
            result = result.filter((log: any) => filters.type.includes(log.type));
        }

        // 3. Date Range
        if (filters.date) {
            const { from, to } = filters.date || {};
            if (from || to) {
                result = result.filter((log: any) => {
                    const logDate = new Date(log.date);
                    if (from && logDate < from) return false;
                    if (to) {
                        const endOfDay = new Date(to);
                        endOfDay.setHours(23, 59, 59, 999);
                        if (logDate > endOfDay) return false;
                    }
                    return true;
                });
            }
        }

        // 4. Sorting
        if (sortConfig) {
            result.sort((a, b) => {
                let aVal: any = "";
                let bVal: any = "";

                // Resolve values based on key
                switch (sortConfig.key) {
                    case 'date':
                        // Use date for particular, startDate for tutorial
                        aVal = a.type === 'tutorial' ? a.startDate : a.date;
                        bVal = b.type === 'tutorial' ? b.startDate : b.date;

                        // Break ties with time if available (reverse logic handled by main sort)
                        // If dates are equal, compare times directly to produce consistent ordering
                        if (aVal === bVal) {
                            const aTime = a.startTime || '00:00';
                            const bTime = b.startTime || '00:00';
                            if (aTime < bTime) return sortConfig.direction === 'asc' ? -1 : 1;
                            if (aTime > bTime) return sortConfig.direction === 'asc' ? 1 : -1;
                        }
                        break;
                    case 'type':
                        aVal = a.type;
                        bVal = b.type;
                        break;
                    case 'company':
                        aVal = companies.find((c: any) => c.id === a.companyId)?.name || "";
                        bVal = companies.find((c: any) => c.id === b.companyId)?.name || "";
                        break;
                    case 'duration':
                        // Calculate numeric duration
                        if (a.type === 'particular') {
                            aVal = Number(a.durationHours) || 0;
                        } else {
                            aVal = a.startDate && a.endDate
                                ? (new Date(a.endDate).getTime() - new Date(a.startDate).getTime())
                                : 0;
                        }

                        if (b.type === 'particular') {
                            bVal = Number(b.durationHours) || 0;
                        } else {
                            bVal = b.startDate && b.endDate
                                ? (new Date(b.endDate).getTime() - new Date(b.startDate).getTime())
                                : 0;
                        }
                        break;
                    case 'amount':
                        aVal = Number(a.amount) || 0;
                        bVal = Number(b.amount) || 0;
                        break;
                    case 'client':
                        aVal = a.client || "";
                        bVal = b.client || "";
                        break;
                    default:
                        aVal = "";
                        bVal = "";
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [visibleWorkLogs, filters, companies, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current && current.key === key) {
                if (current.direction === 'asc') return { key, direction: 'desc' };
                return null;
            }
            return { key, direction: 'asc' };
        });
    };

    const handleDeleteLog = async (logId: string) => {
        if (!confirm("Are you sure you want to delete this work log?")) return;
        try {
            await deleteWorkLog(logId);
            toast({ title: "Success", description: "Work log deleted." });
            queryClient.invalidateQueries({ queryKey: ["work-logs", userId] });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete work log.", variant: "destructive" });
        }
    };

    const filterConfig: FilterConfig[] = [
        {
            id: "type",
            label: "Type",
            type: "select",
            options: [
                { label: "Particular", value: "particular" },
                { label: "Company", value: "company" }, // Assuming these are types
                { label: "Tutorial", value: "tutorial" },
            ]
        },
        {
            id: "date",
            label: "Date Range",
            type: "date-range"
        },
        {
            id: "groupBy",
            label: "Group By",
            type: "select",
            options: [
                { label: "None", value: "none" },
                { label: "Month", value: "month" },
            ]
        }
    ];

    if (loadingUser) return <div className="p-8">Loading user details...</div>;
    if (!user) return <div className="p-8">User not found</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{user.first_name} {user.last_name}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <p>{user.email}</p>
                            <span>•</span>
                            <p className="text-xs">ID: {user.id}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>Joined: {user.created_at ? format(new Date(user.created_at), 'PP') : 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                    <Badge variant={user.is_active ? "default" : "destructive"}>
                        {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{user.role}</Badge>
                    {user.is_active_worker && <Badge variant="secondary" className="bg-blue-100 text-blue-800">Worker</Badge>}
                    {user.is_supervisor && <Badge variant="secondary" className="bg-purple-100 text-purple-800">Supervisor</Badge>}
                    {user.default_company_id && (
                        <Badge variant="outline" className="border-blue-500 text-blue-500">
                            Default: {companies.find((c: any) => c.id === user.default_company_id)?.name || "Unknown"}
                        </Badge>
                    )}

                    <UserCreateWorkLogDialog
                        user={user}
                        companies={visibleCompanies}
                        onLogUpdate={handleLogUpdate}
                    >
                        <Button size="sm">
                            Add Work Log
                        </Button>
                    </UserCreateWorkLogDialog>

                    <UserEditDialog user={user} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Joined Companies</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{companies.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Work Logs</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{workLogs.length}</div>
                    </CardContent>
                </Card>
                {/* Add more stats if needed */}
            </div>

            <Tabs defaultValue="dashboard" className="w-full">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="worklogs">Work Logs</TabsTrigger>
                    <TabsTrigger value="companies">Companies & Rates</TabsTrigger>
                    <TabsTrigger value="devices">Devices</TabsTrigger>
                    <TabsTrigger value="raw">Raw Data</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-6 space-y-4">
                    <Tabs defaultValue="overview" value={dashboardTab} onValueChange={setDashboardTab} className="w-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <h2 className="text-2xl font-bold tracking-tight">
                                    {format(selectedDate, 'MMMM yyyy')}
                                </h2>
                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                                    <button
                                        onClick={handlePrevMonth}
                                        className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all shadow-sm"
                                        title="Previous Month"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={handleNextMonth}
                                        className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all shadow-sm"
                                        title="Next Month"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <TabsList className="bg-slate-100 p-1 rounded-lg">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                            </TabsList>
                        </div>
                        <TabsContent value="overview" className="space-y-4">
                            <OverviewV3
                                workLogs={visibleWorkLogs}
                                companies={visibleCompanies}
                                onAddRecord={() => { }}
                                onNavigate={setDashboardTab}
                                selectedDate={selectedDate}
                                onViewLog={setSelectedLog}
                            />
                        </TabsContent>
                        <TabsContent value="analytics" className="space-y-4">
                            <AnalyticsV3 workLogs={visibleWorkLogs} selectedDate={selectedDate} />
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                <TabsContent value="analytics" className="mt-6">
                    <AnalyticsV3 workLogs={visibleWorkLogs} selectedDate={selectedDate} />
                </TabsContent>

                <TabsContent value="worklogs" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Work History</CardTitle>
                            <CardDescription>
                                All work logs recorded for this user.
                                {!amIGlobalAdmin && " (Restricted to your managed companies)"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <FilterBar config={filterConfig} onFilterChange={setFilters} />
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-900 hover:bg-slate-900 border-none">
                                        <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50 rounded-tl-md" onClick={() => handleSort('date')}>
                                            <div className="flex items-center gap-1">
                                                Date
                                                {sortConfig?.key === 'date' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                                ) : <ArrowUpDown className="h-4 w-4 text-slate-50/50" />}
                                            </div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50" onClick={() => handleSort('type')}>
                                            <div className="flex items-center gap-1">
                                                Type
                                                {sortConfig?.key === 'type' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                                ) : <ArrowUpDown className="h-4 w-4 text-slate-50/50" />}
                                            </div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50" onClick={() => handleSort('company')}>
                                            <div className="flex items-center gap-1">
                                                Company
                                                {sortConfig?.key === 'company' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                                ) : <ArrowUpDown className="h-4 w-4 text-slate-50/50" />}
                                            </div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50" onClick={() => handleSort('client')}>
                                            <div className="flex items-center gap-1">
                                                Client
                                                {sortConfig?.key === 'client' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                                ) : <ArrowUpDown className="h-4 w-4 text-slate-50/50" />}
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-slate-50">
                                            Flags
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50 w-[80px]" onClick={() => handleSort('duration')}>
                                            <div className="flex items-center gap-1">
                                                Duration
                                                {sortConfig?.key === 'duration' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                                ) : <ArrowUpDown className="h-4 w-4 text-slate-50/50" />}
                                            </div>
                                        </TableHead>
                                        <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50" onClick={() => handleSort('amount')}>
                                            <div className="flex items-center gap-1">
                                                Amount
                                                {sortConfig?.key === 'amount' ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                                ) : <ArrowUpDown className="h-4 w-4 text-slate-50/50" />}
                                            </div>
                                        </TableHead>
                                        <TableHead className="w-[50px] bg-slate-900 rounded-tr-md"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">
                                                No work logs found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredLogs.reduce((acc: React.ReactNode[], log: any, index: number, array: any[]) => {
                                            if (filters.groupBy === 'month') {
                                                // Determine the date to use for grouping: startDate for tutorials, date for others.
                                                // Fallback to empty string to safely handle nulls/undefined.
                                                const currentDateStr = (log.type === 'tutorial' ? log.startDate : log.date) || "";

                                                // Same logic for previous item
                                                const prevLog = index > 0 ? array[index - 1] : null;
                                                const prevDateStr = prevLog
                                                    ? ((prevLog.type === 'tutorial' ? prevLog.startDate : prevLog.date) || "")
                                                    : null;

                                                if (currentDateStr) {
                                                    const currentMonth = format(new Date(currentDateStr), 'MMMM yyyy');
                                                    const prevMonth = prevDateStr ? format(new Date(prevDateStr), 'MMMM yyyy') : null;

                                                    if (currentMonth !== prevMonth) {
                                                        acc.push(
                                                            <TableRow key={`header-${currentMonth}`} className="bg-muted/50 hover:bg-muted/50">
                                                                <TableCell colSpan={8} className="font-semibold text-sm py-2">
                                                                    {currentMonth}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    }
                                                }
                                            }

                                            acc.push(
                                                <TableRow
                                                    key={log.id}
                                                    className="cursor-pointer transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 even:bg-slate-100 dark:even:bg-slate-800"
                                                    onClick={() => {
                                                        setSelectedLog(log);
                                                    }}
                                                >
                                                    <TableCell className="py-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium whitespace-nowrap">
                                                                {log.type === 'tutorial' && log.startDate && log.endDate
                                                                    ? `${format(new Date(log.startDate), "dd/MM/yyyy")} - ${format(new Date(log.endDate), "dd/MM/yyyy")}`
                                                                    : log.date
                                                                        ? format(new Date(log.date), "dd/MM/yyyy")
                                                                        : "-"}
                                                            </span>
                                                            {log.type === 'particular' && log.startTime && log.endTime && (
                                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                                    {log.startTime} - {log.endTime}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="capitalize py-1">{log.type}</TableCell>
                                                    <TableCell className="py-1">
                                                        {companies.find((c: any) => c.id === log.companyId)?.name || "Unknown Company"}
                                                    </TableCell>
                                                    <TableCell className="py-1">
                                                        <div className="flex items-center gap-2 max-w-[200px] truncate" title={log.client || ''}>
                                                            {log.client && <UserIcon className="h-3 w-3 text-muted-foreground shrink-0" />}
                                                            <span className="truncate">{log.client || '-'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-1">
                                                        <div className="flex gap-1">
                                                            {log.hasCoordination && (
                                                                <div className="p-1 bg-blue-100 text-blue-700 rounded" title="Coordination supplement applied">
                                                                    <Sparkles className="h-3 w-3" />
                                                                </div>
                                                            )}
                                                            {log.hasNight && (
                                                                <div className="p-1 bg-indigo-100 text-indigo-700 rounded" title="Night supplement applied">
                                                                    <Moon className="h-3 w-3" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-1">
                                                        {log.type === 'particular'
                                                            ? `${log.durationHours} h`
                                                            : log.startDate && log.endDate
                                                                ? `${(new Date(log.endDate).getTime() - new Date(log.startDate).getTime()) / (1000 * 3600 * 24) + 1} days`
                                                                : '-'}
                                                    </TableCell>
                                                    <TableCell className="py-1">{log.amount ? `€${Number(log.amount).toFixed(2)}` : '-'}</TableCell>
                                                    <TableCell className="py-1" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center gap-1">
                                                            <Button variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditLogState({
                                                                open: true,
                                                                data: {
                                                                    ...log,
                                                                    userId: log.userId,
                                                                    companyId: log.companyId,
                                                                    startTime: log.startTime,
                                                                    endTime: log.endTime,
                                                                    startDate: log.startDate,
                                                                    endDate: log.endDate,
                                                                    hasCoordination: log.hasCoordination,
                                                                    hasNight: log.hasNight,
                                                                    arrivesPrior: log.arrivesPrior,
                                                                    durationHours: log.durationHours,
                                                                    rateApplied: log.rateApplied
                                                                }
                                                            })}>
                                                                <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                                            </Button>
                                                            <Button variant="ghost" className="h-6 w-6 p-0" onClick={() => handleDeleteLog(log.id)}>
                                                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );

                                            return acc;
                                        }, [])
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="companies" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Companies & Rates</CardTitle>
                            <CardDescription>
                                Associated companies and specific billing rates.
                                {!amIGlobalAdmin && " (Restricted to your managed companies)"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-8">
                                {visibleCompanies.map((company: any) => {
                                    const companyRate = rates.find((r: any) => r.companyId === company.id);
                                    return (
                                        <div key={company.id} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-5 w-5 text-blue-500" />
                                                    <h3 className="text-lg font-semibold">{company.name}</h3>
                                                </div>
                                                <Badge variant="secondary">{company.role}</Badge>
                                            </div>

                                            {companyRate ? (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground block">Hourly Rate</span>
                                                        <span className="font-medium">€{Number(companyRate.hourlyRate).toFixed(2)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block">Daily Rate</span>
                                                        <span className="font-medium">€{Number(companyRate.dailyRate).toFixed(2)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block">Coordination</span>
                                                        <span className="font-medium">€{Number(companyRate.coordinationRate).toFixed(2)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block">Type</span>
                                                        <span className="font-medium">{companyRate.isGross ? "Gross" : "Net"}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block">IRPF</span>
                                                        <span className="font-medium">{companyRate.deductionIrpf || 0}%</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block">SS</span>
                                                        <span className="font-medium">{companyRate.deductionSs !== undefined && companyRate.deductionSs !== null ? `${companyRate.deductionSs}%` : "Default"}</span>
                                                    </div>
                                                    {!!companyRate.deductionExtra && (
                                                        <div>
                                                            <span className="text-muted-foreground block">Extra</span>
                                                            <span className="font-medium">{companyRate.deductionExtra}%</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-amber-600">No specific rates configured.</div>
                                            )}
                                        </div>
                                    );
                                })}
                                {visibleCompanies.length === 0 && (
                                    <div className="text-muted-foreground">User is not a member of any company (or none that you manage).</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="devices" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Session Management</CardTitle>
                            <CardDescription>
                                Manage active sessions and trusted devices for this user.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DevicesTab userId={userId} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="raw" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Raw Data</CardTitle>
                            <CardDescription>Debug view of full database record.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-auto text-xs">
                                {JSON.stringify({ user, companies, rates, workLogs }, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs >

            <WorkLogDetailsDialog
                log={selectedLog}
                open={!!selectedLog}
                onOpenChange={(open) => !open && setSelectedLog(null)}
                userSettings={
                    selectedLog
                        ? (() => {
                            const rate = rates.find((r: any) => r.companyId === selectedLog.companyId);
                            if (!rate) return null;

                            // Fallback: If User Rate SS deduction is not set, use Company default
                            if (rate.deductionSs === null || rate.deductionSs === undefined) {
                                const company = companies.find((c: any) => c.id === selectedLog.companyId);
                                if (company?.social_security_deduction) {
                                    return { ...rate, deductionSs: company.social_security_deduction };
                                }
                            }
                            return rate;
                        })()
                        : null
                }
                onEdit={(log) => {
                    setSelectedLog(null);
                    setEditLogState({
                        open: true,
                        data: {
                            ...log,
                            userId: log.userId,
                            companyId: log.companyId,
                            startTime: log.startTime,
                            endTime: log.endTime,
                            startDate: log.startDate,
                            endDate: log.endDate,
                            hasCoordination: log.hasCoordination,
                            hasNight: log.hasNight,
                            arrivesPrior: log.arrivesPrior,
                            durationHours: log.durationHours,
                            rateApplied: log.rateApplied
                        }
                    });
                }}
                onDelete={(log) => {
                    setSelectedLog(null);
                    handleDeleteLog(log.id);
                }}
            />

            <UserCreateWorkLogDialog
                open={editLogState.open}
                onOpenChange={(open) => setEditLogState(prev => ({ ...prev, open }))}
                logToEdit={editLogState.data as WorkLog}
                user={user}
                companies={companies}
                onLogUpdate={() => {
                    queryClient.invalidateQueries({ queryKey: ["work-logs", userId] });
                    setEditLogState({ open: false });
                }}
            >
                <span className="hidden" />
            </UserCreateWorkLogDialog>
        </div >
    );
}

// Sub-component for Devices Tab
import { getUserDevices, revokeUserDevice } from "@/lib/api/users";
import { UserDevicesTable } from "@/components/admin/user-devices-table";

function DevicesTab({ userId }: { userId: string }) {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: devices = [], isLoading } = useQuery({
        queryFn: () => getUserDevices(userId),
        queryKey: ["user-devices", userId],
        // Auto refresh every minute to see usage updates? No, staleTime is fine.
    });

    const handleRevoke = async (deviceId: string) => {
        if (!confirm("Are you sure you want to revoke this device? The user will be logged out from that browser.")) return;
        try {
            await revokeUserDevice(userId, deviceId);
            toast({ title: "Success", description: "Device revoked successfully." });
            queryClient.invalidateQueries({ queryKey: ["user-devices", userId] });
        } catch (error) {
            toast({ title: "Error", description: "Failed to revoke device.", variant: "destructive" });
        }
    };

    return (
        <UserDevicesTable
            devices={devices}
            isLoading={isLoading}
            onRevoke={handleRevoke}
        />
    );
}
