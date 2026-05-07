import React, { useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Button, Box, Dialog, Slide, Grid, AppBar, Toolbar, Typography, IconButton, CircularProgress, Tooltip } from '@material-ui/core';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import CloseIcon from '@material-ui/icons/Close';
import Snackbar from '@material-ui/core/Snackbar';
import { MuiPickersUtilsProvider, KeyboardDateTimePicker, KeyboardTimePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import { Dropdown } from 'Components/DropDown';
import Swal from 'sweetalert2';
import _ from 'lodash';

import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import loadingBar from 'images/loading.gif'
import {
    checkLocalAcademicYear, SetAcademicYear, Alert, getPaginationProps,
    getFullName, dateFormat, validateDate, getKeyValueMap
} from 'Includes/functions';
import { GET_URL, POST_URL } from 'Includes/urls';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { TrendingUpTwoTone } from '@material-ui/icons';
import { DEFAULT_PAGINATION_PROPS, minDate, maxDate } from 'Constants';

const { forwardRef, useRef, useImperativeHandle } = React;

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles((theme) => ({
    appBar: {
        position: 'relative',
        backgroundColor: '#4680FF'
    },
    title: {
        marginLeft: theme.spacing(2),
        flex: 1,
    },
}));

const AddStudentToAllocation = forwardRef((props, ref) => {

    const [open, setOpen] = React.useState(false);
    const [roomName, setRoomName] = React.useState('');
    const [studentList, setStudentList] = React.useState(null);
    const [pageLoading, setPageLoading] = React.useState(true);
    const [yearList, setYearList] = React.useState([]);
    const [standardList, setStandardList] = React.useState([]);
    const [year, setYear] = React.useState('');
    const [standard, setStandard] = React.useState('');
    const [section, setSection] = React.useState('');
    const [checkIn, setCheckIn] = React.useState(null);
    const [checkOut, setCheckOut] = React.useState(null);
    const [fieldError, setFieldError] = React.useState({});
    const [checkInError, setCheckInError] = React.useState(null);
    const [checkOutError, setCheckOutError] = React.useState(null);
    const [checkInMinDate, setCheckInMinDate] = React.useState(minDate);
    const [checkInMaxDate, setCheckInMaxDate] = React.useState(maxDate);
    const [submitDisable, setSubmitDisable] = React.useState(false);
    const [errorContent, setErrorContent] = React.useState('');
    const [studentId, setStudentId] = React.useState('');
    const [pagination, setPagination] = React.useState(DEFAULT_PAGINATION_PROPS);
    const [blankData, setBlankData] = React.useState(`Select year, ${alias_names['standard']} and start date`);
    const [tableUpdating, setTableUpdating] = React.useState(false);
    const [openSnackBar, setOpenSnackBar] = React.useState(false);

    const [date_range, set_date_range] = React.useState({ minDate: '', maxDate: '' });
    const [startDateObject, setStartDateObject] = React.useState({});
    const [endDateObject, setEndDateObject] = React.useState({});

    const [columns, setColumn] = React.useState([
        {
            name: "id",
            label: "id",
            options: {
                filter: false,
                sort: false,
                display: false,
            },
        },
        {
            name: 'full_name',
            label: 'Name',
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: "curren_standard_name",
            label: "Standard",
            options: {
                filter: false,
                sort: true,
                display: true
            }
        },
        {
            name: "current_reg_num",
            label: "Register Number",
            options: {
                filter: false,
                sort: true,
                display: true
            }
        },
        {
            name: 'mobile_num',
            label: 'Mobile Number',
            options: {
                filter: true,
                sort: true,
            }
        },
        {
            name: 'roomallocation_student',
            label: 'Building Name',
            options: {
                filter: true,
                sort: true,
                customBodyRender: (value, tableMeta, updateValue) => {
                    return (
                        <Box>
                            {!_.isEmpty(value) &&
                                value.building_name
                            }
                        </Box>
                    )
                }
            }
        },
        {
            name: 'roomallocation_student',
            label: 'Floor (Room Name)',
            options: {
                filter: true,
                sort: true,
                customBodyRender: (value, tableMeta, updateValue) => {
                    return (
                        <Box>
                            {!_.isEmpty(value) &&
                                `${value.floor_name} (${value.room_name})`
                            }
                        </Box>
                    )
                }
            }
        },
        {
            name: 'roomallocation_student',
            label: 'Actions',
            options: {
                filter: true,
                sort: true,
                customBodyRender: (value, tableMeta, updateValue) => {
                    return (
                        <Tooltip title={_.isEmpty(value) ? '' : 'Already assigned'} enterDelay={400}
                            enterNextDelay={400} placement='top-start'
                            classes={{ tooltip: 'tooltip-show-data' }}>
                            <Button
                                className={_.isEmpty(value) ? 'add-modify-button' : 'add-modify-button disable-button'}
                                onClick={e => _.isEmpty(value) ? setAndSubmit(tableMeta.rowData[0]) : ''}
                            > Add Student
                            </Button>
                        </Tooltip>
                    );
                }
            }
        }

    ]);

    const setAndSubmit = (id) => {
        setStudentId(id)
    }

    useEffect(() => {
        submit()
    }, [studentId]);


    const classes = useStyles();
    useImperativeHandle(
        ref,
        () => ({
            openModal(roomName) {
                setYearList([])
                setStudentList(null)
                setStandardList([])
                setOpen(true);
                setCheckIn(null)
                setCheckOut(null)
                setErrorContent('')
                setRoomName(roomName)
                getAcademicYearList()
                setStandard('')
            }
        }),
    )


    const getAcademicYearList = () => {
        const params = {};
        getRequest(GET_URL.getacademicyear.api, params, props).then((response) => {
            if (response && response.status === 200) {
                const yearList = response.data.data;
                const year = checkLocalAcademicYear(yearList);
                setYearList(yearList)
                setPageLoading(false)
                let start_date_object = getKeyValueMap(yearList, 'id', 'start_date')
                let end_date_object = getKeyValueMap(yearList, 'id', 'end_date')
                setStartDateObject(() => start_date_object)
                setEndDateObject(() => end_date_object)
                if (year !== 0) {
                    let date_range = {}
                    date_range['minDate'] = start_date_object[year]
                    date_range['maxDate'] = end_date_object[year]
                    set_date_range(() => date_range)
                    setYear(year)
                    setBlankData(`Select ${alias_names['standard']} and start date`)
                    getStandardList();
                }
            }
        });
    }

    const getStandardList = () => {
        const params = { academic_year: year, is_active: true };
        getRequest(GET_URL.getstandardandsection.api, params, props).then((response) => {
            if (response && response.status === 200) {
                const standardList = response.data.data;
                standardList.unshift({ id: 'all', name: 'All'})
                setStandardList(standardList)
                setStandard(()=>'all')
            }
        });
    }

    const handleClose = () => {
        props.getRoomDetails()
        setOpen(false);
    };


    const onChange = (e) => {
        let value = e.target.value;
        const name = e.target.name;
        if (value !== 0) {
            if (name === 'year') {
                SetAcademicYear(value)
                setYear(value)
                setStandard('')
                setStudentList([])
                let date_range = {}
                date_range['minDate'] = startDateObject[value]
                date_range['maxDate'] = endDateObject[value]
                set_date_range(() => date_range)
                setCheckIn(null)
                setCheckOut(null)
            }
            else if (name === 'standard') {
                if (!checkIn) {
                    setBlankData('select start date')
                }
                setStandard(value)
            }
            setErrorContent('')
            setStudentId(null)
        }
    }



    const getStudentList = (paginationProps) => {
        let validate = validateBeforeGetStudents()
        if (validate) {
            setTableUpdating(true)
            let currentPagination = pagination;
            if (paginationProps) {
                currentPagination = { ...paginationProps };
            }
            let pagination_params = getPaginationProps(currentPagination);
            let params = {
                ...pagination_params, is_active: true, academic_year: year, pagination: true, is_active: true, 
                user: 'student', checkin: dateFormat(checkIn, 'YYYY-MM-DD HH:mm:ss')
            }
            if(standard!=='all'){
                params['standard']= standard
            }
            const url = GET_URL.usercheckincheckout.api
            getRequest(url, params, props).then(response => {
                if (response && response.status === 200) {
                    response.data.data.data_list.map((data) => {
                        data['full_name'] = getFullName(data['first_name'], data['middle_name'], data['last_name'])
                    })
                    setStudentList(() => response.data.data)
                    setPagination(currentPagination)
                    setTableUpdating(false)
                    if (response.data.data.length === 0) {
                        setBlankData('There is no students')
                        setStudentList(null)
                    }
                }
            })
        }
    }

    const validateBeforeGetStudents = () => {
        let returnValue = true
        let error = ''
        let checkInError = null
        if (!standard) {
            returnValue = false
        }
        if (checkIn === null && standard) {
            checkInError = `Please Enter Start Date`
            returnValue = false
        }
        else if (standard) {
            error = validateDate(checkIn, checkInMinDate)
        }
        if (error !== '') {
            checkInError = error
            returnValue = false
        }
        setCheckInError(()=>checkInError)
        return returnValue
    }

    const handleCheckInOut = (e, name) => {
        if (name === 'checkIn') {
            setCheckIn(()=>e)
            if (e === null) {
                setCheckOut(null)
            }
            setCheckInError(null)
            setStudentId(null)
        }
        else {
            let error = validateDate(checkOut, checkIn, date_range.maxDate, 'time')
            if (error !== '') {
                error = `Date should be within ${dateFormat(checkIn, 'DD-MM-YYYY hh:mm A')} To ${dateFormat(date_range.maxDate, 'DD-MM-YYYY hh:mm A')}`
            }
            else {
                setStudentId(null)
            }
            setCheckOut(e)
            setCheckOutError(error)
        }
        setErrorContent('')
    }


    useEffect(() => {
        getStudentList()
    }, [checkIn]);


    useEffect(() => {
        getStandardList()
    }, [year]);

    useEffect(() => {
        getStudentList()
    }, [standard]);

    const validation = () => {
        let returnValue = true
        let error = ''
        let checkInError = null
        let checkOutError = null
        if (checkIn === null) {
            checkInError = `Please Enter Start Date`
            returnValue = false
        }
        else if (checkIn !== null) {
            error = validateDate(checkIn, date_range.minDate, date_range.maxDate, 'time')
        }
        if (error !== '') {
            checkInError = error
            returnValue = false
        }
        if (!studentId) {
            returnValue = false
        }
        setCheckInError(checkInError)
        let checkout_error = ''
        if (checkOut !== null) {
            checkout_error = validateDate(checkOut, checkIn, date_range.maxDate, 'time')
            if (checkout_error !== '') {
                checkOutError = `Minimum ${dateFormat(checkIn, 'DD-MM-YYYY hh:mm A')}`
                returnValue = false
            }
            setCheckOutError(checkOutError)
        }
        return returnValue
    }

    const submit = () => {
        let validate = validation()
        if (validate) {
            setSubmitDisable(true)
            let post_data = {
                room: props.selectedRoom,
                student: studentId,
                staff: null,
                checkin: dateFormat(checkIn, 'YYYY-MM-DD HH:mm:ss'),
                checkout: checkOut ? dateFormat(checkOut, 'YYYY-MM-DD HH:mm:ss') : null,
                academic_year: year
            }
            let propsValue = { ...props };
            propsValue['return_error_message'] = true
            let postUrl = POST_URL.roomallocation.api
            postRequest(postUrl, post_data, propsValue).then(response => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                    handleClose()
                }
                else {
                    setOpenSnackBar(true)
                    setErrorContent(response)
                }
                setSubmitDisable(false)
                setStudentId(null)
            })
        }
    }


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

    const handleCloseSnackBar = () => {
        setOpenSnackBar(false)
    }

    return (
        <div>
            <Dialog fullScreen open={open} onClose={handleClose} >
                <AppBar className={classes.appBar} style={{ position: 'fixed' }}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
                            <CloseIcon />
                        </IconButton>
                        <Typography variant="h6" className={classes.title}>
                            Assign Student To {roomName}
                        </Typography>
                    </Toolbar>
                </AppBar>
                <Box className='student-route-table-popup margin-top'>
                    {pageLoading &&
                        <Box display='flex'>
                            <img src={loadingBar} className='loading' alt='loading' />
                        </Box>
                    }
                    {!pageLoading &&
                        <Box>
                            <Grid container spacing={1}>
                                <Grid item md={3} xs={12}>
                                    <Box className='width-97'>
                                        <Dropdown
                                            data={yearList}
                                            name="year"
                                            value={year}
                                            onChange={(e) => onChange(e, 'year')}
                                            label="Select Year"
                                            hideSelect={true}
                                        />
                                    </Box>
                                </Grid>
                                <Grid item md={3} xs={12}>
                                    <Box className='width-97'>
                                        <Dropdown
                                            data={standardList}
                                            name="standard"
                                            value={standard}
                                            onChange={(e) => onChange(e, 'standard')}
                                            disabled={year ? false : true}
                                            label="Select Standard"
                                            hideSelect={true}

                                        />
                                    </Box>
                                </Grid>
                                <Grid item md={3} xs={12}>
                                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                        <KeyboardDateTimePicker
autoComplete='off'
                                            variant="dialog"
                                            ampm={true}
                                            className='width-97'
                                            required={true}
                                            autoOk
                                            inputVariant='outlined'
                                            label='Start Date'
                                            name='checkIn'
                                            minDate={date_range['minDate']}
                                            maxDate={date_range['maxDate']}
                                            format='dd-MM-yyyy hh:mm a'
                                            value={checkIn}
                                            onChange={(e) => handleCheckInOut(e, 'checkIn')}
                                            onBlur={(e) => getStudentList()}
                                            KeyboardButtonProps={{
                                                'aria-label': 'change date',
                                            }}
                                            inputProps={{ maxLength: 50 }}
                                            helperText={!checkInError ? 'Format DD-MM-YYYY' : checkInError}
                                            error={checkInError ? true : false}
                                        />
                                    </MuiPickersUtilsProvider>
                                </Grid>
                                <Grid item md={3} xs={12}>
                                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                        <KeyboardDateTimePicker
autoComplete='off'
                                            variant="dialog"
                                            ampm={true}
                                            className='width-97'
                                            autoOk
                                            inputVariant='outlined'
                                            label='End Date'
                                            name='checkOut'
                                            minDate={checkIn}
                                            maxDate={date_range['maxDate']}
                                            disabled={!checkIn}
                                            format='dd-MM-yyyy hh:mm a'
                                            value={checkOut}
                                            onChange={(e) => handleCheckInOut(e, 'checkOut')}
                                            KeyboardButtonProps={{
                                                'aria-label': 'change date',
                                            }}
                                            inputProps={{ maxLength: 50 }}
                                            helperText={!checkOutError ? 'Format DD-MM-YYYY' : checkOutError}
                                            error={checkOutError ? true : false}
                                        />
                                    </MuiPickersUtilsProvider>
                                </Grid>
                            </Grid>
                            {studentList !== null &&
                                <Box className='header-align'>
                                    <AllMUIDataTable
                                        key={studentList.data_list}
                                        data={studentList.data_list}
                                        columns={columns}
                                        options={options}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        onTableChange={getStudentList}
                                        serverSide={true}
                                        pagination={pagination}
                                        count={studentList.count}
                                    />
                                </Box>
                            }
                            {studentList === null &&
                                <BlankPagewithIcon data={blankData} />
                            }
                        </Box>
                    }

                </Box>
                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackBar} autoHideDuration={2000} onClose={handleCloseSnackBar}>
                    <Alert onClose={handleCloseSnackBar} severity="error">
                        {errorContent}
                    </Alert>
                </Snackbar>
            </Dialog>
        </div>
    );
});

export default AddStudentToAllocation
