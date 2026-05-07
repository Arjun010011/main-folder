import React, { Component } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Grid, Box, MenuItem
} from '@material-ui/core';
import { KeyboardDatePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import Swal from 'sweetalert2';

import { postRequest, getRequest } from 'Includes/api/apicall';
import { POST_URL, GET_URL } from 'Includes/urls';
import { dateFormat } from 'Includes/functions';

const DISPOSAL_REASONS = [
    { id: 'SOLD', name: 'Sold' },
    { id: 'SCRAPPED', name: 'Scrapped' },
    { id: 'DONATED', name: 'Donated' },
    { id: 'WRITTEN_OFF', name: 'Written Off' },
    { id: 'LOST', name: 'Lost / Missing' },
    { id: 'OTHER', name: 'Other' }
];

const CREDIT_TO_OPTIONS = [
    { id: 'NONE', name: 'None' },
    { id: 'CASH', name: 'Cash-in-Hand' },
    { id: 'BANK', name: 'Bank Account' },
];

class AssetDisposalModal extends Component {
    constructor(props) {
        super(props);
        this.state = {
            disposal_date: new Date(),
            disposal_value: '',
            reason: 'SOLD',
            credit_to: 'NONE',
            credit_bank: '',
            remarks: '',
            submitting: false,
            errors: {},
            bankList: [],
        };
    }

    // Reasons that require zero disposal value
    ZERO_VALUE_REASONS = ['DONATED', 'WRITTEN_OFF', 'LOST'];

    componentDidMount() {
        this.fetchBankList();
    }

    fetchBankList = () => {
        const url = GET_URL.bankdetail.api;
        getRequest(url, { is_active: true }, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({ bankList: response.data?.data || [] });
            }
        });
    }

    handleChange = (name, value) => {
        const updates = {
            [name]: value,
            errors: { ...this.state.errors, [name]: '' }
        };

        // Auto-set disposal_value to 0 when selecting a zero-value reason
        if (name === 'reason' && this.ZERO_VALUE_REASONS.includes(value)) {
            updates.disposal_value = '0';
            updates.credit_to = 'NONE';
            updates.credit_bank = '';
            updates.errors = { ...updates.errors, disposal_value: '', credit_to: '', credit_bank: '' };
        }

        // Reset bank when credit_to changes away from BANK
        if (name === 'credit_to' && value !== 'BANK') {
            updates.credit_bank = '';
        }

        this.setState(updates);
    }

    validate = () => {
        const { disposal_date, disposal_value, reason, remarks, credit_to, credit_bank } = this.state;
        const errors = {};
        const value = parseFloat(disposal_value);

        if (!disposal_date) {
            errors.disposal_date = 'Disposal date is required';
        }
        if (disposal_value === '' || disposal_value === null) {
            errors.disposal_value = 'Disposal value is required';
        } else if (isNaN(value) || value < 0) {
            errors.disposal_value = 'Invalid amount';
        }
        if (!reason) {
            errors.reason = 'Reason is required';
        }

        // Disposal-type-specific validation
        if (!errors.disposal_value && reason) {
            switch (reason) {
                case 'SOLD':
                    if (value <= 0) errors.disposal_value = 'Sold asset must have a value greater than 0';
                    break;
                case 'SCRAPPED':
                    break;
                case 'DONATED':
                    if (value !== 0) errors.disposal_value = 'Donated asset value must be 0';
                    if (!remarks || !remarks.trim()) errors.remarks = 'Remarks required for donated assets';
                    break;
                case 'WRITTEN_OFF':
                    if (value !== 0) errors.disposal_value = 'Written off asset value must be 0';
                    if (!remarks || !remarks.trim()) errors.remarks = 'Remarks required for written off assets';
                    break;
                case 'LOST':
                    if (value !== 0) errors.disposal_value = 'Lost asset value must be 0';
                    if (!remarks || !remarks.trim()) errors.remarks = 'Remarks required for lost/missing assets';
                    break;
                case 'OTHER':
                    if (!remarks || !remarks.trim()) errors.remarks = 'Remarks required for other disposal reason';
                    break;
                default:
                    break;
            }
        }

        // If credit_to is BANK, bank must be selected
        if (!errors.disposal_value && value > 0 && credit_to === 'BANK' && !credit_bank) {
            errors.credit_bank = 'Please select a bank account';
        }

        this.setState({ errors });
        return Object.keys(errors).length === 0;
    }

    handleSubmit = () => {
        if (!this.validate()) return;

        const { asset, onSuccess, onClose } = this.props;
        const { disposal_date, disposal_value, reason, remarks, credit_to, credit_bank } = this.state;

        this.setState({ submitting: true });

        const payload = {
            asset: asset.id,
            disposal_date: dateFormat(disposal_date, 'YYYY-MM-DD'),
            disposal_value: parseFloat(disposal_value),
            reason,
            credit_to: credit_to || 'NONE',
            credit_bank: credit_to === 'BANK' && credit_bank ? parseInt(credit_bank) : null,
            remarks: remarks || null
        };

        const url = POST_URL.assetDispose.api;
        postRequest(url, payload, this.props).then(response => {
            this.setState({ submitting: false });
            if (response && response.status === 200) {
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: 'Asset disposed successfully',
                    showConfirmButton: false,
                    timer: 1500
                });
                if (onSuccess) onSuccess(asset.id);
                onClose();
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response?.data?.message || response?.data?.reason || 'Failed to dispose asset'
                });
            }
        });
    }

    render() {
        const { open, onClose, asset } = this.props;
        const { disposal_date, disposal_value, reason, remarks, submitting, errors, credit_to, credit_bank, bankList } = this.state;
        const disposalVal = parseFloat(disposal_value) || 0;
        const showCreditTo = disposalVal > 0 && !this.ZERO_VALUE_REASONS.includes(reason);

        if (!asset) return null;

        return (
            <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
                <DialogTitle>Dispose Asset: {asset.asset_name}</DialogTitle>
                <DialogContent>
                    <Box py={2}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                    <KeyboardDatePicker
                                        label="Disposal Date"
                                        format="dd-MM-yyyy"
                                        value={disposal_date ? disposal_date : null}
                                        onChange={(date) => this.handleChange('disposal_date', date)}
                                        fullWidth
                                        autoOk
                                        autoComplete="off"
                                        variant="inline"
                                        inputVariant="outlined"
                                        maxDate={new Date()}
                                        error={!!errors.disposal_date}
                                        helperText={errors.disposal_date}
                                        required
                                    />
                                </MuiPickersUtilsProvider>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label="Disposal Value (₹)"
                                    name="disposal_value"
                                    value={disposal_value}
                                    onChange={(e) => this.handleChange('disposal_value', e.target.value)}
                                    variant="outlined"
                                    fullWidth
                                    type="number"
                                    inputProps={{ min: 0, step: 0.01 }}
                                    error={!!errors.disposal_value}
                                    helperText={
                                        errors.disposal_value ||
                                        (this.ZERO_VALUE_REASONS.includes(reason)
                                            ? 'Value must be 0 for this disposal type'
                                            : 'Amount received from sale/Scrapped')
                                    }
                                    required
                                    disabled={this.ZERO_VALUE_REASONS.includes(reason)}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    select
                                    label="Reason"
                                    name="reason"
                                    value={reason}
                                    onChange={(e) => this.handleChange('reason', e.target.value)}
                                    variant="outlined"
                                    fullWidth
                                    error={!!errors.reason}
                                    helperText={errors.reason}
                                    required
                                >
                                    {DISPOSAL_REASONS.map(r => (
                                        <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            {showCreditTo && (
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        select
                                        label="Credit To"
                                        name="credit_to"
                                        value={credit_to}
                                        onChange={(e) => this.handleChange('credit_to', e.target.value)}
                                        variant="outlined"
                                        fullWidth
                                        helperText="Where should the disposal amount be credited?"
                                    >
                                        {CREDIT_TO_OPTIONS.map(opt => (
                                            <MenuItem key={opt.id} value={opt.id}>{opt.name}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                            )}
                            {showCreditTo && credit_to === 'BANK' && (
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        select
                                        label="Select Bank"
                                        name="credit_bank"
                                        value={credit_bank}
                                        onChange={(e) => this.handleChange('credit_bank', e.target.value)}
                                        variant="outlined"
                                        fullWidth
                                        error={!!errors.credit_bank}
                                        helperText={errors.credit_bank || 'Bank account to credit'}
                                        required
                                    >
                                        {bankList.map(bank => (
                                            <MenuItem key={bank.id} value={bank.id}>
                                                {bank.display_name || `${bank.bank_name} (${bank.account_num})`}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                            )}
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
                                    helperText={errors.remarks || (['DONATED', 'WRITTEN_OFF', 'LOST', 'OTHER'].includes(reason) ? 'Required for this disposal type' : '')}
                                    required={['DONATED', 'WRITTEN_OFF', 'LOST', 'OTHER'].includes(reason)}
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
                        color="secondary"
                        variant="contained"
                        disabled={submitting}
                    >
                        {submitting ? 'Processing...' : 'Dispose Asset'}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}

export default AssetDisposalModal;
