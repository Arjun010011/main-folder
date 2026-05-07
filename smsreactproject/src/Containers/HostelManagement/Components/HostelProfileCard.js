
import React, { Component } from 'react'
import { Box, Grid, Paper, Avatar, Button, Dialog, DialogActions, DialogContent, DialogTitle, DialogContentText } from '@material-ui/core';
import { Link } from 'react-router-dom';
import Tooltip from "@material-ui/core/Tooltip";
import moment from 'moment';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import { MuiPickersUtilsProvider, KeyboardDateTimePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import EditIcon from '@material-ui/icons/Edit';
import Swal from 'sweetalert2'

import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import profile_Background from 'images/profile_background.png';
import './styles.scss';
import { dateFormat, validateDate, getFullName } from 'Includes/functions';
import { POST_URL,DEL_URL } from 'Includes/urls';
import { postRequest ,deleteRequest} from 'Includes/api/apicall';
import { minDate } from 'Constants';

class HostelProfileCard extends Component {

    constructor(props) {
        super(props)

        this.state = {
            openDialog: false,
            checkIn: '',
            checkOut: '',
            checkInError: '',
            checkOutError: '',
            errorContent: '',
            submitDisable: false,
            student_details: '',
            updatedList:[]
        }
    }

    componentDidMount=()=>{
        const{list}=this.props;
        list.map((data)=>{
            let minDate=moment(new Date(data.checkin))
            let maxDate=moment(new Date())
            data['isGreaterThanToday']=false
            if(minDate.diff(maxDate, 'minutes')>0){
                data['isGreaterThanToday']=true
            }
        }) 
        this.setState({
            updatedList:list
        })
    }

    editButton = (data) => {
        this.setState({
            checkIn: data.checkin,
            errorContent: '',
            checkOut: data.checkout,
            openDialog: true,
            student_details: data
        })
    }

    handleCheckInOut = (e, name) => {
        let { checkIn, checkOut, checkInError, checkOutError } = this.state;
        if (name === 'checkIn') {
            checkIn = e
            if (e === null) {
                checkOut = null
            }
            checkInError = null
        }
        else {
            checkOut = e
            checkOutError = null
        }
        this.setState({
            checkIn, checkOut, checkInError, checkOutError
        })
    }

    handleClose = () => {
        this.setState({
            openDialog: false
        })
    }

    submit = () => {
        const { student_details } = this.state;
        let returnValue = this.validation();
        if (returnValue) {
            this.setState({
                submitDisable: true
            })
            let propsValue = { ...this.props };
            propsValue['return_error_message'] = true
            let postUrl = POST_URL.roomallocation.api
            postRequest(postUrl, returnValue, propsValue).then(response => {
                if (response && response.status === 200) {
                    this.props.getRoomDetails()
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.setState({
                        openDialog: false
                    })
                }
                else {
                    this.setState({
                        errorContent: response
                    })
                }
                this.setState({
                    submitDisable: false
                })
            })
        }
    }

    validation = () => {
        const { checkIn, checkOut, student_details } = this.state;
        let returnValue = true
        let error = ''
        let checkInError = null
        let checkOutError = null
        if (checkIn === null) {
            checkInError = `Please Enter Start Date`
            returnValue = false
        }
        else {
            error = validateDate(checkIn, minDate, '', 'time')
        }
        if (error !== '') {
            checkInError = error
            returnValue = false
        }
        if (checkOut !== null) {
            error = validateDate(checkOut, checkIn, null, 'time')
            if (error !== '') {
                checkOutError = `End date should be greater than start date ${dateFormat(checkIn, 'DD-MM-YYYY hh:mm A')}`
                returnValue = false
            }
        }
        this.setState({
            checkInError,
            checkOutError
        })

        if (returnValue) {
            let post_data = {
                room: student_details.room,
                student: student_details.student ? student_details.student : null,
                staff: student_details.staff ? student_details.staff : null,
                checkin: dateFormat(checkIn, 'YYYY-MM-DD HH:mm:ss'),
                checkout: checkOut ? dateFormat(checkOut, 'YYYY-MM-DD HH:mm:ss') : null,
                academic_year: student_details.academic_year,
                id: student_details.id
            }
            returnValue = post_data
        }

        return returnValue
    }

    deleteUser=(index)=>{
        const { updatedList } = this.state;
        const id=updatedList[index]['id']
        const url = DEL_URL.roomallocation.api + id + '/';
        deleteRequest(url, {}, {}).then(response => {
            if (response && response.status === 200) {
                this.props.getRoomDetails()
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
            }
        })
    }

    render() {
        const { updatedList,openDialog, checkIn, checkOut, checkInError, checkOutError, errorContent, submitDisable } = this.state;
        return (
            <div>
                <Grid container className={updatedList.length !== 0 ? ' profile-card-position' : 'display-none'}>
                    {
                        updatedList.map((data, index) => {
                            return <Paper className='grid-card-width'>
                                <Paper className='grid-card-paper'>
                                    <img src={profile_Background} className='grid-profile-background' alt='profile_Background' />

                                    {data.student_details && data.student_details.profile_pic_details &&
                                        <Box className='grid-profile-pic-position'>
                                            <Avatar alt='Profile Pic' src={data.student_details.profile_pic_details.file} className='grid-profile-pic' />
                                        </Box>
                                    }
                                    {data.student_details && !data.student_details.profile_pic_details &&
                                        <Box className='grid-profile-pic-position'>
                                            <Avatar className='grid-profile-pic'>
                                                {data.student_details.first_name && data.student_details.first_name.charAt(0)}{data.student_details.last_name && data.student_details.last_name.charAt(0)}
                                            </Avatar>
                                        </Box>
                                    }
                                    {data.staff_details && data.staff_details.profile_pic_details &&
                                        <Box className='grid-profile-pic-position'>
                                            <Avatar alt='Profile Pic' src={data.staff_details.profile_pic_details.file} className='grid-profile-pic' />
                                        </Box>
                                    }
                                    {data.staff_details && !data.staff_details.profile_pic_details &&
                                        <Box className='grid-profile-pic-position'>
                                            <Avatar className='grid-profile-pic'>
                                                {data.staff_details.first_name && data.staff_details.first_name.charAt(0)}{data.staff_details.last_name && data.staff_details.last_name.charAt(0)}
                                            </Avatar>
                                        </Box>
                                    }
                                </Paper>
                                {data.student_details &&
                                    <Box className='grid-card-profile-name break-word'>
                                        {getFullName(data.student_details.first_name,data.student_details.middle_name,data.student_details.last_name)}
                                    </Box>
                                } 
                                {data.staff_details &&
                                    <Box className='grid-card-profile-name break-word'>
                                        {getFullName(data.staff_details.first_name,data.staff_details.middle_name,data.staff_details.last_name)}
                                    </Box>
                                }
                                {data.student_details &&
                                    <Box className='grid-card-standard'>{data.student_details.current_standard_name && data.student_details.current_standard_name}{data.student_details.group_name && data.student_details.group_name[0]}</Box>
                                }
                                {data.staff_details &&
                                    <Box className='grid-card-standard'>{data.staff_details.group_name ? data.staff_details.group_name[0] : ''}</Box>
                                }
                                <Box className='edit-start-end-date-box'>
                                <Box display='flex' pt={1}>
                                    <Button variant="contained" p={1}
                                        className='editDetails'
                                        onClick={() => this.editButton(data)}
                                    ><EditIcon style={{ marginRight: '5px', marginTop: '1px', fontSize: '15px' }} />Start/End Date</Button>
                                     
                                    <Tooltip title={data.isGreaterThanToday?'Remove':'Cannot remove checkin time is lesser than today'}
                                         enterDelay={400}
                                         enterNextDelay={400} placement='top-start'
                                         classes={{ tooltip: 'tooltip-show-data' }}>
                                    <Box
                                        className='text-red cursor-pointer'
                                        onClick={data.isGreaterThanToday?()=>this.deleteUser(index):''}><HighlightOffIcon/>
                                    </Box>
                                    </Tooltip>
                                    
                                    </Box>                                   
                                </Box>
                                <Box display='flex' pt={1}>
                                    <Box className='grid-card-label start-date-label'>Start Date</Box>
                                    <Box className='grid-card-value start-date-value'>{dateFormat(data.checkin, 'DD-MM-YYYY')}</Box>
                                </Box>
                                <Box display='flex' pt={1} >
                                    <Box className='grid-card-label end-date-label'>End Date</Box>
                                    <Box className='grid-card-value end-date-value'>{dateFormat(data.checkout, 'DD-MM-YYYY')}</Box>
                                </Box>
                                <Box display='flex' pt={1}>
                                    <Box className='grid-card-label'>Email</Box>
                                    <Box className='grid-card-value'>{data.student_details ? data.student_details.email ? data.student_details.email : '------' : data.staff_details.email ? data.staff_details.email : '------'}</Box>
                                </Box>
                                <Box display='flex' pt={1}>
                                    <Box className='grid-card-label'>Phone No</Box>
                                    <Box className='grid-card-value'>{data.student_details ? data.student_details.mobile_num ? data.student_details.mobile_num : '------' : data.staff_details.mobile_num ? data.staff_details.mobile_num : '------'}</Box>
                                </Box>
                                <Box display='flex' pt={1} pb={1}>
                                    <Box className='grid-card-label'>Date of Birth</Box>
                                    <Box className='grid-card-value'>{data.student_details ? dateFormat(data.student_details.dob, 'DD-MM-YYYY') : dateFormat(data.staff_details.dob, 'DD-MM-YYYY')}</Box>
                                </Box>
                            </Paper>
                        })
                    }
                </Grid>

                <Dialog open={openDialog}
                    className='action-basic-detail-width'
                    onClose={this.handleClose} aria-labelledby='form-dialog-title'>
                    <DialogTitle id='form-dialog-title'></DialogTitle>
                    <DialogContent className={''}>
                        <DialogContentText>
                            {`Enter start date and end date(optional)`}
                        </DialogContentText>
                        <Grid container className='flex-justify-center'>
                            <Box>
                                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                    <KeyboardDateTimePicker
autoComplete='off'
                                        variant="dialog"
                                        ampm={true}
                                        className='width-90'
                                        required={true}
                                        // autoOk
                                        inputVariant='outlined'
                                        label='Start Date'
                                        name='checkIn'
                                        format='dd-MM-yyyy hh:mm a'
                                        value={checkIn}
                                        onChange={(e) => this.handleCheckInOut(e, 'checkIn')}
                                        KeyboardButtonProps={{
                                            'aria-label': 'change date',
                                        }}
                                        inputProps={{ maxLength: 50 }}
                                        helperText={!checkInError ? 'Format DD-MM-YYYY' : checkInError}
                                        error={checkInError ? true : false}
                                    />
                                    <KeyboardDateTimePicker
autoComplete='off'
                                        variant="dialog"
                                        ampm={true}
                                        className='width-90'
                                        // autoOk
                                        // okLabel
                                        inputVariant='outlined'
                                        label='End Date'
                                        name='checkOut'
                                        minDate={checkIn}
                                        format='dd-MM-yyyy hh:mm a'
                                        disabled={checkIn ? false : true}
                                        value={checkOut}
                                        onChange={(e) => this.handleCheckInOut(e, 'checkOut')}
                                        KeyboardButtonProps={{
                                            'aria-label': 'change date',
                                        }}
                                        inputProps={{ maxLength: 50 }}
                                        helperText={!checkOutError ? 'Format DD-MM-YYYY' : checkOutError}
                                        error={checkOutError ? true : false}
                                    />
                                </MuiPickersUtilsProvider>
                            </Box>
                        </Grid>
                        <Box className='error-content flex-justify-center margin-top-10'>
                            {errorContent}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleClose} color='secondary'>
                            Close
                </Button>
                        <Button disabled={submitDisable} onClick={this.submit} color='primary'>
                            Submit
                </Button>

                    </DialogActions>
                </Dialog>
            </div>
        )
    }
}

export default HostelProfileCard;

