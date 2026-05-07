import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import { Link } from 'react-router-dom';

import { Dropdown } from 'Components/DropDown';
import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex, amountRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getAcademicYear, SetAcademicYear, getKeyValueMap, updatePermissions } from 'Includes/functions';
import { options } from 'Constants';

const fieldDetails = [
    { label: 'Department Name', regex: nameAndNumberRegex, name: 'name', md: 12, className: 'width-100', required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text' },
]

class ViewDepartment extends Component {
    constructor() {
        super();
        this.permission = updatePermissions('transport_department', ['update', 'delete']);
        this.state = {
            transportList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            yearList: [],
            year: '',
            pageLoading: false,
            isBlankPage: true,
            error: {},
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
                    label: "Name",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        display: this.permission.length > 0,
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={this.fieldValues(tableMeta.rowData[2])}
                                    label='Please update Department Name'
                                    fieldDetails={fieldDetails}
                                    updateUrl={PUT_URL.department.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateDepartment}
                                    deleteUrl={DEL_URL.department.api}
                                    deleteType={this.deleteTransport}
                                    baseClassName='action-basic-detail-width'
                                    enabledActions={this.permission}
                                />
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
        }
        return payload
    }


    componentDidMount = () => {
        this.getTransport()
        this.setState({
            options: options
        })
    }


    updateDepartment = (newData, id) => {
        this.setState({ tableUpdating: true })
        let transport = this.state.transportList
        transport.map((data, index) => {
            if (data.id === id) {
                transport[index].name = newData.name
            }
        })
        this.setState({
            transportList: [...transport],
            tableUpdating: false,
            columns: this.state.columns
        })
        return true
    }


    getTransport = () => {
        const url = GET_URL.department.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    transportList: response.data.data,
                    loading: false,
                })
            }
        })
    }

    deleteTransport = async (id) => {
        let transport = this.state.transportList
        transport.map((data, index) => {
            if (data.id === id) {
                transport.splice(index, 1)
            }
        })
        this.setState({
            transportList: [...transport]
        })
    }


    render() {
        const { loading, transportList, columns, options, tableUpdating, pageLoading, isBlankPage, error } = this.state
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
                                    Departments
                                    </Box>
                                <Box className='sub-heading'>
                                    Here we can add departments for transport    
                                </Box>
                            </Grid>

                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('transport_department', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.transport_department.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> 
                                    {Actions.transport_department.create.label}</Button>
                                    }
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={8}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={transportList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={transportList}
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
export default withRouter(ViewDepartment)




