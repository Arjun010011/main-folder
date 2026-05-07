import React, { Component } from 'react'
import {
    Paper, CircularProgress, Box, Button, DialogTitle, FormControl, TextareaAutosize, DialogActions,
    DialogContentText, DialogContent, Dialog, FormHelperText, Avatar
} from '@material-ui/core'
import originalMoment from "moment";
import { extendMoment } from "moment-range";
import Swal from 'sweetalert2'

import blankProfile from 'images/blank_profile_pic.png';
import RightArrow from 'images/RightArrow.png'
import { getRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL } from 'Includes/urls'
import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import { dateFormat } from 'Includes/functions'

const moment = extendMoment(originalMoment);
const months = moment.monthsShort()


class LeavePending extends Component {
    constructor(props) {
        super(props)

        this.state = {
            date: new Date(),
            months: months,
            reasonOpen: false,
            reason: '',
            errors: {},
            staffs: [],
            staffId: '',
            loading: true
        }
    }
    async componentDidMount() {
        const url = GET_URL.leaveapprovalview.api
        const params = { approval_status: 'NotApproved' }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    staffs: response.data,
                    loading: false
                })
            }
        })
    }

    rejectPopup = (id) => {
        this.setState({
            reasonOpen: true,
            staffId: id
        })
    }
    handleClose = () => {
        this.setState({
            reasonOpen: false,
            reason: ''
        })
    }
    onChange = async (e) => {
        let { value, name, } = e.target;
        let { errors } = this.state
        delete errors.reason
        this.setState({
            [name]: value,
            errors: errors
        })
    }

    cancelLeaves = async () => {
        const { reason, staffId, errors } = this.state
        if (reason) {
            let payload = {
                approval_status: 'Rejected',
                cancel_reject_reason: reason
            }
            const url = PUT_URL.applyleave.api + staffId + '/'
            putRequest(url, payload, this.props).then(response => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.LeaveRejected()
                }
                this.handleClose();
            })
        }
        else {
            errors['reason'] = 'This field is Mandatory'
            this.setState({
                errors
            })
        }
    }

    ApproveLeave = async (id) => {
        let data = {
            approval_status: 'Approved'
        }
        const url = PUT_URL.applyleave.api + id + '/'
        putRequest(url, data, this.props).then(response => {
            if (response && response.status === 200) {
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
                this.props.LeaveApproved()
            }
            this.handleClose();
        })
    }

    render() {
        const { date, reasonOpen, reason, errors, staffs, loading } = this.state
        if (loading) {
            return (
                <Box textAlign='center' >
                    <CircularProgress className='loading' />
                </Box>
            )
        }
        else {
            return (
                <div>
                    <Box className='leave-pending-staff-list-flex'>
                        {staffs.map((staff) => {
                            return (
                                <Paper className='leave-pending-staff-paper'>
                                    <Box className='leave-pending-space-around'>
                                        {staff.staff__profile_pic &&
                                            <Box>
                                                <Avatar alt='Profile Pic' src={staff.staff__profile_pic} className='round-profile-pic' />
                                            </Box>
                                        }
                                        {!staff.staff__profile_pic &&
                                            <Box>
                                                <Avatar alt='Profile Pic' src={blankProfile} className='round-profile-pic' />
                                            </Box>
                                        }
                                        <Box>
                                            <Box className='leave-pending-staff-label'>{staff.staff_name}</Box>
                                            <Box className='leave-pending-staff-designation'></Box>
                                        </Box>
                                        <Box className='leave-pending-staff-label'>{dateFormat(staff.created, 'DD-MM-YYYY')}</Box>
                                    </Box>
                                    <Box className='flex-justify-space-around'>
                                        <Box>
                                            <Box className='leave-pending-staff-label'>{dateFormat(staff.todate, 'MMM')}</Box>
                                            <Box className='leave-pending-date-value'>{dateFormat(staff.fromdate, 'DD')}</Box>
                                        </Box>
                                        <Box>
                                            <Box><img src={RightArrow} className='leave-pending-right-arrow' alt='Right Arrow' /></Box>
                                            <Box className='leave-pending-num-of-days'>{staff.leave_count_halfdays / 2} days</Box>
                                        </Box>
                                        <Box>
                                            <Box className='leave-pending-staff-label'>{dateFormat(staff.todate, 'MMM')}</Box>
                                            <Box className='leave-pending-date-value'>{dateFormat(staff.todate, 'DD')}</Box>
                                        </Box>
                                    </Box>
                                    <Box className='leave-pending-type-reason'>
                                        <Box className='leave-pending-leave-type'>{staff.leave_type__name}</Box>
                                        <Box borderBottom='inset'></Box>
                                        <Box className='leave-pending-reason'>{staff.reason_to_apply}</Box>
                                    </Box>
                                    <Box className='leave-pending-total-available'>
                                        <Box
                                            className='leave-management-green-color leave-management-total-leaves-value'>
                                            {staff.available_leaves}
                                        </Box>
                                        <Box className='leave-pending-staff-label'>
                                            Total Leaves Available
                                        </Box>
                                    </Box>
                                    <Box className='leave-pending-approve-reject'>
                                        <Button
                                            className='apply-leave-button'
                                            onClick={e => this.ApproveLeave(staff.id)}>Approve
                                        </Button>
                                        <Button
                                            className='apply-leave-reset-button '
                                            onClick={e => this.rejectPopup(staff.id)}>Reject
                                        </Button>
                                    </Box>

                                </Paper>
                            )
                        })

                        }
                    </Box>

                    {!staffs.length &&
                        <Box className='margin-top-10'>
                            <BlankPagewithIcon data="No Leave Requests Found" />
                        </Box>
                    }

                    <Dialog className='schedule-reject-popup' open={reasonOpen} onClose={this.handleClose} aria-labelledby="form-dialog-title">
                        <DialogTitle id="form-dialog-title"></DialogTitle>
                        <DialogContent>
                            <DialogContentText>
                                Please Enter Reject Leave Reason
                            </DialogContentText>
                            <FormControl
                                fullWidth
                                error={errors.reason && (errors.reason ? true : false)}
                            >
                                <Box className='leave-pending-staff-label'>Reason</Box>
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
                        </DialogContent>
                        <DialogActions>
                            <Button color="primary" style={{ textTransform: 'capitalize' }} onClick={this.cancelLeaves}>
                                Reject Leave
                            </Button>
                            <Button color='secondary' style={{ textTransform: "uppercase" }} onClick={this.handleClose}>
                                close
                            </Button>
                        </DialogActions>
                    </Dialog>
                </div>
            )
        }
    }
}


export default LeavePending