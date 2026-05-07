import React, { Component } from 'react';
import { Paper, Box, Grid, Typography, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import StudentListActions from 'Includes/StudentListActions';
import ActionColumn from 'Components/ActionColumnNew';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls';
import { nameAndNumberRegex } from 'Constants/regularExpression';
import { Actions } from 'Constants/permissions';
import { dateFormat, isUserHasPermission, timeFormat } from 'Includes/functions';
import { viewTime } from 'Includes/viewFunctions';
import { options } from 'Constants';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class ShiftsView extends Component {
    constructor() {
        super()
        this.state = {
            shiftList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            errorContent: '',
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
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
                    label: "Shift Name",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "Actions",
                    label: "Actions",
                    options: {
                        display: this.updatePermissions('display'),
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <StudentListActions
                                    id={tableMeta.rowData[0]}
                                    index={tableMeta.rowIndex}
                                    deleteStudent={this.deleteType}
                                    editURL={Actions.manage_shift_types.update.url}
                                    viewURL={Actions.manage_shift_types_individual.view.url}
                                    enabledActions={this.state.enabledActions}
                                />
                            </div>
                            );
                        }
                    }
                }

            ]
        }
    }


    updatePermissions = (name) => {
        let test = true
        const hasViewPermission = isUserHasPermission('manage_shift_types', 'view')
        const hasEditPermission = isUserHasPermission('manage_shift_types', 'update')
        const hasDeletePermission = isUserHasPermission('manage_shift_types', 'delete')
        let enabledActions = [];
        if (hasViewPermission) {
            enabledActions.push('view')
        }
        if (hasEditPermission) {
            enabledActions.push('edit')
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
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
                columns: this.state.columns
            })
        }
    }

    componentDidMount = () => {
        this.getShiftList()
        this.updatePermissions('actions');
        this.setState({
            options: options
        })
    }

    getShiftList = () => {
        const url = GET_URL.shift.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    shiftList: response.data.data,
                    loading: false
                })

            }
        })
    }



    deleteType = async (id, index) => {
        this.setState({ tableUpdating: true })
        let { shiftList, columns } = this.state
        const del_url = DEL_URL.shift.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                shiftList.splice(index, 1)
                this.setState({
                    shiftList,
                    columns: [...columns]
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
        this.setState({ tableUpdating: false })
    }



    render() {
        const { loading, shiftList, columns, options, tableUpdating } = this.state
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
                                    Shift type list
                                        </Box>
                                <Box className='sub-heading'>
                                    {`The Shift schedule of the ${alias_names['school']} is defined here over a period time.The academic year
                                    over 12 months of time.`}
                                        </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('manage_shift_types', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.manage_shift_types.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.manage_shift_types.create.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={8} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={shiftList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={shiftList}
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
export default ShiftsView
