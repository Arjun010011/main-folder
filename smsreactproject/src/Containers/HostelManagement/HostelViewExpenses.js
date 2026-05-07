import React, { Component ,Fragment} from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';

import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import { DateRange } from 'Components/DateRange';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { Dropdown } from 'Components/DropDown';
import StudentListActions from 'Includes/StudentListActions'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, putRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getFinancialYear, SetFinancialYear, getPaginationProps, numberWithCommas, dateFormat } from 'Includes/functions';
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import { values } from 'react-intl/locale-data/hi';

class ViewExpenses extends Component {
    constructor() {
        super()
        this.state = {
            expensesList:[],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            buildingList: [],
            selectedBuilding: 'all',
            yearList: [],
            year: '',
            pageLoading: false,
            isBlankPage: true,
            error: {},
            selectedExpenses: null,
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            dateRangeValue: {},
            minDate: '',
            maxDate: '',
            enableDateRange: false,
            expensesTypeList: [],
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false,
                        download: false,
                    }
                },
                {
                    name: "expense_type_name",
                    label: "Expense Type",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "date",
                    label: "Date",
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {dateFormat(value, 'DD-MM-YYYY')}
                                </Box>
                            )

                        }
                    }
                },
                {
                    name: "amount",
                    label: "Amount",
                    options: {
                        filter: false,
                        sort: true,
                        display: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                numberWithCommas(value)
                            )
                        }
                    }
                },
                {
                    name: "tax_amount",
                    label: "Tax",
                    options: {
                        filter: false,
                        sort: true,
                        display: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                numberWithCommas(value)
                            )
                        }
                    }
                },
                {
                    name: "total_amount",
                    label: "Total Amount",
                    options: {
                        filter: false,
                        sort: true,
                        display: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                numberWithCommas(value)
                            )
                        }
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: false,
                        sort: true,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <StudentListActions
                                    id={tableMeta.rowData[0]}
                                    index={tableMeta.rowIndex}
                                    deleteStudent={this.deleteExpense}
                                    editURL={Actions.hostel_expenses_create.update.url}
                                    viewURL={Actions.hostel_expenses_individual.view.url}
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
            code: newData.code
        }
        return payload
    }


    updatePermissions = (name) => {
        let test = true
        const hasViewPermission = isUserHasPermission('hostel_expenses_individual', 'view')
        const hasEditPermission = isUserHasPermission('hostel_expenses_create', 'update')
        const hasDeletePermission = isUserHasPermission('hostel_expenses_create', 'delete')
        let enabledActions = [];
        if (hasViewPermission) {
            enabledActions.push('view')
        }
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
        this.getBuildingList()
        this.getFinancialYearList()
        this.updatePermissions('actions');
        let options = { ...multiOptions }
        this.setState({
            options: options
        })
    }

    getExpensesTypeList = () => {
        let { year } = this.state;
        const url = GET_URL.expenseplan.api
        const params = { financial_year: year, is_active: true, expense_type__expense_for: 2 }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    expensesTypeList: response.data.data,
                    loading: false,
                    isBlankPage: false
                })
            }
        })
    }


    getBuildingList = () => {
        const url = GET_URL.buildingdata.api
        const params = { is_active: true, building_type:'Hostel' }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let temp = { id: 'all', name: 'All' }
                response.data.data.unshift(temp)
                this.setState({
                    buildingList: response.data.data,
                })
            }
        })
    }

    updateDateRange = () => {
        let { yearList, minDate, maxDate, year } = this.state;
        yearList.map((data) => {
            if (data.id == year) {
                minDate = data.start_date
                maxDate = data.end_date
            }
        })
        this.setState({
            minDate,
            maxDate,
            enableDateRange: true
        })
    }

    getFinancialYearList = () => {
        const url = GET_URL.financialyear.api
        const param={is_active:true}
        getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                let fromYear = ''
                let ToYear = ''
                response.data.data.map((data) => {
                    fromYear = data.start_date.split('-');
                    ToYear = data.end_date.split('-');
                    data.name = fromYear[0] + '-' + ToYear[0]
                })
                this.setState({
                    yearList: response.data.data,
                    loading: false,
                })
                if (getFinancialYear()) {
                    let year = getFinancialYear()
                    if (year !== 0) {
                        this.setState({
                            year
                        }, () => {
                            this.getExpensesList()
                            this.updateDateRange();
                            this.getExpensesTypeList()
                        })
                    }
                }
            }
        })
    }

    getExpensesList = (paginationProps) => {
        let { dateRangeValue, year, selectedBuilding, pagination ,selectedExpense} = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, is_active: true, expense_plan__financial_year: year, expense_for: 2 }
        if (dateRangeValue.start && dateRangeValue.end) {
            params['start_date'] = dateRangeValue.start
            params['end_date'] = dateRangeValue.end
        }
        if (selectedBuilding && selectedBuilding !== 'all') {
            params['building'] = selectedBuilding
        }
        if(selectedExpense){
            params['expense_plan'] = selectedExpense
        }
        const url = GET_URL.expense.api
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    expensesList: response.data.data,
                    pageLoading: false,
                    isBlankPage: false,
                    tableUpdating: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })
            }
        })
    }

    deleteExpense = async (id, index) => {
        this.setState({ tableUpdating: true })
        let { expensesList, columns } = this.state
        const del_url = DEL_URL.expense.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                expensesList.data_list.splice(index, 1)
                this.setState({
                    expensesList: { ...expensesList },
                    columns: [...columns]
                })
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
            }
        })
        this.setState({ tableUpdating: false })
    }

    onChange = (e) => {
        let { name, value } = e.target;
        const { year } = this.state;
        if (value !== 0) {
            this.setState({
                [name]: value,
                pageLoading: true,
                isBlankPage: true,
                error: {}
            }, () => {
                if (name === 'year') {
                    SetFinancialYear(value)
                    this.updateDateRange();
                    this.getExpensesList()
                }
                else {
                    this.getExpensesList()
                }
            })
        }
    }


    handleAddExpensesButton = () => {
        let { year, error, alertData, yearList } = this.state;
        if (year !== '') {
            let yearName, fromDate, toDate
            yearList.map((data) => {
                if (data.id == year) {
                    yearName = data.name
                    fromDate = data.start_date
                    toDate = data.end_date
                }
            })
            let yearInformation = {
                year: year,
                yearName: yearName,
                fromDate: fromDate,
                toDate: toDate,
            }
            let searchParam = "?" + new URLSearchParams(yearInformation).toString()
            this.props.history.push({
                pathname: Actions.hostel_expenses_create.create.url,
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

    handleChangeDateRange = (value) => {
        this.setState({
            dateRangeValue: value
        }, () => {
            this.getExpensesList()
        })
    }

    handleExpenseChange=(e)=>{
        let { name, value } = e.target;
        this.setState({
            [name]:value
        },()=>{
            this.getExpensesList()
        })
    }

    geFilterOptions = () => {
        let { selectedExpense,expensesTypeList } = this.state;
        return <Fragment>
            <Box className='margin-top-20'>
                <Dropdown
                    data={expensesTypeList}
                    name='selectedExpense'
                    value={selectedExpense}
                    onChange={(e) => this.handleExpenseChange(e)}
                    label='Expense Type'
                    customName='expense_type_name'
                    hideSelect={true}
                />
            </Box>
        </Fragment>;
    }

    onFilterChangeHandler = (type) => {
        if (type === "reset") {
            this.setState({
                selectedExpense:null
            },()=>{
                this.getExpensesList()
            })
        }
      };


    render() {
        const { loading,  columns, tableUpdating, yearList, year, pageLoading, isBlankPage, error, pagination,
            expensesList,  minDate, maxDate, enableDateRange, selectedBuilding, buildingList } = this.state
        const { isComponent } = this.props;
        let classNamePaper = (isComponent) ? '' : 'paper-background';
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            download: true,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            customFilterDialogFooter: () => {
                return this.geFilterOptions();
            },
            onFilterChange: (onFilterChange, filterList, type) => {
                this.onFilterChangeHandler(type, onFilterChange);
            },
        };
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
                    <Paper className={classNamePaper} style={(isComponent) && { background: 'transparent', boxShadow: 'none' }}>
                        {!isComponent &&
                            <Grid container>
                                <Grid item md={6} xs={12} className={classNames('header-align')}>
                                    <Box className='heading'>
                                        Hostel Expenses
                                    </Box>
                                </Grid>

                                <Grid item md={6} xs={12} >
                                    <Box className={classNames('header-align', 'end-flex-prop')}>
                                        {isUserHasPermission('hostel_expenses_create', 'create') && <Button
                                            variant="contained"
                                            onClick={this.handleAddExpensesButton}
                                            className='editbutton-view'
                                        ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.hostel_expenses_create.create.label}</Button>
                                        }
                                    </Box>

                                </Grid>
                            </Grid>
                        }
                        <Grid container className='' spacing={2}>
                            <Grid item lg={3} md={4} xs={6}>
                                <Dropdown
                                    data={yearList}
                                    name='year'
                                    value={year}
                                    onChange={this.onChange}
                                    label='Financial year'
                                    className='width-100'
                                    error={error.year}
                                    hideSelect={true}
                                />
                            </Grid>
                            <Grid item md={4} xs={12}>
                                <Dropdown
                                    data={buildingList}
                                    name='selectedBuilding'
                                    className='width-100'
                                    value={selectedBuilding}
                                    onChange={this.onChange}
                                    label='Building'
                                    hideSelect={true}
                                    error={error['selectedBuilding']}
                                />
                            </Grid>
                            <Grid item lg={4} md={12} xs={12}>
                                {enableDateRange &&
                                    <DateRange
                                        handleChange={this.handleChangeDateRange}
                                        minDate={minDate}
                                        maxDate={maxDate}
                                    />
                                }
                            </Grid>
                        </Grid>
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
                                <Grid item md={12}>
                                    <Paper>
                                        <AllMUIDataTable
                                            key={expensesList.data_list}
                                            title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                            data={expensesList.data_list}
                                            columns={columns}
                                            options={options}
                                            onTableChange={this.getExpensesList}
                                            serverSide={true}
                                            pagination={pagination}
                                            count={expensesList.count}
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
export default withRouter(ViewExpenses)




