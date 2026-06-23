import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Chip, Avatar,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tabs, Tab
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import api from '../api/axios';

const STATUS_COLORS = { pending: 'warning', approved: 'success', rejected: 'error', cancelled: 'default' };

export default function LeavesPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [reviewDialog, setReviewDialog] = useState(null); // { leave, action }
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page + 1, limit: rowsPerPage, ...(tab !== 'all' && { status: tab }) });
      const { data } = await api.get(`/leaves?${params}`);
      setLeaves(data.data);
      setTotal(data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tab, page, rowsPerPage]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleReview = async () => {
    setSubmitting(true);
    try {
      await api.put(`/leaves/${reviewDialog.leave.id}`, { status: reviewDialog.action, review_comment: comment });
      setReviewDialog(null);
      setComment('');
      fetchLeaves();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process leave');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5">Leave Management</Typography>
        <Typography variant="body2" color="text.secondary">Review and manage employee leave requests</Typography>
      </Box>

      <Card>
        <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(0); }} sx={{ px: 2, borderBottom: '1px solid #E5E7EB' }}>
          <Tab label="Pending" value="pending" />
          <Tab label="Approved" value="approved" />
          <Tab label="Rejected" value="rejected" />
          <Tab label="All" value="all" />
        </Tabs>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Leave Type</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell>Days</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress /></TableCell></TableRow>
                ) : leaves.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><Typography color="text.secondary">No leave requests found</Typography></TableCell></TableRow>
                ) : leaves.map((l) => (
                  <TableRow key={l.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 12 }}>{l.first_name?.[0]}{l.last_name?.[0]}</Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{l.first_name} {l.last_name}</Typography>
                          <Typography variant="caption" color="text.secondary">{l.employee_code}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Chip label={l.leave_type_code} size="small" variant="outlined" /></TableCell>
                    <TableCell>{new Date(l.from_date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>{new Date(l.to_date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>{l.total_days}</TableCell>
                    <TableCell><Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>{l.reason}</Typography></TableCell>
                    <TableCell><Chip label={l.status} color={STATUS_COLORS[l.status]} size="small" /></TableCell>
                    <TableCell align="center">
                      {l.status === 'pending' && (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Button size="small" color="success" startIcon={<CheckCircle />} onClick={() => setReviewDialog({ leave: l, action: 'approved' })}>Approve</Button>
                          <Button size="small" color="error" startIcon={<Cancel />} onClick={() => setReviewDialog({ leave: l, action: 'rejected' })}>Reject</Button>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div" count={total} page={page} onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]}
          />
        </CardContent>
      </Card>

      <Dialog open={Boolean(reviewDialog)} onClose={() => setReviewDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{reviewDialog?.action === 'approved' ? 'Approve' : 'Reject'} Leave Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {reviewDialog?.leave.first_name} {reviewDialog?.leave.last_name} · {reviewDialog?.leave.total_days} day(s)
          </Typography>
          <TextField
            fullWidth multiline rows={3} label="Comment (optional)" value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(null)}>Cancel</Button>
          <Button
            onClick={handleReview} variant="contained" disabled={submitting}
            color={reviewDialog?.action === 'approved' ? 'success' : 'error'}
          >
            {submitting ? <CircularProgress size={20} /> : `Confirm ${reviewDialog?.action === 'approved' ? 'Approval' : 'Rejection'}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
