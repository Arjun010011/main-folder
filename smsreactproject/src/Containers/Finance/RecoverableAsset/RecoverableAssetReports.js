import React, { Component } from 'react'
import {
    Paper, Box, Grid, Button, TextField, MenuItem,
    Table, TableHead, TableRow, TableCell, TableBody,
    Typography, CircularProgress, Tab, Tabs
} from '@material-ui/core'
import GetAppIcon from '@material-ui/icons/GetApp'
import classNames from 'classnames'
import InfiniteScroll from 'react-infinite-scroller'

import { getRequest } from 'Includes/api/apicall'
import { GET_URL } from 'Includes/urls'
import { numberWithCommas } from 'Includes/functions'
import LoadingGif from 'Components/LoadingGif'
import SummaryCard from '../Components/SummaryCard'


const PAGE_SIZE = 10
const BASE_URL = process.env.REACT_APP_BASE

class RecoverableAssetReports extends Component {
    state = {
        tab: 0,
        categories: [],
        assets: [],
        loading: true,

        // Ledger
        ledgerCategoryId: '',
        ledgerAssets: [],
        selectedAssetId: '',
        ledgerData: null,
        ledgerLoading: false,
        ledgerDisplayCount: PAGE_SIZE,

        // Category Summary
        summaryData: null,
        summaryLoading: false,

        // Period
        fromDate: '',
        toDate: '',
        selectedCategoryId: '',
        periodData: null,
        periodLoading: false,
        periodDisplayCount: PAGE_SIZE,
    }

    componentDidMount() {
        this.loadCategories()
    }

    loadCategories = () => {
        getRequest(GET_URL.recoverableAssetCategory.api, { is_active: true }, this.props)
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

    loadAssets = (categoryId = null) => {
        const params = { is_active: true, limit: 10, pageno: 1 }
        if (categoryId) params.category = categoryId
        getRequest(GET_URL.recoverableAsset.api, params, this.props)
            .then(res => {
                if (res?.status === 200) {
                    const list = res.data.data?.data_list || res.data.data || []
                    // If loading for ledger tab's category filter, update ledgerAssets
                    if (categoryId !== null) {
                        this.setState({ ledgerAssets: list })
                    } else {
                        this.setState({ assets: list })
                    }
                }
            })
    }

    onLedgerCategoryChange = (categoryId) => {
        this.setState({ ledgerCategoryId: categoryId, selectedAssetId: '', ledgerData: null, ledgerAssets: [] })
        if (categoryId) {
            this.loadAssets(categoryId)
        } else {
            // If no category selected, load all assets
            const params = { is_active: true, limit: 10, pageno: 1 }
            getRequest(GET_URL.recoverableAsset.api, params, this.props)
                .then(res => {
                    if (res?.status === 200) {
                        this.setState({ ledgerAssets: res.data.data?.data_list || res.data.data || [] })
                    }
                })
        }
    }

    // ━━━ LEDGER ━━━
    loadLedger = () => {
        const { selectedAssetId } = this.state
        if (!selectedAssetId) return
        this.setState({ ledgerLoading: true, ledgerDisplayCount: PAGE_SIZE })
        getRequest(GET_URL.recoverableAssetReport.api, {
            report_type: 'ledger', asset_id: selectedAssetId
        }, this.props)
            .then(res => {
                if (res?.status === 200) {
                    this.setState({ ledgerData: res.data.data, ledgerLoading: false })
                } else {
                    this.setState({ ledgerLoading: false })
                }
            })
            .catch(() => this.setState({ ledgerLoading: false }))
    }

    downloadLedger = (format) => {
        const { selectedAssetId } = this.state
        if (!selectedAssetId) return
        window.open(
            `${BASE_URL}${GET_URL.recoverableAssetReport.api}?report_type=ledger&format=${format}&asset_id=${selectedAssetId}`,
            '_blank'
        )
    }

    // ━━━ CATEGORY SUMMARY ━━━
    loadSummary = () => {
        this.setState({ summaryLoading: true })
        getRequest(GET_URL.recoverableAssetReport.api, {
            report_type: 'category_summary'
        }, this.props)
            .then(res => {
                if (res?.status === 200) {
                    this.setState({ summaryData: res.data.data, summaryLoading: false })
                } else {
                    this.setState({ summaryLoading: false })
                }
            })
            .catch(() => this.setState({ summaryLoading: false }))
    }

    downloadSummary = (format) => {
        window.open(
            `${BASE_URL}${GET_URL.recoverableAssetReport.api}?report_type=category_summary&format=${format}`,
            '_blank'
        )
    }

    // ━━━ PERIOD ━━━
    loadPeriodReport = () => {
        const { fromDate, toDate, selectedCategoryId } = this.state
        if (!fromDate || !toDate) return
        this.setState({ periodLoading: true, periodDisplayCount: PAGE_SIZE })
        const params = { report_type: 'period', from_date: fromDate, to_date: toDate }
        if (selectedCategoryId) params.category_id = selectedCategoryId
        getRequest(GET_URL.recoverableAssetReport.api, params, this.props)
            .then(res => {
                if (res?.status === 200) {
                    this.setState({ periodData: res.data.data, periodLoading: false })
                } else {
                    this.setState({ periodLoading: false })
                }
            })
            .catch(() => this.setState({ periodLoading: false }))
    }

    downloadPeriod = (format) => {
        const { fromDate, toDate, selectedCategoryId } = this.state
        if (!fromDate || !toDate) return
        let url = `${BASE_URL}${GET_URL.recoverableAssetReport.api}?report_type=period&format=${format}&from_date=${fromDate}&to_date=${toDate}`
        if (selectedCategoryId) url += `&category_id=${selectedCategoryId}`
        window.open(url, '_blank')
    }

    formatAmt = (val) => {
        if (val === null || val === undefined) return '–'
        const num = parseFloat(val)
        if (isNaN(num) || num === 0) return '–'
        return numberWithCommas(num.toFixed(2))
    }

    render() {
        const { tab, loading } = this.state

        if (loading) return <LoadingGif />

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className="header-align">
                            <Box className="heading">Reports</Box>
                        </Grid>
                    </Grid>

                    <Box px={3}>
                        <Tabs value={tab} onChange={(_, v) => this.setState({ tab: v })}
                            indicatorColor="primary" textColor="primary">
                            <Tab label="Asset Ledger" />
                            <Tab label="Category Summary" />
                            <Tab label="Period Report" />
                        </Tabs>
                    </Box>

                    <Box p={3}>
                        {tab === 0 && this.renderLedgerTab()}
                        {tab === 1 && this.renderSummaryTab()}
                        {tab === 2 && this.renderPeriodTab()}
                    </Box>
                </Paper>
            </Box>
        )
    }

    // ━━━ LEDGER TAB ━━━
    renderLedgerTab() {
        const { categories, ledgerCategoryId, ledgerAssets, selectedAssetId, ledgerData, ledgerLoading, ledgerDisplayCount } = this.state
        const txns = ledgerData?.transactions || []
        const hasMore = ledgerDisplayCount < txns.length
        const displayAssets = ledgerAssets.length > 0 ? ledgerAssets : []

        return (
            <Box>
                <Grid container spacing={2} alignItems="center">
                    <Grid item md={3} xs={12}>
                        <TextField fullWidth select label="Select Category" variant="outlined" value={ledgerCategoryId}
                            onChange={e => this.onLedgerCategoryChange(e.target.value)}>
                            <MenuItem value="">All Categories</MenuItem>
                            {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item md={4} xs={12}>
                        <TextField fullWidth select label="Select Asset" variant="outlined" value={selectedAssetId}
                            onChange={e => this.setState({ selectedAssetId: e.target.value }, this.loadLedger)}>
                            <MenuItem value="">Select an asset...</MenuItem>
                            {displayAssets.map(a => <MenuItem key={a.id} value={a.id}>{a.particulars || a.name}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item md={5} xs={12}>
                        <Box display="flex" justifyContent="flex-end">
                            <Button onClick={() => this.downloadLedger('excel')} startIcon={<GetAppIcon />}
                                variant="outlined" style={{ marginRight: 8, borderRadius: 30 }} disabled={!selectedAssetId}>
                                Excel
                            </Button>
                            <Button onClick={() => this.downloadLedger('pdf')} startIcon={<GetAppIcon />}
                                variant="outlined" color="secondary" style={{ borderRadius: 30 }} disabled={!selectedAssetId}>
                                PDF
                            </Button>
                        </Box>
                    </Grid>
                </Grid>

                {ledgerLoading && <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>}

                {ledgerData && !ledgerLoading && (
                    <Box mt={2}>
                        <Grid container spacing={2} style={{ marginBottom: 15 }}>
                            <Grid item xs={6} sm={3}>
                                <SummaryCard label="OPENING BAL." value={this.formatAmt(ledgerData.opening_balance)} color="#6a1b9a" bgColor="#f3e5f5" />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <SummaryCard label="CLOSING BAL." value={this.formatAmt(ledgerData.closing_balance)} color="#1565c0" bgColor="#e3f2fd" />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <SummaryCard label="TRANSACTIONS" value={txns.length} color="#2e7d32" bgColor="#e8f5e9" />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <SummaryCard label="CATEGORY" value={ledgerData.category} color="#e65100" bgColor="#fff3e0" />
                            </Grid>
                        </Grid>

                        {/* X of Y */}
                        <Box pb={1}>
                            <Typography variant="body2" color="textSecondary">
                                Showing <strong>{Math.min(ledgerDisplayCount, txns.length)}</strong> of <strong>{txns.length}</strong> transactions
                            </Typography>
                        </Box>

                        <div id="ledger-scroll" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                            <InfiniteScroll pageStart={0}
                                loadMore={() => this.setState(p => ({ ledgerDisplayCount: p.ledgerDisplayCount + PAGE_SIZE }))}
                                hasMore={hasMore}
                                useWindow={false}
                                getScrollParent={() => document.getElementById('ledger-scroll')}
                                threshold={150}
                            >
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell><strong>Date</strong></TableCell>
                                            <TableCell><strong>Type</strong></TableCell>
                                            <TableCell><strong>Remarks</strong></TableCell>
                                            <TableCell align="right"><strong>Debit (₹)</strong></TableCell>
                                            <TableCell align="right"><strong>Credit (₹)</strong></TableCell>
                                            <TableCell align="right"><strong>Balance (₹)</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {txns.slice(0, ledgerDisplayCount).map((txn, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell>{txn.date}</TableCell>
                                                <TableCell>{txn.type}</TableCell>
                                                <TableCell>{txn.remarks || '–'}</TableCell>
                                                <TableCell align="right" style={{ color: '#c62828' }}>{this.formatAmt(txn.debit)}</TableCell>
                                                <TableCell align="right" style={{ color: '#2e7d32' }}>{this.formatAmt(txn.credit)}</TableCell>
                                                <TableCell align="right"><strong>{this.formatAmt(txn.balance)}</strong></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </InfiniteScroll>
                        </div>

                        {/* Show More fallback */}
                        {hasMore && (
                            <Box display="flex" justifyContent="center" mt={2}>
                                <Button variant="outlined"
                                    onClick={() => this.setState(p => ({ ledgerDisplayCount: p.ledgerDisplayCount + PAGE_SIZE }))}
                                    style={{ borderRadius: 30 }}>
                                    Show More ({Math.min(ledgerDisplayCount, txns.length)} of {txns.length})
                                </Button>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        )
    }

    // ━━━ SUMMARY TAB ━━━
    renderSummaryTab() {
        const { summaryData, summaryLoading } = this.state

        return (
            <Box>
                <Grid container spacing={2} alignItems="center">
                    <Grid item md={4} xs={12}>
                        <Button variant="contained" color="primary" onClick={this.loadSummary}
                            disabled={summaryLoading} style={{ borderRadius: 30 }}>
                            {summaryLoading ? 'Loading...' : 'Generate Summary'}
                        </Button>
                    </Grid>
                    <Grid item md={8} xs={12}>
                        <Box display="flex" justifyContent="flex-end">
                            <Button onClick={() => this.downloadSummary('excel')} startIcon={<GetAppIcon />}
                                variant="outlined" style={{ marginRight: 8, borderRadius: 30 }} disabled={!summaryData}>
                                Excel
                            </Button>
                            <Button onClick={() => this.downloadSummary('pdf')} startIcon={<GetAppIcon />}
                                variant="outlined" color="secondary" style={{ borderRadius: 30 }} disabled={!summaryData}>
                                PDF
                            </Button>
                        </Box>
                    </Grid>
                </Grid>

                {summaryLoading && <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>}

                {summaryData && !summaryLoading && (
                    <Box mt={2}>
                        <Grid container spacing={2} style={{ marginBottom: 15 }}>
                            <Grid item xs={12} sm={4}>
                                <SummaryCard label="GRAND OPENING" value={this.formatAmt(summaryData.grand_total_opening)} color="#6a1b9a" bgColor="#f3e5f5" />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <SummaryCard label="GRAND CLOSING" value={this.formatAmt(summaryData.grand_total_closing)} color="#1565c0" bgColor="#e3f2fd" />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <SummaryCard label="NET MOVEMENT" value={this.formatAmt(summaryData.grand_net_movement)}
                                    color={parseFloat(summaryData.grand_net_movement) >= 0 ? '#2e7d32' : '#c62828'}
                                    bgColor={parseFloat(summaryData.grand_net_movement) >= 0 ? '#e8f5e9' : '#ffebee'} />
                            </Grid>
                        </Grid>

                        <Table size="small">
                            <TableHead>
                                <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                    <TableCell><strong>Category</strong></TableCell>
                                    <TableCell align="center"><strong>Assets</strong></TableCell>
                                    <TableCell align="right"><strong>Opening (₹)</strong></TableCell>
                                    <TableCell align="right"><strong>Closing (₹)</strong></TableCell>
                                    <TableCell align="right"><strong>Net Movement (₹)</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {summaryData.categories.map((cat, i) => (
                                    <TableRow key={i} hover>
                                        <TableCell><strong>{cat.category_name}</strong></TableCell>
                                        <TableCell align="center">{cat.asset_count}</TableCell>
                                        <TableCell align="right">{this.formatAmt(cat.total_opening)}</TableCell>
                                        <TableCell align="right">{this.formatAmt(cat.total_closing)}</TableCell>
                                        <TableCell align="right">{this.formatAmt(cat.net_movement)}</TableCell>
                                    </TableRow>
                                ))}
                                <TableRow style={{ borderTop: '2px solid #1F4E79' }}>
                                    <TableCell><strong>GRAND TOTAL</strong></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell align="right"><strong>{this.formatAmt(summaryData.grand_total_opening)}</strong></TableCell>
                                    <TableCell align="right"><strong>{this.formatAmt(summaryData.grand_total_closing)}</strong></TableCell>
                                    <TableCell align="right"><strong>{this.formatAmt(summaryData.grand_net_movement)}</strong></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Box>
        )
    }

    // ━━━ PERIOD TAB ━━━
    renderPeriodTab() {
        const { categories, fromDate, toDate, selectedCategoryId, periodData, periodLoading, periodDisplayCount } = this.state
        const txns = periodData?.transactions || []
        const hasMore = periodDisplayCount < txns.length

        return (
            <Box>
                <Grid container spacing={2} alignItems="center">
                    <Grid item md={3} xs={6}>
                        <TextField fullWidth label="From Date" variant="outlined" type="date" value={fromDate}
                            onChange={e => this.setState({ fromDate: e.target.value })}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item md={3} xs={6}>
                        <TextField fullWidth label="To Date" variant="outlined" type="date" value={toDate}
                            onChange={e => this.setState({ toDate: e.target.value })}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item md={3} xs={6}>
                        <TextField fullWidth select label="Category" variant="outlined" value={selectedCategoryId}
                            onChange={e => this.setState({ selectedCategoryId: e.target.value })}>
                            <MenuItem value="">All Categories</MenuItem>
                            {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </TextField>
                    </Grid>
                    <Grid item md={3} xs={6}>
                        <Box display="flex" justifyContent="flex-end">
                            <Button variant="contained" color="primary" onClick={this.loadPeriodReport}
                                disabled={periodLoading || !fromDate || !toDate} style={{ borderRadius: 30 }}>
                                Generate
                            </Button>
                        </Box>
                    </Grid>
                </Grid>

                {periodData && !periodLoading && (
                    <Box mt={1} mb={2}>
                        <Box display="flex" justifyContent="flex-end">
                            <Button onClick={() => this.downloadPeriod('excel')} startIcon={<GetAppIcon />}
                                variant="outlined" size="small" style={{ marginRight: 8, borderRadius: 30 }}>
                                Excel
                            </Button>
                            <Button onClick={() => this.downloadPeriod('pdf')} startIcon={<GetAppIcon />}
                                variant="outlined" size="small" color="secondary" style={{ borderRadius: 30 }}>
                                PDF
                            </Button>
                        </Box>
                    </Box>
                )}

                {periodLoading && <Box display="flex" justifyContent="center" p={3}><CircularProgress /></Box>}

                {periodData && !periodLoading && (
                    <Box mt={2}>
                        <Grid container spacing={2} style={{ marginBottom: 15 }}>
                            <Grid item xs={12} sm={4}>
                                <SummaryCard label="TOTAL DEBITS" value={this.formatAmt(periodData.total_debits)} color="#c62828" bgColor="#ffebee" />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <SummaryCard label="TOTAL CREDITS" value={this.formatAmt(periodData.total_credits)} color="#2e7d32" bgColor="#e8f5e9" />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <SummaryCard label="NET MOVEMENT" value={this.formatAmt(periodData.net_movement)}
                                    color={parseFloat(periodData.net_movement) >= 0 ? '#c62828' : '#2e7d32'}
                                    bgColor={parseFloat(periodData.net_movement) >= 0 ? '#ffebee' : '#e8f5e9'} />
                            </Grid>
                        </Grid>

                        {/* X of Y */}
                        <Box pb={1}>
                            <Typography variant="body2" color="textSecondary">
                                Showing <strong>{Math.min(periodDisplayCount, txns.length)}</strong> of <strong>{txns.length}</strong> transactions
                            </Typography>
                        </Box>

                        <div id="period-scroll" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                            <InfiniteScroll pageStart={0}
                                loadMore={() => this.setState(p => ({ periodDisplayCount: p.periodDisplayCount + PAGE_SIZE }))}
                                hasMore={hasMore}
                                useWindow={false}
                                getScrollParent={() => document.getElementById('period-scroll')}
                                threshold={150}
                            >
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell><strong>Date</strong></TableCell>
                                            <TableCell><strong>Asset</strong></TableCell>
                                            <TableCell><strong>Category</strong></TableCell>
                                            <TableCell><strong>Type</strong></TableCell>
                                            <TableCell align="right"><strong>Debit (₹)</strong></TableCell>
                                            <TableCell align="right"><strong>Credit (₹)</strong></TableCell>
                                            <TableCell><strong>Remarks</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {txns.slice(0, periodDisplayCount).map((txn, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell>{txn.date}</TableCell>
                                                <TableCell>{txn.asset_name}</TableCell>
                                                <TableCell>{txn.category}</TableCell>
                                                <TableCell>{txn.type}</TableCell>
                                                <TableCell align="right" style={{ color: '#c62828' }}>{this.formatAmt(txn.debit)}</TableCell>
                                                <TableCell align="right" style={{ color: '#2e7d32' }}>{this.formatAmt(txn.credit)}</TableCell>
                                                <TableCell>{txn.remarks || '–'}</TableCell>
                                            </TableRow>
                                        ))}
                                        {txns.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={7} align="center">
                                                    <Typography color="textSecondary">No transactions found for this period.</Typography>
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
                                <Button variant="outlined"
                                    onClick={() => this.setState(p => ({ periodDisplayCount: p.periodDisplayCount + PAGE_SIZE }))}
                                    style={{ borderRadius: 30 }}>
                                    Show More ({Math.min(periodDisplayCount, txns.length)} of {txns.length})
                                </Button>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        )
    }
}

export default RecoverableAssetReports
