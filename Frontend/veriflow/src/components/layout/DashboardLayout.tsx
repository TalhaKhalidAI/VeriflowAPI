import React from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  DashboardRounded as DashboardIcon,
  VpnKeyRounded as KeyIcon,
  FactCheckRounded as RulesIcon,
  AccessTimeFilledRounded as ShiftsIcon,
  QrCodeScannerRounded as ScansIcon,
  MenuRounded as MenuIcon,
  ChevronLeftRounded as ChevronLeftIcon,
  ChevronRightRounded as ChevronRightIcon,
  LogoutRounded as LogoutIcon,
  AdminPanelSettingsRounded as AdminIcon,
  LockResetRounded as Security2FAIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';
import { checkPermission, PERMISSION_MAP } from '../../HOCS/withPermissions';
import { useActiveShiftQuery } from '../../pages/Shifts/query';

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 72;

export interface NavItem {
  id: string;
  title: string;
  path: string;
  icon: React.ReactElement;
  pageKey: string;
  badge?: string;
  description: string;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardIcon />,
    pageKey: 'dashboard',
    description: 'System overview & real-time telemetry',
  },
  {
    id: 'shifts',
    title: 'Shifts & Tokens',
    path: '/shifts',
    icon: <ShiftsIcon />,
    pageKey: 'shifts',
    description: 'Worker shift sessions & RS256 QR tokens',
  },
  {
    id: 'scans',
    title: 'Scan Audits',
    path: '/scans',
    icon: <ScansIcon />,
    pageKey: 'scans',
    description: 'Offline sync & scan history',
  },
  {
    id: 'rules',
    title: 'Inventory Rules',
    path: '/rules',
    icon: <RulesIcon />,
    pageKey: 'rules',
    description: 'Claim validation policies',
  },
  {
    id: 'keys',
    title: 'Crypto Keys',
    path: '/keys',
    icon: <KeyIcon />,
    pageKey: 'keys',
    description: 'RS256 asymmetric keys & JWKS',
  },
  {
    id: 'security',
    title: 'Security & 2FA',
    path: '/security',
    icon: <Security2FAIcon />,
    pageKey: 'security',
    description: 'TOTP authenticator & email OTP',
  },
  {
    id: 'admin',
    title: 'Admin Console',
    path: '/admin',
    icon: <AdminIcon />,
    pageKey: 'admin',
    description: 'Identity governance & safety controls',
  },
];

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const mobileSidebarOpen = useAppStore((state) => state.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore((state) => state.setMobileSidebarOpen);

  // Live active shift query for industrial telemetry
  const { data: activeShift } = useActiveShiftQuery();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentWidth = sidebarOpen ? DRAWER_WIDTH : COLLAPSED_WIDTH;

  // Filter navigation items by active user permissions
  const visibleNavItems = NAVIGATION_ITEMS.filter((item) => {
    const requirement = PERMISSION_MAP[item.pageKey];
    if (!requirement) return true;
    const { allowed } = checkPermission(
      user?.permissions || {},
      requirement.permissions,
      requirement.mode,
      user?.role,
      user?.user_role
    );
    return allowed;
  });

  // Mobile Bottom Bar Items (matching Android app-tabs)
  const mobileDockItems = visibleNavItems.slice(0, 4);

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#07111D',
        borderRight: '1px solid #1E293B',
        color: '#F8FAFC',
      }}
    >
      {/* Brand Header */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          px: sidebarOpen ? 2 : 1.5,
          borderBottom: '1px solid #1E293B',
          justifyContent: sidebarOpen ? 'space-between' : 'center',
        }}
      >
        {sidebarOpen ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <img
              src="/msi_white.png"
              alt="VeriFlow Logo"
              style={{ width: 34, height: 30, objectFit: 'contain' }}
              onError={(e) => {
                // Fallback if image fails to load
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 900,
                  letterSpacing: '0.05em',
                  lineHeight: 1.1,
                  color: '#FACC15',
                  fontFamily: 'monospace',
                }}
              >
                VERIFLOW
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#94A3B8',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                INDUSTRIAL OS
              </Typography>
            </Box>
          </Box>
        ) : (
          <img
            src="/msi_white.png"
            alt="VeriFlow Logo"
            style={{ width: 32, height: 28, objectFit: 'contain' }}
          />
        )}

        {!isMobile && sidebarOpen && (
          <IconButton size="small" onClick={toggleSidebar} sx={{ color: '#94A3B8' }}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Industrial Shift Status Card in Sidebar (when open) */}
      {sidebarOpen && (
        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <div
            className={`p-2.5 rounded-lg border text-xs font-mono transition-all ${
              activeShift
                ? 'bg-[#0F172A] border-[#FACC15]/60 text-slate-200 shadow-[0_0_15px_rgba(250,204,21,0.1)]'
                : 'bg-[#0F172A]/50 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 font-bold">
                {activeShift ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[#FACC15] tracking-wide">SHIFT ACTIVE</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    <span className="text-slate-400">STANDBY MODE</span>
                  </>
                )}
              </span>
              <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                RS256
              </span>
            </div>
            {activeShift ? (
              <div className="text-[11px] space-y-0.5 text-slate-300">
                <div className="truncate">DEV: <span className="text-yellow-400">{activeShift.device_id || 'STATION-01'}</span></div>
                <div className="text-emerald-400 text-[10px] font-semibold">VALIDATED WORKER</div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-500">No shift currently active</div>
            )}
          </div>
        </Box>
      )}

      {/* Navigation List */}
      <List sx={{ px: 1, py: 1.5, flex: 1 }}>
        {visibleNavItems.map((item) => {
          const isSelected = location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.id} disablePadding sx={{ display: 'block', mb: 0.5 }}>
              <Tooltip title={!sidebarOpen ? item.title : ''} placement="right">
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileSidebarOpen(false);
                  }}
                  sx={{
                    minHeight: 44,
                    borderRadius: 1.5,
                    px: sidebarOpen ? 2 : 1.5,
                    bgcolor: isSelected ? 'rgba(250, 204, 21, 0.12)' : 'transparent',
                    color: isSelected ? '#FACC15' : '#94A3B8',
                    borderLeft: isSelected ? '3px solid #FACC15' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: isSelected ? 'rgba(250, 204, 21, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                      color: isSelected ? '#FACC15' : '#F8FAFC',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: sidebarOpen ? 2 : 'auto',
                      justifyContent: 'center',
                      color: isSelected ? '#FACC15' : '#94A3B8',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {sidebarOpen && (
                    <ListItemText
                      primary={item.title}
                      primaryTypographyProps={{
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? 700 : 500,
                        letterSpacing: '0.02em',
                      }}
                    />
                  )}
                  {sidebarOpen && item.badge && (
                    <Chip
                      size="small"
                      label={item.badge}
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        bgcolor: 'rgba(250, 204, 21, 0.2)',
                        color: '#FACC15',
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            </ListItem>
          );
        })}
      </List>

      {/* Operator Session Footer */}
      <Box
        sx={{
          p: sidebarOpen ? 2 : 1,
          borderTop: '1px solid #1E293B',
          bgcolor: '#0B1323',
        }}
      >
        {sidebarOpen ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
              <Avatar
                src={user?.profile_pic || undefined}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: '#FACC15',
                  color: '#07111D',
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                {(user?.name || user?.email || 'U')[0].toUpperCase()}
              </Avatar>
              <Box sx={{ overflow: 'hidden' }}>
                <Typography variant="body2" fontWeight={700} noWrap sx={{ color: '#F8FAFC' }}>
                  {user?.name || user?.email}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#FACC15',
                    textTransform: 'uppercase',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    fontFamily: 'monospace',
                  }}
                >
                  {user?.role || user?.user_role || 'Worker'}
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Log out">
              <IconButton size="small" onClick={handleLogout} sx={{ color: '#94A3B8', '&:hover': { color: '#EF4444' } }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          <Tooltip title="Log out" placement="right">
            <IconButton onClick={handleLogout} sx={{ color: '#94A3B8', mx: 'auto', display: 'block', '&:hover': { color: '#EF4444' } }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#07111D' }}>
      {/* Mobile Drawer (Accessible via hamburger or bottom dock More) */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid #1E293B',
              bgcolor: '#07111D',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        /* Desktop Drawer */
        <Drawer
          variant="permanent"
          sx={{
            width: currentWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: currentWidth,
              boxSizing: 'border-box',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
              borderRight: '1px solid #1E293B',
              bgcolor: '#07111D',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: { md: `calc(100% - ${currentWidth}px)` },
          minHeight: '100vh',
          bgcolor: '#07111D',
          // pb-20 on mobile prevents bottom navigation bar from overlapping page content
          pb: { xs: 10, md: 3 },
        }}
      >
        {/* Top Industrial HUD Navbar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'rgba(7, 17, 29, 0.92)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid #1E293B',
            zIndex: theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 }, minHeight: 58 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {isMobile ? (
                <IconButton
                  color="inherit"
                  edge="start"
                  onClick={() => setMobileSidebarOpen(true)}
                  sx={{ color: '#FACC15', mr: 0.5 }}
                >
                  <MenuIcon />
                </IconButton>
              ) : (
                !sidebarOpen && (
                  <IconButton
                    color="inherit"
                    edge="start"
                    onClick={toggleSidebar}
                    sx={{ mr: 1, color: '#94A3B8' }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                )
              )}

              {/* Title & Industrial route breadcrumb */}
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block w-2 h-2 bg-[#FACC15] rounded-sm rotate-45" />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.02em' }}>
                  {visibleNavItems.find((n) => location.pathname.startsWith(n.path))?.title || 'System Console'}
                </Typography>
              </div>
            </Box>

            {/* Industrial Telemetry & Status Badges */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Active Shift Live Pill */}
              {activeShift ? (
                <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FACC15]/15 border border-[#FACC15]/40 text-[#FACC15] font-mono text-xs font-bold shadow-[0_0_10px_rgba(250,204,21,0.15)]">
                  <span className="w-2 h-2 rounded-full bg-[#FACC15] animate-ping" />
                  <span>SHIFT ON: {activeShift.device_id || 'ACTIVE'}</span>
                </div>
              ) : (
                <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/60 border border-slate-700/60 text-slate-400 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span>STANDBY</span>
                </div>
              )}

              {/* API Online Status */}
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden xs:inline">API</span> ONLINE
              </div>

              {/* User Role Badge */}
              <div
                className={`inline-flex items-center px-2 py-1 rounded-md font-mono text-[11px] font-bold uppercase tracking-wider ${
                  user?.role === 'admin'
                    ? 'bg-rose-500/15 border border-rose-500/40 text-rose-400'
                    : 'bg-blue-500/15 border border-blue-500/40 text-blue-400'
                }`}
              >
                {user?.role === 'admin' ? 'ADMIN' : 'OPERATOR'}
              </div>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Dynamic Route View */}
        <Box sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2.5, md: 3 } }}>
          {children || <Outlet />}
        </Box>
      </Box>

      {/* DaisyUI Mobile Bottom Navigation Dock (Responsive Android look) */}
      <div className="btm-nav btm-nav-md md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A] border-t border-[#1E293B] shadow-2xl backdrop-blur-lg">
        {mobileDockItems.map((item) => {
          const isSelected = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center transition-all ${
                isSelected
                  ? 'active text-[#FACC15] bg-[#FACC15]/10 border-t-2 border-[#FACC15]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                {React.cloneElement(item.icon, {
                  sx: { fontSize: 20, color: isSelected ? '#FACC15' : 'inherit' },
                })}
                {item.id === 'shifts' && activeShift && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                )}
              </div>
              <span className="btm-nav-label text-[10px] font-medium tracking-tight mt-0.5">
                {item.title.split(' ')[0]}
              </span>
            </button>
          );
        })}

        {/* Menu / More Button to open full Drawer on Mobile */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className={`flex flex-col items-center justify-center text-slate-400 hover:text-[#FACC15] transition-all ${
            mobileSidebarOpen ? 'text-[#FACC15]' : ''
          }`}
        >
          <MenuIcon sx={{ fontSize: 20 }} />
          <span className="btm-nav-label text-[10px] font-medium tracking-tight mt-0.5">More</span>
        </button>
      </div>
    </Box>
  );
}

export default DashboardLayout;
