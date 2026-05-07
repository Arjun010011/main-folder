import React, { Component } from 'react';
import { Box, Grid, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Chip, TextField } from '@material-ui/core';
import { AsyncPaginate } from 'react-select-async-paginate';
import { AccountBalanceWallet as WalletIcon, ArrowUpward as TopUpIcon, ArrowDownward as DeductIcon, History as HistoryIcon, Add as AddIcon, Refresh as RefreshIcon, People as StaffIcon, School as StudentIcon } from '@material-ui/icons';
import Swal from 'sweetalert2';
import { getRequest, postRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, PUT_URL } from 'Includes/urls';
import { isUserHasPermission, dateFormat } from 'Includes/functions';
import S from './canteenStyles';

const TX_TYPES = { 0: 'Credit', 1: 'Debit' };
const TX_TYPE_COLORS = { 0: [S.COLORS.success, S.COLORS.successBg], 1: [S.COLORS.danger, S.COLORS.dangerBg] };
const REF_TYPES = { 0: 'Top-up', 1: 'Order Payment', 2: 'Package Purchase', 3: 'Refund', 4: 'Adjustment' };

class TabWallets extends Component {
    state = {
        userType: 'staff',
        wallets: [], loading: true, searchQuery: '',
        selectedWallet: null, transactions: [], txLoading: false,
        topUpOpen: false, topUpAmount: '', topUpDesc: '', topUpSubmitting: false,
        debitOpen: false, debitAmount: '', debitDesc: '', debitSubmitting: false,
        // Create wallet
        createOpen: false, createSubmitting: false, createProgress: '',
        selectedCreateUsers: [], createInitialBalance: '0',
        pageno: 1, hasMore: false, loadingMore: false,
    };

    componentDidMount() { this.loadWallets(); }

    selectUserType = (type) => {
        this.setState({ userType: type, wallets: [], pageno: 1, selectedWallet: null, searchQuery: '' }, () => {
            this.loadWallets();
        });
    };

    loadWallets = (page = 1, append = false) => {
        if (!append) this.setState({ loading: true }); else this.setState({ loadingMore: true });
        const params = { is_active: true, limit: 15, pageno: page, user_type: this.state.userType };
        if (this.state.searchQuery.trim()) params.search = this.state.searchQuery.trim();
        getRequest(GET_URL.canteen_wallet.api, params, this.props).then(res => {
            const list = res?.data?.data?.data_list || res?.data?.data || [];
            const hasMore = res?.data?.data?.next != null;
            this.setState(prev => ({
                wallets: append ? [...prev.wallets, ...(Array.isArray(list) ? list : [])] : (Array.isArray(list) ? list : []),
                loading: false, loadingMore: false, pageno: page, hasMore,
            }));
        }).catch(() => this.setState({ loading: false, loadingMore: false }));
    };

    loadMoreWallets = () => { this.loadWallets(this.state.pageno + 1, true); };
    searchWallets = () => { this.loadWallets(1, false); };

    loadTransactions = (walletId) => {
        this.setState({ txLoading: true });
        getRequest(GET_URL.canteen_wallet_transaction.api, { wallet: walletId, limit: 15 }, this.props).then(res => {
            const list = res?.data?.data?.data_list || res?.data?.data || [];
            this.setState({ transactions: Array.isArray(list) ? list : [], txLoading: false });
        }).catch(() => this.setState({ txLoading: false }));
    };

    selectWallet = (w) => {
        this.setState({ selectedWallet: w });
        this.loadTransactions(w.id);
    };

    // ── Load Users for AsyncPaginate ──
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
            const list = res?.data?.data?.data_list || res?.data?.data || [];
            filteredOptions = (Array.isArray(list) ? list : []).map(s => ({
                value: userType === 'staff' ? (s.user_id || s.users__id || s.id) : (s.user_id || s.users__id || s.user || s.id),
                label: [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ') || s.full_name || `${userType === 'staff' ? 'Staff' : 'Student'} #${s.id}`,
            }));
            hasMore = res?.data?.data?.next ? true : false;
        } catch (err) { /* ignore */ }
        return { options: filteredOptions, hasMore, additional: { page: page + 1 } };
    };

    // ── Top Up ──
    doTopUp = () => {
        const { selectedWallet: w, topUpAmount, topUpDesc } = this.state;
        if (!topUpAmount || parseFloat(topUpAmount) <= 0) { Swal.fire({ icon: 'warning', title: 'Invalid', text: 'Enter a valid amount.' }); return; }
        this.setState({ topUpSubmitting: true });
        putRequest(`${PUT_URL.canteen_wallet.api}${w.id}/?action=top_up`, { amount: parseFloat(topUpAmount), description: topUpDesc || 'Wallet top-up' }, this.props).then(res => {
            if (res && res.status === 200) {
                const newBal = res.data?.data?.wallet_balance || res.data?.wallet_balance;
                Swal.fire({ icon: 'success', title: 'Top-up Successful', text: `New balance: ₹${newBal}`, timer: 1500, showConfirmButton: false });
                this.setState(p => ({
                    topUpOpen: false, topUpAmount: '', topUpDesc: '', topUpSubmitting: false,
                    selectedWallet: { ...p.selectedWallet, balance: newBal || p.selectedWallet.balance },
                }));
                this.loadWallets();
                this.loadTransactions(w.id);
            } else this.setState({ topUpSubmitting: false });
        }).catch(() => this.setState({ topUpSubmitting: false }));
    };

    // ── Manual Debit ──
    doDebit = () => {
        const { selectedWallet: w, debitAmount, debitDesc } = this.state;
        if (!debitAmount || parseFloat(debitAmount) <= 0) { Swal.fire({ icon: 'warning', title: 'Invalid', text: 'Enter a valid amount.' }); return; }
        this.setState({ debitSubmitting: true });
        putRequest(`${PUT_URL.canteen_wallet.api}${w.id}/?action=manual_debit`, { amount: parseFloat(debitAmount), description: debitDesc || 'Manual deduction' }, this.props).then(res => {
            if (res && res.status === 200) {
                const newBal = res.data?.data?.wallet_balance || res.data?.wallet_balance;
                Swal.fire({ icon: 'success', title: 'Deducted!', text: `New balance: ₹${newBal}`, timer: 1500, showConfirmButton: false });
                this.setState(p => ({
                    debitOpen: false, debitAmount: '', debitDesc: '', debitSubmitting: false,
                    selectedWallet: { ...p.selectedWallet, balance: newBal || p.selectedWallet.balance },
                }));
                this.loadWallets();
                this.loadTransactions(w.id);
            } else this.setState({ debitSubmitting: false });
        }).catch(() => this.setState({ debitSubmitting: false }));
    };

    // ── Create Wallets (Bulk) ──
    openCreateDialog = () => {
        this.setState({ createOpen: true, selectedCreateUsers: [], createInitialBalance: '0', createProgress: '' });
    };

    doCreateWallets = async () => {
        const { selectedCreateUsers, createInitialBalance } = this.state;
        if (!selectedCreateUsers.length) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Select at least one user.' }); return; }
        const balance = parseFloat(createInitialBalance) || 0;
        this.setState({ createSubmitting: true, createProgress: `0 / ${selectedCreateUsers.length}` });
        let success = 0, failed = 0;
        for (let i = 0; i < selectedCreateUsers.length; i++) {
            const user = selectedCreateUsers[i];
            this.setState({ createProgress: `${i + 1} / ${selectedCreateUsers.length} — ${user.label}` });
            try {
                const res = await postRequest(POST_URL.canteen_wallet.api, { user: user.value, balance }, this.props);
                if (res && (res.status === 200 || res.status === 201)) {
                    success++;
                    // If initial balance > 0, top up the wallet
                    if (balance > 0 && res.data?.data?.id) {
                        await putRequest(`${PUT_URL.canteen_wallet.api}${res.data.data.id}/?action=top_up`, { amount: balance, description: 'Initial balance' }, this.props);
                    }
                } else failed++;
            } catch (e) { failed++; }
        }
        this.setState({ createSubmitting: false, createOpen: false, createProgress: '' });
        Swal.fire({
            icon: failed > 0 ? 'warning' : 'success',
            title: `${success} wallet${success > 1 ? 's' : ''} created${failed > 0 ? `, ${failed} failed` : ''}`,
            timer: 2000, showConfirmButton: false,
        });
        this.loadWallets();
    };

    render() {
        const { userType, loading, searchQuery, selectedWallet: sw, transactions, txLoading,
            topUpOpen, topUpAmount, topUpDesc, topUpSubmitting,
            debitOpen, debitAmount, debitDesc, debitSubmitting,
            createOpen, createSubmitting, createProgress, selectedCreateUsers, createInitialBalance,
            hasMore, loadingMore } = this.state;

        const canCreate = isUserHasPermission('canteen_wallet', 'create');
        const canUpdate = isUserHasPermission('canteen_wallet', 'update');

        return (
            <Box>
                {/* User Type Toggle */}
                <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <Box style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <Box style={{ ...S.mealChip(userType === 'staff'), ...(userType === 'staff' ? { background: 'linear-gradient(135deg, #1565C0, #42A5F5)', color: 'white' } : {}) }}
                            onClick={() => this.selectUserType('staff')}>
                            <StaffIcon style={{ fontSize: '16px' }} /> Staff
                        </Box>
                        <Box style={{ ...S.mealChip(userType === 'student'), ...(userType === 'student' ? { background: 'linear-gradient(135deg, #2E7D32, #66BB6A)', color: 'white' } : {}) }}
                            onClick={() => this.selectUserType('student')}>
                            <StudentIcon style={{ fontSize: '16px' }} /> Student
                        </Box>
                    </Box>
                    <Box style={{ display: 'flex', gap: '8px' }}>
                        <button style={S.outlineBtn} onClick={() => this.loadWallets()}><RefreshIcon fontSize="small" /> Refresh</button>
                        {canCreate && <button style={S.successBtn} onClick={this.openCreateDialog}><AddIcon fontSize="small" /> Create Wallet</button>}
                    </Box>
                </Box>

                <Grid container spacing={3}>
                    {/* LEFT: Wallet List */}
                    <Grid item xs={12} md={5}>
                        <Box style={S.card}>
                            <Box style={{ padding: '14px 18px', borderBottom: `1px solid ${S.COLORS.border}` }}>
                                <Typography style={{ fontWeight: 700, fontSize: '16px', marginBottom: '10px' }}>
                                    <WalletIcon style={{ verticalAlign: 'middle', marginRight: '6px' }} /> {userType === 'staff' ? 'Staff' : 'Student'} Wallets
                                </Typography>
                                <Box style={{ display: 'flex', gap: '6px' }}>
                                    <input style={{ ...S.searchBox, flex: 1 }} placeholder="Search by name or username..." value={searchQuery}
                                        onChange={e => this.setState({ searchQuery: e.target.value })}
                                        onKeyDown={e => { if (e.key === 'Enter') this.searchWallets(); }} />
                                    <button style={{ ...S.primaryBtn, padding: '6px 12px', fontSize: '12px' }} onClick={this.searchWallets}>Search</button>
                                </Box>
                            </Box>
                            <Box style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto', padding: '0 12px 12px', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
                                {loading ? <Box style={{ textAlign: 'center', padding: '30px' }}><CircularProgress size={24} /></Box> :
                                    this.state.wallets.length === 0 ? <Box style={{ ...S.emptyState, padding: '30px' }}>No {userType} wallets found</Box> :
                                        this.state.wallets.map(w => (
                                            <Box key={w.id} style={{ ...S.cartItem, cursor: 'pointer', borderColor: sw?.id === w.id ? S.COLORS.primaryLight : S.COLORS.border, background: sw?.id === w.id ? S.COLORS.primaryBg : S.COLORS.surface }}
                                                onClick={() => this.selectWallet(w)}>
                                                <Box style={{ flex: 1 }}>
                                                    <Box style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>{w.user_display_name || w.username || `User #${w.user || 'N/A'}`}</Box>
                                                    <Box style={{ fontSize: '11px', color: '#888' }}>Wallet #{w.id}</Box>
                                                </Box>
                                                <Box style={{ fontSize: '16px', fontWeight: 700, color: S.COLORS.primary }}>₹{parseFloat(w.balance).toFixed(2)}</Box>
                                            </Box>
                                        ))}
                            </Box>
                            {hasMore && (
                                <Box style={{ textAlign: 'center', padding: '8px 12px' }}>
                                    <button style={S.outlineBtn} onClick={this.loadMoreWallets} disabled={loadingMore}>
                                        {loadingMore ? 'Loading...' : 'Load More Wallets'}
                                    </button>
                                </Box>
                            )}
                        </Box>
                    </Grid>

                    {/* RIGHT: Selected Wallet Detail */}
                    <Grid item xs={12} md={7}>
                        {!sw ? (
                            <Box style={{ ...S.card, ...S.emptyState, padding: '80px 20px' }}>
                                <WalletIcon style={{ fontSize: '60px', color: '#ddd', marginBottom: '12px' }} />
                                <Typography style={{ color: '#aaa', fontSize: '16px' }}>Select a wallet to view details</Typography>
                            </Box>
                        ) : (
                            <Box>
                                <Box style={S.walletCard}>
                                    <Box style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                                    <Box style={{ position: 'absolute', bottom: '-30px', right: '40px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                                    <Box style={S.walletLabel}>Current Balance</Box>
                                    <Box style={S.walletBalance}>₹{parseFloat(sw.balance).toFixed(2)}</Box>
                                    <Box style={{ fontSize: '13px', opacity: 0.7, marginTop: '4px' }}>{sw.user_display_name || sw.username || `User #${sw.user || 'N/A'}`} • Wallet #{sw.id}</Box>
                                    <Box style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                        {canUpdate && (
                                            <>
                                                <button style={{ ...S.successBtn, background: 'rgba(255,255,255,0.2)', boxShadow: 'none', border: '1px solid rgba(255,255,255,0.3)' }}
                                                    onClick={() => this.setState({ topUpOpen: true, topUpAmount: '', topUpDesc: '' })}><TopUpIcon fontSize="small" /> Top Up</button>
                                                <button style={{ ...S.outlineBtn, background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                                                    onClick={() => this.setState({ debitOpen: true, debitAmount: '', debitDesc: '' })}><DeductIcon fontSize="small" /> Debit</button>
                                            </>
                                        )}
                                    </Box>
                                </Box>

                                {/* Transaction History */}
                                <Box style={{ ...S.card, marginTop: '16px' }}>
                                    <Box style={{ padding: '14px 18px', borderBottom: `1px solid ${S.COLORS.border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <HistoryIcon style={{ color: S.COLORS.primary }} />
                                        <Typography style={{ fontWeight: 700, fontSize: '15px' }}>Transaction History</Typography>
                                    </Box>
                                    <Box style={{ maxHeight: '350px', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
                                        {txLoading ? <Box style={{ textAlign: 'center', padding: '30px' }}><CircularProgress size={24} /></Box> :
                                            transactions.length === 0 ? <Box style={{ ...S.emptyState, padding: '30px' }}>No transactions yet</Box> :
                                                <table style={S.table}>
                                                    <thead>
                                                        <tr><th style={S.th}>Date</th><th style={S.th}>Type</th><th style={S.th}>Reference</th><th style={S.th}>Amount</th><th style={S.th}>Balance After</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {transactions.map(tx => (
                                                            <tr key={tx.id}>
                                                                <td style={S.td}>{tx.created_at ? dateFormat(tx.created_at, 'DD/MM/YYYY hh:mm A') : '-'}</td>
                                                                <td style={S.td}><Box style={S.statusChip(...(TX_TYPE_COLORS[tx.transaction_type] || ['#333', '#eee']))}>{TX_TYPES[tx.transaction_type]}</Box></td>
                                                                <td style={S.td}>{tx.reference_type_display || REF_TYPES[tx.reference_type] || '-'}</td>
                                                                <td style={{ ...S.td, fontWeight: 600, color: tx.transaction_type === 0 ? S.COLORS.success : S.COLORS.danger }}>{tx.transaction_type === 0 ? '+' : '-'}₹{parseFloat(tx.amount).toFixed(2)}</td>
                                                                <td style={S.td}>₹{parseFloat(tx.balance_after).toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>}
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </Grid>
                </Grid>

                {/* ═══ TOP-UP DIALOG ═══ */}
                <Dialog open={topUpOpen} onClose={() => this.setState({ topUpOpen: false })} maxWidth="sm" fullWidth>
                    <DialogTitle style={S.dialogHeader}><Box style={S.dialogHeaderTitle}>Top Up Wallet</Box></DialogTitle>
                    <DialogContent style={{ padding: '24px' }}>
                        <Box style={S.formGroup}><Box style={S.formLabel}>Amount (₹) *</Box><input style={S.formInput} type="number" min="1" value={topUpAmount} onChange={e => this.setState({ topUpAmount: e.target.value })} autoFocus /></Box>
                        <Box style={S.formGroup}><Box style={S.formLabel}>Description</Box><input style={S.formInput} placeholder="Wallet top-up" value={topUpDesc} onChange={e => this.setState({ topUpDesc: e.target.value })} /></Box>
                    </DialogContent>
                    <DialogActions style={{ padding: '12px 24px 20px' }}>
                        <Button onClick={() => this.setState({ topUpOpen: false })}>Cancel</Button>
                        <button style={S.successBtn} onClick={this.doTopUp} disabled={topUpSubmitting}>{topUpSubmitting ? 'Processing...' : 'Top Up'}</button>
                    </DialogActions>
                </Dialog>

                {/* ═══ MANUAL DEBIT DIALOG ═══ */}
                <Dialog open={debitOpen} onClose={() => this.setState({ debitOpen: false })} maxWidth="sm" fullWidth>
                    <DialogTitle style={S.dialogHeader}><Box style={S.dialogHeaderTitle}>Manual Deduction</Box></DialogTitle>
                    <DialogContent style={{ padding: '24px' }}>
                        <Box style={{ padding: '10px', borderRadius: '6px', background: '#FFEBEE', marginBottom: '16px', fontSize: '12px', color: '#C62828' }}>
                            ⚠️ This will deduct from the wallet balance immediately.
                        </Box>
                        <Box style={S.formGroup}><Box style={S.formLabel}>Amount (₹) *</Box><input style={S.formInput} type="number" min="1" value={debitAmount} onChange={e => this.setState({ debitAmount: e.target.value })} autoFocus /></Box>
                        <Box style={S.formGroup}><Box style={S.formLabel}>Reason / Description *</Box><input style={S.formInput} placeholder="e.g., Lost card penalty" value={debitDesc} onChange={e => this.setState({ debitDesc: e.target.value })} /></Box>
                    </DialogContent>
                    <DialogActions style={{ padding: '12px 24px 20px' }}>
                        <Button onClick={() => this.setState({ debitOpen: false })}>Cancel</Button>
                        <button style={{ ...S.primaryBtn, background: '#C62828' }} onClick={this.doDebit} disabled={debitSubmitting}>{debitSubmitting ? 'Processing...' : 'Deduct'}</button>
                    </DialogActions>
                </Dialog>

                {/* ═══ CREATE WALLET DIALOG ═══ */}
                <Dialog open={createOpen} onClose={() => !createSubmitting && this.setState({ createOpen: false })} maxWidth="md" fullWidth>
                    <DialogTitle style={S.dialogHeader}><Box style={S.dialogHeaderTitle}>Create {userType === 'staff' ? 'Staff' : 'Student'} Wallet</Box></DialogTitle>
                    <DialogContent style={{ padding: '28px' }}>
                        <Box style={{ ...S.formGroup, marginBottom: '20px' }}>
                            <Box style={S.formLabel}>Select {userType === 'staff' ? 'Staff' : 'Students'} * <span style={{ fontSize: '10px', color: '#888', fontWeight: 400, textTransform: 'none' }}>(multiple selection)</span></Box>
                            <AsyncPaginate
                                key={userType}
                                isMulti
                                value={selectedCreateUsers}
                                loadOptions={this.loadUserPageOptions}
                                onChange={(val) => this.setState({ selectedCreateUsers: val || [] })}
                                additional={{ page: 0 }}
                                placeholder={`Search & select ${userType === 'staff' ? 'staff' : 'students'}...`}
                                closeMenuOnSelect={false}
                                styles={{
                                    control: (base) => ({ ...base, minHeight: 40, fontSize: 14 }),
                                    menu: (base) => ({ ...base, zIndex: 9999 }),
                                    multiValue: (base) => ({ ...base, background: '#E3F2FD', borderRadius: '4px' }),
                                }}
                            />
                            {selectedCreateUsers.length > 0 && (
                                <Box style={{ fontSize: '12px', color: S.COLORS.primary, marginTop: '6px', fontWeight: 600 }}>
                                    {selectedCreateUsers.length} {userType === 'staff' ? 'staff' : 'student'}{selectedCreateUsers.length > 1 ? 's' : ''} selected
                                </Box>
                            )}
                        </Box>
                        <Box style={{ ...S.formGroup, marginBottom: '20px' }}>
                            <Box style={S.formLabel}>Initial Balance (₹) <span style={{ fontSize: '10px', color: '#888', fontWeight: 400, textTransform: 'none' }}>(optional, default ₹0)</span></Box>
                            <input style={{ ...S.formInput, padding: '12px 14px' }} type="number" min="0" placeholder="0" value={createInitialBalance}
                                onChange={e => this.setState({ createInitialBalance: e.target.value })} />
                        </Box>

                        {createSubmitting && (
                            <Box style={{ marginTop: '20px', padding: '14px', borderRadius: '10px', background: '#E3F2FD', textAlign: 'center' }}>
                                <CircularProgress size={20} style={{ marginBottom: '8px' }} />
                                <Box style={{ fontSize: '13px', color: '#1565C0', fontWeight: 600 }}>Creating {createProgress}...</Box>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions style={{ padding: '16px 28px 24px' }}>
                        <Button onClick={() => this.setState({ createOpen: false })} disabled={createSubmitting}>Cancel</Button>
                        <button style={{ ...S.successBtn, padding: '10px 24px' }} onClick={this.doCreateWallets} disabled={createSubmitting}>
                            {createSubmitting ? `Creating ${createProgress}` : `Create Wallet${selectedCreateUsers.length > 1 ? `s (${selectedCreateUsers.length})` : ''}`}
                        </button>
                    </DialogActions>
                </Dialog>
            </Box >
        );
    }
}

export default TabWallets;
