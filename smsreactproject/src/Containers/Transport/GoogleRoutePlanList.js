import React, { Component } from 'react'
import { Link, withRouter } from 'react-router-dom';
import Swal from 'sweetalert2';
import { GET_URL, DEL_URL } from 'Includes/urls';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { Dropdown } from 'Components/DropDown';
import { Grid, Paper, Box, Button, CircularProgress } from '@material-ui/core';
import { Actions } from 'Constants/permissions';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { SetAcademicYear, getKeyValueInArray, checkLocalAcademicYear, isUserHasPermission, getUrlParam } from 'Includes/functions';
import { options } from 'Constants';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import StudentListActions from 'Includes/StudentListActions'
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import LoadingGif from 'Components/LoadingGif';


class GoogleRoutePlanList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            academicYearList: [],
            yearName: '',
            academicYear: '',
            routePlanData: [],
            blankData: 'Select year',
            loading: true,
            tableUpdating: false,
            fieldError: {},
            locationKeyValue: {},
            map_address_data: {},
            isSingleInstitute: false
        };
        this.columns = [
            {
                name: "id",
                label: "Id",
                options: {
                    filter: true,
                    sort: true,
                    display: false
                }
            },
            {
                name: "name",
                label: "Route Name",
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "destination",
                label: "Destination",
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "stops",
                label: "Pickup / Drop Stops",
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "users",
                label: "Pickup / Drop Students",
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "pickup_vehicle",
                label: "Pickup Vehicle Name (No.)",
                options: {
                    filter: true,
                    sort: false,
                }
            },
            {
                name: "drop_vehicle",
                label: "Drop Vehicle Name (No.)",
                options: {
                    filter: true,
                    sort: false,
                }
            },
            {
                name: "Actions",
                label: "Action",
                options: {
                    filter: true,
                    sort: false,
                    customBodyRender: (value, tableMeta, updateValue) => {
                        return (<div>
                            <StudentListActions
                                id={tableMeta.rowData[0]}
                                index={tableMeta.rowIndex}
                                deleteStudent={this.deleteRoutePlan}
                                editURL={Actions.transport_route_map.update.url}
                                viewURL={Actions.transport_route_map_view.view.url}
                                editExtraParams={{
                                    year: this.state.academicYear, yearName: this.state.yearName,
                                    selected_address: this.state.selected_address, lat: this.state.map_address_data.latitude_map,
                                    lng: this.state.map_address_data.longitude_map,
                                }}
                                viewExtraParams={{
                                    year: this.state.academicYear, yearName: this.state.yearName,
                                    selected_address: this.state.selected_address, lat: this.state.map_address_data.latitude_map,
                                    lng: this.state.map_address_data.longitude_map,
                                }}
                                enabledActions={this.state.enabledActions}
                            />
                        </div>
                        );
                    }
                }
            }
        ];
    }

    async componentDidMount() {
        let { selected_address } = getUrlParam()
        this.setState({
            selected_address: selected_address?parseInt(selected_address):''
        })
        let params = { is_active: true }
        try {
            const res = await Promise.all([
                getRequest(GET_URL.getacademicyear.api, params, this.props),
                getRequest(GET_URL.instituteaddress.api, params, this.props),
            ]);
            this.getAcademicYearList(res[0])
            this.getInstituteList(res[1])
        } catch {
            throw Error("Promise failed");
        }
        this.updatePermissions();
    }

    getInstituteList = (response) => {
        let { loading, selected_address, isBlankData, academicYearList, blankData, map_address_data } = this.state;
        if (response && response.status === 200) {
            response.data.data.map((data) => {
                if (data.map_address_data && data.map_address_data) {
                    data['name'] = data.map_address_data.address_one_map
                }
            })
            if (response.data.data.length === 1) {
                selected_address = response.data.data[0]?.id
            }
            else if (response.data.data.length > 1) {
                loading = false
                isBlankData = true
                blankData =  checkLocalAcademicYear(academicYearList)?'Select institute address':'Select Year'
            }
            if (selected_address) {
                map_address_data = getKeyValueInArray(response.data.data, "id", selected_address, "map_address_data");
            }
            this.setState({
                loading,
                isBlankData,
                selected_address,
                blankData,
                addressList: response.data.data,
                map_address_data
            }, () => {
                if (response.data.data.length === 1) {
                    this.setState({isSingleInstitute:true})
                    this.getTransportPlanData()
                }
                if(selected_address){
                    this.getTransportPlanData()
                }
            })
        }
    }

    getAcademicYearList = (response) => {
        let { academicYearList, academicYear, yearName } = this.state;
        if (response && response.status === 200) {
            academicYearList = response.data.data;
            academicYear = checkLocalAcademicYear(academicYearList);
            if (academicYear) {
                yearName = getKeyValueInArray(academicYearList, 'id', academicYear, 'name')
            }
            this.setState({ academicYear:academicYear?academicYear:'', yearName, academicYearList })
        }
    }


    deleteRoutePlan = (id, index) => {
        let { routePlanData } = this.state
        const del_url = DEL_URL.route.api + id + '/';
        deleteRequest(del_url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                routePlanData.splice(index, 1)
                this.setState({
                    routePlanData: [...routePlanData]
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

    handleChange = async (e) => {
        let { name, value } = e.target;
        let { yearName, academicYearList, fieldError, addressList,blankData, map_address_data } = this.state;
        if (name === 'academicYear') {
            SetAcademicYear(value);
            yearName = getKeyValueInArray(academicYearList, 'id', value, 'name')
            blankData='Select institute address'
        }
        else {
            map_address_data = getKeyValueInArray(addressList, "id", value, "map_address_data");
        }
        delete fieldError[name]
        this.setState({
            [name]: value,
            fieldError,
            yearName,
            map_address_data,
            blankData
        }, () => this.getTransportPlanData())
    }

    getTransportPlanData = () => {
        let { academicYear, routePlanData, selected_address } = this.state
        if (academicYear && selected_address) {
            let params = { is_active: true, academic_year: academicYear, institute_address: selected_address };
            getRequest(GET_URL.route.api, params, this.props).then((response) => {
                if (response && response.status === 200) {
                    routePlanData = response.data.data;
                    routePlanData.map((data) => {
                        data['stops'] = `${data.pickup_total_stops} / ${data.drop_total_stops}`
                        data['users'] = `${data.pickup_total_users} / ${data.drop_total_users}`
                        data['pickup_vehicle'] = this.getVehicleDetails(data.vehicle_detail, 'pickup')
                        data['drop_vehicle'] = this.getVehicleDetails(data.vehicle_detail, 'drop')
                    })
                    this.setState({ routePlanData, loading: false, tableUpdating: false, isBlankData: false, blankData: '' });
                }
            });
        }
        else {
            this.setState({
                loading: false,
            })
        }
    }

    getVehicleDetails = (details, name) => {
        let return_data = ''
        if (name === 'pickup') {
            details.map((data) => {
                if (data['assignment_type'] === 1) {
                    return_data = `${data.vehicle.name} (${data.vehicle.vehicle_num})`
                }
            })
        }
        else if (name === 'drop') {
            details.map((data) => {
                if (data['assignment_type'] === 2) {
                    return_data = `${data.vehicle.name} (${data.vehicle.vehicle_num})`
                }
            })
        }
        return return_data
    }

    updatePermissions = (name) => {
        let test = true
        const hasViewPermission = isUserHasPermission('transport_route_map_view', 'view')
        const hasEditPermission = isUserHasPermission('transport_route_map', 'update')
        const hasDeletePermission = isUserHasPermission('transport_route_map', 'delete')
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

    handleCreateRoutePlan = () => {
        const { yearName, academicYear, selected_address, addressList, fieldError } = this.state;
        if (academicYear && selected_address) {
            let locationKeyValue = getKeyValueInArray(addressList, "id", selected_address, "map_address_data");
            let RoutePlanInformation = {
                'yearName': yearName,
                'year': academicYear,
                'selected_address': selected_address,
                'lat': locationKeyValue['latitude_map'],
                'lng': locationKeyValue['longitude_map']
            }
            let searchParam = "?" + new URLSearchParams(RoutePlanInformation).toString()
            this.props.history.push({
                pathname: Actions.transport_route_map.create.url,
                search: searchParam,
            });
        }
        else {
            if (!academicYear) {
                fieldError['academicYear'] = 'This field is mandatory'
            }
            if (!selected_address) {
                fieldError['selected_address'] = 'This field is mandatory'
            }
            this.setState({
                fieldError
            })
        }
    }


    render() {
        let { addressList, selected_address, academicYear, academicYearList, routePlanData, isBlankData,
            loading, blankData, tableUpdating, fieldError, isSingleInstitute } = this.state
        if (loading)
            return <LoadingGif />
        return (
            <>
                <Paper>
                    <Box className="paper-background">
                        <Grid container >
                            <Grid item md={6} xs={12} className='header-align'>
                                <Box className='heading'>
                                    Route Planning
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('transport_route_map', 'create') && <Button
                                        variant='contained'
                                        onClick={this.handleCreateRoutePlan}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.transport_route_map.create.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container spacing={3}>
                            <Grid item md={4} xs={12} className='header-align'>
                                <Dropdown
                                    data={academicYearList}
                                    name='academicYear'
                                    value={academicYear}
                                    onChange={this.handleChange}
                                    label='Academic Year'
                                    fullWidth
                                    hideSelect={true}
                                    error={fieldError['academicYear'] && fieldError['academicYear']}
                                />
                            </Grid>
                            {academicYear && !isSingleInstitute &&
                                <Grid item md={4} xs={12} className='header-align'>
                                    <Dropdown
                                        data={addressList}
                                        name='selected_address'
                                        value={selected_address}
                                        onChange={this.handleChange}
                                        label='Select Institute'
                                        fullWidth
                                        hideSelect={true}
                                        error={fieldError['selected_address'] && fieldError['selected_address']}
                                    />
                                </Grid>
                            }
                        </Grid>
                        {
                            isBlankData ?
                                <Paper className="margin-top-20">
                                    <BlankPagewithIcon data={blankData} />
                                </Paper>
                                :
                                <Box className="margin-top-20" >
                                    <Grid item md={12} xs={12} sm={12}>
                                        <AllMUIDataTable
                                            key={routePlanData}
                                            title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                            data={routePlanData}
                                            columns={this.columns}
                                            options={options}

                                        />
                                    </Grid>
                                </Box>
                        }
                    </Box>
                </Paper>
            </>
        );
    }
}

export default withRouter(GoogleRoutePlanList)

