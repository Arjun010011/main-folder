import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip, Dialog, Divider, DialogActions } from '@material-ui/core';
import Swal from 'sweetalert2'
import moment from 'moment';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import _ from 'lodash';
import { withRouter } from 'react-router-dom';
import { DateRange } from 'Components/DateRange';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import { Dropdown } from 'Components/DropDown';
import ReactToPrint from 'react-to-print';
import GetAppRoundedIcon from '@material-ui/icons/GetAppRounded';

import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls'
import StudentListActions from 'Includes/StudentListActions'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getFullName, getPaginationProps, getFinancialYear, SetFinancialYear, dateFormat, timeFormat, numberWithCommas } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';

class ViewFuelToken extends Component {
    constructor() {
        super()
        this.state = {
            fuelTokenList: [],
            enabledActions: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            selectedStatus: { id: 1, name: 'All' },
            statusList: [{ id: 1, name: 'All' }, { id: 2, name: 'Claimed' }, { id: 3, name: 'Not Claimed' }, { id: 0, name: 'Cancelled' }],
            bankLoaded: false,
            fieldDetails: null,
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            bank_id: '',
            id: '',
            bank_name: '',
            account_num: '',
            fee_name: '',
            dateRangeValue: {},
            fuel_details: {},
            openPopup: false,
            yearList: [],
            year: '',
            largeImagePreview: '',
            error: {},
            isOpenedDateRange: false,
            dateRangeDropdownList: [{ id: 'l1m', name: 'Last 1 Month' }, { id: 'l3m', name: 'Last 3 Months' }, { id: 'l6m', name: 'Last 6 Months' }, { id: 'l1y', name: 'Last 1 Year' }],
            isDateRange: false,
            dateRangeDropdown: 'l1m',
            year_start_end: {},
            is_opened: false,
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        display: false,
                        download: false
                    }
                },
                {
                    name: "token_num",
                    label: "Token Number",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                    }
                },
                {
                    name: "staff_name",
                    label: "Staff Name",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                    }
                },
                {
                    name: "vehicle_details",
                    label: "Vehicle Details",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                    }
                },
                {
                    name: "liter",
                    label: "No of liters",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                    }
                },
                {
                    name: "for_date",
                    label: "created date",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {dateFormat(value, 'DD-MM-YYYY')}
                                </Box>

                            )

                        },
                    }
                },
                {
                    name: "is_claimed",
                    label: "Is Claimed",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {value === 'Not Claimed' &&
                                        <Box>Not Claimed</Box>
                                    }
                                    {value === 'Claimed' &&
                                        <Box className='deposit-transaction'>Claimed</Box>
                                    }
                                    {value === 'Cancelled' &&
                                        <Box className='withdraw-transaction'>Cancelled</Box>
                                    }
                                </Box>

                            )

                        },
                    }
                },
                {
                    name: "Actions",
                    label: "Action",
                    options: {
                        display: this.updatePermissions('display'),
                        filter: false,
                        sort: false,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {tableMeta.rowData[6] === 'Not Claimed' &&
                                    <StudentListActions
                                        id={tableMeta.rowData[0]}
                                        index={tableMeta.rowIndex}
                                        deleteStudent={this.deleteToken}
                                        viewURL={Actions.admission_student.view.url}
                                        enabledActions={this.state.enabledActions}
                                        print_form_label='Print Token'
                                        delete_label='Cancel Token'
                                        handlePrintForm={this.handlePrintForm}
                                        viewExtraParams={{ studentId: tableMeta.rowData[0] }}

                                    />
                                }
                            </div>
                            );
                        }
                    }
                }
            ]
        }
        this.dateRange = React.createRef();
    }


    updatePermissions = (name) => {
        let test = true
        const hasViewPermission = isUserHasPermission('fuel_token', 'view')
        const hasDeletePermission = isUserHasPermission('fuel_token', 'delete')
        let enabledActions = [];
        if (hasViewPermission) {
            enabledActions.push('printForm')
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

    handlePrintForm = (id) => {
        let { fuelTokenList, fuel_details } = this.state;
        fuelTokenList.data_list.map((data) => {
            if (data.id == id) {
                fuel_details = data
            }
        })
        this.setState({
            fuel_details,
            openPopup: true
        })
    }

    deleteToken = (id) => {
        const url = DEL_URL.token.api + id + '/'
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.getFuelTokenList()
            }
        })
    }

    componentDidMount = () => {
        this.updatePermissions()
        this.getFinancialYearList()
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
                }, () => {
                    if (getFinancialYear() && getFinancialYear() != 0) {
                        this.setState({
                            year: getFinancialYear(),
                            loading: false
                        }, () => {
                            this.updateDateRangeAndGetFuelTokens()
                        })
                    }
                    else {
                        this.setState({
                            loading: false,
                        })
                    }
                })
            }
        })
    }

    updateDateRangeAndGetFuelTokens = () => {
        let { dateRangeValue, yearList, year, year_start_end } = this.state;
        let start_date, end_date
        yearList.map((data) => {
            if (data.id == year) {
                start_date = data.start_date
                end_date = data.end_date
            }
        })
        dateRangeValue.start = dateFormat(moment(start_date), 'YYYY-MM-DD')
        dateRangeValue.end = dateFormat(moment(end_date), 'YYYY-MM-DD')
        year_start_end['start'] = start_date
        year_start_end['end'] = end_date
        start_date = moment(start_date)
        end_date = moment(end_date)
        this.setState({
            year,
            dateRangeValue,
            year_start_end,
            loading: false
        }, () => {
            this.dateRange.current.onChange(moment.range(start_date.clone(), end_date.clone()));
            this.getFuelTokenList()
        })
    }


    handleChangeDateRange = (value, isOpened) => {
        let { pagination, dateRangeDropdown, dateRangeDropdownList } = this.state;
        if (isOpened) {
            let isCustomExist = false
            let temp = { id: 'custom', name: 'Custom Date Range' }
            dateRangeDropdownList.map((data) => {
                if (data.id === 'custom') {
                    isCustomExist = true
                }
            })
            if (!isCustomExist) {
                dateRangeDropdownList.push(temp)
            }
            dateRangeDropdown = 'custom'
        }
        else {
            dateRangeDropdownList.map((data, index) => {
                if (data.id === 'custom') {
                    dateRangeDropdownList.splice(index, 1)
                }
            })
        }
        this.setState({
            dateRangeValue: value,
            dateRangeDropdown,
            dateRangeDropdownList
        }, () => {
            this.getFuelTokenList(pagination)
        })
    }

    getFuelTokenList = (paginationProps) => {
        this.setState({ tableUpdating: true })
        let { pagination, id, dateRangeValue, selectedStatus, is_opened } = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params }
        if (!_.isEmpty(dateRangeValue)) {
            params['from_date'] = dateRangeValue.start
            params['to_date'] = dateRangeValue.end
        }
        if (selectedStatus.id != '1') {
            params['is_active'] = selectedStatus.id
        }
        const url = GET_URL.token.api
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                this.callApi = true
                response.data.data.data_list.map((data, index) => {
                    data['staff_name'] = getFullName(data['staff_first_name'], data['staff_middle_name'], data['staff_last_name'])
                    data['is_claimed'] = data['is_active'] ? data['is_claimed'] ? 'Claimed' : 'Not Claimed' : 'Cancelled'
                    data['vehicle_details'] = `${data['other_details']['vehicle_num']} (${data['other_details']['name']})`
                })
                this.setState({
                    fuelTokenList: response.data.data,
                    loading: false,
                    tableUpdating: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                }, () => {
                    if (this.props.location.state && this.props.location.state.detail) {
                        let id = this.props.location.state.detail
                        this.handlePrintForm(id)
                        const { history } = this.props;
                        history.replace()
                    }
                });
            }
        });
    };

    onChangeDateRangeDropdown = (e) => {
        let { name, value } = e.target;
        let { dateRangeValue, pagination } = this.state;
        let start, end;
        end = dateFormat(new Date(), 'YYYY-MM-DD')
        if (value === 'l1m') {
            start = dateFormat(moment(new Date()).subtract(1, 'months'), 'YYYY-MM-DD')
        }
        else if (value === 'l3m') {
            start = dateFormat(moment(new Date()).subtract(3, 'months'), 'YYYY-MM-DD')
        }
        else if (value === 'l6m') {
            start = dateFormat(moment(new Date()).subtract(6, 'months'), 'YYYY-MM-DD')
        }
        else if (value === 'l1y') {
            start = dateFormat(moment(new Date()).subtract(12, 'months'), 'YYYY-MM-DD')
        }
        dateRangeValue.start = start
        dateRangeValue.end = end
        this.setState({
            dateRangeValue,
            [name]: value,
            isDropDownDateRange: true
        }, () => {
            let startDate = moment(start)
            let endDate = moment(end)
            this.dateRange.current.onChange(moment.range(startDate.clone(), endDate.clone()));
            this.getFuelTokenList(pagination)
        })
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
            }, () => {
                this.updateDateRangeAndGetFuelTokens()
            })
        }
    }

    handleCloseLargeImage = () => {
        this.setState({
            largeImagePreview: ''
        })
    }

    handleAddFuelTokenButton = () => {
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
                pathname: Actions.fuel_token.create.url,
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

    handleDropDownSearchChange = (e, newValue) => {
        if (newValue) {
            this.setState({
                selectedStatus: newValue,
                tableUpdating: true
            }, () => {
                this.getFuelTokenList()
            })
        }
    }

    handleClosePopup = () => {
        this.setState({
            fuel_details: {},
            openPopup: false
        })
    }

    render() {
        const { loading, fuelTokenList, error, selectedStatus, statusList, openPopup, fuel_details,
            largeImagePreview, columns, pagination, yearList, year, dateRangeValue, tableUpdating, year_start_end } = this.state
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            downloadOptions: {
                filename: "Fuel_Tokens.csv",
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
                    <Paper className={classNames('paper-background')}>
                        {largeImagePreview &&
                            <Box className='set-question-large-image-preview-box'>
                                <img src={largeImagePreview} alt='Image Preview' className='set-question-large-image-preview' />
                                <Tooltip title='Close Image' placement='top-start'>
                                    <Box className='set-question-large-image-remove-icon-box'
                                        onClick={this.handleCloseLargeImage}>
                                        <HighlightOffIcon className='set-question-large-image-remove-icon' />
                                    </Box>
                                </Tooltip>
                            </Box>
                        }
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Fuel Tokens
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('fuel_token', 'create') &&
                                        <Button
                                            variant="contained"
                                            onClick={this.handleAddFuelTokenButton}
                                            className='editbutton-view'
                                        ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.fuel_token.create.label}</Button>
                                    }
                                </Box>
                            </Grid>
                        </Grid>
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
                            <Grid item lg={3} md={4} xs={6}>
                                <DropDownWithSearch
                                    id="combo-box-demo"
                                    options={statusList}
                                    value={selectedStatus}
                                    onChange={(e, newValue) => this.handleDropDownSearchChange(e, newValue)}
                                    name='selectedStatus'
                                    optionValue='name'
                                    label='Status'
                                    className='width-100'
                                    error={error['selectedStatus']}
                                    disabled={year ? false : true}
                                    hideClearIcon={true}
                                />
                            </Grid>
                            <Grid item md={4} xs={12}>
                                <DateRange
                                    handleChange={this.handleChangeDateRange}
                                    minDate={dateFormat(year_start_end.start, 'YYYY-MM-DD')}
                                    maxDate={dateFormat(year_start_end.end, 'YYYY-MM-DD')}
                                    label='Transaction date range'
                                    ref={this.dateRange}
                                    hideClearIcon={true}
                                />
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={fuelTokenList.data_list}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> :
                                            `${dateFormat(dateRangeValue.start, 'DD-MM-YYYY')} TO ${dateFormat(dateRangeValue.end, 'DD-MM-YYYY')}`}
                                        data={fuelTokenList.data_list}
                                        columns={columns}
                                        options={options}
                                        onTableChange={this.getFuelTokenList}
                                        serverSide={true}
                                        pagination={pagination}
                                        count={fuelTokenList.count}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                    <Dialog open={openPopup}
                        className='action-basic-detail-width'
                        // onClose={this.handleClosePopup} 
                        aria-labelledby='form-dialog-title'>

                        <Paper className='create-expenses-right-part-paper' ref={(el) => (this.componentRef = el)}>
                            <Box>
                                <Box className='expense-add-fuel-review padding-20'>
                                    Token Details
                                </Box>
                                <Box className='create-expenses-outer-box-label-value'>
                                    <Box className='create-expenses-label'>Token Number</Box>
                                    <Box className='create-expenses-value'>{fuel_details.token_num}</Box>
                                </Box>
                                <Box className='create-expenses-outer-box-label-value'>
                                    <Box className='create-expenses-label'>Staff Name</Box>
                                    <Box className='create-expenses-value'>{getFullName(fuel_details.staff_first_name, fuel_details.staff_middle_name, fuel_details.staff_last_name)}</Box>
                                </Box>
                                <Box className='create-expenses-outer-box-label-value'>
                                    <Box className='create-expenses-label'>Vehicle Name</Box>
                                    <Box className='create-expenses-value'>{fuel_details.other_details && fuel_details.other_details.name}</Box>
                                </Box>
                                <Box className='create-expenses-outer-box-label-value'>
                                    <Box className='create-expenses-label'>Vehicle No.</Box>
                                    <Box className='create-expenses-value'>{fuel_details.other_details && fuel_details.other_details.vehicle_num}</Box>
                                </Box>
                                {fuel_details.for_date &&
                                    <Box className='create-expenses-outer-box-label-value'>
                                        <Box className='create-expenses-label'>Date</Box>
                                        <Box className='create-expenses-value'>{dateFormat(fuel_details.for_date, 'DD-MM-YYYY')}</Box>
                                    </Box>
                                }
                                <Box>
                                    <Divider variant='middle' />
                                    <Box className='create-expenses-outer-box-label-value'>
                                        <Box className='create-expenses-total-label' style={{ width: '46%' }}>No. of liters</Box>
                                        <Box className='create-expenses-total-value'>{fuel_details.liter}</Box>
                                    </Box>
                                </Box>
                            </Box>
                        </Paper>
                        <DialogActions>
                            <Button onClick={this.handleClosePopup} color='secondary'>
                                Close
                            </Button>
                            <ReactToPrint
                                trigger={() =>
                                    <Button variant='contained' color="secondary"
                                        className='submit print '>
                                        <GetAppRoundedIcon />Print
                                    </Button>
                                }
                                content={() => this.componentRef}
                            />
                        </DialogActions>
                    </Dialog>

                </Box>
            )
        }
    }
}
export default withRouter(ViewFuelToken)