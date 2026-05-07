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
    Typography,
    CircularProgress
} from '@material-ui/core'
import GetAppIcon from '@material-ui/icons/GetApp'
import PrintIcon from '@material-ui/icons/Print'
import classNames from 'classnames'

import { getRequest } from 'Includes/api/apicall'
import { GET_URL } from 'Includes/urls'
import { numberWithCommas } from 'Includes/functions'
import LoadingGif from 'Components/LoadingGif'
import InfiniteScroll from 'react-infinite-scroller'
import SummaryCard from './Components/SummaryCard'

class FixedAssetRegister extends Component {
    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            tableUpdating: false,

            financial_year: '',
            financialYearOptions: [],

            reportData: [],
            totals: null,

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

    componentWillUnmount() {
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
        const { limit, financial_year } = this.state
        if (!financial_year) return

        this.setState({
            tableUpdating: true,
            pageNo: 1,
            reportData: [],
            hasMore: true
        })

        const params = {
            financial_year,
            limit,
            pageno: 1
        }

        getRequest(GET_URL.fixedAssetRegister.api, params, this.props)
            .then(res => {
                if (res?.status !== 200) {
                    this.setState({ tableUpdating: false })
                    return
                }

                const data = res.data.data || {}

                this.setState({
                    reportData: data.register || [],
                    totals: data.totals || null,
                    totalCount: data.count || 0,
                    hasMore: !!data.next,
                    tableUpdating: false
                })
            })
            .catch(() => this.setState({ tableUpdating: false }))
    }

    loadMoreData = () => {
        const { pageNo, financial_year, hasMore, isFetchingMore } = this.state
        if (!hasMore || isFetchingMore || this.fetchLock) return

        this.fetchLock = true;
        const nextPage = pageNo + 1
        this.setState({ isFetchingMore: true })

        const params = {
            financial_year,
            limit: 5,
            pageno: nextPage
        }

        getRequest(GET_URL.fixedAssetRegister.api, params, this.props)
            .then(res => {
                this.fetchLock = false;
                if (res?.status !== 200) {
                    this.setState({ isFetchingMore: false })
                    return
                }

                const data = res.data.data || {}
                const newItems = data.register || []

                this.setState(prev => {
                    const existingCodes = new Set(prev.reportData.map(item => item.asset_code));
                    const uniqueNewItems = newItems.filter(item => !existingCodes.has(item.asset_code));

                    return {
                        reportData: [...prev.reportData, ...uniqueNewItems],
                        pageNo: nextPage,
                        hasMore: !!data.next,
                        isFetchingMore: false
                    }
                })
            })
            .catch(() => {
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

        getRequest(GET_URL.fixedAssetRegister.api, params, prop)
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

        getRequest(GET_URL.fixedAssetRegister.api, params, prop)
            .then(res => {
                this.setState({ loading: false })
                if (res?.status === 200) {
                    const url = window.URL.createObjectURL(new Blob([res.data]))
                    const link = document.createElement('a')
                    link.href = url
                    link.setAttribute('download', `Fixed_Asset_Register_${financial_year}.xlsx`)
                    document.body.appendChild(link)
                    link.click()
                    link.remove()
                } else {
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
            totalCount,
            hasMore,
            isFetchingMore
        } = this.state

        if (loading) return <LoadingGif />

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className="header-align">
                            <Box className="heading">Fixed Asset Register</Box>
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

                    {/* ===== Summary Cards ===== */}
                    {reportData.length > 0 && totals && (
                        <Grid container spacing={2} style={{ padding: '0 20px 20px 20px' }}>
                            <Grid item xs={12} sm={6} md>
                                <SummaryCard
                                    label="ORIGINAL COST"
                                    value={numberWithCommas(totals.original_cost)}
                                    color="#006064"
                                    bgColor="#e0f7fa"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md>
                                <SummaryCard
                                    label="OPENING VALUE"
                                    value={numberWithCommas(totals.opening_value)}
                                    color="#1565c0"
                                    bgColor="#e3f2fd"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md>
                                <SummaryCard
                                    label="ADDITIONS"
                                    value={numberWithCommas(totals.additions)}
                                    color="#2e7d32"
                                    bgColor="#f1f8e9"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md>
                                <SummaryCard
                                    label="DEPRECIATION"
                                    value={numberWithCommas(totals.depreciation)}
                                    color="#c62828"
                                    bgColor="#ffebee"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md>
                                <SummaryCard
                                    label="CLOSING VALUE"
                                    value={numberWithCommas(totals.closing_value)}
                                    color="#6a1b9a"
                                    bgColor="#f3e5f5"
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
                                id="fixed-asset-scroll-container"
                                style={{
                                    maxHeight: '75vh',
                                    overflowY: 'auto'
                                }}
                            >
                                <InfiniteScroll
                                    pageStart={0}
                                    loadMore={this.loadMoreData}
                                    hasMore={hasMore && !isFetchingMore}
                                    useWindow={false}
                                    getScrollParent={() => document.getElementById('fixed-asset-scroll-container')}
                                    threshold={150}
                                    loader={
                                        <Box key="loader" display="flex" justifyContent="center" p={2}>
                                            <Typography color="textSecondary">Loading more assets...</Typography>
                                        </Box>
                                    }
                                >
                                    <Table size="small" stickyHeader>
                                        <TableHead>
                                            <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                                <TableCell>Asset Code</TableCell>
                                                <TableCell>Asset Name</TableCell>
                                                <TableCell>Group</TableCell>
                                                <TableCell>Purchase Date</TableCell>
                                                <TableCell align="right">Original Cost</TableCell>
                                                <TableCell align="right">Opening Value</TableCell>
                                                <TableCell align="right">Additions</TableCell>
                                                <TableCell align="right">Depreciation</TableCell>
                                                <TableCell align="right">Closing Value</TableCell>
                                                <TableCell>Status</TableCell>
                                            </TableRow>
                                        </TableHead>

                                        <TableBody>
                                            {reportData.map((row, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell>{row.asset_code}</TableCell>
                                                    <TableCell>{row.asset_name}</TableCell>
                                                    <TableCell>{row.asset_group_name}</TableCell>
                                                    <TableCell>{row.purchase_date}</TableCell>
                                                    <TableCell align="right">{numberWithCommas(row.original_cost)}</TableCell>
                                                    <TableCell align="right">{numberWithCommas(row.opening_value)}</TableCell>
                                                    <TableCell align="right">{numberWithCommas(row.additions)}</TableCell>
                                                    <TableCell align="right">{numberWithCommas(row.depreciation)}</TableCell>
                                                    <TableCell align="right">{numberWithCommas(row.closing_value)}</TableCell>
                                                    <TableCell>{row.status}</TableCell>
                                                </TableRow>
                                            ))}

                                            {totals && !hasMore && (
                                                <TableRow style={{ backgroundColor: '#e3f2fd' }}>
                                                    <TableCell colSpan={4}><strong>TOTAL</strong></TableCell>
                                                    <TableCell align="right"><strong>{numberWithCommas(totals.original_cost)}</strong></TableCell>
                                                    <TableCell align="right"><strong>{numberWithCommas(totals.opening_value)}</strong></TableCell>
                                                    <TableCell align="right"><strong>{numberWithCommas(totals.additions)}</strong></TableCell>
                                                    <TableCell align="right"><strong>{numberWithCommas(totals.depreciation)}</strong></TableCell>
                                                    <TableCell align="right"><strong>{numberWithCommas(totals.closing_value)}</strong></TableCell>
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

                                {hasMore && !isFetchingMore && (
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
                                No data found. Run depreciation first.
                            </Typography>
                        </Box>
                    )}
                </Paper>
            </Box>
        )
    }
}

export default FixedAssetRegister
