import React, { Component } from 'react';
import { Paper, Box, Grid,  Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import ActionColumn from 'Components/ActionColumn';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';
import { getRequest, putRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import { nameAndNumberRegex } from 'Constants/regularExpression';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';
import { options } from 'Constants';

const fieldDetails = [
    {
        label: 'Standard Name', regex: nameAndNumberRegex, name: 'name', md: 12, className: 'width-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', autoFocus: true, maxLength: '25',
    },
]

class ManageStandardView extends Component {
    constructor() {
        super()
        this.state = {
            standardList: [],
            loading: true,
            selectedToDelete: [],
            closeMenu: true,
            tableUpdating: false,
            errorContent:'',
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        viewColumns: false,
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
                    label: "Standards",
                    options: {
                        filter: true,
                        sort: true,
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
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={this.fieldValues(tableMeta.rowData[2])}
                                    label='Please Update Standard Name'
                                    fieldDetails={fieldDetails}
                                    updateType={this.updateType}
                                    deleteType={this.deleteType}
                                    baseClassName='action-basic-detail-width'
                                    enabledActions={this.state.enabledActions}
                                    closeMenu={this.state.closeMenu}
                                    errorContent={this.state.errorContent}
                                    closeMenuAction={this.closeMenuAction}
                                />
                            </div>
                            );
                        }
                    }
                }

            ]
        }
    }


    fieldValues(from, to) {
        let fieldValues = [];
        fieldValues.push(from);
        fieldValues.push(to);
        return fieldValues
    }

    closeMenuAction = (status) => {
        let { standardList, columns } = this.state
        this.setState({
            standardList: [...standardList],
            closeMenu: status,
            errorContent: '',
            columns:columns
        })
    }

    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('standards', 'update')
        const hasDeletePermission = isUserHasPermission('standards', 'delete')
        let permissions = [];
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
            permissions.push('standards');
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
            permissions.push('standards');
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
        this.getStandardList()
        this.updatePermissions('actions');
        this.setState({
            options: options
        })
    }

    getStandardList = () => {
        const url = GET_URL.standard.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    standardList: response.data.data,
                    loading: false
                });
            }
        });
    }


    updateType = (newData, id) => {
        this.setState({ tableUpdating: true })
        let payload = {
            name: newData.name
        }
        const put_url = PUT_URL.standard.api + id + '/'
        let props = { ...this.props };
        props['return_error'] = true
        putRequest(put_url, payload, props).then(response => {
            if (response && response.status === 200) {
                let standard = this.state.standardList
                standard.map((data, index) => {
                    if (data.id === id) {
                        standard[index].name = newData.name
                    }
                })
                this.setState({
                    closeMenu: false,
                    standardList: [...standard],
                    tableUpdating: false,
                    columns: this.state.columns
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
            else if(response && response.status === 400){
                this.setState({
                    standardList:[...this.state.standardList],
                    errorContent:response.data.name[0],
                    tableUpdating: false,
                    columns: this.state.columns,
                })
            }
        })
    }



    deleteType = async (id, name) => {
        this.setState({ tableUpdating: true })
        const del_url = DEL_URL.standard.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                let standard = this.state.standardList
                standard.map((data, index) => {
                    if (data.id === id) {
                        standard.splice(index, 1)
                    }
                })
                this.setState({
                    standardList: standard
                })
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
            }
            this.setState({ tableUpdating: false })
        })
    }

    render() {
        const { loading, standardList, columns, options, tableUpdating } = this.state
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
                    <Paper className='paper-background'>
                        <Grid container> 
                            <Grid item md={6} xs={12} className='header-align'>
                                <Box className='heading'>
                                    Standard Info
                                        </Box>
                                <Box className='sub-heading'>
                                    The Standard schedule of the school is defined here over a period time.The academic year
                                    over 12 months of time.
                                        </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('standards', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.standards.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.standards.create.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={6}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={standardList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={standardList}
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
export default ManageStandardView
