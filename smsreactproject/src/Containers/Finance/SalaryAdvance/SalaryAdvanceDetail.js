import React, { Component } from 'react'
import { Paper, Box, Grid, Button, Chip, Typography, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableHead, TableRow } from '@material-ui/core';
import { Link, withRouter } from 'react-router-dom';
import classNames from 'classnames';

import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { numberWithCommas, dateFormat, isUserHasPermission, getUrlParam } from 'Includes/functions';


class SalaryAdvanceDetail extends Component {

    constructor() {
        super()
        this.state = {
            advance: null,
            transactions: [],
            amortizationSchedule: [],
            loading: true,
            showAmortization: false,
            transactionColumns: [
                { name: 'id', label: 'ID', options: { display: false } },
                { name: 'transaction_date', label: 'Date' },
                {
                    name: 'transaction_type', label: 'Type', options: {
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
                    name: 'amount', label: 'Amount', options: {
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
                { name: 'source_type', label: 'Source' },
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
    }

    componentDidMount = () => {
        this.loadData()
    }

    loadData = () => {
        const id = getUrlParam(this.props.location.search).id
        const url = `${GET_URL.salaryAdvance.api}${id}/`

        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                const advance = response.data.data || response.data
                this.setState({ advance })
                this.loadTransactions()

                if (advance.advance_type === 'LOAN') {
                    this.loadAmortization()
                }
            } else {
                this.setState({ loading: false })
            }
        }).catch(err => {
            this.setState({ loading: false })
        })
    }

    loadTransactions = () => {
        const id = getUrlParam(this.props.location.search).id
        const url = GET_URL.salaryAdvanceTransaction.api
        const params = { salary_advance: id, limit: 15 }

        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const transactions = response.data.data.data_list || response.data.data || []
                this.setState({ transactions, loading: false })
            } else {
                this.setState({ loading: false })
            }
        }).catch(err => {
            this.setState({ loading: false })
        })
    }

    loadAmortization = () => {
        const id = getUrlParam(this.props.location.search).id
        const url = GET_URL.salaryAdvanceAmortization?.api || 'finance/salary-advance-report/'

        getRequest(url, { report_type: 'amortization', asset_id: id }, this.props).then(response => {
            if (response && response.status === 200) {
                const data = response.data.data || response.data
                this.setState({ amortizationSchedule: data.schedule || data || [] })
            }
        }).catch(err => {
            console.error('Error loading amortization', err)
        })
    }

    render() {
        const { advance, transactions, loading, transactionColumns, amortizationSchedule, showAmortization } = this.state

        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }

        if (!advance) {
            return (
                <Box>
                    <Paper className={classNames('paper-background')}>
                        <Box p={3}>Salary Advance not found</Box>
                    </Paper>
                </Box>
            )
        }

        const statusColors = {
            'APPROVED': '#2196f3',
            'CLOSED': '#4caf50',
            'CANCELLED': '#9e9e9e',
            'PENDING_APPROVAL': '#ff9800',
            'REJECTED': '#f44336',
            'DRAFT': '#607d8b'
        }
        const isLoan = advance.advance_type === 'LOAN'

        return (
            <Box>
                <Paper className={classNames('paper-background', 'mb-20')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                {isLoan ? 'Staff Loan' : 'Salary Advance'} Details
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                {advance.status === 'APPROVED' && isUserHasPermission('salary_advance', 'update') && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        component={Link}
                                        to={`/finance/salary-advance/edit?id=${getUrlParam(this.props.location.search).id}`}
                                        style={{ marginRight: 10 }}
                                    >
                                        Edit
                                    </Button>
                                )}
                                <Button
                                    variant="outlined"
                                    component={Link}
                                    to={Actions.salary_advance.view.url}
                                >
                                    Back to List
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    <Box p={3}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" color="textSecondary">Staff Name</Typography>
                                <Typography variant="h6">{advance.staff_name}</Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2" color="textSecondary">Employee ID</Typography>
                                <Typography variant="h6">{advance.staff_employee_id || 'N/A'}</Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2" color="textSecondary">Type</Typography>
                                <Chip
                                    label={advance.advance_type}
                                    color={isLoan ? 'primary' : 'default'}
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={12}><Divider /></Grid>

                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2" color="textSecondary">Principal Amount</Typography>
                                <Typography variant="h6">{numberWithCommas(parseFloat(advance.total_amount || 0).toFixed(2))}</Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2" color="textSecondary">Total Recovered</Typography>
                                <Typography variant="h6" style={{ color: '#388e3c' }}>
                                    {numberWithCommas(parseFloat(advance.total_recovered || 0).toFixed(2))}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2" color="textSecondary">Outstanding Balance</Typography>
                                <Typography variant="h6" style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                                    {numberWithCommas(parseFloat(advance.outstanding_balance || 0).toFixed(2))}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                                <Chip
                                    label={advance.status}
                                    style={{ backgroundColor: statusColors[advance.status] || '#9e9e9e', color: '#fff' }}
                                />
                            </Grid>
                            {isLoan && (
                                <>
                                    <Grid item xs={12}><Divider /></Grid>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="subtitle2" color="textSecondary">Tenure</Typography>
                                        <Typography variant="body1">{advance.tenure_months} months</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="subtitle2" color="textSecondary">EMI Amount</Typography>
                                        <Typography variant="body1" style={{ fontWeight: 'bold' }}>
                                            {numberWithCommas(parseFloat(advance.emi_amount || advance.effective_recovery_amount || 0).toFixed(2))}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="subtitle2" color="textSecondary">Expected End Date</Typography>
                                        <Typography variant="body1">{advance.expected_end_date || '-'}</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="subtitle2" color="textSecondary">Remaining Installments</Typography>
                                        <Typography variant="body1">{advance.remaining_installments || 0}</Typography>
                                    </Grid>

                                    {amortizationSchedule.length > 0 && (
                                        <Grid item xs={12}>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => this.setState({ showAmortization: true })}
                                            >
                                                View Amortization Schedule
                                            </Button>
                                        </Grid>
                                    )}
                                </>
                            )}
                            <Grid item xs={12}><Divider /></Grid>

                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2" color="textSecondary">
                                    {isLoan ? 'EMI' : 'Monthly Recovery'}
                                </Typography>
                                <Typography variant="body1">
                                    {numberWithCommas(parseFloat(advance.effective_recovery_amount || advance.monthly_recovery_amount || 0).toFixed(2))}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2" color="textSecondary">Start Month</Typography>
                                <Typography variant="body1">{advance.start_month_display}</Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2" color="textSecondary">Approved On</Typography>
                                <Typography variant="body1">{advance.approved_on || '-'}</Typography>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Typography variant="subtitle2" color="textSecondary">Approved By</Typography>
                                <Typography variant="body1">{advance.approved_by_name || '-'}</Typography>
                            </Grid>
                            {(advance.interest_type && advance.interest_type !== 'NONE') && (
                                <>
                                    <Grid item xs={12}><Divider style={{ margin: '10px 0' }} /></Grid>
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle1" color="primary" gutterBottom>
                                            <strong>Interest & Penalty</strong>
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="subtitle2" color="textSecondary">Interest Type</Typography>
                                        <Typography variant="body1">{advance.interest_type}</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="subtitle2" color="textSecondary">Interest Rate</Typography>
                                        <Typography variant="body1">{advance.interest_rate}% p.a.</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="subtitle2" color="textSecondary">Interest Charged</Typography>
                                        <Typography variant="body1" style={{ color: '#ff9800' }}>
                                            {numberWithCommas(parseFloat(advance.total_interest_charged || 0).toFixed(2))}
                                        </Typography>
                                    </Grid>
                                </>
                            )}

                            {parseFloat(advance.penalty_rate || 0) > 0 && (
                                <>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="subtitle2" color="textSecondary">Penalty Rate</Typography>
                                        <Typography variant="body1">{advance.penalty_rate}%</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="subtitle2" color="textSecondary">Penalty Charged</Typography>
                                        <Typography variant="body1" style={{ color: '#f44336' }}>
                                            {numberWithCommas(parseFloat(advance.total_penalty_charged || 0).toFixed(2))}
                                        </Typography>
                                    </Grid>
                                </>
                            )}

                            {advance.auto_deduct_from_payroll && (
                                <Grid item xs={12} md={3}>
                                    <Typography variant="subtitle2" color="textSecondary">Auto Payroll Deduction</Typography>
                                    <Chip size="small" label={`Enabled (Priority: ${advance.deduction_priority})`} color="primary" />
                                </Grid>
                            )}

                            {advance.is_overdue && (
                                <Grid item xs={12}>
                                    <Chip
                                        label={`OVERDUE - ${numberWithCommas(parseFloat(advance.overdue_amount || 0).toFixed(2))} behind schedule`}
                                        style={{ backgroundColor: '#f44336', color: '#fff', marginTop: 10 }}
                                    />
                                </Grid>
                            )}
                        </Grid>

                        {/* ── Recovery / Transaction History ── */}
                        <Divider style={{ margin: '24px 0 16px' }} />
                        <Typography variant="h6" style={{ color: '#1565c0', fontWeight: 600, marginBottom: 16 }}>
                            Recovery &amp; Transaction History
                        </Typography>
                        {transactions.length === 0 ? (
                            <Typography variant="body2" color="textSecondary" style={{ padding: '20px 0', textAlign: 'center' }}>
                                No transactions recorded yet.
                            </Typography>
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow style={{ backgroundColor: '#f5f5f5' }}>
                                        <TableCell style={{ fontWeight: 600 }}>Date</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Type</TableCell>
                                        <TableCell align="right" style={{ fontWeight: 600 }}>Amount</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Source</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Reason</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Remarks</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>Created By</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {transactions.map((txn, idx) => {
                                        const typeColors = {
                                            'ADVANCE': '#2196f3', 'DEBIT': '#2196f3',
                                            'RECOVERY': '#4caf50', 'CREDIT': '#4caf50',
                                            'ADJUSTMENT': '#9e9e9e',
                                            'INTEREST': '#ff9800',
                                            'PENALTY': '#f44336',
                                            'REVERSAL': '#9c27b0'
                                        }
                                        const isDebit = ['ADVANCE', 'DEBIT', 'INTEREST', 'PENALTY'].includes(txn.transaction_type)
                                        const reasonLabels = {
                                            'WRITE_OFF': 'Write-off', 'SETTLEMENT': 'Settlement',
                                            'CORRECTION': 'Correction', 'WAIVER': 'Waiver'
                                        }
                                        return (
                                            <TableRow key={txn.id || idx} hover>
                                                <TableCell>{txn.transaction_date || '-'}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={txn.transaction_type}
                                                        style={{
                                                            backgroundColor: typeColors[txn.transaction_type] || '#9e9e9e',
                                                            color: '#fff', fontSize: 11
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <span style={{ color: isDebit ? '#d32f2f' : '#388e3c', fontWeight: 'bold' }}>
                                                        {isDebit ? '+' : '-'} {numberWithCommas(parseFloat(txn.amount || 0).toFixed(2))}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{txn.source_type || '-'}</TableCell>
                                                <TableCell>
                                                    {txn.transaction_type === 'ADJUSTMENT' && txn.adjustment_reason
                                                        ? (reasonLabels[txn.adjustment_reason] || txn.adjustment_reason)
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>{txn.remarks || '-'}</TableCell>
                                                <TableCell>{txn.created_by_name || '-'}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </Box>
                </Paper>

                <Dialog
                    open={showAmortization}
                    onClose={() => this.setState({ showAmortization: false })}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>Amortization Schedule</DialogTitle>
                    <DialogContent>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>#</TableCell>
                                    <TableCell>Due Date</TableCell>
                                    <TableCell align="right">EMI</TableCell>
                                    <TableCell align="right">Principal</TableCell>
                                    <TableCell align="right">Interest</TableCell>
                                    <TableCell align="right">Balance</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {amortizationSchedule.map((row, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>{row.installment || idx + 1}</TableCell>
                                        <TableCell>{row.due_date}</TableCell>
                                        <TableCell align="right">{numberWithCommas(parseFloat(row.emi || 0).toFixed(2))}</TableCell>
                                        <TableCell align="right">{numberWithCommas(parseFloat(row.principal || 0).toFixed(2))}</TableCell>
                                        <TableCell align="right">{numberWithCommas(parseFloat(row.interest || 0).toFixed(2))}</TableCell>
                                        <TableCell align="right">{numberWithCommas(parseFloat(row.balance || 0).toFixed(2))}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => this.setState({ showAmortization: false })}>Close</Button>
                    </DialogActions>
                </Dialog>
            </Box>
        )
    }
}

export default withRouter(SalaryAdvanceDetail)
