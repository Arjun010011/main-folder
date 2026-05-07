import React, { Component } from 'react'
import {
    Paper, Box, Grid, Button, TextField, MenuItem,
    Table, TableHead, TableRow, TableCell, TableBody,
    Typography, CircularProgress, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@material-ui/core'
import GetAppIcon from '@material-ui/icons/GetApp'
import PrintIcon from '@material-ui/icons/Print'
import RefreshIcon from '@material-ui/icons/Refresh'
import LockIcon from '@material-ui/icons/Lock'
import LockOpenIcon from '@material-ui/icons/LockOpen'
import HistoryIcon from '@material-ui/icons/History'
import classNames from 'classnames'
import InfiniteScroll from 'react-infinite-scroller'
import Swal from 'sweetalert2'
import { withRouter } from 'react-router-dom'

import { getRequest, postRequest } from 'Includes/api/apicall'
import { GET_URL, POST_URL } from 'Includes/urls'
import { numberWithCommas } from 'Includes/functions'
import LoadingGif from 'Components/LoadingGif'
import SummaryCard from './Components/SummaryCard'


const PAGE_SIZE = 30

class BalanceSheet extends Component {
    state = {
        financialYears: [],
        selectedFY: '',
        data: null,
        loading: true,
        tableUpdating: false,
        error: null,
        downloadingExcel: false,
        downloadingPdf: false,
        assetsDisplayCount: PAGE_SIZE,
        liabilitiesDisplayCount: PAGE_SIZE,
        // Lock state
        isLocked: false,
        locking: false,
        // Previous FY lock guard
        previousFyLocked: true,
        previousFyName: null,
        // History modal
        showHistoryModal: false,
        lockHistory: [],
        loadingHistory: false,
        historyPage: 1,
        historyHasMore: true,
        loadingHistoryMore: false,
    }

    componentDidMount() {
        this.loadFinancialYears()
    }

    loadFinancialYears = () => {
        getRequest(GET_URL.financialyear.api, { is_active: true }, this.props)
            .then(res => {
                if (res?.status !== 200) {
                    this.setState({ loading: false })
                    return
                }
                const list = res.data.data || []
                const today = new Date()
                const current = list.find(fy => {
                    const start = new Date(fy.start_date)
                    const end = new Date(fy.end_date)
                    return today >= start && today <= end
                })
                const selectedFY = current ? current.id : list[0]?.id || ''
                this.setState(
                    { financialYears: list, selectedFY, loading: false },
                    () => selectedFY && this.loadBalanceSheet()
                )
            })
            .catch(() => this.setState({ loading: false }))
    }

    loadBalanceSheet = () => {
        const { selectedFY } = this.state
        if (!selectedFY) return

        this.setState({ tableUpdating: true, error: null, assetsDisplayCount: PAGE_SIZE, liabilitiesDisplayCount: PAGE_SIZE })

        getRequest(GET_URL.balanceSheet.api, { financial_year_id: selectedFY }, this.props)
            .then(res => {
                if (res?.status === 200 && res.data?.data) {
                    const d = res.data.data
                    this.setState({
                        data: d,
                        isLocked: d.is_locked || false,
                        previousFyLocked: d.previous_fy_locked !== false,
                        previousFyName: d.previous_fy_name || null,
                        tableUpdating: false
                    })
                } else {
                    this.setState({ error: res?.data?.error || 'Failed to load balance sheet', tableUpdating: false })
                }
            })
            .catch(err => {
                this.setState({ error: err.message || 'Network error', tableUpdating: false })
            })
    }

    handleDownloadExcel = () => {
        const { selectedFY } = this.state
        if (!selectedFY) return
        this.setState({ downloadingExcel: true })

        getRequest(GET_URL.balanceSheet.api, { financial_year_id: selectedFY, download_excel: 'true' }, { responseType: 'blob' })
            .then(res => {
                this.setState({ downloadingExcel: false })
                if (res?.status === 200) {
                    const url = window.URL.createObjectURL(new Blob([res.data]))
                    const link = document.createElement('a')
                    link.href = url
                    link.setAttribute('download', `Balance_Sheet_${selectedFY}.xlsx`)
                    document.body.appendChild(link)
                    link.click()
                    link.remove()
                }
            })
            .catch(() => this.setState({ downloadingExcel: false }))
    }

    handleDownloadPdf = () => {
        const { selectedFY } = this.state
        if (!selectedFY) return
        this.setState({ downloadingPdf: true })

        getRequest(GET_URL.balanceSheet.api, { financial_year_id: selectedFY, download_pdf: 'true' }, { responseType: 'blob' })
            .then(res => {
                this.setState({ downloadingPdf: false })
                if (res?.status === 200) {
                    const blob = new Blob([res.data], { type: 'application/pdf' })
                    const fileURL = URL.createObjectURL(blob)
                    const height = (window.screen.height * 75) / 100
                    const width = (window.screen.width * 75) / 100
                    window.open(fileURL, 'PRINT', `height=${height},width=${width}`)
                }
            })
            .catch(() => this.setState({ downloadingPdf: false }))
    }

    // ━━━━━━━━━━━ Lock / Unlock ━━━━━━━━━━━
    handleLock = () => {
        Swal.fire({
            title: 'Lock Balance Sheet?',
            text: 'This will prevent further edits to balance sheet entries for this FY. You can unlock later.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Lock',
            confirmButtonColor: '#f44336',
        }).then(result => {
            if (result.value) {
                this.setState({ locking: true })
                postRequest(POST_URL.balanceSheet.api, {
                    action: 'lock',
                    financial_year_id: this.state.selectedFY
                }, { ...this.props, return_error: true }).then(res => {
                    this.setState({ locking: false })
                    if (res?.status === 200 && res.data?.success) {
                        this.setState({ isLocked: true })
                        const cfError = res.data?.carry_forward_error
                        if (cfError) {
                            Swal.fire({
                                icon: 'warning',
                                title: 'Balance Sheet Locked, but Carry-Forward Issue',
                                html: `<p>Balance sheet locked successfully.</p><hr/><p style="color:#e65100"><b>Carry-forward warning:</b> ${cfError}</p><p>You may need to manually trigger carry-forward after resolving this.</p>`,
                                confirmButtonColor: '#ff9800',
                            })
                        } else {
                            this.showPendingFeesPrompt()
                        }
                    } else {
                        const errorMsg = res?.data?.error || 'Lock failed'
                        const details = res?.data?.details || []
                        const hasDepreciationError = details.some(d => String(d).match(/depreciation is not locked/i))

                        if (hasDepreciationError) {
                            Swal.fire({
                                icon: 'warning',
                                title: 'Depreciation Not Run',
                                text: 'Asset depreciation has not been run or locked for this financial year. Would you like to run it now?',
                                showCancelButton: true,
                                confirmButtonText: 'Run Depreciation',
                                cancelButtonText: 'Cancel',
                                confirmButtonColor: '#ff9800',
                            }).then(depRes => {
                                if (depRes.value) {
                                    this.props.history.push('/finance/depreciation')
                                }
                            })
                        } else if (details.some(d => String(d).match(/closing balance|bank.*carry.?forward/i))) {
                            Swal.fire({
                                icon: 'warning',
                                title: 'Bank Carry-Forward Required',
                                text: 'One or more banks do not have closing balances. Please run bank carry-forward first.',
                                showCancelButton: true,
                                confirmButtonText: 'Run Bank Carry-Forward',
                                cancelButtonText: 'Cancel',
                                confirmButtonColor: '#ff9800',
                            }).then(bankRes => {
                                if (bankRes.value) {
                                    this.props.history.push('/finance/bank/carry-forward')
                                }
                            })
                        } else {
                            Swal.fire({ icon: 'error', title: 'Error', html: `<b>${errorMsg}</b><br/>${details.join('<br/>')}` })
                        }
                    }
                }).catch(() => this.setState({ locking: false }))
            }
        })
    }

    showPendingFeesPrompt = () => {
        const { selectedFY, financialYears } = this.state
        const currentFY = financialYears.find(f => f.id === selectedFY)
        const fyLabel = currentFY ? (currentFY.name || `${currentFY.start_date} - ${currentFY.end_date}`) : ''

        Swal.fire({
            icon: 'success',
            title: 'Balance Sheet Locked!',
            html: `<p>Balance sheet for <strong>${fyLabel}</strong> has been locked successfully.</p>`,
            showConfirmButton: true,
            confirmButtonColor: '#1565c0',
            confirmButtonText: 'OK'
        })
    }


    handleUnlock = () => {
        Swal.fire({
            title: 'Unlock Balance Sheet?',
            text: 'Please provide a reason for unlocking.',
            input: 'textarea',
            inputLabel: 'Remarks',
            inputValidator: val => { if (!val) return 'Remarks are required' },
            showCancelButton: true,
            confirmButtonText: 'Unlock',
        }).then(result => {
            if (result.value) {
                this.setState({ locking: true })
                postRequest(POST_URL.balanceSheet.api, {
                    action: 'unlock',
                    financial_year_id: this.state.selectedFY,
                    remarks: result.value
                }, this.props).then(res => {
                    this.setState({ locking: false })
                    if (res?.status === 200 && res.data?.success) {
                        this.setState({ isLocked: false })
                        Swal.fire({ icon: 'success', title: 'Balance sheet unlocked', timer: 1500, showConfirmButton: false })
                    } else {
                        Swal.fire({ icon: 'error', title: 'Error', text: res?.data?.error || 'Unlock failed' })
                    }
                }).catch(() => this.setState({ locking: false }))
            }
        })
    }

    loadLockHistory = () => {
        this.setState({
            showHistoryModal: true,
            loadingHistory: true,
            lockHistory: [],
            historyPage: 1,
            historyHasMore: true,
        }, () => this.fetchLockHistory(1))
    }

    fetchLockHistory = (page, append = false) => {
        const { selectedFY, lockHistory } = this.state
        const limit = 10

        getRequest(GET_URL.balanceSheetLockHistory.api, {
            financial_year: selectedFY,
            limit,
            pageno: page
        }, this.props).then(res => {
            const newState = { loadingHistory: false, loadingHistoryMore: false }
            if (res?.status === 200 && res.data?.data) {
                const list = res.data.data.data_list || []
                const total = res.data.data.count || 0
                const newHistory = append ? [...lockHistory, ...list] : list
                newState.lockHistory = newHistory
                newState.historyHasMore = newHistory.length < total
                newState.historyPage = page
            }
            this.setState(newState)
        }).catch(() => {
            this.setState({ loadingHistory: false, loadingHistoryMore: false })
        })
    }

    loadMoreHistory = () => {
        if (this.state.loadingHistoryMore || !this.state.historyHasMore) return
        this.setState({ loadingHistoryMore: true })
        this.fetchLockHistory(this.state.historyPage + 1, true)
    }

    closeHistoryModal = () => {
        this.setState({ showHistoryModal: false, lockHistory: [] })
    }

    formatAmt = (val) => {
        if (val === null || val === undefined) return ''
        const num = parseFloat(val)
        if (isNaN(num) || num === 0) return ''
        return `${numberWithCommas(num.toFixed(2))}`
    }

    splitDebitCredit = (val, isLiability) => {
        const v = parseFloat(val) || 0
        if (v === 0) return { debit: 0, credit: 0 }
        if (isLiability) {
            return v < 0 ? { debit: Math.abs(v), credit: 0 } : { debit: 0, credit: v }
        } else {
            return v > 0 ? { debit: v, credit: 0 } : { debit: 0, credit: Math.abs(v) }
        }
    }

    flattenSideData = (sideData, isLiability = false) => {
        if (!sideData || !sideData.groups) return []
        const rows = []
        const split = (val) => this.splitDebitCredit(val, isLiability)

        const addItemRows = (items, prefix, indent) => {
            items.forEach((item, ii) => {
                if ('opening_debit' in item || 'closing_debit' in item) {
                    rows.push({
                        type: 'item', name: item.name,
                        opDebit: parseFloat(item.opening_debit) || 0,
                        opCredit: parseFloat(item.opening_credit) || 0,
                        clDebit: parseFloat(item.closing_debit) || 0,
                        clCredit: parseFloat(item.closing_credit) || 0,
                        amount: parseFloat(item.amount) || 0,
                        indent, key: `${prefix}-i-${ii}`
                    })
                } else {
                    const opSplit = split(item.opening_balance)
                    const clSplit = split(item.closing_balance)
                    rows.push({
                        type: 'item', name: item.name,
                        opDebit: opSplit.debit, opCredit: opSplit.credit,
                        clDebit: clSplit.debit, clCredit: clSplit.credit,
                        amount: parseFloat(item.closing_balance) || 0,
                        indent, key: `${prefix}-i-${ii}`
                    })
                }
            })
        }

        sideData.groups.forEach((group, gi) => {
            const hasItems = group.items && group.items.length > 0
            const hasSubs = group.sub_groups && group.sub_groups.length > 0
            const hasData = hasItems || hasSubs || parseFloat(group.total) !== 0
            if (!hasData) return

            let gOpDebit, gOpCredit, gClDebit, gClCredit
            if ('total_opening_debit' in group) {
                gOpDebit = parseFloat(group.total_opening_debit) || 0
                gOpCredit = parseFloat(group.total_opening_credit) || 0
                gClDebit = parseFloat(group.total_closing_debit) || 0
                gClCredit = parseFloat(group.total_closing_credit) || 0
            } else {
                const gOpSplit = split(group.opening_total)
                const gClSplit = split(group.total)
                gOpDebit = gOpSplit.debit; gOpCredit = gOpSplit.credit
                gClDebit = gClSplit.debit; gClCredit = gClSplit.credit
            }

            rows.push({
                type: 'group', group_name: group.group_name,
                opDebit: gOpDebit, opCredit: gOpCredit,
                clDebit: gClDebit, clCredit: gClCredit,
                total: Math.abs(parseFloat(group.total) || 0), key: `g-${gi}`
            })

            if (group.sub_groups) {
                group.sub_groups.forEach((sg, si) => {
                    const sgHasItems = sg.items && sg.items.length > 0
                    const sgHasSubs = sg.sub_groups && sg.sub_groups.length > 0
                    if (!sgHasItems && !sgHasSubs && parseFloat(sg.total) === 0) return

                    const sgOpSplit = split(sg.opening_total)
                    const sgClSplit = split(sg.total)
                    rows.push({
                        type: 'subgroup', group_name: sg.group_name,
                        opDebit: sgOpSplit.debit, opCredit: sgOpSplit.credit,
                        clDebit: sgClSplit.debit, clCredit: sgClSplit.credit,
                        total: sg.total, key: `g-${gi}-sg-${si}`
                    })

                    if (sg.items) addItemRows(sg.items, `g-${gi}-sg-${si}`, 2)

                    if (sg.sub_groups) {
                        sg.sub_groups.forEach((nsg, nsi) => {
                            if (!nsg.items?.length && parseFloat(nsg.total) === 0) return
                            const nsgOpSplit = split(nsg.opening_total)
                            const nsgClSplit = split(nsg.total)
                            rows.push({
                                type: 'nested_subgroup', group_name: nsg.group_name,
                                opDebit: nsgOpSplit.debit, opCredit: nsgOpSplit.credit,
                                clDebit: nsgClSplit.debit, clCredit: nsgClSplit.credit,
                                total: nsg.total, key: `g-${gi}-sg-${si}-nsg-${nsi}`
                            })
                            if (nsg.items) addItemRows(nsg.items, `g-${gi}-sg-${si}-nsg-${nsi}`, 3)
                        })
                    }
                })
            }

            if (group.items) addItemRows(group.items, `g-${gi}`, 1)
        })

        let totOpDebit = 0, totOpCredit = 0, totClDebit = 0, totClCredit = 0
        let hasExplicit = false
        sideData.groups.forEach(g => {
            if ('total_opening_debit' in g) {
                hasExplicit = true
                totOpDebit += parseFloat(g.total_opening_debit) || 0
                totOpCredit += parseFloat(g.total_opening_credit) || 0
                totClDebit += parseFloat(g.total_closing_debit) || 0
                totClCredit += parseFloat(g.total_closing_credit) || 0
            } else {
                const opS = split(g.opening_total || 0)
                const clS = split(g.total || 0)
                totOpDebit += opS.debit; totOpCredit += opS.credit
                totClDebit += clS.debit; totClCredit += clS.credit
            }
        })
        rows.push({
            type: 'grand_total', title: sideData.title,
            opDebit: totOpDebit, opCredit: totOpCredit,
            clDebit: totClDebit, clCredit: totClCredit,
            total: Math.abs(parseFloat(sideData.total) || 0), key: 'grand-total'
        })
        return rows
    }


    loadMoreAssets = () => {
        this.setState(prev => ({ assetsDisplayCount: prev.assetsDisplayCount + PAGE_SIZE }))
    }

    loadMoreLiabilities = () => {
        this.setState(prev => ({ liabilitiesDisplayCount: prev.liabilitiesDisplayCount + PAGE_SIZE }))
    }

    renderRow = (row) => {
        const fmtAmt = this.formatAmt
        const amtCell = { textAlign: 'right', fontSize: '0.82rem', padding: '4px 8px', whiteSpace: 'nowrap' }
        const nameCell = { padding: '4px 8px', fontSize: '0.85rem' }

        switch (row.type) {
            case 'group':
                return (
                    <TableRow key={row.key} style={{ backgroundColor: '#e3f2fd' }}>
                        <TableCell style={{ ...nameCell, fontWeight: 'bold' }}>{row.group_name}</TableCell>
                        <TableCell style={amtCell}><strong>{fmtAmt(row.opDebit)}</strong></TableCell>
                        <TableCell style={amtCell}><strong>{fmtAmt(row.opCredit)}</strong></TableCell>
                        <TableCell style={amtCell}><strong>{fmtAmt(row.clDebit)}</strong></TableCell>
                        <TableCell style={amtCell}><strong>{fmtAmt(row.clCredit)}</strong></TableCell>
                        <TableCell style={amtCell}><strong>{fmtAmt(row.total)}</strong></TableCell>
                    </TableRow>
                )
            case 'item': {
                const indent = (row.indent || 1) * 20
                return (
                    <TableRow key={row.key}>
                        <TableCell style={{ ...nameCell, paddingLeft: indent }}>{row.name}</TableCell>
                        <TableCell style={amtCell}>{fmtAmt(row.opDebit)}</TableCell>
                        <TableCell style={amtCell}>{fmtAmt(row.opCredit)}</TableCell>
                        <TableCell style={amtCell}>{fmtAmt(row.clDebit)}</TableCell>
                        <TableCell style={amtCell}>{fmtAmt(row.clCredit)}</TableCell>
                        <TableCell style={amtCell}>{fmtAmt(row.amount)}</TableCell>
                    </TableRow>
                )
            }
            case 'subgroup':
                return (
                    <TableRow key={row.key}>
                        <TableCell style={{ ...nameCell, paddingLeft: 16, fontWeight: 'bold', color: '#1565c0' }}>{row.group_name}</TableCell>
                        <TableCell style={amtCell}><strong style={{ color: '#1565c0' }}>{fmtAmt(row.opDebit)}</strong></TableCell>
                        <TableCell style={amtCell}><strong style={{ color: '#1565c0' }}>{fmtAmt(row.opCredit)}</strong></TableCell>
                        <TableCell style={amtCell}><strong style={{ color: '#1565c0' }}>{fmtAmt(row.clDebit)}</strong></TableCell>
                        <TableCell style={amtCell}><strong style={{ color: '#1565c0' }}>{fmtAmt(row.clCredit)}</strong></TableCell>
                        <TableCell style={amtCell}><strong style={{ color: '#1565c0' }}>{fmtAmt(row.total)}</strong></TableCell>
                    </TableRow>
                )
            case 'nested_subgroup':
                return (
                    <TableRow key={row.key}>
                        <TableCell style={{ ...nameCell, paddingLeft: 32, fontWeight: 'bold', color: '#2196f3', fontSize: '0.8rem' }}>{row.group_name}</TableCell>
                        <TableCell style={{ ...amtCell, color: '#2196f3', fontSize: '0.8rem' }}><strong>{fmtAmt(row.opDebit)}</strong></TableCell>
                        <TableCell style={{ ...amtCell, color: '#2196f3', fontSize: '0.8rem' }}><strong>{fmtAmt(row.opCredit)}</strong></TableCell>
                        <TableCell style={{ ...amtCell, color: '#2196f3', fontSize: '0.8rem' }}><strong>{fmtAmt(row.clDebit)}</strong></TableCell>
                        <TableCell style={{ ...amtCell, color: '#2196f3', fontSize: '0.8rem' }}><strong>{fmtAmt(row.clCredit)}</strong></TableCell>
                        <TableCell style={{ ...amtCell, color: '#2196f3', fontSize: '0.8rem' }}><strong>{fmtAmt(row.total)}</strong></TableCell>
                    </TableRow>
                )
            case 'grand_total':
                return (
                    <TableRow key={row.key} style={{ backgroundColor: '#1565c0' }}>
                        <TableCell style={{ ...nameCell, fontWeight: 'bold', color: '#fff' }}>TOTAL {(row.title || '').toUpperCase()}</TableCell>
                        <TableCell style={{ ...amtCell, fontWeight: 'bold', color: '#fff' }}>{fmtAmt(row.opDebit)}</TableCell>
                        <TableCell style={{ ...amtCell, fontWeight: 'bold', color: '#fff' }}>{fmtAmt(row.opCredit)}</TableCell>
                        <TableCell style={{ ...amtCell, fontWeight: 'bold', color: '#fff' }}>{fmtAmt(row.clDebit)}</TableCell>
                        <TableCell style={{ ...amtCell, fontWeight: 'bold', color: '#fff' }}>{fmtAmt(row.clCredit)}</TableCell>
                        <TableCell style={{ ...amtCell, fontWeight: 'bold', color: '#fff' }}>{fmtAmt(row.total)}</TableCell>
                    </TableRow>
                )
            default:
                return null
        }
    }

    renderSideTable = (sideData, displayCount, loadMore, scrollId, isLiability = false) => {
        if (!sideData) return null

        const allRows = this.flattenSideData(sideData, isLiability)
        const visibleRows = allRows.slice(0, displayCount)
        const hasMore = displayCount < allRows.length

        const hdrStyle = { textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', padding: '6px 8px', backgroundColor: '#1565c0', color: '#fff', borderRight: '1px solid rgba(255,255,255,0.3)' }
        const subHdrStyle = { ...hdrStyle, fontSize: '0.75rem', backgroundColor: '#1976d2' }

        return (
            <div
                id={scrollId}
                style={{ maxHeight: '75vh', overflowY: 'auto' }}
            >
                <InfiniteScroll
                    pageStart={0}
                    loadMore={loadMore}
                    hasMore={hasMore}
                    useWindow={false}
                    getScrollParent={() => document.getElementById(scrollId)}
                    threshold={150}
                    loader={
                        <Box key="loader" display="flex" justifyContent="center" p={2}>
                            <Typography color="textSecondary">Loading more...</Typography>
                        </Box>
                    }
                >
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell rowSpan={2} style={{ ...hdrStyle, textAlign: 'left', minWidth: 250 }}>{sideData.title}</TableCell>
                                <TableCell colSpan={2} style={hdrStyle}>Opening Balance</TableCell>
                                <TableCell colSpan={2} style={hdrStyle}>Closing Balance</TableCell>
                                <TableCell rowSpan={2} style={{ ...hdrStyle, borderRight: 'none' }}>Amount</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell style={subHdrStyle}>Debit</TableCell>
                                <TableCell style={subHdrStyle}>Credit</TableCell>
                                <TableCell style={subHdrStyle}>Debit</TableCell>
                                <TableCell style={{ ...subHdrStyle, borderRight: 'none' }}>Credit</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {visibleRows.map(row => this.renderRow(row))}
                        </TableBody>
                    </Table>
                </InfiniteScroll>
            </div>
        )
    }

    renderHistoryModal = () => {
        const { showHistoryModal, lockHistory, loadingHistory, historyHasMore, loadingHistoryMore } = this.state

        return (
            <Dialog open={showHistoryModal} onClose={this.closeHistoryModal} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">Balance Sheet Lock History</Typography>
                    </Box>
                </DialogTitle>
                <DialogContent style={{ padding: 0 }}>
                    <Box
                        id="bs-history-scroll"
                        style={{ height: '60vh', overflowY: 'auto', padding: '20px' }}
                    >
                        {loadingHistory ? (
                            <Box display="flex" justifyContent="center" p={3}>
                                <CircularProgress />
                            </Box>
                        ) : lockHistory.length === 0 ? (
                            <Typography color="textSecondary" align="center">
                                No lock history found for this financial year.
                            </Typography>
                        ) : (
                            <InfiniteScroll
                                pageStart={0}
                                loadMore={this.loadMoreHistory}
                                hasMore={historyHasMore && !loadingHistoryMore}
                                useWindow={false}
                                getScrollParent={() => document.getElementById('bs-history-scroll')}
                                threshold={100}
                                loader={
                                    <Box key="loader" display="flex" justifyContent="center" p={2}>
                                        <Typography color="textSecondary" variant="caption">Loading more history...</Typography>
                                    </Box>
                                }
                            >
                                <Table size="small" style={{ tableLayout: 'fixed' }}>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell style={{ width: '15%' }}>Action</TableCell>
                                            <TableCell style={{ width: '20%' }}>Performed By</TableCell>
                                            <TableCell style={{ width: '22%' }}>Date/Time</TableCell>
                                            <TableCell style={{ width: '10%' }}>Entries</TableCell>
                                            <TableCell style={{ width: '33%' }}>Remarks</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {lockHistory.map((entry, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={entry.action}
                                                        style={{
                                                            backgroundColor: entry.action === 'LOCKED' ? '#f50057' :
                                                                entry.action === 'UNLOCKED' ? '#4caf50' :
                                                                    entry.action === 'EDITED' ? '#2196f3' : '#9e9e9e',
                                                            color: 'white'
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>{entry.performed_by_name || 'Unknown'}</TableCell>
                                                <TableCell>
                                                    {new Date(entry.performed_on).toLocaleString()}
                                                </TableCell>
                                                <TableCell>{entry.entry_count}</TableCell>
                                                <TableCell>{entry.remarks || '–'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </InfiniteScroll>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={this.closeHistoryModal} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        )
    }

    render() {
        const {
            loading, tableUpdating, data, error, selectedFY, financialYears,
            downloadingExcel, downloadingPdf, assetsDisplayCount, liabilitiesDisplayCount,
            isLocked, locking, previousFyLocked, previousFyName
        } = this.state

        if (loading) return <LoadingGif />

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    {/* Header */}
                    <Grid container>
                        <Grid item md={6} xs={12} className="header-align">
                            <Box className="heading">Balance Sheet</Box>
                        </Grid>
                    </Grid>

                    {/* Controls */}
                    <Grid container spacing={3} style={{ padding: 20 }}>
                        <Grid item md={3} xs={12}>
                            <TextField
                                fullWidth
                                select
                                label="Financial Year"
                                value={selectedFY}
                                onChange={e => this.setState({ selectedFY: e.target.value }, this.loadBalanceSheet)}
                                variant="outlined"
                            >
                                {financialYears.map(fy => (
                                    <MenuItem key={fy.id} value={fy.id}>
                                        {fy.name || `${fy.start_date} - ${fy.end_date}`}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item md={9} xs={12}>
                            <Box display="flex" justifyContent="flex-end" alignItems="center" flexWrap="wrap">
                                <Button
                                    variant="outlined"
                                    onClick={this.loadBalanceSheet}
                                    style={{ marginRight: 10, borderRadius: 30, marginBottom: 5 }}
                                    disabled={tableUpdating}
                                >
                                    <RefreshIcon style={{ marginRight: 5 }} /> Refresh
                                </Button>

                                {data && !isLocked && (
                                    <Button
                                        variant="contained"
                                        style={{ backgroundColor: '#f44336', color: 'white', marginRight: 10, marginBottom: 5 }}
                                        onClick={this.handleLock}
                                        disabled={locking}
                                        startIcon={<LockIcon />}
                                    >
                                        Lock
                                    </Button>
                                )}

                                {data && isLocked && (
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        onClick={this.handleUnlock}
                                        disabled={locking}
                                        startIcon={<LockOpenIcon />}
                                        style={{ marginRight: 10, marginBottom: 5 }}
                                    >
                                        Unlock
                                    </Button>
                                )}

                                {selectedFY && (
                                    <Tooltip title="View Lock/Unlock History">
                                        <IconButton onClick={this.loadLockHistory} style={{ marginBottom: 5 }}>
                                            <HistoryIcon />
                                        </IconButton>
                                    </Tooltip>
                                )}

                                {isLocked && (
                                    <Chip
                                        label="Final – Locked"
                                        color="secondary"
                                        style={{ marginRight: 10, marginBottom: 5 }}
                                    />
                                )}

                                {data && !isLocked && (
                                    <Chip
                                        label="Editable"
                                        style={{ backgroundColor: '#4caf50', color: 'white', marginRight: 10, marginBottom: 5 }}
                                    />
                                )}

                                {data && (
                                    <>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={<PrintIcon />}
                                            onClick={this.handleDownloadPdf}
                                            disabled={downloadingPdf}
                                            style={{ marginRight: 10, marginBottom: 5 }}
                                        >
                                            {downloadingPdf ? 'Generating...' : 'Print PDF'}
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={<GetAppIcon />}
                                            onClick={this.handleDownloadExcel}
                                            disabled={downloadingExcel}
                                            style={{ marginBottom: 5 }}
                                        >
                                            {downloadingExcel ? 'Generating...' : 'Download Excel'}
                                        </Button>
                                    </>
                                )}
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Loading */}
                    {tableUpdating && (
                        <Box display="flex" justifyContent="center" p={3}>
                            <CircularProgress />
                        </Box>
                    )}

                    {/* Error */}
                    {error && !tableUpdating && (
                        <Box p={3} textAlign="center">
                            <Typography color="error">{error}</Typography>
                        </Box>
                    )}

                    {/* Previous FY Lock Guard */}
                    {data && !tableUpdating && !previousFyLocked && (
                        <Box p={3} textAlign="center" style={{
                            margin: '0 20px 20px',
                            backgroundColor: '#fafafa',
                            borderRadius: 4,
                            border: '1px dashed #bdbdbd',
                            padding: '40px 20px',
                        }}>
                            <LockIcon style={{ fontSize: 40, color: '#9e9e9e', marginBottom: 16 }} />
                            <Typography variant="h6" style={{ color: '#555', fontWeight: 500, marginBottom: 8 }}>
                                Previous Year Balance Sheet Not Locked
                            </Typography>
                            <Typography variant="body1" style={{ color: '#666', marginBottom: 8 }}>
                                Please lock the balance sheet for <strong>{previousFyName || 'previous financial year'}</strong> before viewing this year's balance sheet.
                            </Typography>
                            <Typography variant="body2" style={{ color: '#9e9e9e' }}>
                                The previous year must be finalized before the current year's balance sheet can be shown.
                            </Typography>
                        </Box>
                    )}

                    {/* Balance Sheet Content */}
                    {data && !tableUpdating && previousFyLocked && (
                        <>
                            {/* Summary Cards */}
                            <Grid container spacing={2} style={{ padding: '0 20px 20px 20px' }}>
                                <Grid item xs={12} sm={6} md>
                                    <SummaryCard
                                        label="TOTAL ASSETS"
                                        value={numberWithCommas(parseFloat(data.total_assets || 0).toFixed(2))}
                                        color="#1565c0"
                                        bgColor="#e3f2fd"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md>
                                    <SummaryCard
                                        label="TOTAL LIABILITIES"
                                        value={numberWithCommas(parseFloat(data.total_liabilities || 0).toFixed(2))}
                                        color="#6a1b9a"
                                        bgColor="#f3e5f5"
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md>
                                    <SummaryCard
                                        label={data.is_balanced ? 'STATUS' : 'DIFFERENCE'}
                                        value={data.is_balanced ? 'Balanced ✓' : `${numberWithCommas(parseFloat(data.difference || 0).toFixed(2))}`}
                                        color={data.is_balanced ? '#2e7d32' : '#c62828'}
                                        bgColor={data.is_balanced ? '#f1f8e9' : '#ffebee'}
                                    />
                                </Grid>
                            </Grid>

                            {/* Date info */}
                            <Box px={3} pb={1}>
                                <Typography variant="body2" color="textSecondary">
                                    As on {data.as_of_date} &nbsp;|&nbsp; Financial Year: {data.financial_year_label}
                                </Typography>
                            </Box>

                            {/* Full-width vertical layout – Assets then Liabilities */}
                            <Box style={{ padding: '0 20px 20px 20px' }}>
                                <Paper variant="outlined" style={{ marginBottom: 20 }}>
                                    {this.renderSideTable(data.assets, assetsDisplayCount, this.loadMoreAssets, 'bs-scroll-assets', false)}
                                </Paper>
                                <Paper variant="outlined">
                                    {this.renderSideTable(data.liabilities, liabilitiesDisplayCount, this.loadMoreLiabilities, 'bs-scroll-liabilities', true)}
                                </Paper>
                            </Box>
                        </>
                    )}

                    {!data && !tableUpdating && !error && (
                        <Box p={3} textAlign="center">
                            <Typography color="textSecondary">
                                Select a Financial Year to generate the Balance Sheet.
                            </Typography>
                        </Box>
                    )}
                </Paper>

                {this.renderHistoryModal()}
            </Box>
        )
    }
}
export default withRouter(BalanceSheet)
