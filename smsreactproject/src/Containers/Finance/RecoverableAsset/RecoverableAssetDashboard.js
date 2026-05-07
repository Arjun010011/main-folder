import React, { useState, useEffect, useRef } from 'react'
import {
    Paper, Box, Grid, Card, CardContent, Typography,
    Table, TableHead, TableRow, TableCell, TableBody,
    Divider, Chip
} from '@material-ui/core'
import AccountBalanceWalletIcon from '@material-ui/icons/AccountBalanceWallet'
import TrendingDownIcon from '@material-ui/icons/TrendingDown'
import CheckCircleIcon from '@material-ui/icons/CheckCircle'
import WarningIcon from '@material-ui/icons/Warning'
import classNames from 'classnames'

import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall'
import { GET_URL } from 'Includes/urls'
import { numberWithCommas } from 'Includes/functions'
import '../../General/styles.scss'


const cardStyles = [
    { bg: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)', border: '#1976d2', color: '#1976d2' },
    { bg: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)', border: '#388e3c', color: '#388e3c' },
    { bg: 'linear-gradient(135deg, #fff3e0 0%, #ffffff 100%)', border: '#f57c00', color: '#f57c00' },
    { bg: 'linear-gradient(135deg, #ffebee 0%, #ffffff 100%)', border: '#d32f2f', color: '#d32f2f' },
]

const SummaryCard = ({ title, value, subtitle, icon, style }) => (
    <Grid item xs={12} sm={6} md={3}>
        <Card
            style={{
                background: style.bg,
                borderLeft: `3px solid ${style.border}`,
                height: '100%',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
            <CardContent style={{ padding: '12px 16px' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box style={{ flex: 1 }}>
                        <Typography color="textSecondary" variant="caption" style={{ fontWeight: 500, fontSize: '0.75rem' }}>
                            {title}
                        </Typography>
                        <Typography variant="h6" style={{ color: style.color, fontWeight: 'bold', fontSize: '1.25rem' }}>
                            {value}
                        </Typography>
                    </Box>
                    <Box style={{ marginLeft: '8px' }}>
                        {React.cloneElement(icon, { style: { fontSize: 28, color: style.color } })}
                    </Box>
                </Box>
                {subtitle && (
                    <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginTop: 8 }}>
                        {subtitle}
                    </Typography>
                )}
            </CardContent>
        </Card>
    </Grid>
)

const typeColorMap = {
    'LOAN': 'secondary',
    'ADVANCE': 'default',
    'DEPOSIT': 'default',
    'STAFF_SALARY_ADVANCE': 'primary',
}


const RecoverableAssetDashboard = (props) => {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState(null)

    const pollTimer = useRef(null)
    const pollCount = useRef(0)

    useEffect(() => {
        loadDashboard()
        return () => {
            if (pollTimer.current) clearInterval(pollTimer.current)
        }
    }, [])

    const loadDashboard = async () => {
        setLoading(true)
        const transactionId = Date.now()

        const res = await getRequest(
            GET_URL.recoverableAssetDashboard.api,
            { long_running_process: 1, transaction_id: transactionId },
            props
        )

        if (res?.status === 200 && res.data?.Result) {
            // LRP started — poll for result
            pollCount.current = 0
            pollTimer.current = setInterval(() => {
                pollForResult(transactionId)
            }, 3000)
        } else {
            // Fallback: immediate data (non-LRP)
            if (res?.status === 200 && res.data) {
                setData(res.data.data || res.data)
            }
            setLoading(false)
        }
    }

    const pollForResult = async (transactionId) => {
        pollCount.current += 1
        if (pollCount.current > 60) {
            clearInterval(pollTimer.current)
            setLoading(false)
            return
        }

        const res = await getRequest(
            GET_URL.longprocessingapiresult.api,
            { transaction_id: transactionId, is_active: true },
            props
        )

        if (res?.status === 200 && res.data?.data) {
            const resultData = res.data.data
            if (resultData.is_process_running === false) {
                clearInterval(pollTimer.current)
                if (resultData.result_data && !resultData.result_data.error) {
                    setData(resultData.result_data)
                }
                setLoading(false)
            }
        }
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <img src={loadingBar} className="loading" alt="loading" />
            </Box>
        )
    }

    if (!data) {
        return (
            <Box p={4}>
                <Typography>Unable to load recoverable asset dashboard.</Typography>
            </Box>
        )
    }

    const { summary, categories, type_breakdown, recent_transactions, top_outstanding } = data

    return (
        <Box>
            <Paper className={classNames('paper-background')} style={{ padding: 20 }}>
                <Typography variant="h5" style={{ fontWeight: 600, marginBottom: 20 }}>
                    Recoverable Assets Dashboard
                </Typography>

                {/* Summary Cards */}
                <Grid container spacing={2}>
                    <SummaryCard
                        title="Total Outstanding"
                        value={`${numberWithCommas(summary?.total_outstanding || 0)}`}
                        subtitle={`Disbursed: ${numberWithCommas(summary?.total_disbursed || 0)}`}
                        icon={<AccountBalanceWalletIcon />}
                        style={cardStyles[0]}
                    />
                    <SummaryCard
                        title="Total Recovered"
                        value={`${numberWithCommas(summary?.total_recovered || 0)}`}
                        subtitle={`${summary?.closed_assets || 0} assets closed`}
                        icon={<CheckCircleIcon />}
                        style={cardStyles[1]}
                    />
                    <SummaryCard
                        title="Active Assets"
                        value={summary?.active_assets || 0}
                        subtitle={`Total: ${summary?.total_assets || 0}`}
                        icon={<TrendingDownIcon />}
                        style={cardStyles[2]}
                    />
                    <SummaryCard
                        title="Overdue"
                        value={summary?.overdue_assets || 0}
                        subtitle="Past expected end date"
                        icon={<WarningIcon />}
                        style={cardStyles[3]}
                    />
                </Grid>

                <Divider style={{ margin: '20px 0' }} />

                {/* Type Breakdown + Category Breakdown */}
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Paper elevation={2} style={{ padding: 16 }}>
                            <Typography variant="h6" style={{ marginBottom: 16 }}>
                                By Asset Type
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow style={{ background: '#f5f5f5' }}>
                                        <TableCell><strong>Type</strong></TableCell>
                                        <TableCell align="right"><strong>Count</strong></TableCell>
                                        <TableCell align="right"><strong>Outstanding</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(type_breakdown || []).map((t, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell>
                                                <Chip
                                                    label={t.label}
                                                    size="small"
                                                    color={typeColorMap[t.asset_type] || 'default'}
                                                />
                                            </TableCell>
                                            <TableCell align="right">{t.count}</TableCell>
                                            <TableCell align="right">{numberWithCommas(t.outstanding)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={8}>
                        <Paper elevation={2} style={{ padding: 16 }}>
                            <Typography variant="h6" style={{ marginBottom: 16 }}>
                                By Category
                            </Typography>
                            <Box style={{ maxHeight: 350, overflow: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow style={{ background: '#f5f5f5' }}>
                                            <TableCell><strong>Category</strong></TableCell>
                                            <TableCell><strong>Code</strong></TableCell>
                                            <TableCell align="right"><strong>Count</strong></TableCell>
                                            <TableCell align="right"><strong>Disbursed</strong></TableCell>
                                            <TableCell align="right"><strong>Outstanding</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(categories || []).map((c, i) => (
                                            <TableRow key={i} hover>
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
                                    </TableBody>
                                </Table>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>

                <Divider style={{ margin: '20px 0' }} />

                {/* Top Outstanding + Recent Transactions */}
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Paper elevation={2} style={{ padding: 16 }}>
                            <Typography variant="h6" style={{ marginBottom: 16 }}>
                                Top Outstanding
                            </Typography>
                            <Box style={{ maxHeight: 350, overflow: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow style={{ background: '#f5f5f5' }}>
                                            <TableCell><strong>Name</strong></TableCell>
                                            <TableCell><strong>Type</strong></TableCell>
                                            <TableCell align="right"><strong>Outstanding</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(top_outstanding || []).map((item, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell>
                                                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={item.asset_type}
                                                        size="small"
                                                        color={typeColorMap[item.asset_type] || 'default'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="right" style={{ fontWeight: 600, color: '#d32f2f' }}>
                                                    {numberWithCommas(item.outstanding)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Paper elevation={2} style={{ padding: 16 }}>
                            <Typography variant="h6" style={{ marginBottom: 16 }}>
                                Recent Transactions
                            </Typography>
                            <Box style={{ maxHeight: 350, overflow: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow style={{ background: '#f5f5f5' }}>
                                            <TableCell><strong>Asset</strong></TableCell>
                                            <TableCell><strong>Type</strong></TableCell>
                                            <TableCell align="right"><strong>Amount</strong></TableCell>
                                            <TableCell><strong>Date</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(recent_transactions || []).map((txn, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell>
                                                    <div style={{ fontWeight: 500 }}>{txn.asset_name}</div>
                                                    {txn.source_type && (
                                                        <div style={{ fontSize: '0.75em', color: '#888' }}>
                                                            {txn.source_type}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={txn.transaction_type}
                                                        size="small"
                                                        color={txn.transaction_type === 'CREDIT' ? 'primary' : 'secondary'}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">{numberWithCommas(txn.amount)}</TableCell>
                                                <TableCell>{txn.transaction_date}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    )
}

export default RecoverableAssetDashboard
