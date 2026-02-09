"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markNotificationRead } from "@/lib/api/users";
import { UserProfile } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Bell, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface NotificationsSectionProps {
    user: UserProfile;
}

export function NotificationsSection({ user }: NotificationsSectionProps) {
    const queryClient = useQueryClient();
    const { data: dbNotifications = [] } = useQuery({
        queryFn: getNotifications,
        queryKey: ["notifications"],
    });

    const readMutation = useMutation({
        mutationFn: markNotificationRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
    });

    // Virtual Notifications
    const needsDefaultCompany = !user.default_company_id && user.role !== 'admin';
    // Admin might not need default company? Or maybe yes. 
    // Usually workers need it for quick logging. 
    // I'll show it for everyone if missing.

    // If there are no notifications, render nothing
    if (!needsDefaultCompany && dbNotifications.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2 mb-6">
            {needsDefaultCompany && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription className="flex flex-col gap-2">
                        <span>You have not selected a default company. This is required for quick logging.</span>
                        <Link href="/profile" className="font-bold underline hover:no-underline w-fit">
                            Go to Profile settings
                        </Link>
                    </AlertDescription>
                </Alert>
            )}

            {dbNotifications.map((notif: any) => (
                <Alert key={notif.id} variant={notif.type === 'warning' || notif.type === 'error' ? 'destructive' : 'default'} className="relative">
                    {notif.type === 'info' ? <Info className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                    <AlertTitle className="capitalize">{notif.type === 'warning' ? 'Important' : 'Notification'}</AlertTitle>
                    <AlertDescription>{notif.message}</AlertDescription>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
                        onClick={() => readMutation.mutate(notif.id)}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Dismiss</span>
                    </Button>
                </Alert>
            ))}
        </div>
    );
}
