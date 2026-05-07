import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import _ from 'lodash';
import { withRouter } from 'react-router-dom';

import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, numberWithCommas } from 'Includes/functions';
import { options } from 'Constants';


class ViewFeeTypeBankBalance extends Component {
    constructor() {
        super()
        this.state = {
            feeTypeBankMapList: [],
            loading: true,
            selectedToDelete: [],
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
                    name: "fee_type_name",
                    label: "Fee Type",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                    }
                },
                {
                    name: "bank_details",
                    label: "Bank ID",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                value['bank_id']
                            )
                        }
                    }
                },
                {
                    name: "bank_details",
                    label: "Bank Name",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                value['bank_name']
                            )
                        }
                    }
                },
                {
                    name: "bank_details",
                    label: "Account Number",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                value['account_num']
                            )
                        }
                    }
                },
                {
                    name: "balance",
                    label: "Account Balance",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                numberWithCommas(value)
                            )
                        }
                    }
                },
                {
                    name: 'Actions',
                    label: 'Actions',
                    options: {
                        filter: false,
                        display: isUserHasPermission('fee_type_bank_transactions', 'view'),
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {isUserHasPermission('fee_type_bank_transactions', 'view') && <Button
                                    className='add-modify-button'
                                    onClick={e => this.callBankTransactions(tableMeta.rowData[1], tableMeta.rowData[2])}
                                >  View Transactions
                                </Button>
                                }
                            </div>
                            );
                        }
                    }
                }

            ]
        }
    }

    callBankTransactions = (fee_name, bankDetails) => {
        let idInformation = {
            id: bankDetails.id,
            bank_id: bankDetails.bank_id,
            bank_name: bankDetails.bank_name,
            account_num: bankDetails.account_num,
            fee_name: fee_name
        }
        let searchParam = "?" + new URLSearchParams(idInformation).toString()
        this.props.history.push({
            pathname: Actions.fee_type_bank_transactions.view.url,
            search: searchParam,
        });
    }




    componentDidMount = () => {
        this.getFeeTypeBankMapList()
        this.setState({
            options: _.cloneDeep(options),
        })
    }



    getFeeTypeBankMapList = () => {
        const url = GET_URL.banktransaction.api
        const params = { is_active: true, }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    feeTypeBankMapList: response.data.data,
                    loading: false
                })
            }
        })
    }


    render() {
        const { loading, feeTypeBankMapList, columns, options, tableUpdating, fieldDetails } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Box>
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Fee Type Transaction Overview
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('fee_type_bank_transactions', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.fee_type_bank_transactions.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.fee_type_bank_transactions.create.label}</Button>}
                                </Box>

                            </Grid>
                        </Grid>

                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={feeTypeBankMapList}
                                        title={''}
                                        data={feeTypeBankMapList}
                                        columns={columns}
                                        options={options}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(ViewFeeTypeBankBalance)
