import React, { Component } from 'react'
import {
    Paper, Box, Grid, Button, TextField, MenuItem,
    Table, TableHead, TableRow, TableCell, TableBody,
    Typography, CircularProgress, Chip
} from '@material-ui/core'
import RefreshIcon from '@material-ui/icons/Refresh'
import classNames from 'classnames'
import InfiniteScroll from 'react-infinite-scroller'

import { getRequest } from 'Includes/api/apicall'
import { GET_URL } from 'Includes/urls'
import LoadingGif from 'Components/LoadingGif'


const PAGE_LIMIT = 10

const ACTION_COLORS = {
    LOCKED: '#f44336',
    UNLOCKED: '#4caf50',
    EDITED: '#2196f3',
    CREATE: '#1976d2',
    UPDATE: '#ff9800',
    DELETE: '#d32f2f',
}

const ACTION_OPTIONS = [
    { value: '', label: 'All Actions' },
    { value: 'LOCKED', label: 'Locked' },
    { value: 'UNLOCKED', label: 'Unlocked' },
    { value: 'EDITED', label: 'Edited' },
    { value: 'CREATE', label: 'Created' },
    { value: 'UPDATE', label: 'Updated' },
    { value: 'DELETE', label: 'Deleted' },
]


class FinanceAuditLog extends Component {
    state = {
        data: [],
        totalCount: 0,
        loading: true,
        loadingMore: false,
        pageno: 1,
        hasMore: true,
        moduleFilter: '',
        actionFilter: '',
        // Dynamic module options populated from backend categories
        moduleOptions: [
            { value: '', label: 'All Modules' },
            { value: 'fixed_assets', label: 'Fixed Assets' },
        ],
    }

    componentDidMount() {
        this.loadAuditLog()
    }

    loadAuditLog = () => {
        this.setState({ loading: true, data: [], pageno: 1, hasMore: true }, () => {
            this.fetchPage(1)
        })
    }

    fetchPage = (page, append = false) => {
        const { moduleFilter, actionFilter, data } = this.state
        const params = { limit: PAGE_LIMIT, pageno: page }
        if (moduleFilter) params.module = moduleFilter
        if (actionFilter) params.action = actionFilter

        getRequest(GET_URL.financeAuditLog.api, params, this.props)
            .then(res => {
                const newState = { loading: false, loadingMore: false }
                if (res?.status === 200 && res.data?.data) {
                    const list = res.data.data.data_list || []
                    const total = res.data.data.count || 0
                    const newData = append ? [...data, ...list] : list
                    newState.data = newData
                    newState.totalCount = total
                    newState.hasMore = newData.length < total
                    newState.pageno = page

                    // Build module options from categories returned by backend
                    const categories = res.data.data.categories || []
                    if (categories.length > 0) {
                        const opts = [
                            { value: '', label: 'All Modules' },
                            { value: 'fixed_assets', label: 'Fixed Assets' },
                        ]
                        categories.forEach(cat => {
                            opts.push({ value: String(cat.id), label: cat.name })
                        })
                        newState.moduleOptions = opts
                    }
                }
                this.setState(newState)
            })
            .catch(() => this.setState({ loading: false, loadingMore: false }))
    }

    loadMore = () => {
        if (this.state.loadingMore || !this.state.hasMore) return
        this.setState({ loadingMore: true })
        this.fetchPage(this.state.pageno + 1, true)
    }

    handleFilterChange = (key, value) => {
        this.setState({ [key]: value }, this.loadAuditLog)
    }

    formatDate = (isoStr) => {
        if (!isoStr) return '–'
        try { return new Date(isoStr).toLocaleString() } catch { return isoStr }
    }

    renderDetails = (entry) => {
        if (!entry.details) return '–'

        // For Fixed Assets – show remarks
        if (entry.module === 'Fixed Assets') {
            return entry.details.remarks || '–'
        }

        // For Recoverable Assets categories – show changed fields summary
        const prev = entry.details.previous_data
        const next = entry.details.new_data
        if (!prev && next) return 'Created'
        if (prev && !next) return 'Deleted'
        if (prev && next) {
            const changes = []
            for (const key of Object.keys(next)) {
                if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
                    changes.push(key.replace(/_/g, ' '))
                }
            }
            return changes.length > 0
                ? `Changed: ${changes.slice(0, 3).join(', ')}${changes.length > 3 ? ` +${changes.length - 3} more` : ''}`
                : 'No visible changes'
        }
        return '–'
    }

    render() {
        const { data, loading, hasMore, loadingMore, moduleFilter, actionFilter, totalCount, moduleOptions } = this.state

        if (loading && data.length === 0) return <LoadingGif />

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    {/* Header */}
                    <Grid container>
                        <Grid item md={6} xs={12} className="header-align">
                            <Box className="heading">Audit Log</Box>
                        </Grid>
                    </Grid>

                    {/* Filters */}
                    <Grid container spacing={3} style={{ padding: 20 }}>
                        <Grid item md={3} xs={12}>
                            <TextField
                                fullWidth select
                                label="Module"
                                value={moduleFilter}
                                onChange={e => this.handleFilterChange('moduleFilter', e.target.value)}
                                variant="outlined"
                            >
                                {moduleOptions.map(o => (
                                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item md={3} xs={12}>
                            <TextField
                                fullWidth select
                                label="Action"
                                value={actionFilter}
                                onChange={e => this.handleFilterChange('actionFilter', e.target.value)}
                                variant="outlined"
                            >
                                {ACTION_OPTIONS.map(o => (
                                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box display="flex" justifyContent="flex-end" alignItems="center">
                                <Typography variant="body2" color="textSecondary" style={{ marginRight: 15 }}>
                                    {totalCount} record{totalCount !== 1 ? 's' : ''}
                                </Typography>
                                <Button
                                    variant="outlined"
                                    onClick={this.loadAuditLog}
                                    style={{ borderRadius: 30 }}
                                >
                                    <RefreshIcon style={{ marginRight: 5 }} /> Refresh
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Table */}
                    <Box
                        id="audit-log-scroll"
                        style={{ maxHeight: '70vh', overflow: 'auto', padding: '0 20px 20px 20px' }}
                    >
                        {loading ? (
                            <Box display="flex" justifyContent="center" p={3}>
                                <CircularProgress />
                            </Box>
                        ) : data.length === 0 ? (
                            <Box p={3} textAlign="center">
                                <Typography color="textSecondary">
                                    No audit log entries found.
                                </Typography>
                            </Box>
                        ) : (
                            <InfiniteScroll
                                pageStart={0}
                                loadMore={this.loadMore}
                                hasMore={hasMore && !loadingMore}
                                useWindow={false}
                                getScrollParent={() => document.getElementById('audit-log-scroll')}
                                threshold={100}
                                loader={
                                    <Box key="loader" display="flex" justifyContent="center" p={2}>
                                        <Typography color="textSecondary" variant="caption">Loading more...</Typography>
                                    </Box>
                                }
                            >
                                <Table size="small" stickyHeader style={{ minWidth: 900 }}>
                                    <TableHead>
                                        <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell style={{ minWidth: 160, whiteSpace: 'nowrap' }}>Date/Time</TableCell>
                                            <TableCell style={{ minWidth: 160 }}>Module</TableCell>
                                            <TableCell style={{ minWidth: 90 }}>Action</TableCell>
                                            <TableCell style={{ minWidth: 250 }}>Entity</TableCell>
                                            <TableCell style={{ minWidth: 120 }}>Performed By</TableCell>
                                            <TableCell style={{ minWidth: 140 }}>Details</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {data.map((entry, idx) => (
                                            <TableRow key={idx} hover>
                                                <TableCell style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                    {this.formatDate(entry.performed_at)}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={entry.module}
                                                        variant="outlined"
                                                        style={{ fontSize: '0.75rem', maxWidth: '100%' }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={entry.action}
                                                        style={{
                                                            backgroundColor: ACTION_COLORS[entry.action] || '#9e9e9e',
                                                            color: 'white',
                                                            fontSize: '0.75rem'
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell style={{ fontSize: '0.85rem' }}>
                                                    {entry.entity_name}
                                                </TableCell>
                                                <TableCell style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                                    {entry.performed_by || '–'}
                                                </TableCell>
                                                <TableCell style={{ fontSize: '0.8rem', wordBreak: 'break-word' }}>
                                                    {this.renderDetails(entry)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </InfiniteScroll>
                        )}
                    </Box>
                </Paper>
            </Box>
        )
    }
}

export default FinanceAuditLog
