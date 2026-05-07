import React, { Component } from 'react'
import { Paper, Box, Grid } from '@material-ui/core';
import classNames from 'classnames'

import LeaveSummary from 'Containers/LeaveManagement/LeaveSummary'
import ApplyLeave from 'Containers/LeaveManagement/ApplyLeave'
import LeaveStatus from 'Containers/LeaveManagement/LeaveStatus'
import CancelLeave from 'Containers/LeaveManagement/CancelLeave';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls';
import StaffLeaveList from 'Components/StaffLeaveList';
import loadingBar from 'images/loading.gif';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import './styles.scss';

class ApplyLeaveManagemnt extends Component {
    state = {
        currentTab: '',
        totalLeavesTaken: 0,
        totalLeavesAvailable: 0,
        totalLeavesTakenThisMonth: 0,
        upcomingHolidays: [],
        leaveBalance: [],
        loading: true,
        leaveList: [],
        blank: false,
        errorContent: ''
    }

    leaveSummary = async () => {
        let { currentTab } = this.state
        const ls_url = GET_URL.leavesummary.api
        let props = { ...this.props };
        props['return_error_message'] = true
        getRequest(ls_url, {}, props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    totalLeavesTaken: response.data.data.total_leaves_taken,
                    totalLeavesAvailable: response.data.data.total_leaves_available,
                    totalLeavesTakenThisMonth: response.data.data.leaves_taken_ds_month,
                    leaveBalance: response.data.data.leave_balance,
                    upcomingHolidays: response.data.data.upcoming_holidays,
                    isApplyLeave: false,
                    isCancelLeave: false,
                    isLeaveStatus: false,
                })
                if (currentTab !== 'isLeaveDashboard') {
                    currentTab = 'isLeaveDashboard'
                    this.setState({
                        currentTab,
                        loading: false
                    })
                }
            }
            else {
                this.setState({
                    errorContent: response,
                    blank: true
                })
            }
        })
    }

    componentDidMount() {
        this.leaveSummary()
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

    loadingFalse = () => {
        this.setState({
            // loading: false
        })
    }

    changeTab = (name) => {
        this.setState({
            currentTab: name
        })
    }

    render() {
        const {
            currentTab,
            totalLeavesTaken,
            totalLeavesAvailable,
            totalLeavesTakenThisMonth,
            upcomingHolidays,
            leaveBalance,
            loading, errorContent, blank
        } = this.state;
        if (blank) {
            return (
                <Box className='header-align'>
                    <BlankPagewithIcon data={errorContent} />
                </Box>
            )
        }
        else {
            return (
                <>
                    <Box className={!loading ? 'display-none' : ''} display='flex'>
                        <img src={loadingBar} className='loading' alt='loading' />
                    </Box>
                    <Paper className={loading ? 'display-none' : 'paper-background leave-management-paper-background-color'}>
                        <Grid container>
                            <Grid item md={9} xs={12} className='leave-manage-space-around'>
                                <Box
                                    className={currentTab === 'isLeaveDashboard' ? 'leave-management-selected-heading' : 'leave-management-heading'}
                                    onClick={() => this.changeTab('isLeaveDashboard')}>
                                    Leave Summary
                                    {currentTab === 'isLeaveDashboard' &&
                                        <Box className='leave-management-selected-heading-underline' />
                                    }
                                </Box>
                                <Box
                                    className={currentTab === 'isApplyLeave' ? 'leave-management-selected-heading' : 'leave-management-heading'}
                                    onClick={() => this.changeTab('isApplyLeave')}
                                >
                                    Apply Leave
                                    {currentTab === 'isApplyLeave' &&
                                        <Box className='leave-management-selected-heading-underline' />
                                    }
                                </Box>
                                <Box className={currentTab === 'isLeaveStatus' ? 'leave-management-selected-heading' : 'leave-management-heading'}
                                    onClick={() => this.changeTab('isLeaveStatus')}
                                >
                                    Leave Status
                                    {currentTab === 'isLeaveStatus' &&
                                        <Box className='leave-management-selected-heading-underline' />
                                    }
                                </Box>
                                <Box className={currentTab === 'isCancelLeave' ? 'leave-management-selected-heading' : 'leave-management-heading'}
                                    onClick={() => this.changeTab('isCancelLeave')}
                                >
                                    Cancel Leave
                                    {currentTab === 'isCancelLeave' &&
                                        <Box className='leave-management-selected-heading-underline' />
                                    }
                                </Box>
                            </Grid>
                        </Grid>
                        <hr style={{ marginTop: '-4px' }} />
                        <Paper>
                            <Grid container>
                                <Grid item md={3}>


                                </Grid>
                            </Grid>
                        </Paper>
                        <Box className='leave-summary-child-paper'>
                            <Box className='leave-height-100-percent'>
                                <Paper className='leave-management-total-leaves-paper'>
                                    <Box className='leave-total-leaves-padding'>
                                        <Box
                                            className={classNames('leave-management-total-leaves-value', 'leave-management-green-color')}>
                                            {totalLeavesAvailable}
                                        </Box>
                                        <Box className='leave-management-total-leaves-label'>
                                            Total Leaves Available
                                        </Box>
                                    </Box>
                                    <Box className='leave-total-leaves-padding'>
                                        <Box
                                            className={classNames('leave-management-total-leaves-value', 'leave-management-red-color')}>
                                            {totalLeavesTaken}
                                        </Box>
                                        <Box
                                            className='leave-management-total-leaves-label'>
                                            Total Leaves Taken
                                        </Box>
                                    </Box>
                                    <Box className='leave-total-leaves-padding'>
                                        <Box
                                            className={classNames('leave-management-total-leaves-value', 'leave-management-red-color')}>
                                            {totalLeavesTakenThisMonth}
                                        </Box>
                                        <Box className='leave-management-total-leaves-label'>
                                            Leaves Taken This Month
                                        </Box>
                                    </Box>
                                </Paper>
                                {
                                    currentTab === 'isLeaveDashboard' &&
                                    <LeaveSummary
                                        leaveSummary={this.leaveSummary}
                                        upcomingHolidays={upcomingHolidays} leaveBalance={leaveBalance} />
                                }
                                {
                                    currentTab === 'isApplyLeave' &&
                                    <ApplyLeave leaveSummary={this.leaveSummary} />
                                }
                                {
                                    currentTab === 'isLeaveStatus' &&
                                    <LeaveStatus />
                                }
                                {
                                    currentTab === 'isCancelLeave' &&
                                    <CancelLeave leaveSummary={this.leaveSummary} />
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
}


export default ApplyLeaveManagemnt