import React, { Component } from 'react'
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
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls'
import { Actions } from 'Constants/permissions';
import {
    isUserHasPermission, checkLocalFinancialYear, SetFinancialYear, getPaginationProps,
    getKeyValueMap, numberWithCommas, dateFormat
} from 'Includes/functions';
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import { values } from 'react-intl/locale-data/hi';
import AddFundBorrow from './AddFundBorrow';

class FundBorrowList extends Component {
    constructor(props) {
        super(props)
        this.state = {
            expenseList: [],
            loading: false,
            selectedToDelete: [],
            tableUpdating: false,
            yearList: [],
            year: '',
            pageLoading: true,
            isBlankPage: true,
            error: {},
            selectedExpenses: {},
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            dateRangeValue: {},
            startDate: dateFormat(new Date(), 'YYYY-MM-DD'),
            endDate: dateFormat(new Date(), 'YYYY-MM-DD'),
            minDate: '',
            maxDate: '',
            enableDateRange: false,
            expensesTypeList: [],
            blankData: "Select Financial year",
            total_details: {},
            AddFundDialogOpen: false,
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
                    label: "Collected By",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "date",
                    label: "Date",
                    options: {
                        filter: true,
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
                        filter: true,
                        sort: true,
                        display: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                numberWithCommas(value)
                            )
                        }
                    }
                },
            ],
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

    componentDidMount = () => {
        let options = { ...multiOptions }
        this.setState({
            options: options
        })
    }

    getTotalExpenses = () => {
        let { dateRangeValue, total_details, selectedExpenses } = this.state;
        let params = { from_date: dateRangeValue.start, to_date: dateRangeValue.end }
        if (selectedExpenses.id && selectedExpenses.id !== 'all') {
            params['expense_plan'] = selectedExpenses.id
        }
        getRequest(GET_URL.balance.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                total_details['expenses'] = numberWithCommas(response.data.data['expense'])
                this.setState({
                    total_details
                })
            }
        });
    }

    updateDateRange = (year) => {
        let { yearList, minDate, maxDate } = this.state;
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
        const url = GET_URL.financialyear.api;
        const param = { is_active: true }
        getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                let startDateKey = getKeyValueMap(response.data.data, 'id', 'start_date')
                let endDateKey = getKeyValueMap(response.data.data, 'id', 'end_date')
                this.setState({
                    yearList: response.data.data,
                    loading: false,
                    startDateKey,
                    endDateKey
                })
                let year = checkLocalFinancialYear(response.data.data)
                if (year) {
                    let dateRangeValue = { start: startDateKey[year], end: endDateKey[year] }
                    this.setState({
                        year,
                        dateRangeValue
                    }, () => {
                        this.getExpensesList()
                        this.getExpensesTypes(year)
                        this.updateDateRange(year);
                    })
                }
                else {
                    this.setState({
                        pageLoading: false,
                    })
                }
            }
        })
    }

    getExpensesList = (paginationProps) => {
        let { dateRangeValue, year, selectedExpenses, pagination } = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, is_active: true, expense_plan__financial_year: year, expense_for: 1 }
        if (dateRangeValue.start && dateRangeValue.end) {
            params['start_date'] = dateRangeValue.start
            params['end_date'] = dateRangeValue.end
        }
        if (selectedExpenses.id && selectedExpenses.id !== 'all') {
            params['expense_plan'] = selectedExpenses.id
        }
        const url = GET_URL.expense.api
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.data_list.map((data, index) => {
                    data['token_detail'] = data['token_details'] ? `${data['token_details'].token_num} (${data['token_details'].liter})` : ''
                    data['vehicle_details'] = data['other_details'] ? `${data['other_details']['vehicle_num']} (${data['other_details']['name']})` : ''
                })
                this.setState({
                    expensesList: response.data.data,
                    pageLoading: false,
                    isBlankPage: false,
                    tableUpdating: false,
                    loading: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })
            }
        })
    }

    getExpensesTypes = (year) => {
        const url = GET_URL.expenseplan.api
        const params = { financial_year: year, is_active: true, expense_type__expense_for: 1 }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let temp = { id: 'all', expense_type_name: 'All' }
                response.data.data.unshift(temp)
                this.setState({
                    expensesTypeList: response.data.data,
                    selectedExpenses: temp,
                    year
                }, () => {
                    this.getExpensesList()
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
                    expensesList,
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
        if (value !== 0) {
            SetFinancialYear(value)
            this.setState({
                [name]: value,
                pageLoading: true,
                isBlankPage: true,
                error: {}
            })
            this.updateDateRange(value);
            this.getExpensesTypes(value)
        }
    }

    handleDropDownSearchChange = (e, newValue) => {
        let { year } = this.state;
        if (newValue) {
            this.setState({
                selectedExpenses: newValue,
                tableUpdating: true
            }, () => {
                this.getExpensesList()
            })
        }
    }

    handleAddExpensesButton = () => {
        this.setState({
            AddFundDialogOpen: true
        })
    }

    handleChangeDateRange = (value) => {
        this.setState({
            dateRangeValue: value
        }, () => {
            this.getExpensesList()
        })
    }

    render() {
        const { loading, blankData, columns, tableUpdating, yearList, year, pageLoading, isBlankPage, error, expensesTypeList,
            expensesList, AddFundDialogOpen, minDate, maxDate, enableDateRange, pagination, transport_column,
            total_details } = this.state
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            onDownload: (buildHead, buildBody, columns, data) => {
                const bodyData = data.map((data_value) => {
                    data_value.data[2] = data_value.data[2].substring(1)
                    data_value.data[3] = data_value.data[3].substring(1)
                    data_value.data[4] = data_value.data[4].substring(1)
                    return data_value;
                })
                return "\uFEFF" + buildHead(columns) + buildBody(bodyData);
            },
            downloadOptions: {
                filename: "Expenses.csv",
                filterOptions: {
                    useDisplayedColumnsOnly: true,
                    useDisplayedRowsOnly: true,
                },
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
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Fund Borrow List
                                </Box>
                            </Grid>

                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('fee_fund_borrow', 'create') && <Button
                                        variant="contained"
                                        onClick={this.handleAddExpensesButton}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.fee_fund_borrow.create.label}</Button>
                                    }
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container className='' spacing={2}>
                            <Grid item lg={4} md={12} xs={12}>
                                <DateRange
                                    handleChange={this.handleChangeDateRange}
                                    minDate={minDate}
                                    maxDate={maxDate}
                                    startDate={this.state.startDate}
                                    endDate={this.state.endDate}
                                />
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            {isBlankPage && !pageLoading &&
                                <Grid item md={12}>
                                    <BlankPagewithIcon data={blankData} />
                                </Grid>
                            }
                            {pageLoading &&
                                <Box className='loading'>
                                    <CircularProgress />
                                </Box>
                            }
                            {!pageLoading && !isBlankPage &&
                                <Grid item md={10}>
                                    <Paper>
                                        <AllMUIDataTable
                                            key={expensesList.data_list}
                                            title={tableUpdating ? <CircularProgress className='white-text' /> : `Total Borrowed ${total_details?.expenses ?? 4564}`}
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
                    {AddFundDialogOpen &&
                        <AddFundBorrow
                            showModal={AddFundDialogOpen}
                            payAdjustment={this.payAdjustment}
                            closeInParent={this.closeDiscountModal}
                            saveAdjustment={this.saveDiscount}
                            saveButtonBlocked={this.state.adjustmentSaveBlocked}
                        />
                    }
                </Box>
            )
        }
    }
}
export default withRouter(FundBorrowList)




