import React, { Component } from 'react'
import {
    Paper,
    Box,
    Grid,
    Button,
    MenuItem,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography,
    CircularProgress,
    TextField,
    Tabs,
    Tab,
    InputAdornment,
    IconButton,
    Menu,
    ListItemIcon,
    ListItemText
} from '@material-ui/core'
import RefreshIcon from '@material-ui/icons/Refresh'
import GetAppIcon from '@material-ui/icons/GetApp'
import PrintIcon from '@material-ui/icons/Print'
import SearchIcon from '@material-ui/icons/Search'
import ClearIcon from '@material-ui/icons/Clear'
import SortIcon from '@material-ui/icons/Sort'
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward'
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward'
import classNames from 'classnames'

import { getRequest, postRequest } from 'Includes/api/apicall'
import { GET_URL, POST_URL } from 'Includes/urls'
import { numberWithCommas } from 'Includes/functions'
import LoadingGif from 'Components/LoadingGif'
import InfiniteScroll from 'react-infinite-scroller'
import SummaryCard from '../Finance/Components/SummaryCard'

import './styles.scss'

const DEBOUNCE_DELAY = 500

const CATEGORY_TABS = [
    { value: '', label: 'All' },
    { value: 'SCHOOL', label: 'School' },
    { value: 'PU_COLLEGE', label: 'PU College' },
    { value: 'DEGREE_COLLEGE', label: 'Degree' },
    { value: 'MCOM', label: 'M.Com' },
]

class MonthlyPayrollTable extends Component {
    constructor(props) {
        super(props)
        const today = new Date()
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        this.state = {
            loading: true,
            tableUpdating: false,

            year: prevMonth.getFullYear(),
            month: prevMonth.getMonth() + 1,

            salaryData: [],
            summary: null,

            pageNo: 1,
            limit: 10,
            totalCount: 0,
            hasMore: true,
            isFetchingMore: false,

            activeTab: 0,
            categoryFilter: '',
            searchTerm: '',
            salaryMin: '',
            salaryMax: '',
            ordering: 'staff_name',

            sortAnchorEl: null,
        }
        this.searchDebounceTimer = null
    }

    componentDidMount() {
        this.loadSalaries()
    }

    getMonthOptions = () => {
        return [
            { value: 1, label: 'January' },
            { value: 2, label: 'February' },
            { value: 3, label: 'March' },
            { value: 4, label: 'April' },
            { value: 5, label: 'May' },
            { value: 6, label: 'June' },
            { value: 7, label: 'July' },
            { value: 8, label: 'August' },
            { value: 9, label: 'September' },
            { value: 10, label: 'October' },
            { value: 11, label: 'November' },
            { value: 12, label: 'December' },
        ]
    }

    getYearOptions = () => {
        const currentYear = new Date().getFullYear()
        const years = []
        for (let y = currentYear - 2; y <= currentYear + 1; y++) {
            years.push({ value: y, label: y.toString() })
        }
        return years
    }

    handleMonthChange = (e) => {
        this.setState({ month: e.target.value }, () => this.loadSalaries())
    }

    handleYearChange = (e) => {
        this.setState({ year: e.target.value }, () => this.loadSalaries())
    }

    generateSalaries = () => {
        const { year, month } = this.state
        this.setState({ tableUpdating: true })

        const data = { year, month }
        postRequest(POST_URL.generatestaffsalary.api, data, this.props)
            .then(res => {
                if (res?.status !== 200) {
                    this.setState({ tableUpdating: false })
                    return
                }
                // Reload salaries after generation
                this.loadSalaries()
            })
            .catch(() => this.setState({ tableUpdating: false }))
    }

    loadSalaries = () => {
        const { year, month, limit, categoryFilter, searchTerm, salaryMin, salaryMax, ordering } = this.state
        if (!year || !month) return

        this.setState({
            tableUpdating: true,
            pageNo: 1,
            salaryData: [],
            hasMore: true
        })

        const params = {
            year,
            month,
            limit,
            pageno: 1
        }

        if (searchTerm.trim()) params.search = searchTerm.trim()
        if (categoryFilter) params.staff_category = categoryFilter
        if (salaryMin) params.salary_min = salaryMin
        if (salaryMax) params.salary_max = salaryMax
        if (ordering) params.ordering = ordering

        getRequest(GET_URL.staffmonthlysalary.api, params, this.props)
            .then(res => {
                if (res?.status !== 200) {
                    this.setState({ tableUpdating: false, loading: false })
                    return
                }

                const data = res.data.data || {}

                this.setState({
                    salaryData: data.data_list || [],
                    summary: data.summary || null,
                    totalCount: data.count || 0,
                    hasMore: !!data.next,
                    tableUpdating: false,
                    loading: false
                })
            })
            .catch(() => this.setState({ tableUpdating: false, loading: false }))
    }

    loadMoreData = () => {
        const { year, month, pageNo, hasMore, isFetchingMore, limit, categoryFilter, searchTerm, salaryMin, salaryMax, ordering } = this.state
        if (!hasMore || isFetchingMore || this.fetchLock) return

        this.fetchLock = true
        const nextPage = pageNo + 1

        this.setState({ isFetchingMore: true })

        const params = {
            year,
            month,
            limit,
            pageno: nextPage
        }

        if (searchTerm.trim()) params.search = searchTerm.trim()
        if (categoryFilter) params.staff_category = categoryFilter
        if (salaryMin) params.salary_min = salaryMin
        if (salaryMax) params.salary_max = salaryMax
        if (ordering) params.ordering = ordering

        getRequest(GET_URL.staffmonthlysalary.api, params, this.props)
            .then(res => {
                this.fetchLock = false
                if (res?.status !== 200) {
                    this.setState({ isFetchingMore: false })
                    return
                }

                const data = res.data.data || {}
                const newData = data.data_list || []

                this.setState(prev => ({
                    salaryData: [...prev.salaryData, ...newData],
                    pageNo: nextPage,
                    hasMore: !!data.next,
                    isFetchingMore: false
                }))
            })
            .catch(() => {
                this.fetchLock = false
                this.setState({ isFetchingMore: false })
            })
    }

    handleTabChange = (event, newValue) => {
        const category = CATEGORY_TABS[newValue]?.value || ''
        this.setState({
            activeTab: newValue,
            categoryFilter: category
        }, () => this.loadSalaries())
    }

    handleSearchChange = (e) => {
        const value = e.target.value
        this.setState({ searchTerm: value })

        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer)
        }
        this.searchDebounceTimer = setTimeout(() => {
            this.loadSalaries()
        }, DEBOUNCE_DELAY)
    }

    clearSearch = () => {
        this.setState({ searchTerm: '' }, () => this.loadSalaries())
    }

    handleSalaryMinChange = (e) => {
        this.setState({ salaryMin: e.target.value })
    }

    handleSalaryMaxChange = (e) => {
        this.setState({ salaryMax: e.target.value })
    }

    applySalaryRange = () => {
        this.loadSalaries()
    }

    clearFilters = () => {
        this.setState({
            searchTerm: '',
            salaryMin: '',
            salaryMax: '',
            ordering: 'staff_name'
        }, () => this.loadSalaries())
    }

    handleSortMenuOpen = (event) => {
        this.setState({ sortAnchorEl: event.currentTarget })
    }

    handleSortMenuClose = () => {
        this.setState({ sortAnchorEl: null })
    }

    handleSortChange = (ordering) => {
        this.setState({
            ordering,
            sortAnchorEl: null
        }, () => this.loadSalaries())
    }

    getSortLabel = () => {
        const { ordering } = this.state
        const labels = {
            'staff_name': 'Name (A-Z)',
            '-staff_name': 'Name (Z-A)',
            'net_salary': 'Salary (Low→High)',
            '-net_salary': 'Salary (High→Low)',
        }
        return labels[ordering] || 'Sort'
    }

    goToAttendance = () => {
        if (this.props.history) {
            this.props.history.push('/payroll/attendance/view')
        } else {
            window.location.href = '/payroll/attendance/view'
        }
    }

    renderSummaryCards = () => {
        const { summary } = this.state
        if (!summary) return null

        const cards = [
            { label: 'Total Net Salary', value: `${numberWithCommas(summary.total_net_salary || 0)}`, color: '#4CAF50' },
            { label: 'Total Gross', value: `${numberWithCommas(summary.total_gross || 0)}`, color: '#2196F3' },
            { label: 'Total PF', value: `${numberWithCommas(summary.total_pf || 0)}`, color: '#FF9800' },
            { label: 'Total Deductions', value: `${numberWithCommas(summary.total_deduction || 0)}`, color: '#f44336' },
            { label: 'Staff Count', value: summary.staff_count || 0, color: '#9C27B0' },
        ]

        return (
            <Grid container spacing={2} style={{ marginBottom: 24 }}>
                {cards.map((card, index) => (
                    <Grid item xs={12} sm={6} md={2} key={index}>
                        <SummaryCard
                            label={card.label}
                            value={card.value}
                            color={card.color}
                        />
                    </Grid>
                ))}
            </Grid>
        )
    }

    renderTable = () => {
        const { salaryData } = this.state

        const columns = [
            { id: 'sl', label: 'SL', width: 40 },
            { id: 'staff_name', label: 'Staff Name', width: 150 },
            { id: 'present_days', label: 'Present Days', width: 100 },
            { id: 'working_days', label: 'Working Days', width: 100 },
            { id: 'gross_salary', label: 'Gross', width: 90 },
            { id: 'hra', label: 'HRA', width: 70 },
            { id: 'ba', label: 'BA', width: 70 },
            { id: 'da', label: 'DA', width: 70 },
            { id: 'ba_da', label: 'BA+DA', width: 80 },
            { id: 'other_allowance', label: 'Other', width: 70 },
            { id: 'pf', label: 'PF', width: 70 },
            { id: 'esic', label: 'ESIC', width: 70 },
            { id: 'pt', label: 'PT', width: 60 },
            { id: 'lic', label: 'LIC', width: 60 },
            { id: 'total_deduction', label: 'Total Ded.', width: 90 },
            { id: 'net_salary', label: 'Net Salary', width: 100 },
            { id: 'account_number', label: 'A/C No', width: 120 },
        ]

        return (
            <div style={{ overflowX: 'auto' }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            {columns.map(col => (
                                <TableCell
                                    key={col.id}
                                    style={{
                                        minWidth: col.width,
                                        fontWeight: 'bold',
                                        backgroundColor: '#1976d2',
                                        color: '#fff'
                                    }}
                                >
                                    {col.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {salaryData.map((row, index) => (
                            <TableRow key={row.id} hover>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{row.staff_name}</TableCell>
                                <TableCell>{row.present_days}</TableCell>
                                <TableCell>{row.working_days}</TableCell>
                                <TableCell>{numberWithCommas(row.gross_salary)}</TableCell>
                                <TableCell>{numberWithCommas(row.hra)}</TableCell>
                                <TableCell>{numberWithCommas(row.ba)}</TableCell>
                                <TableCell>{numberWithCommas(row.da)}</TableCell>
                                <TableCell>{numberWithCommas(row.ba_da)}</TableCell>
                                <TableCell>{numberWithCommas(row.other_allowance)}</TableCell>
                                <TableCell>{numberWithCommas(row.pf)}</TableCell>
                                <TableCell>{numberWithCommas(row.esic)}</TableCell>
                                <TableCell>{numberWithCommas(row.pt)}</TableCell>
                                <TableCell>{numberWithCommas(row.lic)}</TableCell>
                                <TableCell style={{ color: '#f44336', fontWeight: 'bold' }}>
                                    {numberWithCommas(row.total_deduction)}
                                </TableCell>
                                <TableCell style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                                    {numberWithCommas(row.net_salary)}
                                </TableCell>
                                <TableCell>{row.account_number}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )
    }

    render() {
        const {
            loading,
            tableUpdating,
            year,
            month,
            totalCount,
            hasMore,
            isFetchingMore,
            salaryData
        } = this.state

        if (loading) {
            return <LoadingGif />
        }

        return (
            <Paper className="payroll-monthly-table">
                <Box p={3}>
                    <Grid container spacing={2} alignItems="center" style={{ marginBottom: 24 }}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h5" style={{ fontWeight: 600 }}>
                                Monthly Payroll
                            </Typography>
                        </Grid>
                        <Grid item xs={6} md={2}>
                            <TextField
                                select
                                fullWidth
                                label="Month"
                                value={month}
                                onChange={this.handleMonthChange}
                                variant="outlined"
                                size="small"
                            >
                                {this.getMonthOptions().map(opt => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={6} md={2}>
                            <TextField
                                select
                                fullWidth
                                label="Year"
                                value={year}
                                onChange={this.handleYearChange}
                                variant="outlined"
                                size="small"
                            >
                                {this.getYearOptions().map(opt => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={2}>
                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                startIcon={tableUpdating ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
                                onClick={this.generateSalaries}
                                disabled={tableUpdating}
                            >
                                Generate
                            </Button>
                        </Grid>
                    </Grid>

                    {this.renderSummaryCards()}

                    <Box mb={2}>
                        <Tabs
                            value={this.state.activeTab}
                            onChange={this.handleTabChange}
                            indicatorColor="primary"
                            textColor="primary"
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            {CATEGORY_TABS.map((tab, idx) => (
                                <Tab key={tab.value} label={tab.label} />
                            ))}
                        </Tabs>
                    </Box>

                    <Grid container spacing={2} style={{ marginBottom: 16 }} alignItems="center">
                        <Grid item xs={12} sm={4} md={3}>
                            <TextField
                                fullWidth
                                size="small"
                                variant="outlined"
                                placeholder="Search by staff name..."
                                value={this.state.searchTerm}
                                onChange={this.handleSearchChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon color="action" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: this.state.searchTerm && (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={this.clearSearch}>
                                                <ClearIcon fontSize="small" />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3} md={2}>
                            <TextField
                                fullWidth
                                size="small"
                                variant="outlined"
                                type="number"
                                placeholder="Min Salary"
                                value={this.state.salaryMin}
                                onChange={this.handleSalaryMinChange}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={6} sm={3} md={2}>
                            <TextField
                                fullWidth
                                size="small"
                                variant="outlined"
                                type="number"
                                placeholder="Max Salary"
                                value={this.state.salaryMax}
                                onChange={this.handleSalaryMaxChange}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={6} sm={2} md={1}>
                            <Button
                                fullWidth
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={this.applySalaryRange}
                            >
                                Apply
                            </Button>
                        </Grid>
                        <Grid item xs={6} sm={2} md={2}>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<SortIcon />}
                                onClick={this.handleSortMenuOpen}
                            >
                                {this.getSortLabel()}
                            </Button>
                            <Menu
                                anchorEl={this.state.sortAnchorEl}
                                open={Boolean(this.state.sortAnchorEl)}
                                onClose={this.handleSortMenuClose}
                            >
                                <MenuItem onClick={() => this.handleSortChange('staff_name')}>
                                    <ListItemIcon><ArrowUpwardIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Name (A-Z)</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => this.handleSortChange('-staff_name')}>
                                    <ListItemIcon><ArrowDownwardIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Name (Z-A)</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => this.handleSortChange('-net_salary')}>
                                    <ListItemIcon><ArrowDownwardIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Salary (High→Low)</ListItemText>
                                </MenuItem>
                                <MenuItem onClick={() => this.handleSortChange('net_salary')}>
                                    <ListItemIcon><ArrowUpwardIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Salary (Low→High)</ListItemText>
                                </MenuItem>
                            </Menu>
                        </Grid>
                        {(this.state.searchTerm || this.state.salaryMin || this.state.salaryMax) && (
                            <Grid item xs={12} sm={2} md={2}>
                                <Button
                                    size="small"
                                    onClick={this.clearFilters}
                                    startIcon={<ClearIcon />}
                                >
                                    Clear Filters
                                </Button>
                            </Grid>
                        )}
                    </Grid>

                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1" color="textSecondary">
                            Showing {salaryData.length} of {totalCount} records
                        </Typography>
                        <Box>
                            <Button
                                startIcon={<PrintIcon />}
                                size="small"
                                style={{ marginRight: 8 }}
                            >
                                Print
                            </Button>
                            <Button
                                startIcon={<GetAppIcon />}
                                size="small"
                            >
                                Download
                            </Button>
                        </Box>
                    </Box>

                    {tableUpdating ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    ) : salaryData.length === 0 ? (
                        <Box textAlign="center" py={4}>
                            <Typography color="textSecondary">
                                No salary records found. Click "Generate" to create salary records for this month.
                            </Typography>
                        </Box>
                    ) : (
                        <div style={{ maxHeight: 500, overflow: 'auto' }}>
                            <InfiniteScroll
                                pageStart={0}
                                loadMore={this.loadMoreData}
                                hasMore={hasMore && !isFetchingMore}
                                useWindow={false}
                                threshold={100}
                            >
                                {this.renderTable()}
                                {isFetchingMore && (
                                    <Box display="flex" justifyContent="center" py={2}>
                                        <CircularProgress size={24} />
                                    </Box>
                                )}
                            </InfiniteScroll>
                        </div>
                    )}

                    {hasMore && !isFetchingMore && salaryData.length > 0 && (
                        <Box display="flex" justifyContent="center" mt={2}>
                            <Button
                                variant="outlined"
                                onClick={this.loadMoreData}
                            >
                                Show More
                            </Button>
                        </Box>
                    )}
                </Box>
            </Paper>
        )
    }
}

export default MonthlyPayrollTable
