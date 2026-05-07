import React, { Component } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Grid, Box
} from '@material-ui/core';
import { KeyboardDatePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import Swal from 'sweetalert2';

import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls';
import { dateFormat, numberWithCommas } from 'Includes/functions';

class AssetAdditionModal extends Component {
    constructor(props) {
        super(props);
        this.state = {
            movement_date: new Date(),
            amount: '',
            remarks: '',
            submitting: false,
            errors: {}
        };
    }

    handleChange = (name, value) => {
        this.setState({
            [name]: value,
            errors: { ...this.state.errors, [name]: '' }
        });
    }

    validate = () => {
        const { movement_date, amount } = this.state;
        const errors = {};
        const value = parseFloat(amount);

        if (!movement_date) {
            errors.movement_date = 'Date is required';
        }
        if (amount === '' || amount === null) {
            errors.amount = 'Amount is required';
        } else if (isNaN(value) || value <= 0) {
            errors.amount = 'Amount must be greater than 0';
        }

        this.setState({ errors });
        return Object.keys(errors).length === 0;
    }

    handleSubmit = () => {
        if (!this.validate()) return;

        const { asset, onSuccess, onClose } = this.props;
        const { movement_date, amount, remarks } = this.state;

        this.setState({ submitting: true });

        const payload = {
            asset: asset.id,
            movement_type: 'ADDITION',
            amount: parseFloat(amount),
            movement_date: dateFormat(movement_date, 'YYYY-MM-DD'),
            remarks: remarks || null
        };

        const url = POST_URL.assetCostMovements.api;
        postRequest(url, payload, this.props).then(response => {
            this.setState({ submitting: false });
            if (response && response.status === 200) {
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: 'Amount added successfully',
                    showConfirmButton: false,
                    timer: 1500
                });
                if (onSuccess) onSuccess(asset.id);
                onClose();
                // Reset form
                this.setState({
                    movement_date: new Date(),
                    amount: '',
                    remarks: '',
                    errors: {}
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response?.data?.message || response?.data?.reason || 'Failed to add amount'
                });
            }
        });
    }

    render() {
        const { open, onClose, asset } = this.props;
        const { movement_date, amount, remarks, submitting, errors } = this.state;

        if (!asset) return null;

        return (
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>Add Amount: {asset.asset_name}</DialogTitle>
                <DialogContent>
                    <Box mb={2} p={2} style={{ backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <div style={{ fontSize: '0.85rem', color: '#666' }}>Original Cost</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 500, color: '#1565c0' }}>
                                    {numberWithCommas(asset.original_cost)}
                                </div>
                            </Grid>
                            <Grid item xs={6}>
                                <div style={{ fontSize: '0.85rem', color: '#666' }}>Current Cost</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 500, color: '#2e7d32' }}>
                                    {numberWithCommas(asset.current_cost)}
                                </div>
                            </Grid>
                        </Grid>
                    </Box>
                    <Box py={1}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                    <KeyboardDatePicker
                                        label="Date"
                                        format="dd-MM-yyyy"
                                        value={movement_date ? movement_date : null}
                                        onChange={(date) => this.handleChange('movement_date', date)}
                                        fullWidth
                                        autoOk
                                        autoComplete="off"
                                        variant="inline"
                                        inputVariant="outlined"
                                        maxDate={new Date()}
                                        error={!!errors.movement_date}
                                        helperText={errors.movement_date}
                                        required
                                    />
                                </MuiPickersUtilsProvider>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label="Amount (₹)"
                                    name="amount"
                                    value={amount}
                                    onChange={(e) => this.handleChange('amount', e.target.value)}
                                    variant="outlined"
                                    fullWidth
                                    type="number"
                                    inputProps={{ min: 0.01, step: 0.01 }}
                                    error={!!errors.amount}
                                    helperText={errors.amount || 'Capital addition amount'}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Remarks"
                                    name="remarks"
                                    value={remarks}
                                    onChange={(e) => this.handleChange('remarks', e.target.value)}
                                    variant="outlined"
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    error={!!errors.remarks}
                                    helperText={errors.remarks}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={this.handleSubmit}
                        color="primary"
                        variant="contained"
                        disabled={submitting}
                    >
                        {submitting ? 'Processing...' : 'Add Amount'}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default AssetAdditionModal;
