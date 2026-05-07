import React, { Component } from 'react'
import {
    Paper, Box, Grid, Button, TextField, MenuItem, Menu,
    Table, TableHead, TableRow, TableCell, TableBody,
    Typography, CircularProgress, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@material-ui/core'
import AddIcon from '@material-ui/icons/Add'
import RefreshIcon from '@material-ui/icons/Refresh'
import LockIcon from '@material-ui/icons/Lock'
import VisibilityIcon from '@material-ui/icons/Visibility'
import MoreVertIcon from '@material-ui/icons/MoreVert'
import EditIcon from '@material-ui/icons/Edit'
import DeleteIcon from '@material-ui/icons/Delete'
import classNames from 'classnames'
import InfiniteScroll from 'react-infinite-scroller'
import { withRouter } from 'react-router-dom'
import Swal from 'sweetalert2'

import { getRequest, deleteRequest } from 'Includes/api/apicall'
import { GET_URL, DEL_URL } from 'Includes/urls'
import { numberWithCommas } from 'Includes/functions'
import LoadingGif from 'Components/LoadingGif'
import SummaryCard from '../Components/SummaryCard'


const PAGE_SIZE = 10

class RecoverableAssetRegister extends Component {
    state = {
        categories: [],
        selectedCategory: '',
        financialYears: [],
        selectedFy: '',
        assets: [],
        loading: true,
        tableLoading: false,
        pageno: 1,
        totalCount: 0,
        hasMore: false,
        totals: { count: 0, opening: 0, closing: 0 },
        viewAsset: null,
        anchorEl: null,
        selectedAsset: null
    }

    componentDidMount() {
        this.loadFinancialYears()
    }

    loadFinancialYears = () => {
        getRequest(GET_URL.financialyear.api, { limit: 100 }, this.props)
            .then(res => {
                if (res?.status === 200) {
                    const fys = res.data.data?.data_list || res.data.data || []
                    const activeFy = fys.find(fy => fy.is_active)
                    this.setState({
                        financialYears: fys,
                        selectedFy: activeFy ? activeFy.id : (fys[0] ? fys[0].id : '')
                    }, this.loadCategories)
                } else {
                    this.loadCategories()
                }
            })
            .catch(() => this.loadCategories())
    }

    handleMenuOpen = (e, asset) => this.setState({ anchorEl: e.currentTarget, selectedAsset: asset })
    handleMenuClose = () => this.setState({ anchorEl: null, selectedAsset: null })

    handleEditAsset = () => {
        const { selectedAsset } = this.state
        this.handleMenuClose()
        if (selectedAsset) {
            this.props.history.push(`/finance/recoverable-assets/register/edit?id=${selectedAsset.id}`)
        }
    }

    handleDeleteAsset = () => {
        const { selectedAsset } = this.state
        this.handleMenuClose()
        if (!selectedAsset) return

        Swal.fire({
            title: 'Delete Asset?',
            text: `Are you sure you want to delete "${selectedAsset.name || selectedAsset.particulars}"? This cannot be undone.`,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.value) {
                deleteRequest(`${DEL_URL.recoverableAsset.api}${selectedAsset.id}/`, {}, this.props, true)
                    .then(res => {
                        if (res && res.status === 200) {
                            Swal.fire({
                                position: 'top-end', type: 'success',
                                title: 'Asset has been deleted.',
                                showConfirmButton: false, timer: 1500
                            })
                            this.loadAssets(true)
                        } else if (res && res.data && res.data.message) {
                            Swal.fire('Failed', res.data.message, 'error')
                        } else {
                            Swal.fire('Failed', 'Failed to delete Asset.', 'error')
                        }
                    })
            }
        })
    }

    loadCategories = () => {
        const params = { is_active: true }
        if (this.state.selectedFy) params.financial_year = this.state.selectedFy

        getRequest(GET_URL.recoverableAssetCategory.api, params, this.props)
            .then(res => {
                if (res?.status === 200) {
                    const cats = res.data.data || []
                    this.setState({ categories: cats, loading: false }, this.loadAssets)
                } else {
                    this.setState({ loading: false })
                }
            })
            .catch(() => this.setState({ loading: false }))
    }

    isFyLocked = () => {
        const { categories, selectedCategory } = this.state
        if (selectedCategory) {
            const cat = categories.find(c => c.id === parseInt(selectedCategory))
            return cat && cat.is_fy_locked
        }
        // If no category selected, check if ALL categories have locked FY
        return categories.length > 0 && categories.every(c => c.is_fy_locked)
    }

    loadAssets = (loadMore = false) => {
        if (!loadMore) {
            this.setState({ tableLoading: true, pageno: 1, assets: [], totalCount: 0 })
        }
        const pageno = loadMore ? this.state.pageno : 1
        const params = { is_active: true, limit: PAGE_SIZE, pageno }
        const { selectedCategory, categories, selectedFy } = this.state

        if (selectedFy) {
            params.financial_year = selectedFy
        }

        if (selectedCategory) {
            const cat = categories.find(c => c.id === parseInt(selectedCategory))
            if (cat && cat.asset_types && cat.asset_types.length > 0) {
                params.asset_type = cat.asset_types[0]
            }
            params.category = selectedCategory
        }

        getRequest(GET_URL.recoverableAsset.api, params, this.props)
            .then(res => {
                if (res?.status === 200) {
                    const resData = res.data.data
                    const pageData = resData?.data_list || resData || []
                    const count = resData?.count || pageData.length

                    this.setState(prev => {
                        const allAssets = loadMore ? [...prev.assets, ...pageData] : pageData
                        const opening = allAssets.reduce((s, a) => s + parseFloat(a.opening_balance || 0), 0)
                        const closing = allAssets.reduce((s, a) => s + parseFloat(a.closing_balance || 0), 0)
                        return {
                            assets: allAssets,
                            totalCount: count,
                            hasMore: allAssets.length < count,
                            pageno: pageno + 1,
                            tableLoading: false,
                            totals: { count: count, opening, closing },
                        }
                    })
                } else {
                    this.setState({ tableLoading: false, hasMore: false })
                }
            })
            .catch(() => this.setState({ tableLoading: false, hasMore: false }))
    }

    loadMore = () => {
        if (!this.state.tableLoading && this.state.hasMore) {
            this.loadAssets(true)
        }
    }

    handleAddClick = () => {
        this.props.history.push('/finance/recoverable-assets/register/add')
    }

    formatAmt = (val) => {
        const num = parseFloat(val)
        if (isNaN(num) || num === 0) return '–'
        return numberWithCommas(num.toFixed(2))
    }

    render() {
        const { categories, selectedCategory, assets, loading, tableLoading, hasMore,
            totalCount, totals } = this.state

        if (loading) return <LoadingGif />

        const fyLocked = this.isFyLocked()

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className="header-align">
                            <Box className="heading">
                                Recoverable Assets Register
                                {fyLocked && (
                                    <Chip
                                        icon={<LockIcon style={{ fontSize: 14 }} />}
                                        label="FY Locked"
                                        size="small"
                                        style={{ marginLeft: 12, backgroundColor: '#ffcdd2', color: '#c62828', verticalAlign: 'middle' }}
                                    />
                                )}
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box display="flex" justifyContent="flex-end" p={2}>
                                <Button variant="contained" color="primary" startIcon={<AddIcon />}
                                    onClick={this.handleAddClick}
                                    disabled={fyLocked}
                                    title={fyLocked ? 'Balance sheet is locked for this financial year' : ''}
                                >
                                    Register Asset
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Controls */}
                    <Grid container spacing={3} style={{ padding: 20 }}>
                        <Grid item md={2} xs={12}>
                            <Box mt={2}>
                                <Button variant="outlined" onClick={() => this.loadAssets()} style={{ borderRadius: 30 }}
                                    disabled={tableLoading}>
                                    <RefreshIcon style={{ marginRight: 5 }} /> Refresh
                                </Button>
                            </Box>
                        </Grid>
                        <Grid item md={3} xs={12}>
                            <TextField fullWidth select label="Financial Year" variant="outlined"
                                value={this.state.selectedFy}
                                onChange={e => this.setState({ selectedFy: e.target.value, selectedCategory: '' }, this.loadCategories)}
                            >
                                <MenuItem value="">All Years</MenuItem>
                                {this.state.financialYears.map(fy => (
                                    <MenuItem key={fy.id} value={fy.id}>{fy.name}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item md={3} xs={12}>
                            <TextField fullWidth select label="Category" variant="outlined"
                                value={selectedCategory}
                                onChange={e => this.setState({ selectedCategory: e.target.value }, () => this.loadAssets())}
                            >
                                <MenuItem value="">All Categories</MenuItem>
                                {categories.map(c => (
                                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    </Grid>

                    {/* Summary Cards */}
                    <Grid container spacing={2} style={{ padding: '0 20px 20px 20px' }}>
                        <Grid item xs={12} sm={4}>
                            <SummaryCard label="TOTAL ASSETS" value={totals.count} color="#1565c0" bgColor="#e3f2fd" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <SummaryCard label="TOTAL OPENING" value={this.formatAmt(totals.opening)} color="#6a1b9a" bgColor="#f3e5f5" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <SummaryCard label="TOTAL OUTSTANDING" value={this.formatAmt(totals.closing)} color="#2e7d32" bgColor="#f1f8e9" />
                        </Grid>
                    </Grid>

                    {/* X of Y indicator */}
                    <Box px={3} pb={1} display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="textSecondary">
                            Showing <strong>{assets.length}</strong> of <strong>{totalCount}</strong> assets
                        </Typography>
                        {tableLoading && <CircularProgress size={20} />}
                    </Box>

                    {/* Table */}
                    <Box px={3} pb={3}>
                        <div id="ra-register-scroll" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                            <InfiniteScroll
                                pageStart={0} loadMore={this.loadMore} hasMore={hasMore && !tableLoading}
                                useWindow={false}
                                getScrollParent={() => document.getElementById('ra-register-scroll')}
                                threshold={150}
                            >
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell><strong>Name / Particulars</strong></TableCell>
                                            <TableCell><strong>Category</strong></TableCell>
                                            <TableCell><strong>Counterparty</strong></TableCell>
                                            <TableCell align="right"><strong>Opening Bal.</strong></TableCell>
                                            <TableCell align="right"><strong>Outstanding</strong></TableCell>
                                            <TableCell align="center"><strong>Actions</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {assets.map(asset => (
                                            <TableRow key={asset.id} hover>
                                                <TableCell>{asset.particulars || asset.name}</TableCell>
                                                <TableCell>
                                                    <Chip label={asset.category_name || asset.asset_type_display || asset.asset_type} size="small" variant="outlined" color="primary" />
                                                </TableCell>
                                                <TableCell>{asset.counterparty_name || '–'}</TableCell>
                                                <TableCell align="right">{this.formatAmt(asset.opening_balance)}</TableCell>
                                                <TableCell align="right"><strong>{this.formatAmt(asset.closing_balance)}</strong></TableCell>
                                                <TableCell align="center">
                                                    <IconButton size="small" onClick={(e) => this.handleMenuOpen(e, asset)}>
                                                        <MoreVertIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {assets.length === 0 && !tableLoading && (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center">
                                                    <Typography color="textSecondary">No assets found.</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </InfiniteScroll>
                        </div>

                        {/* Show More fallback */}
                        {hasMore && (
                            <Box display="flex" justifyContent="center" mt={2}>
                                <Button variant="outlined" onClick={this.loadMore} disabled={tableLoading}
                                    style={{ borderRadius: 30 }}>
                                    {tableLoading ? <CircularProgress size={20} style={{ marginRight: 8 }} /> : null}
                                    Show More ({assets.length} of {totalCount})
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Paper>

                {/* ── Asset Detail Dialog ── */}
                <Dialog open={!!this.state.viewAsset} onClose={() => this.setState({ viewAsset: null })} maxWidth="sm" fullWidth>
                    {this.state.viewAsset && (() => {
                        const a = this.state.viewAsset
                        const LINKED_MODULE_LABELS = {
                            SUNDRY_DEBTORS: 'Pending Fees (Sundry Debtors)',
                            STAFF_ADVANCE: 'Staff Advance',
                            CASH_IN_HAND: 'Cash in Hand',
                        }
                        const isSundryDebtors = a.linked_module === 'SUNDRY_DEBTORS'
                        const rows = [
                            ['Name / Particulars', a.particulars || a.name || '–'],
                            ['Category', a.category_name || a.asset_type_display || a.asset_type || '–'],
                            ['Linked Module', a.linked_module ? (LINKED_MODULE_LABELS[a.linked_module] || a.linked_module) : 'None'],
                        ]
                        if (isSundryDebtors) {
                            rows.push(['Pending Fees Mode', a.pending_fees_config ? 'Automatic (Fee Plan Based)' : 'Manual Entry'])
                        }
                        rows.push(
                            ['Counterparty', a.counterparty_name || '–'],
                            ['Staff', a.staff_name || (a.staff ? `ID: ${a.staff}` : '–')],
                            ['Bank', a.bank_detail_name || a.bank_name || (a.bank ? `ID: ${a.bank}` : '–')],
                            ['Account Label', a.account_label || '–'],
                            ['As of Date', a.as_of_date || '–'],
                            ['Remarks', a.remarks || '–'],
                        )
                        return (
                            <>
                                <DialogTitle>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="h6">Asset Details</Typography>
                                        {a.pending_fees_config && (
                                            <Chip label="Auto-Calculated" size="small" style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }} />
                                        )}
                                        {!a.pending_fees_config && isSundryDebtors && (
                                            <Chip label="Manual" size="small" style={{ backgroundColor: '#fff3e0', color: '#e65100' }} />
                                        )}
                                    </Box>
                                </DialogTitle>
                                <DialogContent dividers>
                                    <Table size="small">
                                        <TableBody>
                                            {rows.map(([label, value], idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell style={{ fontWeight: 600, width: '40%', color: '#555' }}>{label}</TableCell>
                                                    <TableCell>{value}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    {/* Balance Breakdown */}
                                    <Box mt={2} p={2} style={{ background: '#f5f5f5', borderRadius: 8 }}>
                                        <Typography variant="subtitle2" style={{ fontWeight: 700, marginBottom: 8, color: '#333' }}>
                                            Balance Breakdown
                                        </Typography>
                                        <Table size="small">
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell style={{ fontWeight: 600, color: '#555', border: 'none' }}>
                                                        Previous Balance (Opening)
                                                    </TableCell>
                                                    <TableCell style={{ fontWeight: 500, border: 'none', textAlign: 'right' }}>
                                                        {this.formatAmt(a.opening_balance)} ({a.opening_balance_type || 'DEBIT'})
                                                    </TableCell>
                                                </TableRow>
                                                {isSundryDebtors && a.pending_fees_config && a.auto_pending_amount !== undefined && (
                                                    <TableRow>
                                                        <TableCell style={{ fontWeight: 600, color: '#1565c0', border: 'none' }}>
                                                            Current FY Auto-Pending
                                                        </TableCell>
                                                        <TableCell style={{ fontWeight: 500, color: '#1565c0', border: 'none', textAlign: 'right' }}>
                                                            {this.formatAmt(a.auto_pending_amount)}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                                <TableRow>
                                                    <TableCell style={{ fontWeight: 700, color: '#333', borderTop: '2px solid #ccc' }}>
                                                        Net Outstanding (Closing)
                                                    </TableCell>
                                                    <TableCell style={{ fontWeight: 700, color: '#333', borderTop: '2px solid #ccc', textAlign: 'right' }}>
                                                        {this.formatAmt(a.closing_balance)}
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </Box>
                                </DialogContent>
                                <DialogActions>
                                    <Button onClick={() => this.setState({ viewAsset: null })} color="primary">Close</Button>
                                </DialogActions>
                            </>
                        )
                    })()}
                </Dialog>

                {/* ── Asset Actions Menu ── */}
                <Menu
                    anchorEl={this.state.anchorEl}
                    keepMounted
                    open={Boolean(this.state.anchorEl)}
                    onClose={this.handleMenuClose}
                    getContentAnchorEl={null}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <MenuItem onClick={() => { this.setState({ viewAsset: this.state.selectedAsset }); this.handleMenuClose(); }}>
                        <VisibilityIcon fontSize="small" style={{ marginRight: 8, color: '#1565c0' }} />
                        View Details
                    </MenuItem>
                    <MenuItem
                        onClick={this.handleEditAsset}
                        disabled={fyLocked}
                    >
                        <EditIcon fontSize="small" style={{ marginRight: 8, color: fyLocked ? '#ccc' : '#2e7d32' }} />
                        Edit
                    </MenuItem>
                    <MenuItem
                        onClick={this.handleDeleteAsset}
                        disabled={fyLocked}
                    >
                        <DeleteIcon fontSize="small" style={{ marginRight: 8, color: fyLocked ? '#ccc' : '#c62828' }} />
                        Delete
                    </MenuItem>
                </Menu>
            </Box>
        )
    }
}

export default withRouter(RecoverableAssetRegister)
