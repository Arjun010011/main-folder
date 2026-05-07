import React, { Component } from 'react'
import { Paper, Box, Button, withStyles, Grid, Icon, } from '@material-ui/core';
import { Link } from 'react-router-dom';
// import EnquiryStudentGridCard from './EnquiryStudentGridCard'
import loadingBar from 'images/loading.gif'
import classNames from 'classnames'
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import Swal from 'sweetalert2'
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls'
import StudentListActions from 'Includes/StudentListActions'

const Styles = theme => ({
    SelectedGridListButton: {
        background: 'linear-gradient(90deg, #1982D5 0%, #4380FD 100%)',
        border: '1px solid #4B74FF',
        boxSizing: 'border-box',
        boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
        borderRadius: '50px',
        textTransform: 'none'
    },
    GridListButton: {
        color: '#4680FF',
        textTransform: 'none'

    },

    loading: {
        marginRight: 'auto',
        marginLeft: 'auto',
        marginTop: '35vh',
        width: '20vh'
    },
    GridListBox: {
        border: '2px solid #4B74FF',
        boxSizing: 'border-box',
        borderRadius: '50px',
    },
    SelectedGridIcon: {
        color: '#FFFFFF',
        fontSize: '20px'
    },
    GridIcon: {
        color: '#000000',
        fontSize: '20px'
    },
    SelectedGridText: {
        fontFamily: ' Avenir',
        fontSize: '14px',
        lineHeight: '24px',
        color: '#FFFFFF',
        marginRight: '10px'
    },
    GridText: {
        fontFamily: ' Avenir',
        fontSize: '14px',
        lineHeight: '24px',
        color: '#000000',
        marginRight: '10px'
    },
    AddButton: {
        background: 'linear-gradient(90deg, #1982D5 0%, #4380FD 100%)',
        border: '1px solid #4B74FF',
        boxSizing: 'border-box',
        boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
        borderRadius: '5px'
    },
});



class EventList extends Component {
    constructor() {
        super()
        this.state = {
            eventList: [],
            dataReady: false,
            GridEnabled: false,
            ListEnabled: true,
            loading: true,
            columns: [
                {
                    name: 'id',
                    label: 'id',
                    options: {
                        filter: true,
                        sort: true,
                        display:false
                    }
                },
                {
                    name: 'type',
                    label: 'type',
                    options: {
                        filter: true,
                        sort: true,
                        display:false

                    }
                },
                {
                    name: 'name',
                    label: 'Event Name',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: 'place',
                    label: 'Place',
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: 'type_name',
                    label: 'Event Type',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: 'from_date',
                    label: 'From Date',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: 'to_date',
                    label: 'To Date',
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: 'start_time',
                    label: 'Start Time',
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
              
                {
                    name: 'end_time',
                    label: 'End Time',
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
              
                {
                    name: 'Actions',
                    label: 'Actions',
                    options: {
                        filter: true,
                        sort: true, 
                        customBodyRender: (value, tableMeta, updateValue) => {

                            return (<div>
                                <StudentListActions
                                    id={tableMeta.rowData[0]}
                                    index={tableMeta.rowIndex}
                                    deleteStudent={this.deleteStudent}
                                    editURL='/dashboard/general/event/edit' 
                                    viewURL='/dashboard/general/event/view'
                                    enabledActions={['view', 'edit', 'delete']}
                                />
                            </div>
                            );
                        }
                    }
                }
            ]
        }
    }

    async componentDidMount() {
        const g_url = GET_URL.getEvent.api
        const params = '?is_active=true'
        const url = g_url + params
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    eventList: response.data.data,
                    dataReady: true,
                    loading: false
                })
            }
        })
    }
    options = {
        selectableRows: 'none',
        responsive: 'scroll',
    };


    deleteStudent = async (id, index) => {
        let { eventList } = this.state
        const del_url = DEL_URL.addEvent.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                eventList.splice(index, 1)
                this.setState({
                    eventList: [...eventList]
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


    render() {
        let { classes } = this.props
        let { ListEnabled, GridEnabled } = this.state
        if (this.state.loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className={classes.loading} alt='loading' />
                </Box>
            )
        }
        else {

            return (
                <Box>
                    <Grid container>
                        <Grid item md={12}>
                            <Box m={3}>
                                <Box display='flex' justifyContent='flex-end'>
                                    <Box fontSize='30px' marginRight='auto' fontWeight='500' color=''>Event List</Box>
                                    <Box mr={5}>
                                        <Button
                                            component={Link} to={`/dashboard/general/event/add/`}
                                            className={classes.AddButton} style={{ textTransform: 'none' }}>
                                            <AddCircleOutlineIcon style={{ color: '#ffffff', marginRight: '10px' }} /><Box color='#ffffff'>Add Event</Box>
                                        </Button>
                                    </Box>
                                </Box>
                                <Paper style={{ marginTop: '40px' }}>
                                    <AllMUIDataTable
                                        // title={'Enquiry Students List'}
                                        data={this.state.eventList}
                                        columns={this.state.columns}
                                        options={this.options}
                                    />
                                </Paper>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            )
        }
    }
}

export default withStyles(Styles)(EventList)
