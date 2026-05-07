import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission } from 'Includes/functions';
import { options } from 'Constants';

const fieldDetails = [
    {
        label: 'Asset Name', regex: nameAndNumberRegex, name: 'name', md: 12, className: 'width-100', required: true, id: 'outlined-textarea',
        default: '', rows: null, type: 'text', autoFocus: true, maxLength: '25',
    },
]

class ViewAssetTypes extends Component {
    constructor() {
        super()
        this.state = {
            assetTypeList: [],
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
                    label: "Asset Types",
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
                                    label='Please Update Asset Type'
                                    fieldDetails={fieldDetails}
                                    postUrl={POST_URL.asset.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.asset.api}
                                    deleteType={this.deleteType}
                                    baseClassName='action-basic-detail-width'
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


    fieldValues(from) {
        let fieldValues = [];
        fieldValues.push(from);
        return fieldValues
    }


    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('hostel_asset', 'update')
        const hasDeletePermission = isUserHasPermission('hostel_asset', 'delete')
        let permissions = [];
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
            permissions.push('hostel_asset');
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
            permissions.push('hostel_asset');
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
        this.getassetTypeList()
        this.updatePermissions('actions');
        this.setState({
            options: options
        })
    }

    updatePostFormat = (newData, id) => {
        let payload = [{
            name: newData.name,
            id: id
        }]
        return payload
    }

    updateType = (newData, id) => {
        this.setState({ tableUpdating: true })
        let section = this.state.assetTypeList
        section.map((data, index) => {
            if (data.id === id) {
                section[index].name = newData.name
            }
        })
        this.setState({
            assetTypeList: [...section],
            tableUpdating: false,
            columns: this.state.columns
        })
        return true
    }


    getassetTypeList = () => {
        const url = GET_URL.asset.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    assetTypeList: response.data.data,
                    loading: false
                })

            }
        })
    }

    deleteType = async (id) => {
        let asset = this.state.assetTypeList
        asset.map((data, index) => {
            if (data.id === id) {
                asset.splice(index, 1)
            }
        })
        this.setState({
            assetTypeList: asset,
        })
    }

    render() {
        const { loading, assetTypeList, columns, options, tableUpdating } = this.state
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
                                    Asset Information
                                    </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('hostel_asset', 'create') && <Button
                                        variant="contained"
                                        component={Link} to={Actions.hostel_asset.create.url}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.hostel_asset.create.label}</Button>}
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={7} xs={12}>
                                <Paper>
                                    <AllMUIDataTable
                                        key={assetTypeList}
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={assetTypeList}
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
export default ViewAssetTypes
