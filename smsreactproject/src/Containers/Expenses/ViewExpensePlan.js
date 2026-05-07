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
import { nameAndNumberRegex, amountRegexWithDecimals } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getFinancialYear, SetFinancialYear, getKeyValueMap, numberWithCommasWithoutSymbol } from 'Includes/functions';
import { options } from 'Constants';

const fieldDetails = [
    {
        label: 'Max Budget', regex: amountRegexWithDecimals, name: 'max_amount', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 9
    },
]

class ViewExpensesType extends Component {
    constructor(props) {
        super()
        this.state = {
            expenseTypeList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            yearList: [],
            year: '',
            header: Actions.expenses_plan.view.label,
            create_url: Actions.expenses_plan.create.url,
            create_label: Actions.expenses_plan.create.label,
            permission_name: 'expenses_plan',
            pageLoading: false,
            isBlankPage: true,
            error: {},
        }
        this.columns = [
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
                name: "expense_type_name",
                label: "Expense Type",
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "max_amount",
                label: "Max Budget (₹)",
                options: {
                    filter: true,
                    sort: true,
                    display: true,
                    customBodyRender: (value, tableMeta) => {
                        return <Box>{value && numberWithCommasWithoutSymbol(value)}</Box>
                    }
                }
            },
            {
                name: 'Actions',
                label: 'Action',
                options: {
                    display: this.updatePermissions('display', props.location.pathname === Actions.hostel_expenses_plan.view.url ? 'hostel_expenses_plan' : 'expenses_plan'),
                    filter: true,
                    sort: false,
                    customBodyRender: (value, tableMeta, updateValue) => {
                        return (<div>
                            <ActionColumn
                                id={tableMeta.rowData[0]}
                                fieldValues={this.fieldValues(tableMeta.rowData[2])}
                                label={`Edit Maximum Amount for ${tableMeta.rowData[1]}`}
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


    updatePermissions = (name, permission_name_temp) => {
        let test = true
        let hasEditPermission = false
        let hasDeletePermission = false
        let { permission_name } = this.state;
        if (permission_name_temp) {
            permission_name = permission_name_temp
        }
        hasEditPermission = isUserHasPermission(permission_name, 'update')
        hasDeletePermission = isUserHasPermission(permission_name, 'delete')
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
                columns: this.columns,
                permission_name: permission_name_temp ? permission_name_temp : permission_name
            })
        }
    }

    componentDidMount = () => {
        let { header, create_url, permission_name, is_hostel, create_label } = this.state;
        if (this.props.location.pathname === Actions.hostel_expenses_plan.view.url) {
            is_hostel = true
            header = Actions.hostel_expenses_plan.view.label
            create_url = Actions.hostel_expenses_plan.create.url
            create_label = Actions.hostel_expenses_plan.create.label
            permission_name = 'hostel_expenses_plan'
        }
        this.setState({
            options: options,
            is_hostel,
            header,
            create_url,
            create_label,
            permission_name
        }, () => {
            this.getFinancialYearList()
            if (getFinancialYear()) {
                let year = getFinancialYear()
                if (year !== 0) {
                    this.getExpensesTypes(year)
                }
            }
            this.updatePermissions('actions');
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
        const { is_hostel } = this.state;
        const url = GET_URL.expenseplan.api
        const params = { financial_year: year, is_active: true, expense_type__expense_for: is_hostel ? 2 : 1 }
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
        let { year, error, alertData, yearList, create_url } = this.state;
        if (year !== '') {
            let yearNames = getKeyValueMap(yearList, 'id', 'name')
            let yearName = yearNames[year]
            let yearInformation = {
                year: year,
                yearName: yearName
            }
            let searchParam = "?" + new URLSearchParams(yearInformation).toString()
            this.props.history.push({
                pathname: create_url,
                search: searchParam,
            });
        }
        else {
            alertData = 'Select Financial Year'
            error.year = alertData
            this.setState({
                open: true,
                alertData,
                error
            })
        }

    }

    render() {
        const { loading, expenseTypeList, columns, options, tableUpdating, yearList, year,
            pageLoading, isBlankPage, error, header, create_label, permission_name, } = this.state
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
                                    {header}
                                </Box>
                            </Grid>

                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission(permission_name, 'create') && <Button
                                        variant="contained"
                                        onClick={this.handleAddExpensesButton}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {create_label}</Button>
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
                                label='Financial year'
                                fullWidth
                                error={error.year}
                                hideSelect
                            />
                        </Box>
                        <Grid container className={classNames('header-align')}>
                            {isBlankPage && !pageLoading &&
                                <Grid item md={12}>
                                    <BlankPagewithIcon data="Select Financial Year" />
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




