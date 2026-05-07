import React, { Component } from 'react';
import { Box, Grid, Typography, Chip, CircularProgress, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import EditIcon from '@material-ui/icons/Edit';
import VisibilityIcon from '@material-ui/icons/Visibility';
import { withRouter } from 'react-router-dom';
import Swal from 'sweetalert2';

import loadingBar from 'images/loading.gif';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls';
import { isUserHasPermission } from 'Includes/functions';
import S from './canteenStyles';

const MEAL_TYPES = { 0: 'Breakfast', 1: 'Lunch', 2: 'Snacks', 3: 'Dinner', 4: 'All Meals' };
const AVAILABLE_FOR_MAP = {
    0: { label: 'Staff', color: '#1C52C8', bg: '#EBF1FF' },
    1: { label: 'Student', color: '#1C52C8', bg: '#EBF1FF' },
    2: { label: 'Both', color: '#1C52C8', bg: '#EBF1FF' },
};

class MealPackageList extends Component {
    state = {
        packages: [],
        loading: true,
        viewPackage: null,
        viewOpen: false,
    };

    componentDidMount() { this.loadData(); }

    loadData = () => {
        getRequest(GET_URL.meal_package.api, { is_active: true, limit: 50, pageno: 1 }, this.props).then(response => {
            if (response && response.status === 200) {
                const list = response.data?.data?.data_list || response.data?.data || [];
                this.setState({ packages: Array.isArray(list) ? list : [], loading: false });
            } else this.setState({ loading: false });
        });
    };

    deletePackage = (id) => {
        Swal.fire({
            title: 'Delete Package?', text: 'This action cannot be undone.',
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d32f2f', confirmButtonText: 'Delete',
        }).then(result => {
            if (result.value) {
                deleteRequest(`${DEL_URL.meal_package.api}${id}/`, {}, this.props).then(res => {
                    if (res && res.status === 200) {
                        Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1200, showConfirmButton: false });
                        this.loadData();
                    }
                });
            }
        });
    };

    viewDetails = (pkg) => {
        this.setState({ viewPackage: pkg, viewOpen: true });
    };

    getDurationLabel = (days) => {
        if (!days) return '-';
        if (days >= 365 && days % 365 === 0) { const y = days / 365; return y === 1 ? '1 Year' : `${y} Years`; }
        if (days >= 30 && days % 30 === 0) { const m = days / 30; return m === 1 ? '1 Month' : `${m} Months`; }
        return `${days} Days`;
    };

    render() {
        const { packages, loading, viewPackage, viewOpen } = this.state;
        if (loading) return <Box display="flex" justifyContent="center" p={6}><img src={loadingBar} className="loading" alt="loading" /></Box>;

        return (
            <Box>
                {/* Header */}
                <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <Typography style={S.sectionTitle}>Meal Packages ({packages.length})</Typography>
                    {isUserHasPermission('meal_package', 'create') && (
                        <button style={S.primaryBtn} onClick={() => this.props.history.push('/canteen/meal-package/add')}>
                            <AddCircleOutlineOutlinedIcon style={{ fontSize: '18px' }} /> Add Package
                        </button>
                    )}
                </Box>

                {/* Package Cards Grid */}
                {packages.length === 0 ? (
                    <Box style={S.emptyState}>
                        <Box style={{ fontSize: '48px', marginBottom: '12px', color: '#ccc' }}>□</Box>
                        <Typography variant="h6" style={{ color: '#aaa' }}>No packages created yet</Typography>
                        <Typography style={{ color: '#ccc', fontSize: '13px' }}>Click "Add Package" to create your first meal package</Typography>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {packages.map(pkg => {
                            const af = AVAILABLE_FOR_MAP[pkg.available_for] || AVAILABLE_FOR_MAP[2];
                            const itemCount = pkg.items?.length || 0;
                            return (
                                <Grid item xs={12} sm={6} md={4} key={pkg.id}>
                                    <Box style={{ ...S.card, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                        {/* Card top color bar */}
                                        <Box style={{ height: '5px', background: `linear-gradient(90deg, ${S.COLORS.primary}, ${S.COLORS.primaryLight})` }} />
                                        <Box style={{ padding: '18px', flex: 1 }}>
                                            {/* Title row */}
                                            <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                <Box style={{ flex: 1 }}>
                                                    <Typography style={{ fontSize: '16px', fontWeight: 700, color: S.COLORS.text, marginBottom: '4px' }}>{pkg.name}</Typography>
                                                    <Chip label={MEAL_TYPES[pkg.meal_type] || '-'} size="small" style={{ height: '22px', fontSize: '11px', background: S.COLORS.primaryBg, color: S.COLORS.primary, fontWeight: 600 }} />
                                                </Box>
                                                <Typography style={{ fontSize: '22px', fontWeight: 800, color: S.COLORS.primary }}>₹{parseFloat(pkg.price || 0).toFixed(0)}</Typography>
                                            </Box>

                                            {/* Info chips */}
                                            <Box style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                                <Chip label={this.getDurationLabel(pkg.duration_days)} size="small"
                                                    style={{ height: '24px', fontSize: '11px', background: S.COLORS.surface, color: S.COLORS.textSecondary, fontWeight: 600, border: `1px solid ${S.COLORS.border}` }} />
                                                <Chip label={af.label} size="small"
                                                    style={{ height: '24px', fontSize: '11px', background: S.COLORS.surface, color: af.color, fontWeight: 600, border: `1px solid ${S.COLORS.border}` }} />
                                                <Chip label={`${itemCount} Item${itemCount !== 1 ? 's' : ''}`} size="small"
                                                    style={{ height: '24px', fontSize: '11px', background: S.COLORS.surface, color: S.COLORS.textSecondary, fontWeight: 600, border: `1px solid ${S.COLORS.border}` }} />
                                            </Box>

                                            {pkg.description && (
                                                <Typography style={{ fontSize: '12px', color: S.COLORS.textMuted, lineHeight: 1.4 }}>
                                                    {pkg.description.length > 80 ? pkg.description.substring(0, 80) + '...' : pkg.description}
                                                </Typography>
                                            )}
                                        </Box>

                                        {/* Actions */}
                                        <Box style={{ padding: '10px 18px', borderTop: `1px solid ${S.COLORS.border}`, display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                                            <Tooltip title="View Items">
                                                <IconButton size="small" onClick={() => this.viewDetails(pkg)} style={{ color: S.COLORS.primary }}>
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {isUserHasPermission('meal_package', 'delete') && (
                                                <Tooltip title="Delete">
                                                    <IconButton size="small" onClick={() => this.deletePackage(pkg.id)} style={{ color: '#d32f2f' }}>
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
                        <Box style={S.dialogHeaderTitle}>{viewPackage?.name || 'Package Details'}</Box>
                    </DialogTitle>
                    <DialogContent style={{ padding: '20px' }}>
                        {viewPackage?.items?.length > 0 ? (
                            <Box>
                                <Typography style={{ fontSize: '13px', fontWeight: 600, color: '#666', marginBottom: '12px' }}>
                                    Included Items ({viewPackage.items.length})
                                </Typography>
                                {viewPackage.items.map((item, idx) => {
                                    const fi = item.food_item;
                                    const combo = item.combo;
                                    const name = fi ? fi.name : combo ? combo.name : 'Unknown';
                                    const isCombo = !!combo;
                                    return (
                                        <Box key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', background: S.COLORS.surface, border: `1px solid ${S.COLORS.border}`, marginBottom: '6px' }}>
                                            <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600 }}>{name}</span>
                                                {isCombo && <Chip label="COMBO" size="small" style={{ height: '18px', fontSize: '10px', background: '#FFF3E0', color: '#E65100' }} />}
                                            </Box>
                                            <span style={{ fontSize: '12px', color: '#888' }}>x{item.quantity}</span>
                                        </Box>
                                    );
                                })}
                            </Box>
                        ) : (
                            <Typography style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>No items in this package</Typography>
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

export default withRouter(MealPackageList);
