import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { User, LogOut, Activity, Sun, Moon, Monitor } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Theme = "light" | "dark" | "system";

function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    return saved || "dark"; // gateway admin UI is dark-first
  });

  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }, [theme]);

  return { theme, setTheme: setThemeState };
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const fullName = (user?.user_metadata?.full_name as string) || user?.email || "User";
  const initials = (() => {
    const name = user?.user_metadata?.full_name as string | undefined;
    if (name) {
      return name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
    }
    return (user?.email?.[0] || "U").toUpperCase();
  })();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 h-16 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-4 shadow-sm">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
            <div className="flex items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-accent transition-all duration-200 cursor-pointer">
                    <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary border border-primary/20">
                      {initials}
                    </span>
                    <div className="hidden xl:block text-left">
                      <div className="text-sm font-medium text-foreground truncate max-w-[100px]">{fullName}</div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 animate-scale-in">
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2">
                    <User className="h-4 w-4" />
                    My Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/activities")} className="gap-2">
                    <Activity className="h-4 w-4" />
                    Activities
                  </DropdownMenuItem>

                  <div className="px-2 py-1.5">
                    <div className="flex items-center justify-center gap-0 rounded-lg border border-border bg-muted p-0.5">
                      <button
                        onClick={() => setTheme("light")}
                        className={`flex-1 flex items-center justify-center rounded-md px-3 py-1.5 text-sm transition-all duration-200 ${
                          theme === "light"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Sun className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className={`flex-1 flex items-center justify-center rounded-md px-3 py-1.5 text-sm transition-all duration-200 ${
                          theme === "dark"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Moon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setTheme("system")}
                        className={`flex-1 flex items-center justify-center rounded-md px-3 py-1.5 text-sm transition-all duration-200 ${
                          theme === "system"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Monitor className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="gap-2">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-background">
            <div className="p-4 sm:p-6 animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
