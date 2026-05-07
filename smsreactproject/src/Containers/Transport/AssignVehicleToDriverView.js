import React, { Component } from 'react'
import { Paper, Box, Button, Grid, Icon, CircularProgress, Avatar } from '@material-ui/core';
import classNames from 'classnames'
import Swal from 'sweetalert2'
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import _ from 'lodash';

import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls'
import LoadingGif from 'Components/LoadingGif';
import AssignVehicleModal from 'Containers/Transport/Components/AssignVehicleModal';
import { multiOptions } from 'Constants';
import { isUserHasPermission, getFormatMessage, getFullName } from 'Includes/functions';
import { FormattedMessage } from 'react-intl';
import messages from './messages';
import commonMessages from 'Constants/messages';
import { FormatListBulletedRounded } from '@material-ui/icons';
class StaffList extends Component {
    constructor() {
        super()
        this.state = {
            staffList: [],
            GridEnabled: false,
            ListEnabled: true,
            loading: true,
            showModal: false,
            selectedStaff: {},
            vehicleList: [],
            buttonLoading: false,
            assignedFilter: true,
            unassignedFilter: true,
            oldvehicleList: [],
            columns: [
                {
                    name: 'first_name',
                    label: <FormattedMessage {...commonMessages.staffName} />,
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        customBodyRender: (value, tableMeta) => {
                            return (
                                <Box>
                                    {getFullName(tableMeta.rowData[0], tableMeta.rowData[5], tableMeta.rowData[6])}
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: 'mobile_num',
                    label: <FormattedMessage {...commonMessages.mobileNo} />,
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: 'vehicle_details',
                    label: <FormattedMessage {...messages.vanDetail} />,
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value, tableMeta) => {
                            return (
                                <Box>
                                    {
                                        !!value
                                            ?
                                            <Box> {value.name} <br /> {value.vehicle_num} </Box>
                                            :
                                            <div> - </div>
                                    }
                                </Box>
                            )
                        }
                    }
                },
                {
                    name: 'id',
                    label: 'ID',
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        download: false
                    }
                },
                {
                    name: 'vehicle_driver_id',
                    label: 'Vehicle Driver Id',
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        download: false
                    }
                },
                {
                    name: 'middle_name',
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        download: false
                    }
                },
                {
                    name: 'last_name',
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        download: false
                    }
                },
                {
                    name: 'Actions',
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        display: this.updatePermissions('display'),
                        filter: false,
                        sort: false,
                        empty: true,
                        download: false,
                        customBodyRender: (value, tableMeta) => {
                            let fullName = tableMeta.rowData[0];
                            let vanDetail = tableMeta.rowData[2];
                            let id = tableMeta.rowData[4]
                            let staffId = tableMeta.rowData[3];
                            return (<Box display='flex' justifyContent='center'>
                                {!!vanDetail ?
                                    this.state.buttonLoading ?
                                        <CircularProgress />
                                        :
                                        <Button
                                            variant='contained' color='primary'
                                            onClick={() => { this.unAssignVan(id) }}>
                                            Unassign Van
                                        </Button>
                                    :
                                    this.state.buttonLoading ?
                                        <CircularProgress />
                                        :
                                        <Button
                                            variant='contained' color='primary'
                                            onClick={() => { this.getUnassignedVanList(fullName, staffId) }}>
                                            Assign Van
                                        </Button>
                                }
                            </Box>

                            );
                        },
                        customHeadRender: (columnMeta, updateDirection) => (
                            <th key={0} onClick={() => updateDirection(0)} className='mui-table-custom-header-center-align'>
                                {columnMeta.label}
                            </th>
                        )
                    }
                }
            ]
        }
    }

    async componentDidMount() {
        multiOptions['selectableRows'] = 'none';
        multiOptions['print'] = false
        multiOptions['filter'] = false
        multiOptions['viewColumns'] = false
        multiOptions['customFilterDialogFooter'] = () => {
            return this.getAssignedUnassignedDropDown()
        }
        multiOptions['onFilterChange'] = (onFilterChange, filterList, type) => {
            this.onFilterChangeHandler(type)
        }
        multiOptions['onDownload'] = (buildHead, buildBody, columns, data) => {
            const bodyData = data.map((arrData) => {
                arrData['data'].forEach((data_value, index) => {
                    if (index === 2 && arrData['data'][index]) {
                        arrData['data'][index] = `${data_value['name']} ${data_value['vehicle_num']}`
                    }
                })
                return arrData
            })
            columns.forEach(column_name => {
                column_name.label = getFormatMessage(column_name.label)
            })
            return "\uFEFF" + buildHead(columns) + buildBody(bodyData);
        }
        multiOptions['downloadOptions'] = {
            filename: "AssignVehicle.csv",
            filterOptions: {
                useDisplayedColumnsOnly: true,
                useDisplayedRowsOnly: true,
            },
        };
        this.setState({
            multiOptions: multiOptions,
        });
        this.getStaffList();
    }

    updatePermissions = (name) => {
        const hasEditPermission = isUserHasPermission('transport_assign_vehicle_driver', 'update')
        let permissions = [];
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
            permissions.push('transport_vehicle');
        }
        if (enabledActions.length === 0) {
            return false
        }
        return true
    }

    getUnassignedVanList = (fullName, staffId) => {
        let { buttonLoading } = this.state
        this.setState({
            buttonLoading: true
        })
        const url = GET_URL.vehicle.api
        const params = { is_active: true, unassigned_to_driver: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    vehicleList: response.data.data,
                    loading: false,
                    showModal: true,
                    selectedStaff: { 'full_name': fullName, 'staff_id': staffId },
                    buttonLoading: false
                })
            }
        })
    }

    unAssignVan = (id) => {
        let shift = this.state.shiftList
        const del_url = DEL_URL.vehicledriver.api
        const url = del_url + id + '/';
        let props = { ...this.props };
        props.confirmButtonText = 'Unassign Van';
        deleteRequest(url, {}, props).then(response => {
            if (response && response.status === 200) {
                this.getStaffList();
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: 'Van Unassigned',
                    showConfirmButton: false,
                    timer: 1500
                })
            }
        })
    }

    setToDefault = () => {
        let { selectedStaff, vehicleList } = this.state;
        selectedStaff = {}
        vehicleList = []
        this.setState({
            selectedStaff,
            vehicleList
        })
    }


    getStaffList() {
        const url = GET_URL.transportdriver.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    staffList: response.data.data,
                    oldstaffList: _.cloneDeep(response.data.data),
                    loading: false
                })
            }
        })
    }

    closeModal() {
        this.setToDefault();
        this.getStaffList();
        this.setState({
            showModal: false
        })
    }

    getAssignedUnassignedDropDown = () => {
        let { assignedFilter, unassignedFilter } = this.state;
        return <Box mt={2} >
            <FormControl>
                <FormControlLabel
                    control={<Checkbox checked={assignedFilter} onChange={(e) => this.onchangeFilter(e)} name="assignedFilter" />}
                    label="Assigned Drivers"
                />
                <FormControlLabel
                    control={<Checkbox checked={unassignedFilter} onChange={(e) => this.onchangeFilter(e)} name="unassignedFilter" />}
                    label="Unassigned Drivers"
                />
            </FormControl>
        </Box>
    }

    onchangeFilter = (e) => {
        let { staffList, oldstaffList } = this.state
        this.setState({
            [e.target.name]: e.target.checked
        }, () => {
            let { assignedFilter, unassignedFilter } = this.state
            staffList = []
            if (assignedFilter && unassignedFilter) {
                staffList = oldstaffList
            } else {
                oldstaffList.map((vehicleData) => {
                    if (assignedFilter && vehicleData.vehicle_driver_id) {
                        staffList.push(vehicleData);
                    } else if (unassignedFilter && !vehicleData.vehicle_driver_id) {
                        staffList.push(vehicleData);
                    }
                })
            }
            this.setState({ staffList })
        });
    }

    render() {
        let { loading, staffList, assignedFilter, unassignedFilter } = this.state
        if (loading) {
            return <LoadingGif />
        }
        else {
            return (
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                Assign Driver to Vehicle
                            </Box>
                            <Box className='sub-heading'>
                                Select assign/unassign button to assign/unassign van
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container className={classNames('flex-justify-center', 'header-align')}>
                        <Grid item md={12} xs={12}>
                            <Paper>
                                <AllMUIDataTable
                                    title={((assignedFilter && unassignedFilter) ? '' : unassignedFilter ? 'Unassigned Van List' :
                                        assignedFilter ? 'Assigned Van List' : '')}
                                    data={staffList}
                                    columns={this.state.columns}
                                    options={multiOptions}
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                    <AssignVehicleModal closeModal={() => this.closeModal()} fieldDetails={this.state.vehicleList}
                        selectedStaff={this.state.selectedStaff} showModal={this.state.showModal} />
                </Paper>
            )
        }
    }
}

export default StaffList;


//when assign or unassign just update the data which is edited dont load the entire the data


