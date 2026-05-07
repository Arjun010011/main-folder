import React, { Component } from 'react'
import { Grid, Paper, Box, } from '@material-ui/core';

import LeaveApproved from 'Containers/LeaveManagement/LeaveApproved'
import LeavePending from 'Containers/LeaveManagement/LeavePending'
import LeaveRejected from 'Containers/LeaveManagement/LeaveRejected'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls'
import StaffLeaveList from 'Components/StaffLeaveList';
import loadingBar from 'images/loading.gif';

class LeaveApprovalManagement extends Component {
    state = {
        isLeavePending: true,
        isRejected: false,
        isLeaveApproved: false,
        loading: true
    }

    loadingFalse = () => {
        this.setState({
            loading: false
        })
    }

    LeaveApproved = async (name) => {
        const ll_url = GET_URL.staffleavelist.api
        getRequest(ll_url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    isLeaveApproved: true,
                    isLeavePending: false,
                    isRejected: false,
                })
            }
        })
    }
    LeaveRejected = async () => {
        const ll_url = GET_URL.staffleavelist.api
        getRequest(ll_url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    isLeaveApproved: false,
                    isLeavePending: false,
                    isRejected: true,
                })
            }
        })
    }
  
    checkToday = (date) => {
        const todayDate = new Date()
        const dateTemp = todayDate.getDate()
        const month = todayDate.getMonth()
        const year = todayDate.getFullYear()
        let dateStr = date.split('-')
        if (dateStr[0] === year.toString() && (dateStr[1].replace(/^0+/, '')) === (month + 1).toString() && (dateStr[2].replace(/^0+/, '')) === dateTemp.toString()) {
            return 'Today'
        }
        else if (dateStr[0] === year.toString() && (dateStr[1].replace(/^0+/, '')) === (month + 1).toString() && (dateStr[2].replace(/^0+/, '')) === (dateTemp + 1).toString()) {
            return 'Tomorrow'
        }
        else {
            return date
        }

    }
    render() {
        const {
            isLeavePending,
            isLeaveApproved,
            isRejected,
            loading
        } = this.state
        return (
            <>
                <Box className={!loading ? 'display-none' : ''} display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
                <Paper className={loading ? 'display-none' : 'paper-background leave-management-paper-background-color'}>
                    <Grid container>
                        <Grid item md={8} xs={12} className='leave-manage-space-around'>

                            <Box
                                className={isLeavePending ? 'leave-management-selected-heading' : 'leave-management-heading'}
                                onClick={e => this.setState({ isLeavePending: true, isLeaveApproved: false, isRejected: false })}
                            >
                                Pending
                                {isLeavePending &&
                                    <Box className='leave-management-selected-heading-underline' />
                                }
                            </Box>
                            <Box className={isLeaveApproved ? 'leave-management-selected-heading' : 'leave-management-heading'}
                                onClick={e => this.setState({ isLeaveApproved: true, isLeavePending: false, isRejected: false })}
                            >
                                Approved
                                {isLeaveApproved &&
                                    <Box className='leave-management-selected-heading-underline' />
                                }
                            </Box>
                            <Box className={isRejected ? 'leave-management-selected-heading' : 'leave-management-heading'}
                                onClick={e => this.setState({ isRejected: true, isLeavePending: false, isLeaveApproved: false })}
                            >
                                Rejected
                                {isRejected &&
                                    <Box className='leave-management-selected-heading-underline' />
                                }
                            </Box>
                        </Grid>
                    </Grid>
                    <hr style={{ marginTop: '-4px' }} />
                    <Paper>
                        <Grid container>
                            <Grid item md={4}>


                            </Grid>
                        </Grid>
                    </Paper>
                    <Box className='leave-pending-child-paper'>
                        <Box className='leave-approve-set-height'>
                            {
                                isLeavePending &&
                                <LeavePending
                                    LeaveApproved={this.LeaveApproved}
                                    LeaveRejected={this.LeaveRejected}
                                />
                            }
                            {
                                isLeaveApproved &&
                                <LeaveApproved />
                            }
                            {
                                isRejected &&
                                <LeaveRejected />
                            }
                        </Box>
                        <Box className='leave-staff-list-position'>
                            <StaffLeaveList loadingFalse={this.loadingFalse} />
                        </Box>
                    </Box>
                </Paper>
            </>
        )
    }
}







export default LeaveApprovalManagement