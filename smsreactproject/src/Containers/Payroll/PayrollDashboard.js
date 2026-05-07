import React, { useState, useEffect, useRef } from 'react'
import {
    Paper, Box, Grid, Card, CardContent, Typography,
    Table, TableHead, TableRow, TableCell, TableBody,
    Divider, Chip, Tooltip
} from '@material-ui/core'
import PeopleIcon from '@material-ui/icons/People'
import TrendingUpIcon from '@material-ui/icons/TrendingUp'
import LockIcon from '@material-ui/icons/Lock'
import classNames from 'classnames'

import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall'
import { GET_URL } from 'Includes/urls'
import { numberWithCommas } from 'Includes/functions'
import '../General/styles.scss'


const cardStyles = [
    { bg: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)', border: '#1976d2', color: '#1976d2' },
    { bg: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)', border: '#388e3c', color: '#388e3c' },
    { bg: 'linear-gradient(135deg, #fff3e0 0%, #ffffff 100%)', border: '#f57c00', color: '#f57c00' },
    { bg: 'linear-gradient(135deg, #f3e5f5 0%, #ffffff 100%)', border: '#7b1fa2', color: '#7b1fa2' },
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


const PayrollDashboard = (props) => {
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
            GET_URL.payrollDashboard.api,
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
                handleDashboardData(res.data)
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
                    handleDashboardData(resultData.result_data)
                }
                setLoading(false)
            }
        }
    }

    const handleDashboardData = (rawData) => {
        // The response wraps data differently depending on LRP vs direct
        const d = rawData.data || rawData
        setData(d)
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
                <Typography>Unable to load payroll dashboard.</Typography>
            </Box>
        )
    }

    const { summary, monthly_trend, top_earners, component_breakdown } = data

    return (
        <Box>
            <Paper className={classNames('paper-background')} style={{ padding: 20 }}>
                <Typography variant="h5" style={{ fontWeight: 600, marginBottom: 20 }}>
                    Payroll Dashboard
                </Typography>

                {/* Summary Cards */}
                <Grid container spacing={2}>
                    <SummaryCard
                        title="Staff on Payroll"
                        value={summary?.staff_on_payroll || 0}
                        subtitle={`Total staff: ${summary?.total_staff || 0} | Pending setup: ${summary?.pending_setup || 0}`}
                        icon={<PeopleIcon />}
                        style={cardStyles[0]}
                    />
                    <SummaryCard
                        title="Gross Earnings"
                        value={`${numberWithCommas(summary?.current_month?.gross_earnings || 0)}`}
                        subtitle={summary?.current_month?.month || 'Current Month'}
                        icon={<TrendingUpIcon />}
                        style={cardStyles[1]}
                    />
                    <SummaryCard
                        title="Net Pay"
                        value={`${numberWithCommas(summary?.current_month?.net_pay || 0)}`}
                        subtitle={`Deductions: ${numberWithCommas(summary?.current_month?.gross_deductions || 0)}`}
                        icon={<span style={{ fontWeight: 'bold', fontFamily: 'sans-serif' }}>₹</span>}
                        style={cardStyles[2]}
                    />
                    <SummaryCard
                        title="Status"
                        value={summary?.current_month?.is_locked ? 'Locked' : 'Open'}
                        subtitle={`${summary?.current_month?.staff_count || 0} staff processed`}
                        icon={<LockIcon />}
                        style={cardStyles[3]}
                    />
                </Grid>

                <Divider style={{ margin: '20px 0' }} />

                {/* Monthly Trend + Top Earners */}
                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <Paper elevation={2} style={{ padding: 16 }}>
                            <Typography variant="h6" style={{ marginBottom: 16 }}>
                                Monthly Payroll Trend
                            </Typography>
                            <Box style={{ maxHeight: 400, overflow: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow style={{ background: '#f5f5f5' }}>
                                            <TableCell><strong>Month</strong></TableCell>
                                            <TableCell align="right"><strong>Staff</strong></TableCell>
                                            <TableCell align="right"><strong>Earnings</strong></TableCell>
                                            <TableCell align="right"><strong>Deductions</strong></TableCell>
                                            <TableCell align="right"><strong>Net Pay</strong></TableCell>
                                            <TableCell align="center"><strong>Status</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(monthly_trend || []).map((m, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell>{m.month}</TableCell>
                                                <TableCell align="right">{m.staff_count}</TableCell>
                                                <TableCell align="right">{numberWithCommas(m.gross_earnings)}</TableCell>
                                                <TableCell align="right">{numberWithCommas(m.gross_deductions)}</TableCell>
                                                <TableCell align="right" style={{ fontWeight: 600 }}>
                                                    {numberWithCommas(m.net_pay)}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Chip
                                                        label={m.is_locked ? 'Locked' : 'Open'}
                                                        size="small"
                                                        color={m.is_locked ? 'primary' : 'default'}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Paper elevation={2} style={{ padding: 16 }}>
                            <Typography variant="h6" style={{ marginBottom: 16 }}>
                                Top Earners
                            </Typography>
                            <Box style={{ maxHeight: 400, overflow: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow style={{ background: '#f5f5f5' }}>
                                            <TableCell><strong>Staff</strong></TableCell>
                                            <TableCell align="right"><strong>Net Pay</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {(top_earners || []).map((e, i) => (
                                            <TableRow key={i} hover>
                                                <TableCell>
                                                    <div style={{ fontWeight: 500 }}>{e.staff_name}</div>
                                                </TableCell>
                                                <TableCell align="right">
                                                    {numberWithCommas(e.net_pay)}
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

                {/* Component Breakdown */}
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Paper elevation={2} style={{ padding: 16 }}>
                            <Typography variant="h6" style={{ marginBottom: 16, color: '#388e3c' }}>
                                Earnings Breakdown
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow style={{ background: '#f5f5f5' }}>
                                        <TableCell><strong>Component</strong></TableCell>
                                        <TableCell align="right"><strong>Staff</strong></TableCell>
                                        <TableCell align="right"><strong>Total</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(component_breakdown?.earnings || []).map((c, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell>{c.component}</TableCell>
                                            <TableCell align="right">{c.staff_count}</TableCell>
                                            <TableCell align="right">{numberWithCommas(c.total)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Paper elevation={2} style={{ padding: 16 }}>
                            <Typography variant="h6" style={{ marginBottom: 16, color: '#d32f2f' }}>
                                Deductions Breakdown
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow style={{ background: '#f5f5f5' }}>
                                        <TableCell><strong>Component</strong></TableCell>
                                        <TableCell align="right"><strong>Staff</strong></TableCell>
                                        <TableCell align="right"><strong>Total</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(component_breakdown?.deductions || []).map((c, i) => (
                                        <TableRow key={i} hover>
                                            <TableCell>{c.component}</TableCell>
                                            <TableCell align="right">{c.staff_count}</TableCell>
                                            <TableCell align="right">{numberWithCommas(c.total)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Paper>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    )
}

export default PayrollDashboard
