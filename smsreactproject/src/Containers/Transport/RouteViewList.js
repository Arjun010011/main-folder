import React, { Component } from 'react'
import { Link, withRouter } from 'react-router-dom';
import Swal from 'sweetalert2';
import { GET_URL, DEL_URL } from 'Includes/urls';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { Dropdown } from 'Components/DropDown';
import { Grid, Paper, Box, Button } from '@material-ui/core';
import { Actions } from 'Constants/permissions';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { SetAcademicYear, getKeyValueInArray, checkLocalAcademicYear, isUserHasPermission } from 'Includes/functions';
import { options } from 'Constants';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import StudentListActions from 'Includes/StudentListActions'


class RouteViewList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            academicYearList: [],
            yearName: '',
            academicYear: 0,
            routePlanData: [],
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
                name: "total_stops",
                label: "Total Stops",
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "total_students",
                label: "Total Students",
                options: {
                    filter: true,
                    sort: true,
                }
            },
            {
                name: "vehicle_details",
                label: "Assigned Vehicle",
                options: {
                    filter: true,
                    sort: false,
                    customBodyRender: (value, tableMeta) => {
                        return (
                            <Box>
                                {
                                    !!value 
                                    ? 
                                        <Box> {value.name} <br/> {value.vehicle_num} </Box>
                                    :
                                    <div> - </div>
                                }
                            </Box>
                        )
                    }
                }
            },
            {
                name: "staff_details",
                label: "Assigned Driver",
                options: {
                    filter: true,
                    sort: false,
                    customBodyRender: (value, tableMeta) => {
                        return (
                            <Box>
                                {
                                    !!value 
                                    ? 
                                        <Box> {value.full_name} </Box>
                                    :
                                    <div> - </div>
                                }
                            </Box>
                        )
                    }
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
                                        editExtraParams={{year: this.state.academicYear, yearName: this.state.yearName }}
                                        viewExtraParams={{year: this.state.academicYear, yearName: this.state.yearName }}
                                        enabledActions={this.state.enabledActions}
                                    />
                                </div>
                        );
                    }
                }
            }
        ];
    }

    componentDidMount() {
        this.getAcademicYearList();
        this.updatePermissions();
    }

    deleteRoutePlan = ( id, index) => {
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

    getAcademicYearList = () => {
        let { academicYearList, academicYear, yearName }= this.state;
        let params = {is_active: true};
        getRequest(GET_URL.getacademicyear.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                academicYearList = response.data.data;
                academicYear= checkLocalAcademicYear(academicYearList);
                yearName = getKeyValueInArray(academicYearList, 'id', academicYear, 'name')
                this.setState({academicYear, yearName, academicYearList }, () => {
                    if( academicYear != 0 ){
                        this.getTransportPlanData();
                    }
                })
            }
        });
    }


    handleChange = async (e) => {
        let value = e.target.value;
        let { academicYearList, academicYear, yearName } = this.state;
        if (value !== 0 && value !== academicYear) {
            SetAcademicYear(value);
            yearName = getKeyValueInArray(academicYearList, 'id', value, 'name')
            this.setState({
                academicYear: value,
                yearName
            },() => this.getTransportPlanData())
        }
    }

    getTransportPlanData = () => {
        let {academicYear, routePlanData} = this.state
        if( academicYear ){
            let params = {is_active: true, academic_year: academicYear};
            getRequest(GET_URL.route.api, params, this.props).then((response) => {
                if (response && response.status === 200) {
                    routePlanData = response.data.data;
                    this.setState({routePlanData});
                }
            });
        }
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

    render() {
        let { yearName, academicYear, academicYearList, routePlanData} = this.state
        return (
            <>
                <Paper>
                    <Box className="paper-background">
                        <Grid container >
                            <Grid item md={6} xs={12} className='header-align'>
                                <Box className='heading'>
                                    Route Planning 
                                </Box>
                                <Box className='sub-heading'>
                                    Here we can view list route plans
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('transport_route_map', 'create') && <Button
                                        variant='contained'
                                        component={Link} to={{  pathname: Actions.transport_route_map.create.url, 
                                                                state: {'yearName': yearName, 'year': academicYear }}}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.transport_route_map.create.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Box mt={2}>
                            <Dropdown
                                data={academicYearList}
                                name='year'
                                value={academicYear}
                                onChange={this.handleChange}
                                label='Academic Year'
                                fullWidth
                                hideSelect={true}
                            />
                        </Box>
                        <Box className="margin-top-20" >
                            <Grid item>
                                <AllMUIDataTable
                                    key={routePlanData}
                                    data={routePlanData}
                                    columns={this.columns}
                                    options={options}
                                    
                                />
                            </Grid>
                        </Box>
                    </Box>
                </Paper>
            </>
        );
    }
}

export default withRouter(RouteViewList)

