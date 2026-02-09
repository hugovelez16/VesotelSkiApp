"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCompaniesDetailed, updateMemberStatus } from "@/lib/api/companies";
import { getUsers, updateUserStatus } from "@/lib/api/users";
import { CompanyWithMembers, User } from "@/lib/types";
import { CompanyDialog } from "@/components/admin/company-dialog";
import { UserDialog } from "@/components/admin/user-dialog";
import { UserEditDialog } from "@/components/admin/user-edit-dialog";
import { AddMemberDialog } from "@/components/admin/add-member-dialog";
import { MemberSettingsDialog } from "@/components/admin/member-settings-dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { UserCreateWorkLogDialog } from "@/components/work-log/user-dialog";
import { Plus, Users, Building2 } from "lucide-react";

export default function AdminDashboardPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: companies = [], isLoading: loadingCompanies } = useQuery({
        queryFn: getCompaniesDetailed,
        queryKey: ["companiesDetailed"],
    });

    const { data: users = [], isLoading: loadingUsers } = useQuery({
        queryFn: getUsers,
        queryKey: ["users"],
    });

    const toggleStatusMutation = useMutation({
        mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
            updateUserStatus(userId, isActive),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast({ title: "User status updated" });
        },
        onError: () => {
            toast({ title: "Failed to update status", variant: "destructive" });
        },
    });

    const memberStatusMutation = useMutation({
        mutationFn: ({ companyId, userId, status }: { companyId: string; userId: string; status: string }) =>
            updateMemberStatus(companyId, userId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["companiesDetailed"] });
            toast({ title: "Member status updated" });
        },
        onError: () => {
            toast({ title: "Failed to update member status", variant: "destructive" });
        },
    });

    if (loadingCompanies || loadingUsers) {
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Manage companies and users.</p>
                </div>
                <div className="flex gap-2">
                    <CompanyDialog />
                    <UserDialog />
                </div>
            </div>

            {/* Companies Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">Companies & Members</h2>
                </div>

                <div className="rounded-md border bg-card p-4">
                    {companies.length === 0 ? (
                        <p className="text-muted-foreground">No companies found.</p>
                    ) : (
                        <Accordion type="single" collapsible className="w-full">
                            {companies.map((company) => {
                                const activeCount = company.members?.filter(m => m.status === 'active' || !m.status).length || 0;
                                const rejectedCount = company.members?.filter(m => m.status === 'rejected').length || 0;
                                return (
                                    <AccordionItem key={company.id} value={company.id}>
                                        <AccordionTrigger className="hover:no-underline">
                                            <div className="flex items-center justify-between w-full pr-4">
                                                <span>{company.name}</span>
                                                <div className="flex gap-2">
                                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                                        {activeCount} active member{activeCount !== 1 ? 's' : ''}
                                                    </Badge>
                                                    {rejectedCount > 0 && (
                                                        <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">
                                                            {rejectedCount} rejected member{rejectedCount !== 1 ? 's' : ''}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="flex justify-end p-2 border-b mb-2">
                                                <AddMemberDialog companyId={company.id} companyName={company.name} existingMembers={company.members} />
                                            </div>
                                            {company.members && company.members.length > 0 ? (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>User</TableHead>
                                                            <TableHead>Role</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead>Joined</TableHead>
                                                            <TableHead>Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {company.members.map((member) => (
                                                            <TableRow key={member.user_id}>
                                                                <TableCell>
                                                                    {member.user?.first_name} {member.user?.last_name} ({member.user?.email})
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge>{member.role}</Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                                                                        {member.status}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {new Date(member.joined_at).toLocaleDateString()}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {member.status === 'active' && (
                                                                        <Button
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            onClick={() => memberStatusMutation.mutate({
                                                                                companyId: company.id,
                                                                                userId: member.user_id,
                                                                                status: 'rejected'
                                                                            })}
                                                                        >
                                                                            Remove
                                                                        </Button>
                                                                    )}
                                                                    {member.status !== 'active' && (
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => memberStatusMutation.mutate({
                                                                                companyId: company.id,
                                                                                userId: member.user_id,
                                                                                status: 'active'
                                                                            })}
                                                                        >
                                                                            Activate
                                                                        </Button>
                                                                    )}
                                                                    <MemberSettingsDialog
                                                                        companyId={company.id}
                                                                        userId={member.user_id}
                                                                        memberName={`${member.user?.first_name} ${member.user?.last_name}`}
                                                                        initialSettings={member.settings}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            ) : (
                                                <p className="text-sm text-muted-foreground p-2">No members assigned to this company.</p>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    )}
                </div>
            </div>

            {/* Users Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">All Users</h2>
                </div>

                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.first_name} {user.last_name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={user.is_active}
                                                onCheckedChange={(checked) =>
                                                    toggleStatusMutation.mutate({ userId: user.id, isActive: checked })
                                                }
                                            />
                                            <span className="text-sm text-muted-foreground">
                                                {user.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <UserCreateWorkLogDialog
                                                user={{ id: user.id }}
                                                onLogUpdate={() => {
                                                    toast({ title: "Log added for user" });
                                                }}
                                            >
                                                <Button size="sm" variant="outline">
                                                    <Plus className="h-4 w-4 mr-1" /> Log
                                                </Button>
                                            </UserCreateWorkLogDialog>
                                            <UserEditDialog user={user} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
