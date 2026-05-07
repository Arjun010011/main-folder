import React, { Component } from 'react'
import {
    Paper, Box, Grid, Button, TextField, MenuItem,
    Table, TableHead, TableRow, TableCell, TableBody,
    Typography, CircularProgress, Chip
} from '@material-ui/core'
import AddIcon from '@material-ui/icons/Add'
import RefreshIcon from '@material-ui/icons/Refresh'
import classNames from 'classnames'
import InfiniteScroll from 'react-infinite-scroller'
import { withRouter } from 'react-router-dom'

import { getRequest } from 'Includes/api/apicall'
import { GET_URL } from 'Includes/urls'
import { numberWithCommas } from 'Includes/functions'
import LoadingGif from 'Components/LoadingGif'
import SummaryCard from '../Components/SummaryCard'


const PAGE_SIZE = 10

const TRANSACTION_TYPES = [
    { value: 'CREDIT', label: 'Credit', color: '#2e7d32' },
    { value: 'DEBIT', label: 'Debit', color: '#c62828' },
    { value: 'ADVANCE', label: 'Advance', color: '#e65100' },
    { value: 'RECOVERY', label: 'Recovery', color: '#1565c0' },
    { value: 'ADJUSTMENT', label: 'Adjustment', color: '#6a1b9a' },
    { value: 'INTEREST', label: 'Interest Charge', color: '#bf360c' },
    { value: 'PENALTY', label: 'Late Payment Penalty', color: '#d32f2f' },
    { value: 'REVERSAL', label: 'Reversal', color: '#455a64' },
]

class RecoverableAssetTransactions extends Component {
    state = {
        categories: [],
        assets: [],
        selectedCategory: '',
        selectedAsset: '',
        transactions: [],
        loading: true,
        tableLoading: false,
        pageno: 1,
        totalCount: 0,
        hasMore: false,
        totals: { debits: 0, credits: 0 },
        financialYearOptions: [],
        selectedFy: '',
    }

    componentDidMount() {
        this.loadFinancialYears()
    }

    loadFinancialYears = () => {
        getRequest(GET_URL.financialyear.api, { is_active: true }, this.props)
            .then(res => {
                if (res?.status === 200) {
                    const options = res.data.data || []
                    const today = new Date()
                    const currentFy = options.find(fy => {
                        const start = new Date(fy.start_date)
                        const end = new Date(fy.end_date)
                        return today >= start && today <= end
                    })
                    const currentFyId = currentFy ? currentFy.id : (options[0]?.id || '')
                    this.setState({
                        financialYearOptions: options,
                        selectedFy: currentFyId,
                        loading: false
                    }, () => this.loadCategories())
                } else {
                    this.setState({ loading: false })
                    this.loadCategories()
                }
            })
            .catch(() => {
                this.setState({ loading: false })
                this.loadCategories()
            })
    }

    handleFyChange = (e) => {
        this.setState({ 
            selectedFy: e.target.value,
            selectedCategory: '',
            selectedAsset: '',
            categories: [],
            assets: []
        }, () => {
            this.loadCategories()
            this.loadTransactions()
        })
    }

    getSelectedFyDates = () => {
        const { financialYearOptions, selectedFy } = this.state
        const fy = financialYearOptions.find(f => String(f.id) === String(selectedFy))
        if (fy) return { start_date: fy.start_date, end_date: fy.end_date }
        return {}
    }

    isFyLocked = () => {
        const { financialYearOptions, selectedFy } = this.state
        if (selectedFy) {
            const fy = financialYearOptions.find(f => String(f.id) === String(selectedFy))
            return fy && fy.is_locked
        }
        return false
    }

    loadCategories = () => {
        const params = { is_active: true }
        if (this.state.selectedFy) {
            params.financial_year = this.state.selectedFy
        }
        getRequest(GET_URL.recoverableAssetCategory.api, params, this.props)
            .then(res => {
                if (res?.status === 200) {
                    this.setState({ categories: res.data.data || [], loading: false })
                    this.loadAssets()
                } else {
                    this.setState({ loading: false })
                }
            })
            .catch(() => this.setState({ loading: false }))
    }

    loadAssets = () => {
        const params = { is_active: true, limit: 1000, pageno: 1 }
        const { selectedCategory, selectedFy } = this.state
        if (selectedCategory) {
            // Filter by category ID — works for all categories including Sundry Debtors
            params.category = selectedCategory
        } else if (selectedFy) {
            params.financial_year = selectedFy
        }
        getRequest(GET_URL.recoverableAsset.api, params, this.props)
            .then(res => {
                if (res?.status === 200) {
                    this.setState({ assets: res.data.data?.data_list || res.data.data || [] })
                }
            })
    }

    loadTransactions = (loadMore = false) => {
        if (!loadMore) {
            this.setState({ tableLoading: true, pageno: 1, transactions: [], totalCount: 0, totals: { debits: 0, credits: 0 } })
        }
        const pageno = loadMore ? this.state.pageno : 1
        const params = { is_active: true, limit: PAGE_SIZE, pageno }
        const { selectedAsset, selectedCategory } = this.state

        if (selectedAsset) {
            params.recoverable_asset = selectedAsset
        } else if (selectedCategory) {
            params.category = selectedCategory
        }

        // Add FY date range filter
        const fyDates = this.getSelectedFyDates()
        if (fyDates.start_date) params.start_date = fyDates.start_date
        if (fyDates.end_date) params.end_date = fyDates.end_date

        getRequest(GET_URL.recoverableAssetTransaction.api, params, this.props)
            .then(res => {
                if (res?.status === 200) {
                    const resData = res.data.data
                    const pageData = resData?.data_list || resData || []
                    const count = resData?.count || pageData.length

                    this.setState(prev => {
                        const allTxns = loadMore ? [...prev.transactions, ...pageData] : pageData
                        let debits = 0, credits = 0
                        allTxns.forEach(t => {
                            const amt = parseFloat(t.amount || 0)
                            if (['DEBIT', 'ADVANCE', 'INTEREST', 'PENALTY'].includes(t.transaction_type)) debits += amt
                            else credits += amt
                        })
                        return {
                            transactions: allTxns,
                            totalCount: count,
                            hasMore: allTxns.length < count,
                            pageno: pageno + 1,
                            tableLoading: false,
                            totals: { debits, credits },
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
            this.loadTransactions(true)
        }
    }

    handleAddClick = () => {
        this.props.history.push('/finance/recoverable-assets/transactions/add')
    }

    formatAmt = (val) => {
        const num = parseFloat(val)
        if (isNaN(num) || num === 0) return '–'
        return numberWithCommas(num.toFixed(2))
    }

    isDebitType = (type) => ['DEBIT', 'ADVANCE', 'INTEREST', 'PENALTY'].includes(type)

    render() {
        const { categories, assets, selectedCategory, selectedAsset, transactions,
            loading, tableLoading, hasMore, totalCount, totals } = this.state

        if (loading) return <LoadingGif />

        // Check if the currently selected category is linked to the system (e.g., Cash, Bank, Debtors)
        const currentCategory = categories.find(c => String(c.id) === selectedCategory);
        const fyLocked = this.isFyLocked();
        // We hide the Add Transaction button if the category is linked system, or if an asset is selected that belongs to a linked system category
        const showAddButton = !currentCategory?.is_linked_system && !fyLocked;

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className="header-align">
                            <Box className="heading">Transactions</Box>
                        </Grid>
                    </Grid>

                    {/* Filters */}
                    <Grid container spacing={3} style={{ padding: 20 }}>
                        <Grid item md={4} xs={12}>
                            <TextField
                                fullWidth select label="Financial Year"
                                value={this.state.selectedFy}
                                onChange={this.handleFyChange}
                                variant="outlined"
                                size="small"
                            >
                                {this.state.financialYearOptions.map(fy => (
                                    <MenuItem key={fy.id} value={fy.id}>
                                        {fy.name || `${fy.start_date} - ${fy.end_date}`}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <Box display="flex" justifyContent="flex-start" alignItems="center" mt={2}>
                                <Button variant="outlined" onClick={() => this.loadTransactions()}
                                    style={{ marginRight: 10, borderRadius: 30 }} disabled={tableLoading}>
                                    <RefreshIcon style={{ marginRight: 5 }} /> Refresh
                                </Button>
                                {showAddButton && (
                                    <Button variant="contained" color="primary" startIcon={<AddIcon />}
                                        onClick={this.handleAddClick}>
                                        Add Transaction
                                    </Button>
                                )}
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12}>
                            <TextField fullWidth select label="Category" variant="outlined" value={selectedCategory}
                                onChange={e => this.setState({ selectedCategory: e.target.value, selectedAsset: '' }, () => { this.loadAssets(); this.loadTransactions() })}
                            >
                                <MenuItem value="">All Categories</MenuItem>
                                {categories.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item md={4} xs={12}>
                            <TextField fullWidth select label="Asset" variant="outlined" value={selectedAsset}
                                onChange={e => this.setState({ selectedAsset: e.target.value }, () => this.loadTransactions())}
                            >
                                <MenuItem value="">All Assets</MenuItem>
                                {assets.map(a => <MenuItem key={a.id} value={String(a.id)}>{a.particulars || a.name}</MenuItem>)}
                            </TextField>
                        </Grid>
                    </Grid>

                    {/* Summary */}
                    <Grid container spacing={2} style={{ padding: '0 20px 20px 20px' }}>
                        <Grid item xs={12} sm={4}>
                            <SummaryCard label="TOTAL DEBITS" value={this.formatAmt(totals.debits)} color="#c62828" bgColor="#ffebee" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <SummaryCard label="TOTAL CREDITS" value={this.formatAmt(totals.credits)} color="#2e7d32" bgColor="#e8f5e9" />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <SummaryCard label="NET MOVEMENT" value={this.formatAmt(totals.debits - totals.credits)}
                                color={totals.debits >= totals.credits ? '#c62828' : '#2e7d32'}
                                bgColor={totals.debits >= totals.credits ? '#ffebee' : '#e8f5e9'} />
                        </Grid>
                    </Grid>

                    {/* X of Y indicator */}
                    <Box px={3} pb={1} display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="textSecondary">
                            Showing <strong>{transactions.length}</strong> of <strong>{totalCount}</strong> transactions
                        </Typography>
                        {tableLoading && <CircularProgress size={20} />}
                    </Box>

                    {/* Table */}
                    <Box px={3} pb={3}>
                        <div id="ra-txn-scroll" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                            <InfiniteScroll
                                pageStart={0} loadMore={this.loadMore} hasMore={hasMore && !tableLoading}
                                useWindow={false}
                                getScrollParent={() => document.getElementById('ra-txn-scroll')}
                                threshold={150}
                            >
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell><strong>Date</strong></TableCell>
                                            <TableCell><strong>Asset</strong></TableCell>
                                            <TableCell><strong>Type</strong></TableCell>
                                            <TableCell align="right"><strong>Debit</strong></TableCell>
                                            <TableCell align="right"><strong>Credit</strong></TableCell>
                                            <TableCell><strong>Remarks</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {transactions.map(txn => {
                                            const isDebit = this.isDebitType(txn.transaction_type)
                                            const typeInfo = TRANSACTION_TYPES.find(t => t.value === txn.transaction_type) || {}
                                            return (
                                                <TableRow key={txn.id} hover>
                                                    <TableCell>{txn.transaction_date}</TableCell>
                                                    <TableCell>{txn.recoverable_asset_name || txn.recoverable_asset}</TableCell>
                                                    <TableCell>
                                                        <Chip label={typeInfo.label || txn.transaction_type} size="small"
                                                            style={{ backgroundColor: typeInfo.color, color: 'white', fontSize: '0.75rem' }} />
                                                    </TableCell>
                                                    <TableCell align="right" style={{ color: '#c62828', fontWeight: isDebit ? 'bold' : 'normal' }}>
                                                        {isDebit ? this.formatAmt(txn.amount) : '–'}
                                                    </TableCell>
                                                    <TableCell align="right" style={{ color: '#2e7d32', fontWeight: !isDebit ? 'bold' : 'normal' }}>
                                                        {!isDebit ? this.formatAmt(txn.amount) : '–'}
                                                    </TableCell>
                                                    <TableCell>{txn.remarks || '–'}</TableCell>
                                                </TableRow>
                                            )
                                        })}
                                        {transactions.length === 0 && !tableLoading && (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center">
                                                    <Typography color="textSecondary">No transactions found. Select an asset or category to view transactions.</Typography>
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
                                    Show More ({transactions.length} of {totalCount})
                                </Button>
                            </Box>
                        )}
                    </Box>
                </Paper>
            </Box>
        )
    }
}

export default withRouter(RecoverableAssetTransactions)
