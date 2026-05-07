import React, { Component } from 'react'
import {
    Paper,
    Box,
    Grid,
    Button,
    TextField,
    MenuItem,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip,
    Typography,
    CircularProgress
} from '@material-ui/core'
import GetAppIcon from '@material-ui/icons/GetApp'
import PrintIcon from '@material-ui/icons/Print'
import LockIcon from '@material-ui/icons/Lock'
import classNames from 'classnames'

import { getRequest } from 'Includes/api/apicall'
import { GET_URL } from 'Includes/urls'
import { numberWithCommas } from 'Includes/functions'

import LoadingGif from 'Components/LoadingGif'
import InfiniteScroll from 'react-infinite-scroller'
import SummaryCard from './Components/SummaryCard'

class FixedAssetCostRegister extends Component {
    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            tableUpdating: false,

            financial_year: '',
            financialYearOptions: [],

            reportData: [],
            totals: null,
            isLocked: false,
            previousYearLocked: true,

            pageNo: 1,
            limit: 10,
            totalCount: 0,
            hasMore: true,
            isFetchingMore: false,
        }
    }

    componentDidMount() {
        this.loadFinancialYears()
    }


    loadFinancialYears = () => {
        const url = GET_URL.financialyear.api
        const params = { is_active: true }

        getRequest(url, params, this.props).then(response => {
            if (response?.status === 200) {
                const options = response.data.data || []
                let currentFyId = ''

                const today = new Date()
                const currentFy = options.find(fy => {
                    const start = new Date(fy.start_date)
                    const end = new Date(fy.end_date)
                    return today >= start && today <= end
                })

                currentFyId = currentFy ? currentFy.id : options[0]?.id || ''

                this.setState(
                    {
                        financialYearOptions: options,
                        financial_year: currentFyId,
                        loading: false
                    },
                    () => currentFyId && this.loadReport()
                )
            } else {
                this.setState({ loading: false })
            }
        })
    }

    loadReport = () => {
        const { financial_year, limit } = this.state
        if (!financial_year) return

        this.setState({
            tableUpdating: true,
            pageNo: 1,
            reportData: [],
            hasMore: true
        })

        const url = GET_URL.fixedAssetCostRegister.api
        const params = { financial_year, limit, pageno: 1 }

        getRequest(url, params, this.props).then(response => {
            if (response?.status === 200) {
                const res = response.data.data || {}

                this.setState({
                    reportData: res.register || [],
                    totalCount: res.count || 0,
                    hasMore: !!res.next,
                    totals: res.totals || null,
                    isLocked: res.is_locked || false,
                    previousYearLocked: res.previous_year_locked !== false,
                    tableUpdating: false
                })
            } else {
                this.setState({ tableUpdating: false })
            }
        })
    }

    loadMoreData = () => {
        const { pageNo, financial_year, hasMore, isFetchingMore } = this.state
        if (!hasMore || isFetchingMore || this.fetchLock) return

        this.fetchLock = true;
        this.setState({ isFetchingMore: true })

        const nextPage = pageNo + 1
        const url = GET_URL.fixedAssetCostRegister.api
        const params = { financial_year, limit: 5, pageno: nextPage }

        getRequest(url, params, this.props).then(response => {
            this.fetchLock = false;
            if (response?.status === 200) {
                const res = response.data.data || {}
                const newItems = res.register || []

                this.setState(prev => {
                    const existingCodes = new Set(prev.reportData.map(item => item.asset_code));
                    const uniqueNewItems = newItems.filter(item => !existingCodes.has(item.asset_code));

                    return {
                        reportData: [...prev.reportData, ...uniqueNewItems],
                        pageNo: nextPage,
                        hasMore: !!res.next,
                        isFetchingMore: false
                    }
                })
            } else {
                this.setState({ isFetchingMore: false })
            }
        }).catch(() => {
            this.fetchLock = false;
            this.setState({ isFetchingMore: false })
        })
    }

    handlePrintPDF = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({ loading: true })

        const params = {
            financial_year,
            download_pdf: 'true'
        }

        const prop = { responseType: 'blob' }

        getRequest(GET_URL.fixedAssetCostRegister.api, params, prop)
            .then(res => {
                this.setState({ loading: false })
                if (res?.status === 200) {
                    const blob = new Blob([res.data], { type: 'application/pdf' })
                    const fileURL = URL.createObjectURL(blob)
                    const height = (window.screen.height * 75) / 100
                    const width = (window.screen.width * 75) / 100
                    window.open(fileURL, 'PRINT', `height=${height},width=${width}`)
                } else {
                    // toast error if needed
                }
            })
            .catch(() => this.setState({ loading: false }))
    }

    handlePrintExcel = () => {
        const { financial_year } = this.state
        if (!financial_year) return

        this.setState({ loading: true })

        const params = {
            financial_year,
            download_excel: 'true'
        }

        const prop = { responseType: 'blob' }

        getRequest(GET_URL.fixedAssetCostRegister.api, params, prop)
            .then(res => {
                this.setState({ loading: false })
                if (res?.status === 200) {
                    const url = window.URL.createObjectURL(new Blob([res.data]))
                    const link = document.createElement('a')
                    link.href = url
                    link.setAttribute('download', `Fixed_Asset_Cost_Register_${financial_year}.xlsx`)
                    document.body.appendChild(link)
                    link.click()
                    link.remove()
                } else {
                    // toast error if needed
                }
            })
            .catch(() => this.setState({ loading: false }))
    }

    render() {
        const {
            loading,
            tableUpdating,
            financial_year,
            financialYearOptions,
            reportData,
            totals,
            isLocked,
            previousYearLocked,
            isFetchingMore,
            totalCount
        } = this.state

        if (loading) return <LoadingGif />

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container alignItems="center">
                        <Grid item md={6} xs={12} className="header-align">
                            <Box className="heading">Fixed Asset Cost Register</Box>
                            <Typography variant="body2" color="textSecondary">
                                Cost-only (Opening + Additions − Disposals = Closing)
                            </Typography>
                        </Grid>

                        <Grid item md={6} xs={12} style={{ textAlign: 'right', paddingRight: 20 }}>
                            {isLocked && (
                                <Chip
                                    icon={<LockIcon />}
                                    label="Financial Year Locked (Read-Only)"
                                    size="small"
                                    style={{ backgroundColor: '#fff3e0', color: '#e65100' }}
                                />
                            )}
                        </Grid>
                    </Grid>

                    <Grid container spacing={3} style={{ padding: 20 }}>
                        <Grid item md={4} xs={12}>
                            <TextField
                                fullWidth
                                select
                                label="Financial Year"
                                value={financial_year}
                                onChange={e =>
                                    this.setState(
                                        { financial_year: e.target.value },
                                        this.loadReport
                                    )
                                }
                                variant="outlined"
                            >
                                {financialYearOptions.map(fy => (
                                    <MenuItem key={fy.id} value={fy.id}>
                                        {fy.name || `${fy.start_date} - ${fy.end_date}`}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid item md={8} xs={12}>
                            {reportData.length > 0 && (
                                <Box display="flex" justifyContent="flex-end">
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<PrintIcon />}
                                        onClick={this.handlePrintPDF}
                                        style={{ marginRight: 10 }}
                                    >
                                        Print PDF
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<GetAppIcon />}
                                        onClick={this.handlePrintExcel}
                                    >
                                        Download Excel
                                    </Button>
                                </Box>
                            )}
                        </Grid>
                    </Grid>

                    {reportData.length > 0 && totals && (
                        <Grid container spacing={2} style={{ padding: '0 20px 20px 20px' }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <SummaryCard
                                    label="OPENING BALANCE"
                                    value={totals.opening_cost}
                                    color="#1976d2"
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <SummaryCard
                                    label="ADDITIONS"
                                    value={totals.additions}
                                    color="#2e7d32"
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <SummaryCard
                                    label="DISPOSALS"
                                    value={totals.disposals}
                                    color="#d32f2f"
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <SummaryCard
                                    label="CLOSING BALANCE"
                                    value={totals.closing_cost}
                                    color="#6a1b9a"
                                />
                            </Grid>
                        </Grid>
                    )}

                    {tableUpdating && (
                        <Box display="flex" justifyContent="center" p={3}>
                            <CircularProgress />
                        </Box>
                    )}

                    {reportData.length > 0 && (
                        <Box>
                            <Box
                                position="sticky"
                                top={0}
                                zIndex={3}
                                bgcolor="#fff"
                                px={2}
                                py={1}
                                borderBottom="1px solid #eee"
                            >
                                <Typography variant="caption" color="textSecondary">
                                    Showing {reportData.length} of {totalCount} assets
                                </Typography>
                            </Box>

                            <Box
                                id="fixed-asset-cost-scroll-container"
                                style={{
                                    maxHeight: '75vh',
                                    overflowY: 'auto'
                                }}
                            >
                                <InfiniteScroll
                                    pageStart={0}
                                    loadMore={this.loadMoreData}
                                    hasMore={this.state.hasMore && !isFetchingMore}
                                    useWindow={false}
                                    getScrollParent={() => document.getElementById('fixed-asset-cost-scroll-container')}
                                    threshold={150}
                                    loader={
                                        <Box key="loader" display="flex" justifyContent="center" p={2}>
                                            <Typography color="textSecondary">Loading more assets...</Typography>
                                        </Box>
                                    }
                                >
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow style={{ backgroundColor: '#e8f5e9' }}>
                                                <TableCell>Asset Code</TableCell>
                                                <TableCell>Asset Name</TableCell>
                                                <TableCell>Group</TableCell>
                                                <TableCell>Purchase Date</TableCell>
                                                <TableCell align="right">Opening</TableCell>
                                                <TableCell align="right">Additions</TableCell>
                                                <TableCell align="right">Disposals</TableCell>
                                                <TableCell align="right">Closing</TableCell>
                                                <TableCell>Status</TableCell>
                                            </TableRow>
                                        </TableHead>

                                        <TableBody>
                                            {reportData.map((row, i) => (
                                                <TableRow key={i}>
                                                    <TableCell>{row.asset_code}</TableCell>
                                                    <TableCell>{row.asset_name}</TableCell>
                                                    <TableCell>{row.asset_group_name}</TableCell>
                                                    <TableCell>{row.purchase_date}</TableCell>
                                                    <TableCell align="right">{numberWithCommas(row.opening_cost)}</TableCell>
                                                    <TableCell align="right">{numberWithCommas(row.additions)}</TableCell>
                                                    <TableCell align="right">{numberWithCommas(row.disposals)}</TableCell>
                                                    <TableCell align="right">{numberWithCommas(row.closing_cost)}</TableCell>
                                                    <TableCell>
                                                        <Chip label={row.status} size="small" />
                                                    </TableCell>
                                                </TableRow>
                                            ))}

                                            {totals && !this.state.hasMore && (
                                                <TableRow style={{ backgroundColor: '#c8e6c9' }}>
                                                    <TableCell colSpan={4}><strong>TOTAL</strong></TableCell>
                                                    <TableCell align="right"><strong>{numberWithCommas(totals.opening_cost)}</strong></TableCell>
                                                    <TableCell align="right"><strong>{numberWithCommas(totals.additions)}</strong></TableCell>
                                                    <TableCell align="right"><strong>{numberWithCommas(totals.disposals)}</strong></TableCell>
                                                    <TableCell align="right"><strong>{numberWithCommas(totals.closing_cost)}</strong></TableCell>
                                                    <TableCell />
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </InfiniteScroll>

                                {isFetchingMore && (
                                    <Box display="flex" justifyContent="center" p={2}>
                                        <CircularProgress size={24} />
                                    </Box>
                                )}

                                {this.state.hasMore && !isFetchingMore && (
                                    <Box display="flex" justifyContent="center" p={2}>
                                        <Button variant="outlined" onClick={this.loadMoreData}>
                                            Show More
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    )}

                    {!tableUpdating && reportData.length === 0 && (
                        <Box p={3} textAlign="center">
                            <Typography color="textSecondary">
                                No cost movement data found for this financial year.
                            </Typography>
                        </Box>
                    )}
                </Paper>
            </Box>
        )
    }
}

export default FixedAssetCostRegister
