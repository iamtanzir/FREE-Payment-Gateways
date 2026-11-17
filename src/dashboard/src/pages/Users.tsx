import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Users as UsersIcon, Building2, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Button as PagBtn } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  org_id: string | null;
  org_name: string | null;
  role: string | null;
}

interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
  created_at: string;
  member_count: number;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  merchant_admin: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  staff: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  viewer: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orgs, setOrgs] = useState<AdminOrg[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgSearch, setOrgSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [orgPage, setOrgPage] = useState(1);
  const perPage = 20;

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, oRes] = await Promise.all([
        supabase.rpc("get_all_users_admin"),
        supabase.rpc("get_all_orgs_admin"),
      ]);
      if (uRes.data) setUsers(uRes.data as AdminUser[]);
      if (oRes.data) setOrgs(oRes.data as AdminOrg[]);
      if (uRes.error) toast.error("Failed to load users");
      if (oRes.error) toast.error("Failed to load organizations");
    } catch (e) {
      console.error(e);
      toast.error("Failed to load data");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (u.email?.toLowerCase().includes(q)) ||
      (u.full_name?.toLowerCase().includes(q)) ||
      (u.org_name?.toLowerCase().includes(q)) ||
      (u.role?.toLowerCase().includes(q));
  });

  const filteredOrgs = orgs.filter(o => {
    const q = orgSearch.toLowerCase();
    if (!q) return true;
    return o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q);
  });

  const pagedUsers = filteredUsers.slice((userPage - 1) * perPage, userPage * perPage);
  const pagedOrgs = filteredOrgs.slice((orgPage - 1) * perPage, orgPage * perPage);

  const exportUsers = () => {
    const csv = [
      ["Email", "Name", "Phone", "Organization", "Role", "Registered At", "Last Sign In"].join(","),
      ...filteredUsers.map(u => [
        u.email, u.full_name || "", u.phone || "", u.org_name || "", u.role || "",
        new Date(u.created_at).toLocaleDateString(), u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : ""
      ].map(v => `"${v}"`).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "users.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported!");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground">View and manage all registered users and organizations</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <UsersIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{orgs.length}</p>
                <p className="text-xs text-muted-foreground">Organizations</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <UsersIcon className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => {
                    if (!u.last_sign_in_at) return false;
                    const d = Date.now() - new Date(u.last_sign_in_at).getTime();
                    return d < 7 * 24 * 60 * 60 * 1000;
                  }).length}
                </p>
                <p className="text-xs text-muted-foreground">Active (7 days)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="orgs">Organizations</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by email, name, org, or role..."
                  value={search} onChange={e => { setSearch(e.target.value); setUserPage(1); }}
                  className="pl-9" />
              </div>
              <Button variant="outline" size="sm" onClick={exportUsers}>
                <Download className="h-4 w-4 mr-2" />Export CSV
              </Button>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : pagedUsers.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
                    ) : pagedUsers.map(u => (
                      <TableRow key={`${u.user_id}-${u.org_id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} className="h-8 w-8 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {(u.full_name || u.email)[0].toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground">{u.full_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.org_name || "—"}</TableCell>
                        <TableCell>
                          {u.role ? (
                            <Badge variant="secondary" className={ROLE_COLORS[u.role] || ""}>
                              {u.role.replace("_", " ")}
                            </Badge>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "Never"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredUsers.length > perPage && (
                <div className="p-4 border-t flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{(userPage-1)*perPage+1}–{Math.min(userPage*perPage, filteredUsers.length)} of {filteredUsers.length}</p>
                  <div className="flex gap-1">
                    <PagBtn variant="outline" size="icon" className="h-8 w-8" disabled={userPage<=1} onClick={()=>setUserPage(p=>p-1)}><ChevronLeft className="h-4 w-4"/></PagBtn>
                    <PagBtn variant="outline" size="icon" className="h-8 w-8" disabled={userPage*perPage>=filteredUsers.length} onClick={()=>setUserPage(p=>p+1)}><ChevronRight className="h-4 w-4"/></PagBtn>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="orgs" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search organizations..."
                value={orgSearch} onChange={e => { setOrgSearch(e.target.value); setOrgPage(1); }}
                className="pl-9" />
            </div>

            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : pagedOrgs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No organizations found</TableCell></TableRow>
                    ) : pagedOrgs.map(o => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {o.logo_url ? (
                              <img src={o.logo_url} className="h-8 w-8 rounded-lg object-cover" alt="" />
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-600">
                                {o.name[0].toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm font-medium text-foreground">{o.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">{o.slug}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{o.member_count}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {o.website ? <a href={o.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{o.website}</a> : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredOrgs.length > perPage && (
                <div className="p-4 border-t flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{(orgPage-1)*perPage+1}–{Math.min(orgPage*perPage, filteredOrgs.length)} of {filteredOrgs.length}</p>
                  <div className="flex gap-1">
                    <PagBtn variant="outline" size="icon" className="h-8 w-8" disabled={orgPage<=1} onClick={()=>setOrgPage(p=>p-1)}><ChevronLeft className="h-4 w-4"/></PagBtn>
                    <PagBtn variant="outline" size="icon" className="h-8 w-8" disabled={orgPage*perPage>=filteredOrgs.length} onClick={()=>setOrgPage(p=>p+1)}><ChevronRight className="h-4 w-4"/></PagBtn>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
