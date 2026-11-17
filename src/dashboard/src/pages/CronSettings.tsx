import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { toast } from "sonner";
import { Clock, Play, Save, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CronJob {
  name: string;
  description: string;
  schedule: string;
  enabled: boolean;
  lastRun?: string;
}

const CRON_SCHEDULES = [
  { value: "* * * * *", label: "Every minute" },
  { value: "*/5 * * * *", label: "Every 5 minutes" },
  { value: "*/15 * * * *", label: "Every 15 minutes" },
  { value: "*/30 * * * *", label: "Every 30 minutes" },
  { value: "0 * * * *", label: "Every hour" },
  { value: "0 */6 * * *", label: "Every 6 hours" },
  { value: "0 0 * * *", label: "Daily at midnight" },
];

export default function CronSettings() {
  const { currentOrg } = useOrg();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [jobs, setJobs] = useState<CronJob[]>([
    {
      name: "webhook_retry",
      description: "Retry failed webhook deliveries with exponential backoff",
      schedule: "*/5 * * * *",
      enabled: false,
    },
    {
      name: "balance_check",
      description: "Verify MFS account balances via connected devices",
      schedule: "0 * * * *",
      enabled: false,
    },
    {
      name: "expire_transactions",
      description: "Auto-expire pending transactions after timeout",
      schedule: "*/15 * * * *",
      enabled: false,
    },
  ]);

  useEffect(() => { if (currentOrg?.id) loadSettings(); }, [currentOrg?.id]);

  const loadSettings = async () => {
    const { data } = await supabase.from("settings").select("name, value")
      .eq("organization_id", currentOrg!.id)
      .in("name", ["cron_webhook_retry", "cron_balance_check", "cron_expire_transactions",
        "cron_webhook_retry_schedule", "cron_balance_check_schedule", "cron_expire_transactions_schedule"]);
    if (data) {
      setJobs(prev => prev.map(j => {
        const enabled = data.find(s => s.name === `cron_${j.name}`);
        const schedule = data.find(s => s.name === `cron_${j.name}_schedule`);
        return {
          ...j,
          enabled: enabled?.value === "true",
          schedule: schedule?.value || j.schedule,
        };
      }));
    }
    setLoading(false);
  };

  const updateJob = (name: string, field: "enabled" | "schedule", value: any) => {
    setJobs(prev => prev.map(j => j.name === name ? { ...j, [field]: value } : j));
  };

  const handleSave = async () => {
    if (!currentOrg?.id) return;
    setSaving(true);
    try {
      for (const job of jobs) {
        for (const [suffix, value] of [["", job.enabled ? "true" : "false"], ["_schedule", job.schedule]]) {
          const settingName = `cron_${job.name}${suffix}`;
          const { data: existing } = await supabase.from("settings")
            .select("id").eq("organization_id", currentOrg.id).eq("name", settingName).maybeSingle();
          if (existing) {
            await supabase.from("settings").update({ value: value as string }).eq("id", existing.id);
          } else {
            await supabase.from("settings").insert({ organization_id: currentOrg.id, name: settingName, value: value as string });
          }
        }
      }
      toast.success("Cron settings saved");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const triggerJob = async (name: string) => {
    setTriggering(name);
    try {
      if (name === "webhook_retry") {
        const { error } = await supabase.functions.invoke("webhook-delivery", { body: {} });
        if (error) throw error;
        toast.success("Webhook retry triggered successfully");
      } else {
        toast.info("This job type is not yet implemented");
      }
    } catch (err: any) { toast.error(err.message || "Failed to trigger job"); }
    finally { setTriggering(null); }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Settings</p>
          <h1 className="text-2xl font-bold text-foreground">Cron Jobs</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="space-y-4">
        {jobs.map(job => (
          <Card key={job.name}>
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-foreground capitalize">{job.name.replace(/_/g, " ")}</h4>
                      <Badge variant={job.enabled ? "default" : "secondary"}>
                        {job.enabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{job.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Select value={job.schedule} onValueChange={v => updateJob(job.name, "schedule", v)}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CRON_SCHEDULES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Switch checked={job.enabled} onCheckedChange={v => updateJob(job.name, "enabled", v)} />

                  <Button variant="outline" size="sm" onClick={() => triggerJob(job.name)}
                    disabled={triggering === job.name}>
                    {triggering === job.name ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="p-5">
          <h4 className="font-medium text-foreground mb-2">About Cron Jobs</h4>
          <p className="text-sm text-muted-foreground">
            Cron jobs run scheduled tasks automatically. The <strong>Webhook Retry</strong> job re-attempts
            failed webhook deliveries with exponential backoff. Use the <strong>Run Now</strong> button to
            manually trigger a job. Schedules are saved to your settings and can be adjusted anytime.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
