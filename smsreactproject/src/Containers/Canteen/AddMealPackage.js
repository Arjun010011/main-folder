import React, { Component } from 'react';
import { Box, Grid, Typography, TextField, CircularProgress, IconButton, Chip, Tooltip } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import { withRouter } from 'react-router-dom';
import Swal from 'sweetalert2';

import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { isUserHasPermission } from 'Includes/functions';
import S from './canteenStyles';
import loadingBar from 'images/loading.gif';

const MEAL_TYPES = [
    { id: 0, name: 'Breakfast' },
    { id: 1, name: 'Lunch' },
    { id: 2, name: 'Snacks' },
    { id: 3, name: 'Dinner' },
    { id: 4, name: 'All Meals' },
];

const DURATION_OPTIONS = [
    { value: 7, label: '7 Days' },
    { value: 15, label: '15 Days' },
    { value: 30, label: '1 Month' },
    { value: 60, label: '2 Months' },
    { value: 90, label: '3 Months' },
    { value: 180, label: '6 Months' },
    { value: 365, label: '1 Year' },
];

const AVAILABLE_FOR = [
    { id: 0, label: 'Staff', color: S.COLORS.primary, bg: S.COLORS.primaryBg },
    { id: 1, label: 'Student', color: S.COLORS.primary, bg: S.COLORS.primaryBg },
    { id: 2, label: 'Both', color: S.COLORS.primary, bg: S.COLORS.primaryBg },
];

const VEG_LABELS = { 0: 'Veg', 1: 'Non-Veg', 2: 'Egg' };
const VEG_COLORS = { 0: '#2E7D32', 1: '#C62828', 2: '#F57F17' };

class AddMealPackage extends Component {
    state = {
        loading: false,
        submitDisable: false,
        name: '',
        price: '',
        meal_type: 0,
        duration_days: 30,
        available_for: 2,
        is_pause_allowed: true,
        description: '',
        // Item picker
        foodItemOptions: [],
        foodComboOptions: [],
        loadingItems: false,
        loadingCombos: false,
        selectedFoodItems: [],
        selectedCombos: [],
        packageItems: [],
        errors: {},
    };

    componentDidMount() {
        this.searchFoodItems('');
        this.searchFoodCombos('');
    }

    searchFoodItems = (searchText) => {
        this.setState({ loadingItems: true });
        getRequest(GET_URL.food_item.api, { is_active: true, limit: 20, pageno: 1, search: searchText || '' }, this.props).then(response => {
            const list = response?.data?.data?.data_list || response?.data?.data || [];
            this.setState({ foodItemOptions: Array.isArray(list) ? list : [], loadingItems: false });
        });
    };

    searchFoodCombos = (searchText) => {
        this.setState({ loadingCombos: true });
        getRequest(GET_URL.food_combo.api, { is_active: true, limit: 20, pageno: 1, search: searchText || '' }, this.props).then(response => {
            const list = response?.data?.data?.data_list || response?.data?.data || [];
            this.setState({ foodComboOptions: Array.isArray(list) ? list : [], loadingCombos: false });
        });
    };

    addSelectedItems = () => {
        const { selectedFoodItems, selectedCombos, packageItems } = this.state;
        let added = 0;
        selectedFoodItems.forEach(item => {
            if (!packageItems.find(pi => pi.type === 'item' && pi.data.id === item.id)) {
                packageItems.push({ type: 'item', data: item, quantity: 1 });
                added++;
            }
        });
        selectedCombos.forEach(combo => {
            if (!packageItems.find(pi => pi.type === 'combo' && pi.data.id === combo.id)) {
                packageItems.push({ type: 'combo', data: combo, quantity: 1 });
                added++;
            }
        });
        if (added === 0 && (selectedFoodItems.length > 0 || selectedCombos.length > 0)) {
            Swal.fire({ icon: 'info', title: 'Items already added', timer: 1200, showConfirmButton: false });
        }
        this.setState({ packageItems: [...packageItems], selectedFoodItems: [], selectedCombos: [] });
    };

    removeItem = (index) => {
        const { packageItems } = this.state;
        packageItems.splice(index, 1);
        this.setState({ packageItems: [...packageItems] });
    };

    updateItemQty = (index, value) => {
        const { packageItems } = this.state;
        packageItems[index].quantity = parseInt(value) || 1;
        this.setState({ packageItems: [...packageItems] });
    };

    validate = () => {
        const { name, price, packageItems } = this.state;
        const errors = {};
        if (!name.trim()) errors.name = 'Package name is required';
        if (!price || parseFloat(price) <= 0) errors.price = 'Valid price is required';
        if (packageItems.length === 0) errors.items = 'Add at least one item';
        this.setState({ errors });
        if (Object.keys(errors).length > 0) return;

        this.setState({ submitDisable: true });
        const { meal_type, duration_days, available_for, description } = this.state;

        const payload = {
            name: name.trim(),
            price: parseFloat(price),
            meal_type: parseInt(meal_type),
            duration_days: parseInt(duration_days),
            available_for: parseInt(available_for),
            is_pause_allowed: this.state.is_pause_allowed,
            description: description || '',
        };

        postRequest(POST_URL.meal_package.api, payload, this.props).then(response => {
            if (response && response.status === 200) {
                const pkgId = response.data?.data?.id || response.data?.id;
                if (!pkgId) {
                    Swal.fire({ icon: 'success', title: 'Package created!', timer: 1500, showConfirmButton: false });
                    this.props.history.goBack();
                    return;
                }

                const itemPromises = packageItems.map(pi => {
                    const itemPayload = {
                        package: pkgId,
                        quantity: pi.quantity,
                        days_of_week: '0,1,2,3,4,5,6',
                    };
                    if (pi.type === 'item') itemPayload.food_item = pi.data.id;
                    else itemPayload.combo = pi.data.id;
                    return postRequest(POST_URL.meal_package_item.api, itemPayload, this.props);
                });

                Promise.all(itemPromises).then(results => {
                    const success = results.filter(r => r && (r.status === 200 || r.status === 201)).length;
                    Swal.fire({
                        position: 'top-end', icon: 'success',
                        title: `Package created with ${success} items!`,
                        showConfirmButton: false, timer: 1500,
                    });
                    this.props.history.goBack();
                });
            } else {
                Swal.fire({ icon: 'error', title: response?.data?.Reason || 'Failed to create package' });
            }
            this.setState({ submitDisable: false });
        });
    };

    render() {
        const {
            loading, submitDisable, name, price, meal_type, duration_days, available_for,
            description, foodItemOptions, foodComboOptions, loadingItems, loadingCombos,
            selectedFoodItems, selectedCombos, packageItems, errors,
        } = this.state;

        if (loading) return <Box display="flex" justifyContent="center" p={6}><img src={loadingBar} className="loading" alt="loading" /></Box>;

        return (
            <Box>
                {/* Header */}
                <Box style={{ ...S.header, marginBottom: '24px' }}>
                    <Box style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <IconButton size="small" style={{ color: '#fff' }} onClick={() => this.props.history.goBack()}>
                            <ArrowBackIcon />
                        </IconButton>
                        <Box>
                            <Typography style={S.headerTitle}>Add Meal Package</Typography>
                            <Typography style={S.headerSubtitle}>Create a new meal package with items</Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Form Card */}
                <Box style={{ ...S.card, padding: '24px', marginBottom: '20px' }}>
                    <Typography style={{ ...S.sectionTitle, marginBottom: '20px' }}>Package Details</Typography>

                    {/* Row 1: Name + Price */}
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={5}>
                            <Box style={S.formGroup}>
                                <Box style={S.formLabel}>Package Name *</Box>
                                <input
                                    style={{ ...S.formInput, borderColor: errors.name ? '#d32f2f' : S.COLORS.border }}
                                    placeholder="e.g. Monthly Lunch Package"
                                    value={name}
                                    onChange={e => this.setState({ name: e.target.value, errors: { ...errors, name: '' } })}
                                />
                                {errors.name && <Box style={{ color: '#d32f2f', fontSize: '11px', marginTop: '4px' }}>{errors.name}</Box>}
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Box style={S.formGroup}>
                                <Box style={S.formLabel}>Price (₹) *</Box>
                                <input
                                    style={{ ...S.formInput, borderColor: errors.price ? '#d32f2f' : S.COLORS.border }}
                                    type="number"
                                    placeholder="e.g. 1500"
                                    value={price}
                                    min="0"
                                    onChange={e => this.setState({ price: e.target.value, errors: { ...errors, price: '' } })}
                                />
                                {errors.price && <Box style={{ color: '#d32f2f', fontSize: '11px', marginTop: '4px' }}>{errors.price}</Box>}
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Box style={S.formGroup}>
                                <Box style={S.formLabel}>Meal Type</Box>
                                <select
                                    style={S.formSelect}
                                    value={meal_type}
                                    onChange={e => this.setState({ meal_type: e.target.value })}
                                >
                                    {MEAL_TYPES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Row 2: Duration + Available For */}
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <Box style={S.formGroup}>
                                <Box style={S.formLabel}>Duration</Box>
                                <select
                                    style={S.formSelect}
                                    value={duration_days}
                                    onChange={e => this.setState({ duration_days: e.target.value })}
                                >
                                    {DURATION_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                </select>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={8}>
                            <Box style={S.formGroup}>
                                <Box style={S.formLabel}>Available For</Box>
                                <Box style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                    {AVAILABLE_FOR.map(af => (
                                        <Box
                                            key={af.id}
                                            onClick={() => this.setState({ available_for: af.id })}
                                            style={{
                                                padding: '10px 24px',
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                fontWeight: 700,
                                                fontSize: '13px',
                                                border: available_for === af.id ? `2px solid ${af.color}` : '2px solid #e0e0e0',
                                                background: available_for === af.id ? af.bg : '#fafafa',
                                                color: available_for === af.id ? af.color : '#999',
                                                boxShadow: available_for === af.id ? `0 2px 8px ${af.color}22` : 'none',
                                            }}
                                        >
                                            {af.label}
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Row 3: Pause Toggle */}
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <Box style={S.formGroup}>
                                <Box style={S.formLabel}>Allow Pause</Box>
                                <Box
                                    onClick={() => this.setState({ is_pause_allowed: !this.state.is_pause_allowed })}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '10px',
                                        cursor: 'pointer', padding: '10px 16px', borderRadius: '10px',
                                        border: `2px solid ${this.state.is_pause_allowed ? S.COLORS.success : '#e0e0e0'}`,
                                        background: this.state.is_pause_allowed ? '#E8F5E9' : '#fafafa',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <Box style={{
                                        width: '36px', height: '20px', borderRadius: '10px',
                                        background: this.state.is_pause_allowed ? S.COLORS.success : '#ccc',
                                        position: 'relative', transition: 'background 0.2s',
                                    }}>
                                        <Box style={{
                                            width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                                            position: 'absolute', top: '2px',
                                            left: this.state.is_pause_allowed ? '18px' : '2px',
                                            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        }} />
                                    </Box>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: this.state.is_pause_allowed ? S.COLORS.success : '#999' }}>
                                        {this.state.is_pause_allowed ? 'Subscribers can pause' : 'Pause not allowed'}
                                    </span>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Row 4: Description */}
                    <Box style={S.formGroup}>
                        <Box style={S.formLabel}>Description (Optional)</Box>
                        <input
                            style={S.formInput}
                            placeholder="Brief description of the package..."
                            value={description}
                            onChange={e => this.setState({ description: e.target.value })}
                        />
                    </Box>
                </Box>

                {/* Items Section */}
                <Box style={{ ...S.card, padding: '24px', marginBottom: '20px' }}>
                    <Typography style={{ ...S.sectionTitle, marginBottom: '16px' }}>
                        <AddCircleOutlineIcon style={{ color: S.COLORS.primary }} /> Package Items
                    </Typography>
                    {errors.items && <Box style={{ color: '#d32f2f', fontSize: '12px', marginBottom: '12px' }}>{errors.items}</Box>}

                    {/* Multi-select picker */}
                    <Grid container spacing={2} alignItems="flex-end">
                        <Grid item xs={12} md={5}>
                            <Autocomplete
                                multiple
                                options={foodItemOptions}
                                getOptionLabel={o => `${o.name} (${VEG_LABELS[o.food_type] || ''}) — ₹${o.cost || 0}`}
                                getOptionSelected={(option, value) => option.id === value.id}
                                loading={loadingItems}
                                value={selectedFoodItems}
                                onChange={(e, val) => this.setState({ selectedFoodItems: val })}
                                onInputChange={(e, val, reason) => { if (reason === 'input') this.searchFoodItems(val); }}
                                renderInput={params => (
                                    <TextField {...params} label="Search Food Items" variant="outlined" size="small"
                                        InputProps={{ ...params.InputProps, endAdornment: (<>{loadingItems ? <CircularProgress color="inherit" size={18} /> : null}{params.InputProps.endAdornment}</>) }}
                                    />
                                )}
                                renderTags={(value, getTagProps) => value.map((option, index) => (
                                    <Chip size="small" label={option.name} {...getTagProps({ index })} style={{ background: '#EBF1FF', color: S.COLORS.primary }} />
                                ))}
                            />
                        </Grid>
                        <Grid item xs={12} md={5}>
                            <Autocomplete
                                multiple
                                options={foodComboOptions}
                                getOptionLabel={o => `${o.name} — ₹${o.price || 0}`}
                                getOptionSelected={(option, value) => option.id === value.id}
                                loading={loadingCombos}
                                value={selectedCombos}
                                onChange={(e, val) => this.setState({ selectedCombos: val })}
                                onInputChange={(e, val, reason) => { if (reason === 'input') this.searchFoodCombos(val); }}
                                renderInput={params => (
                                    <TextField {...params} label="Search Combos" variant="outlined" size="small"
                                        InputProps={{ ...params.InputProps, endAdornment: (<>{loadingCombos ? <CircularProgress color="inherit" size={18} /> : null}{params.InputProps.endAdornment}</>) }}
                                    />
                                )}
                                renderTags={(value, getTagProps) => value.map((option, index) => (
                                    <Chip size="small" label={option.name} {...getTagProps({ index })} style={{ background: '#FFF3E0', color: '#E65100' }} />
                                ))}
                            />
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <button
                                style={{ ...S.primaryBtn, width: '100%', justifyContent: 'center', padding: '10px', opacity: (selectedFoodItems.length === 0 && selectedCombos.length === 0) ? 0.5 : 1 }}
                                onClick={this.addSelectedItems}
                                disabled={selectedFoodItems.length === 0 && selectedCombos.length === 0}
                            >
                                <AddCircleOutlineIcon style={{ fontSize: '18px' }} /> Add
                            </button>
                        </Grid>
                    </Grid>

                    {/* Selected Items Table */}
                    {packageItems.length > 0 && (
                        <Box style={{ marginTop: '20px', border: `1px solid ${S.COLORS.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: S.COLORS.surface }}>
                                        <th style={S.th}>#</th>
                                        <th style={S.th}>Item Name</th>
                                        <th style={S.th}>Type</th>
                                        <th style={S.th}>Price</th>
                                        <th style={S.th}>Qty</th>
                                        <th style={{ ...S.th, textAlign: 'center' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {packageItems.map((pi, idx) => (
                                        <tr key={idx} style={{ borderTop: `1px solid ${S.COLORS.border}` }}>
                                            <td style={S.td}>{idx + 1}</td>
                                            <td style={{ ...S.td, fontWeight: 600 }}>
                                                {pi.data.name}
                                                {pi.type === 'combo' && <Chip label="COMBO" size="small" style={{ marginLeft: '6px', height: '18px', fontSize: '10px', background: '#FFF3E0', color: '#E65100' }} />}
                                            </td>
                                            <td style={S.td}>
                                                {pi.type === 'item' ? (
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: VEG_COLORS[pi.data.food_type] || '#888' }}>
                                                        {VEG_LABELS[pi.data.food_type] || '-'}
                                                    </span>
                                                ) : <span style={{ fontSize: '11px', color: '#E65100', fontWeight: 600 }}>Combo</span>}
                                            </td>
                                            <td style={S.td}>₹{parseFloat(pi.data.cost || pi.data.price || 0).toFixed(2)}</td>
                                            <td style={S.td}>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={pi.quantity}
                                                    onChange={e => this.updateItemQty(idx, e.target.value)}
                                                    style={{ ...S.formInput, width: '60px', padding: '6px 8px', textAlign: 'center' }}
                                                />
                                            </td>
                                            <td style={{ ...S.td, textAlign: 'center' }}>
                                                <Tooltip title="Remove">
                                                    <IconButton size="small" onClick={() => this.removeItem(idx)} style={{ color: '#d32f2f' }}>
                                                        <DeleteOutlineIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Box>
                    )}
                </Box>

                {/* Submit */}
                <Box style={{ display: 'flex', gap: '12px' }}>
                    <button
                        style={{ ...S.outlineBtn, padding: '12px 30px' }}
                        onClick={() => this.props.history.goBack()}
                    >
                        Cancel
                    </button>
                    <button
                        style={{ ...S.successBtn, padding: '12px 30px', fontSize: '14px', opacity: submitDisable ? 0.6 : 1 }}
                        onClick={this.validate}
                        disabled={submitDisable}
                    >
                        {submitDisable ? <CircularProgress size={18} style={{ color: '#fff', marginRight: '8px' }} /> : null}
                        Create Package
                    </button>
                </Box>
            </Box>
        );
    }
}

export default withRouter(AddMealPackage);
