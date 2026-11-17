import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Clock, RefreshCw, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

const settingsCards = [
  {
    title: "General Setting",
    description: "Manage essential system preferences and core configurations.",
    icon: Settings,
    path: "/settings/general",
  },
  {
    title: "Cron Job",
    description: "Manage scheduled tasks and automated system processes.",
    icon: Clock,
    path: "/settings/cron",
  },
  {
    title: "Update",
    description: "Manage system updates, patches, and version upgrades.",
    icon: RefreshCw,
    path: "/settings/update",
  },
  {
    title: "Import",
    description: "Import themes, add-ons, payment gateways, or any other modules.",
    icon: Upload,
    path: "/settings/import",
  },
];

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">System Settings</p>
        <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
      </div>

      <Card>
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">All Settings</h3>
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {settingsCards.map((card) => (
              <div key={card.title} onClick={() => navigate(card.path)} className="cursor-pointer">
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-[50px] h-[50px] rounded-lg bg-primary/10 flex items-center justify-center">
                        <card.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h5 className="font-medium text-primary mb-1">{card.title}</h5>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
