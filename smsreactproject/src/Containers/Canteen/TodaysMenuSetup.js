import React, { Component } from 'react';
import { Box, Grid, Typography, CircularProgress, Switch, Chip } from '@material-ui/core';
import { Restaurant as RestaurantIcon } from '@material-ui/icons';
import Swal from 'sweetalert2';

import loadingBar from 'images/loading.gif';
import { getRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL } from 'Includes/urls';
import S from './canteenStyles';

const MEAL_TYPES = { 0: 'Breakfast', 1: 'Lunch', 2: 'Snacks', 3: 'Dinner' };

class TodaysMenuSetup extends Component {
    state = {
        loading: true,
        menus: [],
        togglingId: null,
        filter: 'all', // 'all', 'default', 'special'
    };

    componentDidMount() { this.loadMenus(); }

    loadMenus = () => {
        this.setState({ loading: true });
        getRequest(GET_URL.canteen_menu.api, { is_active: true, limit: 50, pageno: 1, action: 'todays_menu' }, this.props).then(response => {
            if (response && response.status === 200) {
                const list = response.data?.data || [];
                this.setState({ menus: Array.isArray(list) ? list : [], loading: false });
            } else {
                // fallback — paginated
                getRequest(GET_URL.canteen_menu.api, { is_active: true, limit: 50, pageno: 1 }, this.props).then(res2 => {
                    const list = res2?.data?.data?.data_list || res2?.data?.data || [];
                    this.setState({ menus: Array.isArray(list) ? list : [], loading: false });
                });
            }
        });
    };

    toggleItemAvailability = (menuIndex, itemIndex, menuItem) => {
        const newVal = !menuItem.is_available_today;
        this.setState({ togglingId: menuItem.id });

        putRequest(`${PUT_URL.canteen_menu_item.api}${menuItem.id}/`, {
            is_available_today: newVal,
        }, this.props).then(res => {
            if (res && res.status === 200) {
                const { menus } = this.state;
                menus[menuIndex].items[itemIndex].is_available_today = newVal;
                this.setState({ menus: [...menus], togglingId: null });
            } else {
                this.setState({ togglingId: null });
                Swal.fire({ icon: 'error', title: 'Failed to update', timer: 1500, showConfirmButton: false });
            }
        });
    };

    getFilteredMenus = () => {
        const { menus, filter } = this.state;
        const menusWithItems = menus.filter(m => m.items && m.items.length > 0);
        if (filter === 'default') return menusWithItems.filter(m => !m.is_todays_special);
        if (filter === 'special') return menusWithItems.filter(m => m.is_todays_special);
        return menusWithItems;
    };

    render() {
        const { loading, togglingId, filter } = this.state;

        if (loading) return <Box display="flex" justifyContent="center" p={6}><img src={loadingBar} className="loading" alt="loading" /></Box>;

        const filtered = this.getFilteredMenus();
        const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

        return (
            <Box>
                {/* Info Header */}
                <Box style={{ background: `linear-gradient(135deg, ${S.COLORS.primary} 0%, ${S.COLORS.primaryLight} 100%)`, borderRadius: '12px', padding: '18px 24px', marginBottom: '20px', color: '#fff' }}>
                    <Typography style={{ fontSize: '18px', fontWeight: 700 }}>Today's Menu Setup</Typography>
                    <Typography style={{ fontSize: '13px', opacity: 0.9 }}>{today} — Toggle items ON/OFF to set what's available today</Typography>
                </Box>

                {/* Filter */}
                <Box style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    {[
                        { key: 'all', label: 'All Menus' },
                        { key: 'default', label: 'Default Menus' },
                        { key: 'special', label: 'Today\'s Specials' },
                    ].map(f => (
                        <Box key={f.key} style={S.mealChip(filter === f.key)} onClick={() => this.setState({ filter: f.key })}>
                            {f.label}
                        </Box>
                    ))}
                </Box>

                {/* Menu Cards */}
                {filtered.length === 0 ? (
                    <Box style={S.emptyState}>
                        <RestaurantIcon style={S.emptyIcon} />
                        <Typography variant="h6" style={{ color: '#aaa' }}>No menus available</Typography>
                        <Typography style={{ color: '#ccc', fontSize: '13px' }}>Create menus in the "Menu Mgmt" tab first</Typography>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {filtered.map((menu, menuIdx) => (
                            <Grid item xs={12} md={6} key={menu.id}>
                                <Box style={S.card}>
                                    {/* Menu Header */}
                                    <Box style={{
                                        ...S.cardHeader,
                                        background: `linear-gradient(135deg, ${S.COLORS.primary}, ${S.COLORS.primaryLight})`,
                                    }}>
                                        <Box>
                                            <Typography style={{ fontWeight: 700, fontSize: '15px' }}>{menu.name}</Typography>
                                            <Typography style={{ fontSize: '12px', opacity: 0.85 }}>
                                                {MEAL_TYPES[menu.meal_type] || '-'} • {menu.items?.length || 0} items
                                            </Typography>
                                        </Box>
                                        {menu.is_todays_special && (
                                            <Chip label="Special" size="small"
                                                style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 700, fontSize: '11px' }} />
                                        )}
                                    </Box>

                                    {/* Items with toggles */}
                                    <Box style={{ padding: '8px 0' }}>
                                        {(menu.items || []).map((item, itemIdx) => {
                                            const fi = item.food_item && typeof item.food_item === 'object' ? item.food_item : null;
                                            const combo = item.combo && typeof item.combo === 'object' ? item.combo : null;
                                            const name = fi ? fi.name : combo ? combo.name : 'Unknown';
                                            const isCombo = !!combo;
                                            const toggling = togglingId === item.id;

                                            return (
                                                <Box key={item.id} style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '10px 18px',
                                                    borderBottom: itemIdx < menu.items.length - 1 ? `1px solid ${S.COLORS.border}` : 'none',
                                                    opacity: item.is_available_today ? 1 : 0.5,
                                                    transition: 'opacity 0.3s',
                                                }}>
                                                    <Box style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                                        <Box>
                                                            <Box style={{ fontSize: '13px', fontWeight: 600, color: S.COLORS.text }}>
                                                                {name}
                                                                {isCombo && <Chip label="C" size="small" style={{ marginLeft: '4px', height: '16px', fontSize: '10px', background: '#FFF3E0', color: '#E65100' }} />}
                                                            </Box>
                                                            <Box style={{ fontSize: '12px', color: S.COLORS.primary, fontWeight: 600 }}>
                                                                ₹{parseFloat(item.price || fi?.cost || combo?.price || 0).toFixed(2)}
                                                            </Box>
                                                        </Box>
                                                    </Box>

                                                    <Box style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <Typography style={{ fontSize: '11px', fontWeight: 600, color: item.is_available_today ? '#2E7D32' : '#d32f2f' }}>
                                                            {item.is_available_today ? 'ON' : 'OFF'}
                                                        </Typography>
                                                        {toggling ? (
                                                            <CircularProgress size={20} style={{ color: S.COLORS.primary }} />
                                                        ) : (
                                                            <Switch
                                                                checked={item.is_available_today}
                                                                onChange={() => this.toggleItemAvailability(menuIdx, itemIdx, item)}
                                                                size="small"
                                                                color="primary"
                                                            />
                                                        )}
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Box>
        );
    }
}

export default TodaysMenuSetup;
