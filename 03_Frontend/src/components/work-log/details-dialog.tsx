"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { WorkLog, UserSettings } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface WorkLogDetailsDialogProps {
    log: WorkLog | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userSettings?: UserSettings | null;
    onEdit?: (log: WorkLog) => void;
    onDelete?: (log: WorkLog) => void;
}

export function WorkLogDetailsDialog({ log, open, onOpenChange, userSettings, onEdit, onDelete }: WorkLogDetailsDialogProps) {
    if (!log) return null;

    const isTutorial = log.type === 'tutorial';

    // Breakdown Calculation Logic
    let breakdown = [];
    let totalGross = 0;

    if (isTutorial && log.startDate && log.endDate) {
        const start = parseISO(log.startDate);
        const end = parseISO(log.endDate);
        const days = differenceInCalendarDays(end, start) + 1;
        const rate = log.rateApplied || 0;
        const baseTotal = days * rate;

        breakdown.push({ label: `${days}d x ${rate.toFixed(2)}€ (Tutorial)`, value: baseTotal });
        totalGross += baseTotal;

        if (log.hasNight) {
            let nightBase = days > 0 ? days - 1 : 0;
            const nights = log.arrivesPrior ? nightBase + 1 : nightBase;
            const nightRate = userSettings?.nightRate ?? 30;
            const nightTotal = nights * nightRate;

            breakdown.push({ label: `${nights} nights (noches) x ${formatCurrency(nightRate)} / night (noche)`, value: nightTotal });
            totalGross += nightTotal;
        }

        if (log.hasCoordination) {
            const coordinationRate = userSettings?.coordinationRate ?? 10;
            const coordinationTotal = days * coordinationRate;
            breakdown.push({ label: `${days} days (días) x ${formatCurrency(coordinationRate)} (Coordination/Coordinación)`, value: coordinationTotal });
            totalGross += coordinationTotal;
        }

    } else if (!isTutorial && log.date) {
        const duration = log.durationHours || 0;
        // Fallback: If rateApplied is missing, infer it from the total amount
        const rate = log.rateApplied || (log as any).rate_applied || (duration ? (log.amount || 0) / duration : 0);
        const baseTotal = duration * rate;

        breakdown.push({ label: `${duration.toFixed(2)}h x ${rate.toFixed(2)}€`, value: baseTotal });
        totalGross += baseTotal;

        if (log.hasNight) {
            const nightRate = userSettings?.nightRate ?? 30;
            breakdown.push({ label: `Night Supplement (Plus nocturnidad)`, value: nightRate });
            totalGross += nightRate;
        }

        if (log.hasCoordination) {
            const coordinationRate = userSettings?.coordinationRate ?? 10;
            breakdown.push({ label: `Coordination Supplement (Plus coordinación)`, value: coordinationRate });
            totalGross += coordinationRate;
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Work Log Details</DialogTitle>
                    <DialogDescription>
                        Full breakdown of the price calculation.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <h4 className="font-semibold text-muted-foreground">Type</h4>
                            <p className="capitalize">{log.type}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-muted-foreground">Client</h4>
                            <p>{log.client || '-'}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-muted-foreground">Date</h4>
                            {isTutorial ? (
                                <p>{log.startDate ? format(parseISO(log.startDate), 'dd/MM/yyyy') : '-'} - {log.endDate ? format(parseISO(log.endDate), 'dd/MM/yy') : '-'}</p>
                            ) : (
                                <p>{log.date ? format(parseISO(log.date), 'dd/MM/yyyy') : '-'}</p>
                            )}
                        </div>
                        <div>
                            <h4 className="font-semibold text-muted-foreground">Time</h4>
                            {isTutorial ? (
                                <p>{log.startDate && log.endDate ? differenceInCalendarDays(parseISO(log.endDate), parseISO(log.startDate)) + 1 : 0} days</p>
                            ) : (
                                <p>{log.startTime} - {log.endTime} ({log.durationHours?.toFixed(2)}h)</p>
                            )}
                        </div>
                    </div>

                    <div className="border-t pt-4 bg-slate-50 p-4 rounded-md">
                        <h4 className="font-semibold mb-2">Price Breakdown</h4>
                        <div className="space-y-2">
                            {breakdown.map((item, index) => (
                                <div key={index} className="flex justify-between">
                                    <span>{item.label}</span>
                                    <span>{formatCurrency(item.value)}</span>
                                </div>
                            ))}

                            <div className="border-t border-slate-300 my-2"></div>

                            <div className="flex justify-between font-bold">
                                <span>Total Gross</span>
                                <span>{formatCurrency(totalGross)}</span>
                            </div>

                            {/* Social Security Deduction */}
                            {userSettings?.deductionSs !== undefined && userSettings.deductionSs > 0 && (
                                <div className="flex justify-between text-red-500 text-xs mt-1">
                                    <span>Retención SS ({(userSettings.deductionSs * 100).toFixed(2)}%)</span>
                                    <span>-{formatCurrency(totalGross * userSettings.deductionSs)}</span>
                                </div>
                            )}

                            {/* IRPF Deduction */}
                            {userSettings?.deductionIrpf !== undefined && userSettings.deductionIrpf > 0 && (
                                <div className="flex justify-between text-red-500 text-xs mt-1">
                                    <span>Retención IRPF ({(userSettings.deductionIrpf * 100).toFixed(2)}%)</span>
                                    <span>-{formatCurrency(totalGross * userSettings.deductionIrpf)}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-green-600 font-bold border-t border-slate-200 mt-2 pt-2">
                                <span>Total Net</span>
                                <span>
                                    {formatCurrency(
                                        totalGross * (1 - ((userSettings?.deductionIrpf || 0) + (userSettings?.deductionSs || 0)))
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground mt-2">
                        Log ID: {log.id}
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                    <div className="flex gap-2 w-full sm:w-auto mr-auto">
                        {onEdit && (
                            <Button variant="secondary" onClick={() => onEdit(log)}>
                                Edit
                            </Button>
                        )}
                        {onDelete && (
                            <Button variant="destructive" onClick={() => onDelete(log)}>
                                Delete
                            </Button>
                        )}
                    </div>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
