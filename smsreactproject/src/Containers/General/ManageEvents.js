import React, { Component } from 'react'
import { Box, Checkbox, FormControlLabel, Switch, ListItemText, FormHelperText, TextField, Tooltip, CircularProgress, Grid, TextareaAutosize, Paper, Divider, Typography, FormControl, InputLabel, MenuItem, Select, withStyles } from '@material-ui/core';
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
    KeyboardTimePicker
} from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import classNames from 'classnames'
import InsertInvitationIcon from '@material-ui/icons/InsertInvitation';
import ReactPhoneInput from 'react-phone-input-2'
import CancelIcon from '@material-ui/icons/Cancel';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import { Link } from 'react-router-dom';

import bgImage from 'images/backgroundSchoolView.png'
import { getRequest, } from 'Includes/api/apicall';
import { GET_URL, } from 'Includes/urls'
import { Dropdown } from 'Components/DropDown';
import AddStaffAndStudent from './Components/AddStaffAndStudent'
import './styles.scss'


const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;

const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
        },
    },
};

const Styles = theme => ({
    background: {
        backgroundImage: `url(${bgImage})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "106%",
        minHeight: '100vh',
        marginBottom: '20px',

    },
    heading: {
        color: '#ff2f2f',
        fontWeight: '500',
        fontSize: '23px',
        lineHeight: '20px',
    },
    subheading: {
        fontFamily: 'Roboto',
        fontStyle: 'normal',
        fontWeight: 'normal',
        fontSize: '17px',
        lineHeight: '20px',
        color: '#637381',
        paddingLeft: '20px'

    },
    paperMain: {
        padding: '40px',
        margin: '20px'
    },

    innerBorder: {
        width: '2px',
        height: '80%',
        background: '#E4E7EB',
        marginLeft: 'auto',
        marginRight: '20%',
    },
    loading: {
        marginRight: 'auto',
        marginLeft: 'auto',
        marginTop: '35vh',
        width: '20vh'
    },
    description: {
        height: '100px!important',
        // marginLeft: '40px',
    },
    add: {
        fontSize: '35px',
        backgroundColor: '#1665D8!important',
        color: '#ffffff',
        cursor: 'pointer',
        borderRadius: '50%'
    },
    remove: {
        position: "absolute",
        top: "6px",
        right: "-8px",
        cursor: 'pointer'
    },
    removeStaff: {
        position: "absolute",
        top: "2px",
        cursor: 'pointer'
    }
})

const today = new Date()

class ManageEvents extends Component {

    constructor(props) {
        super(props)
        this.handleMouseHover = this.handleMouseHover.bind(this);
        this.state = {
            errors: {},
            eventName: '',
            eventTypeList: [],
            eventType: '',
            place: '',
            openFromCalender: false,
            openToCalender: false,
            startDate: '',
            endDate: '',
            startTime: '',
            endTime: '',
            description: '',
            staffList: [],
            studentList: [],
            alternativeContact: [{ mobile: '' }],
            studentIndexTemp: [],
            staffIndex: [],
            studentIndex: [],
            isHovering: [false],
            isStaffHovering: [false],
            isStudentHovering: [false],
            eventFor: 'school',
            standardList: [],
            yearList: [],
            year: '',
            standards: [],
            sections: [],
            standardIds: [],
            isSection: 'no',
            sectionEnable: false

        }
    }

    onChangeStudent = (e) => {
        const { name, value } = e.target;
        let { errors } = this.state
        delete errors[name]
        if (name === 'year') {
            if (value !== 0) {
                const url = GET_URL.getstandardandsection.api
                const params = { academic_year: value }
                getRequest(url, params, this.props).then(response => {
                    if (response && response.status === 200) {
                        this.setState({
                            standardList: response.data.data,
                        })
                    }
                })
                this.setState({
                    [name]: value,
                    errors: errors
                })
            }
        }
        else {
            this.setState({
                [name]: value,
                errors: errors
            })
        }
    }

    onChangeStandard = (e) => {
        let { name, value } = e.target
        this.setState({
            [name]: value
        })
    }

    async componentDidMount() {
        const url = GET_URL.getEventType.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    eventTypeList: response.data.data,
                    loading: false
                })
            }
        })
        const staff_url = GET_URL.getStaffList.api
        getRequest(staff_url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    staffList: response.data.data,
                })
            }
        })
        const student_url = GET_URL.getAdmissionList.api
        getRequest(student_url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    studentList: response.data.data,
                })
            }
        })
        const year = GET_URL.getAcademicyear.api
        getRequest(year, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    yearList: response.data.data
                })
            }
        })
    }
    onChangeDate = (e, name) => {
        let { errors } = this.state
        delete errors[name]
        this.setState({
            [name]: this.convert(e),
            errors,
            openFromCalender: false,
            openToCalender: false
        })
    }
    convert(str) {
        var date = new Date(str),
            mnth = ('0' + (date.getMonth() + 1)).slice(-2),
            day = ('0' + date.getDate()).slice(-2);
        return [date.getFullYear(), mnth, day].join('-');
    }

    clearCalendar = (e, name) => {
        let { errors } = this.state
        delete errors[name]
        let names = ''
        this.setState({
            [name]: names
        })
    }
    openCalenderFrom = (e) => {
        this.setState({ openFromCalender: !this.state.openFromCalender })
    }
    openCalenderTo = (e) => {
        if (this.state.startDate !== '')
            this.setState({ openToCalender: !this.state.openToCalender })
    }
    changePhone = (e, name, index) => {
        let { errors, alternativeContact } = this.state
        delete errors[name + index]
        alternativeContact[index][name] = e
        this.setState({
            alternativeContact
        })
    }

    updateSelectedOrganizer = (name, index) => {
        let { staffIndex, studentIndex, isStaffHovering, isStudentHovering } = this.state
        let data = []
        if (name === 'Staff') {
            if (staffIndex.length > 0) {
                let test = true;
                staffIndex.map((temp) => {
                    if (temp.dataIndex === index.dataIndex) {
                        test = false
                    }
                })
                if (test) {
                    data = [...staffIndex, ...index]
                    isStaffHovering.push(false)
                    this.setState({
                        staffIndex: data,
                        open: false
                    })
                }
            }
            else {
                data = [...staffIndex, ...index]
                isStaffHovering.push(false)
                this.setState({
                    staffIndex: data,
                    open: false
                })
            }
        }
        else if (name === 'Student') {
            if (studentIndex.length > 0) {
                let test = true
                studentIndex.map((temp) => {
                    if (temp.dataIndex === index.dataIndex) {
                        test = false
                    }
                })
                if (test) {
                    isStudentHovering.push(false)
                    data = [...studentIndex, ...index]
                    this.setState({
                        studentIndex: data,
                        open: false
                    })
                }
            }
            else {
                data = [...studentIndex, ...index]
                isStudentHovering.push(false)
                this.setState({
                    studentIndex: data,
                    open: false
                })
            }
        }
    }

    addAlternativeMobile = () => {
        let { alternativeContact, errors, isHovering } = this.state
        alternativeContact.map((data, index) => {
            if (data.mobile === '') {
                errors['mobile' + index] = 'Please Enter Number'
            }
        })
        if ((Object.keys(errors).length === 0)) {
            alternativeContact.push({ mobile: '' })
            isHovering.push(false)
        }

        this.setState({
            errors,
            alternativeContact
        })
    }
    handleMouseHover(index) {
        let { isHovering } = this.state
        isHovering[index] = !isHovering[index]
        this.setState({
            isHovering
        })
    }
    handleStaffMouseHover(index) {
        let { isStaffHovering } = this.state
        isStaffHovering[index] = !isStaffHovering[index]
        this.setState({
            isStaffHovering
        })
    }

    handleStudentMouseHover(index) {
        let { isStudentHovering } = this.state
        isStudentHovering[index] = !isStudentHovering[index]
        this.setState({
            isStudentHovering
        })
    }
    handleRemoveMobile(index) {
        let { alternativeContact, isHovering } = this.state
        alternativeContact.splice(index, 1)
        isHovering.splice(index, 1)
        this.setState({
            alternativeContact,
            isHovering
        })
    }
    handleStaffRemove(index) {
        let { staffIndex, isStaffHovering } = this.state
        staffIndex.splice(index, 1)
        isStaffHovering.splice(index, 1)
        this.setState({
            staffIndex,
            isStaffHovering
        })
    }
    handleStudentRemove(index) {
        let { studentIndex, isStudentHovering } = this.state
        studentIndex.splice(index, 1)
        isStudentHovering.splice(index, 1)
        this.setState({
            studentIndex,
            isStudentHovering
        })
    }

    render() {
        let { onChangeStudent } = this

        let {
            eventName,
            eventTypeList,
            eventType,
            place,
            startDate,
            endDate,
            openToCalender,
            openFromCalender,
            endTime,
            startTime,
            description,
            staffIndex,
            staffList,
            studentList,
            studentIndex,
            alternativeContact,
            eventFor,
            errors,
            standardList,
            yearList,
            year,
            standards,
            isSection,
            sections,
            sectionEnable
        } = this.state
        let { classes } = this.props
        if (this.state.loading) {
            return (
                <Box display='flex'>
                    {/* <img src={loadingBar} className={classes.loading} alt='loading' />*/}
                    <CircularProgress className={classes.loading} />
                </Box>
            )
        }
        else {
            return (
                <div className={classes.background}>
                    <Grid container style={{ display: 'flex', justifyContent: 'center' }}>
                        <Grid item md={10}>
                            <Paper className={classNames(classes.paperMain, 'pr-35-on-600')}>
                                <Grid container spacing={2}>
                                    <Grid item md={12} style={{ textAlign: 'center' }}>
                                        <Typography variant='h6' gutterBottom className={classes.heading}>
                                            CREATE EVENT
                                        </Typography>
                                    </Grid>
                                    <Grid item md={12}>
                                        <Typography variant='h6' color='primary' style={{ textDecoration: 'underline' }} gutterBottom>
                                            Enter Event Name and Description
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} >
                                        <TextField
                                            label='Event Name'
                                            className={classes.textField}
                                            fullWidth
                                            name='eventName'
                                            autoComplete='off'
                                            margin='normal'
                                            required
                                            value={eventName}
                                            onChange={onChangeStudent}
                                            variant='outlined'
                                            InputLabelProps={{
                                                classes: {
                                                    root: classes.label
                                                }
                                            }}
                                            helperText={errors.eventName && errors.eventName}
                                            error={errors.eventName && (errors.eventName ? true : false)}
                                            inputProps={{ maxLength: 50 }}
                                        />

                                    </Grid>

                                    <Grid item xs={12} sm={6} md={6} >
                                        <FormControl
                                            variant='outlined'
                                            fullWidth
                                            required
                                            className={classes.textField}
                                            margin='normal'
                                            style={{ marginTop: '1rem' }}
                                            error={errors.eventType && (errors.eventType ? true : false)}

                                        >
                                            <InputLabel htmlFor='outlined-age-simple' >
                                                Event Type
                                        </InputLabel>
                                            <Select name='eventType'
                                                value={eventType}
                                                required={true}
                                                onChange={onChangeStudent}
                                            >
                                                <MenuItem value={0}>Select</MenuItem>
                                                {eventTypeList.map(({ id, name }) => {
                                                    return <MenuItem key={id} value={id}>{name}</MenuItem>
                                                })}
                                            </Select>
                                            {errors.eventType &&
                                                <FormHelperText>{errors.eventType}</FormHelperText>
                                            }
                                        </FormControl>
                                    </Grid>
                                    <Grid item md={6}></Grid>
                                    <Grid item md={12}>
                                        <FormControl
                                            fullWidth
                                            error={errors.description && (errors.description ? true : false)}
                                        >
                                            <Typography variant='h6' gutterBottom>
                                                Description
                                        </Typography>
                                            <TextareaAutosize aria-label="minimum height"
                                                className={classes.description}
                                                value={description}
                                                name='description'
                                                onChange={this.onChange}
                                                required
                                            />
                                            {errors.description &&
                                                <FormHelperText>{errors.description}</FormHelperText>
                                            }
                                        </FormControl>
                                    </Grid>
                                    <Grid item md={12}>
                                        <Typography variant='h6' color='primary' style={{ textDecoration: 'underline' }} gutterBottom>
                                            Select Date and Time
                                            </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={6}>
                                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                            <KeyboardDatePicker
                                                className={classes.textField}
                                                fullWidth
                                                autoOk
                                                variant='inline'
                                                inputVariant='outlined'
                                                label='Start Date'
                                                open={openFromCalender}
                                                name='startDate'
                                                margin='normal'
                                                id='date-of-birth'
                                                InputLabelProps={{ shrink: startDate ? true : false }}
                                                format='yyyy-MM-dd'
                                                value={startDate}
                                                onChange={(e) => this.onChangeDate(e, 'startDate')}
                                                KeyboardButtonProps={{
                                                    'aria-label': 'change date',
                                                    'class': 'MuiIconButton-root-hover-cancel'
                                                }}
                                                keyboardIcon={<Box>
                                                    {(startDate) ? <CancelIcon onClick={e => this.clearCalendar(e, 'startDate')} style={{ marginTop: "4px", marginRight: "5px", cursor: 'pointer' }} /> : ''}
                                                    <InsertInvitationIcon onClick={this.openCalenderFrom} style={{ marginTop: "4px", cursor: 'pointer' }} />
                                                </Box>}
                                                inputProps={{ readOnly: true }}
                                                helperText={errors.startDate && errors.startDate}
                                                error={errors.startDate && (errors.startDate ? true : false)}
                                            />
                                        </MuiPickersUtilsProvider>

                                    </Grid>
                                    <Grid item xs={12} sm={6} md={6} >
                                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                            <KeyboardDatePicker
                                                className={classes.textField}
                                                fullWidth
                                                autoOk
                                                variant='inline'
                                                inputVariant="outlined"
                                                label="End Date"
                                                name="endDate"
                                                margin="normal"
                                                InputLabelProps={{ shrink: endDate ? true : false }}
                                                format="yyyy-MM-dd"
                                                value={endDate}
                                                onChange={(e) => this.onChangeDate(e, 'endDate')}
                                                KeyboardButtonProps={{
                                                    'aria-label': 'change date',
                                                    'class': 'MuiIconButton-root-hover-cancel'
                                                }}
                                                keyboardIcon={<Box>
                                                    {(endDate) ? <CancelIcon onClick={e => this.clearCalendar(e, 'endDate')} style={{ marginTop: "4px", marginRight: "5px", cursor: 'pointer' }} /> : ''}
                                                    <InsertInvitationIcon onClick={this.openCalenderTo} style={{ marginTop: "4px", cursor: 'pointer' }} />
                                                </Box>}
                                                open={openToCalender}
                                                minDate={startDate}
                                                inputProps={{ readOnly: true }}
                                                helperText={(errors['endDate'] && errors['endDate']) || (startDate === '' ? 'Select Start Date Before selecting End Date ' : '')}
                                                error={errors['endDate'] && (errors['endDate'] ? true : false)}
                                            />
                                        </MuiPickersUtilsProvider>
                                    </Grid>
                                    <Grid item md={6}>
                                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                            <KeyboardTimePicker
                                                fullWidth
                                                autoOk
                                                variant='inline'
                                                inputVariant="outlined"
                                                name="startTime"
                                                margin="normal"
                                                InputLabelProps={{ shrink: startTime ? true : false }}
                                                inputProps={{ readOnly: true }}
                                                id="mui-pickers-time"
                                                label="Start Time"
                                                value={startTime}
                                                onChange={(e) => this.setState({ startTime: e })}
                                                KeyboardButtonProps={{
                                                    'aria-label': 'change time',
                                                    'class': 'MuiIconButton-root-hover-cancel'
                                                }}
                                                helperText={errors['startTime'] && errors['startTime']}
                                                error={errors['startTime'] && (errors['startTime'] ? true : false)}
                                            />
                                        </MuiPickersUtilsProvider>

                                    </Grid>
                                    <Grid item xs={12} sm={6} md={6} >
                                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                            <KeyboardTimePicker
                                                fullWidth
                                                autoOk
                                                variant='inline'
                                                inputVariant="outlined"
                                                name="endTime"
                                                margin="normal"
                                                inputProps={{ readOnly: true }}
                                                InputLabelProps={{ shrink: endTime ? true : false }}
                                                id="time-picker"
                                                label="End Time"
                                                value={endTime}
                                                onChange={(e) => startTime !== '' ?
                                                    this.setState({ endTime: e }) : ''}
                                                KeyboardButtonProps={{
                                                    'aria-label': 'change time',
                                                    'class': 'MuiIconButton-root-hover-cancel'
                                                }}
                                                helperText={(errors['endTime'] && errors['endTime']) || (startTime === '' ? 'Select Start Time Before selecting End Time ' : '')}
                                                error={errors['endTime'] && (errors['endTime'] ? true : false)}
                                            />

                                        </MuiPickersUtilsProvider>
                                    </Grid>
                                    <Grid item md={12}>
                                        <Typography variant='h6' color='primary' style={{ textDecoration: 'underline' }} gutterBottom>
                                            Select Event Organizer and Enter Contact Details
                                    </Typography>
                                    </Grid>
                                    <Grid item xs={12} >
                                        <TextField
                                            label='Event Place'
                                            className={classes.textField}
                                            fullWidth
                                            name='place'
                                            autoComplete='off'
                                            margin='normal'
                                            value={place}
                                            onChange={onChangeStudent}
                                            variant='outlined'
                                            InputLabelProps={{
                                                classes: {
                                                    root: classes.label
                                                }
                                            }}
                                            helperText={errors.place && errors.place}
                                            error={errors.place && (errors.place ? true : false)}
                                            inputProps={{ maxLength: 100 }}
                                        />

                                    </Grid>
                                    <Grid item md={12} >
                                        <AddStaffAndStudent
                                            staffList={staffList}
                                            studentList={studentList}
                                            staffIndex={staffIndex}
                                            studentIndex={studentIndex}
                                            updateSelectedOrganizer={this.updateSelectedOrganizer}
                                            addStaffAndStudent='action-general-detail-width'
                                        />
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={6} style={{ textAlign: 'center' }}>
                                        <Typography color='primary' style={{ fontSize: '18px' }} gutterBottom>
                                            Selected Staff Organizer Details
                                            </Typography>
                                        <Box height='150px'
                                            overflow='auto'>
                                            {staffIndex.map((staffData, index) => {
                                                return (
                                                    <Box className='selected-organizer'
                                                        position='relative'
                                                        onMouseEnter={() => this.handleStaffMouseHover(index)}
                                                        onMouseLeave={() => this.handleStaffMouseHover(index)}
                                                    >
                                                        {`${staffList[staffData.dataIndex].first_name} ${staffList[staffData.dataIndex].middle_name} ${staffList[staffData.dataIndex].last_name}`}
                                                        {
                                                            (this.state.isStaffHovering[index]) &&
                                                            <Box className={classNames(classes.removeStaff, "cross-btn-nominee")}>
                                                                <HighlightOffIcon onClick={() => this.handleStaffRemove(index)}
                                                                />
                                                            </Box>
                                                        }

                                                    </Box>
                                                )
                                            })
                                            }
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={6} style={{ textAlign: 'center' }}>
                                        <Typography color='primary' style={{ fontSize: '18px' }} gutterBottom>
                                            Selected Student Organizer Details
                                    </Typography>
                                        <Box height='150px'
                                            overflow='auto'>
                                            {studentIndex.map((studentData, index) => {
                                                return (
                                                    <Box className='selected-organizer'
                                                        position='relative'
                                                        onMouseEnter={() => this.handleStudentMouseHover(index)}
                                                        onMouseLeave={() => this.handleStudentMouseHover(index)}
                                                    >
                                                        {`${studentList[studentData.dataIndex].first_name} ${studentList[studentData.dataIndex].middle_name} ${studentList[studentData.dataIndex].last_name}`}
                                                        {
                                                            (this.state.isStudentHovering[index]) &&
                                                            <Box className={classNames(classes.removeStaff, "cross-btn-nominee")}>
                                                                <HighlightOffIcon onClick={() => this.handleStudentRemove(index)}
                                                                />
                                                            </Box>
                                                        }

                                                    </Box>
                                                )
                                            })
                                            }
                                        </Box>
                                    </Grid>

                                    {alternativeContact.map((number, index) => {
                                        return (
                                            <Grid item xs={12} sm={6} md={5}
                                                style={{ display: 'flex', position: 'relative' }}
                                                onMouseEnter={() => this.handleMouseHover(index)}
                                                onMouseLeave={() => this.handleMouseHover(index)}
                                            >
                                                <FormControl
                                                    variant='outlined'
                                                    fullWidth
                                                    className={classes.textField}
                                                    margin='normal'
                                                    style={{ marginTop: '1rem' }}
                                                    error={errors['mobile' + index] && (errors['mobile' + index] ? true : false)}
                                                >
                                                    <InputLabel htmlFor='outlined-age-simple' shrink={true}>
                                                        Alternative Mobile Number
                                                </InputLabel>
                                                    <ReactPhoneInput
                                                        value={number.mobile}
                                                        placeholder="Enter phone number"
                                                        name='mobile'
                                                        fullWidth
                                                        country='in'
                                                        onChange={(e) => this.changePhone(e, 'mobile', index)}
                                                        inputProps={{
                                                            label: 'your phone',
                                                            required: true,
                                                        }}
                                                        inputExtraProps={{
                                                            margin: 'normal',
                                                            autoComplete: 'phone',
                                                            name: 'custom-username'
                                                        }}
                                                    />
                                                    {errors['mobile' + index] &&
                                                        <FormHelperText>{errors['mobile' + index]}</FormHelperText>
                                                    }
                                                </FormControl>
                                                {
                                                    (alternativeContact.length > 1 && this.state.isHovering[index]) &&
                                                    <Box className={classNames(classes.remove, "cross-btn-nominee")}>
                                                        <HighlightOffIcon onClick={() => this.handleRemoveMobile(index)}
                                                        />
                                                    </Box>
                                                }
                                            </Grid>
                                        )
                                    }
                                    )
                                    }
                                    {alternativeContact[0].mobile !== '' &&
                                        <Grid item md={1} style={{ alignSelf: 'center' }}>
                                            <Tooltip title='Add Another Alternative Number' placement='top-start'>
                                                <Box display='flex'
                                                    alignSelf='center'
                                                    onClick={() => this.addAlternativeMobile()}>
                                                    <AddCircleOutlineOutlinedIcon className={classes.add} />
                                                </Box>
                                            </Tooltip>
                                        </Grid>
                                    }

                                    <Grid item md={12}>
                                        <Typography variant='h6' color='primary' style={{ textDecoration: 'underline' }} gutterBottom>
                                            Creating Event For
                                </Typography>
                                    </Grid>
                                    <Grid item xs={12} sm={6} md={5} >
                                        <FormControl
                                            variant='outlined'
                                            fullWidth
                                            required
                                            className={classes.textField}
                                            margin='normal'
                                            style={{ marginTop: '1rem' }}
                                            error={errors.eventFor && (errors.eventFor ? true : false)}

                                        >
                                            <InputLabel htmlFor='outlined-age-simple' >
                                                Event For
                                        </InputLabel>
                                            <Select name='eventFor'
                                                value={eventFor}
                                                required={true}
                                                onChange={onChangeStudent}
                                            >
                                                <MenuItem value='school'>School</MenuItem>
                                                <MenuItem value='standards'>Standards</MenuItem>
                                            </Select>
                                            {errors.eventFor &&
                                                <FormHelperText>{errors.eventFor}</FormHelperText>
                                            }
                                        </FormControl>
                                    </Grid>
                                    {eventFor === 'standards' &&
                                        <Grid item md={6}>
                                            <Dropdown
                                                data={yearList}
                                                name='year'
                                                value={year}
                                                onChange={this.onChangeStudent}
                                                error={errors.year}
                                                label='Select AcademicYear'
                                                style={{ marginTop: '1rem', width: '100%' }}
                                            />
                                        </Grid>
                                    }
                                    <Box paddingLeft='10px' width='350px'>
                                        {(eventFor === 'standards' && year !== '') &&
                                            <FormControlLabel
                                                control={<Switch checked={isSection === "yes" ?
                                                    true : false}
                                                    name="isSection"
                                                    value={(isSection === "yes") ?
                                                        "no" : "yes"}
                                                    color="primary"
                                                    onChange={this.onChangeStandard} />}
                                                label="Individual Section"
                                            />
                                        }
                                        {(eventFor === 'standards' && year !== '') &&
                                            <Grid item xs={12} sm={6} md={12} style={{display:'content'}}>
                                                <FormControl
                                                    variant='outlined'
                                                    fullWidth
                                                    required
                                                    className={classes.textField}
                                                    margin='normal'
                                                    style={{ marginTop: '1rem' }}
                                                    error={errors.standards && (errors.standards ? true : false)}

                                                >
                                                    <InputLabel htmlFor='outlined-age-simple' >
                                                        Standards
                                                </InputLabel>
                                                    <Select
                                                        name='standards'
                                                        value={standards}
                                                        required={true}
                                                        labelId="demo-mutiple-checkbox-label"
                                                        id="demo-mutiple-checkbox"
                                                        multiple
                                                        onChange={this.onChangeStandard}
                                                        renderValue={(selected) => selected.join(', ')}
                                                        MenuProps={MenuProps}
                                                    >
                                                        {standardList.map((data) => (
                                                            <MenuItem key={data.name} value={data.name}>
                                                                <Checkbox checked={standards.indexOf(data.name) > -1} />
                                                                <ListItemText primary={data.name} />
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                    {errors.standards &&
                                                        <FormHelperText>{errors.standards}</FormHelperText>
                                                    }
                                                </FormControl>
                                            </Grid>
                                        }
                                    </Box>
                                    <Grid item md={12}>
                                        <Box
                                            className='create-register-form'
                                            onClick={e => window.open('/dashboard/general/custom/form')}
                                        >
                                            Create Registration Form
                                    </Box>
                                    </Grid>
                                    <Grid item md={12} >
                                        <Box mt={3} mb={3}>
                                            <Divider />
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>
                    </Grid>
                </div>
            )
        }
    }
}

export default withStyles(Styles)(ManageEvents);
