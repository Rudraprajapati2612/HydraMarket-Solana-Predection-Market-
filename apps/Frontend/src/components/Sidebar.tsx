import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface SidebarProps {
  isDark: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isDark, isSidebarOpen, setIsSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem("userRole") || "user";
  const isAdmin = userRole === "admin";

  const isActive = (path: string) => location.pathname === path;

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-cyber-blue/20 text-cyber-blue border-cyber-blue/30",
      "bg-pro-green/20 text-pro-green border-pro-green/30",
      "bg-amber-500/20 text-amber-500 border-amber-500/30",
      "bg-purple-500/20 text-purple-500 border-purple-500/30",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const username = "USER_77491"; // In a real app, this would come from auth context

  const NavButton = ({ path, icon, label, active = false }: { path: string; icon: string; label: string; active?: boolean }) => (
    <button 
      onClick={() => {
        navigate(path);
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold tracking-[0.1em] transition-all group border rounded-sm ${
        active 
          ? (isDark ? "text-cyber-blue bg-cyber-blue/10 border-cyber-blue/20" : "text-cyber-blue bg-cyber-blue/5 border-cyber-blue/20")
          : (isDark ? "text-text-muted hover:text-cyber-blue hover:bg-border-dark/30 hover:border-border-dark border-transparent" : "text-gray-500 hover:text-cyber-blue hover:bg-gray-50 hover:border-gray-200 border-transparent")
      }`}
    >
      <span className={`material-symbols-outlined text-[20px] ${active ? "text-cyber-blue" : (isDark ? "text-text-muted" : "text-gray-400")} group-hover:text-cyber-blue transition-colors`}>
        {icon}
      </span>
      {label}
    </button>
  );

  return (
    <>
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[240px] ${isDark ? "bg-bg-dark border-border-dark" : "bg-white border-border-gray"} flex flex-col h-full transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 border-r ${isDark ? "border-border-dark" : "border-border-gray"}
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className={`h-16 flex items-center px-6 border-b ${isDark ? "border-border-dark" : "border-border-gray"} justify-between`}>
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate("/")}>
            <span className="material-symbols-outlined text-cyber-blue">pentagon</span>
            <span className={`font-code font-bold text-lg tracking-tight ${isDark ? "text-text-light" : "text-charcoal"}`}>
              HYDRA<span className="text-cyber-blue">_OS</span>
            </span>
          </div>
          <button 
            className={`lg:hidden ${isDark ? "text-text-muted" : "text-gray-400"} hover:text-cyber-blue transition-colors`}
            onClick={() => setIsSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <div className={`px-3 mb-2 text-[10px] ${isDark ? "text-text-muted" : "text-gray-400"} uppercase tracking-widest font-bold font-code`}>
            /// {isAdmin ? "Admin_Module" : "User_Module"}
          </div>
          
          {isAdmin ? (
            <>
              <NavButton path="/admin" icon="admin_panel_settings" label="DASHBOARD" active={isActive("/admin")} />
              <NavButton path="/markets-terminal" icon="trending_up" label="MARKETS" active={isActive("/markets-terminal")} />
              <NavButton path="/market-portfolio" icon="pie_chart" label="PORTFOLIO" active={isActive("/market-portfolio")} />
              <NavButton path="/orders" icon="list_alt" label="ORDERS" active={isActive("/orders")} />
              <NavButton path="/create-market" icon="add_circle" label="CREATE_MARKET" active={isActive("/create-market")} />
              <NavButton path="/resolve-market" icon="gavel" label="RESOLVE_MARKET" active={isActive("/resolve-market")} />
            </>
          ) : (
            <>
              <NavButton path="/dashboard" icon="dashboard" label="DASHBOARD" active={isActive("/dashboard")} />
              <NavButton path="/markets-terminal" icon="trending_up" label="MARKETS" active={isActive("/markets-terminal")} />
              <NavButton path="/portfolio" icon="account_balance_wallet" label="PORTFOLIO" active={isActive("/portfolio")} />
              <NavButton path="/payouts" icon="payments" label="PAYOUTS" active={isActive("/payouts")} />
              <NavButton path="/orders" icon="list_alt" label="ORDERS" active={isActive("/orders")} />
            </>
          )}
        </div>

        <div className={`p-4 border-t ${isDark ? "border-border-dark bg-card-dark" : "border-border-gray bg-light-gray"}`}>
          <button 
            onClick={() => navigate("/profile")}
            className={`w-full flex items-center gap-3 p-2 rounded-sm transition-all group ${isDark ? "hover:bg-white/5" : "hover:bg-black/5"}`}
          >
            <div className={`w-10 h-10 border flex items-center justify-center text-xs font-bold font-code shrink-0 ${getAvatarColor(username)}`}>
              {getInitials(username.replace("USER_", ""))}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className={`text-[11px] font-bold font-code truncate ${isDark ? "text-text-light" : "text-charcoal"}`}>
                {username}
              </div>
              <div className={`text-[9px] font-mono uppercase tracking-widest ${isDark ? "text-text-muted" : "text-gray-400"}`}>
                PRO PARTICIPANT
              </div>
            </div>
            <span 
              className={`material-symbols-outlined text-lg transition-colors ${isDark ? "text-text-muted/40 group-hover:text-cyber-blue" : "text-gray-300 group-hover:text-cyber-blue"}`}
              onClick={(e) => {
                e.stopPropagation();
                navigate("/profile");
              }}
            >
              settings
            </span>
          </button>
          <div className={`mt-4 text-[10px] ${isDark ? "text-text-muted/40" : "text-gray-300"} font-code text-center uppercase tracking-widest`}>
            v2.0.4 // {isAdmin ? "ADMIN_NODE" : "USER_NODE"}
          </div>
        </div>
      </aside>
    </>
  );
};
