import React, { Component } from 'react'
import { Paper, Box, Grid, Button, Avatar, DialogTitle, DialogContent, DialogContentText, Dialog, DialogActions } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { withRouter } from 'react-router-dom';

import { isUserHasPermission, getKeyValueMap, getUrlParam, dateFormat } from 'Includes/functions';
import loadingBar from 'images/loading.gif'
import { Actions } from 'Constants/permissions';
import AddStudentToAllocation from './Components/AddStudentToAllocation'
import AddStaffToAllocation from './Components/AddStaffToAllocation'
import { getRequest, } from 'Includes/api/apicall';
import { GET_URL, } from 'Includes/urls';
import blankProfile from 'images/blank_profile_pic.png';
import RightArrow from 'images/RightArrow.png'
import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import HostelProfileCard from './Components/HostelProfileCard';
import { support_user } from './constants'

class ViewRoomAllocation extends Component {

    constructor(props) {
        super(props)

        this.state = {
            pageLoading: true,
            reasonOpen: false,
            upcoming: { student: [], staff: [] },
            current: { student: [], staff: [] }
        }
    }

    componentDidMount = () => {
        let { selectedBuilding, selectedFloor, buildingName, floorName, roomName, selectedRoom } = getUrlParam();
        this.setState({
            selectedBuilding,
            selectedFloor,
            buildingName,
            floorName,
            roomName,
            selectedRoom
        }, () => {
            this.getRoomDetails()
        })
        this.studentModalRef = React.createRef();
        this.staffModalRef = React.createRef();
    }

    getRoomDetails = () => {
        this.setState({pageLoading:true})
        let { current, upcoming, selectedRoom } = this.state;
        upcoming = { student: [], staff: [] }
        current = { student: [], staff: [] }
        this.setState({ upcoming, current })
        const url = GET_URL.roomallocation.api + selectedRoom + '/';
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.current_allocation_details.map((data) => {
                    if (data.student_details == null) {
                        current.staff.push(data)
                    }
                    else {
                        current.student.push(data)
                    } 
                })
                response.data.upcoming_allocation_details.map((data) => {
                    if (data.student_details == null) {
                        upcoming.staff.push(data)
                    }
                    else {
                        upcoming.student.push(data)
                    }
                })

                this.setState({
                    roomDetails: response.data,
                    pageLoading: false,
                    current,
                    upcoming
                })
            }
        })
    }

    gotoAddStudentOrStaff = () => {
        let { selectedBuilding, selectedFloor } = this.state
        let yearInformation = {
            selectedBuilding: selectedBuilding,
            selectedFloor: selectedFloor,
        }
        let searchParam = "?" + new URLSearchParams(yearInformation).toString()
        this.props.history.push({
            pathname: Actions.room_allocation_list.view.url,
            search: searchParam,
        });
    }

    addStudentStaff = (name) => {
        const { roomName } = this.state;
        if (name === 'student') {
            this.studentModalRef.current.openModal(roomName);
        }
        else if (name === 'staff') {
            this.staffModalRef.current.openModal(roomName);
        }
    }

    render() {
        const { selectedRoom, pageLoading, roomDetails, current, upcoming } = this.state;
        if (pageLoading) {
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
                            <Grid item md={6} xs={12} className='header-align'>
                                <Box className='heading'>
                                    Room Details
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('room_allocation_list', 'view') && <Button
                                        variant="contained"
                                        onClick={this.gotoAddStudentOrStaff}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.room_allocation_list.view.label}</Button>
                                    }
                                </Box>
                            </Grid>
                        </Grid>
                        <Box className="year-std-box mr-40">
                            <Box className="academic-std-head "> Building Name, Floor Name and Room name</Box>
                            <Box className=" aca-std-white-background">{roomDetails.building_name}</Box>
                            <Box className=" aca-std-white-background">{roomDetails.floor_name}</Box>
                            <Box className=" aca-std-white-background">{roomDetails.name}</Box>
                        </Box>
                        <Grid container>
                            {support_user.student.includes(roomDetails['building_for']) && isUserHasPermission('room_allocation', 'create') &&
                                <Grid item md={2} className='header-align'>
                                    <Button
                                        className='add-modify-button'
                                        onClick={e => this.addStudentStaff('student')}
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' />  Add Student
                                    </Button>
                                </Grid>
                            }
                            {support_user.staff.includes(roomDetails['building_for']) && isUserHasPermission('room_allocation', 'create') &&
                                <Grid item md={2} className='header-align'>
                                    <Button
                                        className='add-modify-button'
                                        onClick={e => this.addStudentStaff('staff')}
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' />  Add Staff
                                    </Button>
                                </Grid>
                            }
                            <Grid item md={8}>
                                <Box className="year-std-box mr-40 header-align">
                                    <Box className="academic-std-head "> Total Strength</Box>
                                    <Box className=" aca-std-white-background">{roomDetails.strength}</Box>
                                    <Box className="academic-std-head padding-left-15"> Current Strength</Box>
                                    <Box className=" aca-std-white-background">{roomDetails.current_allocation_details.length}</Box>
                                    <Box className="academic-std-head padding-left-15">Upcoming Strength</Box>
                                    <Box className=" aca-std-white-background">{roomDetails.upcoming_allocation_details.length}</Box>
                                </Box>
                            </Grid>
                        </Grid>
                        <AddStudentToAllocation
                            ref={this.studentModalRef}
                            getRoomDetails={this.getRoomDetails}
                            selectedRoom={selectedRoom}
                        />
                        <AddStaffToAllocation
                            ref={this.staffModalRef}
                            getRoomDetails={this.getRoomDetails}
                            selectedRoom={selectedRoom}
                        />
                        {roomDetails.current_allocation_details.length > 0 &&
                            <Paper className='paper-plain-background header-align'>
                                <Box className="header-align">
                                    <Box className='form-left-heading head-decoration'>
                                        Current Allotment
                                    </Box>
                                </Box>
                                {current.student.length > 0 &&
                                    <Box className='form-left-heading sub-head-padding-20'>
                                        Students
                                    </Box>
                                }
                                <HostelProfileCard
                                    list={current.student}
                                    getRoomDetails={this.getRoomDetails}
                                />
                                {current.staff.length > 0 &&
                                    <Box className='form-left-heading sub-head-padding-20'>
                                        Staffs
                                    </Box>
                                }
                                <HostelProfileCard
                                    list={current.staff}
                                    getRoomDetails={this.getRoomDetails}
                                />
                            </Paper>
                        }
                        {roomDetails.upcoming_allocation_details.length > 0 &&
                            <Paper className='paper-plain-background header-align'>
                                <Box className="header-align">
                                    <Box className='form-left-heading head-decoration'>
                                        Upcoming Allotment
                                    </Box>
                                </Box>
                                {upcoming.student.length > 0 &&
                                    <Box className='form-left-heading sub-head-padding-20'>
                                        Students
                                    </Box>
                                }
                                <HostelProfileCard
                                    list={upcoming.student}
                                    getRoomDetails={this.getRoomDetails}
                                />
                                {upcoming.staff.length > 0 &&
                                    <Box className='form-left-heading sub-head-padding-20'>
                                        Staffs
                                    </Box>
                                }
                                <HostelProfileCard
                                    list={upcoming.staff}
                                    getRoomDetails={this.getRoomDetails}
                                />
                            </Paper>
                        }

                        {!roomDetails.current_allocation_details.length && !roomDetails.upcoming_allocation_details.length &&
                            <Box className='margin-top-10'>
                                <BlankPagewithIcon data="No student/staff" />
                            </Box>
                        }


                    </Paper>
                </div>
            )
        }
    }
}


export default withRouter(ViewRoomAllocation)