import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import { Link } from 'react-router-dom';

import { Dropdown } from 'Components/DropDown';
import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex, amountRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getAcademicYear, SetAcademicYear, getKeyValueMap } from 'Includes/functions';
import { options } from 'Constants';

const fieldDetails = [
    { label: 'Expense Type', regex: nameAndNumberRegex, name: 'name', md: 12, className: 'width-100', required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text' },
]

class ViewExpensesType extends Component {
    constructor() {
        super()
        this.state = {
            expenseTypeList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            yearList: [],
            year: '',
            pageLoading: false,
            isBlankPage: true,
            error: {},
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: true,
                        sort: true,
                        display: false
                    }
                },
                {
                    name: "Serial Number",
                    label: "Sl NO",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                tableMeta.rowIndex + 1
                            )
                        }
                    }
                },
                {
                    name: "name",
                    label: "Expense Type",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: 'Actions',
                    label: 'Actions',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={this.fieldValues(tableMeta.rowData[2])}
                                    label='Please Update Expense Type Name'
                                    fieldDetails={fieldDetails}
                                    updateUrl={PUT_URL.expensetype.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.expensetype.api}
                                    deleteType={this.deleteType}
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


    fieldValues(name, code) {
        let fieldValues = [];
        fieldValues.push(name);
        fieldValues.push(code);
        return fieldValues
    }

    updatePostFormat = (newData) => {
        let payload = {
            name: newData.name,
        }
        return payload
    }


    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('hostel_expenses_type', 'update')
        const hasDeletePermission = isUserHasPermission('hostel_expenses_type', 'delete')
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
        this.getExpensesTypes()
        this.updatePermissions('actions');
        this.setState({
            options: options
        })
    }


    updateType = (newData, id) => {
        this.setState({ tableUpdating: true })
        let expense = this.state.expenseTypeList
        expense.map((data, index) => {
            if (data.id === id) {
                expense[index].name = newData.name
            }
        })
        this.setState({
            expenseTypeList: [...expense],
            tableUpdating: false,
            columns: this.state.columns
        })
        return true
    }


    getExpensesTypes = () => {
        const url = GET_URL.expensetype.api
        const params = { is_active: true, expense_for: 2 }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    expenseTypeList: response.data.data,
                    loading: false,
                })
            }
        })
    }

    deleteType = async (id) => {
        let expensetype = this.state.expenseTypeList
        expensetype.map((data, index) => {
            if (data.id === id) {
                expensetype.splice(index, 1)
            }
        })
        this.setState({
            expenseTypeList: [...expensetype]
        })
    }


    render() {
        const { loading, expenseTypeList, columns, options, tableUpdating, pageLoading, isBlankPage, error } = this.state
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
                                    View Hostel Expenses Types
                                    </Box>
                            </Grid>

                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('hostel_expenses_type', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.hostel_expenses_type.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.hostel_expenses_type.create.label}</Button>
                                    }
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={8}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={expenseTypeList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={expenseTypeList}
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
export default withRouter(ViewExpensesType)




