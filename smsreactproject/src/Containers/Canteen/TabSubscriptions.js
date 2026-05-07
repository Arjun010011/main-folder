import React, { Component } from 'react';
import { Box, Grid, Typography, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Chip, TextField } from '@material-ui/core';
import { AsyncPaginate } from 'react-select-async-paginate';
import { Refresh as RefreshIcon, Add as AddIcon, Visibility as ViewIcon, Pause as PauseIcon, PlayArrow as PlayIcon, Cancel as CancelIcon, People as StaffIcon, School as StudentIcon } from '@material-ui/icons';
import Swal from 'sweetalert2';
import { getRequest, postRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, PUT_URL } from 'Includes/urls';
import { isUserHasPermission, dateFormat } from 'Includes/functions';
import S from './canteenStyles';

const STATUS_MAP = {
    0: { label: 'Active', color: '#2E7D32', bg: '#E8F5E9' },
    1: { label: 'Paused', color: '#F57F17', bg: '#FFF8E1' },
    2: { label: 'Expired', color: '#888', bg: '#F5F5F5' },
    3: { label: 'Cancelled', color: '#C62828', bg: '#FFEBEE' },
};

const MEAL_TYPE_MAP = { 0: 'Breakfast', 1: 'Lunch', 2: 'Snacks', 3: 'Dinner', 4: 'All Meals' };

class TabSubscriptions extends Component {
    state = {
        userType: 'staff',
        subscriptions: [], loading: true,
        pageno: 1, hasMore: false, loadingMore: false,
        // Subscribe dialog
        subscribeOpen: false, submitting: false, submitProgress: '',
        selectedPackage: null, selectedUsers: [], startDate: '', endDate: '',
        // Usage dialog
        usageOpen: false, usageData: null, usageLoading: false, selectedSub: null,
        statusFilter: '',
    };

    componentDidMount() { this.loadSubscriptions(); }

    selectUserType = (type) => {
        this.setState({ userType: type, subscriptions: [], pageno: 1, statusFilter: '' }, () => {
            this.loadSubscriptions();
        });
    };

    loadSubscriptions = (page = 1, append = false) => {
        if (!append) this.setState({ loading: true }); else this.setState({ loadingMore: true });
        const params = { is_active: true, limit: 15, pageno: page, user_type: this.state.userType };
        if (this.state.statusFilter !== '') params.status = this.state.statusFilter;
        getRequest(GET_URL.meal_package_subscription.api, params, this.props).then(res => {
            const list = res?.data?.data?.data_list || res?.data?.data || [];
            const hasMore = res?.data?.data?.next != null;
            this.setState(prev => ({
                subscriptions: append ? [...prev.subscriptions, ...(Array.isArray(list) ? list : [])] : (Array.isArray(list) ? list : []),
                loading: false, loadingMore: false, pageno: page, hasMore,
            }));
        }).catch(() => this.setState({ loading: false, loadingMore: false }));
    };

    loadMoreSubs = () => { this.loadSubscriptions(this.state.pageno + 1, true); };

    loadUserPageOptions = async (search, prevOptions, { page }) => {
        let filteredOptions = [];
        let hasMore = false;
        const { userType } = this.state;
        const url = userType === 'staff' ? GET_URL.getstafffullname.api : GET_URL.student.api;
        const params = { limit: 15, pageno: page + 1 };
        if (userType !== 'staff') params.is_active = true;
        if (search) params.search = search;
        try {
            const res = await getRequest(url, params, this.props);
            const list = res?.data?.data?.data_list || res?.data?.data?.student_list || res?.data?.student_list || res?.data?.data || [];
            filteredOptions = (Array.isArray(list) ? list : []).map(s => ({
                value: userType === 'staff' ? (s.user_id || s.users__id || s.id) : (s.user_id || s.users__id || s.user || s.id),
                label: [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ') || s.full_name || `${userType === 'staff' ? 'Staff' : 'Student'} #${s.id}`,
            }));
            hasMore = !!(res?.data?.data?.next || res?.data?.next);
        } catch (err) { /* ignore */ }
        return { options: filteredOptions, hasMore, additional: { page: page + 1 } };
    };

    loadPackageOptions = async (search, prevOptions, { page }) => {
        let filteredOptions = [];
        let hasMore = false;
        const params = { is_active: true, limit: 15, pageno: page + 1 };
        if (search) params.search = search;
        try {
            const res = await getRequest(GET_URL.meal_package.api, params, this.props);
            const list = res?.data?.data?.data_list || res?.data?.data || [];
            filteredOptions = (Array.isArray(list) ? list : []).map(p => ({
                value: p.id,
                label: `${p.name} — ₹${p.price} (${MEAL_TYPE_MAP[p.meal_type] || '-'})`,
                duration_days: p.duration_days,
            }));
            hasMore = res?.data?.data?.next ? true : false;
        } catch (err) { /* ignore */ }
        return { options: filteredOptions, hasMore, additional: { page: page + 1 } };
    };

    computeEndDate = (startDate, durationDays) => {
        if (!startDate || !durationDays) return '';
        const d = new Date(startDate);
        d.setDate(d.getDate() + durationDays);
        return d.toISOString().split('T')[0];
    };

    handlePackageChange = (val) => {
        const endDate = val ? this.computeEndDate(this.state.startDate, val.duration_days) : '';
        this.setState({ selectedPackage: val, endDate });
    };

    handleStartDateChange = (e) => {
        const startDate = e.target.value;
        const endDate = this.state.selectedPackage ? this.computeEndDate(startDate, this.state.selectedPackage.duration_days) : '';
        this.setState({ startDate, endDate });
    };

    openSubscribeDialog = () => {
        this.setState({ subscribeOpen: true, selectedPackage: null, selectedUsers: [], startDate: '', endDate: '', submitProgress: '' });
    };

    submitSubscription = async () => {
        const { selectedUsers, selectedPackage, startDate, endDate } = this.state;
        if (!selectedUsers.length || !selectedPackage || !startDate || !endDate) {
            Swal.fire({ icon: 'warning', title: 'All fields required', text: 'Please select at least one user and fill all fields.' });
            return;
        }
        this.setState({ submitting: true, submitProgress: `0 / ${selectedUsers.length}` });
        let success = 0, failed = 0;
        for (let i = 0; i < selectedUsers.length; i++) {
            const user = selectedUsers[i];
            this.setState({ submitProgress: `${i + 1} / ${selectedUsers.length} — ${user.label}` });
            try {
                const payload = { user: user.value, package: selectedPackage.value, start_date: startDate, end_date: endDate };
                const res = await postRequest(POST_URL.meal_package_subscription.api, payload, this.props);
                if (res && (res.status === 200 || res.status === 201)) success++;
                else failed++;
            } catch (e) { failed++; }
        }
        this.setState({ submitting: false, subscribeOpen: false, submitProgress: '' });
        Swal.fire({
            icon: failed > 0 ? 'warning' : 'success',
            title: `${success} subscribed${failed > 0 ? `, ${failed} failed` : ''}`,
            timer: 2000, showConfirmButton: false,
        });
        this.loadSubscriptions();
    };

    viewUsage = (sub) => {
        this.setState({ usageOpen: true, usageLoading: true, selectedSub: sub, usageData: null });
        getRequest(`${GET_URL.meal_package_subscription.api}${sub.id}/?action=remaining`, {}, this.props).then(res => {
            this.setState({ usageData: res?.data?.data || null, usageLoading: false });
        }).catch(() => this.setState({ usageLoading: false }));
    };

    changeStatus = (subId, newStatus, label) => {
        Swal.fire({
            title: `${label} Subscription?`, icon: 'question', showCancelButton: true,
            confirmButtonText: `Yes, ${label}`,
        }).then(r => {
            if (r.value) {
                let url = `${PUT_URL.meal_package_subscription.api}${subId}/`;
                let payload = { status: newStatus };
                if (newStatus === 1) {
                    url += '?action=pause';
                    payload = {};
                } else if (newStatus === 0) {
                    url += '?action=resume';
                    payload = {};
                }
                putRequest(url, payload, this.props).then(res => {
                    if (res && res.status === 200) {
                        const msg = res.data?.Reason || `${label}d!`;
                        Swal.fire({ icon: 'success', title: msg, timer: 1500, showConfirmButton: false });
                        this.loadSubscriptions();
                    }
                });
            }
        });
    };

    render() {
        const { userType, subscriptions, loading, hasMore, loadingMore, subscribeOpen, submitting, submitProgress,
            selectedPackage, selectedUsers, startDate, endDate, usageOpen, usageData, usageLoading, selectedSub, statusFilter } = this.state;
        const canCreate = isUserHasPermission('meal_package_subscription', 'create');
        const canUpdate = isUserHasPermission('meal_package_subscription', 'update');

        return (
            <Box>
                {/* Header */}
                <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <Box style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <Box style={{ ...S.mealChip(userType === 'staff'), ...(userType === 'staff' ? { background: 'linear-gradient(135deg, #1565C0, #42A5F5)', color: 'white' } : {}) }}
                            onClick={() => this.selectUserType('staff')}>
                            <StaffIcon style={{ fontSize: '16px' }} /> Staff
                        </Box>
                        <Box style={{ ...S.mealChip(userType === 'student'), ...(userType === 'student' ? { background: 'linear-gradient(135deg, #2E7D32, #66BB6A)', color: 'white' } : {}) }}
                            onClick={() => this.selectUserType('student')}>
                            <StudentIcon style={{ fontSize: '16px' }} /> Student
                        </Box>
                        <Box style={{ width: '1px', height: '24px', background: '#ddd', margin: '0 6px' }} />
                        <Box style={S.mealChip(statusFilter === '')} onClick={() => this.setState({ statusFilter: '' }, () => this.loadSubscriptions())}>All</Box>
                        {Object.entries(STATUS_MAP).map(([k, v]) => (
                            <Box key={k} style={S.mealChip(statusFilter === k)} onClick={() => this.setState({ statusFilter: k }, () => this.loadSubscriptions())}>{v.label}</Box>
                        ))}
                    </Box>
                    <Box style={{ display: 'flex', gap: '8px' }}>
                        <button style={S.outlineBtn} onClick={() => this.loadSubscriptions()}><RefreshIcon fontSize="small" /> Refresh</button>
                        {canCreate && <button style={S.successBtn} onClick={this.openSubscribeDialog}><AddIcon fontSize="small" /> Subscribe</button>}
                    </Box>
                </Box>

                {/* List */}
                {loading ? <Box style={{ textAlign: 'center', padding: '40px' }}><CircularProgress size={28} /></Box> :
                    subscriptions.length === 0 ? <Box style={{ ...S.card, ...S.emptyState }}>No {userType} subscriptions found</Box> :
                        <Box>
                            <Box style={S.card}><Box style={{ overflowX: 'auto' }}>
                                <table style={S.table}>
                                    <thead><tr>
                                        <th style={S.th}>User</th><th style={S.th}>Package</th><th style={S.th}>Meal Type</th>
                                        <th style={S.th}>Period</th><th style={S.th}>Status</th><th style={S.th}>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {subscriptions.map(s => {
                                            const st = STATUS_MAP[s.status] || STATUS_MAP[0];
                                            const pkgName = typeof s.package === 'object' ? s.package?.name : `#${s.package}`;
                                            const mealType = typeof s.package === 'object' ? MEAL_TYPE_MAP[s.package?.meal_type] : '-';
                                            return (
                                                <tr key={s.id}>
                                                    <td style={{ ...S.td, fontWeight: 600 }}>{s.user_display_name || s.username || `#${s.user}`}</td>
                                                    <td style={{ ...S.td, fontWeight: 600, color: S.COLORS.primary }}>{pkgName}</td>
                                                    <td style={S.td}>{mealType}</td>
                                                    <td style={S.td}>{dateFormat(s.start_date, 'DD/MM/YYYY')} → {dateFormat(s.end_date, 'DD/MM/YYYY')}</td>
                                                    <td style={S.td}><Box style={S.statusChip(st.color, st.bg)}>{st.label}</Box></td>
                                                    <td style={S.td}>
                                                        <Box style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                            <IconButton size="small" title="View Usage" onClick={() => this.viewUsage(s)}><ViewIcon fontSize="small" style={{ color: S.COLORS.primary }} /></IconButton>
                                                            {canUpdate && s.status === 0 && (typeof s.package === 'object' ? s.package?.is_pause_allowed : true) && (
                                                                <IconButton size="small" title="Pause" onClick={() => this.changeStatus(s.id, 1, 'Pause')}><PauseIcon fontSize="small" style={{ color: '#F57F17' }} /></IconButton>
                                                            )}
                                                            {canUpdate && s.status === 1 && (
                                                                <IconButton size="small" title="Resume" onClick={() => this.changeStatus(s.id, 0, 'Resume')}><PlayIcon fontSize="small" style={{ color: '#2E7D32' }} /></IconButton>
                                                            )}
                                                            {canUpdate && (s.status === 0 || s.status === 1) && (
                                                                <IconButton size="small" title="Cancel" onClick={() => this.changeStatus(s.id, 3, 'Cancel')}><CancelIcon fontSize="small" style={{ color: '#C62828' }} /></IconButton>
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
                                    <button style={S.outlineBtn} onClick={this.loadMoreSubs} disabled={loadingMore}>
                                        {loadingMore ? 'Loading...' : 'Load More'}
                                    </button>
                                </Box>
                            )}
                        </Box>
                }

                {/* ═══ BULK SUBSCRIBE DIALOG ═══ */}
                <Dialog open={subscribeOpen} onClose={() => !submitting && this.setState({ subscribeOpen: false })} maxWidth="md" fullWidth>
                    <DialogTitle style={S.dialogHeader}><Box style={S.dialogHeaderTitle}>Bulk Subscribe {userType === 'staff' ? 'Staff' : 'Students'} to Meal Package</Box></DialogTitle>
                    <DialogContent style={{ padding: '28px' }}>
                        <Box style={{ ...S.formGroup, marginBottom: '20px' }}>
                            <Box style={S.formLabel}>Select {userType === 'staff' ? 'Staff' : 'Students'} * <span style={{ fontSize: '10px', color: '#888', fontWeight: 400, textTransform: 'none' }}>(multiple selection)</span></Box>
                            <AsyncPaginate
                                key={userType}
                                isMulti
                                value={selectedUsers}
                                loadOptions={this.loadUserPageOptions}
                                onChange={(val) => this.setState({ selectedUsers: val || [] })}
                                additional={{ page: 0 }}
                                placeholder={`Search & select ${userType === 'staff' ? 'staff' : 'students'}...`}
                                closeMenuOnSelect={false}
                                styles={{
                                    control: (base) => ({ ...base, minHeight: 40, fontSize: 14 }),
                                    menu: (base) => ({ ...base, zIndex: 9999 }),
                                    multiValue: (base) => ({ ...base, background: '#E3F2FD', borderRadius: '4px' }),
                                }}
                            />
                            {selectedUsers.length > 0 && (
                                <Box style={{ fontSize: '12px', color: S.COLORS.primary, marginTop: '6px', fontWeight: 600 }}>
                                    {selectedUsers.length} {userType === 'staff' ? 'staff' : 'student'}{selectedUsers.length > 1 ? 's' : ''} selected
                                </Box>
                            )}
                        </Box>
                        <Box style={{ ...S.formGroup, marginBottom: '20px' }}>
                            <Box style={S.formLabel}>Meal Package *</Box>
                            <AsyncPaginate
                                value={selectedPackage}
                                loadOptions={this.loadPackageOptions}
                                onChange={this.handlePackageChange}
                                additional={{ page: 0 }}
                                placeholder="Search meal package..."
                                isClearable
                                styles={{
                                    control: (base) => ({ ...base, minHeight: 40, fontSize: 14 }),
                                    menu: (base) => ({ ...base, zIndex: 9999 }),
                                }}
                            />
                        </Box>
                        <Box style={S.formRow}>
                            <Box style={S.formCol}>
                                <Box style={S.formLabel}>Start Date *</Box>
                                <input style={{ ...S.formInput, padding: '12px 14px' }} type="date" value={startDate} onChange={this.handleStartDateChange} />
                            </Box>
                            <Box style={S.formCol}>
                                <Box style={S.formLabel}>End Date {selectedPackage ? <span style={{ fontSize: '10px', color: '#888', fontWeight: 400, textTransform: 'none' }}>(auto-calculated: {selectedPackage.duration_days} days)</span> : '*'}</Box>
                                <input style={{ ...S.formInput, padding: '12px 14px', background: selectedPackage ? '#f5f5f5' : '#fff' }} type="date" value={endDate} readOnly={!!selectedPackage} onChange={!selectedPackage ? e => this.setState({ endDate: e.target.value }) : undefined} />
                            </Box>
                        </Box>

                        {/* Progress Indicator */}
                        {submitting && (
                            <Box style={{ marginTop: '20px', padding: '14px', borderRadius: '10px', background: '#E3F2FD', textAlign: 'center' }}>
                                <CircularProgress size={20} style={{ marginBottom: '8px' }} />
                                <Box style={{ fontSize: '13px', color: '#1565C0', fontWeight: 600 }}>Subscribing {submitProgress}...</Box>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions style={{ padding: '16px 28px 24px' }}>
                        <Button onClick={() => this.setState({ subscribeOpen: false })} disabled={submitting}>Cancel</Button>
                        <button style={{ ...S.successBtn, padding: '10px 24px' }} onClick={this.submitSubscription} disabled={submitting}>
                            {submitting ? `Subscribing ${submitProgress}` : `Subscribe ${selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}`}
                        </button>
                    </DialogActions>
                </Dialog>

                {/* ═══ USAGE DIALOG ═══ */}
                <Dialog open={usageOpen} onClose={() => this.setState({ usageOpen: false })} maxWidth="md" fullWidth>
                    <DialogTitle style={S.dialogHeader}><Box style={S.dialogHeaderTitle}>Subscription Usage</Box></DialogTitle>
                    <DialogContent style={{ padding: '28px' }}>
                        {usageLoading ? <Box style={{ textAlign: 'center', padding: '30px' }}><CircularProgress size={28} /></Box> :
                            !usageData ? <Box style={S.emptyState}>No usage data</Box> : (
                                <Box>
                                    {selectedSub && (
                                        <Box style={{ marginBottom: '20px', padding: '16px', borderRadius: '10px', background: S.COLORS.surface, border: `1px solid ${S.COLORS.border}` }}>
                                            <Box style={{ fontSize: '16px', fontWeight: 700, color: '#333', marginBottom: '6px' }}>
                                                {typeof selectedSub.package === 'object' ? selectedSub.package.name : `Package #${selectedSub.package}`}
                                            </Box>
                                            <Box style={{ fontSize: '13px', color: '#888' }}>
                                                {selectedSub.user_display_name || selectedSub.username || `User #${selectedSub.user}`} • {dateFormat(selectedSub.start_date, 'DD/MM/YYYY')} → {dateFormat(selectedSub.end_date, 'DD/MM/YYYY')}
                                            </Box>
                                        </Box>
                                    )}
                                    <Grid container spacing={3}>
                                        <Grid item xs={4}>
                                            <Box style={{ textAlign: 'center', padding: '20px', borderRadius: '12px', background: '#E3F2FD' }}>
                                                <Box style={{ fontSize: '28px', fontWeight: 800, color: '#1565C0' }}>{usageData.total_allowed}</Box>
                                                <Box style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', fontWeight: 600, marginTop: '6px' }}>Total Allowed</Box>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Box style={{ textAlign: 'center', padding: '20px', borderRadius: '12px', background: '#FFF3E0' }}>
                                                <Box style={{ fontSize: '28px', fontWeight: 800, color: '#E65100' }}>{usageData.total_used}</Box>
                                                <Box style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', fontWeight: 600, marginTop: '6px' }}>Used</Box>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Box style={{ textAlign: 'center', padding: '20px', borderRadius: '12px', background: '#E8F5E9' }}>
                                                <Box style={{ fontSize: '28px', fontWeight: 800, color: '#2E7D32' }}>{usageData.remaining}</Box>
                                                <Box style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', fontWeight: 600, marginTop: '6px' }}>Remaining</Box>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Box>
                            )
                        }
                    </DialogContent>
                    <DialogActions style={{ padding: '16px 28px 24px' }}>
                        <Button onClick={() => this.setState({ usageOpen: false })}>Close</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        );
    }
}

export default TabSubscriptions;
