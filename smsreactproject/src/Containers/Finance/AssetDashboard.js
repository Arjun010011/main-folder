import React, { useState, useEffect, useRef } from 'react'
import {
    Paper, Box, Grid, Card, CardContent, Typography,
    Table, TableHead, TableRow, TableCell, TableBody,
    Button, Divider, Chip, Tooltip
} from '@material-ui/core'
import { Link } from 'react-router-dom'
import AccountBalanceIcon from '@material-ui/icons/AccountBalance'
import TrendingDownIcon from '@material-ui/icons/TrendingDown'
import AssessmentIcon from '@material-ui/icons/Assessment'
import DeleteForeverIcon from '@material-ui/icons/DeleteForever'
import classNames from 'classnames'

import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall'
import { GET_URL } from 'Includes/urls'
import { numberWithCommas } from 'Includes/functions'
import { Actions } from 'Constants/permissions'
import '../General/styles.scss'

const AssetDashboard = (props) => {
    const [loading, setLoading] = useState(true)

    const [summary, setSummary] = useState({
        totalAssets: 0,
        totalValue: 0,
        activeAssets: 0,
        disposedAssets: 0,
        fullyDepreciated: 0
    })

    const [groups, setGroups] = useState([])
    const [disposals, setDisposals] = useState([])

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
            GET_URL.assetDashboard.api,
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

    const handleDashboardData = (data) => {
        setSummary(data.summary || {})
        setGroups(data.groups || [])
        setDisposals(data.disposals || [])
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <img src={loadingBar} className="loading" alt="loading" />
            </Box>
        )
    }

    return (
        <Box>
            <Paper className={classNames('paper-background')}>
                <Grid container>
                    <Grid item xs={12}>
                        <Box display="flex" justifyContent="flex-end" mt={2} mb={1}>
                            <Button
                                variant="contained"
                                color="primary"
                                component={Link}
                                to={Actions.assets?.view?.url || '/finance/assets'}
                                style={{ marginRight: 10 }}
                            >
                                View All Assets
                            </Button>
                            <Button
                                variant="contained"
                                component={Link}
                                to={Actions.depreciation?.view?.url || '/finance/depreciation'}
                            >
                                Run Depreciation
                            </Button>
                        </Box>
                    </Grid>
                </Grid>

                <Grid container spacing={2} style={{ padding: 20 }}>
                    <Grid item xs={12} md={3}>
                        <Card
                            style={{
                                background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)',
                                borderLeft: '3px solid #1976d2',
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
                                        <Typography color="textSecondary" variant="caption" style={{ fontWeight: 500, marginBottom: '4px', fontSize: '0.75rem' }}>
                                            Total Assets
                                        </Typography>
                                        <Typography variant="h6" style={{ color: '#1976d2', fontWeight: 'bold', fontSize: '1.25rem' }}>
                                            {summary.totalAssets}
                                        </Typography>
                                    </Box>
                                    <Box style={{ marginLeft: '8px' }}>
                                        <AccountBalanceIcon style={{ fontSize: 28, color: '#1976d2' }} />
                                    </Box>
                                </Box>
                                <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginTop: 8 }}>
                                    Active: {summary.activeAssets} | Disposed: {summary.disposedAssets}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Card
                            style={{
                                background: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)',
                                borderLeft: '3px solid #388e3c',
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
                                        <Typography color="textSecondary" variant="caption" style={{ fontWeight: 500, marginBottom: '4px', fontSize: '0.75rem' }}>
                                            Total Value
                                        </Typography>
                                        <Typography variant="h6" style={{ color: '#388e3c', fontWeight: 'bold', fontSize: '1.25rem' }}>
                                            {numberWithCommas(summary.totalValue)}
                                        </Typography>
                                    </Box>
                                    <Box style={{ marginLeft: '8px' }}>
                                        <AssessmentIcon style={{ fontSize: 28, color: '#388e3c' }} />
                                    </Box>
                                </Box>
                                <Tooltip title="Excludes disposed assets. Depreciation not applied." placement="top">
                                    <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginTop: 8 }}>
                                        Active assets original cost
                                    </Typography>
                                </Tooltip>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Card
                            style={{
                                background: 'linear-gradient(135deg, #fff3e0 0%, #ffffff 100%)',
                                borderLeft: '3px solid #f57c00',
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
                                        <Typography color="textSecondary" variant="caption" style={{ fontWeight: 500, marginBottom: '4px', fontSize: '0.75rem' }}>
                                            Fully Depreciated
                                        </Typography>
                                        <Typography variant="h6" style={{ color: '#f57c00', fontWeight: 'bold', fontSize: '1.25rem' }}>
                                            {summary.fullyDepreciated}
                                        </Typography>
                                    </Box>
                                    <Box style={{ marginLeft: '8px' }}>
                                        <TrendingDownIcon style={{ fontSize: 28, color: '#f57c00' }} />
                                    </Box>
                                </Box>
                                <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginTop: 8 }}>
                                    Assets at zero book value
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Card
                            style={{
                                background: 'linear-gradient(135deg, #ffebee 0%, #ffffff 100%)',
                                borderLeft: '3px solid #d32f2f',
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
                                        <Typography color="textSecondary" variant="caption" style={{ fontWeight: 500, marginBottom: '4px', fontSize: '0.75rem' }}>
                                            Disposed
                                        </Typography>
                                        <Typography variant="h6" style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '1.25rem' }}>
                                            {summary.disposedAssets}
                                        </Typography>
                                    </Box>
                                    <Box style={{ marginLeft: '8px' }}>
                                        <DeleteForeverIcon style={{ fontSize: 28, color: '#d32f2f' }} />
                                    </Box>
                                </Box>
                                <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginTop: 8 }}>
                                    Sold, scrapped or transferred
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                <Divider style={{ margin: '10px 20px' }} />

                <Grid container spacing={3} style={{ padding: 20 }}>
                    <Grid item xs={12} md={8}>
                        <Paper elevation={2} style={{ padding: 16 }}>
                            <Typography variant="h6" style={{ marginBottom: 16 }}>
                                Group-wise Breakdown
                            </Typography>

                            <Box style={{ maxHeight: 400, overflow: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow style={{ background: '#f5f5f5' }}>
                                            <TableCell><strong>Asset Group</strong></TableCell>
                                            <TableCell><strong>Method</strong></TableCell>
                                            <TableCell align="right"><strong>Assets</strong></TableCell>
                                            <TableCell align="right"><strong>Total Value</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {groups.map(g => (
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
                                                <TableCell align="right">
                                                    {numberWithCommas(g.total_value)}
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
                                Recent Disposals
                            </Typography>

                            <Box style={{ maxHeight: 300, overflow: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow style={{ background: '#f5f5f5' }}>
                                            <TableCell><strong>Asset</strong></TableCell>
                                            <TableCell><strong>Date</strong></TableCell>
                                            <TableCell align="right"><strong>Value</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {disposals.map(d => (
                                            <TableRow key={d.id}>
                                                <TableCell>
                                                    <div style={{ fontWeight: 500 }}>{d.asset_code}</div>
                                                    <div style={{ fontSize: '0.8em', color: '#666' }}>
                                                        {d.asset_name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{d.disposal_date}</TableCell>
                                                <TableCell align="right">
                                                    {numberWithCommas(d.disposal_value)}
                                                </TableCell>
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

export default AssetDashboard
