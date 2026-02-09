
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompaniesDetailed, updateMemberStatus, updateCompanyMember, notifyCompanyMember, getCompanyRates } from "@/lib/api/companies";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Shield, User, Mail, ArrowLeft, Loader2, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddMemberDialog } from "@/components/admin/add-member-dialog";
import { CompanyConfigurationTab } from "@/components/admin/company-configuration-tab";
import { MemberSettingsDialog } from "@/components/admin/member-settings-dialog";
import { UserCompanyRate } from "@/lib/types";
import { DailyReportView } from "@/components/admin/daily-report-view";
import { FilterBar, FilterConfig } from "@/components/ui/filter-bar";
import { useState, useMemo } from "react";

export default function CompanyDetailsPage() {
    const { companyId } = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch all companies detailed (inefficient but matches existing pattern for now)
    // Ideally we should have getCompany(id) endpoint
    const { data: companies = [], isLoading } = useQuery({
        queryFn: getCompaniesDetailed,
        queryKey: ["companiesDetailed"],
    });

    const company = companies.find(c => c.id === companyId);

    const statusMutation = useMutation({
        mutationFn: ({ userId, status }: { userId: string, status: string }) =>
            updateMemberStatus(companyId as string, userId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["companiesDetailed"] });
            toast({ title: "Status updated" });
        },
        onError: () => toast({ title: "Failed", variant: "destructive" })
    });

    const roleMutation = useMutation({
        mutationFn: ({ userId, role }: { userId: string, role: string }) =>
            updateCompanyMember(companyId as string, userId, { role }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["companiesDetailed"] });
            toast({ title: "Role updated" });
        },
        onError: () => toast({ title: "Failed", variant: "destructive" })
    });

    const notifyMutation = useMutation({
        mutationFn: ({ userId }: { userId: string }) =>
            notifyCompanyMember(companyId as string, userId),
        onSuccess: () => {
            toast({ title: "Notification Sent", description: "The user has been emailed about their status." });
        },
        onError: () => toast({ title: "Failed to send email", variant: "destructive" })
    });

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;
    if (!company) return <div className="p-8">Company not found</div>;

    const workers = company.members.filter(m => m.role === 'worker');
    const supervisors = company.members.filter(m => m.role === 'manager');
    const pending = company.members.filter(m => m.status === 'pending');



    const [workerFilters, setWorkerFilters] = useState<Record<string, any>>({});
    const [supervisorFilters, setSupervisorFilters] = useState<Record<string, any>>({});

    // Worker Filtering
    const filteredWorkers = useMemo(() => {
        let result = [...workers];

        if (workerFilters.search) {
            const q = workerFilters.search.toLowerCase();
            result = result.filter(m =>
                m.user?.first_name?.toLowerCase().includes(q) ||
                m.user?.last_name?.toLowerCase().includes(q) ||
                m.user?.email?.toLowerCase().includes(q)
            );
        }

        if (workerFilters.status && workerFilters.status.length > 0) {
            result = result.filter(m => workerFilters.status.includes(m.status));
        }

        return result;
    }, [workers, workerFilters]);

    // Supervisor Filtering
    const filteredSupervisors = useMemo(() => {
        let result = [...supervisors];

        if (supervisorFilters.search) {
            const q = supervisorFilters.search.toLowerCase();
            result = result.filter(m =>
                m.user?.first_name?.toLowerCase().includes(q) ||
                m.user?.last_name?.toLowerCase().includes(q) ||
                m.user?.email?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [supervisors, supervisorFilters]);

    const workerFilterConfig: FilterConfig[] = [
        {
            id: "status",
            label: "Status",
            type: "select",
            options: [
                { label: "Active", value: "active" },
                { label: "Pending", value: "pending" },
                { label: "Rejected", value: "rejected" },
            ]
        }
    ];

    const supervisorFilterConfig: FilterConfig[] = []; // Just search for now

    // Calculate simple stats (Keep original logic for Dashboard if needed, but using original arrays)
    const activeWorkers = workers.filter(m => m.status === 'active').length;
    const activeSupervisors = supervisors.filter(m => m.status === 'active').length;

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink onClick={() => router.push('/admin/companies')} className="cursor-pointer">Companies</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{company.name} Details</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
                    <p className="text-muted-foreground">Manage members, roles, and tax settings.</p>
                </div>
                <div className="flex gap-2">
                    <AddMemberDialog companyId={company.id} companyName={company.name} existingMembers={company.members} />
                </div>
            </div>

            <Tabs defaultValue="workers" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                    <TabsTrigger value="workers">Workers ({workers.length})</TabsTrigger>
                    <TabsTrigger value="supervisors">Supervisors ({supervisors.length})</TabsTrigger>
                    <TabsTrigger value="taxes">Taxes</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>



                {/* DAILY REPORT TAB */}
                <TabsContent value="daily-report" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Report (Parte Diario)</CardTitle>
                            <CardDescription>View user activity for a specific day.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DailyReportView companyId={company.id} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* WORKERS TAB */}
                <TabsContent value="workers" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Workers Management</CardTitle>
                            <CardDescription>Manage regular employees and promote them to high roles.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <FilterBar config={workerFilterConfig} onFilterChange={setWorkerFilters} />
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredWorkers.map((member) => (
                                        <TableRow key={member.user_id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{member.user?.first_name} {member.user?.last_name}</span>
                                                    <span className="text-xs text-muted-foreground">{member.user?.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={member.status === 'active' ? 'default' : member.status === 'pending' ? 'secondary' : 'destructive'}>
                                                    {member.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => roleMutation.mutate({ userId: member.user_id, role: 'manager' })}
                                                        title="Promote to Supervisor"
                                                    >
                                                        <Shield className="h-4 w-4 mr-1" />
                                                        Promote
                                                    </Button>

                                                    {member.status !== 'active' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-green-600"
                                                            onClick={() => statusMutation.mutate({ userId: member.user_id, status: 'active' })}
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    {member.status === 'active' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-red-600"
                                                            onClick={() => statusMutation.mutate({ userId: member.user_id, status: 'rejected' })}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}

                                                    <Button variant="ghost" size="icon" onClick={() => notifyMutation.mutate({ userId: member.user_id })} title="Send Notification Email">
                                                        <Mail className="h-4 w-4" />
                                                    </Button>

                                                    <MemberSettingsDialog
                                                        companyId={company.id}
                                                        userId={member.user_id}
                                                        memberName={(member.user?.first_name || '') + ' ' + (member.user?.last_name || '')}
                                                        initialSettings={member.settings}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {workers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No workers found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SUPERVISORS TAB */}
                <TabsContent value="supervisors" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Supervisors</CardTitle>
                            <CardDescription>Users with Manager/Supervisor privileges for this company.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-4">
                                <FilterBar config={supervisorFilterConfig} onFilterChange={setSupervisorFilters} />
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSupervisors.map((member) => (
                                        <TableRow key={member.user_id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{member.user?.first_name} {member.user?.last_name}</span>
                                                    <span className="text-xs text-muted-foreground">{member.user?.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="default" className="bg-indigo-500">Supervisor</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => roleMutation.mutate({ userId: member.user_id, role: 'worker' })}
                                                        title="Demote to Worker"
                                                    >
                                                        Demote
                                                    </Button>

                                                    <Button variant="ghost" size="icon" onClick={() => notifyMutation.mutate({ userId: member.user_id })} title="Send Notification Email">
                                                        <Mail className="h-4 w-4" />
                                                    </Button>
                                                    <MemberSettingsDialog
                                                        companyId={company.id}
                                                        userId={member.user_id}
                                                        memberName={(member.user?.first_name || '') + ' ' + (member.user?.last_name || '')}
                                                        initialSettings={member.settings}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {supervisors.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No supervisors found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAXES TAB */}
                <TabsContent value="taxes" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tax Configuration</CardTitle>
                            <CardDescription>Overview of tax configuration for all members.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TaxOverview companyId={company.id} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="pt-4">
                    <CompanyConfigurationTab company={company} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function TaxOverview({ companyId }: { companyId: string }) {
    const { data: rates = [], isLoading } = useQuery({
        queryKey: ["companyRates", companyId],
        queryFn: () => getCompanyRates(companyId),
    });

    const formatPercent = (val?: number) => {
        if (val === undefined || val === null) return "-";
        return `${(val * 100).toFixed(2)}%`;
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="rounded-md border bg-card overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-900 hover:bg-slate-900 border-none">
                        <TableHead className="text-slate-50 rounded-tl-md">Member</TableHead>
                        <TableHead className="text-slate-50">Gross Price?</TableHead>
                        <TableHead className="text-slate-50">SS %</TableHead>
                        <TableHead className="text-slate-50">IRPF %</TableHead>
                        <TableHead className="text-slate-50 rounded-tr-md">Extra %</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rates.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No rates configured yet.</TableCell>
                        </TableRow>
                    ) : (
                        rates.map((rate: UserCompanyRate) => {
                            const userName = rate.user ? `${rate.user.first_name || ''} ${rate.user.last_name || ''}` : 'Unknown User';
                            return (
                                <TableRow key={rate.userId} className="transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 even:bg-slate-100 dark:even:bg-slate-800">
                                    <TableCell className="font-medium py-1">{userName}</TableCell>
                                    <TableCell className="py-1">
                                        {rate.isGross ?
                                            <span className="flex items-center text-green-600 gap-1"><Check className="h-4 w-4" /> Yes</span> :
                                            <span className="flex items-center text-gray-500 gap-1"><X className="h-4 w-4" /> No</span>
                                        }
                                    </TableCell>
                                    <TableCell className="py-1">{rate.deductionSs !== undefined && rate.deductionSs !== null ? formatPercent(rate.deductionSs) : <span className="text-muted-foreground italic">Default</span>}</TableCell>
                                    <TableCell className="py-1">{formatPercent(rate.deductionIrpf || 0)}</TableCell>
                                    <TableCell className="py-1">{formatPercent(rate.deductionExtra || 0)}</TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

// Helper icon component
function UsersIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
