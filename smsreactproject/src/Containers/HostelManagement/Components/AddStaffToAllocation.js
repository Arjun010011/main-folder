import React, { useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Button, Box, Dialog, Slide, Grid, AppBar, Toolbar, Typography, IconButton, CircularProgress, DialogContent, DialogContentText, DialogTitle, } from '@material-ui/core';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import CloseIcon from '@material-ui/icons/Close';
import Tooltip from "@material-ui/core/Tooltip";
import { MuiPickersUtilsProvider, KeyboardDateTimePicker, KeyboardTimePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import Snackbar from '@material-ui/core/Snackbar';
import Swal from 'sweetalert2'
import _ from 'lodash';

import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import loadingBar from 'images/loading.gif'
import { checkLocalAcademicYear, Alert, SetAcademicYear, getPaginationProps, validateDate, dateFormat } from 'Includes/functions';
import { GET_URL, POST_URL } from 'Includes/urls';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { TrendingUpTwoTone } from '@material-ui/icons';
import { DEFAULT_PAGINATION_PROPS, maxDate, minDate } from 'Constants';

const { forwardRef, useRef, useImperativeHandle } = React;


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

const AddStaffToAllocation = forwardRef((props, ref) => {

    const [open, setOpen] = React.useState(false);
    const [openCheckIn, setOpenCheckIn] = React.useState(false);
    const [roomName, setRoomName] = React.useState('');
    const [staffList, setStaffList] = React.useState(null);
    const [pageLoading, setPageLoading] = React.useState(false);
    const [year, setYear] = React.useState('');
    const [checkIn, setCheckIn] = React.useState(null);
    const [checkOut, setCheckOut] = React.useState(null);
    const [fieldError, setFieldError] = React.useState({});
    const [checkInError, setCheckInError] = React.useState(null);
    const [checkOutError, setCheckOutError] = React.useState(null);
    const [checkInMinDate, setCheckInMinDate] = React.useState(minDate)
    const [checkInMaxDate, setCheckInMaxDate] = React.useState(maxDate);
    const [submitDisable, setSubmitDisable] = React.useState(false);
    const [errorContent, setErrorContent] = React.useState('');
    const [staffId, setStaffId] = React.useState('');
    const [pagination, setPagination] = React.useState(DEFAULT_PAGINATION_PROPS);
    const [blankData, setBlankData] = React.useState('Select start date');
    const [tableUpdating, setTableUpdating] = React.useState(false);
    const [openSnackBar, setOpenSnackBar] = React.useState(false);



    const [columns, setColumn] = React.useState([
        {
            name: "id",
            label: "id",
            options: {
                filter: false,
                sort: false,
                display: false,
                download: false
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
            name: "group_name",
            label: "groups",
            options: {
                filter: true,
                sort: true,
                display: true,
                customBodyRender: (value, tableMeta, updateValue) => {
                    return (
                        <Box>
                            {value && value[0]}
                        </Box>
                    )
                }
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
            name: "email",
            label: "Email",
            options: {
                filter: false,
                sort: true,
                customBodyRender: (value, tableMeta, updateValue) => {
                    return (<div className='mui-table-custom-value-left-align text-transform-none'>
                        {value}
                    </div>)

                }
            }
        },
        {
            name: 'roomallocation_staff',
            label: 'Action',
            options: {
                filter: true,
                sort: true,
                download: false,
                customBodyRender: (value, tableMeta, updateValue) => {
                    return (<div>
                        <Tooltip title={_.isEmpty(value) ? '' : 'Already assigned'} enterDelay={400}
                            enterNextDelay={400} placement='top-start'
                            classes={{ tooltip: 'tooltip-show-data' }}>
                            <Button
                                className={_.isEmpty(value) ? 'add-modify-button' : 'add-modify-button disable-button'}
                                onClick={e => _.isEmpty(value) ? setAndSubmit(tableMeta.rowData[0]) : ''}
                            > Add Staff
                            </Button>
                        </Tooltip>
                    </div>
                    );
                }
            }
        }

    ]);


    const setAndSubmit = (id) => {
        setStaffId(id)
    }

    useEffect(() => {
        submit()
    }, [staffId]);




    const classes = useStyles();
    useImperativeHandle(
        ref,
        () => ({
            openModal(roomName) {
                setStaffList(null)
                setOpen(true);
                setCheckIn(null)
                setCheckInError(null)
                setCheckOut(null)
                setErrorContent('')
                setRoomName(roomName)
            }
        }),
    )



    const handleClose = () => {
        props.getRoomDetails()
        setOpen(false);
    };

    useEffect(() => {
        getStaffList()
    }, [checkIn]);


    const getStaffList = (paginationProps) => {
        let validate = validateBeforeGetStudents()
        if (validate) {
            setTableUpdating(true)
            let currentPagination = pagination;
            if (paginationProps) {
                currentPagination = { ...paginationProps };
            }
            let pagination_params = getPaginationProps(currentPagination);
            let params = {
                ...pagination_params, is_active: true, user: 'staff', pagination: true, checkin: dateFormat(checkIn, 'YYYY-MM-DD HH:mm:ss')
            }
            const url = GET_URL.usercheckincheckout.api
            getRequest(url, params, props).then(response => {
                if (response && response.status === 200) {
                    setStaffList(response.data.data)
                    setPagination(currentPagination)
                    setTableUpdating(false)
                    if (response.data.data.length === 0) {
                        setBlankData('There is no staffs')
                        setStaffList(null)
                    }
                }
            })
        }
    }

    const validateBeforeGetStudents = () => {
        let returnValue = true
        let error = ''
        let checkInError = null
        if (checkIn === null) {
            checkInError = `Please Enter Start Date`
            returnValue = false
        }
        error = validateDate(checkIn, checkInMinDate, checkInMaxDate)
        if (error !== '') {
            checkInError = error
            returnValue = false
        }
        setCheckInError(checkInError)
        return returnValue
    }

    const handleCheckInOut = (e, name) => {
        if (name === 'checkIn') {
            setCheckIn(e)
            if (e === null) {
                setCheckOut(null)
            }
            setCheckInError(null)
            validation()
        }
        else {
            setCheckOut(e)
            setCheckOutError(null)
        }
        setErrorContent('')
        setStaffId(null)
    }



    const validation = () => {
        let returnValue = true
        let error = ''
        let checkInError = null
        let checkOutError = null
        if (checkIn === null) {
            checkInError = `Please Enter Start Date`
            returnValue = false
        }
        else {
            error = validateDate(checkIn, checkInMinDate, checkInMaxDate, 'time')
        }
        if (error !== '') {
            checkInError = error
            returnValue = false

        }
        if (!staffId) {
            returnValue = false
        }
        setCheckInError(checkInError)
        if (checkOut !== null && returnValue) {
            error = validateDate(checkOut, checkIn, checkInMaxDate, 'time')
            if (error !== '') {
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
                student: null,
                staff: staffId,
                checkin: dateFormat(checkIn, 'YYYY-MM-DD HH:mm:ss'),
                checkout: checkOut ? dateFormat(checkOut, 'YYYY-MM-DD HH:mm:ss') : null,
                academic_year: null
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
                setStaffId(null)
            })
        }
    }

    const options = {
        selectableRows: "none",
        filterType: "dropdown",
        responsive: "simple",
        filter: true,
        download: true,
        print: true,
        rowsPerPageOptions: [5, 10, 25, 50, 100],
        viewColumns: false,
        customFilterDialogFooter: () => {
            return this.geFilterOptions();
        },
        onFilterChange: (onFilterChange, filterList, type) => {
            this.onFilterChangeHandler(type, onFilterChange);
        },
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
                            Assign Staff To {roomName}
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
                                <Grid item md={3} xs={12} >
                                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                        <KeyboardDateTimePicker
                                            variant="dialog"
                                            ampm={true}
                                            className='width-100'
                                            required={true}
                                            autoOk
                                            inputVariant='outlined'
                                            label='Start Date'
                                            autoComplete="off"
                                            name='checkIn'
                                            minDate={checkInMinDate}
                                            maxDate={checkInMaxDate}
                                            format='dd-MM-yyyy hh:mm a'
                                            value={checkIn}
                                            onChange={(e) => handleCheckInOut(e, 'checkIn')}
                                            onClose={(e) => getStaffList()}
                                            onBlur={(e) => getStaffList()}
                                            KeyboardButtonProps={{
                                                'aria-label': 'change date',
                                            }}
                                            inputProps={{ maxLength: 50 }}
                                            helperText={!checkInError ? 'Format DD-MM-YYYY HH:MM A' : checkInError}
                                            error={checkInError ? true : false}
                                        />
                                    </MuiPickersUtilsProvider>
                                </Grid>
                                <Grid item md={3} xs={12}>
                                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                        <KeyboardDateTimePicker
                                            variant="dialog"
                                            ampm={true}
                                            className='width-100'
                                            autoComplete="off"
                                            autoOk
                                            inputVariant='outlined'
                                            label='End Date'
                                            name='checkOut'
                                            minDate={checkIn}
                                            format='dd-MM-yyyy hh:mm a'
                                            disabled={checkIn ? false : true}
                                            value={checkOut}
                                            onChange={(e) => handleCheckInOut(e, 'checkOut')}
                                            KeyboardButtonProps={{
                                                'aria-label': 'change date',
                                            }}
                                            inputProps={{ maxLength: 50 }}
                                            helperText={!checkOutError ? 'Format DD-MM-YYYY HH:MM A' : checkOutError}
                                            error={checkOutError ? true : false}
                                        />
                                    </MuiPickersUtilsProvider>
                                </Grid>
                            </Grid>
                            {staffList !== null &&
                                <Box className='header-align'>
                                    <AllMUIDataTable
                                        key={staffList.data_list}
                                        data={staffList.data_list}
                                        columns={columns}
                                        options={options}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        onTableChange={getStaffList}
                                        serverSide={true}
                                        pagination={pagination}
                                        count={staffList.count}
                                    />
                                </Box>
                            }
                            {staffList === null &&
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


export default AddStaffToAllocation
