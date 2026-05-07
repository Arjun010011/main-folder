import React, { Component } from 'react'
import {
    Paper, Box, Grid, Button, CircularProgress
} from '@material-ui/core';
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

import StaffTimeTableView from './components/StaffTimeTableView';

const ITEM_HEIGHT = 35;


class StaffTimeTableList extends Component {
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
            selectedStaff: {},
            is_staff_found: false,
            staffTimeTableLoading:false,
            open: false,
            anchorEl: null,
            openMenu: '',
            reason: '',
            period_wise: { columns: [] },
            staffTimeTable:{staffData:[]},
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
                    name: "full_name",
                    label: 'Staff Name',
                    options: {
                        filter: true,
                        sort: false,
                    }
                },
                {
                    name: "action",
                    label: 'Action',
                    options: {
                        filter: true,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <>
                                    <Button
                                        className='add-modify-button'
                                        onClick={e => this.handleChangeTimeTable(tableMeta.rowData[0],tableMeta.rowData[1])}
                                    > View Time Table
                                    </Button>
                                </>
                            )
                        }
                    }
                },
            ]
        }
        this.createTimeTable = React.createRef();
    }

    handleChangeTimeTable = (id,name) => {

        const { selectedTimeTableRange ,selectedStaff} = this.state;
        selectedStaff['staff_name']=name
        this.setState({staffTimeTableLoading:true})
        this.createTimeTable.current.handleOpenDialog()
        const url = GET_URL.timetablestaffassigned.api
        const params = { date_range: selectedTimeTableRange, staff: id }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    staffTimeTable: response.data.data ? response.data.data : response.data,
                },()=>{
                    this.createTimeTable.current.handleOpen()
                    this.setState({
                        staffTimeTableLoading:false
                    })
                })
            }
        })
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

    async componentDidMount() {
        const acadmiec_params = { is_active: true };
        const staff_params = { is_active: true, teaching_staff: true };
        try {
            const res = await Promise.all([
                getRequest(GET_URL.getacademicyear.api, acadmiec_params, this.props),
                getRequest(GET_URL.getstafffullname.api, staff_params, this.props),
                getRequest(GET_URL.days.api, {}, this.props),
            ]);
            this.updateAcademicYearList(res[0]['data']['data'])
            this.updateStaffList(res[1]['data']['data'])
            this.updateWorkingDays(res[2]['data']['data'])
            this.setState({
                loading: false
            })
        } catch {
            throw Error("Promise failed");
        }
    }

    updateAcademicYearList = (yearList) => {
        this.setState({
            yearList: yearList,
            selectedYear: getAcademicYear() ? getAcademicYear() : ''
        }, () => {
            if (getAcademicYear()) {
                this.getTimetableDateRangeList()
            }
        })
    }

    updateStaffList = (staffList) => {
        this.setState({
            staffList: staffList
        })
    }


    updateWorkingDays = (responseData) => {
        let { period_wise } = this.state;
        responseData.map((data, index) => {
            if (!data.is_student_working_day) {
                responseData.splice(index, 1)
            }
        })
        period_wise.columns = responseData
        this.setState({
            period_wise
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
            }, () => {
                if (name === 'selectedYear') {
                    this.getTimetableDateRangeList()
                }
            })
        }
    }

    handleCreateRequestChange = () => {
        let { selectedYear, error, yearList, selectedTimeTableRange, timetableRangeList } = this.state;
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

    render() {
        let { loading, tableUpdating, columns, yearList, selectedYear, error, timetableRangeList,selectedStaff,
            selectedTimeTableRange, loadingTimeTableRange, staffList,staffTimeTable,period_wise ,staffTimeTableLoading} = this.state
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
                                    <FormattedMessage {...messages.staffTimeTable} />
                                </Box>
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
                        </Grid>
                        <Grid container className='header-align'>
                            <Grid item md={6} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={staffList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={selectedTimeTableRange ? staffList : []}
                                        columns={columns}
                                        options={options}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                    <StaffTimeTableView
                        staffTimeTable={staffTimeTable}
                        week_day_list={period_wise.columns}
                        selectedStaff={selectedStaff}
                        staffTimeTableLoading={staffTimeTableLoading}
                        ref={this.createTimeTable}
                    />
                </Box>
            )
        }
    }
}

export default withRouter(StaffTimeTableList)