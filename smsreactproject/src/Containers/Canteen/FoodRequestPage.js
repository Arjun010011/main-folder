import React, { Component } from 'react';
import {
    Box, Grid, Paper, TextField, Button, Select, MenuItem, FormControl,
    InputLabel, Chip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, IconButton, Tooltip, Typography,
} from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import Swal from 'sweetalert2';
import SendIcon from '@material-ui/icons/Send';
import CancelIcon from '@material-ui/icons/Cancel';
import RefreshIcon from '@material-ui/icons/Refresh';

import loadingBar from 'images/loading.gif';
import { getRequest, postRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, PUT_URL } from 'Includes/urls';
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

class FoodRequestPage extends Component {
    state = {
        loading: false,
        foodItems: [],
        combos: [],
        myRequests: [],

        // form
        requestType: 'food_item',   // food_item | combo | custom
        selectedFoodItem: '',
        selectedCombo: '',
        customItemName: '',
        quantity: 1,
        allergyInfo: '',
        cookingInstructions: '',
        requestedDate: '',
        requestedMealType: 0,
        submitting: false,
    };

    componentDidMount() {
        this.loadData();
    }

    loadData = () => {
        this.setState({ loading: true });
        const p1 = getRequest(`${GET_URL.food_item.api}?is_active=true&limit=200&pageno=1`, {}, this.props);
        const p2 = getRequest(`${GET_URL.food_combo.api}?is_active=true&limit=200&pageno=1`, {}, this.props);
        const p3 = getRequest(`${GET_URL.food_request.api}?action=my_requests&limit=50&pageno=1`, {}, this.props);

        Promise.all([p1, p2, p3]).then(([r1, r2, r3]) => {
            this.setState({
                foodItems: r1?.data?.results || r1?.data?.data?.data_list || r1?.data?.data || [],
                combos: r2?.data?.results || r2?.data?.data?.data_list || r2?.data?.data || [],
                myRequests: r3?.data?.results || r3?.data?.data?.data_list || r3?.data?.data || [],
                loading: false,
            });
        }).catch(() => this.setState({ loading: false }));
    };

    getMinDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    };

    handleSubmit = () => {
        const {
            requestType, selectedFoodItem, selectedCombo, customItemName,
            quantity, allergyInfo, cookingInstructions, requestedDate, requestedMealType,
        } = this.state;

        if (!requestedDate) {
            Swal.fire('Error', 'Please select a date', 'error');
            return;
        }

        const payload = {
            quantity,
            allergy_info: allergyInfo,
            cooking_instructions: cookingInstructions,
            requested_date: requestedDate,
            requested_meal_type: requestedMealType,
        };

        if (requestType === 'food_item') {
            if (!selectedFoodItem) { Swal.fire('Error', 'Select a food item', 'error'); return; }
            payload.food_item = selectedFoodItem;
        } else if (requestType === 'combo') {
            if (!selectedCombo) { Swal.fire('Error', 'Select a combo', 'error'); return; }
            payload.combo = selectedCombo;
        } else {
            if (!customItemName.trim()) { Swal.fire('Error', 'Enter a custom item name', 'error'); return; }
            payload.custom_item_name = customItemName.trim();
        }

        this.setState({ submitting: true });
        postRequest(POST_URL.food_request.api, payload, this.props).then(res => {
            if (res && res.status === 200) {
                Swal.fire({ position: 'top-end', icon: 'success', title: res.data?.Reason || 'Request submitted!', showConfirmButton: false, timer: 1500 });
                this.setState({
                    selectedFoodItem: '', selectedCombo: '', customItemName: '',
                    quantity: 1, allergyInfo: '', cookingInstructions: '',
                    requestedDate: '', submitting: false,
                });
                this.loadData();
            } else {
                this.setState({ submitting: false });
            }
        }).catch(() => this.setState({ submitting: false }));
    };

    handleCancel = (id) => {
        Swal.fire({
            title: 'Cancel this request?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, cancel it',
        }).then(result => {
            if (result.value) {
                putRequest(`${PUT_URL.food_request.api}${id}/?action=cancel`, {}, this.props).then(res => {
                    if (res && res.status === 200) {
                        Swal.fire({ icon: 'success', title: 'Cancelled', timer: 1200, showConfirmButton: false });
                        this.loadData();
                    }
                });
            }
        });
    };

    render() {
        const {
            loading, foodItems, combos, myRequests,
            requestType, selectedFoodItem, selectedCombo, customItemName,
            quantity, allergyInfo, cookingInstructions, requestedDate, requestedMealType,
            submitting,
        } = this.state;

        if (loading) return <Box display="flex" justifyContent="center" p={4}><img src={loadingBar} className="loading" alt="loading" /></Box>;

        const s = canteenStyles;

        return (
            <Box>
                {/* ─── REQUEST FORM ─── */}
                <Paper style={{ ...s.card, padding: 24, marginBottom: 24 }}>
                    <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <Typography style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>Request Food</Typography>
                        <Chip label="Must request 1 day in advance" style={{ background: '#FFF3E0', color: '#E65100', fontWeight: 500 }} />
                    </Box>

                    <Grid container spacing={3}>
                        {/* Request Type */}
                        <Grid item xs={12} md={3}>
                            <FormControl variant="outlined" fullWidth size="small">
                                <InputLabel>Request Type</InputLabel>
                                <Select value={requestType} onChange={e => this.setState({ requestType: e.target.value })} label="Request Type">
                                    <MenuItem value="food_item">From Menu</MenuItem>
                                    <MenuItem value="combo">Combo</MenuItem>
                                    <MenuItem value="custom">Custom Item</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Item Picker */}
                        <Grid item xs={12} md={5}>
                            {requestType === 'food_item' && (
                                <FormControl variant="outlined" fullWidth size="small">
                                    <InputLabel>Select Food Item</InputLabel>
                                    <Select value={selectedFoodItem} onChange={e => this.setState({ selectedFoodItem: e.target.value })} label="Select Food Item">
                                        {foodItems.map(fi => <MenuItem key={fi.id} value={fi.id}>{fi.name} - ₹{fi.cost}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            )}
                            {requestType === 'combo' && (
                                <FormControl variant="outlined" fullWidth size="small">
                                    <InputLabel>Select Combo</InputLabel>
                                    <Select value={selectedCombo} onChange={e => this.setState({ selectedCombo: e.target.value })} label="Select Combo">
                                        {combos.map(c => <MenuItem key={c.id} value={c.id}>{c.name} - ₹{c.price}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            )}
                            {requestType === 'custom' && (
                                <TextField variant="outlined" fullWidth size="small" label="Custom Item Name"
                                    value={customItemName} onChange={e => this.setState({ customItemName: e.target.value })} />
                            )}
                        </Grid>

                        {/* Quantity */}
                        <Grid item xs={6} md={2}>
                            <TextField variant="outlined" fullWidth size="small" label="Qty" type="number"
                                value={quantity} onChange={e => this.setState({ quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                inputProps={{ min: 1 }} />
                        </Grid>

                        {/* Meal Type */}
                        <Grid item xs={6} md={2}>
                            <FormControl variant="outlined" fullWidth size="small">
                                <InputLabel>Meal</InputLabel>
                                <Select value={requestedMealType} onChange={e => this.setState({ requestedMealType: e.target.value })} label="Meal">
                                    {MEAL_TYPES.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Date */}
                        <Grid item xs={12} md={3}>
                            <TextField variant="outlined" fullWidth size="small" label="Requested Date" type="date"
                                value={requestedDate} onChange={e => this.setState({ requestedDate: e.target.value })}
                                InputLabelProps={{ shrink: true }} inputProps={{ min: this.getMinDate() }} />
                        </Grid>

                        {/* Allergy Info */}
                        <Grid item xs={12} md={4}>
                            <TextField variant="outlined" fullWidth size="small" label="Allergy Info (optional)"
                                value={allergyInfo} onChange={e => this.setState({ allergyInfo: e.target.value })} />
                        </Grid>

                        {/* Cooking Instructions */}
                        <Grid item xs={12} md={5}>
                            <TextField variant="outlined" fullWidth size="small" label="Cooking Instructions (optional)"
                                value={cookingInstructions} onChange={e => this.setState({ cookingInstructions: e.target.value })} />
                        </Grid>
                    </Grid>

                    <Box mt={3} display="flex" justifyContent="flex-end">
                        <Button variant="contained" disabled={submitting} onClick={this.handleSubmit}
                            style={{ background: '#1C52C8', color: '#fff', textTransform: 'none', fontWeight: 600 }}
                            startIcon={<SendIcon />}>
                            Submit Request
                        </Button>
                    </Box>
                </Paper>

                {/* ─── MY REQUESTS ─── */}
                <Paper style={{ ...s.card, padding: 24 }}>
                    <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Typography style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>My Requests</Typography>
                        <IconButton size="small" onClick={this.loadData}><RefreshIcon /></IconButton>
                    </Box>

                    {myRequests.length === 0 ? (
                        <Box py={4} textAlign="center" color="#999">No food requests yet</Box>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow style={{ background: '#f7f9fe' }}>
                                        <TableCell style={{ fontWeight: 600 }}>Item</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Date</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Meal</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Qty</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Status</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Reason</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {myRequests.map(r => {
                                        const st = STATUS_MAP[r.status] || STATUS_MAP[0];
                                        return (
                                            <TableRow key={r.id}>
                                                <TableCell>{r.item_display || r.custom_item_name || '-'}</TableCell>
                                                <TableCell>{dateFormat(r.requested_date, 'DD/MM/YYYY')}</TableCell>
                                                <TableCell>{r.meal_type_display}</TableCell>
                                                <TableCell>{r.quantity}</TableCell>
                                                <TableCell>
                                                    <Chip label={st.label} size="small"
                                                        style={{ background: st.bg, color: st.color, fontWeight: 600, fontSize: 11 }} />
                                                </TableCell>
                                                <TableCell style={{ maxWidth: 200, fontSize: 12 }}>{r.rejection_reason || '-'}</TableCell>
                                                <TableCell>
                                                    {r.status === 0 && (
                                                        <Tooltip title="Cancel">
                                                            <IconButton size="small" onClick={() => this.handleCancel(r.id)}>
                                                                <CancelIcon style={{ color: '#d32f2f', fontSize: 20 }} />
                                                            </IconButton>
                                                        </Tooltip>
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
            </Box>
        );
    }
}

export default withRouter(FoodRequestPage);
