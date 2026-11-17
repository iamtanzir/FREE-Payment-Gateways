import fpgLogo from "@/assets/fpg-logo.svg";
import {
  Home,
  PieChart,
  Wallet,
  Users,
  Receipt,
  FileText,
  Link2,
  Palette,
  MessageSquare,
  Smartphone,
  Puzzle,
  Globe,
  Building2,
  UserCog,
  Settings,
  Activity,
  ChevronDown,
  Key,
  Webhook,
  Bell,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { BrandSwitcher } from "@/components/BrandSwitcher";

const mainItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Reports", url: "/reports", icon: PieChart },
  { title: "Gateways", url: "/gateways", icon: Wallet },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Transaction", url: "/transactions", icon: Receipt },
  { title: "Invoice", url: "/invoices", icon: FileText },
  { title: "Payment Link", url: "/payment-links", icon: Link2 },
];

const developerItems = [
  { title: "Webhooks", url: "/webhooks", icon: Webhook },
  { title: "API Keys", url: "/api-keys", icon: Key },
  { title: "API Docs", url: "/api-docs", icon: BookOpen },
];

const appearanceItems = [
  { title: "Brand Settings", url: "/brand-settings", icon: Palette },
];

const mfsItems = [
  { title: "SMS Data", url: "/sms-data", icon: MessageSquare },
  { title: "Devices", url: "/devices", icon: Smartphone },
  { title: "Balance Verify", url: "/balance-verification", icon: ShieldCheck },
];

const adminItems = [
  { title: "Addons", url: "/addons", icon: Puzzle },
  { title: "Domains", url: "/domains", icon: Globe },
  { title: "All Brands", url: "/brands", icon: Building2 },
  { title: "User Management", url: "/admin/users", icon: Users },
  { title: "Notifications", url: "/notification-channels", icon: Bell },
  { title: "Licenses", url: "/admin/licenses", icon: Key },
  { title: "Staff Management", url: "/roles", icon: UserCog },
  { title: "System Settings", url: "/settings", icon: Settings },
  { title: "Activities", url: "/activities", icon: Activity },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { currentOrg } = useOrg();
  const [developerOpen, setDeveloperOpen] = useState(true);
  const [appearanceOpen, setAppearanceOpen] = useState(true);
  const [mfsOpen, setMfsOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/brands") return location.pathname === "/brands";
    if (path === "/settings") return location.pathname === "/settings" || location.pathname.startsWith("/settings/");
    if (path === "/brand-settings") return location.pathname === "/brand-settings" || location.pathname.startsWith("/brand-settings/");
    if (path === "/balance-verification") return location.pathname === "/balance-verification";
    if (path === "/notification-channels") return location.pathname === "/notification-channels";
    return location.pathname.startsWith(path);
  };

  const renderMenuItems = (items: typeof mainItems) =>
    items.map((item) => (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)}>
          <NavLink
            to={item.url}
            end={item.url === "/"}
            className="transition-all duration-200"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <item.icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  const renderSection = (
    label: string,
    items: typeof mainItems,
    open: boolean,
    setOpen: (v: boolean) => void
  ) => (
    <SidebarGroup>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
          {label}
          {!collapsed && (
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(items)}</SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <img src={fpgLogo} alt="FREE Payment Gateways" className="h-8 w-8 rounded-lg transition-transform duration-300 hover:scale-110" />
            <div className="absolute inset-0 rounded-lg bg-primary/10 blur-md -z-10 animate-glow-pulse" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]">FREE Payment Gateways</span>
              {currentOrg && (
                <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                  {currentOrg.name}
                </span>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <BrandSwitcher collapsed={collapsed} />

      <SidebarContent className="px-2 py-2">
        {/* Main Menu */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(mainItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Developer */}
        {renderSection("Developer", developerItems, developerOpen, setDeveloperOpen)}

        {/* Appearance */}
        {renderSection("Appearance", appearanceItems, appearanceOpen, setAppearanceOpen)}

        {/* MFS Automation */}
        {renderSection("MFS Automation", mfsItems, mfsOpen, setMfsOpen)}

        {/* Administration */}
        {renderSection("Administration", adminItems, adminOpen, setAdminOpen)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className="flex items-center justify-center py-2">
          {!collapsed && (
            <span className="text-xs text-muted-foreground font-medium">V5.4.2</span>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
