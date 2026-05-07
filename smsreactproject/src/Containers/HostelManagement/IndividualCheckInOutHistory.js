import React, { Component, Fragment } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from '@material-ui/core';
import Swal from 'sweetalert2'
import moment from 'moment';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { DateRange } from 'Components/DateRange';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';

import Skeleton from '@material-ui/lab/Skeleton';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { Dropdown } from 'Components/DropDown';
import StudentListActions from 'Includes/StudentListActions'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, putRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getKeyValueMap, getUrlParam, timeFormat, getPaginationProps, dateFormat } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS, minDate } from 'Constants';
import { values } from 'react-intl/locale-data/hi';

class IndividualCheckInOutHistory extends Component {
    constructor() {
        super()
        this.state = {
            checkIn_checkOut_List: { data_list: [] },
            loading: true,
            dateRangeValue: {},
            error: {},
            floorLoading: false,
            pageLoading: false,
            isOpenedDateRange: false,
            dateRangeDropdownList: [{ id: 'l1m', name: 'Last 1 Month' }, { id: 'l3m', name: 'Last 3 Months' }, { id: 'l6m', name: 'Last 6 Months' }, { id: 'l1y', name: 'Last 1 Year' }],
            isDateRange: false,
            dateRangeDropdown: 'l1m',
            pagination: { ...DEFAULT_PAGINATION_PROPS },
            isBlankPage: true,
            blankData: 'Select date range',
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
                    name: "floor_name",
                    label: "Floor Name",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "room_name",
                    label: "Room Name",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "checkin",
                    label: "Check In",
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {dateFormat(value, 'DD-MM-YYYY hh:mm A')}
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: "checkout",
                    label: "Check Out",
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {dateFormat(value, 'DD-MM-YYYY hh:mm A')}
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: "reason",
                    label: "Reason",
                    options: {
                        filter: false,
                        sort: false,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box className='left-align-width-100' display='flex'>
                                    <Tooltip title={value} enterDelay={500}
                                        enterNextDelay={400} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <Box className='handle-comment-name-overflow'
                                        >
                                            {value}
                                        </Box>
                                    </Tooltip>
                                </Box>
                            )
                        }
                    }
                },
            ],
        }
        this.dateRange = React.createRef();
    }


    componentDidMount = () => {
        let { dateRangeValue } = this.state;
        dateRangeValue.start = dateFormat(moment(new Date()).subtract(1, 'months'), 'YYYY-MM-DD')
        dateRangeValue.end = dateFormat(new Date(), 'YYYY-MM-DD')
        this.setState({
            dateRangeValue
        }, () => {
            this.getCheckInOutHistoryList()
        })
    }

    getCheckInOutHistoryList = (paginationProps) => {
        let { pagination, dateRangeValue } = this.state;
        const id = this.props.location.state.detail;
        const user = this.props.location.state.user;
        const selectedBuilding = this.props.location.state.selectedBuilding;
        const name = this.props.location.state.name;
        dateRangeValue.start = new Date(new Date(dateRangeValue.start).setHours(0, 0, 0, 0))
        dateRangeValue.end = new Date(new Date(dateRangeValue.end).setHours(23, 59, 0, 0))

        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = {
            ...pagination_params, pagination: true, is_active: true,
            fromDate: dateFormat(dateRangeValue.start, 'YYYY-MM-DD HH:mm'), toDate: dateFormat(dateRangeValue.end, 'YYYY-MM-DD HH:mm'),
            user: user
        };
        const url = GET_URL.usercheckincheckout.api + id + '/'
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.data_list.map((data)=>{
                    data['room_name']=data['allocation_detail']['room_name']
                    data['floor_name']=data['allocation_detail']['floor_name']
                })
                this.setState({
                    checkIn_checkOut_List: response.data.data,
                    isBlankPage: false,
                    loading: false,
                    tableUpdating: false,
                    selectedBuilding,
                    user: user,
                    name: name,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })
            }
        })
    }

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
            this.getCheckInOutHistoryList(pagination)
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
            this.getCheckInOutHistoryList()
        })
    }

    gotoViewCheckInCheckOutList = () => {
        let { selectedBuilding, user } = this.state
        let buildingInformation = {
            selectedBuilding: selectedBuilding,
            user: user
        }
        let searchParam = "?" + new URLSearchParams(buildingInformation).toString()
        this.props.history.push({
            pathname: Actions.checkIn_checkOut_List.view.url,
            search: searchParam,
        });
    }


    render() {
        const { loading, name, columns, tableUpdating, isBlankPage, user, floorList,
            checkIn_checkOut_List, pageLoading, blankData, pagination, dateRangeDropdownList, dateRangeDropdown, dateRangeValue, } = this.state
        const { isComponent } = this.props;
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: true,
            viewColumns: true,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            viewColumns: true,
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
                                    Check In-Out History
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('checkIn_checkOut_List', 'view') && <Button
                                        variant='contained'
                                        component={Link} onClick={() => this.gotoViewCheckInCheckOutList()}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.checkIn_checkOut_List.view.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Box className='md-down-justify-start md-up-justify-start mb-y-20'>
                            <Box className="year-std-box mr-40">
                                {user === 'student' ?
                                    <Box className="academic-std-head">Student Name</Box>
                                    :
                                    <Box className="academic-std-head">Staff Name</Box>
                                }
                                <Box className=" exam-mark-add-heading-bg">{name}</Box>
                            </Box>
                        </Box>
                        <Grid container spacing={2}>
                            <Grid item md={4} xs={12} className='margin-top-15'>
                                <Dropdown
                                    data={dateRangeDropdownList}
                                    name='dateRangeDropdown'
                                    value={dateRangeDropdown}
                                    onChange={this.onChangeDateRangeDropdown}
                                    label='Date Range'
                                    hideSelect={true}
                                />
                            </Grid>
                            <Grid item md={4} xs={12}>
                                <DateRange
                                    handleChange={this.handleChangeDateRange}
                                    minDate={minDate}
                                    maxDate={new Date()}
                                    label='Custom Date range'
                                    ref={this.dateRange}
                                    hideClearIcon={true}
                                />
                            </Grid>
                        </Grid>

                        {(isBlankPage && !pageLoading) &&
                            <Box className='header-align'>
                                <BlankPagewithIcon data={blankData} />
                            </Box>
                        }
                        {pageLoading &&
                            <Box display='flex'>
                                <CircularProgress className='loading' />
                            </Box>
                        }
                        {!isBlankPage && !pageLoading &&
                            <Grid container className='header-align'>
                                <Grid item md={12}>
                                    <Paper>
                                        <AllMUIDataTable
                                            key={checkIn_checkOut_List.data_list}
                                            title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                            data={checkIn_checkOut_List.data_list}
                                            columns={columns}
                                            options={options}
                                            onTableChange={this.getCheckInOutHistoryList}
                                            serverSide={true}
                                            pagination={pagination}
                                            count={checkIn_checkOut_List.count}
                                        />
                                    </Paper>
                                </Grid>
                            </Grid>
                        }

                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(IndividualCheckInOutHistory)




