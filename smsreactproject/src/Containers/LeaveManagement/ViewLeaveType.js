import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import InfoIcon from "@material-ui/icons/Info";

import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, putRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';
import { options } from 'Constants';
const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}


const fieldDetails = [
    { label: 'Leave Name', regex: nameAndNumberRegex, name: 'name', md: 12, className: 'width-100', required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text' },
    { label: 'Leave Code', regex: nameAndNumberRegex, name: 'code', md: 12, className: 'width-100', required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text' },
]

class ViewLeaveType extends Component {
    constructor() {
        super()
        this.state = {
            leaveTypeList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            columns: [
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
                    label: "Leave Type",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "code",
                    label: "code",
                    options: {
                        filter: true,
                        sort: true,
                        display: true
                    }
                },
                {
                    name: 'Actions',
                    label: 'Actions',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {tableMeta.rowData[3] !== 'lop' &&
                                    <ActionColumn
                                        id={tableMeta.rowData[0]}
                                        fieldValues={this.fieldValues(tableMeta.rowData[2], tableMeta.rowData[3])}
                                        label='Please Update Leave Type Details'
                                        fieldDetails={fieldDetails}
                                        updateUrl={PUT_URL.leavetype.api}
                                        updatePostFormat={this.updatePostFormat}
                                        updateType={this.updateType}
                                        deleteUrl={DEL_URL.leavetype.api}
                                        deleteType={this.deleteType}
                                        baseClassName='action-basic-detail-width'
                                        enabledActions={this.state.enabledActions}
                                    />
                                }
                                {tableMeta.rowData[3] === 'lop' &&
                                    <Tooltip
                                        title="Cant Edit/Delete default leave type"
                                        placement="top-start"
                                        arrow
                                    >
                                        <InfoIcon />
                                    </Tooltip>
                                }
                            </div>
                            );
                        }
                    }
                }

            ]
        }
    }


    fieldValues(name, code) {
        let fieldValues = [];
        fieldValues.push(name);
        fieldValues.push(code);
        return fieldValues
    }

    updatePostFormat = (newData) => {
        let payload = {
            name: newData.name,
            code: newData.code
        }
        return payload
    }


    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('manage_leave_types', 'update')
        const hasDeletePermission = isUserHasPermission('manage_leave_types', 'delete')
        let permissions = [];
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
            permissions.push('manage_leave_types');
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
            permissions.push('manage_leave_types');
        }
        if (enabledActions.length === 0) {
            test = false;
        }
        if (name === 'display') {
            return test
        }
        else {
            this.setState({
                enabledActions: enabledActions,
                permissions,
                columns: this.state.columns
            })
        }
    }

    componentDidMount = () => {
        this.getleaveTypeList()
        this.updatePermissions('actions');
        this.setState({
            options: options
        })
    }


    updateType = (newData, id) => {
        this.setState({ tableUpdating: true })
        let leaveType = this.state.leaveTypeList
        leaveType.map((data, index) => {
            if (data.id === id) {
                leaveType[index].name = newData.name
                leaveType[index].code = newData.code
            }
        })
        this.setState({
            leaveTypeList: [...leaveType],
            tableUpdating: false,
            columns: this.state.columns
        })
        return true
    }


    getleaveTypeList = () => {
        const url = GET_URL.leavetype.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    leaveTypeList: response.data.data,
                    loading: false
                })

            }
        })
    }

    deleteType = async (id) => {
        let leaveType = this.state.leaveTypeList
        leaveType.map((data, index) => {
            if (data.id === id) {
                leaveType.splice(index, 1)
            }
        })
        this.setState({
            leaveTypeList: leaveType
        })
    }

    render() {
        const { loading, leaveTypeList, columns, options, tableUpdating } = this.state
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
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Leave Type Info
                                    </Box>
                                <Box className='sub-heading'>
                                    {`The Leave Type schedule of the ${alias_names['school']} is defined here over a period time.The academic year
                                    over 12 months of time.`}
                                    </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('manage_leave_types', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.manage_leave_types.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.manage_leave_types.create.label}</Button>}
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={8}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={leaveTypeList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : 'Leave Type List'}
                                        data={leaveTypeList}
                                        columns={columns}
                                        options={options}
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
export default ViewLeaveType




