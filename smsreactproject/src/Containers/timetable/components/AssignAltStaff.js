import React, { Component } from 'react';
import { Button, TextareaAutosize, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Box, FormHelperText, Tooltip, FormControl, InputLabel, MenuItem, Select } from '@material-ui/core';
import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import Swal from 'sweetalert2'
import { Dropdown } from 'Components/DropDown';
import { FormattedMessage } from 'react-intl';
import commonMessages from 'Constants/messages'
import { dateFormat } from 'Includes/functions';

export default class AssignAltStaff extends Component {
    constructor(props) {
        super(props)

        this.state = {
            open: false,
            fieldErrors: {},
            reason: '',
            submitDisable: false,
            sectionListFound: false,
            period: {}
        }
    }


    handleClickOpen = (name) => {
        const { isStaffList } = this.state;
        const { year } = this.props;
        let validate = this.props.validateCheckBox()
        if (validate && (!isStaffList || name === 'afterSubmit')) {
            const url = GET_URL.getstaffsubject.api
            const params = { is_active: true, academic_year: year }
            getRequest(url, params, this.props).then(response => {
                if (response && response.status === 200) {
                    this.setState({
                        staffList: response.data.data,
                        open: name === 'afterSubmit' ? false : true,
                        isStaffList: true
                    })
                }
            })
        }
        else if (validate) {
            this.setState({
                open: true,
                selectedStaff:'',
                selectedSubject:'',
                reason:''
            })
        }
    };

    handleClose = () => {
        this.setState({
            open: false,
            errors: {},
            period: {},
        })
    };

    update = () => {
        const { period, fieldError } = this.state;
        let validate = true
        if (!period.start_time) {
            validate = false
            fieldError['start_time'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        if (!period.end_time) {
            validate = false
            fieldError['end_time'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        if (validate) {
            let returnValue = this.props.validateAssigningTime(period);
            if (returnValue.validate) {
                this.handleClose()
            }
            else {
                this.setState({
                    errorData: returnValue.errorData
                })
            }
        }
        else {
            this.setState({
                errorContent: <FormattedMessage {...commonMessages.clearAllErrors} />
            })
        }
    }

    handleChangePeriod = (e) => {
        let { name, value } = e.target;
        let { period } = this.state;
        if (name === 'start_time' || name === 'end_time') {
            value = `${value}:00`
        }
        period[name] = value;
        this.setState({
            period,
            fieldErrors: {},
            errorContent: ''
        })
    }

    handleDropDownSearchChange = (e, newValue, name) => {
        let { fieldErrors } = this.state;
        delete fieldErrors[name]
        this.setState({
            [name]: newValue,
            fieldErrors,
        })
    }

    validateAndPostData = () => {
        const { selectedStaff, selectedSubject, reason, fieldErrors } = this.state;
        let validate = true
        if (!selectedStaff) {
            validate = false
            fieldErrors['selectedStaff'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        if (!selectedSubject) {
            validate = false
            fieldErrors['selectedSubject'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        if (!reason) {
            validate = false
            fieldErrors['reason'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        this.setState({fieldErrors})
        if (validate) {
            const { selectedId, selected_date } = this.props;
            let post_data = {
                request_change: {
                    'reason': reason,
                    'staff': selectedStaff.staff,
                    'subject': selectedSubject.subject_id,
                    'timetable_schedule': selectedId,
                    'fordate': dateFormat(selected_date, 'YYYY-MM-DD')
                }
            }
            this.setState({
                submitDisable: true
            })
            validate = post_data
        }
        return validate
    }

    submit = () => {
        const validate = this.validateAndPostData();
        if (validate) {
            const url = POST_URL.timetablerequestchange.api;
            postRequest(url, validate, this.props).then(response => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.setState({
                        open: false
                    })
                    this.props.getRequest()
                }
                this.setState({ submitDisable: false })
            })
        }
    }

    onChangeReason = (e) => {
        let { name, value } = e.target;
        let { fieldErrors } = this.state;
        delete fieldErrors['reason']
        this.setState({
            [name]: value,
            fieldErrors
        })
    }

    render() {
        let { open, submitDisable, fieldErrors, selectedStaff, staffList, selectedSubject, errorContent, reason } = this.state
        return (
            <div>
                <Button variant="contained"
                    className='previous-but text-capitalize'
                    onClick={this.handleClickOpen}
                >
                    Assign Alternate Staff
                </Button>

                <Dialog open={open}
                    className='action-basic-detail-width'
                    onClose={this.handleClose} aria-labelledby="form-dialog-title">
                    <DialogTitle id="form-dialog-title"></DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Select Staff and Subject
                        </DialogContentText>
                        <Box className='m-t-20px'>
                            <DropDownWithSearch
                                id="combo-box-demo"
                                options={staffList}
                                autoComplete="off"
                                value={selectedStaff}
                                onChange={(e, newValue) => this.handleDropDownSearchChange(e, newValue, 'selectedStaff')}
                                optionValue='staff_name'
                                name='selectedStaff'
                                label='Staff'
                                className='w-100'
                                helperText={fieldErrors['selectedStaff']}
                                error={fieldErrors['selectedStaff']}
                            />
                        </Box>
                        <Box className='m-t-20px'>
                            <DropDownWithSearch
                                id="combo-box-demo"
                                options={selectedStaff && selectedStaff.assigned_subjects}
                                autoComplete="off"
                                value={selectedSubject}
                                onChange={(e, newValue) => this.handleDropDownSearchChange(e, newValue, 'selectedSubject')}
                                optionValue='subject'
                                name='selectedSubject'
                                label='Subject'
                                className='w-100'
                                disabled={selectedStaff ? false : true}
                                helperText={selectedStaff ? selectedStaff.assigned_subjects.length === 0 ? 'No subjects assigned for selected staff' : fieldErrors['selectedSubject'] : 'Select Staff'}
                                error={fieldErrors['selectedSubject']}
                            />
                        </Box>
                        <FormControl
                            fullWidth
                            error={fieldErrors.reason && (fieldErrors.reason ? true : false)}
                        >
                            <Box className='leave-pending-staff-label'>Reason</Box>
                            <TextareaAutosize aria-label="minimum height"
                                className='apply-leave-text-area-auto-size-reason'
                                value={reason}
                                name='reason'
                                onChange={this.onChangeReason}
                                required
                            />
                            {fieldErrors.reason &&
                                <FormHelperText>{fieldErrors.reason}</FormHelperText>
                            }
                        </FormControl>
                        <Box className='action-error-content flex-justify-center margin-top-10'>
                            {errorContent}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={this.handleClose} color="secondary">
                            <FormattedMessage {...commonMessages.close} />
                        </Button>
                        <Button
                            onClick={e => this.submit(e)}
                            disabled={submitDisable}
                            color="primary">
                            <FormattedMessage {...commonMessages.submit} />
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        );
    }
}