import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';

import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import { Dropdown } from 'Components/DropDown';
import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex, amountRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getFinancialYear, SetFinancialYear, getKeyValueMap } from 'Includes/functions';
import { options } from 'Constants';

const fieldDetails = [
    {
        label: 'Max Amount', regex: amountRegex, name: 'max_amount', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 7
    },
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
                    name: "expense_type_name",
                    label: "Expense Type",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "max_amount",
                    label: "Max Amount",
                    options: {
                        filter: true,
                        sort: true,
                        display: true
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
                                    fieldValues={this.fieldValues(tableMeta.rowData[3])}
                                    label={`Edit Maximum Amount for ${tableMeta.rowData[2]}`}
                                    fieldDetails={fieldDetails}
                                    updateUrl={PUT_URL.expenseplan.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.expenseplan.api}
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
        return fieldValues
    }

    updatePostFormat = (newData, id) => {
        let { year, expenseTypeList } = this.state;
        let expense_type
        expenseTypeList.map((data) => {
            if (data.id === id) {
                expense_type = data.expense_type
            }
        })
        let payload = {
            financial_year: year,
            expense_type: expense_type,
            max_amount: newData.max_amount
        }
        return payload
    }


    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('hostel_expenses_plan', 'update')
        const hasDeletePermission = isUserHasPermission('hostel_expenses_plan', 'delete')
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
        this.getFinancialYearList()
        if (getFinancialYear()) {
            let year = getFinancialYear()
            if (year !== 0) {
                this.getExpensesTypes(year)
            }
        }
        this.updatePermissions('actions');
        this.setState({
            options: options
        })
    }

    getFinancialYearList = () => {
        const url = GET_URL.getfinancialyear.api
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    yearList: response.data.data,
                    loading: false,
                })
            }
        })
    }

    updateType = (newData, id) => {
        this.setState({ tableUpdating: true })
        let expense = this.state.expenseTypeList
        expense.map((data, index) => {
            if (data.id === id) {
                expense[index].name = newData.name
                expense[index].max_amount = newData.max_amount
            }
        })
        this.setState({
            expenseTypeList: [...expense],
            tableUpdating: false,
            columns: this.state.columns
        })
        return true
    }


    getExpensesTypes = (year) => {
        const url = GET_URL.expenseplan.api
        const params = { financial_year: year, is_active: true, expense_type__expense_for: 2 }
        getRequest(url, params, this.props).then(response => {
            SetFinancialYear(year)
            if (response && response.status === 200) {
                this.setState({
                    expenseTypeList: response.data.data,
                    pageLoading: false,
                    isBlankPage: false,
                    year
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

    onChange = (e) => {
        let { name, value } = e.target;
        if (value !== 0) {
            this.setState({
                [name]: value,
                pageLoading: true,
                isBlankPage: true,
                error: {}
            })
            this.getExpensesTypes(value)
        }
    }


    handleAddExpensesButton = () => {
        let { year, error, alertData, yearList } = this.state;
        if (year !== '') {
            let yearNames = getKeyValueMap(yearList, 'id', 'name')
            let yearName = yearNames[year]
            let yearInformation = {
                year: year,
                yearName: yearName
            }
            let searchParam = "?" + new URLSearchParams(yearInformation).toString()
            this.props.history.push({
                pathname: Actions.hostel_expenses_plan.create.url,
                search: searchParam,
            });
        }
        else {
            alertData = 'Please Select Financial Year'
            error.year = alertData
            this.setState({
                open: true,
                alertData,
                error
            })
        }

    }

    render() {
        const { loading, expenseTypeList, columns, options, tableUpdating, yearList, year, pageLoading, isBlankPage, error } = this.state
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
                                    View Hostel Expenses Plan
                                </Box>
                            </Grid>

                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('hostel_expenses_plan', 'create') && <Button
                                        variant="contained"
                                        onClick={this.handleAddExpensesButton}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.hostel_expenses_plan.create.label}</Button>
                                    }
                                </Box>
                            </Grid>
                        </Grid>
                        <Box className='header-align'>
                            <Dropdown
                                data={yearList}
                                name='year'
                                value={year}
                                onChange={this.onChange}
                                label='Select Financial year'
                                fullWidth
                                error={error.year}
                            />
                        </Box>
                        <Grid container className={classNames('header-align')}>
                            {isBlankPage && !pageLoading &&
                                <Grid item md={12}>
                                    <BlankPagewithIcon data="Please Change the Financial year and expect the result" />
                                </Grid>
                            }
                            {pageLoading &&
                                <Box className='loading'>
                                    <CircularProgress />
                                </Box>
                            }
                            {!pageLoading && !isBlankPage &&
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
                            }
                        </Grid>
                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(ViewExpensesType)




