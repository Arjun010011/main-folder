import React, { Component } from 'react'
import { Grid, Button, Typography, FormLabel, Paper, Box, withStyles } from '@material-ui/core/';
import bgImage from './../../images/backgroundSchoolView.png'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import ShiftActions from './ShiftActions';
import Swal from 'sweetalert2'
import loadingBar from '../../images/loading.gif'
import { getRequest, deleteRequest } from 'Includes/api/apicall'; 
import { GET_URL, DEL_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';


const Styles = theme => ({
    heading: {
        fontWeight: 'bold',
        fontSize: '35px',
        lineHeight: '40px',
        color: '#000000',
    },
    background: {
        backgroundImage: `url(${bgImage})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "106%",
        minHeight: '100vh',
        marginBottom: '20px',
    },
    subHeading: {
        fontFamily: 'Roboto',
        fontStyle: 'normal',
        fontWeight: 'normal',
        fontSize: '18px',
        lineHeight: '24px',
        color: '#37474F',
    },
    addDetails: {
        marginTop: '20px',
        marginBottom: '20px',
        fontWeight: '500',
        fontSize: '16px',
        height: '47px',
        lineHeight: '14px',
        color: '#FFFFFF',
        textTransform: 'none',
        borderRadius: '20px',
        backgroundColor: '#1665D8',
        '&:hover': {
            backgroundColor: '#0043a3'
        }
    },
    leaveBackGround: {
        width: '100%'
    },
    loading: {
        marginRight: 'auto',
        marginLeft: 'auto',
        marginTop: '35vh',
        width: '20vh'
    }


})

class ShiftsView extends Component {
    constructor(props) {
        super(props)

        this.state = {
            shiftList: [],
            onHover: false,
            loading: true,
            columns: [
                {
                    name: "Serial Number",
                    label: "SL No",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                tableMeta.rowIndex + 1

                            )
                        }
                      
                    }
                },
                {
                    name: "shift_name",
                    label: "Shift Name",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "start_time",
                    label: "Start Time",
                    options: {
                        filter: true,
                        sort: true,
                        display: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {value &&
                                        <Box display='flex' justifyContent='center'>
                                            <Box>
                                                <Box fontSize='11px' >Hours</Box>
                                                <Box fontSize='30px' style={{ lineHeight: '25px', fontWeight: '300' }}>{this.timeSHow(value)[0]}</Box>
                                            </Box>
                                            <Box style={{
                                                width: '2px',
                                                backgroundColor: '#000000',
                                                margin: '0px 6px',
                                            }}></Box>
                                            <Box>
                                                <Box fontSize='11px' >Minutes</Box>
                                                <Box fontSize='30px' style={{ lineHeight: '25px', fontWeight: '300' }} >{this.timeSHow(value)[1]}</Box>
                                            </Box>
                                        </Box>
                                    }
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: "end_time",
                    label: "End Time",
                    options: {
                        filter: true,
                        sort: true,
                        display: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box>
                                    {value &&
                                        <Box display='flex' justifyContent='center'>
                                            <Box>
                                                <Box fontSize='11px' >Hours</Box>
                                                <Box fontSize='30px' style={{ lineHeight: '25px', fontWeight: '300' }}>{this.timeSHow(value)[0]}</Box>
                                            </Box>
                                            <Box style={{
                                                width: '2px',
                                                backgroundColor: '#000000',
                                                margin: '0px 6px',
                                            }}></Box>
                                            <Box>
                                                <Box fontSize='11px' >Minutes</Box>
                                                <Box fontSize='30px' style={{ lineHeight: '25px', fontWeight: '300' }} >{this.timeSHow(value)[1]}</Box>
                                            </Box>
                                        </Box>
                                    }
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: true,
                        sort: true,
                        display: false
                    }
                },
                {
                    name: "Actions",
                    label: "Actions",
                    options: {
                        filter: true,
                        sort: false,
                        rowHover: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <Box
                                    onMouseEnter={this.handleMouseHover}
                                    onMouseLeave={this.handleMouseHover}
                                >
                                    <ShiftActions
                                        id={(tableMeta.rowData[4])}
                                        name={(tableMeta.rowData[1])}
                                        start_time={(tableMeta.rowData[2])}
                                        end_time={(tableMeta.rowData[3])}
                                        deleteFee={this.deleteFeesType}
                                        updateType={this.updateFeeType}
                                    />
                                </Box>
                            </div>
                            );
                        }
                    }
                }
            ]
        }
    }
    options = {
        filterType: "dropdown",
        responsive: "scroll",
        filter: false,
        download: false,
        print: false,
        viewColumns: false,
        rowsPerPageOptions: [5, 10, 15],
        rowsPerPage: 5,
        selectableRows: 'none',
        // rowHover:true

    };
    handleMouseHover = () => {
        this.setState({ onHover: !this.state.onHover })
    }
    toggleHoverState() {
        return {
            onHover: !this.state.onHover,
        };
    }
    timeSHow = (value) => {
        let timeSplit = []
        timeSplit = value.split(":");
        return timeSplit
    }
    updateFeeType = (id, newValue) => {
        let shift = this.state.shiftList
        shift.map((data, index) => {
            if (data.id === id) {
                shift[index].shift_name = newValue.shift_name
                shift[index].start_time = newValue.start_time
                shift[index].end_time = newValue.end_time
            }
        })
        this.setState({
            shiftList: [...shift]
        })
        Swal.fire({
            position: 'top-end',
            type: 'success',
            title: `Shift has been updated`, 
            showConfirmButton: false,
            timer: 1500
        })

    }

    deleteFeesType = async (id, name) => {
        let shift = this.state.shiftList
        const del_url = DEL_URL.addEnquiry.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                shift.map((data, index) => {
                    if (data.id === id) {
                        shift.splice(index, 1)
                    }
                })
                this.setState({
                    shiftList: shift
                }) 
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
    componentDidMount = async () => {
        const g_url = GET_URL.getHrShift.api
        const params = '?is_active=true'
        const url = g_url + params
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    shiftList: response.data.data,
                    loading: false
                })
            }
        })
    }

    render() {
        let { classes } = this.props
        if (this.state.loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className={classes.loading} alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <div>
                    <Paper className={classes.background} >

                        <Box p={3} >
                            <Grid container>
                                <Grid item md={4}>
                                    <Box borderRight={1} style={{ borderColor: "#E4E7EB" }} pb={2}>
                                        <Box>
                                            <Typography className={classes.heading}>
                                                View Shifts
                                            </Typography>
                                        </Box>
                                        <Box mt={2}  >
                                            <FormLabel className={classes.subHeading}>
                                                You can create Shifts for your staff 
                                    </FormLabel>
                                        </Box>
                                    </Box>
                                </Grid>
                                <Grid item md={8}>
                                    <Box display='flex' justifyContent='flex-end'>
                                        <Button
                                            variant="contained" p={1}
                                            component={Link} to={Actions.manage_staff_attendance.create.url}
                                            className={classes.addDetails}
                                        ><AddCircleOutlineOutlinedIcon style={{ marginRight: '10px', fontSize: '25px' }} /> Add Shifts</Button>
                                    </Box>
                                </Grid>
                            </Grid>
                            <Grid container style={{ display: 'flex', justifyContent: 'center' }}>
                                <Grid item md={8} xs={12}>
                                    <AllMUIDataTable
                                        key={this.state.shiftList}
                                        title={"Shift List"}
                                        data={this.state.shiftList}
                                        columns={this.state.columns}
                                        options={this.options}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    </Paper>
                </div>
            )
        }
    }
}


export default withStyles(Styles)(ShiftsView)

