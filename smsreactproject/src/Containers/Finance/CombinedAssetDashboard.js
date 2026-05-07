import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
    Paper, Box, Grid, Typography,
    Table, TableHead, TableRow, TableCell, TableBody,
    Divider, Chip, Button, Tooltip,
    Select, MenuItem, FormControl
} from '@material-ui/core'
import { Link, withRouter } from 'react-router-dom'
import Skeleton from '@material-ui/lab/Skeleton'
import AccountBalanceWalletIcon from '@material-ui/icons/AccountBalanceWallet'
import TrendingDownIcon from '@material-ui/icons/TrendingDown'
import CheckCircleIcon from '@material-ui/icons/CheckCircle'
import WarningIcon from '@material-ui/icons/Warning'
import AccountBalanceIcon from '@material-ui/icons/AccountBalance'
import AssessmentIcon from '@material-ui/icons/Assessment'
import DeleteForeverIcon from '@material-ui/icons/DeleteForever'
import RefreshIcon from '@material-ui/icons/Refresh'
import classNames from 'classnames'

import { getRequest } from 'Includes/api/apicall'
import { GET_URL } from 'Includes/urls'
import { numberWithCommas } from 'Includes/functions'
import { Actions } from 'Constants/permissions'
import '../General/styles.scss'
import './CombinedAssetDashboard.scss'

const typeColorMap = {
    'LOAN': 'secondary',
    'ADVANCE': 'default',
    'DEPOSIT': 'default',
    'STAFF_SALARY_ADVANCE': 'primary',
}

/* ── Summary Card (Paper style matching /dashboard) ─────────────────── */
const SummaryCard = ({ label, value, subtitle, icon, colorClass, onClick }) => (
    <Paper elevation={6} className="cad-summary-card" onClick={onClick}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <div className="cad-card-label">{label}</div>
                <div className={`cad-card-value ${colorClass || ''}`}>{value}</div>
                {subtitle && (
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2, fontStyle: 'italic' }}>{subtitle}</div>
                )}
            </div>
            <div className="cad-card-icon">
                {React.cloneElement(icon, { style: { fontSize: 40 } })}
            </div>
        </div>
    </Paper>
)

/* ── Main Component ─────────────────────────────────────────────────── */
const CombinedAssetDashboard = (props) => {
    const [loadingRecov, setLoadingRecov] = useState(true)
    const [loadingFixed, setLoadingFixed] = useState(true)
    const [recovError, setRecovError] = useState(false)
    const [fixedError, setFixedError] = useState(false)

    const [recovData, setRecovData] = useState(null)
    const [fixedData, setFixedData] = useState({
        summary: { totalAssets: 0, totalValue: 0, activeAssets: 0, disposedAssets: 0, fullyDepreciated: 0 },
        groups: [],
        disposals: []
    })

    const [financialYearList, setFinancialYearList] = useState([])
    const [selectedFy, setSelectedFy] = useState('')

    // LRP state – mirrors main dashboard pattern
    const [recovTxnId, setRecovTxnId] = useState(null)
    const [recovCount, setRecovCount] = useState(60)
    const [fixedTxnId, setFixedTxnId] = useState(null)
    const [fixedCount, setFixedCount] = useState(60)

    const recovTimer = useRef(null)
    const recovTimerLimit = useRef(0)
    const fixedTimer = useRef(null)
    const fixedTimerLimit = useRef(0)

    useEffect(() => {
        loadFinancialYears()
        return () => {
            if (recovTimer.current) clearInterval(recovTimer.current)
            if (fixedTimer.current) clearInterval(fixedTimer.current)
        }
    }, [])

    useEffect(() => {
        if (selectedFy) {
            loadRecovDashboard(selectedFy)
            loadFixedDashboard(selectedFy)
        }
    }, [selectedFy])

    const loadFinancialYears = () => {
        const url = GET_URL.financialyear.api
        const params = { is_active: true }
        let modifiedProps = { ...props }
        modifiedProps['return_error_message'] = true

        getRequest(url, params, modifiedProps).then(response => {
            if (response && response.status === 200) {
                const options = response.data.data || response.data || []
                setFinancialYearList(options)

                let currentFyId = ''
                const today = new Date()
                const currentFy = options.find(fy => {
                    const start = new Date(fy.start_date)
                    const end = new Date(fy.end_date)
                    return today >= start && today <= end
                })

                if (currentFy) {
                    currentFyId = currentFy.id
                } else if (options.length > 0) {
                    currentFyId = options[0].id
                }

                if (currentFyId) {
                    setSelectedFy(currentFyId)
                } else {
                    loadRecovDashboard('')
                    loadFixedDashboard('')
                }
            }
        })
    }

    /* ══════════════════════════════════════════════════════════════════
       RECOVERABLE ASSETS — LRP pattern (same as main Dashboard)
       ══════════════════════════════════════════════════════════════════ */
    const loadRecovDashboard = (fyId = selectedFy) => {
        recovTimerLimit.current = 0
        setLoadingRecov(true)
        setRecovError(false)
        if (recovTimer.current) clearInterval(recovTimer.current)

        const txnId = Date.now() + '_recov'
        const params = {
            long_running_process: 1,
            transaction_id: txnId,
            financial_year_id: fyId
        }

        let modifiedProps = { ...props }
        modifiedProps['return_error_message'] = true

        getRequest(GET_URL.recoverableAssetDashboard.api, params, modifiedProps).then(
            (response) => {
                if (response && response.data && response.data.Result) {
                    // LRP accepted — start polling
                    clearInterval(recovTimer.current)
                    setRecovTxnId(txnId)
                    setRecovCount(60)
                    startRecovPolling(txnId)
                } else if (response && response.status === 200 && response.data) {
                    // Direct response (no LRP)
                    setRecovData(response.data.data || response.data)
                    setLoadingRecov(false)
                } else {
                    setRecovError(true)
                    setLoadingRecov(false)
                }
            }
        )
    }

    const startRecovPolling = (txnId) => {
        recovTimer.current = setInterval(() => {
            pollRecovResult(txnId)
        }, 3000)
        recovTimerLimit.current += 1
        if (recovTimerLimit.current === 40) {
            clearInterval(recovTimer.current)
            setLoadingRecov(false)
            setRecovError(true)
        }
    }

    const pollRecovResult = (txnId) => {
        const params = { transaction_id: txnId, is_active: true }
        let modifiedProps = { ...props }
        modifiedProps['return_error_message'] = true

        setRecovCount(prev => {
            if (prev <= 0) {
                clearInterval(recovTimer.current)
                setLoadingRecov(false)
                setRecovError(true)
                return 0
            }
            return prev - 1
        })

        getRequest(GET_URL.longprocessingapiresult.api, params, modifiedProps).then(
            (response) => {
                if (response && response.status === 200) {
                    if (response?.data?.data?.is_process_running === false) {
                        clearInterval(recovTimer.current)
                        const resultData = response.data.data?.result_data
                        if (resultData && !resultData.error) {
                            setRecovData(resultData)
                        } else {
                            setRecovError(true)
                        }
                        setLoadingRecov(false)
                    }
                } else {
                    clearInterval(recovTimer.current)
                    setLoadingRecov(false)
                    setRecovError(true)
                }
            }
        )
    }

    /* ══════════════════════════════════════════════════════════════════
       FIXED ASSETS — LRP pattern (same as main Dashboard)
       ══════════════════════════════════════════════════════════════════ */
    const loadFixedDashboard = (fyId = selectedFy) => {
        fixedTimerLimit.current = 0
        setLoadingFixed(true)
        setFixedError(false)
        if (fixedTimer.current) clearInterval(fixedTimer.current)

        const txnId = Date.now() + '_fixed'
        const params = {
            long_running_process: 1,
            transaction_id: txnId,
            financial_year_id: fyId
        }

        let modifiedProps = { ...props }
        modifiedProps['return_error_message'] = true

        getRequest(GET_URL.assetDashboard.api, params, modifiedProps).then(
            (response) => {
                if (response && response.data && response.data.Result) {
                    clearInterval(fixedTimer.current)
                    setFixedTxnId(txnId)
                    setFixedCount(60)
                    startFixedPolling(txnId)
                } else if (response && response.status === 200 && response.data) {
                    setFixedData({
                        summary: response.data.summary || {},
                        groups: response.data.groups || [],
                        disposals: response.data.disposals || []
                    })
                    setLoadingFixed(false)
                } else {
                    setFixedError(true)
                    setLoadingFixed(false)
                }
            }
        )
    }

    const startFixedPolling = (txnId) => {
        fixedTimer.current = setInterval(() => {
            pollFixedResult(txnId)
        }, 3000)
        fixedTimerLimit.current += 1
        if (fixedTimerLimit.current === 40) {
            clearInterval(fixedTimer.current)
            setLoadingFixed(false)
            setFixedError(true)
        }
    }

    const pollFixedResult = (txnId) => {
        const params = { transaction_id: txnId, is_active: true }
        let modifiedProps = { ...props }
        modifiedProps['return_error_message'] = true

        setFixedCount(prev => {
            if (prev <= 0) {
                clearInterval(fixedTimer.current)
                setLoadingFixed(false)
                setFixedError(true)
                return 0
            }
            return prev - 1
        })

        getRequest(GET_URL.longprocessingapiresult.api, params, modifiedProps).then(
            (response) => {
                if (response && response.status === 200) {
                    if (response?.data?.data?.is_process_running === false) {
                        clearInterval(fixedTimer.current)
                        const resultData = response.data.data?.result_data
                        if (resultData && !resultData.error) {
                            setFixedData({
                                summary: resultData.summary || {},
                                groups: resultData.groups || [],
                                disposals: resultData.disposals || []
                            })
                        } else {
                            setFixedError(true)
                        }
                        setLoadingFixed(false)
                    }
                } else {
                    clearInterval(fixedTimer.current)
                    setLoadingFixed(false)
                    setFixedError(true)
                }
            }
        )
    }

    const handleRefresh = () => {
        if (selectedFy) {
            loadRecovDashboard(selectedFy)
            loadFixedDashboard(selectedFy)
        } else {
            loadRecovDashboard('')
            loadFixedDashboard('')
        }
    }

    const loading = loadingRecov || loadingFixed
    const { summary: recovSummary, categories } = recovData || {}
    const { summary: fixedSummary, groups } = fixedData

    const renderSkeletons = () => (
        <>
            <div className="cad-summary-row">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} animation="wave" variant="rect" className="cad-skeleton-card" />
                ))}
            </div>
            <div className="cad-summary-row" style={{ marginTop: 10 }}>
                {[5, 6, 7, 8].map(i => (
                    <Skeleton key={i} animation="wave" variant="rect" className="cad-skeleton-card" />
                ))}
            </div>
            <Grid container spacing={3} style={{ marginTop: 20 }}>
                {[1, 2, 3, 4].map(i => (
                    <Grid item xs={12} md={6} key={i}>
                        <Skeleton animation="wave" variant="rect" className="cad-skeleton-table" />
                    </Grid>
                ))}
            </Grid>
        </>
    )

    return (
        <div className={classNames('paper-background', 'combined-asset-dashboard')}>
            <div className="cad-header">
                <div className="d-flex align-items-center">
                    <Typography variant="h6" component="h6" style={{ fontWeight: 700, color: '#1e293b', fontSize: '24px' }}>
                        Assets Dashboard
                    </Typography>

                    {financialYearList && financialYearList.length > 0 && (
                        <div style={{ marginLeft: 30, minWidth: 150 }}>
                            <FormControl variant="outlined" size="small" style={{ width: '100%', backgroundColor: '#fff', borderRadius: 4 }}>
                                <Select
                                    value={selectedFy}
                                    onChange={(e) => setSelectedFy(e.target.value)}
                                    displayEmpty
                                    MenuProps={{
                                        anchorOrigin: {
                                            vertical: "bottom",
                                            horizontal: "left"
                                        },
                                        getContentAnchorEl: null
                                    }}
                                >
                                    {financialYearList.map((fy) => (
                                        <MenuItem key={fy.id} value={fy.id}>
                                            {fy.start_date ? `${fy.start_date.substring(0, 4)} - ${fy.end_date.substring(2, 4)}` : (fy.label || fy.name || fy.id)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </div>
                    )}

                    <Tooltip
                        title="Refresh Dashboard"
                        enterDelay={400}
                        enterNextDelay={400}
                        placement="top-start"
                        classes={{ tooltip: 'tooltip-show-data' }}
                    >
                        <div
                            className="pointer d-flex ml-20"
                            onClick={handleRefresh}
                            style={{
                                color: 'var(--headingColor)',
                                padding: '8px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, color-mix(in srgb, var(--headingColor) 15%, white) 0%, color-mix(in srgb, var(--headingColor) 25%, white) 100%)',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                            }}
                        >
                            <RefreshIcon className="height-width-25px" />
                        </div>
                    </Tooltip>
                </div>
            </div>

            {loading ? renderSkeletons() : (
                <>
                    <Typography className="section-title">Recoverable Assets</Typography>

                    {recovError ? (
                        <Paper elevation={0} className="cad-detail-paper" style={{ textAlign: 'center', padding: 40 }}>
                            <WarningIcon style={{ fontSize: 48, color: '#ef4444', marginBottom: 12 }} />
                            <Typography style={{ color: '#64748b' }}>Failed to load recoverable assets. Please refresh.</Typography>
                        </Paper>
                    ) : (
                        <div className="cad-summary-row">
                            <SummaryCard
                                label="Total Outstanding"
                                value={`${numberWithCommas(recovSummary?.total_outstanding || 0)}`}
                                icon={<AccountBalanceWalletIcon />}
                                colorClass="cad-card-value--red"
                                onClick={() => { }}
                            />
                            <SummaryCard
                                label="Total Recovered"
                                value={`${numberWithCommas(recovSummary?.total_recovered || 0)}`}
                                icon={<CheckCircleIcon />}
                                colorClass="cad-card-value--green"
                                onClick={() => { }}
                            />
                            <SummaryCard
                                label="Total Fixed Asset"
                                value={`${numberWithCommas(recovSummary?.total_fixed_asset || 0)}`}
                                icon={<AccountBalanceIcon />}
                                colorClass="cad-card-value--blue"
                                onClick={() => { }}
                            />
                            <SummaryCard
                                label="Total Liabilities"
                                value={`${numberWithCommas(recovSummary?.total_liabilities || 0)}`}
                                icon={<AssessmentIcon />}
                                colorClass="cad-card-value--red"
                                onClick={() => { }}
                            />
                        </div>
                    )}

                    <Typography className="section-title" style={{ marginTop: 28 }}>Fixed Assets</Typography>

                    {fixedError ? (
                        <Paper elevation={0} className="cad-detail-paper" style={{ textAlign: 'center', padding: 40 }}>
                            <WarningIcon style={{ fontSize: 48, color: '#ef4444', marginBottom: 12 }} />
                            <Typography style={{ color: '#64748b' }}>Failed to load fixed assets. Please refresh.</Typography>
                        </Paper>
                    ) : (
                        <div className="cad-summary-row">
                            <SummaryCard
                                label="Total Assets"
                                value={fixedSummary?.totalAssets || 0}
                                icon={<AccountBalanceIcon />}
                                onClick={() => {
                                    if (Actions.assets?.view?.url) props.history.push(Actions.assets.view.url)
                                }}
                            />
                            <SummaryCard
                                label="Total Value"
                                value={`${numberWithCommas(fixedSummary?.totalValue || 0)}`}
                                icon={<AssessmentIcon />}
                                colorClass="cad-card-value--blue"
                                onClick={() => { }}
                            />
                            <SummaryCard
                                label="Fully Depreciated"
                                value={fixedSummary?.fullyDepreciated || 0}
                                icon={<TrendingDownIcon />}
                                onClick={() => { }}
                            />
                            <SummaryCard
                                label="Disposed"
                                value={fixedSummary?.disposedAssets || 0}
                                icon={<DeleteForeverIcon />}
                                colorClass="cad-card-value--red"
                                onClick={() => { }}
                            />
                        </div>
                    )}

                    <Divider style={{ margin: '30px 0 20px' }} />

                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Paper elevation={0} className="cad-detail-paper">
                                <div className="cad-detail-title">Recoverable Assets — By Category</div>

                                <Typography variant="subtitle1" style={{ fontWeight: 600, margin: '15px 0 10px', color: '#475569' }}>
                                    Fixed Assets
                                </Typography>
                                <Box style={{ maxHeight: 300, overflow: 'auto', marginBottom: '20px' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Category</TableCell>
                                                <TableCell>Code</TableCell>
                                                <TableCell align="right">Count</TableCell>
                                                <TableCell align="right">Opening</TableCell>
                                                <TableCell align="right">Outstanding</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(categories || []).filter(c => c.classification === 'FIXED_ASSET').map((c, i) => (
                                                <TableRow key={`fa-${i}`} hover>
                                                    <TableCell>{c.category}</TableCell>
                                                    <TableCell>
                                                        {c.code && <Chip label={c.code} size="small" variant="outlined" />}
                                                    </TableCell>
                                                    <TableCell align="right">{c.count}</TableCell>
                                                    <TableCell align="right">{numberWithCommas(c.total_opening)}</TableCell>
                                                    <TableCell align="right" style={{ fontWeight: 600 }}>
                                                        {numberWithCommas(c.total_outstanding)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {(!categories || categories.filter(c => c.classification === 'FIXED_ASSET').length === 0) && (
                                                <TableRow><TableCell colSpan={5} align="center" style={{ color: '#94a3b8' }}>No data</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </Box>

                                <Divider />

                                <Typography variant="subtitle1" style={{ fontWeight: 600, margin: '15px 0 10px', color: '#475569' }}>
                                    Liabilities
                                </Typography>
                                <Box style={{ maxHeight: 300, overflow: 'auto' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Category</TableCell>
                                                <TableCell>Code</TableCell>
                                                <TableCell align="right">Count</TableCell>
                                                <TableCell align="right">Opening</TableCell>
                                                <TableCell align="right">Outstanding</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(categories || []).filter(c => c.classification === 'LIABILITY' || !c.classification).map((c, i) => (
                                                <TableRow key={`liab-${i}`} hover>
                                                    <TableCell>{c.category}</TableCell>
                                                    <TableCell>
                                                        {c.code && <Chip label={c.code} size="small" variant="outlined" />}
                                                    </TableCell>
                                                    <TableCell align="right">{c.count}</TableCell>
                                                    <TableCell align="right">{numberWithCommas(c.total_opening)}</TableCell>
                                                    <TableCell align="right" style={{ fontWeight: 600 }}>
                                                        {numberWithCommas(c.total_outstanding)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {(!categories || categories.filter(c => c.classification === 'LIABILITY' || !c.classification).length === 0) && (
                                                <TableRow><TableCell colSpan={5} align="center" style={{ color: '#94a3b8' }}>No data</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </Box>
                            </Paper>
                        </Grid>

                        <Grid item xs={12}>
                            <Paper elevation={0} className="cad-detail-paper">
                                <div className="cad-detail-title">Fixed Assets — Group Breakdown</div>
                                <Box style={{ maxHeight: 400, overflow: 'auto' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Asset Group</TableCell>
                                                <TableCell>Depreciation Method</TableCell>
                                                <TableCell align="right">Assets</TableCell>
                                                <TableCell align="right">Total Value</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(groups || []).map(g => (
                                                <TableRow key={g.id} hover>
                                                    <TableCell>{g.name}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={g.depreciation_method}
                                                            size="small"
                                                            color={g.depreciation_method === 'SLM' ? 'primary' : 'secondary'}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">{g.asset_count}</TableCell>
                                                    <TableCell align="right">{numberWithCommas(g.total_value)}</TableCell>
                                                </TableRow>
                                            ))}
                                            {(!groups || groups.length === 0) && (
                                                <TableRow><TableCell colSpan={4} align="center" style={{ color: '#94a3b8' }}>No data</TableCell></TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </>
            )}
        </div>
    )
}

export default withRouter(CombinedAssetDashboard)
