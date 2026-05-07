import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';
import { options } from 'Constants';
import { numberRegex } from 'Constants/regularExpression'

const fieldDetails = [
    {
        label: 'Denomination Amount', regex: numberRegex, name: 'amount', md: 12, maxLength: '10', className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'amount', autoFocus: false, isDuplicateAllow: false
    },
    {
        label: 'Active', regex: '', name: 'is_active', md: 12, className: 'width-100', required: true,
        id: 'outlined-select', default: { id: true, name: 'Yes' }, type: 'dropDownWithSearch', autoFocus: false,
        list: [{ id: true, name: 'Yes' }, { id: false, name: 'No' }], isDuplicateAllow: false
    }
]

class DenominationList extends Component {
    constructor() {
        super()
        this.state = {
            denominationList: [],
            loading: true,
            tableUpdating: false,
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
                    name: "amount",
                    label: "Denomination Amount",
                },
                {
                    name: "is_active",
                    label: "Active",
                    options: {
                        sort: false,
                        customBodyRender: (value) => {
                            return value
                                ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>Yes</span>
                                : <span style={{ color: '#d32f2f', fontWeight: 600 }}>No</span>
                        }
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: true,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={this.fieldValues(tableMeta.rowData[1], tableMeta.rowData[2])}
                                    label='Edit Denomination'
                                    fieldDetails={fieldDetails}
                                    updateUrl={PUT_URL.denominations.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.denominations.api}
                                    deleteType={this.deleteType}
                                    baseClassName='action-view-bank-width'
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


    fieldValues(amount, is_active) {
        let fieldValues = [];
        fieldValues.push(amount);
        fieldValues.push(is_active ? { id: true, name: 'Yes' } : { id: false, name: 'No' });
        return fieldValues
    }


    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('denominations', 'update')
        const hasDeletePermission = isUserHasPermission('denominations', 'delete')
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
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
                columns: this.state.columns
            })
        }
    }

    componentDidMount = () => {
        this.updatePermissions('actions');
        options['rowsPerPageOptions'] = [5, 10, 15, 30, 50, 100]
        options['rowsPerPage'] = '10'
        this.setState({
            options: options
        }, () => {
            this.getDenominationList();
        })
    }

    updatePostFormat = (newData) => {
        let payload = {
            amount: parseInt(newData.amount),
            is_active: newData.is_active?.id || newData.is_active || false,
        }
        return payload
    }

    updateType = (newData, id) => {
        this.setState({ tableUpdating: true })
        let list = this.state.denominationList
        list.map((data, index) => {
            if (data.id === id) {
                list[index].amount = parseInt(newData.amount)
                list[index].is_active = newData.is_active?.id || newData.is_active || false
            }
        })
        this.setState({
            denominationList: [...list],
            tableUpdating: false,
            columns: this.state.columns
        })
        return true
    }

    getDenominationList = () => {
        const url = GET_URL.denominations.api
        const params = { is_active: true }
        // Fetch all denominations (both active and inactive) so we can edit their status
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    denominationList: response.data.data ? response.data.data : response.data,
                    loading: false,
                })
            } else {
                this.setState({ loading: false })
            }
        }).catch(() => {
            this.setState({ loading: false })
        })
    }

    deleteType = async (id) => {
        let list = this.state.denominationList
        list.map((data, index) => {
            if (data.id === id) {
                list.splice(index, 1)
            }
        })
        this.setState({
            denominationList: list,
        })
    }

    render() {
        const { loading, denominationList, columns, options, tableUpdating } = this.state
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
                                    Cash Denomination Setup
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('denominations', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.denominations.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.denominations.create.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        
                        <Grid container className={classNames('header-align', 'mt-10')}>
                            <Grid item md={12} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={denominationList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={denominationList}
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
export default DenominationList
