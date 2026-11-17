import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Settings, Key, Brush, HelpCircle, DollarSign, Headphones } from "lucide-react";
import { useNavigate } from "react-router-dom";

const settingsCards = [
  {
    title: "General Setting",
    description: "Manage brand details, system preferences, and basic configuration.",
    icon: Settings,
    path: "/brand-settings/general",
  },
  {
    title: "Api Settings",
    description: "Configure API keys, tokens, and access permissions.",
    icon: Key,
    path: "/api-keys",
  },
  {
    title: "Themes",
    description: "Browse, activate, and customize your checkout themes.",
    icon: Brush,
    path: "/brand-settings/themes",
  },
  {
    title: "FAQ Settings",
    description: "Manage frequently asked questions and help content.",
    icon: HelpCircle,
    path: "/faqs",
  },
  {
    title: "Currency Settings",
    description: "Set supported currencies, symbols, and defaults.",
    icon: DollarSign,
    path: "/currencies",
  },
  {
    title: "Support Settings",
    description: "Configure support contact links for checkout pages.",
    icon: Headphones,
    path: "/brand-settings/support",
  },
];

export default function BrandSettings() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Brand Settings</p>
        <h1 className="text-2xl font-bold text-foreground">Brand Settings</h1>
      </div>

      <Card>
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">All Settings</h3>
        </div>
        <CardContent className="p-4 space-y-4">
          {settingsCards.map((card) => (
            <div
              key={card.title}
              onClick={() => navigate(card.path)}
              className="cursor-pointer rounded-xl border border-border bg-card p-4 flex items-center gap-4 hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="flex-shrink-0 w-[52px] h-[52px] rounded-xl bg-primary/10 flex items-center justify-center">
                <card.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h5 className="font-medium text-primary mb-0.5">{card.title}</h5>
                <p className="text-sm text-muted-foreground leading-snug">{card.description}</p>
              </div>
            </div>
          ))}

        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
