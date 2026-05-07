import React, { Component } from 'react';
import { Link, withRouter } from 'react-router-dom';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import { Grid, Paper, Box, Button } from '@material-ui/core';
import Swal from 'sweetalert2'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';


import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getFormatMessage } from 'Includes/functions';
import { GET_URL, DEL_URL } from 'Includes/urls';
import StudentListActions from 'Includes/StudentListActions';
import loadingBar from 'images/loading.gif'
import classNames from 'classnames';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages';
import './styles.scss';

class ViewGpsMachine extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            vehicles: null
        };
        this.columns = [
            {
                name: "id",
                label: "id",
                options: {
                    filter: false,
                    sort: false,
                    viewColumns: false,
                    display: false,
                    download: false
                }
            },
            {
                name: "vendor",
                label: 'Vendor',
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "object_name",
                label: 'Object Name',
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "object_type",
                label: 'Object Type',
                options: {
                    filter: true,
                    sort: false,
                }
            },
            {
                name: "imei_no",
                label: 'Imei No.',
                options: {
                    filter: true,
                    sort: false,
                }
            },
            {
                name: "sim_card_number",
                label: 'Sim Card No.',
                options: {
                    filter: true,
                    sort: false,
                }
            },
            {
                name: "sim_provider",
                label: 'Sim Provider',
                options: {
                    filter: true,
                    sort: false,
                }
            },
            {
                name: "manufacture_date",
                label: 'Manufacture Date',
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "purchase_date",
                label: 'Purchased Date',
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "Actions",
                label: <FormattedMessage {...commonMessages.actions} />,
                options: {
                    display: this.updatePermissions('display'),
                    filter: false,
                    sort: false,
                    download: false,
                    customBodyRender: (value, tableMeta, updateValue) => {
                        return (<div>
                                <StudentListActions
                                    id={tableMeta.rowData[0]}
                                    index={tableMeta.rowIndex}
                                    deleteStudent={this.deleteVehicle}
                                    editURL={Actions.transport_gps_machine.update.url} 
                                    viewURL={Actions.transport_gps_machine.view.url}
                                    enabledActions={['edit', 'delete']}
                                />
                        </div>
                        );
                    }
                }
            }
        ]
    }

    componentDidMount() {
        this.fetchMachines();
    }

    deleteVehicle = (id, index) => {
        let url = `${DEL_URL.gpsmachine.api}${id}/`
        let { vehicles } = this.state;
        deleteRequest(url, {}, this.props).then((response) => {
            if (response && response.status === 200) {
                vehicles.splice(index, 1)
                this.setState({
                    vehicles: [...vehicles]
                })
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
            }
        });
    }

    fetchMachines = () => {
        const params = { is_active: true }
        getRequest(GET_URL.gpsmachine.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let vehicles = response.data.data;
                this.setState({ vehicles })
            }
        });
    }

    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('transport_gps_machine', 'update')
        const hasDeletePermission = isUserHasPermission('transport_gps_machine', 'delete')
        let permissions = [];
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
            permissions.push('transport_gps_machine');
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
            permissions.push('transport_gps_machine');
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

    render() {
        const { loading } = this.state;
        const options = {
            selectableRows: 'none',
            responsive: "scroll",
            viewColumns: false,
            filter:false,
            print: false,
            downloadOptions: {
                filename: "vehicles.csv",
                    filterOptions: {
                    useDisplayedColumnsOnly: true,
                    useDisplayedRowsOnly: true,
                    },
                },
            onDownload: (buildHead, buildBody, columns, data) => {
                const bodyData = data.map((data_value) => {
                    return data_value;
                })
                const bodyColumn = columns.map((column_name) => {
                    column_name.label = getFormatMessage(column_name.label)
                    return column_name;
                })
                return "\uFEFF" + buildHead(bodyColumn) + buildBody(bodyData);
            }
        }
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className={'loading'} alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <>
                    <Paper>
                        <Box className="paper-background">
                            <Grid container >
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                    <Box className='heading'>
                                        Gps Machine
                                    </Box>
                                    <Box className='sub-heading'>
                                        List of gps machine in school
                                    </Box>
                                </Grid>
                                <Grid item md={6} xs={12} >
                                    <Box className={classNames('header-align', 'end-flex-prop')}>
                                        {isUserHasPermission('transport_gps_machine', 'create') && <Button
                                            variant='contained'
                                            component={Link} to={Actions.transport_gps_machine.create.url}
                                            className='editbutton-view'
                                        >
                                            <AddCircleOutlineOutlinedIcon className='visibility-icon' /> 
                                            {Actions.transport_gps_machine.create.label}</Button>}
                                    </Box>
                                </Grid>
                                <Grid item md={12} xs={12} sm={12}>

                                <Paper style={{ marginTop: '40px' }}>
                                        <AllMUIDataTable
                                            data={this.state.vehicles}
                                            columns={this.columns}
                                            options={options}
                                        />
                                    </Paper>
                                    </Grid>

                            </Grid>
                        </Box>
                    </Paper>
                </>
            )
        }
    }
}

export default withRouter(ViewGpsMachine)