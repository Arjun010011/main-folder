import React, { Component } from 'react';
import { Box, Grid, Typography, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@material-ui/core';
import { Receipt as OrderIcon, Kitchen as KitchenIcon, CheckCircle as ConfirmIcon, Cancel as CancelIcon, Refresh as RefreshIcon, Visibility as ViewIcon } from '@material-ui/icons';
import Swal from 'sweetalert2';
import { getRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL } from 'Includes/urls';
import { dateFormat, timeFormat } from 'Includes/functions';
import S from './canteenStyles';

const STATUS_MAP = {
    0: { label: 'Pending', color: '#F57F17', bg: '#FFF8E1' },
    1: { label: 'Confirmed', color: '#1565C0', bg: '#E3F2FD' },
    2: { label: 'Preparing', color: '#E65100', bg: '#FFF3E0' },
    3: { label: 'Ready', color: '#2E7D32', bg: '#E8F5E9' },
    4: { label: 'Delivered', color: '#333', bg: '#F5F5F5' },
    5: { label: 'Cancelled', color: '#C62828', bg: '#FFEBEE' },
};
const PAYMENT_MAP = { 0: 'Wallet', 1: 'Cash', 2: 'Online', 3: 'Package' };
const NEXT_STATUS = { 0: 1, 1: 2, 2: 3, 3: 4 };
const NEXT_LABEL = { 0: 'Confirm', 1: 'Start Preparing', 2: 'Mark Ready', 3: 'Mark Delivered' };

class TabOrders extends Component {
    state = {
        view: 'orders', // 'orders' | 'kitchen'
        orders: [], loading: true,
        kitchenData: null, kitchenLoading: false,
        pageno: 1, hasMore: false, loadingMore: false,
        // Filters
        fromDate: '', toDate: '', statusFilter: '',
        // Detail dialog
        detailOpen: false, detailOrder: null,
    };

    componentDidMount() { this.loadOrders(); }

    loadOrders = (page = 1, append = false) => {
        if (!append) this.setState({ loading: true }); else this.setState({ loadingMore: true });
        const params = { is_active: true, limit: 15, pageno: page };
        if (this.state.fromDate) params.from_date = this.state.fromDate;
        if (this.state.toDate) params.to_date = this.state.toDate;
        if (this.state.statusFilter !== '') params.status = this.state.statusFilter;
        getRequest(GET_URL.canteen_order.api, params, this.props).then(res => {
            const list = res?.data?.data?.data_list || res?.data?.data || [];
            const hasMore = res?.data?.data?.next != null;
            this.setState(prev => ({
                orders: append ? [...prev.orders, ...(Array.isArray(list) ? list : [])] : (Array.isArray(list) ? list : []),
                loading: false, loadingMore: false, pageno: page, hasMore,
            }));
        }).catch(() => this.setState({ loading: false, loadingMore: false }));
    };

    loadMoreOrders = () => { this.loadOrders(this.state.pageno + 1, true); };

    applyFilters = () => { this.loadOrders(); };
    clearFilters = () => { this.setState({ fromDate: '', toDate: '', statusFilter: '' }, () => this.loadOrders()); };

    loadKitchen = () => {
        this.setState({ kitchenLoading: true });
        getRequest(GET_URL.canteen_order.api, { action: 'kitchen_summary' }, this.props).then(res => {
            this.setState({ kitchenData: res?.data?.data || null, kitchenLoading: false });
        }).catch(() => this.setState({ kitchenLoading: false }));
    };

    updateStatus = (orderId, newStatus) => {
        if (newStatus === 5) {
            Swal.fire({ title: 'Cancel Order?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d32f2f', confirmButtonText: 'Yes, Cancel' }).then(r => {
                if (r.value) this.doStatusUpdate(orderId, newStatus);
            });
            return;
        }
        this.doStatusUpdate(orderId, newStatus);
    };

    doStatusUpdate = (orderId, newStatus) => {
        const action = newStatus === 5 ? 'cancel' : 'update_status';
        putRequest(`${PUT_URL.canteen_order.api}${orderId}/?action=${action}`, { status: newStatus }, this.props).then(res => {
            if (res && res.status === 200) {
                Swal.fire({ icon: 'success', title: newStatus === 5 ? 'Cancelled!' : 'Status Updated!', timer: 1200, showConfirmButton: false });
                this.loadOrders();
            }
        });
    };

    viewDetail = (order) => {
        this.setState({ detailOpen: true, detailOrder: order });
    };

    render() {
        const { view, orders, loading, kitchenData, kitchenLoading, hasMore, loadingMore,
            fromDate, toDate, statusFilter, detailOpen, detailOrder } = this.state;

        return (
            <Box>
                {/* Toggle + Refresh */}
                <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <Box style={{ display: 'flex', gap: '6px' }}>
                        <Box style={S.mealChip(view === 'orders')} onClick={() => this.setState({ view: 'orders' })}><OrderIcon style={{ fontSize: '16px' }} /> Orders</Box>
                        <Box style={S.mealChip(view === 'kitchen')} onClick={() => { this.setState({ view: 'kitchen' }); this.loadKitchen(); }}><KitchenIcon style={{ fontSize: '16px' }} /> Kitchen Summary</Box>
                    </Box>
                    <button style={S.outlineBtn} onClick={view === 'orders' ? () => this.loadOrders() : this.loadKitchen}><RefreshIcon fontSize="small" /> Refresh</button>
                </Box>

                {view === 'orders' ? (
                    <Box>
                        {/* ── Filters ── */}
                        <Box style={{ ...S.card, padding: '12px 16px', marginBottom: '14px' }}>
                            <Box style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <Box>
                                    <Box style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>From Date</Box>
                                    <input style={{ ...S.formInput, width: '150px', padding: '6px 10px', fontSize: '12px' }} type="date" value={fromDate}
                                        onChange={e => this.setState({ fromDate: e.target.value })} />
                                </Box>
                                <Box>
                                    <Box style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>To Date</Box>
                                    <input style={{ ...S.formInput, width: '150px', padding: '6px 10px', fontSize: '12px' }} type="date" value={toDate}
                                        onChange={e => this.setState({ toDate: e.target.value })} />
                                </Box>
                                <Box>
                                    <Box style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Status</Box>
                                    <select style={{ ...S.formInput, width: '140px', padding: '6px 10px', fontSize: '12px' }} value={statusFilter}
                                        onChange={e => this.setState({ statusFilter: e.target.value })}>
                                        <option value="">All</option>
                                        {Object.entries(STATUS_MAP).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                    </select>
                                </Box>
                                <button style={{ ...S.primaryBtn, padding: '6px 16px', fontSize: '12px' }} onClick={this.applyFilters}>Filter</button>
                                <button style={{ ...S.outlineBtn, padding: '6px 12px', fontSize: '12px' }} onClick={this.clearFilters}>Clear</button>
                            </Box>
                        </Box>

                        {/* ── Orders Table ── */}
                        {loading ? <Box style={{ textAlign: 'center', padding: '40px' }}><CircularProgress size={28} /></Box> :
                            orders.length === 0 ? <Box style={{ ...S.card, ...S.emptyState }}>No orders found</Box> :
                                <Box>
                                    <Box style={S.card}><Box style={{ overflowX: 'auto' }}>
                                        <table style={S.table}>
                                            <thead><tr>
                                                <th style={S.th}>Order #</th><th style={S.th}>User</th><th style={S.th}>Amount</th>
                                                <th style={S.th}>Payment</th><th style={S.th}>Status</th><th style={S.th}>Date</th><th style={S.th}>Actions</th>
                                            </tr></thead>
                                            <tbody>
                                                {orders.map(o => {
                                                    const st = STATUS_MAP[o.status] || STATUS_MAP[0];
                                                    const nextSt = NEXT_STATUS[o.status];
                                                    return (
                                                        <tr key={o.id}>
                                                            <td style={{ ...S.td, fontWeight: 600 }}>{o.order_number || `#${o.id}`}</td>
                                                            <td style={S.td}>{o.user_display_name || o.username || (o.user ? `#${typeof o.user === 'object' ? o.user.id : o.user}` : '-')}</td>
                                                            <td style={{ ...S.td, fontWeight: 600, color: S.COLORS.primary }}>₹{parseFloat(o.net_amount || 0).toFixed(2)}</td>
                                                            <td style={S.td}>{PAYMENT_MAP[o.payment_mode] || '-'}</td>
                                                            <td style={S.td}><Box style={S.statusChip(st.color, st.bg)}>{st.label}</Box></td>
                                                            <td style={S.td}>{o.created_at ? `${dateFormat(o.created_at, 'DD/MM/YYYY')} ${dateFormat(o.created_at, 'hh:mm A')}` : '-'}</td>
                                                            <td style={S.td}>
                                                                <Box style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                                    <IconButton size="small" title="View Details" onClick={() => this.viewDetail(o)}>
                                                                        <ViewIcon fontSize="small" style={{ color: S.COLORS.primary }} />
                                                                    </IconButton>
                                                                    {nextSt !== undefined && (
                                                                        <button style={{ ...S.primaryBtn, padding: '4px 10px', fontSize: '11px' }} onClick={() => this.updateStatus(o.id, nextSt)}>
                                                                            {NEXT_LABEL[o.status]}
                                                                        </button>
                                                                    )}
                                                                    {o.status < 3 && o.status !== 5 && (
                                                                        <IconButton size="small" onClick={() => this.updateStatus(o.id, 5)} title="Cancel">
                                                                            <CancelIcon fontSize="small" style={{ color: S.COLORS.danger }} />
                                                                        </IconButton>
                                                                    )}
                                                                </Box>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </Box></Box>
                                    {hasMore && (
                                        <Box style={{ textAlign: 'center', padding: '12px' }}>
                                            <button style={S.outlineBtn} onClick={this.loadMoreOrders} disabled={loadingMore}>
                                                {loadingMore ? 'Loading...' : 'Load More Orders'}
                                            </button>
                                        </Box>
                                    )}
                                </Box>
                        }
                    </Box>
                ) : (
                    kitchenLoading ? <Box style={{ textAlign: 'center', padding: '40px' }}><CircularProgress size={28} /></Box> :
                        !kitchenData ? <Box style={{ ...S.card, ...S.emptyState }}>Click "Kitchen Summary" to load</Box> :
                            <Box>
                                <Box style={{ ...S.card, padding: '16px', marginBottom: '16px' }}>
                                    <Box style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <Box><Box style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Date</Box><Box style={{ fontSize: '16px', fontWeight: 700 }}>{dateFormat(kitchenData.date, 'DD/MM/YYYY')}</Box></Box>
                                        <Box><Box style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>Total Orders</Box><Box style={{ fontSize: '16px', fontWeight: 700, color: S.COLORS.primary }}>{kitchenData.total_orders}</Box></Box>
                                    </Box>
                                </Box>
                                {(!kitchenData.items || kitchenData.items.length === 0) ? <Box style={{ ...S.card, ...S.emptyState }}>No items ordered today</Box> :
                                    <Grid container spacing={2}>
                                        {kitchenData.items.map((item, idx) => (
                                            <Grid item xs={12} sm={6} md={4} key={idx}>
                                                <Box style={S.kitchenCard(S.COLORS.primary)}>
                                                    <Box style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>{item.item_name}</Box>
                                                    <Box style={{ fontSize: '24px', fontWeight: 800, color: S.COLORS.primary, marginBottom: '8px' }}>{item.total_quantity} total</Box>
                                                    <Box style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        <Box style={S.statusChip('#F57F17', '#FFF8E1')}>Pending: {item.pending_count}</Box>
                                                        <Box style={S.statusChip('#E65100', '#FFF3E0')}>Preparing: {item.preparing_count}</Box>
                                                        <Box style={S.statusChip('#2E7D32', '#E8F5E9')}>Ready: {item.ready_count}</Box>
                                                        <Box style={S.statusChip('#333', '#F5F5F5')}>Done: {item.delivered_count}</Box>
                                                    </Box>
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>}
                            </Box>
                )}

                {/* ═══ ORDER DETAIL DIALOG ═══ */}
                <Dialog open={detailOpen} onClose={() => this.setState({ detailOpen: false })} maxWidth="md" fullWidth>
                    <DialogTitle style={S.dialogHeader}>
                        <Box style={S.dialogHeaderTitle}>Order Details — {detailOrder?.order_number || `#${detailOrder?.id}`}</Box>
                    </DialogTitle>
                    <DialogContent style={{ padding: '24px' }}>
                        {detailOrder && (
                            <Box>
                                {/* Order Header */}
                                <Box style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', padding: '12px', borderRadius: '8px', background: S.COLORS.surface, border: `1px solid ${S.COLORS.border}` }}>
                                    <Box>
                                        <Box style={{ fontSize: '13px', fontWeight: 600 }}>{detailOrder.user_display_name || detailOrder.username || `User #${detailOrder.user}`}</Box>
                                        <Box style={{ fontSize: '11px', color: '#888' }}>{detailOrder.created_at ? `${dateFormat(detailOrder.created_at, 'DD/MM/YYYY')} ${dateFormat(detailOrder.created_at, 'hh:mm A')}` : ''}</Box>
                                    </Box>
                                    <Box style={{ textAlign: 'right' }}>
                                        <Box style={S.statusChip((STATUS_MAP[detailOrder.status] || {}).color, (STATUS_MAP[detailOrder.status] || {}).bg)}>
                                            {(STATUS_MAP[detailOrder.status] || {}).label}
                                        </Box>
                                        <Box style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{PAYMENT_MAP[detailOrder.payment_mode]}</Box>
                                    </Box>
                                </Box>

                                {/* Items Table */}
                                <Box style={{ marginBottom: '12px' }}>
                                    <Box style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Items</Box>
                                    {detailOrder.items && detailOrder.items.length > 0 ? (
                                        <table style={S.table}>
                                            <thead><tr>
                                                <th style={S.th}>Item</th><th style={S.th}>Qty</th><th style={S.th}>Unit Price</th><th style={S.th}>Total</th>
                                            </tr></thead>
                                            <tbody>
                                                {detailOrder.items.map((item, idx) => {
                                                    const itemName = item.food_item
                                                        ? (typeof item.food_item === 'object' ? item.food_item.name : `Food #${item.food_item}`)
                                                        : item.combo
                                                            ? (typeof item.combo === 'object' ? item.combo.name : `Combo #${item.combo}`)
                                                            : 'Unknown';
                                                    return (
                                                        <tr key={idx}>
                                                            <td style={{ ...S.td, fontWeight: 600 }}>{itemName}</td>
                                                            <td style={S.td}>{item.quantity}</td>
                                                            <td style={S.td}>₹{parseFloat(item.unit_price || 0).toFixed(2)}</td>
                                                            <td style={{ ...S.td, fontWeight: 600, color: S.COLORS.primary }}>₹{parseFloat(item.total_price || 0).toFixed(2)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    ) : <Box style={{ ...S.emptyState, padding: '10px' }}>No items data</Box>}
                                </Box>

                                {/* Totals */}
                                <Box style={{ borderTop: `2px solid ${S.COLORS.border}`, paddingTop: '12px' }}>
                                    <Box style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#555', padding: '4px 0' }}>
                                        <span>Subtotal</span><span>₹{parseFloat(detailOrder.total_amount || 0).toFixed(2)}</span>
                                    </Box>
                                    {parseFloat(detailOrder.discount_amount || 0) > 0 && (
                                        <Box style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#d32f2f', padding: '4px 0' }}>
                                            <span>Discount</span><span>-₹{parseFloat(detailOrder.discount_amount).toFixed(2)}</span>
                                        </Box>
                                    )}
                                    <Box style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: S.COLORS.primary, padding: '8px 0', borderTop: '2px dashed #e0e0e0', marginTop: '4px' }}>
                                        <span>Net Amount</span><span>₹{parseFloat(detailOrder.net_amount || 0).toFixed(2)}</span>
                                    </Box>
                                </Box>

                                {detailOrder.notes && (
                                    <Box style={{ marginTop: '12px', padding: '10px', borderRadius: '6px', background: '#FFFDE7', fontSize: '12px', color: '#555' }}>
                                        <strong>Notes:</strong> {detailOrder.notes}
                                    </Box>
                                )}
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions style={{ padding: '12px 24px 20px' }}>
                        <Button onClick={() => this.setState({ detailOpen: false })}>Close</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

export default TabOrders;
