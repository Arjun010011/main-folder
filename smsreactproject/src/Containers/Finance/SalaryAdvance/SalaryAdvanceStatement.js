import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, TextField, Typography } from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import classNames from 'classnames';

import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import { numberWithCommas, dateFormat } from 'Includes/functions';
import { options } from 'Constants';


class SalaryAdvanceStatement extends Component {

    constructor() {
        super()
        const today = new Date()
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)

        this.state = {
            dataList: [],
            grandTotal: null,
            loading: false,
            searching: false,
            fromDate: dateFormat(firstDay, 'YYYY-MM-DD'),
            toDate: dateFormat(today, 'YYYY-MM-DD'),
            columns: [
                { name: 'staff_name', label: 'Staff Name' },
                { name: 'particulars', label: 'Particulars' },
                {
                    name: 'opening_balance', label: 'Opening Balance', options: {
                        customBodyRender: (value) => {
                            const val = parseFloat(value || 0)
                            return (
                                <span style={{ color: val !== 0 ? '#d32f2f' : 'inherit' }}>
                                    {numberWithCommas(val.toFixed(2))}
                                </span>
                            )
                        }
                    }
                },
                {
                    name: 'debit', label: 'Debit (Advance)', options: {
                        customBodyRender: (value) => {
                            const val = parseFloat(value || 0)
                            return val > 0 ? numberWithCommas(val.toFixed(2)) : '-'
                        }
                    }
                },
                {
                    name: 'credit', label: 'Credit (Recovery)', options: {
                        customBodyRender: (value) => {
                            const val = parseFloat(value || 0)
                            return val > 0 ? numberWithCommas(val.toFixed(2)) : '-'
                        }
                    }
                },
                {
                    name: 'closing_balance', label: 'Closing Balance', options: {
                        customBodyRender: (value) => {
                            const val = parseFloat(value || 0)
                            return (
                                <span style={{ color: val > 0 ? '#d32f2f' : '#388e3c', fontWeight: 'bold' }}>
                                    {numberWithCommas(val.toFixed(2))}
                                </span>
                            )
                        }
                    }
                }
            ]
        }
    }

    handleSearch = () => {
        const { fromDate, toDate } = this.state
        if (!fromDate || !toDate) {
            alert('Please select from and to dates')
            return
        }

        this.setState({ searching: true })
        const url = GET_URL.salaryAdvanceStatement.api
        const params = {
            report_type: 'statement',
            from_date: fromDate,
            to_date: toDate
        }

        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    dataList: response.data.data.data || [],
                    grandTotal: response.data.data.grand_total || null,
                    searching: false
                })
            } else {
                this.setState({ searching: false })
            }
        }).catch(err => {
            this.setState({ searching: false })
        })
    }

    render() {
        const { dataList, grandTotal, loading, searching, fromDate, toDate, columns } = this.state

        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }

        return (
            <Paper className={classNames('paper-background')}>
                <Grid container>
                    <Grid item md={12} xs={12} className={classNames('header-align')}>
                        <Box className='heading'>
                            Staff Salary Advance Statement
                        </Box>
                    </Grid>
                </Grid>

                <Box p={3}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                            <TextField
                                label="From Date"
                                type="date"
                                value={fromDate}
                                onChange={(e) => this.setState({ fromDate: e.target.value })}
                                variant="outlined"
                                size="small"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TextField
                                label="To Date"
                                type="date"
                                value={toDate}
                                onChange={(e) => this.setState({ toDate: e.target.value })}
                                variant="outlined"
                                size="small"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={searching ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                                onClick={this.handleSearch}
                                disabled={searching}
                            >
                                {searching ? 'Loading...' : 'Generate Report'}
                            </Button>
                        </Grid>
                    </Grid>
                </Box>

                {dataList.length > 0 && (
                    <Box mt={2}>
                        <AllMUIDataTable
                            title={`Statement: ${fromDate} to ${toDate}`}
                            data={dataList}
                            columns={columns}
                            options={{
                                ...options,
                                selectableRows: 'none',
                                pagination: true,
                                filter: true,
                                search: true,
                                download: true,
                                print: true
                            }}
                        />

                        {grandTotal && (
                            <Box p={2} style={{ backgroundColor: '#f5f5f5', borderRadius: 4, marginTop: 16 }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <Typography variant="h6">Grand Total</Typography>
                                    </Grid>
                                    <Grid item xs={3}>
                                        <Typography variant="body2" color="textSecondary">Opening Balance</Typography>
                                        <Typography variant="h6" style={{ color: '#d32f2f' }}>
                                            {numberWithCommas(parseFloat(grandTotal.opening_balance || 0).toFixed(2))}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={3}>
                                        <Typography variant="body2" color="textSecondary">Total Debit</Typography>
                                        <Typography variant="h6">
                                            {numberWithCommas(parseFloat(grandTotal.debit || 0).toFixed(2))}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={3}>
                                        <Typography variant="body2" color="textSecondary">Total Credit</Typography>
                                        <Typography variant="h6">
                                            {numberWithCommas(parseFloat(grandTotal.credit || 0).toFixed(2))}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={3}>
                                        <Typography variant="body2" color="textSecondary">Closing Balance</Typography>
                                        <Typography variant="h6" style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                                            {numberWithCommas(parseFloat(grandTotal.closing_balance || 0).toFixed(2))}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}
                    </Box>
                )}
            </Paper>
        )
    }
}

export default SalaryAdvanceStatement
