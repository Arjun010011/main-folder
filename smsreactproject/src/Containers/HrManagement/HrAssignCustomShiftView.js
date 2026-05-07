import React, { Component, Fragment } from 'react';
import { Paper, Box, Grid, Typography, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import _ from 'lodash';

import { DateRange } from 'Components/DateRange';
import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import { Dropdown } from 'Components/DropDown';
import ActionColumn from 'Components/ActionColumnNew';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import { nameAndNumberRegex } from 'Constants/regularExpression';
import { Actions } from 'Constants/permissions';
import { dateFormat, isUserHasPermission, timeFormat, getFinancialYear, SetFinancialYear } from 'Includes/functions';
import { minDate, maxDate } from 'Constants';

const fieldDetails_global = [
    {
        label: 'Shift Name', regex: nameAndNumberRegex, name: 'shift_name', md: 12, className: 'width-100', required: true, id: 'outlined-textarea',
        default: '', rows: null, type: 'dropDown', autoFocus: true, maxLength: '25', list: []
    },
    {
        label: 'From Date', regex: null, name: 'from_date', md: 12, className: 'width-100', required: true, id: 'outlined-textarea',
        default: '', rows: null, type: 'date', minDate: new Date(), maxDate: maxDate,
    },
    {
        label: 'To Date', regex: null, name: 'to_date', md: 12, className: 'width-100', required: true, id: 'outlined-textarea',
        default: '', rows: null, type: 'date', maxDate: maxDate, parentMinDate: 'from_date'
    },
]

class HrAssignCustomShiftView extends Component {
    constructor() {
        super()
        this.state = {
            assignShiftList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            fieldDetails: null,
            shiftListLoaded: false,
            pageLoading: false,
            isBlankPage: true,
            dateRangeValue: {},
            yearList: [],

            year: '',
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false,
                    }
                },
                {
                    name: "staff_name",
                    label: "Staff Name",
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div className='mui-table-custom-value-left-align'>
                                {value}
                            </div>)

                        }
                    }
                },
                {
                    name: "shift__name",
                    label: "Shift Name",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "shift",
                    label: "shiftId",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false,
                    }
                },
                {
                    name: "fromdate",
                    label: "From Date",
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return dateFormat(value, 'DD-MM-YYYY')
                        },
                    }
                },
                {
                    name: "todate",
                    label: "To Date",
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return dateFormat(value, 'DD-MM-YYYY')
                        },
                    }
                },
                {
                    name: "custom_time_start",
                    label: "Custom Start Time",
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value) => {
                            return value || '—'
                        },
                    }
                },
                {
                    name: "custom_time_end",
                    label: "Custom End Time",
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value) => {
                            return value || '—'
                        },
                    }
                },
                {
                    name: "custom_buffer_time",
                    label: "Buffer (min)",
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value) => {
                            return value !== null && value !== undefined ? `${value} min` : '—'
                        },
                    }
                },
                {
                    name: "custom_late_buffer_time",
                    label: "Late Buffer (min)",
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value) => {
                            return value !== null && value !== undefined ? `${value} min` : '—'
                        },
                    }
                },
                {
                    name: "staff",
                    label: "staff",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false,
                    }
                },
                {
                    name: "Actions",
                    label: "Action",
                    options: {
                        display: this.updatePermissions('display'),
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={this.fieldValues(tableMeta.rowData[3], tableMeta.rowData[4], tableMeta.rowData[5])}
                                    label={`Update Custom Shift For ${tableMeta.rowData[1]}`}
                                    fieldDetails={this.state.fieldDetails}
                                    updateUrl={PUT_URL.assignshift.api}
                                    updatePostFormat={this.updatePostFormat}
                                    getData={this.getShiftList}
                                    isGetData={true}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.assignshift.api}
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
        this.dateRange = React.createRef();
    }

    fieldValues(name, from_date, to_date) {
        let fieldValues = [];
        fieldValues.push(name);
        fieldValues.push(from_date);
        fieldValues.push(to_date);
        return fieldValues
    }

    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('assign_custom_shift', 'update')
        const hasDeletePermission = isUserHasPermission('assign_custom_shift', 'delete')
        let permissions = [];
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
            permissions.push('assign_custom_shift');
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
            permissions.push('assign_custom_shift');
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
        this.getFinancialYearList();
        this.updatePermissions('actions');
        this.setState({
            fieldDetails: fieldDetails_global,
        })
    }

    onFilterChangeHandler = (type, filterList) => {
        if (type === 'reset') {
            let { FinancialYearFromDate, FinancialYearToDate } = this.state;
            this.setState({
                tableUpdating: true,
                fromDate: FinancialYearFromDate,
                toDate: FinancialYearToDate
            }, () => {
                this.getAssignShiftList(FinancialYearFromDate, FinancialYearToDate)
                this.dateRange.current.handleClear();
            })
        }
    }


    handleChangeDateRange = (value) => {
        let { dateRangeValue, FinancialYearFromDate, FinancialYearToDate } = this.state;
        if (!value.start) {
            value.start = FinancialYearFromDate
            value.end = FinancialYearToDate
        }
        dateRangeValue = { ...value }
        this.setState({
            dateRangeValue,
            tableUpdating: true,
            fromDate: value.start,
            toDate: value.end
        }, () => {
            this.getAssignShiftList(dateRangeValue.start, dateRangeValue.end)
        })
    }

    geFilterOptions = () => {
        let { fromDate, toDate } = this.state;
        return <Fragment>
            <Box className='header-align'>
                <DateRange
                    handleChange={this.handleChangeDateRange}
                    minDate={minDate}
                    maxDate={maxDate}
                    startDate={fromDate}
                    endDate={toDate}
                    ref={this.dateRange}
                />
            </Box>
        </Fragment>;
    }


    getFinancialYearList = async () => {
        const f_url = GET_URL.financialyear.api
        const param = { is_active: true }
        await getRequest(f_url, param, this.props).then(response => {
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
                    loading: false
                }, () => {
                    if (getFinancialYear()) {
                        let year = getFinancialYear()
                        if (year !== 0) {
                            let fromDate, toDate
                            this.state.yearList.map((data) => {
                                if (data.id == year) {
                                    fromDate = data.start_date
                                    toDate = data.end_date
                                }
                            })
                            this.setState({
                                fromDate,
                                toDate,
                                FinancialYearFromDate: fromDate,
                                FinancialYearToDate: toDate,
                                pageLoading: true,
                                year: year
                            }, () => {
                                this.getAssignShiftList(fromDate, toDate)
                            })
                        }
                    }
                })
            }
        })
    }

    onChangeYear = (e) => {
        let { name, value } = e.target;
        if (value !== 0) {
            let fromDate, toDate
            this.state.yearList.map((data) => {
                if (data.id == value) {
                    fromDate = data.start_date
                    toDate = data.end_date
                }
            })
            SetFinancialYear(value)
            this.setState({
                fromDate,
                toDate,
                pageLoading: true,
                [name]: value,
                error: {}
            }, () => {
                this.getAssignShiftList(fromDate, toDate)
            })
        }
    }

    getAssignShiftList = (fromDate, toDate) => {
        const url = GET_URL.assignshift.api
        const params = { is_active: true, fromdate: fromDate, todate: toDate, priority_gte: 10 }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    assignShiftList: response.data.data,
                    loading: false,
                    isBlankPage: false,
                    pageLoading: false,
                    tableUpdating: false
                })
            }
        })
    }

    getShiftList = async () => {
        let { shiftListLoaded, fieldDetails } = this.state;
        if (!shiftListLoaded) {
            const url = GET_URL.shift.api
            const params = { is_active: true }
            await getRequest(url, params, this.props).then(response => {
                if (response && response.status === 200) {
                    fieldDetails[0]['list'] = response.data.data
                    this.setState({
                        shiftList: response.data.data,
                        fieldDetails: [...fieldDetails],
                        columns: [...this.state.columns],
                        shiftListLoaded: true
                    })
                }
                return true
            })
        }
        else {
            return true
        }
    }

    updatePostFormat = (newData) => {
        let payload = {
            shift: newData.shift_name,
            fromdate: dateFormat(newData.from_date, 'YYYY-MM-DD'),
            todate: dateFormat(newData.to_date, 'YYYY-MM-DD')
        }
        return payload
    }


    updateType = (newData, id) => {
        this.setState({ tableUpdating: true })
        let shift = this.state.assignShiftList
        shift.map((data, index) => {
            if (data.id === id) {
                shift[index].shift_name = newData.shift_name
                shift[index].fromdate = dateFormat(newData.from_date, 'YYYY-MM-DD')
                shift[index].todate = dateFormat(newData.to_date, 'YYYY-MM-DD')
            }
        })
        this.setState({
            assignShiftList: [...shift],
            tableUpdating: false,
            columns: this.state.columns
        })
        return true
    }


    deleteType = async (id, name) => {
        let shift = this.state.assignShiftList
        shift.map((data, index) => {
            if (data.id === id) {
                shift.splice(index, 1)
            }
        })
        this.setState({
            assignShiftList: shift
        })
    }


    render() {
        const { loading, assignShiftList, columns, fieldDetails, tableUpdating, yearList, year, isBlankPage, pageLoading,
            fromDate, toDate } = this.state
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: true,
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
            onDownload: (buildHead, buildBody, columns, data) => {
                const bodyData = data.map((data_value, i) => {
                    data_value[3] = dateFormat(data_value[3], 'DD-MM-YYYY')
                    data_value[4] = dateFormat(data_value[4], 'DD-MM-YYYY')
                    return data_value;
                })
                return "\uFEFF" + buildHead(columns) + buildBody(bodyData);
            },
            downloadOptions: {
                filename: "Custom_Shift_Assigned.csv",
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
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Custom / Temporary Shift Assigned
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('assign_custom_shift', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.assign_custom_shift.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.assign_custom_shift.create.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Box className='header-align'>
                            <Dropdown
                                data={yearList}
                                name='year'
                                value={year}
                                onChange={this.onChangeYear}
                                label='Financial year'
                            />
                        </Box>
                        {!isBlankPage &&
                            <Box className='header-align' style={{ marginTop: 10 }}>
                                <DateRange
                                    handleChange={this.handleChangeDateRange}
                                    minDate={minDate}
                                    maxDate={maxDate}
                                    startDate={fromDate}
                                    endDate={toDate}
                                    ref={this.dateRange}
                                />
                            </Box>
                        }
                        <Box className='staff-list-assigned-shift'>Note : Custom / temporary event shift assignments (priority overrides) are listed below.</Box>
                        <Grid container className={classNames('flex-justify-center', 'header-align')}>
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
                                <Grid item md={12} xs={12}>
                                    <Paper>
                                        {fieldDetails &&
                                            <AllMUIDataTable
                                                key={assignShiftList}
                                                title={tableUpdating ?
                                                    <CircularProgress className='white-text' /> :
                                                    `From ${dateFormat(fromDate, 'DD-MM-YYYY')} - To ${dateFormat(toDate, 'DD-MM-YYYY')}`}
                                                data={assignShiftList}
                                                columns={columns}
                                                options={options}
                                            />
                                        }
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
export default HrAssignCustomShiftView
