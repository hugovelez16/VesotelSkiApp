
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCompany } from "@/lib/api/companies";
import { Loader2, Save } from "lucide-react";

interface CompanyConfigurationTabProps {
    company: any;
}

export function CompanyConfigurationTab({ company }: CompanyConfigurationTabProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const currentSettings = company.settings || {};

    // --- State Initialization ---
    // Features (Toggles)
    // Note: The previous dialog used 'allow_tutorial' directly on settings root? 
    // Let's check consistency. The backend model says `settings` is JSON.
    // The dialog read `currentSettings.allow_tutorial`.
    // The previous implementation stored these as flat keys in the JSON.
    const [allowTutorial, setAllowTutorial] = useState(currentSettings.allow_tutorial !== false); // Default true
    const [allowCoordination, setAllowCoordination] = useState(currentSettings.allow_coordination !== false); // Default true

    // We should probably add Night Shifts and Supplements if supported by backend/frontend logic found earlier
    const [allowNight, setAllowNight] = useState(currentSettings.features?.night_shifts !== false); // Stored in nested 'features' in some parts?
    // Wait, let's normalize. The previous dialog used `currentSettings.allow_tutorial`.
    // My previous analysis of WorkLogForm showed `companySettings.features?.tutorials`.
    // There is an INCONSISTENCY I need to resolve.
    // WorkLogForm reads: `companySettings.features?.tutorials`
    // SettingsDialog wrote: `settings: { allow_tutorial: ... }`
    // THIS IS A BUG found previously or existing inconsistency. I should probably support BOTH or migrate to one.
    // Let's stick to the structure `WorkLogForm` uses because that's what CONSUMES it.
    // WorkLogForm: `companySettings.features?.tutorials`
    // So I should save into `features: { tutorials: ... }`.

    // Let's migrate/support the `features` object structure which seems cleaner.
    const initialFeatures = currentSettings.features || {};
    const [features, setFeatures] = useState({
        tutorials: initialFeatures.tutorials !== false, // Default true
        coordination: initialFeatures.coordination !== false, // Default true
        night_shifts: initialFeatures.night_shifts !== false, // Default true
        supplements: initialFeatures.supplements === true, // Default false for supplements
        pickup_point: initialFeatures.pickup_point === true, // Default false
        worker_daily_report: initialFeatures.worker_daily_report === true // Default false
    });

    // Billing
    const initialBilling = currentSettings.billing || {};
    const [priceType, setPriceType] = useState(initialBilling.price_type || 'gross'); // 'gross' or 'net'

    // Input Mode
    const [inputMode, setInputMode] = useState(currentSettings.input_mode || 'manual_single'); // 'manual_single' or 'manual_total'

    // Financials (Root Level Columns in Company Table)
    const initialSs = company.social_security_deduction ? Number(company.social_security_deduction) * 100 : "";
    const [ssDeduction, setSsDeduction] = useState<string>(initialSs.toString());

    const mutation = useMutation({
        mutationFn: (data: any) => updateCompany(company.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["companiesDetailed"] });
            toast({ title: "Configuration saved successfully" });
        },
        onError: () => {
            toast({ title: "Failed to save configuration", variant: "destructive" });
        }
    });

    const handleFeatureToggle = (key: keyof typeof features) => {
        setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        const ssValue = ssDeduction ? parseFloat(ssDeduction) / 100 : 0.0;

        // Validation: If Gross, SS Deduction must be > 0
        if (priceType === 'gross' && ssValue <= 0) {
            toast({
                title: "Validation Error",
                description: "If 'Gross' pricing is selected, Social Security Deduction must be greater than 0%.",
                variant: "destructive"
            });
            return;
        }

        // Construct the settings JSON object
        // We preserve existing keys but override the ones we manage
        const newSettings = {
            ...currentSettings, // Keep other junk if any
            features: features, // Update features block
            billing: {
                ...initialBilling,
                price_type: priceType
            },
            input_mode: inputMode
            // We STOP writing 'allow_tutorial' (flat) to avoid duplicating/confusing. 
            // WorkLogForm prioritized `features.tutorials` check? 
            // Actually checking WorkLogForm again:
            // const allowTutorial = companySettings.features?.tutorials !== false;
            // So yes, `features` object is the way.
        };

        // Remove legacy flat keys if we want to clean up? Or keep them for safety?
        // Let's keep it clean.
        delete newSettings.allow_tutorial;
        delete newSettings.allow_coordination;

        // ssValue is already calculated at the start of handleSave
        mutation.mutate({
            settings: newSettings,
            social_security_deduction: ssValue
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Company Configuration</CardTitle>
                <CardDescription>Customize user experience, billing logic, and available features for {company.name}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">

                {/* 1. FEATURES SECTION */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Features & Modules</h3>
                    <hr className="my-4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Tutorials + Night Shifts (Nested) */}
                        <div className="flex flex-col space-y-4 border p-3 rounded-md">
                            <div className="flex items-center justify-between space-x-4">
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor="feat_tutorials">Tutorials</Label>
                                    <span className="text-xs text-muted-foreground">Allow 'Tutorial' work logs (multi-day).</span>
                                </div>
                                <Switch
                                    id="feat_tutorials"
                                    checked={features.tutorials}
                                    onCheckedChange={(c) => {
                                        handleFeatureToggle('tutorials');
                                        if (!c) setFeatures(prev => ({ ...prev, tutorials: false, night_shifts: false }));
                                    }}
                                />
                            </div>

                            {/* Nested Night Shift */}
                            <div className={`flex items-center justify-between space-x-4 pl-4 border-l-2 ml-2 transition-opacity ${!features.tutorials ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor="feat_night">Night Shifts</Label>
                                    <span className="text-xs text-muted-foreground">Enable 'Night Shift' toggle.</span>
                                </div>
                                <Switch
                                    id="feat_night"
                                    checked={features.night_shifts}
                                    onCheckedChange={() => handleFeatureToggle('night_shifts')}
                                    disabled={!features.tutorials}
                                />
                            </div>
                        </div>

                        {/* Coordination */}
                        <div className="flex h-fit items-center justify-between space-x-4 border p-3 rounded-md">
                            <div className="flex flex-col space-y-1">
                                <Label htmlFor="feat_coord">Coordination</Label>
                                <span className="text-xs text-muted-foreground">Enable 'Coordination' extra pay toggle.</span>
                            </div>
                            <Switch id="feat_coord" checked={features.coordination} onCheckedChange={() => handleFeatureToggle('coordination')} />
                        </div>

                        {/* Supplements */}
                        <div className="flex h-fit items-center justify-between space-x-4 border p-3 rounded-md">
                            <div className="flex flex-col space-y-1">
                                <Label htmlFor="feat_suppl">Supplements</Label>
                                <span className="text-xs text-muted-foreground">Allow adding extra supplements to logs (Beta).</span>
                            </div>
                            <Switch id="feat_suppl" checked={features.supplements} onCheckedChange={() => handleFeatureToggle('supplements')} />
                        </div>

                        {/* Pickup Point */}
                        <div className="flex h-fit items-center justify-between space-x-4 border p-3 rounded-md">
                            <div className="flex flex-col space-y-1">
                                <Label htmlFor="feat_pickup">Pickup Point</Label>
                                <span className="text-xs text-muted-foreground">Enable 'Pickup Point' field (Special).</span>
                            </div>
                            <Switch id="feat_pickup" checked={features.pickup_point} onCheckedChange={() => handleFeatureToggle('pickup_point')} />
                        </div>

                        {/* Worker Daily Report */}
                        <div className="flex h-fit items-center justify-between space-x-4 border p-3 rounded-md">
                            <div className="flex flex-col space-y-1">
                                <Label htmlFor="feat_worker_report">Worker Daily Report</Label>
                                <span className="text-xs text-muted-foreground">Allow workers to see the daily report.</span>
                            </div>
                            <Switch id="feat_worker_report" checked={features.worker_daily_report} onCheckedChange={() => handleFeatureToggle('worker_daily_report')} />
                        </div>
                    </div>
                </div>

                {/* 2. BILLING & FINANCIALS */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Billing & Financials</h3>
                    <hr className="my-4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Pricing Model + SS Deduction */}
                        <div className="space-y-4 border p-3 rounded-md">
                            <div className="flex items-center justify-between space-x-4">
                                <div className="flex flex-col space-y-1">
                                    <Label htmlFor="price_net">Pricing Model</Label>
                                    <span className="text-xs text-muted-foreground">
                                        {priceType === 'net' ? 'USING NET PRICES (Pocket)' : 'USING GROSS PRICES'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs ${priceType === 'gross' ? 'font-bold' : 'text-muted-foreground'}`}>Gross</span>
                                    <Switch
                                        id="price_net"
                                        checked={priceType === 'net'}
                                        onCheckedChange={(checked) => {
                                            setPriceType(checked ? 'net' : 'gross');
                                            if (checked) setSsDeduction(""); // Reset SS if Net
                                        }}
                                    />
                                    <span className={`text-xs ${priceType === 'net' ? 'font-bold' : 'text-muted-foreground'}`}>Net</span>
                                </div>
                            </div>

                            <hr className="my-4" />

                            <div className={`space-y-2 transition-opacity ${priceType === 'net' ? 'opacity-50' : ''}`}>
                                <Label htmlFor="ss_deduction">Default Social Security Deduction</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="ss_deduction"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={ssDeduction}
                                        onChange={(e) => setSsDeduction(e.target.value)}
                                        placeholder={priceType === 'net' ? "N/A" : ""}
                                        disabled={priceType === 'net'}
                                    />
                                    <span className="text-sm font-medium">%</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {priceType === 'net'
                                        ? "Not applicable for Net pricing model."
                                        : "Applied to all members unless overridden."}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Work Log Input Mode</Label>
                            <div className="flex items-center space-x-4 border p-3 rounded-md">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="input_total"
                                        checked={inputMode === 'manual_total'}
                                        onCheckedChange={(checked) => setInputMode(checked ? 'manual_total' : 'manual_single')}
                                    />
                                    <Label htmlFor="input_total">Manual Total Override</Label>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    Allow users to manually type the total € amount instead of just Hours * Rate.
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </CardContent>
            <CardFooter className="flex justify-end gap-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-b-lg">
                <Button variant="outline" onClick={() => window.location.reload()}>Cancel</Button>
                <Button onClick={handleSave} disabled={mutation.isPending} className="min-w-[120px]">
                    {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Configuration
                </Button>
            </CardFooter>
        </Card>
    );
}
