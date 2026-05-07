import React, { Component } from 'react'
import { Paper, Box, Grid, Button, Chip, Typography, CircularProgress } from '@material-ui/core';
import { Link, withRouter } from 'react-router-dom';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import classNames from 'classnames';

import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { numberWithCommas, dateFormat, getUrlParam } from 'Includes/functions';
import { options } from 'Constants';


class SalaryAdvanceTransactions extends Component {

    constructor(props) {
        super(props)
        this.state = {
            advanceId: getUrlParam(this.props.location.search).id,
            advance: null,
            transactions: [],
            loading: true,
            tableUpdating: false,
            page: 0,
            rowsPerPage: 10,
            count: 0,
            columns: [
                { name: 'id', label: 'ID', options: { display: false } },
                {
                    name: 'transaction_date',
                    label: 'Date',
                    options: {
                        customBodyRender: (value) => value ? dateFormat(value, 'DD-MM-YYYY') : '-'
                    }
                },
                {
                    name: 'transaction_type',
                    label: 'Type',
                    options: {
                        customBodyRender: (value) => {
                            const colors = {
                                'ADVANCE': '#2196f3',
                                'RECOVERY': '#4caf50',
                                'ADJUSTMENT': '#9e9e9e',
                                'INTEREST': '#ff9800',
                                'PENALTY': '#f44336',
                                'REVERSAL': '#9c27b0'
                            }
                            return (
                                <Chip
                                    size="small"
                                    label={value}
                                    style={{ backgroundColor: colors[value] || '#9e9e9e', color: '#fff' }}
                                />
                            )
                        }
                    }
                },
                {
                    name: 'amount',
                    label: 'Amount',
                    options: {
                        customBodyRender: (value, tableMeta) => {
                            const rowData = this.state.transactions[tableMeta.rowIndex]
                            if (!rowData) return null
                            const type = rowData.transaction_type
                            const isDebit = ['ADVANCE', 'INTEREST', 'PENALTY'].includes(type)
                            return (
                                <span style={{ color: isDebit ? '#d32f2f' : '#388e3c', fontWeight: 'bold' }}>
                                    {isDebit ? '+' : '-'}{numberWithCommas(parseFloat(value || 0).toFixed(2))}
                                </span>
                            )
                        }
                    }
                },

                {
                    name: 'source_type',
                    label: 'Source',
                    options: {
                        customBodyRender: (value) => {
                            const labels = {
                                'MANUAL': 'Manual Entry',
                                'PAYROLL': 'Payroll Deduction',
                                'AUTO': 'Auto-Debit',
                                'SYSTEM': 'System'
                            }
                            return labels[value] || value || '-'
                        }
                    }
                },
                {
                    name: 'adjustment_reason',
                    label: 'Reason',
                    options: {
                        customBodyRender: (value, tableMeta) => {
                            const rowData = this.state.transactions[tableMeta.rowIndex]
                            if (rowData?.transaction_type === 'ADJUSTMENT' && value) {
                                const labels = {
                                    'WRITE_OFF': 'Write-off',
                                    'SETTLEMENT': 'Settlement',
                                    'CORRECTION': 'Correction',
                                    'WAIVER': 'Waiver'
                                }
                                return labels[value] || value
                            }
                            return '-'
                        }
                    }
                },
                { name: 'remarks', label: 'Remarks' },
                { name: 'created_by_name', label: 'Created By' }
            ]
        }
        this.viewUrl = Actions.salary_advance.view.url
    }

    componentDidMount() {
        this.loadData()
    }

    loadData = () => {
        const { advanceId } = this.state

        const advanceUrl = `${GET_URL.salaryAdvance.api}${advanceId}/`
        getRequest(advanceUrl, {}, this.props).then(response => {
            if (response && response.status === 200) {
                const advance = response.data.data || response.data
                this.setState({ advance })
            }
        })

        this.loadTransactions()
    }

    loadTransactions = () => {
        const { advanceId, page, rowsPerPage } = this.state
        const pageno = page + 1

        const url = GET_URL.salaryAdvanceTransaction.api
        const params = {
            salary_advance: advanceId,
            limit: rowsPerPage,
            pageno: pageno
        }

        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const data = response.data.data || response.data
                const transactions = data.data_list || data || []
                const count = data.count || transactions.length

                this.setState({
                    transactions,
                    count,
                    loading: false,
                    tableUpdating: false
                })
            } else {
                this.setState({ loading: false, tableUpdating: false })
            }
        }).catch(() => {
            this.setState({ loading: false, tableUpdating: false })
        })
    }

    handleTableChange = (action, tableState) => {
        if (action === 'changePage') {
            this.setState({ page: tableState.page, tableUpdating: true }, () => this.loadTransactions())
        } else if (action === 'changeRowsPerPage') {
            this.setState({ rowsPerPage: tableState.rowsPerPage, page: 0, tableUpdating: true }, () => this.loadTransactions())
        }
    }

    render() {
        const { loading, advance, transactions, columns, count, tableUpdating } = this.state

        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }

        const tableOptions = {
            ...options,
            selectableRows: 'none',
            serverSide: true,
            count: count,
            rowsPerPage: this.state.rowsPerPage,
            page: this.state.page,
            rowsPerPageOptions: [10, 25, 50],
            onTableChange: this.handleTableChange,
            filter: false
        }

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                Transaction History
                            </Box>
                            {advance && (
                                <Typography variant="subtitle1" color="textSecondary">
                                    {advance.staff_name} - {numberWithCommas(advance.total_amount)}
                                    {' | Outstanding: '}
                                    <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                                        {numberWithCommas(advance.outstanding_balance || 0)}
                                    </span>
                                </Typography>
                            )}
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                <Button
                                    variant="outlined"
                                    component={Link}
                                    to={`/finance/salary-advance/view`}
                                    startIcon={<ArrowBackIcon />}
                                >
                                    Back to List
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    <Grid container className={classNames('header-align')}>
                        <Grid item md={12} xs={12}>
                            <Paper>
                                <AllMUIDataTable
                                    title={tableUpdating ? <CircularProgress size={20} /> : ''}
                                    data={transactions}
                                    columns={columns}
                                    options={tableOptions}
                                    count={count}
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>
        )
    }
}

export default withRouter(SalaryAdvanceTransactions)
