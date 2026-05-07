import React, { Component } from 'react';
import { Box, Grid, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress } from '@material-ui/core';
import { AsyncPaginate } from 'react-select-async-paginate';
import { LocalOffer as DiscountIcon, Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Refresh as RefreshIcon } from '@material-ui/icons';
import Swal from 'sweetalert2';
import { getRequest, postRequest, putRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import S from './canteenStyles';
import { dateFormat } from 'Includes/functions';

const DISCOUNT_TYPES = [{ id: 0, label: 'Flat (₹)' }, { id: 1, label: 'Percent (%)' }];
const SCOPE_TYPES = [{ id: 0, label: 'Menu-wide' }, { id: 1, label: 'Item-specific' }];

class TabDiscounts extends Component {
    state = {
        discounts: [], loading: true,
        dialogOpen: false, editing: null,
        form: { menu: null, menu_item: null, discount_type: 0, scope: 0, value: '', label: '', is_active: true },
        submitting: false,
        pageno: 1, hasMore: false, loadingMore: false,
    };

    componentDidMount() { this.loadDiscounts(); }

    loadDiscounts = (page = 1, append = false) => {
        if (!append) this.setState({ loading: true }); else this.setState({ loadingMore: true });
        getRequest(GET_URL.menu_discount.api, { limit: 15, pageno: page }, this.props).then(res => {
            const list = res?.data?.data?.data_list || res?.data?.data || [];
            const hasMore = res?.data?.data?.next != null;
            this.setState(prev => ({
                discounts: append ? [...prev.discounts, ...(Array.isArray(list) ? list : [])] : (Array.isArray(list) ? list : []),
                loading: false, loadingMore: false, pageno: page, hasMore,
            }));
        }).catch(() => this.setState({ loading: false, loadingMore: false }));
    };

    loadMoreDiscounts = () => { this.loadDiscounts(this.state.pageno + 1, true); };

    loadMenuOptions = async (search, prevOptions, { page }) => {
        let filteredOptions = [];
        let hasMore = false;
        const params = { is_active: true, limit: 15, pageno: page + 1 };
        if (search) params.search = search;
        try {
            const res = await getRequest(GET_URL.canteen_menu.api, params, this.props);
            const list = res?.data?.data?.data_list || res?.data?.data || [];
            const meals = { 0: 'Breakfast', 1: 'Lunch', 2: 'Snacks', 3: 'Dinner' };
            filteredOptions = (Array.isArray(list) ? list : []).map(m => ({
                value: m.id,
                label: `${dateFormat(m.date, 'DD/MM/YYYY')} — ${meals[m.meal_type] || 'Unknown'}`,
            }));
            hasMore = res?.data?.data?.next ? true : false;
        } catch (err) { /* ignore */ }
        return { options: filteredOptions, hasMore, additional: { page: page + 1 } };
    };

    loadMenuItemOptions = async (search, prevOptions, { page }) => {
        let filteredOptions = [];
        let hasMore = false;
        const menuId = this.state.form.menu?.value;
        if (!menuId) return { options: [], hasMore: false, additional: { page: 0 } };
        const params = { menu: menuId, is_active: true, limit: 15, pageno: page + 1 };
        if (search) params.search = search;
        try {
            const res = await getRequest(GET_URL.canteen_menu_item.api, params, this.props);
            const list = res?.data?.data?.data_list || res?.data?.data || [];
            filteredOptions = (Array.isArray(list) ? list : []).map(mi => ({
                value: mi.id,
                label: mi.food_item?.name || mi.combo?.name || `Item #${mi.id}`,
            }));
            hasMore = res?.data?.data?.next ? true : false;
        } catch (err) { /* ignore */ }
        return { options: filteredOptions, hasMore, additional: { page: page + 1 } };
    };

    openAdd = () => {
        this.setState({
            dialogOpen: true, editing: null,
            form: { menu: null, menu_item: null, discount_type: 0, scope: 0, value: '', label: '', is_active: true },
        });
    };

    openEdit = (d) => {
        const meals = { 0: 'Breakfast', 1: 'Lunch', 2: 'Snacks', 3: 'Dinner' };
        this.setState({
            dialogOpen: true, editing: d,
            form: {
                menu: d.menu ? { value: d.menu, label: d.menu_date ? `${dateFormat(d.menu_date, 'DD/MM/YYYY')} — ${meals[d.menu_meal_type] || ''}` : `Menu #${d.menu}` } : null,
                menu_item: d.menu_item ? { value: d.menu_item, label: d.menu_item_name || `Item #${d.menu_item}` } : null,
                discount_type: d.discount_type, scope: d.scope, value: d.value, label: d.label || '', is_active: d.is_active,
            },
        });
    };

    handleField = (field, val) => {
        const form = { ...this.state.form, [field]: val };
        if (field === 'menu') { form.menu_item = null; }
        if (field === 'scope' && parseInt(val) === 0) form.menu_item = null;
        this.setState({ form });
    };

    doSave = () => {
        const { form, editing } = this.state;
        if (!form.menu) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Select a menu.' }); return; }
        if (!form.value || parseFloat(form.value) <= 0) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Enter a valid value.' }); return; }

        const payload = {
            menu: form.menu.value,
            discount_type: form.discount_type,
            scope: form.scope,
            value: parseFloat(form.value).toFixed(2),
            label: form.label,
            is_active: form.is_active,
        };
        if (parseInt(form.scope) === 1 && form.menu_item) payload.menu_item = form.menu_item.value;

        this.setState({ submitting: true });

        const promise = editing
            ? putRequest(`${PUT_URL.menu_discount.api}${editing.id}/`, payload, this.props)
            : postRequest(POST_URL.menu_discount.api, payload, this.props);

        promise.then(res => {
            if (res && (res.status === 200 || res.status === 201)) {
                Swal.fire({ icon: 'success', title: editing ? 'Updated!' : 'Created!', timer: 1200, showConfirmButton: false });
                this.setState({ dialogOpen: false, submitting: false });
                this.loadDiscounts();
            } else this.setState({ submitting: false });
        }).catch(() => this.setState({ submitting: false }));
    };

    doDelete = (id) => {
        Swal.fire({ title: 'Delete this discount?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d32f2f', confirmButtonText: 'Delete' }).then(r => {
            if (r.value) {
                deleteRequest(`${DEL_URL.menu_discount.api}${id}/`, this.props).then(res => {
                    if (res && res.status === 200) {
                        Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1200, showConfirmButton: false });
                        this.loadDiscounts();
                    }
                });
            }
        });
    };

    getMenuLabel = (menuId) => {
        const meals = { 0: 'Breakfast', 1: 'Lunch', 2: 'Snacks', 3: 'Dinner' };
        return `Menu #${menuId}`;
    };

    render() {
        const { discounts, loading, dialogOpen, editing, form, submitting, hasMore } = this.state;

        return (
            <Box>
                {/* Header */}
                <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <Typography style={{ fontSize: '16px', fontWeight: 700, color: '#333' }}>
                        <DiscountIcon style={{ verticalAlign: 'middle', marginRight: '6px', color: S.COLORS.primary }} />
                        Menu Discounts
                    </Typography>
                    <Box style={{ display: 'flex', gap: '8px' }}>
                        <button style={S.outlineBtn} onClick={this.loadDiscounts}><RefreshIcon fontSize="small" /> Refresh</button>
                        <button style={S.primaryBtn} onClick={this.openAdd}><AddIcon fontSize="small" /> Add Discount</button>
                    </Box>
                </Box>

                {/* Discount List */}
                {loading ? <Box style={{ textAlign: 'center', padding: '40px' }}><CircularProgress size={28} /></Box> :
                    discounts.length === 0 ? <Box style={{ ...S.card, ...S.emptyState }}>No discounts configured. Click "Add Discount" to create one.</Box> :
                        <Box>
                            <Box style={S.card}>
                                <Box style={{ overflowX: 'auto' }}>
                                    <table style={S.table}>
                                        <thead>
                                            <tr>
                                                <th style={S.th}>Menu</th><th style={S.th}>Type</th><th style={S.th}>Scope</th>
                                                <th style={S.th}>Value</th><th style={S.th}>Label</th><th style={S.th}>Item</th>
                                                <th style={S.th}>Status</th><th style={S.th}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {discounts.map(d => (
                                                <tr key={d.id}>
                                                    <td style={S.td}>{this.getMenuLabel(d.menu)}</td>
                                                    <td style={S.td}><Box style={S.statusChip(d.discount_type === 0 ? '#2E7D32' : '#1565C0', d.discount_type === 0 ? '#E8F5E9' : '#E3F2FD')}>{d.discount_type === 0 ? 'Flat' : 'Percent'}</Box></td>
                                                    <td style={S.td}>{d.scope === 0 ? 'Menu-wide' : 'Item'}</td>
                                                    <td style={{ ...S.td, fontWeight: 700, color: S.COLORS.primary }}>{d.discount_type === 0 ? `₹${d.value}` : `${d.value}%`}</td>
                                                    <td style={S.td}>{d.label || '-'}</td>
                                                    <td style={S.td}>{d.menu_item_name || (d.scope === 0 ? 'All' : '-')}</td>
                                                    <td style={S.td}><Box style={S.statusChip(d.is_active ? '#2E7D32' : '#C62828', d.is_active ? '#E8F5E9' : '#FFEBEE')}>{d.is_active ? 'Active' : 'Inactive'}</Box></td>
                                                    <td style={S.td}>
                                                        <Box style={{ display: 'flex', gap: '4px' }}>
                                                            <button style={{ ...S.outlineBtn, padding: '4px 8px', fontSize: '11px' }} onClick={() => this.openEdit(d)}><EditIcon style={{ fontSize: '14px' }} /></button>
                                                            <button style={{ ...S.dangerBtn, padding: '4px 8px', fontSize: '11px' }} onClick={() => this.doDelete(d.id)}><DeleteIcon style={{ fontSize: '14px' }} /></button>
                                                        </Box>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </Box>
                            </Box>
                            {hasMore && (
                                <Box style={{ textAlign: 'center', padding: '12px' }}>
                                    <button style={S.outlineBtn} onClick={this.loadMoreDiscounts} disabled={this.state.loadingMore}>
                                        {this.state.loadingMore ? 'Loading...' : 'Load More Discounts'}
                                    </button>
                                </Box>
                            )}
                        </Box>}

                {/* Add/Edit Dialog */}
                <Dialog open={dialogOpen} onClose={() => this.setState({ dialogOpen: false })} maxWidth="sm" fullWidth>
                    <DialogTitle style={S.dialogHeader}><Box style={S.dialogHeaderTitle}>{editing ? 'Edit Discount' : 'Add Discount'}</Box></DialogTitle>
                    <DialogContent style={{ padding: '24px' }}>
                        <Box style={S.formRow}>
                            <Box style={S.formCol}>
                                <Box style={S.formLabel}>Menu *</Box>
                                <AsyncPaginate
                                    value={form.menu}
                                    loadOptions={this.loadMenuOptions}
                                    onChange={(val) => this.handleField('menu', val)}
                                    additional={{ page: 0 }}
                                    placeholder="Search menu..."
                                    isClearable
                                    styles={{
                                        control: (base) => ({ ...base, minHeight: 38, fontSize: 13 }),
                                        menu: (base) => ({ ...base, zIndex: 9999 }),
                                    }}
                                />
                            </Box>
                            <Box style={S.formCol}>
                                <Box style={S.formLabel}>Scope</Box>
                                <select style={S.formSelect} value={form.scope} onChange={e => this.handleField('scope', e.target.value)}>
                                    {SCOPE_TYPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                            </Box>
                        </Box>
                        {parseInt(form.scope) === 1 && (
                            <Box style={S.formGroup}>
                                <Box style={S.formLabel}>Menu Item *</Box>
                                <AsyncPaginate
                                    key={form.menu?.value || 'no-menu'}
                                    value={form.menu_item}
                                    loadOptions={this.loadMenuItemOptions}
                                    onChange={(val) => this.handleField('menu_item', val)}
                                    additional={{ page: 0 }}
                                    placeholder="Search menu item..."
                                    isClearable
                                    isDisabled={!form.menu}
                                    styles={{
                                        control: (base) => ({ ...base, minHeight: 38, fontSize: 13 }),
                                        menu: (base) => ({ ...base, zIndex: 9999 }),
                                    }}
                                />
                            </Box>
                        )}
                        <Box style={S.formRow}>
                            <Box style={S.formCol}>
                                <Box style={S.formLabel}>Discount Type</Box>
                                <select style={S.formSelect} value={form.discount_type} onChange={e => this.handleField('discount_type', parseInt(e.target.value))}>
                                    {DISCOUNT_TYPES.map(dt => <option key={dt.id} value={dt.id}>{dt.label}</option>)}
                                </select>
                            </Box>
                            <Box style={S.formCol}>
                                <Box style={S.formLabel}>Value *</Box>
                                <input style={S.formInput} type="number" min="0" step="0.01" placeholder={form.discount_type === 0 ? '₹ Amount' : '% Percentage'} value={form.value} onChange={e => this.handleField('value', e.target.value)} />
                            </Box>
                        </Box>
                        <Box style={S.formGroup}>
                            <Box style={S.formLabel}>Label (Displayed to users)</Box>
                            <input style={S.formInput} placeholder="e.g. Today's Special 20% off!" value={form.label} onChange={e => this.handleField('label', e.target.value)} />
                        </Box>
                    </DialogContent>
                    <DialogActions style={{ padding: '12px 24px 20px' }}>
                        <Button onClick={() => this.setState({ dialogOpen: false })}>Cancel</Button>
                        <button style={S.primaryBtn} onClick={this.doSave} disabled={submitting}>{submitting ? 'Saving...' : (editing ? 'Update' : 'Create')}</button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

export default TabDiscounts;
