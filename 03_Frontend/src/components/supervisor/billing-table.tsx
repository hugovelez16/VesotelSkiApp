"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CompanySettings, WorkLog } from "@/lib/types";
import { useState } from "react";
import { BillingBreakdownDialog } from "./billing-breakdown-dialog";

export interface BillingRow {
    userId: string;
    userName: string;
    userEmail: string;
    particularHours: number;
    particularAmount: number;
    particularGrossAmount: number; // New
    tutorialDays: number;
    tutorialAmount: number;
    tutorialGrossAmount: number; // New
    coordinatedDays: number;
    coordinatedAmount: number;
    coordinatedGrossAmount: number; // New
    nightShifts: number;
    nightAmount: number;
    nightGrossAmount: number; // New
    totalAmount: number;
    totalGrossAmount: number; // New
    rates?: any; // UserCompanyRate
    logs: WorkLog[];
}

interface BillingTableProps {
    data: BillingRow[];
    isLoading?: boolean;
    settings?: CompanySettings;
}

export function BillingTable({ data, isLoading, settings }: BillingTableProps) {
    // Default to true if settings are not loaded yet or undefined
    const showTutorials = settings?.features?.tutorials !== false;
    const showCoordination = settings?.features?.coordination !== false;
    const showNights = settings?.features?.night_shifts !== false;

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
    }

    const [selectedRow, setSelectedRow] = useState<BillingRow | null>(null);

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-900 hover:bg-slate-900 border-none">
                        <TableHead className="text-slate-50 font-medium rounded-tl-md pl-4">Nombre del usuario</TableHead>
                        <TableHead className="text-right text-slate-50 font-medium">Horas Particulares</TableHead>
                        {showTutorials && <TableHead className="text-right text-slate-50 font-medium">D&iacute;as Tutoriales</TableHead>}
                        {showCoordination && <TableHead className="text-right text-slate-50 font-medium">D&iacute;as Coordinados</TableHead>}
                        {showNights && <TableHead className="text-right text-slate-50 font-medium">Nocturnidades</TableHead>}
                        <TableHead className="text-right text-slate-50 font-medium rounded-tr-md pr-4">Total Bruto</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                No employees found for this period/company.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((row) => (
                            <TableRow
                                key={row.userId}
                                className="transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 even:bg-slate-50 dark:even:bg-slate-900 cursor-pointer"
                                onClick={() => setSelectedRow(row)}
                            >
                                <TableCell className="font-medium py-3 pl-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.userName}</span>
                                        <span className="text-xs text-muted-foreground">{row.userEmail}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right py-3 text-slate-700 dark:text-slate-300">
                                    {row.particularHours.toFixed(2)} h
                                </TableCell>
                                {showTutorials && (
                                    <TableCell className="text-right py-3 text-slate-700 dark:text-slate-300">
                                        {row.tutorialDays}
                                    </TableCell>
                                )}
                                {showCoordination && (
                                    <TableCell className="text-right py-3 text-slate-700 dark:text-slate-300">
                                        {row.coordinatedDays}
                                    </TableCell>
                                )}
                                {showNights && (
                                    <TableCell className="text-right py-3 text-slate-700 dark:text-slate-300">
                                        {row.nightShifts}
                                    </TableCell>
                                )}
                                <TableCell className="text-right font-bold py-3 pr-4 text-emerald-600 dark:text-emerald-400">
                                    {new Intl.NumberFormat("es-ES", {
                                        style: "currency",
                                        currency: "EUR",
                                    }).format(row.totalGrossAmount || row.totalAmount)}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <BillingBreakdownDialog
                open={!!selectedRow}
                onOpenChange={(open) => !open && setSelectedRow(null)}
                row={selectedRow}
            />
        </div>
    );
}
