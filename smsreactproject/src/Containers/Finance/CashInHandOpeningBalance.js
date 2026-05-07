import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, numberWithCommas } from 'Includes/functions';
import { options } from 'Constants';

class CashInHandOpeningBalance extends Component {
    constructor() {
        super()
        this.state = {
            dataList: [],
            loading: true,
            tableUpdating: false,
            page: 0,
            rowsPerPage: 10,
            count: 0,
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
                    name: "opening_balance",
                    label: "Opening Balance",
                    options: {
                        sort: true,
                        customBodyRender: (value) => {
                            return numberWithCommas(parseFloat(value || 0).toFixed(2))
                        }
                    }
                },
                {
                    name: "opening_date",
                    label: "Opening Date",
                    options: {
                        sort: true,
                        customBodyRender: (value) => {
                            if (!value) return 'N/A'
                            return new Date(value).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                            })
                        }
                    }
                },
            ]
        }
    }

    componentDidMount = () => {
        this.fetchData()
    }

    fetchData = () => {
        const { page, rowsPerPage } = this.state
        this.setState({ tableUpdating: true })

        const url = GET_URL.staffWallet.api
        const params = {
            is_active: true,
            limit: rowsPerPage,
            pageno: (page || 0) + 1
        }

        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                const responseData = response.data?.data || response.data
                const dataList = responseData.data_list || []
                const count = responseData.count || dataList.length
                this.setState({
                    dataList,
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

    render() {
        const { loading, dataList, columns, tableUpdating, count, page, rowsPerPage } = this.state

        const tableOptions = {
            ...options,
            selectableRows: 'none',
            rowsPerPageOptions: [5, 10, 15, 30, 50],
            rowsPerPage: rowsPerPage,
            page: page,
            count: count,
            serverSide: true,
            onTableChange: (action, tableState) => {
                if (action === 'changePage') {
                    this.setState({ page: tableState.page, tableUpdating: true }, () => this.fetchData())
                } else if (action === 'changeRowsPerPage') {
                    this.setState({ rowsPerPage: tableState.rowsPerPage, page: 0, tableUpdating: true }, () => this.fetchData())
                }
            }
        }

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
                                Cash In Hand - Opening Balance
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12} >
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                {isUserHasPermission('cash_in_hand_opening_balance', 'create') && <Button
                                    variant="contained"
                                    component={Link} to={Actions.cash_in_hand_opening_balance.create.url}
                                    className='editbutton-view'
                                ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.cash_in_hand_opening_balance.create.label}</Button>}
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container className={classNames('header-align')}>
                        <Grid item md={12} xs={12}>
                            <Paper>
                                <AllMUIDataTable
                                    key={dataList.length}
                                    title={tableUpdating ? <CircularProgress className='white-text' size={24} /> : ''}
                                    data={dataList}
                                    columns={columns}
                                    options={tableOptions}
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>
        )
    }
}
export default CashInHandOpeningBalance
