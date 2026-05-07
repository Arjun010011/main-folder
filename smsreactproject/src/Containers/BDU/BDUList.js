import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter, Link } from 'react-router-dom';
import classNames from 'classnames';
import Swal from 'sweetalert2'

import StudentListActions from 'Includes/StudentListActions'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import { nameAndNumberRegex } from 'Constants/regularExpression';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';
import { options } from 'Constants';
import UploadDrawer from 'Components/BDU/uploadDrawer';


class BDUList extends Component {
    constructor() {
        super()
        this.state = {
            bduList: [],
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
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
                    label: "Sl No.",
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
                    label: "name",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "description",
                    label: "Description",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "download/upload",
                    label: "Download/Upload",
                    options: {
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <UploadDrawer id={tableMeta.rowData[0]} />
                            </div>

                            );
                        }
                    }
                },
                {
                    name: 'Actions',
                    label: 'Actions',
                    options: {
                        display: true,
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <StudentListActions
                                    id={tableMeta.rowData[0]}
                                    index={tableMeta.rowIndex}
                                    deleteStudent={this.deleteItem}
                                    editURL={Actions.bdu_upload.update.url}
                                    // viewURL={Actions.bdu_upload.view.url}
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

    deleteItem = async (id, index) => {
        this.setState({ tableUpdating: true })
        let { bduList } = this.state
        const del_url = DEL_URL.bdu.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                bduList.splice(index, 1)
                this.setState({
                    bduList: [...bduList]
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

    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('bdu_upload', 'update')
        const hasDeletePermission = isUserHasPermission('bdu_upload', 'delete')
        let enabledActions = []
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
        this.getbduList()
        this.updatePermissions('actions');
        this.setState({
            options: options
        })
    }
    getbduList = () => {
        const url = GET_URL.bdu.api
        const params = { is_active: true }
        getRequest(url, params).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    bduList: response.data.data,
                    loading: false
                })

            }
        })
    }


    render() {
        const { loading, bduList, columns, options, tableUpdating } = this.state
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
                                    BDU Templates
                                    </Box>
                                <Box className='sub-heading'>
                                    The data can be added/updated in bulk.
                                    </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('bdu_upload', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.bdu_upload.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.bdu_upload.create.label}</Button>}
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={bduList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={bduList}
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

export default withRouter(BDUList);
