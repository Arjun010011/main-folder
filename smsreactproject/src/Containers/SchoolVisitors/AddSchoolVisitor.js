import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import { Paper, Box, Grid, Button, TextareaAutosize, TextField, FormControl, FormHelperText, Tooltip } from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import Snackbar from '@material-ui/core/Snackbar';
import { MuiPickersUtilsProvider, KeyboardDateTimePicker, KeyboardTimePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';

import { nameAndNumberRegex } from 'Constants/regularExpression'
import loadingBar from 'images/loading.gif'
import { DropDownWithSearchAndAddApi } from 'Components/DropDownWithSearchAndAddApi';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import { Alert, isUserHasPermission, validateDate, dateFormat, getUrlParam, getFullName } from 'Includes/functions';
import 'Containers/HostelManagement/styles.scss';
import { Actions } from 'Constants/permissions';
import AddStudentOrStaff from 'Containers/SchoolVisitors/components/AddStudentOrStaff';
import { minDate, reasonType } from 'Constants';

const fieldDetails = [
    {
        label: 'Reason Name', regex: nameAndNumberRegex, autoFocus: false, name: 'name', md: 12, className: 'w-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 50, gridClassName: "margin-vertical-20",
    },
]


class AddSchoolVisitor extends Component {

    constructor(props) {
        super(props)
        this.state = {
            visitor: { checkIn: null, checkOut: null },
            fieldErrors: {},
            helperText: {},
            loading: true,
            openError: false,
            alertData: 'Please clear the errors',
            data_details: { details: { roomallocation_student: {}, roomallocation_staff: {} }, group_name: [] },
            isEdit: false,
            submitDisable: false,
            pageLoading: false,
            isBlankPage: true,
            genderList: [{ id: 1, name: 'Boy' }, { id: 2, name: 'girl' }],
            hostelForList: [{ id: 1, name: 'Student' }, { id: 2, name: 'Staff' }, { id: 3, name: 'Both' }],
            deltable_floor_ids: [],
            loadingOptions: false,
            reasonList: []
        }
    }


    componentDidMount = () => {
        this.getReasonList()
        if (this.props.location.pathname === Actions.school_visitor.update.url) {
            if (this.props.location.state && this.props.location.state.detail) {
                let id = this.props.location.state.detail
                this.updateHostelBuildingDetails(id);
            }
            else {
                this.props.history.push(Actions.school_visitor.view.url);
            }
        }
        else {
            let { selectedBuilding, buildingName } = getUrlParam();
            this.setState({
                selectedBuilding,
                buildingName,
                loading: false
            })
        }
    }

    getReasonList = () => {
        const url = GET_URL.reason.api
        const params = { is_active: true, reason_type: reasonType['school'] }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    reasonList: response.data.data,
                    loading: false
                })
            }
        })
    }

    updateHostelBuildingDetails = (id) => {
        const url = GET_URL.visitor.api + id + '/'
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    hostel_details: response.data.data,
                })
                this.updateAllDetails(id);
            }
        })
    }

    updateAllDetails = (id) => {
        let { hostel_details, visitor, data_details, selectedBuilding, buildingName } = this.state;
        visitor['id'] = id
        visitor['name'] = hostel_details.name
        visitor['checkIn'] = hostel_details.checkin
        visitor['checkOut'] = hostel_details.checkout
        visitor['reason'] = hostel_details.reason_details
        selectedBuilding = hostel_details.building
        buildingName = hostel_details.building_name
        if (hostel_details.user_details) {
            data_details['selected_name'] = hostel_details.user_details.staff ? 'staff' : 'student'
            if (hostel_details.user_details.staff) {
                data_details['details']['full_name'] = getFullName(hostel_details.user_details.staff.first_name, hostel_details.user_details.staff.middle_name, hostel_details.user_details.staff.last_name)
                data_details['details']['mobile_num'] = hostel_details.user_details.staff.mobile_num
                data_details['details']['email'] = hostel_details.user_details.staff.email
                data_details['details']['id'] = hostel_details.user_details.staff.id
                data_details['details']['group_name'] = hostel_details.user_details.staff.group_name[0]
                // data_details['details']['group_name'][0] = ''
            }
            else if (hostel_details.user_details.student) {
                data_details['details']['name'] = getFullName(hostel_details.user_details.student.first_name, hostel_details.user_details.student.middle_name, hostel_details.user_details.student.last_name)
                data_details['details']['standard'] = hostel_details.user_details.student.current_standard
                data_details['details']['current_standard_name'] = hostel_details.user_details.student.current_standard_name
                data_details['details']['mobile_num'] = hostel_details.user_details.student.mobile_num
                data_details['details']['email'] = hostel_details.user_details.student.email
                data_details['details']['id'] = hostel_details.user_details.student.id
            }
        }

        this.setState({
            visitor,
            loading: false,
            isEdit: true,
            data_details,
            selectedBuilding,
            buildingName
        })
    }


    handleSearchChange = (e) => {
        let { visitor, fieldErrors } = this.state;
        let { name, value } = e.target;
        visitor[name] = value
        delete fieldErrors[name]
        this.setState({
            visitor,
            fieldErrors,
        })
    }


    validation = () => {
        let { visitor, fieldErrors, isEdit, openError, alertData, data_details, selectedBuilding } = this.state;
        let returnValue = true
        if (!visitor.name) {
            returnValue = false
            fieldErrors['name'] = 'Enter name'
        }
        else if (!nameAndNumberRegex.value.test(visitor.name)) {
            returnValue = false
            fieldErrors['name'] = nameAndNumberRegex.errorText
        }
        if (!visitor.checkIn) {
            returnValue = false
            fieldErrors['checkIn'] = 'Enter check in'
        }
        if (!visitor.reason) {
            returnValue = false
            fieldErrors['reason'] = 'Enter reason'
        }
        if (!visitor.mobile) {
            returnValue = false
            fieldErrors['mobile'] = 'Enter mobile number'
        } else if (!/^[0-9]{10}$/.test(visitor.mobile)) {
            returnValue = false
            fieldErrors['mobile'] = 'Enter valid 10 digit mobile number'
        }

        let checkin_error = validateDate(visitor.checkIn, minDate, new Date(), 'time')
        let checkout_error = ''
        if (visitor.checkOut) {
            checkout_error = validateDate(visitor.checkOut, visitor.checkIn, new Date(), 'time')
        }
        if (checkin_error) {
            fieldErrors['checkIn'] = checkin_error
            returnValue = false
        }
        if (checkout_error) {
            fieldErrors['checkOut'] = checkout_error
            returnValue = false
        }
        if (!returnValue && !alertData) {
            alertData = 'Clear errors'
        }
        if (returnValue) {
            returnValue = {}
            if (isEdit) {
                returnValue['id'] = visitor.id
            }
            returnValue['name'] = visitor.name
            returnValue['checkin'] = dateFormat(visitor.checkIn, 'YYYY-MM-DD HH:mm:ss')
            returnValue['checkout'] = visitor.checkOut ? dateFormat(visitor.checkOut, 'YYYY-MM-DD HH:mm:ss') : null
            returnValue['reason'] = visitor.reason['id']
            returnValue['building'] = selectedBuilding
            returnValue['student'] = data_details.details.id
        
            // ✅ ADD THIS LINE
            returnValue['mobile'] = visitor.mobile
        
            if (data_details.selected_name === 'staff') {
                returnValue['staff'] = data_details.details.id
                returnValue['student'] = null
            }
        }
        else {
            openError = true
        }
        this.setState({
            fieldErrors,
            openError,
            alertData
        })
        return returnValue
    }

    submit = () => {
        let validate_post_format = this.validation();
        if (validate_post_format) {
            this.setState({ submitDisable: true })
            let bodyFormData = new FormData();
            bodyFormData.append('data', JSON.stringify(validate_post_format))
            let url = POST_URL.visitor.api;
            postRequest(url, bodyFormData, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Your Data has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.gotoViewVisitors()
                    }
                    this.setState({ submitDisable: false })
                });

        }
    }
    
    handleClose = () => {
        this.setState({
            openError: false
        })
    }
    
    validateVisitDate = () => {
        const { visitor, fieldErrors } = this.state;
        let returnValue = true
        let error = ''
        if (!visitor.checkIn) {
            error = `Enter Visit Date`
            returnValue = false
        }
        else {
            error = validateDate(visitor.checkIn, minDate, new Date())
        }
        if (error !== '') {
            fieldErrors['checkIn'] = error
            returnValue = false
        }
        this.setState({
            fieldErrors
        })
        if (returnValue) {
            returnValue = visitor.checkIn
        }
        return returnValue
    }

    handleCheckInOut = (e, name) => {
        let { visitor, fieldErrors } = this.state;
        delete fieldErrors[name]
        visitor[name] = e
        this.setState({
            visitor,
            fieldErrors
        })
    }
    
    return_details = (details) => {
        if (details.details.selected_name === 'staff') {
            details['details']['group_name'] = details['details']['group_name'][0]
        }
        this.setState({
            data_details: details
        })
    }

    deleteUser = () => {
        this.setState({
            data_details: { details: {} }
        })
    }

    handleChangeCheckInOutTiming = (e) => {
        let { visitor, fieldErrors } = this.state;
        let { name, value } = e.target;
        delete fieldErrors[name]
        visitor[name] = value;
        this.setState({
            visitor,
            fieldErrors
        })
    }

    gotoViewVisitors = () => {
        let { selectedBuilding } = this.state
        let buildingInformation = {
            selectedBuilding: selectedBuilding,
        }
        let searchParam = "?" + new URLSearchParams(buildingInformation).toString()
        this.props.history.push({
            pathname: Actions.school_visitor.view.url,
            search: searchParam,
        });
    }
    
    onChange = (e, newValue) => {
        let { visitor, fieldErrors } = this.state;
        visitor['reason'] = newValue
        delete fieldErrors['reason']
        this.setState({
            visitor,
            fieldErrors
        })
    }
    
    updatePostFormat = (newData) => {
        newData.name = newData.name
        newData.reason_type = reasonType['school']
        let payload = {
            reason: [newData]
        }
        return payload
    }

    updateType = (field) => {
        this.setState({ loadingOptions: true })
        let { reasonList } = this.state;
        reasonList.push(field)
        this.setState({ reasonList }, () => {
            this.setState({ loadingOptions: false })
        })
        return true
    }


    render() {
        const { loading, visitor, data_details, fieldErrors, openError, alertData, submitDisable, buildingName,
            reasonList, loadingOptions } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <div>
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={8} xs={12} className='header-align'>
                                <Box className='heading'>
                                    {Actions.school_visitor.create.label}
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('school_visitor', 'view') &&
                                        <Button
                                            variant="contained"
                                            component={Link} onClick={() => this.gotoViewVisitors()}
                                            className='editbutton-view'
                                        ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.school_visitor.view.label}</Button>
                                    }
                                </Box>

                            </Grid>
                        </Grid>
                        <Box className='md-down-justify-start md-up-justify-start mb-y-20'>
                            <Box className="year-std-box mr-40">
                                <Box className="academic-std-head"> Building Name</Box>
                                <Box className=" exam-mark-add-heading-bg">{buildingName}</Box>
                            </Box>
                        </Box>
                        <Box className='p-t-20px'>
                            <Grid container spacing={2}>
                                <Grid item md={8} xs={12}>
                                    <Paper className='paper-plain-background header-align p-b-20px'>
                                        <Grid container spacing={2} className=''>
                                            <Grid item md={12} xs={12}>
                                                <TextField
                                                    label='Visitor Name'
                                                    name='name'
                                                    type='text'
                                                    value={visitor.name}
                                                    InputLabelProps={{ shrink: visitor.name ? true : false }}
                                                    className='width-100'
                                                    inputProps={{ maxLength: '50', autoComplete: 'off' }}
                                                    fullWidth={true}
                                                    variant="outlined"
                                                    helperText={fieldErrors['name'] ? fieldErrors['name'] : ''}
                                                    error={fieldErrors['name']}
                                                    onChange={(e) => this.handleSearchChange(e)}
                                                    required={true}
                                                />
                                            </Grid>
                                            <Grid item md={6} xs={12}>
                                                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                    <KeyboardDateTimePicker
                                                        autoComplete='off'
                                                        variant="dialog"
                                                        ampm={true}
                                                        className='width-100'
                                                        required={true}
                                                        autoOk
                                                        inputVariant='outlined'
                                                        label='Check In'
                                                        name='checkIn'
                                                        minDate={minDate}
                                                        maxDate={new Date()}
                                                        format='dd-MM-yyyy hh:mm a'
                                                        value={visitor.checkIn}
                                                        onChange={(e) => this.handleCheckInOut(e, 'checkIn')}
                                                        KeyboardButtonProps={{
                                                            'aria-label': 'change date',
                                                        }}
                                                        inputProps={{ maxLength: 50 }}
                                                        helperText={(!fieldErrors['checkIn']) ? '' : fieldErrors['checkIn']}
                                                        error={fieldErrors['checkIn']}
                                                    />
                                                </MuiPickersUtilsProvider>
                                            </Grid>
                                            <Grid item md={6} xs={12}>
                                                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                    <KeyboardDateTimePicker
                                                        autoComplete='off'
                                                        variant="dialog"
                                                        ampm={true}
                                                        className='width-100'
                                                        autoOk
                                                        inputVariant='outlined'
                                                        label='Check Out'
                                                        name='checkOut'
                                                        minDate={visitor.checkIn}
                                                        maxDate={new Date()}
                                                        format='dd-MM-yyyy hh:mm a'
                                                        value={visitor.checkOut}
                                                        onChange={(e) => this.handleCheckInOut(e, 'checkOut')}
                                                        KeyboardButtonProps={{
                                                            'aria-label': 'change date',
                                                        }}
                                                        inputProps={{ maxLength: 50 }}
                                                        helperText={(!fieldErrors['checkOut']) ? '' : fieldErrors['checkOut']}
                                                        error={fieldErrors['checkOut']}
                                                    />
                                                </MuiPickersUtilsProvider>
                                            </Grid>
                                            {!loadingOptions &&
                                                <Grid item md={6} xs={12} className='mt-10'>
                                                    <DropDownWithSearchAndAddApi
                                                        options={reasonList}
                                                        value={visitor.reason}
                                                        onChange={(e, newValue) => this.onChange(e, newValue)}
                                                        name='reason'
                                                        label='Reason Name *'
                                                        optionValue='name'
                                                        className='width-100'
                                                        helperText={visitor.reason ? `` : fieldErrors['reason']}
                                                        error={fieldErrors['reason']}
                                                        fieldDetails={fieldDetails}
                                                        postUrl={POST_URL.reason.api}
                                                        updatePostFormat={this.updatePostFormat}
                                                        updateType={this.updateType}
                                                        hideClearIcon
                                                    />
                                                </Grid>
                                            }
                                            <Grid item md={6} xs={12}>
                                                    <TextField
                                                        label='Mobile Number'
                                                        name='mobile'
                                                        type='text'
                                                        value={visitor.mobile || ''}
                                                        InputLabelProps={{ shrink: visitor.mobile ? true : false }}
                                                        className='width-100'
                                                        inputProps={{ maxLength: 10 }}
                                                        fullWidth
                                                        variant="outlined"
                                                        helperText={fieldErrors['mobile'] || ''}
                                                        error={fieldErrors['mobile']}
                                                        onChange={(e) => this.handleSearchChange(e)}
                                                        required
                                                    />
                                                </Grid>
                                        </Grid>
                                    </Paper>
                                </Grid>
                                <Grid item md={4} xs={12}>
                                    <AddStudentOrStaff
                                        // validateDate={this.validateVisitDate}
                                        return_details={this.return_details}
                                        data_is_there={data_details.selected_name ? true : false}
                                    />
                                    <Box></Box>
                                    <Paper className={data_details.selected_name ? 'm-t-20px' : 'display-none'}>
                                        {data_details.selected_name &&
                                            <Box className='red-text close-icon-text-fields-box'>
                                                <HighlightOffIcon className="cross-btn-nominee end-flex-prop close-icon-multiple-add-text-fields"
                                                    onClick={() => this.deleteUser()} />
                                            </Box>
                                        }
                                        {data_details.selected_name === 'staff' &&
                                            <Box className='header-align'>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='create-expenses-label'>Staff Name</Box>
                                                    <Box className='create-expenses-value'>{data_details.details.full_name}</Box>
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='create-expenses-label'>Mobile Number</Box>
                                                    <Box className='create-expenses-value'>{data_details.details.mobile_num}</Box>
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='create-expenses-label'>Email</Box>
                                                    <Box className='create-expenses-value'>{data_details.details.email}</Box>
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='create-expenses-label'>Group Name</Box>
                                                    <Box className='create-expenses-value'>{data_details.details.group_name}</Box>
                                                </Box>
                                            </Box>
                                        }
                                        {data_details.selected_name === 'student' &&
                                            <Box className='header-align'>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='create-expenses-label'>Student Name</Box>
                                                    <Box className='create-expenses-value'>{data_details.details.name}</Box>
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='create-expenses-label'>Standard</Box>
                                                    <Box className='create-expenses-value'>{data_details.details.current_standard_name}</Box>
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='create-expenses-label'>Mobile Number</Box>
                                                    <Box className='create-expenses-value'>{data_details.details.mobile_num}</Box>
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='create-expenses-label'>Email</Box>
                                                    <Box className='create-expenses-value'>{data_details.details.email}</Box>
                                                </Box>
                                            </Box>
                                        }
                                    </Paper>
                                </Grid>
                            </Grid>

                            <Grid item md={12}>
                                <Box display='flex' marginLeft='auto' justifyContent='flex-end' className='header-align'>
                                    <Button variant="contained" color="primary"
                                        className='submit'
                                        disabled={submitDisable}
                                        onClick={this.submit}>
                                        Submit &nbsp;{' '}
                                    </Button>
                                </Box>
                            </Grid>
                        </Box>
                    </Paper>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openError} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </div >
            )
        }
    }
}


export default withRouter(AddSchoolVisitor)