import React, { Component } from 'react'
import {
    Paper, Box, Grid, Button, CircularProgress, DialogTitle, FormControl, TextareaAutosize, DialogActions,
    DialogContentText, DialogContent, Dialog, FormHelperText
} from '@material-ui/core';
import { Link } from 'react-router-dom';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import loadingBar from 'images/loading.gif';
import { Actions } from 'Constants/permissions';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest, deleteRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL, POST_URL } from 'Includes/urls';
import { isUserHasPermission, getPaginationProps, getKeyValueMap, getAcademicYear, dateFormat, getUrlParam } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import { Dropdown } from 'Components/DropDown';
import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages'
import messages from './messages';
import Skeleton from '@material-ui/lab/Skeleton';
import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import moment from 'moment';
import { DateRange } from 'Components/DateRange';
import { APPROVAL_STATUS } from 'Constants';
import ActionColumnNew from 'Components/ActionColumnNew'
import Swal from 'sweetalert2';

const ITEM_HEIGHT = 35;

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class StaffRequestChangeView extends Component {
    constructor() {
        super()
        this.permission = ['approve', 'reject']
        this.state = {
            yearList: [],
            timetableRangeList: [],
            selectedYear: '',
            selectedTimeTableRange: '',
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            staffRequestList: {},
            isSubCategory: false,
            error: {},
            loading: true,
            closeMenu: true,
            tableUpdating: false,
            loadingTimeTableRange: false,
            errorContent: '',
            enabledActions: [],
            fromDate: '',
            toDate: '',
            staffList: [],
            selectedStaff: '',
            is_staff_found: false,
            open: false,
            anchorEl: null,
            openMenu: '',
            reason: '',
            columns: [
                {
                    name: "id",
                    label: 'Staff Name',
                    options: {
                        filter: true,
                        sort: false,
                        display: false,
                        download: false
                    }
                },
                {
                    name: "staff_name",
                    label: 'Staff Name',
                    options: {
                        filter: true,
                        sort: false,
                        display: false,
                        download: false
                    }
                },
                {
                    name: "subject_name",
                    label: 'Staff Name',
                    options: {
                        filter: true,
                        sort: false,
                        display: false,
                        download: false
                    }
                },
                {
                    name: "timetable_schedule",
                    label: `${alias_names['standard']} (Section)`,
                    options: {
                        filter: true,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {`${value.standard_name} (${value.section_name})`}
                                </Box>
                            )

                        }
                    }
                },
                {
                    name: "fordate",
                    label: 'Date',
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {`${dateFormat(value, 'DD-MM-YYYY')} (${dateFormat(value, 'dddd')})`}
                                </Box>
                            )

                        }
                    }
                },
                {
                    name: "timetable_schedule",
                    label: 'Period Name (Timings)',
                    options: {
                        filter: true,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {`${value.period_name} (${value.period_start_time} - ${value.period_end_time})`}
                                </Box>
                            )

                        }
                    }
                },
                {
                    name: "timetable_schedule",
                    label: 'Existing Staff (Subject)',
                    options: {
                        filter: true,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {`${value.full_name} (${value.subject_name})`}
                                </Box>
                            )

                        }
                    }
                },
                {
                    name: "timetable_schedule",
                    label: 'Alternate Staff (Subject)',
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {`${tableMeta.rowData[1]} (${tableMeta.rowData[2]})`}
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: "approval_data",
                    label: 'Approval Status',
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {value === 'Unapproved' &&
                                        <Box color='#FFC700'>Approval Pending</Box>
                                    }
                                    {value === 'Approved' &&
                                        <Box color='#18A453'>Approved</Box>
                                    }
                                    {value === 'Rejected' &&
                                        <Box color='#FF0000'>Rejected</Box>
                                    }
                                </Box>
                            )
                        }
                    }
                },

                {
                    name: "action",
                    label: ' ',
                    options: {
                        filter: true,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <>
                                    {tableMeta.rowData[8] === 'Unapproved' &&
                                        <ActionColumnNew
                                            id={tableMeta.rowData[0]}
                                            handleRejectButton={this.handleRejectButton}
                                            handleApproveButton={this.ApproveAltTeacher}
                                            enabledActions={this.permission}
                                        />
                                    }
                                </>
                            )
                        }
                    }
                },
            ]
        }
    }



    handleClick = event => {
        this.setState({
            anchorEl: event.currentTarget,
            openMenu: Boolean(event.currentTarget)
        })
    };

    handleCloseMenu = () => {
        this.setState({
            anchorEl: null,
            openMenu: false
        })
    };

    componentDidMount() {
        this.getAcademicYearList()
        this.getStaffList()
    }

    getAcademicYearList = () => {
        const uel = GET_URL.getacademicyear.api
        const params = { is_active: 1 }
        getRequest(uel, params, this.props).then(response => {
            if (response && response.status === 200) {
                let fromYear, ToYear
                response.data.data.map((data) => {
                    fromYear = data.start_date.split('-');
                    ToYear = data.end_date.split('-');
                    // data.name = fromYear[0] + '-' + ToYear[0]
                })
                this.setState({
                    yearList: response.data.data,
                    loading: false,
                    selectedYear: getAcademicYear() ? getAcademicYear() : ''
                }, () => {
                    if (getAcademicYear()) {
                        this.getTimetableDateRangeList()
                    }
                })
            }
        })
    }

    getStaffList = () => {
        const url = GET_URL.getstafffullname.api
        const params = { is_active: true, teaching_staff: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let { staffList } = this.state
                staffList = response.data.data
                staffList.unshift({ id: 'all', full_name: "All" })
                this.setState({
                    staffList: staffList,
                    loading: false,
                    selectedStaff: { id: 'all', full_name: "All" },
                    staff_detail: ''
                })
            }
        })
    }

    getTimetableDateRangeList = () => {
        const { selectedYear } = this.state;
        const uel = GET_URL.timetabledaterange.api
        const params = { is_active: 1, academic_year: selectedYear }
        const { selectedTimeTableRange } = getUrlParam();
        getRequest(uel, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    timetableRangeList: response.data.data,
                    loading: false,
                    loadingTimeTableRange: false,
                    selectedTimeTableRange: selectedTimeTableRange ? selectedTimeTableRange : ''
                }, () => {
                    if (selectedTimeTableRange) {
                        this.getRequestChangeList()
                    }
                })
            }
        })
    }

    getRequestChangeList = (paginationProps) => {
        let { selectedYear, pagination, selectedTimeTableRange, selectedStaff } = this.state
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        const url = GET_URL.timetablerequestchange.api
        let params = { ...pagination_params, is_active: true, academic_year: selectedYear }
        if (selectedTimeTableRange !== '') {
            params['date_range'] = selectedTimeTableRange
        }
        if (selectedStaff.id !== 'all') {
            params['staff'] = selectedStaff.id
        }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    staffRequestList: response.data.data,
                    tableUpdating: false,
                    loading: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })
            }
        })
    }

    onChange = async (e) => {
        let { value, name } = e.target;
        let { error } = this.state;
        if (value !== 0) {
            error = {}
            this.setState({
                [name]: value,
                error,
                selectedTimeTableRange: name === 'selectedYear' ? '' : value,
                loadingTimeTableRange: name === 'selectedYear' ? true : false,
                tableUpdating: true
            }, () => {
                if (name === 'selectedYear') {
                    this.getTimetableDateRangeList()
                }
                this.getRequestChangeList()
            })
        }
    }

    handleCreateRequestChange = () => {
        let { selectedYear, error, alertData, yearList, selectedTimeTableRange, timetableRangeList } = this.state;
        if (selectedYear && selectedTimeTableRange !== '') {
            let fromDate, toDate, TimeTableRangeName
            timetableRangeList.map((data) => {
                if (data.id == selectedTimeTableRange) {
                    fromDate = data.start_date
                    toDate = data.end_date
                    TimeTableRangeName = data.name
                }
            })
            let yearName = getKeyValueMap(yearList, 'id', 'name')
            yearName = yearName[selectedYear]
            let currentSelectedList = {
                selectedYear: selectedYear,
                yearName: yearName,
                fromDate: fromDate,
                toDate: toDate,
                selectedTimeTableRange: selectedTimeTableRange,
                TimeTableRangeName: TimeTableRangeName,
            }
            let searchParam = "?" + new URLSearchParams(currentSelectedList).toString()
            this.props.history.push({
                pathname: Actions.alternate_staff_timetable.create.url,
                search: searchParam,
            });
        }
        else if (!selectedYear) {
            error.selectedYear = 'Select Academic Year'
        }
        else if (selectedTimeTableRange === '') {
            error.selectedTimeTableRange = 'select timetable date range '
        }
        this.setState({
            error
        })

    }

    handleDropDownWithSearchChange = (e, newValue) => {
        let { error } = this.state;
        delete error['selectedStaff']
        this.setState({
            selectedStaff: newValue,
            error,
        }, () => {
            this.getRequestChangeList()
        })
    }

    ApproveAltTeacher = (id) => {
        Swal.fire({
            title: `<strong>Are you sure want to Approve</strong>`,
            text: "",
            type: 'info',
            showCloseButton: true,
            showCancelButton: true,
            focusConfirm: false,
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancel',
            confirmButtonColor: 'green',
            cancelButtonColor: 'orange',
        }).then((result) => {
            if (result.value) {
                this.setState({
                    tableUpdating: true
                })
                this.approveRequest(id)
            }
        });
    }

    approveRequest = (id) => {
        let post_data = {
            approval_status: APPROVAL_STATUS.approved,
            id: id,
            reason: '',
        }
        let url = POST_URL.approvetimetablerequestchange.api
        postRequest(url, post_data, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.getRequestChangeList();
                }
                this.setState({
                    tableUpdating: false
                })
            });
    }

    handleRejectButton = (id) => {
        this.setState({
            selectedId: id,
            reasonOpen: true
        })
    }

    handleCloseReason = () => {
        this.setState({
            reasonOpen: false
        })
    }

    rejectScheduledExam = () => {
        const { selectedId, reason, error } = this.state;
        if (!reason) {
            error['reason'] = 'Please Enter Reason'
            this.setState({
                error
            })
            return
        }
        let post_data = {
            approval_status: APPROVAL_STATUS.rejected,
            id: selectedId,
            reason: reason,
        }
        let url = POST_URL.approvetimetablerequestchange.api
        let props = { ...this.props };
        props['return_error_message'] = true
        postRequest(url, post_data, props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: 'Your Data has been saved',
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.getRequestChangeList();
                    this.handleCloseReason()
                }
                else {
                    this.setState({
                        errorContent: response
                    })
                }
            });
    }


    onChangeReason = (e) => {
        let { name, value } = e.target;
        let { error } = this.state;
        delete error['reason']
        this.setState({
            [name]: value,
            error
        })
    }

    render() {
        let { staffRequestList, loading, tableUpdating, columns, yearList, selectedYear, error, timetableRangeList, reason,
            pagination, selectedTimeTableRange, loadingTimeTableRange, selectedStaff, staffList, is_staff_found, reasonOpen } = this.state
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: false,
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
                            <Grid item md={8} xs={12} className='header-align'>
                                <Box className='heading'>
                                    <FormattedMessage {...messages.staffRequestChange} />
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                {isUserHasPermission('alternate_staff_timetable', 'create') && <Box className='header-align end-flex-prop'>
                                    <Button
                                        variant="contained"
                                        onClick={this.handleCreateRequestChange}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' />{Actions.alternate_staff_timetable.create.label}</Button>
                                </Box>
                                }
                            </Grid>
                        </Grid>
                        <Grid container spacing={3}>
                            <Grid item md={3} xs={12} className='margin-top-20'>
                                <Dropdown
                                    data={yearList}
                                    name='selectedYear'
                                    style='width-100'
                                    value={selectedYear}
                                    onChange={this.onChange}
                                    label={<FormattedMessage {...commonMessages.academicYear} />}
                                    error={error.selectedYear}
                                    hideSelect={true}
                                />
                            </Grid>
                            <Grid item md={3} xs={12} className='margin-top-20'>
                                {loadingTimeTableRange ?
                                    <Skeleton variant="rect" className='drop-down-skeleton m-t-10px'></Skeleton>
                                    :
                                    <Dropdown
                                        data={timetableRangeList}
                                        name='selectedTimeTableRange'
                                        style='width-100'
                                        value={selectedTimeTableRange}
                                        onChange={this.onChange}
                                        label={<FormattedMessage {...messages.timetableRange} />}
                                        error={error.selectedTimeTableRange}
                                        hideSelect={true}
                                    />
                                }
                            </Grid>
                            <Grid item md={3} xs={12} className='margin-top-20'>
                                {/* <DropDownWithSearch
                                    id="combo-box-demo"
                                    options={staffList}
                                    value={selectedStaff}
                                    onChange={(e, newValue) => this.handleDropDownWithSearchChange(e, newValue)}
                                    optionValue='full_name'
                                    name='staff'
                                    label={<FormattedMessage {...commonMessages.staffName} />}
                                    className='width-100'
                                    helperText={error['selectedStaff'] && error['selectedStaff']}
                                    error={error['selectedStaff']}
                                /> */}
                            </Grid>
                        </Grid>
                        <Grid container className='header-align'>
                            <Grid item md={12} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        key={staffRequestList.data_list}
                                        data={staffRequestList.data_list}
                                        columns={columns}
                                        options={options}
                                        onTableChange={this.getRequestChangeList}
                                        serverSide={true}
                                        pagination={pagination}
                                        count={staffRequestList.count}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                    <Dialog className='schedule-reject-popup' open={reasonOpen} onClose={this.handleCloseReason} aria-labelledby="form-dialog-title">
                        <DialogTitle id="form-dialog-title"></DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                Enter Reject Reason
                            </DialogContentText>
                            <FormControl
                                fullWidth
                                error={error.reason && (error.reason ? true : false)}
                            >
                                <Box className='leave-pending-staff-label'>Reason</Box>
                                <TextareaAutosize aria-label="minimum height"
                                    className='apply-leave-text-area-auto-size-reason'
                                    value={reason}
                                    name='reason'
                                    onChange={this.onChangeReason}
                                    required
                                />
                                {error.reason &&
                                    <FormHelperText>{error.reason}</FormHelperText>
                                }
                            </FormControl>
                        </DialogContent>
                        <DialogActions>
                            <Box className='leave-pending-approve-reject'>
                                <Button
                                    className='apply-leave-reset-button'
                                    onClick={e => this.rejectScheduledExam()}>Reject
                                </Button>
                                <Button
                                    className='apply-leave-button '
                                    onClick={e => this.handleCloseReason()}>Close
                                </Button>
                            </Box>

                        </DialogActions>
                    </Dialog>
                </Box>
            )
        }
    }
}

export default withRouter(StaffRequestChangeView)
