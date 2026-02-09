"use client";

import { UserDevice } from "@/lib/types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface UserDevicesTableProps {
    devices: UserDevice[];
    onRevoke: (deviceId: string) => void;
    isLoading?: boolean;
}

export function UserDevicesTable({ devices, onRevoke, isLoading }: UserDevicesTableProps) {
    if (isLoading) {
        return <div className="text-center py-4">Cargando dispositivos...</div>;
    }

    if (devices.length === 0) {
        return <div className="text-center py-4 text-muted-foreground">No hay dispositivos registrados.</div>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Último Uso</TableHead>
                        <TableHead>Expira</TableHead>
                        <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {devices.map((device) => (
                        <TableRow key={device.id}>
                            <TableCell className="font-medium">
                                {device.name || "Dercosconocido"}
                                <div className="text-xs text-muted-foreground font-mono">
                                    {device.device_identifier.substring(0, 8)}...
                                </div>
                            </TableCell>
                            <TableCell>
                                {format(new Date(device.last_used), "Pp", { locale: es })}
                            </TableCell>
                            <TableCell>
                                {format(new Date(device.expires_at), "P", { locale: es })}
                            </TableCell>
                            <TableCell>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => onRevoke(device.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
