import React, { Component } from 'react'
import { Paper, Box, Grid, Typography, Button } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import ActionColumn from 'Components/ActionColumn'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, putRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import { nameAndNumberRegex } from 'Constants/regularExpression';
import './styles.scss';

const fieldDetails = [
    {
        label: 'Event Type', regex: nameAndNumberRegex, name: 'name', md: 12, className: 'width-100', required: true, id: 'outlined-textarea',
        default: '', rows: null, type: 'text', autoFocus: true, maxLength: '25',
    },
]

class EventTypeView extends Component {
    constructor() {
        super()
        this.state = {
            eventTypeList: [],
            loading: true,
            selectedToDelete: [],
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: true,
                        sort: true,
                        display: false,
                        viewColumns: false,
                    }
                },
                {
                    name: "Serial Number",
                    label: "Sl NO",
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
                    name: "name",
                    label: "Event Type",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "Actions",
                    label: "Actions",
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={(tableMeta.rowData[0])}
                                    temp={this.temp(tableMeta.rowData[2])}
                                    label='Please Enter Event Type'
                                    fieldDetails={fieldDetails}
                                    updateType={this.updateType}
                                    deleteType={this.deleteType}
                                    baseClassName='action-basic-detail-width'
                                    enabledActions={['edit', 'delete']}
                                />
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
        responsive: "scrollFullHeightFullWidth",
        filter: false,
        download: false,
        print: false,
        viewColumns: false,
        rowsPerPageOptions: [5, 10, 15],
        rowsPerPage: 5,
        selectableRows: 'none',
    };
    temp(name) {
        let temp = []
        temp.push(name)
        return temp
    }


    updateType = (newData, id) => {
        const put_url = PUT_URL.addEventType.api + id + '/'
        putRequest(put_url, newData, {}).then(response => {
            if (response && response.status === 200) {
                let eventType = this.state.eventTypeList
                eventType.map((data, index) => {
                    if (data.id === id) {
                        eventType[index].name = newData.name
                    }
                })
                this.setState({
                    eventTypeList: [...eventType]
                }, () => {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                })
            }
        })
    }

    async componentDidMount() {
        this.getLeaveTypeList()
    }

    getLeaveTypeList = () => {
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
    }

    deleteType = async (id, name) => {
        const del_url = DEL_URL.addEventType.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                let eventType = this.state.eventTypeList
                eventType.map((data, index) => {
                    if (data.id === id) {
                        eventType.splice(index, 1)
                    }
                })
                this.setState({
                    eventTypeList: eventType
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
        const { loading, eventTypeList, columns } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Box>
                    <Paper className={classNames('paper-background', 'outer-box-sm-padding', 'header-padding-top ')}>
                        <Grid container>
                            <Grid item md={7} xs={12} sm={12}>
                                <Box>
                                    <Typography variant='h5' color='primary'>
                                        Event Type Info
                                </Typography>
                                </Box>
                                <Box className={classNames('page-sub-head', 'header-align', 'flex-justify-center', 'mx-0-on-600')}>
                                    {`The Event Type schedule of the ${alias_names['school']} is defined here over a period time.The academic year
                                    over 12 months of time.`}
                                    </Box>
                            </Grid>
                            <Grid item md={5}>
                                <Box className='end-flex-prop'>
                                    <Button
                                        variant="contained"
                                        component={Link} to={`/dashboard/general/event-type/add`}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> Add Event Type</Button>
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container className={classNames('flex-justify-center', 'mx-0-on-600', 'outer-box-sm-padding', 'header-padding-top ')}>
                            <Grid item md={8}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={eventTypeList}
                                        title={"Event Type List"}
                                        data={eventTypeList}
                                        columns={columns}
                                        options={this.options}
                                    />
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            )
        }
    }
}
export default EventTypeView
