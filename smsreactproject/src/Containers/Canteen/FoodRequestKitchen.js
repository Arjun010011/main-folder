import React, { Component } from 'react';
import {
    Box, Grid, Paper, TextField, Button, Select, MenuItem, FormControl,
    InputLabel, Chip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, IconButton, Tooltip, Typography, Dialog,
    DialogTitle, DialogContent, DialogActions,
} from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import Swal from 'sweetalert2';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CancelIcon from '@material-ui/icons/Cancel';
import RefreshIcon from '@material-ui/icons/Refresh';
import FilterListIcon from '@material-ui/icons/FilterList';

import loadingBar from 'images/loading.gif';
import { getRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL } from 'Includes/urls';
import { dateFormat } from 'Includes/functions';
import canteenStyles from './canteenStyles';

const MEAL_TYPES = [
    { value: 0, label: 'Breakfast' },
    { value: 1, label: 'Lunch' },
    { value: 2, label: 'Snacks' },
    { value: 3, label: 'Dinner' },
];

const STATUS_MAP = {
    0: { label: 'Pending', color: '#E65100', bg: '#FFF3E0' },
    1: { label: 'Accepted', color: '#2E7D32', bg: '#E8F5E9' },
    2: { label: 'Rejected', color: '#d32f2f', bg: '#FFEBEE' },
    3: { label: 'Cancelled', color: '#666', bg: '#f5f5f5' },
};

class FoodRequestKitchen extends Component {
    state = {
        loading: false,
        requests: [],
        filterDate: '',
        filterStatus: '',
        filterMeal: '',

        // reject dialog
        rejectDialogOpen: false,
        rejectingId: null,
        rejectionReason: '',
    };

    componentDidMount() {
        this.loadRequests();
    }

    loadRequests = () => {
        this.setState({ loading: true });
        let url = `${GET_URL.food_request.api}?action=kitchen&limit=100&pageno=1`;
        const { filterDate, filterStatus, filterMeal } = this.state;
        if (filterDate) url += `&requested_date=${filterDate}`;
        if (filterStatus !== '') url += `&status=${filterStatus}`;
        if (filterMeal !== '') url += `&requested_meal_type=${filterMeal}`;

        getRequest(url, {}, this.props).then(res => {
            this.setState({
                requests: res?.data?.results || res?.data?.data?.data_list || res?.data?.data || [],
                loading: false,
            });
        }).catch(() => this.setState({ loading: false }));
    };

    handleAccept = (id) => {
        Swal.fire({ title: 'Accept this request?', icon: 'question', showCancelButton: true, confirmButtonText: 'Accept' })
            .then(result => {
                if (result.value) {
                    putRequest(`${PUT_URL.food_request.api}${id}/?action=accept`, {}, this.props).then(res => {
                        if (res && res.status === 200) {
                            Swal.fire({ icon: 'success', title: 'Accepted!', timer: 1200, showConfirmButton: false });
                            this.loadRequests();
                        }
                    });
                }
            });
    };

    handleRejectOpen = (id) => {
        this.setState({ rejectDialogOpen: true, rejectingId: id, rejectionReason: '' });
    };

    handleRejectConfirm = () => {
        const { rejectingId, rejectionReason } = this.state;
        if (!rejectionReason.trim()) {
            Swal.fire('Error', 'Rejection reason is required', 'error');
            return;
        }
        putRequest(`${PUT_URL.food_request.api}${rejectingId}/?action=reject`, { rejection_reason: rejectionReason }, this.props)
            .then(res => {
                if (res && res.status === 200) {
                    Swal.fire({ icon: 'success', title: 'Rejected', timer: 1200, showConfirmButton: false });
                    this.setState({ rejectDialogOpen: false, rejectingId: null });
                    this.loadRequests();
                }
            });
    };

    render() {
        const { loading, requests, filterDate, filterStatus, filterMeal, rejectDialogOpen, rejectionReason } = this.state;
        const s = canteenStyles;

        if (loading) return <Box display="flex" justifyContent="center" p={4}><img src={loadingBar} className="loading" alt="loading" /></Box>;

        const pendingCount = requests.filter(r => r.status === 0).length;

        return (
            <Box>
                <Paper style={{ ...s.card, padding: 24 }}>
                    <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Box style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Typography style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>Kitchen - Food Requests</Typography>
                            {pendingCount > 0 && (
                                <Chip label={`${pendingCount} Pending`} size="small"
                                    style={{ background: '#FFF3E0', color: '#E65100', fontWeight: 600 }} />
                            )}
                        </Box>
                        <IconButton size="small" onClick={this.loadRequests}><RefreshIcon /></IconButton>
                    </Box>

                    {/* Filters */}
                    <Grid container spacing={2} style={{ marginBottom: 20 }}>
                        <Grid item xs={6} md={3}>
                            <TextField variant="outlined" fullWidth size="small" label="Filter by Date" type="date"
                                value={filterDate} onChange={e => this.setState({ filterDate: e.target.value }, this.loadRequests)}
                                InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={6} md={2}>
                            <FormControl variant="outlined" fullWidth size="small">
                                <InputLabel>Status</InputLabel>
                                <Select value={filterStatus} onChange={e => this.setState({ filterStatus: e.target.value }, this.loadRequests)} label="Status">
                                    <MenuItem value="">All</MenuItem>
                                    <MenuItem value={0}>Pending</MenuItem>
                                    <MenuItem value={1}>Accepted</MenuItem>
                                    <MenuItem value={2}>Rejected</MenuItem>
                                    <MenuItem value={3}>Cancelled</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6} md={2}>
                            <FormControl variant="outlined" fullWidth size="small">
                                <InputLabel>Meal</InputLabel>
                                <Select value={filterMeal} onChange={e => this.setState({ filterMeal: e.target.value }, this.loadRequests)} label="Meal">
                                    <MenuItem value="">All</MenuItem>
                                    {MEAL_TYPES.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6} md={2}>
                            <Button variant="outlined" size="small" onClick={() => this.setState({ filterDate: '', filterStatus: '', filterMeal: '' }, this.loadRequests)}
                                style={{ height: 40, textTransform: 'none' }}
                                startIcon={<FilterListIcon />}>Clear</Button>
                        </Grid>
                    </Grid>

                    {requests.length === 0 ? (
                        <Box py={6} textAlign="center" color="#999">No requests found</Box>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow style={{ background: '#f7f9fe' }}>
                                        <TableCell style={{ fontWeight: 600 }}>Requested By</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Item</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Date</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Meal</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Qty</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Allergy Info</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Instructions</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Status</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {requests.map(r => {
                                        const st = STATUS_MAP[r.status] || STATUS_MAP[0];
                                        return (
                                            <TableRow key={r.id}>
                                                <TableCell>{r.user_name || '-'}</TableCell>
                                                <TableCell style={{ fontWeight: 500 }}>{r.item_display || r.custom_item_name || '-'}</TableCell>
                                                <TableCell>{dateFormat(r.requested_date, 'DD/MM/YYYY')}</TableCell>
                                                <TableCell>{r.meal_type_display}</TableCell>
                                                <TableCell>{r.quantity}</TableCell>
                                                <TableCell style={{ maxWidth: 150, fontSize: 12, color: r.allergy_info ? '#d32f2f' : '#999' }}>
                                                    {r.allergy_info || 'None'}
                                                </TableCell>
                                                <TableCell style={{ maxWidth: 180, fontSize: 12 }}>
                                                    {r.cooking_instructions || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={st.label} size="small"
                                                        style={{ background: st.bg, color: st.color, fontWeight: 600, fontSize: 11 }} />
                                                </TableCell>
                                                <TableCell>
                                                    {r.status === 0 && (
                                                        <Box display="flex" style={{ gap: 4 }}>
                                                            <Tooltip title="Accept">
                                                                <IconButton size="small" onClick={() => this.handleAccept(r.id)}>
                                                                    <CheckCircleIcon style={{ color: '#2E7D32', fontSize: 22 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Reject">
                                                                <IconButton size="small" onClick={() => this.handleRejectOpen(r.id)}>
                                                                    <CancelIcon style={{ color: '#d32f2f', fontSize: 22 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    )}
                                                    {r.status !== 0 && r.reviewed_by_name && (
                                                        <Typography style={{ fontSize: 11, color: '#999' }}>by {r.reviewed_by_name}</Typography>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>

                {/* Reject Reason Dialog */}
                <Dialog open={rejectDialogOpen} onClose={() => this.setState({ rejectDialogOpen: false })} maxWidth="sm" fullWidth>
                    <DialogTitle>Reject Request</DialogTitle>
                    <DialogContent>
                        <TextField variant="outlined" fullWidth multiline rows={3} label="Rejection Reason (required)"
                            value={rejectionReason} onChange={e => this.setState({ rejectionReason: e.target.value })} autoFocus />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => this.setState({ rejectDialogOpen: false })} style={{ textTransform: 'none' }}>Cancel</Button>
                        <Button onClick={this.handleRejectConfirm} variant="contained"
                            style={{ background: '#d32f2f', color: '#fff', textTransform: 'none' }}>Reject</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

export default withRouter(FoodRequestKitchen);
