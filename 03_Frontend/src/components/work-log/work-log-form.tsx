
import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar-rac";
import { RangeCalendar } from "@/components/ui/calendar-rac";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO, differenceInHours } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { parseDate } from "@internationalized/date";
import type { DateValue } from "react-aria-components";
import type { WorkLog, WorkLogCreate } from "@/lib/types";
import { getUserRates } from "@/lib/api/settings"; // Needed to fetch default rates
import { useAuth } from "@/context/AuthContext"; // Import AuthContext

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface WorkLogFormProps {
    formData: Partial<WorkLogCreate>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<WorkLogCreate>>>;
    logType: 'particular' | 'tutorial';
    setLogType: (type: 'particular' | 'tutorial') => void;
    companies: any[];
    defaultCompanyId?: string | null;
}

export function WorkLogForm({ formData, setFormData, logType, setLogType, companies, defaultCompanyId }: WorkLogFormProps) {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [personalRate, setPersonalRate] = useState<number>(0);
    const [manualAmount, setManualAmount] = useState<string>("");

    const { user } = useAuth(); // Need to access user for default company

    // Filter companies: If user is provided, show only their "active" companies.
    // However, if we assume 'companies' prop passed here is alrady filtered by parent, we might not need to.
    // But parent (details-dialog) passes `companies` from `useCompanies` hook which returns ALL or AVAILABLE?
    // Let's assume parent should pass user's companies, OR we filter here if we had user's memberships.
    // Logic: 
    // - Companies list passed to form should effectively be the list of companies this user CAN log to.
    // - Pre-selection logic needs 'user.default_company_id'.

    const selectedCompany = companies.find(c => c.id === formData.companyId);
    const isPersonal = selectedCompany?.name === "Personal"; // Legacy check, better to use settings
    const companySettings = selectedCompany?.settings || {};

    // Feature Flags
    const allowTutorial = companySettings.features?.tutorials !== false;
    const allowCoordination = companySettings.features?.coordination !== false;
    const allowNight = companySettings.features?.night_shifts !== false;
    const allowSupplements = companySettings.features?.supplements === true;
    const allowPickupPoint = companySettings.features?.pickup_point === true;

    // Billing Config
    const isNetPrice = companySettings.billing?.price_type === 'net';
    const isManualTotal = companySettings.input_mode === 'manual_total';

    // Force logType reset if tutorial not allowed
    useEffect(() => {
        if (!allowTutorial && logType === 'tutorial') {
            setLogType('particular');
        }
    }, [allowTutorial, logType, setLogType]);

    // Set default company on mount if not set
    useEffect(() => {
        if (companies.length > 0 && !formData.companyId) {
            let defaultId = "";

            // 1. Try passed defaultCompanyId (Target User Preference)
            if (defaultCompanyId) {
                const found = companies.find(c => c.id === defaultCompanyId);
                if (found) defaultId = found.id;
            }

            // 2. Try User's default preference (Auth User - Fallback)
            if (!defaultId && user?.default_company_id) {
                const found = companies.find(c => c.id === user.default_company_id);
                if (found) defaultId = found.id;
            }

            // 3. Fallback to "Personal"
            if (!defaultId) {
                const personal = companies.find(c => c.name === "Personal");
                if (personal) defaultId = personal.id;
            }

            // 4. Fallback to first available
            if (!defaultId) {
                defaultId = companies[0].id;
            }

            if (defaultId) {
                setFormData(prev => ({ ...prev, companyId: defaultId }));
            }
        }
    }, [companies, formData.companyId, user?.default_company_id, defaultCompanyId, setFormData]);

    // Reset fields on type change
    useEffect(() => {
        if (logType === 'particular') {
            setFormData(prev => ({ ...prev, arrivesPrior: false, hasNight: false }));
        }
    }, [logType, setFormData]);

    // Fetch user rates for Personal company to init default rate
    useEffect(() => {
        if (isPersonal && formData.companyId && !personalRate) {
            getUserRates().then(rates => {
                const rate = rates.find(r => r.companyId === formData.companyId);
                if (rate) {
                    setPersonalRate(rate.hourlyRate || 0);
                }
            });
        }
    }, [isPersonal, formData.companyId, personalRate]);

    // Calculate duration for validation/auto-calc
    const calculateDuration = () => {
        if (logType === 'particular' && formData.startTime && formData.endTime) {
            const start = new Date(`2000-01-01T${formData.startTime}:00`);
            const end = new Date(`2000-01-01T${formData.endTime}:00`);
            let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            if (diff < 0) diff += 24;
            return diff;
        }
        return 0;
    };

    // Auto-update amount if rate changes and amount wasn't manually set to something else (optional behavior)
    useEffect(() => {
        if (isPersonal && logType === 'particular') {
            const duration = calculateDuration();
            if (duration > 0 && personalRate > 0) {
                // Only overwrite if we assume rate drives amount by default
                setManualAmount((duration * personalRate).toFixed(2));
                setFormData(prev => ({ ...prev, amount: duration * personalRate }));
            }
        }
    }, [personalRate, formData.startTime, formData.endTime, isPersonal, logType, setFormData]);

    const handleManualAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setManualAmount(e.target.value);
        setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }));
    };

    const handleCompanyChange = (value: string) => {
        setFormData(prev => ({ ...prev, companyId: value }));
    };

    const handleDateChange = (field: 'date' | 'startDate' | 'endDate', value: DateValue) => {
        if (value) {
            setFormData(prev => ({ ...prev, [field]: value.toString() }));
        }
    };

    const handleRangeChange = (range: { start: DateValue, end: DateValue } | null) => {
        if (range) {
            setFormData(prev => ({
                ...prev,
                startDate: range.start.toString(),
                endDate: range.end.toString()
            }));
            if (range.end) {
                setIsCalendarOpen(false);
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSwitchChange = (name: keyof WorkLogCreate, checked: boolean) => {
        setFormData(prev => ({ ...prev, [name]: checked }));
    };

    return (
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label className="text-left sm:text-right">Empresa</Label>
                <Select value={formData.companyId} onValueChange={handleCompanyChange}>
                    <SelectTrigger className="w-full sm:col-span-3">
                        <SelectValue placeholder="Selecciona una empresa" />
                    </SelectTrigger>
                    <SelectContent>
                        {companies.filter(c => c.id).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label className="text-left sm:text-right">Tipo</Label>
                <RadioGroup value={logType} defaultValue="particular" className="sm:col-span-3 flex gap-4" onValueChange={(value: 'particular' | 'tutorial') => setLogType(value)}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="particular" id="r1" />
                        <Label htmlFor="r1">Particular</Label>
                    </div>
                    {allowTutorial && (
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="tutorial" id="r2" />
                            <Label htmlFor="r2">Tutorial</Label>
                        </div>
                    )}
                </RadioGroup>
            </div>

            {logType === 'particular' ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <Label htmlFor="date" className="text-left sm:text-right">Fecha</Label>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full sm:col-span-3 justify-start text-left font-normal truncate", !formData.date && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                    {formData.date ? format(new Date(formData.date), "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    value={formData.date ? parseDate(formData.date) : undefined as any}
                                    onChange={(d: any) => { handleDateChange('date', d); setIsCalendarOpen(false); }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <Label htmlFor="startTime" className="text-left sm:text-right">Hora Inicio</Label>
                        <Input id="startTime" name="startTime" type="time" className="w-full sm:col-span-3" value={formData.startTime || ''} onChange={handleInputChange} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <Label htmlFor="endTime" className="text-left sm:text-right">Hora Fin</Label>
                        <Input id="endTime" name="endTime" type="time" className="w-full sm:col-span-3" value={formData.endTime || ''} onChange={handleInputChange} />
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                    <Label className="text-left sm:text-right">Rango de Fechas</Label>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full sm:col-span-3 justify-start text-left font-normal truncate", (!formData.startDate || !formData.endDate) && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                {formData.startDate && formData.endDate ? (
                                    <>
                                        {format(parseISO(formData.startDate), "PPP", { locale: es })} -{" "}
                                        {format(parseISO(formData.endDate), "PPP", { locale: es })}
                                    </>
                                ) : (
                                    <span>Selecciona un rango</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <RangeCalendar
                                value={formData.startDate && formData.endDate ? { start: parseDate(formData.startDate), end: parseDate(formData.endDate) } : null as any}
                                onChange={(range: any) => handleRangeChange(range)}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            )}

            {isManualTotal && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <Label className="text-left sm:text-right">Precio Hora</Label>
                        <Input
                            type="number"
                            value={personalRate}
                            onChange={(e) => setPersonalRate(parseFloat(e.target.value))}
                            className="w-full sm:col-span-3"
                            placeholder="Default rate"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <Label className="text-left sm:text-right">Total (€)</Label>
                        <Input
                            type="number"
                            value={manualAmount}
                            onChange={handleManualAmountChange}
                            className="w-full sm:col-span-3"
                            placeholder="Calculate or manual override"
                        />
                    </div>
                </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="description" className="text-left sm:text-right">Descripción</Label>
                <Input id="description" name="description" className="w-full sm:col-span-3" value={formData.description || ''} onChange={handleInputChange} placeholder="Opcional" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="client" className="text-left sm:text-right">Cliente</Label>
                <Input id="client" name="client" className="w-full sm:col-span-3" value={formData.client || ''} onChange={handleInputChange} />
            </div>

            {allowPickupPoint && (
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                    <Label htmlFor="pickupPoint" className="text-left sm:text-right">Punto de Recogida</Label>
                    <Input id="pickupPoint" name="pickupPoint" className="w-full sm:col-span-3" value={formData.pickupPoint || ''} onChange={handleInputChange} />
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                <Label className="text-left sm:text-right pt-0 sm:pt-2">Opciones</Label>
                <div className="sm:col-span-3 space-y-2">
                    {allowCoordination && (
                        <div className="flex items-center space-x-2">
                            <Switch id="hasCoordination" name="hasCoordination" checked={formData.hasCoordination} onCheckedChange={(c) => handleSwitchChange('hasCoordination', c)} />
                            <Label htmlFor="hasCoordination">Coordinación</Label>
                        </div>
                    )}
                    {logType === 'tutorial' && allowNight && (
                        <div className="flex items-center space-x-2">
                            <Switch id="hasNight" name="hasNight" checked={formData.hasNight} onCheckedChange={(c) => handleSwitchChange('hasNight', c)} />
                            <Label htmlFor="hasNight">Nocturnidad</Label>
                        </div>
                    )}
                    {logType === 'tutorial' && formData.hasNight && (
                        <div className="flex items-center space-x-2 pl-6">
                            <Switch id="arrivesPrior" name="arrivesPrior" checked={formData.arrivesPrior} onCheckedChange={(c) => handleSwitchChange('arrivesPrior', c)} />
                            <Label htmlFor="arrivesPrior">Llegada Día Anterior</Label>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

