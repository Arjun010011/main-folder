import React, { Component } from 'react';
import { Box, Grid, Typography, CircularProgress } from '@material-ui/core';
import {
    TrendingUp as RevenueIcon,
    ShoppingCart as OrdersIcon,
    AccountBalanceWallet as WalletIcon,
    CardMembership as SubsIcon,
    Refresh as RefreshIcon,
    Restaurant as FoodIcon,
} from '@material-ui/icons';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import S from './canteenStyles';

const STAT_CARDS = [
    { key: 'total_orders', label: 'Total Orders', icon: OrdersIcon, color: '#1C52C8', bg: '#EBF1FF' },
    { key: 'total_revenue', label: 'Revenue', icon: RevenueIcon, color: '#2E7D32', bg: '#E8F5E9', prefix: '₹' },
    { key: 'pending_orders', label: 'Pending', icon: OrdersIcon, color: '#F57F17', bg: '#FFF8E1' },
    { key: 'preparing_orders', label: 'Preparing', icon: FoodIcon, color: '#E65100', bg: '#FFF3E0' },
    { key: 'delivered_orders', label: 'Delivered', icon: OrdersIcon, color: '#333', bg: '#F5F5F5' },
    { key: 'active_subscriptions', label: 'Active Packages', icon: SubsIcon, color: '#6A1B9A', bg: '#F3E5F5' },
];

class TabDashboard extends Component {
    state = { loading: true, stats: null };

    componentDidMount() { this.loadStats(); }

    loadStats = () => {
        this.setState({ loading: true });
        getRequest(GET_URL.canteen_order.api, { action: 'dashboard_stats' }, this.props).then(res => {
            const data = res?.data?.data || null;
            this.setState({ stats: data, loading: false });
        }).catch(() => this.setState({ loading: false }));
    };

    render() {
        const { loading, stats } = this.state;

        if (loading) return <Box style={{ textAlign: 'center', padding: '60px' }}><CircularProgress size={32} /></Box>;
        if (!stats) return <Box style={{ ...S.card, ...S.emptyState }}>No data available</Box>;

        return (
            <Box>
                {/* Header */}
                <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <Box>
                        <Typography style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>Dashboard Overview</Typography>
                        <Typography style={{ fontSize: '12px', color: '#888' }}>Date: {stats.date}</Typography>
                    </Box>
                    <button style={S.outlineBtn} onClick={this.loadStats}><RefreshIcon fontSize="small" /> Refresh</button>
                </Box>

                {/* Stat Cards */}
                <Grid container spacing={2} style={{ marginBottom: '20px' }}>
                    {STAT_CARDS.map(sc => {
                        const Icon = sc.icon;
                        const val = stats[sc.key] || 0;
                        return (
                            <Grid item xs={6} sm={4} md={2} key={sc.key}>
                                <Box style={{ ...S.card, padding: '16px', textAlign: 'center', borderTop: `3px solid ${sc.color}` }}>
                                    <Box style={{ width: '40px', height: '40px', borderRadius: '10px', background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                                        <Icon style={{ color: sc.color, fontSize: '20px' }} />
                                    </Box>
                                    <Box style={{ fontSize: '22px', fontWeight: 800, color: sc.color }}>{sc.prefix || ''}{val}</Box>
                                    <Box style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px', marginTop: '4px' }}>{sc.label}</Box>
                                </Box>
                            </Grid>
                        );
                    })}
                </Grid>

                <Grid container spacing={3}>
                    {/* Top Items */}
                    <Grid item xs={12} md={7}>
                        <Box style={S.card}>
                            <Box style={{ padding: '14px 18px', borderBottom: `1px solid ${S.COLORS.border}` }}>
                                <Typography style={{ fontWeight: 700, fontSize: '15px' }}>🔥 Top Selling Items</Typography>
                            </Box>
                            <Box style={{ padding: '12px' }}>
                                {!stats.top_items || stats.top_items.length === 0 ? (
                                    <Box style={{ ...S.emptyState, padding: '20px' }}>No orders today</Box>
                                ) : (
                                    <table style={S.table}>
                                        <thead>
                                            <tr><th style={S.th}>#</th><th style={S.th}>Item</th><th style={S.th}>Qty</th><th style={S.th}>Sales</th></tr>
                                        </thead>
                                        <tbody>
                                            {stats.top_items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ ...S.td, fontWeight: 700, color: S.COLORS.primary }}>{idx + 1}</td>
                                                    <td style={{ ...S.td, fontWeight: 600 }}>{item.name}</td>
                                                    <td style={S.td}>{item.quantity}</td>
                                                    <td style={{ ...S.td, fontWeight: 600, color: S.COLORS.success }}>₹{item.sales}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </Box>
                        </Box>
                    </Grid>

                    {/* Payment Breakdown */}
                    <Grid item xs={12} md={5}>
                        <Box style={S.card}>
                            <Box style={{ padding: '14px 18px', borderBottom: `1px solid ${S.COLORS.border}` }}>
                                <Typography style={{ fontWeight: 700, fontSize: '15px' }}>💳 Payment Breakdown</Typography>
                            </Box>
                            <Box style={{ padding: '16px' }}>
                                {stats.payment_breakdown && Object.entries(stats.payment_breakdown).map(([mode, data]) => (
                                    <Box key={mode} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', marginBottom: '8px', background: S.COLORS.surface, border: `1px solid ${S.COLORS.border}` }}>
                                        <Box>
                                            <Box style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>{mode}</Box>
                                            <Box style={{ fontSize: '11px', color: '#888' }}>{data.count} order(s)</Box>
                                        </Box>
                                        <Box style={{ fontSize: '16px', fontWeight: 700, color: S.COLORS.primary }}>₹{data.amount}</Box>
                                    </Box>
                                ))}
                                {/* Wallet Stats */}
                                <Box style={{ marginTop: '16px', padding: '14px', borderRadius: '10px', background: `linear-gradient(135deg, ${S.COLORS.primary}15, ${S.COLORS.primaryLight}15)`, border: `1px solid ${S.COLORS.primaryLight}30` }}>
                                    <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box><WalletIcon style={{ color: S.COLORS.primary, verticalAlign: 'middle', marginRight: '6px' }} /><span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>Total Wallets</span></Box>
                                        <Box style={{ fontSize: '14px', fontWeight: 700, color: S.COLORS.primary }}>{stats.total_wallets}</Box>
                                    </Box>
                                    <Box style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                        <span style={{ fontSize: '12px', color: '#666' }}>Total Balance</span>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: S.COLORS.success }}>₹{stats.total_wallet_balance}</span>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    </Grid>
                </Grid>
            </Box>
        );
    }
}

export default TabDashboard;
