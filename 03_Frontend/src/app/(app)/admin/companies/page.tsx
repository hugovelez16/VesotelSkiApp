"use client";

import { useQuery } from "@tanstack/react-query";
import { getCompaniesDetailed } from "@/lib/api/companies";
import { CompanyDialog } from "@/components/admin/company-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

import { FilterBar, FilterConfig } from "@/components/ui/filter-bar";
import { useState, useMemo } from "react";

export default function AdminCompaniesPage() {
    const router = useRouter();
    const [filters, setFilters] = useState<Record<string, any>>({});

    const { data: companies = [], isLoading } = useQuery({
        queryFn: getCompaniesDetailed,
        queryKey: ["companiesDetailed"],
    });

    const filteredCompanies = useMemo(() => {
        let result = [...companies];

        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(c =>
                c.name.toLowerCase().includes(q) ||
                (c.fiscal_id && c.fiscal_id.toLowerCase().includes(q))
            );
        }

        return result;
    }, [companies, filters]);

    const filterConfig: FilterConfig[] = [
        // No specific facets for companies yet, just search
        // Maybe Fiscal ID presence?
    ];

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-6 w-6" />
                        <h1 className="text-2xl font-bold tracking-tight">Companies Management</h1>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[150px] w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Building2 className="h-6 w-6" />
                    <h1 className="text-2xl font-bold tracking-tight">Companies Management</h1>
                </div>
                <CompanyDialog />
            </div>

            <FilterBar config={filterConfig} onFilterChange={setFilters} />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredCompanies.length === 0 ? (
                    <div className="col-span-full text-center p-8 text-muted-foreground border rounded-lg border-dashed">
                        No companies found matching your filters.
                    </div>
                ) : (
                    filteredCompanies.map((company) => {
                        const activeCount = company.members?.filter(m => m.status === 'active').length || 0;
                        const pendingCount = company.members?.filter(m => m.status === 'pending').length || 0;
                        const managerCount = company.members?.filter(m => m.role === 'manager').length || 0;

                        return (
                            <Card
                                key={company.id}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => router.push(`/admin/companies/${company.id}`)}
                            >
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex justify-between items-start">
                                        <span className="truncate pr-2">{company.name}</span>
                                        {pendingCount > 0 && (
                                            <Badge variant="destructive" className="text-xs">
                                                {pendingCount} pending
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    <CardDescription>{company.fiscal_id || "No Fiscal ID"}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Users className="h-4 w-4" />
                                            <span>{activeCount} Active</span>
                                        </div>
                                        {managerCount > 0 && (
                                            <div className="flex items-center gap-1">
                                                <Badge variant="secondary" className="text-[10px] h-5">
                                                    {managerCount} Managers
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
