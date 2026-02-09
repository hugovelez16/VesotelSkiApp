"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUsers, getUser, getUserCompanies, getUserRates } from "@/lib/api/users";
import { getWorkLogs, deleteWorkLog } from "@/lib/api/work-logs";
import { getMyCompanies } from "@/lib/api/companies";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Building2, Clock, User as UserIcon, CheckCircle, XCircle, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Sparkles, Moon, Pencil, Trash2 } from "lucide-react";
import { format, subMonths, addMonths } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { parseISO, differenceInCalendarDays } from "date-fns";
import { FilterBar, FilterConfig } from "@/components/ui/filter-bar";
import { useState, useMemo, use, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkLogDetailsDialog } from "@/components/work-log/details-dialog";
import { UserCreateWorkLogDialog } from "@/components/work-log/user-dialog";
import { useToast } from "@/hooks/use-toast";
import { User, WorkLog } from "@/lib/types";
import { OverviewV3 } from "@/components/dashboard/overview-v2";
import { AnalyticsV2 as AnalyticsV3 } from "@/components/dashboard/analytics-v2";

export default function SupervisorUserDetailsPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const companyIdParam = searchParams.get("companyId");

    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState<Record<string, any>>({});
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [editLogState, setEditLogState] = useState<{ open: boolean, data?: Partial<any> }>({ open: false });
    const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);

    // Dashboard State
    const [dashboardTab, setDashboardTab] = useState("overview");
    const [selectedDate, setSelectedDate] = useState(new Date());
    const handlePrevMonth = () => setSelectedDate(prev => subMonths(prev, 1));
    const handleNextMonth = () => setSelectedDate(prev => addMonths(prev, 1));

    const handleLogUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ["workLogs", userId] });
    };

    const handleDeleteLog = async (logId: string) => {
        if (!confirm("Are you sure you want to delete this work log?")) return;
        try {
            await deleteWorkLog(logId);
            toast({ title: "Success", description: "Work log deleted." });
            queryClient.invalidateQueries({ queryKey: ["workLogs", userId] });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete work log.", variant: "destructive" });
        }
    };

    // Fetch user-specific data
    const { data: user, isLoading: isLoadingUser, isError: isErrorUser, error: errorUser } = useQuery({
        queryFn: () => getUser(userId),
        queryKey: ["user", userId],
        retry: 1
    });

    const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
        queryFn: () => getUserCompanies(userId),
        queryKey: ["userCompanies", userId],
        enabled: !!user
    });

    const { data: rates = [] } = useQuery({
        queryFn: () => getUserRates(userId),
        queryKey: ["userRates", userId],
        enabled: !!user
    });

    const { data: workLogs = [], isLoading: isLoadingLogs, isError: isLogsError, error: logsError } = useQuery({
        queryFn: () => getWorkLogs({ user_id: userId }), // Filter by this user
        queryKey: ["workLogs", userId],
        enabled: !!user
    });

    // Fetch Logged-in Supervisor's companies for visibility restriction
    const { data: myCompanies = [], isSuccess: isMyCompaniesSuccess } = useQuery({
        queryFn: getMyCompanies,
        queryKey: ["myCompanies"],
    });

    // Auto-select first company if none selected
    useEffect(() => {
        if (!companyIdParam && isMyCompaniesSuccess && myCompanies.length > 0 && companies.length > 0) {
            // Find first company that is both in user's companies and supervisor's managed companies
            const firstManagedCompany = companies.find((c: any) => myCompanies.some((mc: any) => mc.id === c.id));
            if (firstManagedCompany) {
                router.replace(`/supervisor/users/${userId}?companyId=${firstManagedCompany.id}`);
            }
        }
    }, [companyIdParam, isMyCompaniesSuccess, myCompanies, companies, router, userId]);

    // Filtering Logic: Only show companies (and associated data) that the supervisor manages
    // Filtering Logic: Only show companies (and associated data) that the supervisor manages
    const visibleCompanies = useMemo(() => {
        // Strict filtering: If myCompanies is empty, show nothing.
        // This prevents "Global Admin" leakage in the Supervisor view.
        if (myCompanies.length === 0) return [];

        // 1. Filter by Supervisor's managed companies
        let filtered = companies.filter((c: any) => myCompanies.some((mc: any) => mc.id === c.id));

        // 2. Strict filtering: If a specific company is selected in the URL, ONLY show that company.
        if (companyIdParam) {
            filtered = filtered.filter((c: any) => c.id === companyIdParam);
        }

        return filtered;
    }, [companies, myCompanies, companyIdParam]);

    // Derived lists based on visibleCompanies
    const visibleRates = useMemo(() => {
        return rates.filter((r: any) => visibleCompanies.some((c: any) => c.id === r.companyId));
    }, [rates, visibleCompanies]);

    const visibleWorkLogs = useMemo(() => {
        return workLogs.filter((log: any) =>
            !log.companyId || visibleCompanies.some((c: any) => c.id === log.companyId)
        );
    }, [workLogs, visibleCompanies]);

    // Effective User Settings Logic (Top Level)
    const effectiveUserSettings = useMemo(() => {
        if (!selectedLog) return null;
        if (!rates || !companies) return null;

        const rate = rates.find((r: any) => r.companyId === selectedLog.companyId);
        const company = companies.find((c: any) => c.id === selectedLog.companyId);

        if (!rate) return null;

        return {
            ...rate,
            deductionSs: rate.deductionSs ?? company?.social_security_deduction ?? 0,
            deductionIrpf: rate.deductionIrpf ?? 0,
        };
    }, [selectedLog, rates, companies]);

    const filteredLogs = useMemo(() => {
        let result = [...workLogs];
        if (filters.date) {
            const { from, to } = filters.date;
            result = result.filter((log: any) => {
                const date = new Date(log.date || log.startDate);
                return (!from || date >= from) && (!to || date <= to);
            });
        }

        // Sorting
        if (sortConfig) {
            result.sort((a, b) => {
                let aVal: any = "";
                let bVal: any = "";

                // Resolve values based on key
                switch (sortConfig.key) {
                    case 'date':
                        aVal = a.type === 'tutorial' ? a.startDate : a.date;
                        bVal = b.type === 'tutorial' ? b.startDate : b.date;
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
                    case 'created_at':
                        aVal = a.createdAt || "";
                        bVal = b.createdAt || "";
                        break;
                    default:
                        aVal = "";
                        bVal = "";
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            // Default: Newest first
            result.sort((a, b) => new Date(b.date || b.startDate).getTime() - new Date(a.date || a.startDate).getTime());
        }

        return result;
    }, [workLogs, filters, sortConfig, companies]);


    // Stats Calculation
    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const currentMonthName = format(now, 'MMMM');

        const uniqueDays = new Set<string>();
        let totalParticularHours = 0;
        let totalTutorialDays = 0;

        workLogs.forEach((log: any) => {
            const logDateVal = log.date || log.startDate;
            if (!logDateVal) return;

            const logDate = new Date(logDateVal);
            // Check if log falls in current month (checking start date for simplicity)
            const isCurrentMonth = logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;

            if (log.type === 'particular') {
                totalParticularHours += (Number(log.durationHours) || 0);
                if (isCurrentMonth) {
                    uniqueDays.add(format(logDate, 'yyyy-MM-dd'));
                }
            } else if (log.type === 'tutorial') {
                const start = new Date(log.startDate);
                const end = new Date(log.endDate);
                const days = differenceInCalendarDays(end, start) + 1;
                totalTutorialDays += days;

                if (isCurrentMonth) {
                    // Logic to add all days in range to the Set if they fall in current month
                    const monthStart = new Date(currentYear, currentMonth, 1);
                    const monthEnd = new Date(currentYear, currentMonth + 1, 0);

                    const overlapStart = start < monthStart ? monthStart : start;
                    const overlapEnd = end > monthEnd ? monthEnd : end;

                    if (overlapStart <= overlapEnd) {
                        const daysInMonth = differenceInCalendarDays(overlapEnd, overlapStart) + 1;
                        // Ideally we iterate and add distinct days, but for "Days Worked" count, 
                        // adding unique strings is best.
                        // Let's iterate the overlap range.
                        for (let i = 0; i < daysInMonth; i++) {
                            const day = new Date(overlapStart);
                            day.setDate(day.getDate() + i);
                            uniqueDays.add(format(day, 'yyyy-MM-dd'));
                        }
                    }
                }
            }
        });

        return {
            currentMonthName,
            daysWorkedCurrentMonth: uniqueDays.size,
            totalParticularHours,
            totalTutorialDays
        };
    }, [workLogs]);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current && current.key === key) {
                if (current.direction === 'asc') return { key, direction: 'desc' };
                return null;
            }
            return { key, direction: 'asc' };
        });
    };

    if (isLoadingUser) return <div className="p-8">Loading user details...</div>;
    if (isErrorUser) return (
        <div className="p-8 text-red-500">
            Error loading user details: {errorUser?.message || "Unknown Error"}
            <pre className="mt-2 text-xs bg-slate-100 p-2 rounded text-slate-800">
                {JSON.stringify(errorUser, null, 2)}
            </pre>
        </div>
    );
    if (!user) return <div className="p-8">User not found.</div>;

    const filterConfig: FilterConfig[] = [
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

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
            </Button>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                        <UserIcon size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{user.first_name} {user.last_name}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span>{user.email}</span>
                            <span>•</span>
                            <Badge variant={user.is_active ? "default" : "destructive"}>
                                {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Badge variant="outline" className="font-mono text-xs text-muted-foreground">{user.id}</Badge>
                        </div>
                        <div className="flex gap-2 mt-1">
                            {user.is_active_worker && <Badge variant="secondary" className="text-xs border-green-200 bg-green-50 text-green-700">Worker</Badge>}
                            {user.is_supervisor && <Badge variant="secondary" className="text-xs border-blue-200 bg-blue-50 text-blue-700">Supervisor</Badge>}
                            <span className="text-xs text-muted-foreground flex items-center ml-2">
                                <Calendar className="w-3 h-3 mr-1" /> Moved/Created: {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Tabs & Content */}
            <Tabs defaultValue="dashboard" className="w-full">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="work-logs">Work History</TabsTrigger>
                    <TabsTrigger value="rates">Rates</TabsTrigger>
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

                <TabsContent value="work-logs" className="space-y-4">
                    {isLogsError && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
                            Error loading work logs: {(logsError as any)?.message || "Unknown error"}
                        </div>
                    )}
                    <FilterBar config={filterConfig} onFilterChange={setFilters} />
                    <Card>
                        <CardHeader>
                            <CardTitle>Work History</CardTitle>
                            <CardDescription>Records of work performed by this user.</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                                        <TableHead className="cursor-pointer hover:bg-slate-800 transition-colors text-slate-50" onClick={() => handleSort('duration')}>
                                            <div className="flex items-center gap-1">
                                                Duration/Days
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
                                            <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                                                No work logs found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredLogs.reduce((acc: React.ReactNode[], log: any, index: number, array: any[]) => {
                                            if (filters.groupBy === 'month') {
                                                const currentDateStr = log.type === 'tutorial' ? log.startDate : log.date;
                                                const prevDateStr = index > 0 ? (array[index - 1].type === 'tutorial' ? array[index - 1].startDate : array[index - 1].date) : null;

                                                if (currentDateStr) {
                                                    const currentMonth = format(new Date(currentDateStr), 'MMMM yyyy');
                                                    const prevMonth = prevDateStr ? format(new Date(prevDateStr), 'MMMM yyyy') : null;

                                                    if (currentMonth !== prevMonth) {
                                                        acc.push(
                                                            <TableRow key={`header-${currentMonth}`} className="bg-muted/50 hover:bg-muted/50">
                                                                <TableCell colSpan={6} className="font-semibold text-sm py-2">
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
                                                    onClick={() => setSelectedLog(log)}
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
                                                    <TableCell className="capitalize py-2">{log.type}</TableCell>

                                                    <TableCell className="py-2">
                                                        <div className="flex items-center gap-2 max-w-[200px] truncate" title={log.client || ''}>
                                                            {log.client && <UserIcon className="h-3 w-3 text-muted-foreground shrink-0" />}
                                                            <span className="truncate">{log.client || '-'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2">
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
                                                    <TableCell className="py-2">
                                                        {log.type === 'particular'
                                                            ? `${log.durationHours} h`
                                                            : log.startDate && log.endDate
                                                                ? `${(new Date(log.endDate).getTime() - new Date(log.startDate).getTime()) / (1000 * 3600 * 24) + 1} days`
                                                                : '-'}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        {(() => {
                                                            const rate = rates.find((r: any) => r.companyId === log.companyId);
                                                            if (!rate) return log.amount ? `€${Number(log.amount).toFixed(2)}` : '-';

                                                            let totalGross = 0;

                                                            if (log.type === 'tutorial' && log.startDate && log.endDate) {
                                                                const start = parseISO(log.startDate);
                                                                const end = parseISO(log.endDate);
                                                                const days = differenceInCalendarDays(end, start) + 1;
                                                                const appliedRate = Number(log.rateApplied) || Number(rate.dailyRate) || 0;

                                                                totalGross += days * appliedRate;

                                                                if (log.hasNight) {
                                                                    let nightBase = days > 0 ? days - 1 : 0;
                                                                    const nights = log.arrivesPrior ? nightBase + 1 : nightBase;
                                                                    totalGross += nights * Number(rate.nightRate || 30);
                                                                }

                                                                if (log.hasCoordination) {
                                                                    totalGross += days * Number(rate.coordinationRate || 10);
                                                                }
                                                            } else {
                                                                // Particular
                                                                const duration = Number(log.durationHours) || 0;
                                                                const appliedRate = Number(log.rateApplied) || Number(rate.hourlyRate) || 0;

                                                                totalGross += duration * appliedRate;

                                                                if (log.hasNight) {
                                                                    totalGross += Number(rate.nightRate || 30);
                                                                }
                                                                if (log.hasCoordination) {
                                                                    totalGross += Number(rate.coordinationRate || 10);
                                                                }
                                                            }

                                                            return `€${totalGross.toFixed(2)}`;
                                                        })()}
                                                    </TableCell>

                                                    <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
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

                <TabsContent value="rates" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Defined Rates</CardTitle>
                            <CardDescription>Associated companies and specific billing rates.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {visibleCompanies.map((company: any) => {
                                const companyRate = visibleRates.find((r: any) => r.companyId === company.id);
                                if (!companyRate) return null;

                                return (
                                    <div key={company.id} className="border rounded-md overflow-hidden">
                                        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b font-medium flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                            {company.name}
                                        </div>
                                        <Table>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell className="font-medium text-muted-foreground w-1/3">Hourly Rate</TableCell>
                                                    <TableCell>€{Number(companyRate.hourlyRate).toFixed(2)}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-medium text-muted-foreground">Daily Rate</TableCell>
                                                    <TableCell>€{Number(companyRate.dailyRate).toFixed(2)}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-medium text-muted-foreground">Coordination</TableCell>
                                                    <TableCell>€{Number(companyRate.coordinationRate).toFixed(2)}</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-medium text-muted-foreground">Type</TableCell>
                                                    <TableCell><Badge variant="outline">{companyRate.isGross ? "Gross" : "Net"}</Badge></TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-medium text-muted-foreground">IRPF</TableCell>
                                                    <TableCell>{companyRate.deductionIrpf || 0}%</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    <TableCell className="font-medium text-muted-foreground">SS</TableCell>
                                                    <TableCell>{companyRate.deductionSs !== undefined && companyRate.deductionSs !== null ? `${companyRate.deductionSs}%` : "Default"}</TableCell>
                                                </TableRow>
                                                {companyRate.deductionExtra > 0 && (
                                                    <TableRow>
                                                        <TableCell className="font-medium text-muted-foreground">Extra Deduction</TableCell>
                                                        <TableCell>{companyRate.deductionExtra}%</TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                );
                            })}
                            {visibleRates.length === 0 && (
                                <div className="text-center text-muted-foreground py-8">
                                    No specific rates configured for visible companies.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <WorkLogDetailsDialog
                log={selectedLog}
                open={!!selectedLog}
                onOpenChange={(open) => !open && setSelectedLog(null)}
                userSettings={effectiveUserSettings}
            />

            <UserCreateWorkLogDialog
                open={editLogState.open}
                onOpenChange={(open) => setEditLogState(prev => ({ ...prev, open }))}
                logToEdit={editLogState.data as WorkLog}
                user={user}
                companies={visibleCompanies}
                onLogUpdate={() => {
                    queryClient.invalidateQueries({ queryKey: ["workLogs", userId] });
                    setEditLogState({ open: false });
                }}
            >
                <span className="hidden" />
            </UserCreateWorkLogDialog>
        </div>
    );
}

// Simple FileText Icon component since lucide-react import might be tricky with just 'FileText' if not standard
function FileText({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
        </svg>
    )
}
