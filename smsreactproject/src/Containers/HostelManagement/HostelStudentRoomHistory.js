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
import { isUserHasPermission, numberWithCommas, timeFormat, getPaginationProps, dateFormat } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS, minDate } from 'Constants';
import { values } from 'react-intl/locale-data/hi';

class HostelStudentRoomHistory extends Component {
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
                        download: false
                    }
                },
                {
                    name: "allocation_details",
                    label: "Floor (Room)",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "checkin",
                    label: "Start Date",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "checkout",
                    label: "End Date",
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
            ],
        }
    }


    componentDidMount = () => {
        let { dateRangeValue } = this.state;
        dateRangeValue.start = dateFormat(moment(new Date()).subtract(1, 'months'), 'YYYY-MM-DD')
        dateRangeValue.end = dateFormat(new Date(), 'YYYY-MM-DD')
        this.setState({
            dateRangeValue
        }, () => {
            this.getStudentHistoryList()
        })
    }

    getStudentHistoryList = () => {
        const id = this.props.location.state.detail;
        const selectedBuilding = this.props.location.state.selectedBuilding;
        const name = this.props.location.state.name;
        let params = { is_active: true, history_data: true }
        const url = GET_URL.student_hostel_details.api + id + '/'
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.roomallocation_student.map((data) => {
                    data.allocation_details = `${data['floor_name']} (${data['room_name']})`
                    data.checkin = data.checkin ? dateFormat(data.checkin, 'DD-MM-YYYY hh:mm:ss A') : ''
                    data.checkout = data.checkout ? dateFormat(data.checkout, 'DD-MM-YYYY hh:mm:ss A') : ''
                })
                this.setState({
                    checkIn_checkOut_List: response.data.data.roomallocation_student,
                    isBlankPage: false,
                    loading: false,
                    tableUpdating: false,
                    selectedBuilding,
                    name: name,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })
            }
        })
    }

    gotoViewCheckInCheckOutList = () => {
        let { selectedBuilding } = this.state
        let buildingInformation = {
            selectedBuilding: selectedBuilding,
        }
        let searchParam = "?" + new URLSearchParams(buildingInformation).toString()
        this.props.history.push({
            pathname: Actions.hostel_student_transaction_list.view.url,
            search: searchParam,
        });
    }


    render() {
        const { loading, name, columns, tableUpdating, isBlankPage, 
            checkIn_checkOut_List, pageLoading, blankData } = this.state
        const { isComponent } = this.props;
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
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
                                    Room History
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('hostel_student_transaction_list', 'view') && <Button
                                        variant='contained'
                                        onClick={() => this.gotoViewCheckInCheckOutList()}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.hostel_student_transaction_list.view.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Box className='md-down-justify-start md-up-justify-start mb-y-20'>
                            <Box className="year-std-box mr-40">
                                <Box className="academic-std-head">Student Name</Box>
                                <Box className=" exam-mark-add-heading-bg">{name}</Box>
                            </Box>
                        </Box>
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
                                            key={checkIn_checkOut_List}
                                            title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                            data={checkIn_checkOut_List}
                                            columns={columns}
                                            options={options}
                                        // onTableChange={this.getStudentHistoryList}
                                        // serverSide={true}
                                        // pagination={pagination}
                                        // count={checkIn_checkOut_List.count}
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
export default withRouter(HostelStudentRoomHistory)




