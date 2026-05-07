import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import _ from 'lodash';

import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';
import { options } from 'Constants';

const fieldDetails_global = [
    {
        label: 'Bank Id', regex: nameAndNumberRegex, name: 'bank_id', md: 12, className: 'width-100', required: true, id: 'outlined-textarea',
        default: '', rows: null, type: 'dropDown', autoFocus: true, maxLength: '25', list: []
    },
]

class ViewFeeTypeBankMap extends Component {
    constructor() {
        super()
        this.state = {
            feeTypeBankMapList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            bankLoaded: false,
            fieldDetails: null,
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
                    name: "fee_type",
                    label: "Fee Type",
                    options: {
                        filter: false,
                        sort: true,
                        search: false,
                    }
                },
                {
                    name: "bank_id",
                    label: "Bank ID",
                    options: {
                        filter: false,
                        sort: true,
                        search: false,
                    }
                },
                {
                    name: "bank_name",
                    label: "Bank Name",
                    options: {
                        filter: false,
                        sort: true,
                        search: false,
                    }
                },
                {
                    name: "account_num",
                    label: "Account Number",
                    options: {
                        filter: false,
                        sort: true,
                        search: false,
                    }
                },
                {
                    name: 'Action',
                    label: 'Actions',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: true,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={this.fieldValues(tableMeta.rowData[2])}
                                    label='Please Update Bank'
                                    fieldDetails={this.state.fieldDetails}
                                    updateUrl={PUT_URL.bankfeetype.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.bankfeetype.api}
                                    deleteType={this.deleteType}
                                    getData={this.getBankList}
                                    isGetData={true}
                                    baseClassName='action-basic-detail-width'
                                    enabledActions={this.state.enabledActions}
                                />
                            </div>
                            );
                        }
                    }
                }

            ]
        }
    }


    fieldValues(bankId) {
        let fieldValues = [];
        fieldValues.push(bankId);
        return fieldValues
    }


    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('fee_type_bank_map', 'update')
        const hasDeletePermission = isUserHasPermission('fee_type_bank_map', 'delete')
        let permissions = [];
        let enabledActions = []
        if (hasEditPermission) {
            // enabledActions.push('edit')
        }
        if (hasDeletePermission) {
            // enabledActions.push('delete')
        }
        if (enabledActions.length === 0) {
            test = false;
        }
        if (name === 'display') {
            return test
        }
        else {
            this.setState({
                enabledActions: enabledActions,
                permissions,
                columns: this.state.columns
            })
        }
    }

    componentDidMount = () => {
        this.getFeeTypeBankMapList()
        this.updatePermissions('actions');
        let tempOptions = _.cloneDeep(options)
        tempOptions['rowsPerPageOptions'] = [5, 10, 15, 30, 50, 100]
        tempOptions['rowsPerPage'] = '10'
        this.setState({
            options: tempOptions,
            fieldDetails: fieldDetails_global,
        })
    }

    updatePostFormat = (newData, id) => {
        let { bankList } = this.state;
        let bankId
        bankList.map((data) => {
            if (newData.bank_id == data.bank_id) {
                bankId = data.id
            }
        })
        let payload = {
            bank: bankId,
            fee_type: id
        }
        return payload
    }

    updateType = (newData, id) => {
        this.setState({ tableUpdating: true })
        let feeTypeBankMap = this.state.feeTypeBankMapList
        feeTypeBankMap.map((data, index) => {
            if (data.id === id) {
                feeTypeBankMap[index].bank_details['bank_id'] = newData.bank_id
            }
        })
        this.setState({
            feeTypeBankMapList: [...feeTypeBankMap],
            tableUpdating: false,
            columns: this.state.columns
        })
        return true
    }


    getFeeTypeBankMapList = () => {
        const url = GET_URL.bankfeetype.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.map((data) => {
                    data['account_num']= data['bank_details']['account_num']
                    data['bank_id']= data['bank_details']['bank_id']
                    data['bank_name']= data['bank_details']['bank_name']
                    data['fee_type']=data['fee_type_details']['name']
                })

                this.setState({
                    feeTypeBankMapList: response.data.data,
                    loading: false
                })
            }
        })
    }

    getBankList = () => {
        let { bankLoaded } = this.state;
        if (!bankLoaded) {
            const url = GET_URL.bankdetail.api
            const params = { is_active: true, available_for_bank: true }
            getRequest(url, params, this.props).then(response => {
                if (response && response.status === 200) {
                    response.data.data.map((data) => {
                        data.name = data.bank_id
                    })

                    fieldDetails_global[0]['list'] = response.data.data
                    this.setState({
                        bankList: response.data.data,
                        fieldDetails: fieldDetails_global,
                        columns: [...this.state.columns],
                        bankLoaded: true
                    })
                }
                return true
            })
        }
        else {
            return true
        }
    }

    deleteType = async (id) => {
        let feeTypeBankMap = this.state.feeTypeBankMapList
        feeTypeBankMap.map((data, index) => {
            if (data.id === id) {
                feeTypeBankMap.splice(index, 1)
            }
        })
        this.setState({
            feeTypeBankMapList: feeTypeBankMap,
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
                                    Fee Type Bank Map List
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('fee_type_bank_map', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.fee_type_bank_map.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.fee_type_bank_map.create.label}</Button>}
                                </Box>

                            </Grid>
                        </Grid>

                        <Grid container className={classNames('header-align')}>
                            <Grid item md={10} xs={12}>
                                <Paper>
                                    {fieldDetails &&
                                        <AllMUIDataTable
                                            key={feeTypeBankMapList}
                                            title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                            data={feeTypeBankMapList}
                                            columns={columns}
                                            options={options}
                                        />
                                    }
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            )
        }
    }
}
export default ViewFeeTypeBankMap
