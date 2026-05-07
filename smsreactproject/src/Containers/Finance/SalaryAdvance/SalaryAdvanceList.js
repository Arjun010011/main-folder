import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Chip, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import HistoryIcon from '@material-ui/icons/History';
import { Link, withRouter } from 'react-router-dom';
import classNames from 'classnames';
import Swal from 'sweetalert2'

import AllMUIDataTable from 'Components/AllMUIDataTable';
import ActionColumn from 'Components/ActionColumnNew'
import loadingBar from 'images/loading.gif'
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL, POST_URL } from 'Includes/urls'
import { Actions } from 'Constants/permissions';
import { options } from 'Constants';
import { dateFormat, numberWithCommas, isUserHasPermission } from 'Includes/functions';

const fieldDetails = [
    {
        label: 'Description', name: 'description', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea-desc', default: '', rows: 3, type: 'text_area'
    }
]

class SalaryAdvanceList extends Component {
    constructor(props) {
        super(props)
        this.state = {
            dataList: [],
            loading: true,
            tableUpdating: false,
            options: options,
            enabledActions: [],
            historyModalOpen: false,
            historyList: [],
            historyLoading: false,
            historyPage: 1,
            historyHasMore: true,
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        display: false
                    }
                },
                {
                    name: "staff_name",
                    label: "Staff Name",
                },
                {
                    name: "advance_type",
                    label: "Type",
                    options: {
                        customBodyRender: (value) => {
                            const colors = {
                                'LOAN': '#2196f3',
                                'SALARY_ADVANCE': '#4caf50',
                                'OTHER': '#9e9e9e'
                            }
                            const labels = {
                                'LOAN': 'Loan',
                                'SALARY_ADVANCE': 'Advance',
                                'OTHER': 'Other'
                            }
                            return (
                                <Chip
                                    label={labels[value] || value}
                                    size="small"
                                    style={{ backgroundColor: colors[value] || '#9e9e9e', color: '#fff' }}
                                />
                            )
                        }
                    }
                },
                {
                    name: "total_amount",
                    label: "Principal",
                    options: {
                        customBodyRender: (value) => <span>{numberWithCommas(value)}</span>
                    }
                },
                {
                    name: "outstanding_balance",
                    label: "Outstanding",
                    options: {
                        customBodyRender: (value) => (
                            <Typography
                                color={parseFloat(value || 0) > 0 ? "error" : "textSecondary"}
                                variant="body2"
                                style={{ fontWeight: 'bold' }}
                            >
                                {numberWithCommas(value)}
                            </Typography>
                        )
                    }
                },
                {
                    name: "effective_recovery_amount",
                    label: "EMI/Recovery",
                    options: {
                        customBodyRender: (value, tableMeta) => {
                            const rowData = this.state.dataList[tableMeta.rowIndex]
                            const amount = value || rowData?.monthly_recovery_amount || 0
                            return <span>{numberWithCommas(amount)}</span>
                        }
                    }
                },
                {
                    name: "display_status",
                    label: "Status",
                    options: {
                        customBodyRender: (value, tableMeta) => {
                            const rowData = this.state.dataList[tableMeta.rowIndex]
                            let chipStyle = {}

                            // Status-based styling
                            if (rowData?.status === 'CLOSED') {
                                chipStyle = { backgroundColor: '#4caf50', color: '#fff' }
                            } else if (rowData?.status === 'CANCELLED') {
                                chipStyle = { backgroundColor: '#9e9e9e', color: '#fff' }
                            } else if (rowData?.is_overdue) {
                                chipStyle = { backgroundColor: '#f44336', color: '#fff' }
                            } else if (value === 'Fully Recovered') {
                                chipStyle = { backgroundColor: '#4caf50', color: '#fff' }
                            } else if (value && value.startsWith('Starts')) {
                                chipStyle = { backgroundColor: '#2196f3', color: '#fff' }
                            } else if (value === 'Recovery Pending') {
                                chipStyle = { backgroundColor: '#ff9800', color: '#fff' }
                            } else {
                                chipStyle = { backgroundColor: '#2196f3', color: '#fff' }
                            }

                            // Add overdue indicator
                            const displayValue = rowData?.is_overdue ? `${value} (OVERDUE)` : value

                            return <Chip label={displayValue} size="small" style={chipStyle} />
                        }
                    }
                },
                {
                    name: "status",
                    label: "Raw Status",
                    options: {
                        filter: true,
                        sort: false,
                        viewColumns: false,
                        display: false
                    }
                },
                {
                    name: "start_month_display",
                    label: "Start Month",
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            const rowId = tableMeta.rowData[0];
                            const status = tableMeta.rowData[7]; // status column index (after display_status)
                            const rowData = this.state.dataList.find(d => d.id === rowId);
                            const hasOutstanding = parseFloat(rowData?.outstanding_balance || 0) > 0;
                            const isActive = status === 'APPROVED' && hasOutstanding;

                            return (
                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                                    {/* Add Recovery button - only for active advances with outstanding balance */}
                                    {isActive && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="secondary"
                                            onClick={() => this.props.history.push(`/finance/salary-advance/add-recovery?advance_id=${rowId}`)}
                                            style={{ textTransform: 'none', fontSize: '0.7rem', padding: '2px 8px' }}
                                        >
                                            Add Recovery
                                        </Button>
                                    )}
                                    <ActionColumn
                                        id={rowId}
                                        fieldValues={this.fieldValues(tableMeta.rowData)}
                                        label='Edit Salary Advance'
                                        fieldDetails={fieldDetails}
                                        newViewData={{
                                            redirectToUrl: `/finance/salary-advance/detail`,
                                            params: { id: rowId }
                                        }}
                                        newEditData={{
                                            redirectToUrl: `/finance/salary-advance/edit`,
                                            params: { id: rowId }
                                        }}
                                        deleteUrl={DEL_URL.salaryAdvance.api}
                                        deleteType={this.deleteType}
                                        baseClassName='action-view-bank-width'
                                        enabledActions={this.getActionsForStatus(status)}
                                        history={this.props.history}
                                    />
                                </div>
                            );
                        }
                    }
                }
            ]
        }
    }

    componentDidMount() {
        // initialize default state here if not in constructor
        this.updatePermissions('actions');
        options['rowsPerPageOptions'] = [5, 10, 15, 30, 50, 100]
        options['rowsPerPage'] = 10
        options['serverSide'] = true
        options['onTableChange'] = (action, tableState) => {
            if (action === 'changePage') {
                this.setState({
                    page: tableState.page,
                    tableUpdating: true
                }, () => this.getDataList());
            } else if (action === 'changeRowsPerPage') {
                this.setState({
                    rowsPerPage: tableState.rowsPerPage,
                    page: 0,
                    tableUpdating: true
                }, () => this.getDataList());
            } else if (action === 'search') {
                this.setState({
                    searchText: tableState.searchText,
                    page: 0,
                    tableUpdating: true
                }, () => this.getDataList());
            }
        }
        this.setState({
            options: options,
            page: 0,
            rowsPerPage: 10
        }, () => this.getDataList())
    }

    updatePermissions = (name) => {
        let hasViewPermission = isUserHasPermission('salary_advance', 'view')
        let hasUpdatePermission = isUserHasPermission('salary_advance', 'update')
        let hasDeletePermission = isUserHasPermission('salary_advance', 'delete')

        // Base enabled actions (filtered further per row)
        let enabledActions = []
        if (hasViewPermission) enabledActions.push('view')
        if (hasUpdatePermission) enabledActions.push('edit')
        if (hasDeletePermission) enabledActions.push('delete')

        this.setState({ enabledActions })
    }

    getActionsForStatus = (status) => {
        let actions = [...this.state.enabledActions];

        // CLOSED and CANCELLED are view-only
        if (status === 'CLOSED' || status === 'CANCELLED') {
            actions = actions.filter(a => a === 'view')
        }
        // APPROVED advances can't be deleted but can be viewed
        else if (status === 'APPROVED') {
            actions = actions.filter(a => a !== 'delete')
        }

        return actions;
    }

    fieldValues(rowData) {
        return []
    }

    deleteType = (id) => {
        let dataList = this.state.dataList
        dataList = dataList.filter(data => data.id !== id)
        this.setState({ dataList })
    }

    getDataList = () => {
        const url = GET_URL.salaryAdvance.api
        const { page, rowsPerPage, searchText } = this.state
        const pageno = (page || 0) + 1
        const limit = rowsPerPage || 10

        let params = { is_active: true, limit: limit, pageno: pageno }
        if (searchText) {
            params.search = searchText
        }

        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const data = response.data.data
                const dataList = data.data_list || data.data || []
                const count = data.count || dataList.length

                this.setState({
                    dataList: dataList,
                    count: count,
                    loading: false,
                    tableUpdating: false
                })
            } else {
                this.setState({ loading: false, tableUpdating: false })
            }
        }).catch(err => {
            this.setState({ loading: false, tableUpdating: false })
        })
    }

    handleShowHistory = () => {
        this.setState({ historyModalOpen: true, historyList: [], historyLoading: true, historyPage: 1, historyHasMore: true }, () => this.loadHistoryPage(1, 15))
    }

    loadMoreHistory = () => {
        if (this.state.historyHasMore && !this.state.historyLoading) {
            const nextPage = this.state.historyPage + 1
            this.loadHistoryPage(nextPage, 5)
        }
    }

    handleHistoryScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target
        if (scrollHeight - scrollTop <= clientHeight + 50) {
            this.loadMoreHistory()
        }
    }

    loadHistoryPage = (page, limit) => {
        if (this.state.historyLoading && page > 1) return
        this.setState({ historyLoading: true })
        const url = GET_URL.recoverableAssetHistory.api
        getRequest(url, { salary_advance: true, is_transaction_history: false, pageno: page, limit }, this.props).then(response => {
            if (response && response.status === 200) {
                let responseData = response.data?.data || response.data
                const dataList = responseData.data_list || responseData || []
                const totalCount = responseData.count || 0
                this.setState(prevState => ({
                    historyList: page === 1 ? dataList : [...prevState.historyList, ...dataList],
                    historyPage: page,
                    historyHasMore: (page === 1 ? dataList.length : prevState.historyList.length + dataList.length) < totalCount,
                    historyLoading: false
                }))
            } else {
                this.setState({ historyLoading: false })
            }
        }).catch(() => this.setState({ historyLoading: false }))
    }

    getChangedFields = (prevData, newData) => {
        if (!prevData || !newData) return []
        const changes = []
        const keysToShow = ['total_amount', 'monthly_recovery_amount', 'start_month', 'tenure_months', 'status', 'opening_balance', 'remarks']
        keysToShow.forEach(key => {
            if (prevData[key] !== newData[key]) {
                changes.push({ field: key, old: prevData[key], new: newData[key] })
            }
        })
        return changes
    }

    render() {
        const { loading, dataList, columns, options, tableUpdating, count } = this.state

        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                Salary Advance & Loans
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box className={classNames('header-align')} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <Button variant="outlined" onClick={this.handleShowHistory} style={{ marginRight: '10px', borderRadius: '30px' }}>
                                    <HistoryIcon style={{ marginRight: '5px' }} /> History
                                </Button>
                                {isUserHasPermission('salary_advance', 'create') && <Button
                                    variant="contained"
                                    component={Link} to={Actions.salary_advance.create.url}
                                    className='editbutton-view'
                                ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> Add New</Button>}
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container className={classNames('header-align')}>
                        <Grid item md={12} xs={12}>
                            <Paper>
                                <AllMUIDataTable
                                    key={dataList}
                                    title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                    data={dataList}
                                    columns={columns}
                                    options={options}
                                    count={count || 0}
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>

                {/* History Modal */}
                <Dialog open={this.state.historyModalOpen} onClose={() => this.setState({ historyModalOpen: false })} maxWidth="md" fullWidth>
                    <DialogTitle>Salary Advance History</DialogTitle>
                    <DialogContent onScroll={this.handleHistoryScroll} style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {this.state.historyList.length === 0 && !this.state.historyLoading ? <p>No history records found.</p> : (
                            this.state.historyList.map(item => {
                                const changes = item.action === 'UPDATE' ? this.getChangedFields(item.previous_data, item.new_data) : []
                                const actionColors = { 'CREATE': '#4caf50', 'UPDATE': '#2196f3', 'DELETE': '#f44336' }
                                return (
                                    <Box key={item.id} mb={2} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px' }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="body2">
                                                <strong style={{ color: actionColors[item.action] || '#333' }}>{item.action}</strong> on {new Date(item.performed_at).toLocaleString()}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">By: {item.performed_by_name || '-'}</Typography>
                                        </Box>
                                        {item.action === 'CREATE' && item.new_data && (
                                            <Box mt={1} p={1} style={{ background: '#e8f5e9', borderRadius: '4px' }}>
                                                <Typography variant="caption">
                                                    <strong>Created:</strong> {item.new_data.name || '-'} - {numberWithCommas(item.new_data.total_amount || item.new_data.opening_balance || 0)}
                                                </Typography>
                                            </Box>
                                        )}
                                        {item.action === 'UPDATE' && changes.length > 0 && (
                                            <Box mt={1}>
                                                {changes.map((c, idx) => (
                                                    <Box key={idx} p={1} mb={0.5} style={{ background: '#e3f2fd', borderRadius: '4px' }}>
                                                        <Typography variant="caption">
                                                            <strong>{c.field}:</strong> <span style={{ color: '#d32f2f' }}>{c.old || '(empty)'}</span> → <span style={{ color: '#388e3c' }}>{c.new || '(empty)'}</span>
                                                        </Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        )}
                                    </Box>
                                )
                            })
                        )}
                        {this.state.historyLoading && <Box display="flex" justifyContent="center" p={2}><CircularProgress size={24} /></Box>}
                        {!this.state.historyHasMore && !this.state.historyLoading && this.state.historyList.length > 0 && (
                            <Box display="flex" justifyContent="center" p={2}>
                                <Typography variant="body2" color="textSecondary">— End of history —</Typography>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => this.setState({ historyModalOpen: false })} color="primary">Close</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        )
    }
}

export default withRouter(SalaryAdvanceList)
