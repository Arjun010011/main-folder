import React, { Component } from 'react';
import { Box, Grid, Typography, TextField, CircularProgress, IconButton, Chip, Tooltip } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import { withRouter } from 'react-router-dom';
import Swal from 'sweetalert2';

import loadingBar from 'images/loading.gif';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import { isUserHasPermission } from 'Includes/functions';
import S from './canteenStyles';

const MEAL_TYPES = [
    { id: 0, name: 'Breakfast' },
    { id: 1, name: 'Lunch' },
    { id: 2, name: 'Snacks' },
    { id: 3, name: 'Dinner' },
];

const VEG_LABELS = { 0: 'Veg', 1: 'Non-Veg', 2: 'Egg' };
const VEG_COLORS = { 0: '#2E7D32', 1: '#C62828', 2: '#F57F17' };

class AddMenu extends Component {
    state = {
        loading: false,
        submitDisable: false,
        name: '',
        meal_type: 0,
        is_todays_special: false,
        // Item picker
        foodItemOptions: [],
        foodComboOptions: [],
        loadingItems: false,
        loadingCombos: false,
        selectedFoodItems: [],
        selectedCombos: [],
        menuItems: [],
    };

    componentDidMount() {
        this.searchFoodItems('');
        this.searchFoodCombos('');
    }

    searchFoodItems = (searchText) => {
        this.setState({ loadingItems: true });
        getRequest(GET_URL.food_item.api, { is_active: true, limit: 15, pageno: 1, search: searchText || '' }, this.props).then(response => {
            const list = response?.data?.data?.data_list || response?.data?.data || [];
            this.setState({ foodItemOptions: Array.isArray(list) ? list : [], loadingItems: false });
        });
    };

    searchFoodCombos = (searchText) => {
        this.setState({ loadingCombos: true });
        getRequest(GET_URL.food_combo.api, { is_active: true, limit: 15, pageno: 1, search: searchText || '' }, this.props).then(response => {
            const list = response?.data?.data?.data_list || response?.data?.data || [];
            this.setState({ foodComboOptions: Array.isArray(list) ? list : [], loadingCombos: false });
        });
    };

    addSelectedItems = () => {
        const { selectedFoodItems, selectedCombos, menuItems } = this.state;
        let added = 0;
        selectedFoodItems.forEach(item => {
            if (!menuItems.find(mi => mi.type === 'item' && mi.data.id === item.id)) {
                menuItems.push({ type: 'item', data: item, price: item.cost || '', qty: 100 });
                added++;
            }
        });
        selectedCombos.forEach(combo => {
            if (!menuItems.find(mi => mi.type === 'combo' && mi.data.id === combo.id)) {
                menuItems.push({ type: 'combo', data: combo, price: combo.price || '', qty: 50 });
                added++;
            }
        });
        if (added === 0 && (selectedFoodItems.length > 0 || selectedCombos.length > 0)) {
            Swal.fire({ icon: 'info', title: 'All selected items already added', timer: 1200, showConfirmButton: false });
        }
        this.setState({ menuItems: [...menuItems], selectedFoodItems: [], selectedCombos: [] });
    };

    removeItem = (index) => {
        const { menuItems } = this.state;
        menuItems.splice(index, 1);
        this.setState({ menuItems: [...menuItems] });
    };

    updateItemField = (index, field, value) => {
        const { menuItems } = this.state;
        menuItems[index][field] = value;
        this.setState({ menuItems: [...menuItems] });
    };

    validate = () => {
        const { name, meal_type, menuItems, is_todays_special } = this.state;
        if (!name.trim()) { Swal.fire({ icon: 'warning', title: 'Menu name is required' }); return; }
        if (menuItems.length === 0) { Swal.fire({ icon: 'warning', title: 'Add at least one food item or combo' }); return; }

        this.setState({ submitDisable: true });

        postRequest(POST_URL.canteen_menu.api, {
            name: name.trim(),
            meal_type: parseInt(meal_type),
            is_todays_special: is_todays_special,
        }, this.props).then(menuRes => {
            if (menuRes && (menuRes.status === 200 || menuRes.status === 201)) {
                const menuId = menuRes.data?.data?.id || menuRes.data?.id;
                if (!menuId) {
                    Swal.fire({ icon: 'error', title: 'Menu created but no ID returned' });
                    this.setState({ submitDisable: false });
                    return;
                }

                const itemPromises = menuItems.map(si => {
                    const payload = {
                        menu: menuId,
                        price: parseFloat(si.price || 0),
                        quantity_available: parseInt(si.qty || 100),
                        is_active: true,
                        is_available_today: true,
                    };
                    if (si.type === 'item') payload.food_item = si.data.id;
                    else payload.combo = si.data.id;
                    return postRequest(POST_URL.canteen_menu_item.api, payload, this.props);
                });

                Promise.all(itemPromises).then(results => {
                    const success = results.filter(r => r && (r.status === 200 || r.status === 201)).length;
                    Swal.fire({
                        position: 'top-end', icon: 'success',
                        title: `Menu created with ${success} items!`,
                        showConfirmButton: false, timer: 1500,
                    });
                    this.props.history.goBack();
                });
            } else {
                Swal.fire({ icon: 'error', title: menuRes?.data?.Reason || 'Failed to create menu' });
            }
            this.setState({ submitDisable: false });
        });
    };

    render() {
        const { loading, submitDisable, name, meal_type, is_todays_special, foodItemOptions, foodComboOptions, loadingItems, loadingCombos, selectedFoodItems, selectedCombos, menuItems } = this.state;
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
                            <Typography style={S.headerTitle}>Add Menu</Typography>
                            <Typography style={S.headerSubtitle}>Create a new menu with food items and combos</Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Menu Details Card */}
                <Box style={{ ...S.card, padding: '24px', marginBottom: '20px' }}>
                    <Typography style={{ ...S.sectionTitle, marginBottom: '20px' }}>Menu Details</Typography>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={5}>
                            <Box style={S.formGroup}>
                                <Box style={S.formLabel}>Menu Name *</Box>
                                <input
                                    style={S.formInput}
                                    placeholder="e.g. Regular Breakfast, Weekend Special"
                                    value={name}
                                    onChange={e => this.setState({ name: e.target.value })}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={3}>
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
                        <Grid item xs={12} md={4}>
                            <Box style={S.formGroup}>
                                <Box style={S.formLabel}>Menu Type</Box>
                                <Box style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                    <Box
                                        onClick={() => this.setState({ is_todays_special: false })}
                                        style={{
                                            padding: '10px 20px', borderRadius: '10px', cursor: 'pointer',
                                            fontWeight: 700, fontSize: '13px', transition: 'all 0.2s',
                                            border: !is_todays_special ? `2px solid ${S.COLORS.primary}` : '2px solid #e0e0e0',
                                            background: !is_todays_special ? S.COLORS.primaryBg : '#fafafa',
                                            color: !is_todays_special ? S.COLORS.primary : '#999',
                                        }}
                                    >
                                        Default
                                    </Box>
                                    <Box
                                        onClick={() => this.setState({ is_todays_special: true })}
                                        style={{
                                            padding: '10px 20px', borderRadius: '10px', cursor: 'pointer',
                                            fontWeight: 700, fontSize: '13px', transition: 'all 0.2s',
                                            border: is_todays_special ? `2px solid ${S.COLORS.primary}` : '2px solid #e0e0e0',
                                            background: is_todays_special ? S.COLORS.primaryBg : '#fafafa',
                                            color: is_todays_special ? S.COLORS.primary : '#999',
                                        }}
                                    >
                                        Today's Special
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>

                {/* Items Section */}
                <Box style={{ ...S.card, padding: '24px', marginBottom: '20px' }}>
                    <Typography style={{ ...S.sectionTitle, marginBottom: '16px' }}>
                        <AddCircleOutlineIcon style={{ color: S.COLORS.primary }} /> Add Food Items & Combos
                    </Typography>

                    <Grid container spacing={2} alignItems="flex-end">
                        <Grid item md={5} xs={12}>
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
                        <Grid item md={5} xs={12}>
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
                        <Grid item md={2} xs={12}>
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
                    {menuItems.length > 0 && (
                        <Box style={{ marginTop: '20px', border: `1px solid ${S.COLORS.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: S.COLORS.surface }}>
                                        <th style={S.th}>#</th>
                                        <th style={S.th}>Name</th>
                                        <th style={S.th}>Type</th>
                                        <th style={S.th}>Price (₹)</th>
                                        <th style={S.th}>Qty Available</th>
                                        <th style={{ ...S.th, textAlign: 'center' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {menuItems.map((si, idx) => (
                                        <tr key={idx} style={{ borderTop: `1px solid ${S.COLORS.border}` }}>
                                            <td style={S.td}>{idx + 1}</td>
                                            <td style={{ ...S.td, fontWeight: 600 }}>
                                                {si.data.name}
                                                {si.type === 'combo' && <Chip label="COMBO" size="small" style={{ marginLeft: '6px', height: '18px', fontSize: '10px', background: '#FFF3E0', color: '#E65100' }} />}
                                            </td>
                                            <td style={S.td}>
                                                {si.type === 'item' ? (
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: VEG_COLORS[si.data.food_type] || '#888' }}>
                                                        {VEG_LABELS[si.data.food_type] || '-'}
                                                    </span>
                                                ) : <span style={{ fontSize: '11px', color: '#E65100', fontWeight: 600 }}>Combo</span>}
                                            </td>
                                            <td style={S.td}>
                                                <input
                                                    type="number" min="0" step="0.5"
                                                    value={si.price}
                                                    onChange={e => this.updateItemField(idx, 'price', e.target.value)}
                                                    style={{ ...S.formInput, width: '90px', padding: '6px 8px' }}
                                                />
                                            </td>
                                            <td style={S.td}>
                                                <input
                                                    type="number" min="0"
                                                    value={si.qty}
                                                    onChange={e => this.updateItemField(idx, 'qty', e.target.value)}
                                                    style={{ ...S.formInput, width: '70px', padding: '6px 8px' }}
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
                    <button style={{ ...S.outlineBtn, padding: '12px 30px' }} onClick={() => this.props.history.goBack()}>Cancel</button>
                    <button
                        style={{ ...S.successBtn, padding: '12px 30px', fontSize: '14px', opacity: (submitDisable || menuItems.length === 0) ? 0.6 : 1 }}
                        onClick={this.validate}
                        disabled={submitDisable || menuItems.length === 0}
                    >
                        {submitDisable ? <CircularProgress size={18} style={{ color: '#fff', marginRight: '8px' }} /> : null}
                        Create Menu
                    </button>
                </Box>
            </Box>
        );
    }
}

export default withRouter(AddMenu);
