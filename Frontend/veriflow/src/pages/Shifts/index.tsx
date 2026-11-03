// src/pages/Shifts/index.tsx
import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Typography,
  Button,

  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Paper,
  Stack,
  Tabs, Alert,
  Tab,
} from '@mui/material';
import {
  PlayArrowRounded as StartIcon,
  StopRounded as StopIcon,
  AutorenewRounded as ReissueIcon,
  ContentCopyRounded as CopyIcon,
  QrCode2Rounded as QrCodeIcon,
  AccessTimeFilledRounded as ShiftIcon,
  DownloadRounded as DownloadIcon,
  DeleteRounded as DeleteIcon,
} from '@mui/icons-material';
import QRCode from 'qrcode';
import {
  useActiveShiftQuery,
  useShiftsQuery,
  useStartShiftMutation,
  useReissueActiveShiftMutation,
  useCheckoutShiftMutation,
  useDeleteShiftMutation,
} from './query';
import type { StartShiftResponse, ReissueShiftResponse, ShiftRecord } from './types';
import { Table, type TableColumn, type TableAction } from '../../components/Table';
import { useKeysQuery } from '../Keys/query';
import { ToastMsgs } from '../../api/toastUtils';
import { useAuthStore } from '../../store/authStore';

export function ShiftsPage() {
  const user = useAuthStore((state) => state.user);
  const currentUserId = Number(user?.id);
  const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.user_role?.toLowerCase() === 'admin';
  const canDeleteAnyShift = isAdmin || Boolean(user?.permissions?.['shifts.delete.any']);
  const canDeleteOwnShift = canDeleteAnyShift || Boolean(user?.permissions?.['shifts.delete']);
  const canViewAny = isAdmin || Boolean(user?.permissions?.['shifts.view.any']) || Boolean(user?.permissions?.['shifts.view.all']) || canDeleteAnyShift;
  const canViewSelf = canViewAny || Boolean(user?.permissions?.['shifts.view']) || Boolean(user?.permissions?.['shifts.view.own']) || canDeleteOwnShift;
  const canCreateShift = isAdmin || Boolean(user?.permissions?.['shifts.create']);
  const canCheckoutShift = isAdmin || Boolean(user?.permissions?.['shifts.checkout']);

  const isShiftSelfCreated = (s?: ShiftRecord | null) =>
    Boolean(s && Number(s.user_id) === currentUserId && s.created_by != null && Number(s.created_by) === currentUserId);

  const canDeleteShiftRecord = (s?: ShiftRecord | null) =>
    Boolean(s && (canDeleteAnyShift || (canDeleteOwnShift && isShiftSelfCreated(s))));

  const { data: activeShift, isLoading: isLoadingActive } = useActiveShiftQuery();
  const { data: shiftsData, isLoading: isLoadingShifts } = useShiftsQuery();
  const { data: keysData } = useKeysQuery('active');
  const keys = keysData?.items || [];

  const startShiftMutation = useStartShiftMutation();
  const reissueMutation = useReissueActiveShiftMutation();
  const checkoutMutation = useCheckoutShiftMutation();
  const deleteShiftMutation = useDeleteShiftMutation();

  // Modals state
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [reissueModalOpen, setReissueModalOpen] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [shiftIdToDelete, setShiftIdToDelete] = useState<string>('');
  const [selectedShiftToDelete, setSelectedShiftToDelete] = useState<ShiftRecord | null>(null);
  const [tokenResult, setTokenResult] = useState<StartShiftResponse | ReissueShiftResponse | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [tokenModalTab, setTokenModalTab] = useState<number>(0);

  // Start Form (both include_rules and qr_only unchecked by default)
  const [startForm, setStartForm] = useState({
    key_id: '',
    duration_hours: 8,
    device_id: 'SCANNER-MOBILE-01',
    include_rules: false,
    qr_only: false,
    target_user_id: '',
  });

  // Reissue Form (both include_rules and qr_only unchecked by default)
  const [reissueForm, setReissueForm] = useState({
    include_rules: false,
    qr_only: false,
    target_user_id: '',
  });

  // Result mode tracking
  const [resultMode, setResultMode] = useState({
    qr_only: false,
    include_rules: false,
  });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    ToastMsgs.info(`${label} copied to clipboard!`);
  };

  const generateQRCode = async (token: string) => {
    try {
      const url = await QRCode.toDataURL(token, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
      setQrCodeDataUrl(url);
    } catch (err) {
      console.error('Failed to render shift QR', err);
    }
  };

  const handleStartSubmit = async () => {
    const isQr = startForm.qr_only;
    const hasRules = startForm.include_rules;
    setResultMode({ qr_only: isQr, include_rules: hasRules });

    const res: any = await startShiftMutation.mutateAsync({
      payload: {
        key_id: startForm.key_id ? startForm.key_id : undefined,
        duration_hours: startForm.duration_hours,
        device_id: startForm.device_id,
        include_rules: hasRules,
        target_user_id: startForm.target_user_id ? Number(startForm.target_user_id) : undefined,
      },
      qrOnly: isQr,
    });
    setStartModalOpen(false);
    setTokenResult(res);
    setTokenModalTab(isQr ? 0 : 1);
    if (isQr) {
      if (res?.qrBlobUrl) {
        setQrCodeDataUrl(res.qrBlobUrl);
      } else if (res?.shift_token) {
        await generateQRCode(res.shift_token);
      }
    } else {
      setQrCodeDataUrl(null);
    }
    setTokenModalOpen(true);
  };

  const handleReissueSubmit = async () => {
    const isQr = reissueForm.qr_only;
    const hasRules = reissueForm.include_rules;
    setResultMode({ qr_only: isQr, include_rules: hasRules });

    const res: any = await reissueMutation.mutateAsync({
      includeRules: hasRules,
      qrOnly: isQr,
      targetUserId: reissueForm.target_user_id ? Number(reissueForm.target_user_id) : undefined,
    });
    setReissueModalOpen(false);
    setTokenResult(res);
    setTokenModalTab(isQr ? 0 : 1);
    if (isQr) {
      if (res?.qrBlobUrl) {
        setQrCodeDataUrl(res.qrBlobUrl);
      } else if (res?.shift_token) {
        await generateQRCode(res.shift_token);
      }
    } else {
      setQrCodeDataUrl(null);
    }
    setTokenModalOpen(true);
  };

  const handleCheckout = async (shiftId?: string) => {
    await checkoutMutation.mutateAsync(shiftId);
  };

  const handleOpenDeleteShift = (shift?: ShiftRecord | null) => {
    setSelectedShiftToDelete(shift || null);
    setShiftIdToDelete(shift?.id || '');
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteShift = async () => {
    const targetId = (selectedShiftToDelete?.id || shiftIdToDelete || '').trim();
    if (!targetId) {
      ToastMsgs.error('Valid Shift ID is required to delete a shift');
      return;
    }
    await deleteShiftMutation.mutateAsync(targetId);
    setDeleteModalOpen(false);
    setSelectedShiftToDelete(null);
    setShiftIdToDelete('');
  };

  const handleDownloadQR = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `shift_token_${tokenResult?.shift?.id?.slice(0, 8) || 'active'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const shifts = canViewSelf ? (shiftsData?.items || []) : [];
  const hasActiveShift = Boolean(activeShift && activeShift.status === 'active');

  const shiftColumns: TableColumn<ShiftRecord>[] = [
    {
      key: 'user_id',
      label: 'Shift / User',
      render: (_, s) => {
        const isAdminIssued = s.created_by == null || Number(s.created_by) !== Number(s.user_id);
        return (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" fontWeight={600} sx={{ color: '#F8FAFC' }}>
                {s.user_name || s.user_email?.split('@')[0] || `User #${s.user_id}`}
              </Typography>
              <Chip
                size="small"
                label={isAdminIssued ? (s.created_by ? `Assigned by #${s.created_by}` : 'Admin-Assigned') : 'Self-Created'}
                sx={{
                  height: 18,
                  fontSize: 10,
                  fontWeight: 700,
                  bgcolor: isAdminIssued ? 'rgba(250, 204, 21, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                  color: isAdminIssued ? '#FACC15' : '#38BDF8',
                }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'monospace' }}>
              ID: {s?.id || 'N/A'}
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'device_id',
      label: 'Device ID',
      render: (_, s) => (
        <Typography variant="body2" sx={{ color: '#E2E8F0', fontFamily: 'monospace' }}>
          {s.device_id || 'DEFAULT'}
        </Typography>
      ),
    },
    {
      key: 'key_id',
      label: 'Key ID',
      render: (_, s) => (
        <Typography variant="caption" sx={{ color: '#38BDF8', fontFamily: 'monospace' }}>
          {s.key_id ? String(s.key_id).slice(0, 10) : 'N/A'}
        </Typography>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, s) => (
        <Chip
          label={String(s.status || '').toUpperCase()}
          size="small"
          color={s.status === 'active' ? 'success' : 'default'}
          sx={{ fontWeight: 700, fontSize: 11 }}
        />
      ),
    },
    {
      key: 'started_at',
      label: 'Timing',
      render: (_, s) => (
        <Box>
          <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>
            Start: {s.started_at ? new Date(s.started_at).toLocaleTimeString() : 'N/A'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
            End: {s.ended_at ? new Date(s.ended_at).toLocaleTimeString() : 'In Progress'}
          </Typography>
        </Box>
      ),
    },
  ];

  const shiftActions: TableAction<ShiftRecord>[] = [
    ...(canCheckoutShift
      ? [
          {
            label: 'Checkout',
            variant: 'error' as const,
            disabled: (s: ShiftRecord) => s.status !== 'active',
            onClick: (s: ShiftRecord) => handleCheckout(s.id),
            render: (s: ShiftRecord) =>
              s.status === 'active' ? (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  onClick={() => handleCheckout(s.id)}
                  sx={{ py: 0.25, px: 1, fontSize: 11 }}
                >
                  Checkout
                </Button>
              ) : null,
          },
        ]
      : []),
    {
      label: 'Delete',
      variant: 'error' as const,
      disabled: (s: ShiftRecord) => !canDeleteShiftRecord(s),
      onClick: (s: ShiftRecord) => handleOpenDeleteShift(s),
      render: (s: ShiftRecord) => {
        const allowed = canDeleteShiftRecord(s);
        const lockReason = !canDeleteOwnShift
          ? "Requires 'shifts.delete' permission (Admin can grant this in Admin Console)"
          : 'Cannot delete: normal users can only delete shifts they created themselves (not shifts created by Admin or another user)';
        return (
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon sx={{ fontSize: 14 }} />}
            disabled={!allowed || deleteShiftMutation.isPending}
            onClick={() => handleOpenDeleteShift(s)}
            title={allowed ? 'Permanently delete this shift and its scan logs' : lockReason}
            sx={{ py: 0.25, px: 1, fontSize: 11 }}
          >
            {allowed ? 'Delete' : !canDeleteOwnShift ? 'Delete 🔒' : 'Admin-Created 🔒'}
          </Button>
        );
      },
    },
  ];

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Top Banner */}
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ShiftIcon sx={{ color: '#FACC15', fontSize: 36 }} />
            Work Shifts & Scanner Sessions
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5 }}>
            Manage active warehouse shifts, issue scoped RS256 shift tokens, and embed offline rules for Android scanners.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          {hasActiveShift ? (
            <>
              {canCreateShift && (
                <Button
                  variant="outlined"
                  startIcon={<ReissueIcon />}
                  onClick={() => setReissueModalOpen(true)}
                  disabled={reissueMutation.isPending}
                  sx={{
                    borderColor: 'rgba(234, 179, 8, 0.4)',
                    color: '#FACC15',
                    '&:hover': { borderColor: '#FACC15', bgcolor: 'rgba(234, 179, 8, 0.1)' },
                  }}
                >
                  Reissue Token (QR & Raw)
                </Button>
              )}
              {canCheckoutShift && (
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<StopIcon />}
                  onClick={() => handleCheckout(activeShift?.id)}
                  disabled={checkoutMutation.isPending}
                >
                  Checkout & End Shift
                </Button>
              )}
              {canDeleteShiftRecord(activeShift) && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleOpenDeleteShift(activeShift)}
                  disabled={deleteShiftMutation.isPending}
                >
                  Delete Active Shift
                </Button>
              )}
            </>
          ) : (
            <>
              {isAdmin && (
                <Button
                  variant="outlined"
                  startIcon={<ReissueIcon />}
                  onClick={() => setReissueModalOpen(true)}
                  sx={{ borderColor: '#334155', color: '#FACC15' }}
                >
                  Admin Reissue Worker Shift
                </Button>
              )}
              {canCreateShift && (
                <Button
                  variant="contained"
                  startIcon={<StartIcon />}
                  onClick={() => setStartModalOpen(true)}
                  sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
                >
                  Start New Shift
                </Button>
              )}
            </>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              if (!canDeleteOwnShift) {
                ToastMsgs.error("Requires 'shifts.delete' permission to delete shifts");
                return;
              }
              handleOpenDeleteShift(null);
            }}
            disabled={!canDeleteOwnShift || deleteShiftMutation.isPending}
            title={
              canDeleteAnyShift
                ? 'Admin: Delete any shift by valid UUID'
                : canDeleteOwnShift
                ? 'Delete your own self-created shift'
                : "Requires 'shifts.delete' permission"
            }
            sx={{ borderColor: 'rgba(239, 68, 68, 0.45)', color: '#F87171' }}
          >
            {canDeleteAnyShift ? 'Delete Shift by ID' : canDeleteOwnShift ? 'Delete Own Shift' : 'Delete Shift 🔒'}
          </Button>
        </Stack>
      </Box>

      {/* Active Shift Card */}
      {isLoadingActive ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : hasActiveShift ? (
        <Card
          sx={{
            mb: 4,
            bgcolor: '#0B132B',
            border: '1px solid rgba(250, 204, 21, 0.4)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(250, 204, 21, 0.08)',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: '#10B981',
                    boxShadow: '0 0 12px #10B981',
                  }}
                />
                <Typography variant="h6" fontWeight={700} sx={{ color: '#F8FAFC' }}>
                  CURRENT ACTIVE SHIFT
                </Typography>
                <Chip label="ACTIVE SESSION" color="success" size="small" sx={{ fontWeight: 700 }} />
              </Box>

              <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace' }}>
                Shift ID: {activeShift?.id}
              </Typography>
            </Box>

            <Paper sx={{ p: 2, bgcolor: '#07111D', border: '1px solid #1E293B', borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="space-between">
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>
                    Operator
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ color: '#F8FAFC' }}>
                    {user?.name || user?.email} (ID #{activeShift?.user_id})
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>
                    Scanner Device ID
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#38BDF8', fontFamily: 'monospace' }}>
                    {activeShift?.device_id || 'DEFAULT_SCANNER'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>
                    Signing Key
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#A7F3D0', fontFamily: 'monospace' }}>
                    {activeShift?.key_id ? `${activeShift.key_id.slice(0, 8)}...` : 'Active Default'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>
                    Session Started
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#F8FAFC' }}>
                    {activeShift?.started_at ? new Date(activeShift.started_at).toLocaleTimeString() : 'N/A'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info" sx={{ mb: 4, bgcolor: '#0B132B', border: '1px solid #1E293B', color: '#94A3B8' }}>
          No active work shift currently open for your account. Start a new shift to generate an authorization QR token for your scanner.
        </Alert>
      )}

      {!canViewSelf && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You do not have permission to view work shifts (requires 'shifts.view' permission).
        </Alert>
      )}

      {/* Shifts History Table */}
      <Table<ShiftRecord>
        columns={shiftColumns}
        data={shifts}
        rowKey="id"
        isLoading={isLoadingShifts}
        emptyMessage={canViewSelf ? "No shift records found." : "No shifts accessible (shifts.view disabled)."}
        actions={shiftActions}
        showSearch={true}
        searchPlaceholder="Search shifts by user or device..."
        showPagination={true}
        itemsPerPage={10}
      />

      {/* START SHIFT MODAL */}
      <Dialog open={startModalOpen} onClose={() => setStartModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0B132B', color: '#F8FAFC' }}>Start New Work Shift</DialogTitle>
        <DialogContent sx={{ bgcolor: '#0B132B', pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#94A3B8', mt: 1 }}>
            Initiates an authenticated session and issues a scoped <code>shift_token</code> JWT scannable from the screen.
          </Typography>

          <TextField
            select
            fullWidth
            size="small"
            label="Cryptographic Signing Key (key_id)"
            value={startForm.key_id}
            onChange={(e) => setStartForm({ ...startForm, key_id: e.target.value })}
            helperText="Select which asymmetric RS256 key signs this shift token (Defaults to primary active key if not specified)"
          >
            <MenuItem value="">
              <em>Default Primary Active Key (Auto-detect)</em>
            </MenuItem>
            {keys.map((k) => (
              <MenuItem key={k.id} value={k.id}>
                🔑 {k.name} (kid: {k.kid}) {k.status === 'active' ? '• Active' : `• ${k.status}`}
              </MenuItem>
            ))}
          </TextField>

          <FormControl fullWidth size="small">
            <InputLabel>Shift Duration</InputLabel>
            <Select
              value={startForm.duration_hours}
              label="Shift Duration"
              onChange={(e) => setStartForm({ ...startForm, duration_hours: Number(e.target.value) })}
            >
              <MenuItem value={4}>4 Hours</MenuItem>
              <MenuItem value={8}>8 Hours (Standard)</MenuItem>
              <MenuItem value={12}>12 Hours</MenuItem>
              <MenuItem value={24}>24 Hours</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Scanner Device ID"
            value={startForm.device_id}
            onChange={(e) => setStartForm({ ...startForm, device_id: e.target.value })}
            fullWidth
            size="small"
          />

          {isAdmin && (
            <TextField
              label="Target User ID (Admin Delegation) - Optional"
              placeholder="e.g. 2"
              value={startForm.target_user_id}
              onChange={(e) => setStartForm({ ...startForm, target_user_id: e.target.value })}
              fullWidth
              size="small"
            />
          )}

          {/* Shift Parameter Checkboxes */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(7, 17, 29, 0.7)',
              border: '1px solid #1E293B',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              mt: 1,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={startForm.include_rules}
                  onChange={(e) => setStartForm({ ...startForm, include_rules: e.target.checked })}
                  size="small"
                  sx={{ color: '#64748B', '&.Mui-checked': { color: '#38BDF8' } }}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                    Embed Active Inventory Rules (<code>include_rules</code>)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>
                    If true (checked), embeds active inventory rules into the shift token. If false (unchecked), token is minted without rules.
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={startForm.qr_only}
                  onChange={(e) => setStartForm({ ...startForm, qr_only: e.target.checked })}
                  size="small"
                  sx={{ color: '#64748B', '&.Mui-checked': { color: '#F59E0B' } }}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                    Direct Scannable QR Image (<code>qr_only</code>)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>
                    If checked (true), returns the QR code image (PNG) of the shift token directly to scan on screen. If false (unchecked), returns raw JSON data.
                  </Typography>
                </Box>
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#0B132B', p: 2 }}>
          <Button onClick={() => setStartModalOpen(false)} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleStartSubmit}
            disabled={startShiftMutation.isPending}
            sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' } }}
          >
            Start Shift & Render QR
          </Button>
        </DialogActions>
      </Dialog>

      {/* REISSUE SHIFT MODAL */}
      <Dialog open={reissueModalOpen} onClose={() => setReissueModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0B132B', color: '#F8FAFC' }}>
          Reissue Active Shift Token (QR & Raw)
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#0B132B', pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body2" sx={{ color: '#94A3B8', mt: 1 }}>
            Re-mints a fresh <code>shift_token</code> JWT for your currently active session, available both as a scannable on-screen QR code and raw token string.
          </Typography>

          {isAdmin && (
            <TextField
              label="Target User ID (Admin Delegation) - Optional"
              placeholder="Leave empty to reissue own token"
              value={reissueForm.target_user_id}
              onChange={(e) => setReissueForm({ ...reissueForm, target_user_id: e.target.value })}
              fullWidth
              size="small"
            />
          )}

          {/* Reissue Parameter Checkboxes */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(7, 17, 29, 0.7)',
              border: '1px solid #1E293B',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              mt: 1,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={reissueForm.include_rules}
                  onChange={(e) => setReissueForm({ ...reissueForm, include_rules: e.target.checked })}
                  size="small"
                  sx={{ color: '#64748B', '&.Mui-checked': { color: '#38BDF8' } }}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                    Embed Active Inventory Rules (<code>include_rules</code>)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>
                    If checked (true), embeds active inventory rules into the reissued shift token. If false (unchecked), omits rules for a lighter token.
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={reissueForm.qr_only}
                  onChange={(e) => setReissueForm({ ...reissueForm, qr_only: e.target.checked })}
                  size="small"
                  sx={{ color: '#64748B', '&.Mui-checked': { color: '#F59E0B' } }}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                    Direct Scannable QR Image (<code>qr_only</code>)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>
                    If checked (true), returns the QR code image (PNG) of the shift token directly to scan on screen. If false (unchecked), returns raw JSON data.
                  </Typography>
                </Box>
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#0B132B', p: 2 }}>
          <Button onClick={() => setReissueModalOpen(false)} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleReissueSubmit}
            disabled={reissueMutation.isPending}
            sx={{ bgcolor: '#FACC15', color: '#0F172A', fontWeight: 700, '&:hover': { bgcolor: '#EAB308' } }}
          >
            Reissue Token
          </Button>
        </DialogActions>
      </Dialog>

      {/* SHIFT TOKEN MODAL: CONDITIONAL QR & RAW FORM */}
      <Dialog open={tokenModalOpen} onClose={() => setTokenModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0B132B', color: '#F8FAFC', pb: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {resultMode.qr_only ? <QrCodeIcon sx={{ color: '#FACC15' }} /> : <ShiftIcon sx={{ color: '#38BDF8' }} />}
          {resultMode.qr_only ? 'Shift Authorization QR Code' : 'Shift Authorization Token Credential'}
        </DialogTitle>
        <Box sx={{ borderBottom: 1, borderColor: '#1E293B', bgcolor: '#0B132B', px: 3 }}>
          <Tabs value={tokenModalTab} onChange={(_, val) => setTokenModalTab(val)}>
            {resultMode.qr_only && <Tab label="Scannable QR Code" value={0} />}
            <Tab label="Raw JWT Token String" value={1} />
          </Tabs>
        </Box>
        <DialogContent sx={{ bgcolor: '#0B132B', pt: 3 }}>
          {tokenModalTab === 0 && resultMode.qr_only && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 }}>
              <Typography variant="body2" sx={{ color: '#94A3B8', textAlign: 'center' }}>
                Point the Android scanner camera or mobile barcode reader directly at this QR code to login.
              </Typography>

              {qrCodeDataUrl ? (
                <Paper sx={{ p: 2, bgcolor: '#FFFFFF', borderRadius: 3, boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
                  <img
                    src={qrCodeDataUrl}
                    alt="Shift Token QR"
                    style={{ display: 'block', width: 240, height: 240 }}
                  />
                </Paper>
              ) : (
                <CircularProgress />
              )}

              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadQR}
                  sx={{ bgcolor: '#38BDF8', color: '#07111D', fontWeight: 700 }}
                >
                  Download QR Image (PNG)
                </Button>
                {tokenResult?.shift_token ? (
                  <Button
                    variant="outlined"
                    startIcon={<CopyIcon />}
                    onClick={() => handleCopy(tokenResult.shift_token || '', 'Shift Token')}
                    sx={{ color: '#FACC15', borderColor: '#FACC15' }}
                  >
                    Copy Token String
                  </Button>
                ) : null}
              </Stack>
            </Box>
          )}

          {(tokenModalTab === 1 || !resultMode.qr_only) && (
            <Stack spacing={2.5}>
              {/* Rules Status Banner */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: resultMode.include_rules ? 'rgba(56, 189, 248, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                  border: `1px solid ${resultMode.include_rules ? 'rgba(56, 189, 248, 0.3)' : 'rgba(100, 116, 139, 0.2)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="body2" sx={{ color: resultMode.include_rules ? '#38BDF8' : '#94A3B8', fontWeight: 600 }}>
                  Active Inventory Rules: {resultMode.include_rules ? 'Embedded in token payload' : 'Omitted (Minted without rules)'}
                </Typography>
                <Chip
                  size="small"
                  label={resultMode.include_rules ? 'Rules Included' : 'No Rules'}
                  color={resultMode.include_rules ? 'info' : 'default'}
                />
              </Box>

              <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                Raw RS256 Shift JWT token string. Can be pasted into headers or configuration payloads:
              </Typography>

              <Paper
                sx={{
                  p: 2,
                  bgcolor: '#07111D',
                  border: '1px solid #1E293B',
                  borderRadius: 2,
                  maxHeight: 220,
                  overflowY: 'auto',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    wordBreak: 'break-all',
                    color: '#A7F3D0',
                    m: 0,
                  }}
                >
                  {tokenResult?.shift_token || (tokenResult?.isQrBlob ? '(Token issued in direct QR PNG mode)' : 'No token string')}
                </Typography>
              </Paper>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: '#64748B' }}>
                  Shift ID: {tokenResult?.shift?.id || 'Active'}
                </Typography>
                {tokenResult?.shift_token && (
                  <Button
                    variant="outlined"
                    startIcon={<CopyIcon />}
                    onClick={() => handleCopy(tokenResult.shift_token || '', 'Raw JWT Token')}
                    sx={{ color: '#38BDF8', borderColor: '#38BDF8' }}
                  >
                    Copy Raw Token
                  </Button>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#0B132B', p: 2 }}>
          <Button onClick={() => setTokenModalOpen(false)} sx={{ color: '#94A3B8' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Shift Modal */}
      <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#0B132B', color: '#F87171', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon />
          {selectedShiftToDelete ? 'Confirm Shift Deletion' : 'Delete Shift by ID'}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#0B132B', pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="warning" sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#FCA5A5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            {canDeleteAnyShift
              ? 'Admin / Supervisor mode: You can permanently delete any shift by its valid UUID. Active shift tokens for that shift will be immediately invalidated in Redis.'
              : 'Normal user mode (shifts.delete): You can only delete shifts that belong to you and that you personally started (shifts created for you by an Admin cannot be deleted).'}
          </Alert>

          {selectedShiftToDelete ? (
            <Paper sx={{ p: 2, bgcolor: '#07111D', border: '1px solid #1E293B', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                Operator: {selectedShiftToDelete.user_name || selectedShiftToDelete.user_email || `User #${selectedShiftToDelete.user_id}`}
              </Typography>
              <Typography variant="caption" sx={{ color: '#38BDF8', fontFamily: 'monospace', display: 'block', mt: 0.5 }}>
                Shift UUID: {selectedShiftToDelete.id}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.5 }}>
                Status: {String(selectedShiftToDelete.status || '').toUpperCase()} | Device: {selectedShiftToDelete.device_id || 'DEFAULT'}
              </Typography>
            </Paper>
          ) : (
            <>
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>Select From Loaded Shifts (Optional)</InputLabel>
                <Select
                  value={shiftIdToDelete}
                  label="Select From Loaded Shifts (Optional)"
                  onChange={(e) => setShiftIdToDelete(String(e.target.value))}
                >
                  <MenuItem value="">
                    <em>-- Paste UUID below or pick a shift --</em>
                  </MenuItem>
                  {shifts
                    .filter((s) => canDeleteShiftRecord(s))
                    .map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.user_name || `User #${s.user_id}`} — {s.id.slice(0, 8)}... ({s.status.toUpperCase()})
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              <TextField
                label="Shift UUID to Delete"
                value={shiftIdToDelete}
                onChange={(e) => setShiftIdToDelete(e.target.value)}
                placeholder="e.g. 50678322-ef9f-4512-9c1c-4d657da52d85"
                fullWidth
                inputProps={{ style: { fontFamily: 'monospace' } }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#0B132B', p: 2 }}>
          <Button onClick={() => setDeleteModalOpen(false)} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleConfirmDeleteShift}
            disabled={deleteShiftMutation.isPending || !(selectedShiftToDelete?.id || shiftIdToDelete.trim())}
          >
            {deleteShiftMutation.isPending ? <CircularProgress size={20} /> : 'Permanently Delete Shift'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ShiftsPage;
