"use client";

import React, { useState, useMemo, useEffect } from 'react';
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { WorkLog } from "@/lib/types";
import { WorkLogForm } from "./work-log-form";

interface SupervisorAddWorkLogDialogProps {
    companyId: string;
    companyName: string;
    users: any[]; // List of eligible users (members of the company)
    onLogUpdate?: () => void;
    children?: React.ReactNode;
    // Controlled state props
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    initialData?: Partial<WorkLog>;
}

export function SupervisorAddWorkLogDialog({
    companyId,
    companyName,
    users,
    onLogUpdate,
    children,
    open: externalOpen,
    onOpenChange: setExternalOpen,
    initialData
}: SupervisorAddWorkLogDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    // Use external state if provided, otherwise internal
    const isControlled = externalOpen !== undefined;
    const open = isControlled ? externalOpen : internalOpen;
    const setOpen = isControlled ? setExternalOpen! : setInternalOpen;

    const [isLoading, setIsLoading] = useState(false);
    const [logType, setLogType] = useState<'particular' | 'tutorial'>('particular');
    const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);

    // Form data - pre-fill companyId
    const [formData, setFormData] = useState<Partial<WorkLog>>({
        companyId: companyId,
        hasCoordination: false,
        hasNight: false,
        arrivesPrior: false,
    });

    const { toast } = useToast();

    // Reset or Initialize when opening
    useEffect(() => {
        if (open) {
            setFormData({
                companyId: companyId,
                hasCoordination: false,
                hasNight: false,
                arrivesPrior: false,
                // Merge initial data if present
                ...(initialData || {})
            });

            if (initialData?.userId) {
                setSelectedUserId(initialData.userId);
            }

            if (initialData?.type) {
                setLogType(initialData.type);
            }
        } else {
            // Only reset if closing (and we want to clear)
            // But usually we reset ON open to fresh state or defaults.
            // Let's reset on CLOSE to be clean.
            if (!isControlled) { // If controlled, parent might handle reset, but safe to do here.
                setFormData({ companyId: companyId, hasCoordination: false, hasNight: false, arrivesPrior: false });
                setSelectedUserId(undefined);
                setLogType('particular');
            }
        }
    }, [open, companyId, initialData, isControlled]);

    // Mock company object for WorkLogForm
    const companies = useMemo(() => [{ id: companyId, name: companyName, settings: {} }], [companyId, companyName]);

    const handleSubmit = async () => {
        if (!selectedUserId) {
            toast({ title: "Error", description: "Por favor, selecciona un usuario.", variant: "destructive" });
            return;
        }

        setIsLoading(true);

        if (!formData.client) {
            toast({ title: "Error", description: "El cliente es obligatorio.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        if (logType === 'particular' && (!formData.date || !formData.startTime || !formData.endTime)) {
            toast({ title: "Error", description: "Fecha, hora de inicio y fin son obligatorias para el tipo 'Particular'.", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        if (logType === 'tutorial' && (!formData.startDate || !formData.endDate)) {
            toast({ title: "Error", description: "Fecha de inicio y fin son obligatorias para el tipo 'Tutorial'.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const logData: Partial<WorkLog> = {
            ...formData,
            userId: selectedUserId,
            companyId: companyId, // Enforce current company
            type: logType,
        };

        try {
            if (initialData?.id) {
                await api.put(`/work-logs/${initialData.id}`, logData);
                toast({ title: "Éxito", description: "Registro actualizado correctamente." });
            } else {
                await api.post("/work-logs/", logData);
                toast({ title: "Éxito", description: "Registro añadido correctamente." });
            }

            setOpen(false);
            onLogUpdate?.();

        } catch (error: any) {
            console.error("Error saving work log:", error);
            const msg = error.response?.data?.detail || "No se pudo guardar el registro.";
            toast({ title: "Error", description: msg, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }

    const selectedUserName = useMemo(() => {
        if (!selectedUserId) return null;
        const user = users.find(u => u.id === selectedUserId);
        return user ? `${user.first_name} ${user.last_name}` : null;
    }, [selectedUserId, users]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ?? (
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Registro
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Añadir Registro - {companyName}</DialogTitle>
                    <DialogDescription>
                        Crea un nuevo registro para un miembro del equipo.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* User Selector */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="user" className="text-right">
                            Usuario
                        </Label>
                        <Select onValueChange={setSelectedUserId} value={selectedUserId}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecciona un usuario">
                                    {selectedUserName}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {users.map((user: any) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.first_name} {user.last_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Shared Form */}
                    <WorkLogForm
                        formData={formData}
                        setFormData={setFormData}
                        logType={logType}
                        setLogType={setLogType}
                        companies={companies}
                    />
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="ghost">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isLoading} onClick={handleSubmit}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
