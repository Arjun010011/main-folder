import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Actions } from 'Constants/permissions';
import { withRouter } from 'react-router-dom';
import DynamicForm from 'Components/DynamicForm';
import { latLongRegex } from 'Constants/regularExpression'
import { getUrlParam, isUserHasPermission } from 'Includes/functions';
import {
    Grid, Paper, Box, Button, Toolbar, AppBar, Dialog, DialogContent, DialogTitle, IconButton,
    Tooltip, Typography, Radio, RadioGroup, FormControlLabel, FormControl, DialogActions
} from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import Swal from 'sweetalert2'
import { postRequest, getRequest, putRequest } from 'Includes/api/apicall';
import CloseIcon from '@material-ui/icons/Close';
import { POST_URL, GET_URL, PUT_URL } from 'Includes/urls';
import _ from 'lodash';
import Divider from '@material-ui/core/Divider';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert, getSettingValue, getFormattedAddress } from 'Includes/functions';
import AddPlaceNameWithMap from 'Containers/Transport/AddPlaceNameWithMap';
import RouterAreaGoogleAdd from './RouterAreaGoogleAdd';
import { GOOGLE_API_KEY } from 'Includes/api/constant';
import MyLocationIcon from '@material-ui/icons/MyLocation';
import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import LoadingGif from 'Components/LoadingGif';
import { withScriptjs } from "react-google-maps";
import { cloneDeep } from 'lodash';
import ShowMultipleRoute from './Components/ShowMultipleRoute';
import EditIcon from '@material-ui/icons/Edit';
import InfoIcon from "@material-ui/icons/Info";

const google = window.google;
let directionsService;

const ShowMultipleRouteLoader = withScriptjs(ShowMultipleRoute);

const isGoogleMap = true;

class AddStudentLocationRegistration extends Component {

    constructor(props) {
        super(props)
        this.state = {
            year: 0,
            yearName: '',
            fieldData: {},
            submitDisable: false,
            fieldErrors: {},
            fieldDetails: [],
            areaList: [],
            selected_area: '',
            error: false,
            snackbar: false,
            alertData: '',
            routeDetails: {
                address_one_map: '', address_two_map: '', city_map: '', district_map: '', state_map: '', country_map: '', pincode_map: '',
                area_name: '', land_mark: '', distance: 0, isArea: true
            },
            addressInformations: {},
            map_address_data: {},
            addressList: [],
            loading: true,
            showMultipleRouteDialog: false,
            selected_route_area: '',
            location_details: {}

        }
        this.googleMapRef = React.createRef()
    }

    componentDidMount() {
        let { yearName, year, studentId, userId, id } = getUrlParam()
        if (!yearName || !year || !studentId || !userId) {
            this.props.history.push(Actions.transport_student_address_registration.view.url);
        } else {
            this.setState({ studentId: studentId, year: year, yearName: yearName, userId, id: id }, () => {
                if (Actions.transport_student_address_registration.update.url === (this.props.location.pathname)) {
                    if (id) {
                        this.setState({ isEditForm: true }, () => {
                            this.getInstituteList()
                        })
                    }
                    else {
                        this.props.history.push(Actions.transport_student_address_registration.view.url);
                    }
                } else {
                    this.getInstituteList()
                }
            })
        }
        directionsService = new google.maps.DirectionsService();
    }

    getInstituteList = () => {
        let { studentId, year, map_address_data } = this.state;
        const url = GET_URL.instituteaddress.api
        const params = { is_active: true, student: studentId, academic_year: year }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                map_address_data = {
                    latitude_map: parseFloat(response.data.data.map_address_data.latitude_map),
                    longitude_map: parseFloat(response.data.data.map_address_data.longitude_map)
                }
                this.setState({
                    institute_address: response.data.data.id,
                    map_address_data
                }, () => {
                    this.getAreaList()
                })
            }
        })
    }

    getAreaList = () => {
        let { institute_address, loading, isEditForm } = this.state;
        const url = GET_URL.area.api;
        const params = { is_active: 1, institute_address: institute_address, area_type: 1 }
        getRequest(url, params).then((response) => {
            if (response && response.status === 200) {
                if (!isEditForm) {
                    loading = false
                }
                this.setState({
                    areaList: response.data.data,
                    loading
                }, () => {
                    if (isEditForm) {
                        this.editPageData()
                    }
                })
            }
        })
    }

    editPageData = () => {
        const { id, routeDetails } = this.state;
        let url = `${GET_URL.routeuseraddress.api}${id}/`;
        getRequest(url, {}, this.props).then((response) => {
            if (response && response.status === 200) {
                let editDetails = response.data.data
                routeDetails['isArea'] = editDetails.area_details.area_type === 1
                routeDetails['distance'] = editDetails.area_details.km
                if (routeDetails['isArea']) {
                    routeDetails['selected_area'] = editDetails.area_details
                    routeDetails['selected_route'] = {}
                    routeDetails['selected_route'] = { 'distance_label': editDetails.area_details.km }
                }
                else {
                    routeDetails['id'] = id
                    routeDetails['address_one_map'] = editDetails.area_details.address_one
                    routeDetails['address_two_map'] = editDetails.area_details.address_two
                    routeDetails['city_map'] = editDetails.area_details.city
                    routeDetails['district_map'] = editDetails.area_details.district
                    routeDetails['state_map'] = editDetails.area_details.state
                    routeDetails['country_map'] = editDetails.area_details.country
                    routeDetails['pincode_map'] = editDetails.area_details.pincode
                    routeDetails['land_mark'] = editDetails.area_details.landmark
                    routeDetails['latitude_and_langitude_map'] = {
                        lat: parseFloat(editDetails.area_details.latitude), lng: parseFloat(editDetails.area_details.longitude)
                    }
                }
            }
            this.setState({
                routeDetails,
                loading: false,
            }, () => {
                if (!routeDetails['isArea']) {
                    this.updateDistance()
                }
            })
        });
    }


    updateParent = (name, value) => {
        let { fieldData } = this.state
        fieldData[name] = value
        this.setState({
            fieldData
        })
    }

    selectAddress = async () => {
        const { addressInformations, fieldErrors, routeDetails } = this.state;
        let { location } = this.googleMapRef.current.getLatAndLngDetails()
        await fetch(
            'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + location['lat'] + ',' + location['lng'] + '&sensor=true&key=' + GOOGLE_API_KEY,
        )
            .then((response) => response.json())
            .then(async (responseJson) => {
                let formatted_address = await getFormattedAddress(responseJson.results[0])
                let address_temp = { ...addressInformations, ...formatted_address }
                delete fieldErrors['select_address']
                let updatedDetails = { ...routeDetails, ...address_temp }
                this.setState({
                    routeDetails: { ...updatedDetails },
                    googleMapLocator: false,
                    fieldErrors
                }, () => {
                    this.updateDistance()
                })
            });
    }

    updateDistance = () => {
        const { selected_list, routeDetails, map_address_data } = this.state;
        let lat_lng = {}
        if (routeDetails.latitude_and_langitude_map?.lat && routeDetails.latitude_and_langitude_map?.lng) {
            lat_lng = { lat: map_address_data.latitude_map, lng: map_address_data.longitude_map }
            this.getDirection(routeDetails.latitude_and_langitude_map, lat_lng)
        }
        this.setState({
            selected_list
        })
    }

    getDirection = (origin, destination) => {
        let { routeDetails, isEditForm } = this.state;
        let routes_list = []
        let route_temp = {}
        directionsService.route(
            {
                origin: origin,
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING,
                provideRouteAlternatives: true,
            },
            (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    let new_result = result
                    let copy_result = cloneDeep(result)
                    result.routes.forEach(function (rou, index) {
                        new_result = cloneDeep(result)
                        route_temp = {}
                        route_temp['name'] = index
                        route_temp['distance'] = parseFloat((rou.legs[0].distance.value / 1000).toFixed(1))
                        route_temp['distance_label'] = rou.legs[0].distance.text
                        route_temp['duration'] = rou.legs[0].duration.value
                        route_temp['duration_label'] = rou.legs[0].duration.text
                        new_result['routes'] = [copy_result.routes[index]]
                        route_temp['result'] = new_result
                        if (isEditForm && routeDetails['distance'] === route_temp['distance']) {
                            routeDetails['selected_route'] = route_temp
                        }
                        routes_list.push(route_temp)
                    })
                    routeDetails['route_list'] = routes_list
                    if (routes_list.length === 1) {
                        routeDetails['selected_route'] = routes_list[0]
                    }
                    this.setState({
                        routeDetails
                    })
                } else {
                    console.error(`error fetching directions ${result}`);
                }
            }
        );

    };


    submit = () => { 
        const{isEditForm,id}=this.state;
        const validation_post_load = this.validation()
        if (validation_post_load) {
            if(isEditForm){
                const url = PUT_URL.routeuseraddress.api+''+id+'/';
                putRequest(url, validation_post_load).then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data.Reason,
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.props.history.push(Actions.transport_student_address_registration.view.url);
                    }
                    this.setState({
                        submitDisable: false
                    })
                })            
            }
            else{
                const url = POST_URL.routeuseraddress.api;
                postRequest(url, validation_post_load).then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: response.data.Reason,
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.props.history.push(Actions.transport_student_address_registration.view.url);
                    }
                    this.setState({
                        submitDisable: false
                    })
                })
            }
        }
    }



    validation = () => {
        let { fieldErrors, routeDetails, year, userId, institute_address, isEditForm , id} = this.state;
        let return_data = true
        if (routeDetails.isArea) {
            if (!routeDetails.selected_area) {
                fieldErrors['selected_area'] = 'This field is mandatory'
                return_data = false
            }
        }
        else {
            if (!routeDetails.address_one_map) {
                fieldErrors['address_one_map'] = 'This field is mandatory'
                return_data = false
            }
        }

        return_data = {
            academic_year: year,
            user: userId,
            area_datas: {}
        }
        if (isEditForm) {
            return_data['id'] = parseInt(id)
        }
        if (routeDetails.isArea) {
            return_data['area'] = routeDetails.selected_area.id
        }
        else {
            if (!routeDetails.selected_route) {
                fieldErrors[`select`] = 'Select best route'
                return_data = false
            }
            else {
                return_data['area_datas']['address_one'] = routeDetails.address_one_map
                return_data['area_datas']['address_two'] = routeDetails.address_two_map
                return_data['area_datas']['city'] = routeDetails.city_map
                return_data['area_datas']['district'] = routeDetails.district_map
                return_data['area_datas']['state'] = routeDetails.state_map
                return_data['area_datas']['country'] = routeDetails.country_map
                return_data['area_datas']['pincode'] = routeDetails.pincode_map
                return_data['area_datas']['km'] = routeDetails.selected_route.distance
                return_data['area_datas']['institute_address'] = institute_address
                return_data['area_datas']['landmark'] = routeDetails.land_mark
                return_data['area_datas']['latitude'] = routeDetails.latitude_and_langitude_map.lat
                return_data['area_datas']['longitude'] = routeDetails.latitude_and_langitude_map.lng
            }
        }
        this.setState({
            fieldErrors
        })
        if (return_data) {
            return return_data
        }
        else{
            return false
        }
    }

    onChangeArea = (value) => {
        let { selected_area_id, selected_area } = this.state
        if (value != null) {
            selected_area_id = value.id
            selected_area = value.name
            this.setState({
                selected_area_id,
                selected_area
            })
        }
        else {
            this.setState({
                selected_area_id: "",
                selected_area: ""
            })
        }
    }

    handleClose = () => {
        this.setState({
            snackbar: false,
            errors: false
        })
    }

    getSelectedItem() {
        let { areaList, selected_area_id } = this.state
        const item = areaList.find((opt) => {
            if (parseInt(opt.id) === selected_area_id)
                return opt;
        })
        return item || {};
    }

    handleDialogOpen = () => {
        this.setState({
            googleMapLocator: !this.state.googleMapLocator
        })
    }

    handleChange = (e) => {
        let { name, value } = e.target;
        let { fieldErrors, routeDetails } = this.state;
        delete fieldErrors[name]
        if (name === 'isArea') {
            value = value === 'true'
            routeDetails['address_one_map'] = ''
            routeDetails['address_two_map'] = ''
            routeDetails['city_map'] = ''
            routeDetails['district_map'] = ''
            routeDetails['state_map'] = ''
            routeDetails['country_map'] = ''
            routeDetails['pincode_map'] = ''
            routeDetails['selected_area'] = ''
            routeDetails['distance'] = 0
            delete routeDetails['selected_route']
            delete routeDetails['route_list']
        }
        routeDetails[name] = value
        this.setState({
            routeDetails,
            fieldErrors
        })
    }

    handleLocateUpdateDetails = (data) => {
        if (data['latitude_and_langitude_map']) {
            this.googleMapRef.current.updateDetails(data['latitude_and_langitude_map'])
        }
    }

    getCurrentLocation = () => {
        if (navigator.geolocation) {
            let result = navigator.geolocation.getCurrentPosition(this.showPosition);
        }
    }


    showPosition = (position) => {
        let currentLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        this.setState({
            lat_lng: currentLocation
        })
        this.googleMapRef.current.updateDetails(currentLocation)
    }

    handleDropDownWithSearchChange = (e, newValue) => {
        let { fieldErrors, routeDetails } = this.state;
        delete fieldErrors['selected_area']
        routeDetails['selected_area'] = newValue
        routeDetails['latitude_and_langitude_map'] = { lat: newValue.latitude, lng: newValue.longitude }
        routeDetails['selected_route'] = {}
        routeDetails['selected_route'] = { 'distance_label': newValue['km'] }
        this.setState({
            routeDetails,
        })
    }

    handleClick = (index) => {
        let { map_address_data, routeDetails } = this.state;
        let location_details = { institude: {}, area: {} }
        location_details['institute'] = { lat: parseFloat(map_address_data['latitude_map']), lng: parseFloat(map_address_data['longitude_map']) }
        location_details['area'] = { lat: routeDetails.latitude_and_langitude_map.lat, lng: routeDetails.latitude_and_langitude_map.lng }
        this.setState({
            selected_institute: index,
            location_details,
            showMultipleRouteDialog: true
        })
    }

    handleCloseDialog = () => {
        this.setState({
            showMultipleRouteDialog: false,
            selected_route_area: '',
            location_details: {}
        })
    }

    handleChangeRouteArea = (e) => {
        let { name, value } = e.target
        this.setState({
            [name]: parseInt(value)
        })
    }

    handleSelectRouteArea = () => {
        let { selected_route_area, routeDetails, fieldErrors } = this.state;
        if (selected_route_area !== '') {
            routeDetails['selected_route'] = routeDetails['route_list'][selected_route_area]
            delete fieldErrors[`select`]
            this.setState({
                routeDetails,
                showMultipleRouteDialog: false,
                selected_route_area: '',
                fieldErrors,
                location_details: {}
            })
        }
    }

    handleModifyClick = () => {
        let { selected_route_area, routeDetails, map_address_data } = this.state;
        selected_route_area = routeDetails['selected_route']['name']
        let location_details = { institude: {}, area: {} }
        location_details['institute'] = { lat: parseFloat(map_address_data['latitude_map']), lng: parseFloat(map_address_data['longitude_map']) }
        location_details['area'] = { lat: routeDetails.latitude_and_langitude_map.lat, lng: routeDetails.latitude_and_langitude_map.lng }
        this.setState({
            showMultipleRouteDialog: true,
            selected_route_area,
            location_details
        })
    }

    render() {
        let { submitDisable, yearName, areaList, routeDetails, fieldErrors, alertData, snackbar,
            googleMapLocator, addressInformations, loading, showMultipleRouteDialog, selected_route_area,
            location_details } = this.state;
        if (loading) {
            return <Box> <LoadingGif /> </Box>
        } else {
            return (
                <Paper className='paper-background pt-0'>
                    <Grid container className=''>
                        <Grid item md={6} xs={12} sm={12} className='header-align'>
                            <Box className='heading'>
                                Student Address
                            </Box>
                            <Box className='sub-heading'>
                                Register student address for mapping student to stops
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                {isUserHasPermission('transport_student_address_registration', 'view') && <Button
                                    variant="contained"
                                    component={Link} to={Actions.transport_student_address_registration.view.url}
                                    className='editbutton-view'
                                ><VisibilityOutlinedIcon className='visibility-icon' />  {Actions.transport_student_address_registration.view.label}</Button>}
                            </Box>
                        </Grid>
                    </Grid>
                    <Box mt={2} mb={2}>
                        <Divider />
                    </Box>
                    <Box className="year-std-box mr-40">
                        <Box className="academic-std-head "> For Academic Year</Box>
                        <Box className="aca-std-white-background">{yearName}</Box>
                    </Box>
                    {!isGoogleMap ?
                        <Grid item lg={6} md={10} xs={12}>
                            <Box className="mt-30">
                                <Autocomplete
                                    id="Please Select Area"
                                    options={areaList}
                                    value={this.getSelectedItem()}
                                    getOptionLabel={(options) => options.name}
                                    style={{ width: 300 }}
                                    onChange={(event, value) => this.onChangeArea(value)}
                                    renderInput={(params) => <TextField {...params} label="Select Area" variant="outlined" />}
                                />
                            </Box>
                            <Box className="mt-20" marginLeft="250px">
                                <Button variant='contained'
                                    color='primary' className='submit'
                                    disabled={submitDisable}
                                    onClick={this.submit}>submit
                                </Button>
                            </Box>
                        </Grid>

                        :
                        <Grid container spacing={3}>
                            <Grid item md={8} xs={12}>
                                <Paper className='paper-plain-background min-height-50vh'>
                                    <Grid container spacing={3} className='mt-20'>
                                        <Grid item md={12} xs={12}>
                                            <FormControl>
                                                <RadioGroup value={routeDetails.isArea} onChange={this.handleChange} name='isArea' row>
                                                    <FormControlLabel
                                                        value={true}
                                                        control={<Radio color="primary" />}
                                                        label={'Select registered area'}
                                                        labelPlacement="end"
                                                    />
                                                    <FormControlLabel
                                                        value={false}
                                                        control={<Radio color="primary" />}
                                                        label={'Register address manually'}
                                                        labelPlacement="end"
                                                    />
                                                </RadioGroup>
                                            </FormControl>
                                        </Grid>
                                    </Grid>
                                    {routeDetails.isArea ?
                                        <Grid container spacing={3} className=''>
                                            <Grid item md={6} xs={12}>
                                                <DropDownWithSearch
                                                    id="combo-box-demo"
                                                    options={areaList}
                                                    value={routeDetails.selected_area}
                                                    onChange={(e, newValue) => this.handleDropDownWithSearchChange(e, newValue)}
                                                    name='selected_area'
                                                    label={'Select area'}
                                                    className='width-100'
                                                    helperText={fieldErrors['selected_area'] && fieldErrors['selected_area']}
                                                    error={fieldErrors['selected_area'] && fieldErrors['selected_area']}
                                                    required
                                                />
                                            </Grid>
                                        </Grid>
                                        :
                                        <Box className='text-blue text-underline mt-20 cursor-pointer width-fit-content' onClick={this.handleDialogOpen}>
                                            Click here to select address
                                        </Box>
                                    }
                                    <Box className='mt-10 text-red'>
                                        {fieldErrors['select_address']}
                                    </Box>
                                    {routeDetails.pincode_map && !routeDetails.isArea &&
                                        <Grid container spacing={3} className='mt-20'>
                                            <Grid item md={6} xs={12}>
                                                <TextField
                                                    id='route-name'
                                                    label='Land Mark'
                                                    name='land_mark'
                                                    autoComplete="off"
                                                    value={routeDetails.land_mark}
                                                    className='w-100'
                                                    variant="outlined"
                                                    inputProps={{ maxLength: 50 }}
                                                    helperText={fieldErrors['land_mark'] ? fieldErrors['land_mark'] : ''}
                                                    error={fieldErrors['land_mark'] ? true : false}
                                                    onChange={(e) => this.handleChange(e)}
                                                />
                                            </Grid>
                                            <Grid item md={6} xs={12}>
                                                <TextField
                                                    id='route-name'
                                                    label='Address Line 1'
                                                    name='address_one_map'
                                                    autoComplete="off"
                                                    value={routeDetails.address_one_map}
                                                    className='w-100'
                                                    variant="outlined"
                                                    inputProps={{ maxLength: 50 }}
                                                    helperText={fieldErrors['address_one_map'] ? fieldErrors['address_one_map'] : ''}
                                                    error={fieldErrors['address_one_map'] ? true : false}
                                                    onChange={(e) => this.handleChange(e)}
                                                    required
                                                />
                                            </Grid>
                                            <Grid item md={6} xs={12}>
                                                <TextField
                                                    id='route-name'
                                                    label='Address Line 2'
                                                    name='address_two_map'
                                                    autoComplete="off"
                                                    value={routeDetails.address_two_map}
                                                    className='w-100'
                                                    variant="outlined"
                                                    inputProps={{ maxLength: 50 }}
                                                    helperText={fieldErrors['address_two_map'] ? fieldErrors['address_two_map'] : ''}
                                                    error={fieldErrors['address_two_map'] ? true : false}
                                                    onChange={(e) => this.handleChange(e)}
                                                />
                                            </Grid>

                                            <Grid item md={6} xs={12}>
                                                <TextField
                                                    id='route-name'
                                                    label='City'
                                                    name='city_map'
                                                    autoComplete="off"
                                                    value={routeDetails.city_map}
                                                    className='w-100'
                                                    variant="outlined"
                                                    inputProps={{ maxLength: 50 }}
                                                    helperText={fieldErrors['city_map'] ? fieldErrors['city_map'] : ''}
                                                    error={fieldErrors['city_map'] ? true : false}
                                                    onChange={(e) => this.handleChange(e)}
                                                    disabled
                                                />
                                            </Grid>
                                            <Grid item md={6} xs={12}>
                                                <TextField
                                                    id='route-name'
                                                    label='District'
                                                    name='district_map'
                                                    autoComplete="off"
                                                    value={routeDetails.district_map}
                                                    className='w-100'
                                                    variant="outlined"
                                                    inputProps={{ maxLength: 50 }}
                                                    helperText={fieldErrors['district_map'] ? fieldErrors['district_map'] : ''}
                                                    error={fieldErrors['district_map'] ? true : false}
                                                    onChange={(e) => this.handleChange(e)}
                                                    disabled
                                                />
                                            </Grid>
                                            <Grid item md={6} xs={12}>
                                                <TextField
                                                    id='route-name'
                                                    label='State'
                                                    name='state_map'
                                                    autoComplete="off"
                                                    value={routeDetails.state_map}
                                                    className='w-100'
                                                    variant="outlined"
                                                    inputProps={{ maxLength: 50 }}
                                                    helperText={fieldErrors['state_map'] ? fieldErrors['state_map'] : ''}
                                                    error={fieldErrors['state_map'] ? true : false}
                                                    onChange={(e) => this.handleChange(e)}
                                                    disabled
                                                />
                                            </Grid>
                                            <Grid item md={6} xs={12}>
                                                <TextField
                                                    id='route-name'
                                                    label='Country'
                                                    name='country_map'
                                                    autoComplete="off"
                                                    value={routeDetails.country_map}
                                                    className='w-100'
                                                    variant="outlined"
                                                    inputProps={{ maxLength: 50 }}
                                                    helperText={fieldErrors['country_map'] ? fieldErrors['country_map'] : ''}
                                                    error={fieldErrors['country_map'] ? true : false}
                                                    onChange={(e) => this.handleChange(e)}
                                                    disabled
                                                />
                                            </Grid>
                                            <Grid item md={6} xs={12}>
                                                <TextField
                                                    id='route-name'
                                                    label='Pincode'
                                                    name='pincode_map'
                                                    autoComplete="off"
                                                    value={routeDetails.pincode_map}
                                                    className='w-100'
                                                    variant="outlined"
                                                    inputProps={{ maxLength: 50 }}
                                                    helperText={fieldErrors['pincode_map'] ? fieldErrors['pincode_map'] : ''}
                                                    error={fieldErrors['pincode_map'] ? true : false}
                                                    onChange={(e) => this.handleChange(e)}
                                                    disabled
                                                />
                                            </Grid>
                                        </Grid>
                                    }
                                </Paper>
                            </Grid>
                            <Grid item md={4} xs={12}>
                                <Paper className='paper-plain-background min-height-50vh mt-20'>
                                    <Box className='pv-10'>
                                        <Grid container spacing={1}>
                                            <Grid item md={6} xs={6} className='text-blue'>
                                                <Box>Distance from Institute</Box>
                                            </Grid>
                                        </Grid>
                                        <Grid container spacing={1}>
                                            <Grid item md={4} xs={4}>
                                                {routeDetails?.selected_route &&
                                                    <div className='display-flex '>
                                                        <Box className='text-bold'>{routeDetails?.selected_route?.distance_label}</Box>
                                                        {routeDetails.route_list && routeDetails.route_list.length > 1 &&
                                                            <Tooltip title={'Change route'} enterDelay={400}
                                                                enterNextDelay={400} placement='top-start'
                                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                                <div className='p-l-5 pointer text-blue'>
                                                                    <EditIcon style={{ height: '20px', width: '20px' }} onClick={() => this.handleModifyClick()} />
                                                                </div>
                                                            </Tooltip>
                                                        }
                                                    </div>
                                                }
                                                {routeDetails.route_list && routeDetails.route_list.length > 1 && !routeDetails.selected_route &&
                                                    <Tooltip title={fieldErrors[`select`] ? fieldErrors[`select`] : 'Multiple routes found'} enterDelay={400}
                                                        enterNextDelay={400} placement='top-start'
                                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                                        <div className={fieldErrors[`select`] ? 'text-red display-flex text-bold pointer' : 'display-flex text-bold pointer'}>
                                                            <div className='text-underline' onClick={() => this.handleClick()}>Select</div>
                                                            <InfoIcon />
                                                        </div>
                                                    </Tooltip>
                                                }
                                            </Grid>
                                        </Grid>
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>
                    }
                    <Box className="submt-button-float-bottom">
                        <Button variant='contained'
                            color='primary' className='submit'
                            disabled={submitDisable}
                            onClick={this.submit}>submit
                        </Button>
                    </Box>
                    <Snackbar
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        open={snackbar}
                        autoHideDuration={4000}
                        onClose={this.handleClose}
                    >
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                    {googleMapLocator &&
                        <Dialog open={true}
                            className={'dialog-custom-application-form'}
                            // onClose={this.handleCloseDialog} 
                            aria-labelledby='form-dialog-title'>
                            <AppBar style={{ width: '1000px', right: 'auto' }}>
                                <Toolbar>
                                    <IconButton edge="start" color="inherit" onClick={this.handleDialogOpen} aria-label="close">
                                        <CloseIcon />
                                    </IconButton>
                                    <Typography variant="h6">
                                        Locate the address
                                    </Typography>
                                </Toolbar>
                            </AppBar>
                            <DialogTitle id='form-dialog-title'></DialogTitle>
                            <DialogContent>
                                <Grid container className='mt-20 mb-20'>
                                    <Grid item md={1} xs={1} className='align-self-center'>
                                        <div onClick={() => this.getCurrentLocation()} className='text-align-center'>
                                            <Tooltip title={'Get Current Location'} enterDelay={400}
                                                enterNextDelay={400} placement='top-start'
                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                <MyLocationIcon style={{ fontSize: '40px', color: 'blue', cursor: 'pointer' }} />
                                            </Tooltip>
                                        </div>
                                    </Grid>
                                    <Grid item md={6} xs={10}>
                                        <AddPlaceNameWithMap
                                            textClassName='width-95-perc'
                                            placeholder={'Search Near Place'}
                                            handleUpdateDetails={this.handleLocateUpdateDetails}
                                            fieldError={fieldErrors ? fieldErrors['address_map'] : ''}
                                            defaultValue={addressInformations['address_map']}
                                        />
                                    </Grid>
                                    <Grid item md={4} xs={12}>
                                        <Button variant='contained'
                                            color='primary' className='submit'
                                            onClick={this.selectAddress}>
                                            Select the address
                                        </Button>
                                    </Grid>
                                </Grid>
                                <RouterAreaGoogleAdd ref={this.googleMapRef}
                                />
                            </DialogContent>
                        </Dialog>
                    }
                    {
                        showMultipleRouteDialog && location_details.institude &&
                        <Dialog open={true}
                            className={'dialog-custom-application-form'}
                            // onClose={this.handleCloseDialog} 
                            aria-labelledby='form-dialog-title'>
                            <AppBar style={{ width: '1000px', right: 'auto' }}>
                                <Toolbar>
                                    <IconButton edge="start" color="inherit" onClick={this.handleCloseDialog} aria-label="close">
                                        <CloseIcon />
                                    </IconButton>
                                    <Typography variant="h6">
                                        {`Select the best area route from institute`}
                                    </Typography>
                                </Toolbar>
                            </AppBar>
                            <DialogTitle id='form-dialog-title'></DialogTitle>
                            <DialogContent>
                                <Grid container spacing={4}>
                                    <FormControl className='width-100-perc'>
                                        <RadioGroup value={selected_route_area} onChange={this.handleChangeRouteArea} name='selected_route_area' row>
                                            {routeDetails.route_list.map((data) => {
                                                return <Grid item md={4} xs={12}>
                                                    <Paper className={selected_route_area !== '' && routeDetails.route_list[selected_route_area].name == data.name ? 'selected-route-area-paper' : ''}>
                                                        <ShowMultipleRouteLoader
                                                            route_details={data}
                                                            googleMapURL={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=drawing`}
                                                            loadingElement={<div style={{ height: `100%` }} />}
                                                            location_details={location_details}
                                                        />
                                                        <FormControlLabel
                                                            className='width-100-perc place-content-center'
                                                            value={data.name}
                                                            control={<Radio color="primary" />}
                                                            label={''}
                                                            labelPlacement="center"
                                                        />
                                                    </Paper>
                                                </Grid>
                                            })
                                            }
                                        </RadioGroup>
                                    </FormControl>
                                </Grid>
                            </DialogContent>
                            <DialogActions>
                                <Button variant='contained'
                                    color='primary' className='submit'
                                    onClick={this.handleSelectRouteArea}>Select
                                </Button>
                            </DialogActions>
                        </Dialog>
                    }

                    {snackbar &&
                        <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={Snackbar} autoHideDuration={2000} onClose={this.handleClose}>
                            <Alert onClose={this.handleClose} severity='error'>
                                {alertData}
                            </Alert>
                        </Snackbar>
                    }
                </Paper>
            );
        }
    }
}

export default withRouter(AddStudentLocationRegistration);