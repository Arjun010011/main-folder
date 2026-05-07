import React, { Component } from 'react'
import { Paper, Box, Button, TextField, Grid, TextareaAutosize, FormControl, MenuItem, Select, FormHelperText, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import DescriptionOutlinedIcon from '@material-ui/icons/DescriptionOutlined';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import DateRangePicker from "react-daterange-picker";
import "react-daterange-picker/dist/css/react-calendar.css";
import originalMoment from "moment";
import { extendMoment } from "moment-range";
import Snackbar from '@material-ui/core/Snackbar';

import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import { Alert } from 'Includes/functions'
import { maxFileSize } from 'Constants'

const moment = extendMoment(originalMoment);

const staffDetails = localStorage.getItem("user")!='undefined'?JSON.parse(localStorage.getItem("user")):'';




class ApplyLeave extends Component {

    constructor(props) {
        super(props)

        const today = moment();
        const start = moment(today, 'YYYY-MM-DD');
        const end = moment(today, 'YYYY-MM-DD');
        const months = moment.monthsShort()

        // const range = moment.range(start, end);
        this.state = {
            leaveTypesList: [],
            fromdate: '',
            toDate: '',
            sessionList: [{
                id: 1,
                name: "Session1"
            }, {
                id: 2,
                name: "Session2"
            }],
            fromSession: 'Session1',
            toSession: 'Session2',
            numberOfDays: 0,
            leaveType: 0,
            reason: "",
            cc: "",
            value: '',
            errors: {},
            applyDisable: false,
            ccError: "",
            isOpen: true,
            months: months,
            startMonth: '',
            endMonth: '',
            staffDetail: staffDetails,
            loading: true,
            attach_file: null,
            isAttached: true,
            openSnackbar: false,
            alertData: ''
        }
    }

    async componentDidMount() {
        let { fromdate, toDate, value } = this.state
        const url = GET_URL.leavetype.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    leaveTypesList: response.data.data,
                    loading: false
                })
            }
        })
    }


    onSelect = (value, states) => {
        let { fromdate, toDate, errors } = this.state
        delete errors['date']
        let difference = value.diff('days');
        fromdate = value.start.format("YYYY-MM-DD")
        toDate = value.end.format("YYYY-MM-DD")
        this.setState({
            fromdate,
            toDate,
            value,
            numberOfDays: difference + 1,
            errors
        })
    };

    onChange = async (e) => {
        let { value, name, } = e.target;
        let { errors } = this.state
        if (name === 'reason') {
            delete errors.reason

        }
        else {
            delete errors.leaveType
        }
        if (value !== 0) {
            this.setState({
                [name]: value,
                errors: errors
            })
        }
    }

    attachfile = (e) => {
        let { files } = e.target;
        this.setState({
            attachfile: files[0]
        })
    }


    handleDateChange = (date, name) => {
        const { fromdate, toDate } = this.state
        this.setState({
            [name]: date
        }, () => {
            let test = 0;
            if (name === "fromdate") {
                test = (toDate.getDate() - date.getDate())
            }
            else {
                test = (date.getDate() - fromdate.getDate())
            }
            if (test < 0) {
                this.setState({
                    numberOfDays: 0
                })
            }
            else {
                this.setState({
                    numberOfDays: test + 1
                })
            }
        })
    };


    ccChange = (e) => {
        const { value } = e.target;
        let { errors } = this.state
        delete errors.ccError
        this.setState({
            cc: value,
            errors: errors
        })
    }

    validate = (errors) => {
        let { leaveType, cc, reason, fromdate, toDate, openSnackbar, alertData } = this.state
        // let emails = cc.split(",")
        // let test = emails.some((data) => {
        //     data = data.trim()
        //     var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        //     let result = (re.test(String(data).toLowerCase()));
        //     return result === false
        // })
        // if (test) {
        // errors['ccError'] = "Please provide valid email"
        // }
        if (leaveType === 0) {
            errors['leaveType'] = "Please select LeaveType"
        }
        if (!reason) {
            errors['reason'] = "Please Enter Reason"
        }
        if (!fromdate) {
            errors['date'] = "Please select dates"
            alertData = "Please select dates"
            openSnackbar = true
        }
        if (!toDate) {
            errors['date'] = "Please select dates"
            alertData = "Please select dates"
            openSnackbar = true
        }
        this.setState({
            openSnackbar,
            alertData
        })

    }

    submitLeave = async () => {
        let { fromdate, isAttached, toDate, reason, attach_file, cc, leaveType, fromSession, toSession, errors } = this.state;
        errors = {}
        this.validate(errors)
        if ((Object.keys(errors).length === 0)) {
            this.setState({ applyDisable: true })
            if (isAttached === true) {
                let postData = {
                    'applied_from_date': fromdate,
                    'applied_to_date': toDate,
                    'reason_to_apply': reason,
                    'attach_file': attach_file,
                    'apply_to': cc,
                    'leave_type': leaveType,
                    'from_session': fromSession,
                    'to_session': toSession
                }
                const url = POST_URL.applyleave.api
                postRequest(url, postData, this.props).then(response => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Leave Applied',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.props.leaveSummary()
                    }
                    this.setState({ applyDisable: false })
                })
            }
            else if (isAttached === 'failed') {
                Swal.fire({
                    type: 'error',
                    title: 'Something Went Wrong Upload Profile Pic Again',
                    showConfirmButton: true,
                })
            }
        }
        else {
            this.setState({
                errors
            })

        }

    }

    handleChangeAttachment = async (event, acceptFileType) => {
        if (event.target.files[0]) {
            if (event.target.files[0].size < maxFileSize[acceptFileType].size) {
                this.setState({ isAttached: false })
                let file = event.target.value;
                this.setState({
                    file
                })
                let post = new FormData();
                post.append('file', event.target.files[0])
                const url = POST_URL.uploads.api
                postRequest(url, post, this.props).then(response => {
                    if (response && response.status === 200) {
                        this.isUpload(true, response.data.data.id);
                    }
                    else {
                        this.isUpload('failed', null);
                    }
                })

            }
            else {
                this.setState({
                    openSnackbar: true,
                    alertData: maxFileSize[acceptFileType].errorText
                })
            }
        }
    }

    isUpload = (status, id) => {
        let { isAttached, applyDisable } = this.state
        let attach_id = id
        isAttached = status
        if (applyDisable && status) {
            this.setState({
                attach_file: attach_id,
                isAttached
            }, () => {
                this.submitLeave();
            })
        }
        this.setState({
            attach_file: attach_id,
            isAttached
        })
    }

    removeAttachment = () => {
        this.setState({
            file: ''
        })
    }

    resetLeave = () => {
        this.setState({
            leaveType: 0,
            reason: "",
            cc: "",
            value: moment.rangeFromInterval('days', 1, moment()),
            errors: {},
            toSession: 2,
            fromSession: 1,
            numberOfDays: 2,
        })
    }

    handleCloseSnackBar = () => {
        this.setState({
            openSnackbar: false
        })
    }
    render() {
        const {
            leaveTypesList, file, value, leaveType, cc, reason, loading, fromSession, toSession, sessionList, applyDisable, errors, openSnackbar, alertData
        } = this.state

        return (
            <div>
                <Box className={loading ? 'text-center' : 'display-none'}>
                    <CircularProgress className='loading' />
                </Box>
                <Paper className={loading ? 'display-none' : 'apply-leave-paper'}>
                    <Grid container>
                        <Grid item md={6} className='leave-summary-heading'>
                            <Box paddingRight={2}><DescriptionOutlinedIcon /></Box>
                            <Box >
                                Leave Application</Box>
                        </Grid>
                    </Grid>
                    <Grid container>
                        <Grid item md={7}>
                            <Box display='flex' className='margin-top-30 apply-leave-padding-left-15'>
                                <Box className='apply-leave-label-names'>Leave Type</Box>
                                <Box className='apply-leave-drop-down-left-padding-10'>
                                    <FormControl
                                        error={errors.leaveType && (errors.leaveType ? true : false)}
                                    >
                                        <Select name='leaveType'
                                            className='apply-leave-drop-down-Style'
                                            value={leaveType}
                                            required={true}
                                            onChange={this.onChange}
                                        >
                                            <MenuItem value={0}>Select</MenuItem>
                                            {leaveTypesList.map((temp) => {
                                                return <MenuItem
                                                    key={temp.id} value={temp.id}>{temp.name}</MenuItem>
                                            })}
                                        </Select>
                                        {errors.leaveType &&
                                            <FormHelperText>{errors.leaveType}</FormHelperText>
                                        }
                                    </FormControl>
                                </Box>
                            </Box>

                        </Grid>
                        <Grid item md={5} xs={12}>
                            <Box display='flex' className='header-align margin-left-20-percent'>
                                <Box className='apply-leave-label-names'>No of Days</Box>
                                <Box className='apply-leave-selected-date-display'>{this.state.numberOfDays} </Box>
                            </Box>
                        </Grid>

                    </Grid>
                    <Grid container className='apply-leave-display-column-reverse'>
                        <Grid item md={5} className='apply-leave-padding-left-15'>
                            <Box className='apply-leave-label-names'>
                                From
                                    </Box>
                            <Box display='flex'>
                                <Box className='apply-leave-selected-date-display'>
                                    {this.state.value && `${this.state.value.start.format("DD")}-`}
                                    {!this.state.value &&
                                        'DD'
                                    }
                                    {!this.state.value && '-'}

                                </Box>
                                <Box className='apply-leave-selected-date-display'>

                                    {this.state.value && `${this.state.months[this.state.value.start.format("M") - 1]}-`}
                                    {!this.state.value &&
                                        'MM'
                                    }
                                    {!this.state.value && '-'}

                                </Box>
                                <Box className='apply-leave-selected-year-display' >
                                    {this.state.value && this.state.value.start.format("YYYY")}
                                    {!this.state.value && 'YYYY'}
                                </Box>
                                <Box className='apply-leave-drop-down-left-padding-10'>
                                    <FormControl>
                                        <Select name='fromSession'
                                            className='apply-leave-drop-down-Style'
                                            value={fromSession}
                                            required={true}
                                            onChange={this.onChange}
                                        >
                                            {sessionList.map((temp) => {
                                                return <MenuItem
                                                    key={temp.id} value={temp.name}>{temp.name}</MenuItem>
                                            })}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>

                            <Box className='apply-leave-label-names' >
                                To
                                    </Box>
                            <Box display='flex'>
                                <Box className='apply-leave-selected-date-display' >
                                    {this.state.value && `${this.state.value.end.format("DD")}-`}
                                    {!this.state.value && 'DD'}
                                    {!this.state.value && '-'}
                                </Box>
                                <Box
                                    className='apply-leave-selected-date-display'>
                                    {this.state.value && `${this.state.months[this.state.value.end.format("M") - 1]}-`}
                                    {!this.state.value && 'MM'}
                                    {!this.state.value && '-'}
                                </Box>
                                <Box className='apply-leave-selected-year-display'>
                                    {this.state.value && this.state.value.end.format("YYYY")}
                                    {!this.state.value && 'YYYY'}
                                </Box>
                                <Box className='apply-leave-drop-down-left-padding-10' >
                                    <FormControl>
                                        <Select name='toSession'
                                            className='apply-leave-drop-down-Style'
                                            value={toSession}
                                            required={true}
                                            onChange={this.onChange}
                                        >
                                            {sessionList.map((temp) => {
                                                return <MenuItem
                                                    key={temp.id} value={temp.name}>{temp.name}</MenuItem>
                                            })}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>
                            <FormControl
                                fullWidth
                                error={errors.reason && (errors.reason ? true : false)}
                            >
                                <Box className='apply-leave-label-names margin-top-20'>Reason</Box>
                                <TextareaAutosize aria-label="minimum height"
                                    className='apply-leave-text-area-auto-size-reason'
                                    value={reason}
                                    name='reason'
                                    onChange={this.onChange}
                                    required
                                />
                                {errors.reason &&
                                    <FormHelperText>{errors.reason}</FormHelperText>
                                }
                            </FormControl>
                            <Box className='apply-leave-label-names margin-top-20'>Attachment</Box>
                            <Box >
                                <input type="file"
                                    onChange={(e) => this.handleChangeAttachment(e, 'file')}
                                    onClick={() => this.removeAttachment()}
                                    value={file}
                                />
                                {file &&
                                    <HighlightOffIcon className="cross-btn-nominee" onClick={() => this.removeAttachment()}
                                        style={{ "position": "relative", "top": "-10px", "right": "6px" }} />
                                }
                            </Box>
                        </Grid>
                        <Grid item md={7} className='apply-leave-padding-left-30 text-center'>
                            <Box>
                                <DateRangePicker
                                    value={value}
                                    onSelect={this.onSelect}
                                    singleDateRange={true}
                                />
                            </Box>
                            <Box className='apply-leave-label-names margin-top-20'> Apply To</Box>
                            <Box>
                                <TextField
                                    id="outlined-helperText"
                                    label="cc"
                                    value={cc}
                                    className='width-form-90'
                                    InputProps={{ className: 'apply-leave-text-height-apply-to' }}
                                    InputLabelProps={{
                                        shrink: true
                                    }}
                                    variant="outlined"
                                    onChange={this.ccChange}
                                    helperText={errors.ccError && errors.ccError}
                                    error={errors.ccError && (errors.ccError ? true : false)}
                                />
                                <Box className='margin-top-20'>
                                    Note: Separate multiple emails with commas.
                                    </Box>
                            </Box>
                        </Grid>
                    </Grid>
                    <Box container className='apply-submit-reset-position'>
                        <Button
                            className='apply-leave-button'
                            onClick={this.submitLeave}
                            disabled={applyDisable}
                        >
                            Apply Leave
                                </Button>
                        <Button
                            className='apply-leave-reset-button'
                            onClick={this.resetLeave}
                            disabled={applyDisable}>
                            Reset
                            </Button>
                    </Box>
                </Paper>
                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackbar} autoHideDuration={2000} onClose={(e) => this.handleCloseSnackBar(e)}>
                    <Alert onClose={(e) => this.handleCloseSnackBar(e)} severity='error'>
                        {alertData}
                    </Alert>
                </Snackbar>
            </div>
        )
    }
}
export default ApplyLeave