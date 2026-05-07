import React, { Component } from 'react';
import { Box, Grid, Typography, Chip, CircularProgress, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import VisibilityIcon from '@material-ui/icons/Visibility';
import { withRouter } from 'react-router-dom';
import Swal from 'sweetalert2';

import loadingBar from 'images/loading.gif';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls';
import { isUserHasPermission } from 'Includes/functions';
import S from './canteenStyles';

const MEAL_TYPES = { 0: 'Breakfast', 1: 'Lunch', 2: 'Snacks', 3: 'Dinner' };

class MenuList extends Component {
    state = {
        menus: [],
        loading: true,
        viewMenu: null,
        viewOpen: false,
        filter: 'all', // 'all', 'default', 'special'
    };

    componentDidMount() { this.loadData(); }

    loadData = () => {
        getRequest(GET_URL.canteen_menu.api, { is_active: true, limit: 50, pageno: 1 }, this.props).then(response => {
            if (response && response.status === 200) {
                const list = response.data?.data?.data_list || response.data?.data || [];
                this.setState({ menus: Array.isArray(list) ? list : [], loading: false });
            } else this.setState({ loading: false });
        });
    };

    deleteMenu = (id) => {
        Swal.fire({
            title: 'Delete Menu?', text: 'This will also remove all items in this menu.',
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d32f2f', confirmButtonText: 'Delete',
        }).then(result => {
            if (result.value) {
                deleteRequest(`${DEL_URL.canteen_menu.api}${id}/`, {}, this.props).then(res => {
                    if (res && res.status === 200) {
                        Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1200, showConfirmButton: false });
                        this.loadData();
                    }
                });
            }
        });
    };

    viewDetails = (menu) => {
        // Fetch full menu with items
        getRequest(`${GET_URL.canteen_menu.api}${menu.id}/`, {}, this.props).then(res => {
            if (res && res.status === 200) {
                this.setState({ viewMenu: res.data?.data || res.data || menu, viewOpen: true });
            } else {
                this.setState({ viewMenu: menu, viewOpen: true });
            }
        });
    };

    getFilteredMenus = () => {
        const { menus, filter } = this.state;
        if (filter === 'default') return menus.filter(m => !m.is_todays_special);
        if (filter === 'special') return menus.filter(m => m.is_todays_special);
        return menus;
    };

    render() {
        const { loading, viewMenu, viewOpen, filter } = this.state;
        if (loading) return <Box display="flex" justifyContent="center" p={6}><img src={loadingBar} className="loading" alt="loading" /></Box>;

        const filtered = this.getFilteredMenus();

        return (
            <Box>
                {/* Header */}
                <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <Typography style={S.sectionTitle}>Menus ({filtered.length})</Typography>
                    {isUserHasPermission('canteen_menu', 'create') && (
                        <button style={S.primaryBtn} onClick={() => this.props.history.push('/canteen/canteen-menu/add')}>
                            <AddCircleOutlineOutlinedIcon style={{ fontSize: '18px' }} /> Add Menu
                        </button>
                    )}
                </Box>

                {/* Filter chips */}
                <Box style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {[
                        { key: 'all', label: 'All Menus' },
                        { key: 'default', label: 'Default' },
                        { key: 'special', label: 'Specials' },
                    ].map(f => (
                        <Box key={f.key} style={S.mealChip(filter === f.key)} onClick={() => this.setState({ filter: f.key })}>
                            {f.label}
                        </Box>
                    ))}
                </Box>

                {/* Menu Cards */}
                {filtered.length === 0 ? (
                    <Box style={S.emptyState}>
                        <Box style={{ fontSize: '48px', marginBottom: '12px', color: '#ccc' }}>□</Box>
                        <Typography variant="h6" style={{ color: '#aaa' }}>No menus found</Typography>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {filtered.map(menu => {
                            const itemCount = menu.items?.length || 0;
                            return (
                                <Grid item xs={12} sm={6} md={4} key={menu.id}>
                                    <Box style={{ ...S.card, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <Box style={{ height: '5px', background: `linear-gradient(90deg, ${S.COLORS.primary}, ${S.COLORS.primaryLight})` }} />
                                        <Box style={{ padding: '18px', flex: 1 }}>
                                            <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                                <Typography style={{ fontSize: '16px', fontWeight: 700, color: S.COLORS.text }}>{menu.name}</Typography>
                                                {menu.is_todays_special && (
                                                    <Chip label="Special" size="small"
                                                        style={{ height: '22px', fontSize: '11px', background: S.COLORS.primaryBg, color: S.COLORS.primary, fontWeight: 700 }} />
                                                )}
                                            </Box>
                                            <Box style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                <Chip label={MEAL_TYPES[menu.meal_type] || '-'} size="small"
                                                    style={{ height: '22px', fontSize: '11px', background: S.COLORS.primaryBg, color: S.COLORS.primary, fontWeight: 600 }} />
                                                <Chip label={`${itemCount} Item${itemCount !== 1 ? 's' : ''}`} size="small"
                                                    style={{ height: '22px', fontSize: '11px', background: S.COLORS.surface, color: S.COLORS.textSecondary, fontWeight: 600, border: `1px solid ${S.COLORS.border}` }} />
                                            </Box>
                                            {menu.description && (
                                                <Typography style={{ fontSize: '12px', color: S.COLORS.textMuted, marginTop: '8px' }}>
                                                    {menu.description.length > 80 ? menu.description.substring(0, 80) + '...' : menu.description}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box style={{ padding: '10px 18px', borderTop: `1px solid ${S.COLORS.border}`, display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                            <Tooltip title="View Items">
                                                <IconButton size="small" onClick={() => this.viewDetails(menu)} style={{ color: S.COLORS.primary }}>
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {isUserHasPermission('canteen_menu', 'delete') && (
                                                <Tooltip title="Delete">
                                                    <IconButton size="small" onClick={() => this.deleteMenu(menu.id)} style={{ color: '#d32f2f' }}>
                                                        <DeleteOutlineIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}

                {/* View Details Dialog */}
                <Dialog open={viewOpen} onClose={() => this.setState({ viewOpen: false })} maxWidth="sm" fullWidth>
                    <DialogTitle style={S.dialogHeader}>
                        <Box style={S.dialogHeaderTitle}>{viewMenu?.name || 'Menu Details'}</Box>
                    </DialogTitle>
                    <DialogContent style={{ padding: '20px' }}>
                        {viewMenu?.items?.length > 0 ? (
                            <Box>
                                <Typography style={{ fontSize: '13px', fontWeight: 600, color: '#666', marginBottom: '12px' }}>
                                    Items ({viewMenu.items.length})
                                </Typography>
                                {viewMenu.items.map((item, idx) => {
                                    const fi = item.food_item;
                                    const combo = item.combo;
                                    const name = fi ? fi.name : combo ? combo.name : 'Unknown';
                                    const isCombo = !!combo;
                                    return (
                                        <Box key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: S.COLORS.surface, border: `1px solid ${S.COLORS.border}`, marginBottom: '6px' }}>
                                            <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600 }}>{name}</span>
                                                {isCombo && <Chip label="COMBO" size="small" style={{ height: '18px', fontSize: '10px', background: '#FFF3E0', color: '#E65100' }} />}
                                                {item.is_available_today ? (
                                                    <Chip label="Available" size="small" style={{ height: '18px', fontSize: '10px', background: '#E8F5E9', color: '#2E7D32' }} />
                                                ) : (
                                                    <Chip label="Unavailable" size="small" style={{ height: '18px', fontSize: '10px', background: '#FFEBEE', color: '#d32f2f' }} />
                                                )}
                                            </Box>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: S.COLORS.primary }}>₹{parseFloat(item.price || 0).toFixed(2)}</span>
                                        </Box>
                                    );
                                })}
                            </Box>
                        ) : (
                            <Typography style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>No items in this menu</Typography>
                        )}
                    </DialogContent>
                    <DialogActions style={{ padding: '12px 20px' }}>
                        <button style={S.outlineBtn} onClick={() => this.setState({ viewOpen: false })}>Close</button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

export default withRouter(MenuList);
