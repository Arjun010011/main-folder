import React from 'react';
import { withRouter, Link } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Actions } from 'Constants/permissions';
import MultipleAddTextFields from 'Components/MultipleAddTextFields'
import EditIcon from '@material-ui/icons/Edit';
import _ from 'lodash';
import {
    TextField, Typography, IconButton, Toolbar, AppBar, Dialog, DialogContent, DialogTitle,
    Tooltip, Grid, Box, Paper, Button, Radio, RadioGroup, FormControlLabel, FormControl, DialogActions
} from "@material-ui/core";
import AddPlaceNameWithMap from 'Containers/Transport/AddPlaceNameWithMap';
import { CheckBoxOutlineBlank, CheckBox } from '@material-ui/icons';
import CloseIcon from '@material-ui/icons/Close';
import RouterAreaGoogleAdd from './RouterAreaGoogleAdd';
import LoadingGif from 'Components/LoadingGif';
import { getUrlParam, isObjectValuesEmpty } from 'Includes/functions';
import Snackbar from '@material-ui/core/Snackbar';
import { Alert } from 'Includes/functions';
import { withScriptjs } from "react-google-maps";

import { postRequest, getRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, PUT_URL } from 'Includes/urls';
import Swal from 'sweetalert2';
import MultipleSelectDropdown from 'Components/MultipleSelectDropdown';

import { nameAndNumberRegex, pinCodeRegex, numberZeroToHunRegex } from 'Constants/regularExpression'
import { getSettingValue, getKeyValueMap } from 'Includes/functions'
import { getFormattedAddress } from 'Includes/functions';
import { GOOGLE_API_KEY } from 'Includes/api/constant';
import ShowMultipleRoute from './Components/ShowMultipleRoute';
import InfoIcon from "@material-ui/icons/Info";
import { cloneDeep } from 'lodash';

const isGoogleMap = true;
const isPriceOnArea = getSettingValue('price_on_area') === '0' ? false : true;

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

const google = window.google;
let directionsService;

const ShowMultipleRouteLoader = withScriptjs(ShowMultipleRoute);


const fieldDetails = [
    {
        label: 'Area Name', regex: nameAndNumberRegex, name: 'name', md: 6, className: 'width-90', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 100, gridClassName: 'margin-top-20',
        allowDuplicates: true
    },
    {
        label: 'Address', regex: null, name: 'address', md: 6, className: 'width-90', required: true, hide: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 100, gridClassName: 'margin-top-20'
    },
    {
        label: 'Landmark', regex: nameAndNumberRegex, name: 'landmark', md: 6, className: 'width-90', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 100, gridClassName: 'margin-top-20'
    },
    {
        label: 'KM', regex: numberZeroToHunRegex, name: 'km', md: 6, className: 'width-90', required: isPriceOnArea === 0 ? true : false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 3, gridClassName: 'margin-top-20',
        allowDuplicates: true
    },
    {
        label: 'Pin code', regex: pinCodeRegex, name: 'pincode', md: 6, className: 'width-90', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 6, gridClassName: 'margin-top-20',
        allowDuplicates: true
    },
]


class AddRouteArea extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            fieldErrors: {},
            loading: true,
            submitDisable: false,
            areaDetails: [],
            viewUrl: Actions.transport_place_name.view.url,
            viewText: Actions.transport_place_name.view.label,
            label: Actions.transport_place_name.create.label,
            statefieldDetails: [],
            snackbar: false,
            alertData: '',
            routeDetails: {
                address_one_map: '', address_two_map: '', city_map: '', district_map: '', state_map: '', country_map: '', pincode_map: '',
                area_name: '', land_mark: ''
            },
            addressInformations: {},
            lat_lng: null,
            addressList: [],
            selected_list: [],
            showMultipleRouteDialog: false,
            selected_institute: '',
            selected_route_area: '',
            location_details: {},
            enableToEdit: {},
            errorData: ''
        }
        this.googleMapRef = React.createRef()
    }

    componentDidMount() {
        if (this.props.location.pathname === Actions.transport_place_name.update.url) {
            if (this.props.location.state && this.props.location.state.detail) {
                this.getAreaDetails(this.props.location.state.detail);
            }
            else {
                this.props.history.push(Actions.transport_place_name.view.url);
            }
        }
        else {
            const { selectedAddress } = getUrlParam()
            this.getSchoolAddressList()
            this.setDefaults();
            this.setState({
                isEditForm: false,
                loading: false,
                selectedAddress
            })
        }
        directionsService = new google.maps.DirectionsService();
    }

    getSchoolAddressList = () => {
        let { selected_list } = this.state;
        const url = GET_URL.instituteaddress.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.map((data) => {
                    data['name'] = data.map_address_data.address_one_map
                    data['distance'] = 0
                })
                if (response.data.data.length === 1) {
                    selected_list = response.data.data
                }
                this.setState({
                    addressList: response.data.data,
                    selected_list
                })
            }
        })
    }

    setDefaults = () => {
        let { statefieldDetails } = this.state
        statefieldDetails = _.cloneDeep(fieldDetails);
        this.setState({
            statefieldDetails
        })
    }

    getAreaDetails = (id) => {
        const params = { is_active: 1 };
        let { routeDetails, selected_list, addressList } = this.state
        let url = GET_URL.area.api + id + '/'
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let area_details = response.data.data;
                routeDetails['address_one_map'] = area_details.address_one
                routeDetails['address_two_map'] = area_details.address_two
                routeDetails['country_map'] = area_details.country
                routeDetails['state_map'] = area_details.state
                routeDetails['district_map'] = area_details.district
                routeDetails['city_map'] = area_details.city
                routeDetails['pincode_map'] = area_details.pincode
                routeDetails['area_name'] = area_details.name
                routeDetails['land_mark'] = area_details.landmark
                routeDetails['latitude_and_langitude_map'] = { lat: parseFloat(area_details.latitude), lng: parseFloat(area_details.longitude) }
                routeDetails['id'] = area_details.id
                area_details.institute_address_data['name'] = area_details.institute_address_data.map_address_data.address_one_map
                area_details.institute_address_data['distance'] = area_details.km
                selected_list.push(area_details.institute_address_data)
                addressList.push(area_details.institute_address_data)
                this.setState({ selected_list, selectedAddress: area_details.institute_address_data.id, addressList, routeDetails, loading: false, id: id, isEditForm: true, }, () => {
                    this.updateDistance()
                })
            }
        });
    }

    saveData = () => {
        let { areaDetails } = this.state;
        let { fieldErrors, viewUrl } = this.state
        this.setState({ submitDisable: true })
        let responseResult = this.refs.validateErrors.validateFields();
        if (isObjectValuesEmpty(fieldErrors) && Boolean(areaDetails)) {
            areaDetails.map((data, index) => {
                if (data['pincode'] === '') {
                    areaDetails[index]['pincode'] = 0;
                }
                if (data['km'] === '') {
                    areaDetails[index]['km'] = null;
                }
            })
            if (areaDetails.length > 0) {
                if (this.state.isEditForm) {
                    let payload = areaDetails[0];
                    const url = PUT_URL.area.api + '' + this.state.id + '/';
                    putRequest(url, payload, this.props).then((response) => {
                        if (response && response.status === 200) {
                            Swal.fire({
                                position: 'top-end',
                                type: 'success',
                                title: response.data.Reason,
                                showConfirmButton: false,
                                timer: 1500
                            })
                            this.props.history.push(Actions.transport_place_name.view.url);
                        }
                        else {
                            this.setState({ submitDisable: false });
                        }
                    });

                } else {
                    let payload = {
                        'areas': areaDetails
                    }
                    const url = POST_URL.area.api;
                    postRequest(url, payload).then(response => {
                        if (response && response.status === 200) {
                            Swal.fire({
                                position: 'top-end',
                                type: 'success',
                                title: response.data.Reason,
                                showConfirmButton: false,
                                timer: 1500
                            }).then(
                                this.props.history.push(viewUrl)
                            )
                        }
                    });
                    this.setState({ submitDisable: false });
                }
            } else {
                this.setState({
                    snackbar: true,
                    submitDisable: false,
                    alertData: 'Fields cant be empty.'
                })
                return false;
            }

        } else {
            this.setState({ submitDisable: false });
            this.refs.validateErrors.validateFields(fieldErrors)
        }
    }

    saveDataGoogleApi = () => {
        let validate_test_payload = this.validation()
        if (validate_test_payload) {
            this.setState({ submitDisable: true })
            const url = POST_URL.area.api;
            postRequest(url, validate_test_payload).then(response => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    }).then(
                        this.viewRouteArea()
                    )
                }
            });
            this.setState({ submitDisable: false });
        }
    }

    validation = () => {
        let { routeDetails, fieldErrors, selected_list, isEditForm, id } = this.state;
        let return_data = true
        if (!routeDetails.pincode_map) {
            fieldErrors['select_address'] = 'Select address'
            return_data = false
        }
        if (!routeDetails.area_name) {
            fieldErrors['area_name'] = 'This field is mandatory'
            return_data = false
        }
        if (selected_list.length === 0) {
            fieldErrors['selected_list'] = `Select ${alias_names['school']} location`
            return_data = false
        }

        let areas = []
        let temp_area = {}
        selected_list.map((data, index) => {
            if (!data.selected_route) {
                fieldErrors[`${index}_select`] = 'Select best route'
                return_data = false
            }
            else {
                temp_area = {}
                temp_area['address_one'] = routeDetails.address_one_map
                temp_area['address_two'] = routeDetails.address_two_map
                temp_area['city'] = routeDetails.city_map
                temp_area['district'] = routeDetails.district_map
                temp_area['state'] = routeDetails.state_map
                temp_area['country'] = routeDetails.country_map
                temp_area['pincode'] = routeDetails.pincode_map
                temp_area['latitude'] = routeDetails.latitude_and_langitude_map.lat
                temp_area['longitude'] = routeDetails.latitude_and_langitude_map.lng
                temp_area['name'] = routeDetails.area_name
                temp_area['landmark'] = routeDetails.land_mark
                temp_area['km'] = data.selected_route.distance
                temp_area['institute_address'] = data.id
                if (isEditForm) {
                    temp_area['id'] = routeDetails.id
                }
                areas.push(temp_area)
            }
        })
        this.setState({
            fieldErrors
        })
        if (return_data) {
            return_data = {
                area_datas: areas
            }
        }
        return return_data
    }

    updateParent = (areaData) => {
        let { areaDetails } = this.state
        areaDetails = areaData;
        this.setState({
            areaDetails
        })
    }

    handleClose = () => {
        this.setState({
            snackbar: false
        })
    }

    handleDialogOpen = () => {
        this.setState({
            googleMapLocator: !this.state.googleMapLocator,
            errorData: ''
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

    selectAddress = async () => {
        const { addressInformations, fieldErrors, routeDetails } = this.state;
        let { location } = this.googleMapRef.current.getLatAndLngDetails()
        await fetch(
            'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + location['lat'] + ',' + location['lng'] + '&sensor=true&key=' + GOOGLE_API_KEY,
        )
            .then((response) => response.json())
            .then(async (responseJson) => {
                let formatted_address = await getFormattedAddress(responseJson.results[0])
                let address_temp = formatted_address
                address_temp['address_one_map'] = formatted_address?.address_one_map ?? addressInformations?.address_one_map ?? ''
                address_temp['address_two_map'] = formatted_address?.address_two_map ?? addressInformations?.address_two_map ?? ''
                address_temp['area_name'] = routeDetails?.area_name ?? ''
                address_temp['land_mark'] = routeDetails?.land_mark ?? ''
                let enableToEdit = { city_map: '', district_map: '', state_map: '', country_map: '', pincode_map: '' }
                Object.keys(enableToEdit).map((data) => {
                    if (!address_temp[data]) {
                        enableToEdit[data] = true
                        address_temp[data] = ''
                    }
                })
                this.setState({
                    routeDetails: address_temp,
                    googleMapLocator: formatted_address.pincode_map ? false : true,
                    errorData: formatted_address.pincode_map ? '' : 'Select valid address',
                    fieldErrors,
                    enableToEdit
                }, () => {
                    this.updateDistance()
                })
            });
    }

    onChange = (e) => {
        let { name, value } = e.target;
        let { addressList } = this.state;
        let address_data = getKeyValueMap(addressList, 'id', 'map_address_data')
        address_data = address_data[value]
        let lat_lng = { lat: parseFloat(address_data.latitude_map), lng: parseFloat(address_data.longitude_map) }
        this.setState({ [name]: value, lat_lng }, () => {
            this.getareaData()
        })
    }

    updateDistance = () => {
        const { selected_list, routeDetails } = this.state;
        let lat_lng = {}
        if (routeDetails.latitude_and_langitude_map?.lat && routeDetails.latitude_and_langitude_map?.lng) {
            selected_list.map((data, index) => {
                lat_lng = { lat: parseFloat(data.map_address_data.latitude_map), lng: parseFloat(data.map_address_data.longitude_map) }
                this.getDirection(routeDetails.latitude_and_langitude_map, lat_lng, index)
            })
        }
        this.setState({
            selected_list
        })
    }

    getDirection = (origin, destination, index) => {
        let { selected_list, isEditForm } = this.state;
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
                    result.routes.forEach(function (rou, rIndex) {
                        new_result = cloneDeep(result)
                        route_temp = {}
                        route_temp['name'] = rIndex
                        route_temp['distance'] = parseFloat((rou.legs[0].distance.value / 1000).toFixed(1))
                        route_temp['distance_label'] = rou.legs[0].distance.text
                        route_temp['duration'] = rou.legs[0].duration.value
                        route_temp['duration_label'] = rou.legs[0].duration.text
                        new_result['routes'] = [copy_result.routes[rIndex]]
                        route_temp['result'] = new_result
                        if (isEditForm && selected_list[0]['distance'] === route_temp['distance']) {
                            selected_list[0]['selected_route'] = route_temp
                        }
                        routes_list.push(route_temp)
                    })
                    selected_list[index]['route_list'] = routes_list
                    if (routes_list.length === 1) {
                        selected_list[index]['selected_route'] = routes_list[0]
                    }
                    this.setState({
                        selected_list
                    })
                } else {
                    console.error(`error fetching directions ${result}`);
                }
            }
        );

    };


    onChangeAddress = (value) => {
        this.setState({
            selected_list: value
        }, () => {
            this.updateDistance()
        })
    }

    handleChange = (e) => {
        const { name, value } = e.target;
        let { fieldErrors, routeDetails } = this.state;
        delete fieldErrors[name]
        routeDetails[name] = value
        this.setState({
            routeDetails,
            fieldErrors
        })
    }

    viewRouteArea = () => {
        const { selectedAddress } = this.state;
        let formInformation = {
            selectedAddress: selectedAddress,
        }
        let searchParam = "?" + new URLSearchParams(formInformation).toString()
        this.props.history.push({
            pathname: Actions.transport_place_name.view.url,
            search: searchParam,
        });
    }

    handleClick = (index) => {
        let { selected_list, routeDetails } = this.state;
        let location_details = { institude: {}, area: {} }
        location_details['institute'] = { lat: parseFloat(selected_list[index]['map_address_data']['latitude_map']), lng: parseFloat(selected_list[index]['map_address_data']['longitude_map']) }
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
            selected_institute: '',
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
        let { selected_route_area, selected_list, selected_institute, fieldErrors } = this.state;
        if (selected_route_area !== '') {
            let new_list = cloneDeep(selected_list)
            new_list[selected_institute]['selected_route'] = new_list[selected_institute]['route_list'][selected_route_area]
            delete fieldErrors[`${selected_institute}_select`]
            this.setState({
                selected_list: [...new_list],
                showMultipleRouteDialog: false,
                selected_institute: '',
                selected_route_area: '',
                fieldErrors,
                location_details: {}
            })
        }
    }

    handleModifyClick = (index) => {
        let { selected_list, selected_route_area, routeDetails } = this.state;
        selected_route_area = selected_list[index]['selected_route']['name']
        let location_details = { institude: {}, area: {} }
        location_details['institute'] = { lat: parseFloat(selected_list[index]['map_address_data']['latitude_map']), lng: parseFloat(selected_list[index]['map_address_data']['longitude_map']) }
        location_details['area'] = { lat: routeDetails.latitude_and_langitude_map.lat, lng: routeDetails.latitude_and_langitude_map.lng }
        this.setState({
            showMultipleRouteDialog: true,
            selected_institute: index,
            selected_route_area,
            location_details
        })
    }

    render() {
        let { loading, showMultipleRouteDialog, viewText, label, isEditForm, addressList, googleMapLocator, fieldError, addressInformations,
            submitDisable, statefieldDetails, alertData, snackbar, fieldErrors, routeDetails, selected_list,
            selected_institute, location_details, selected_route_area, enableToEdit, errorData } = this.state;
        if (loading) {
            return <Box> <LoadingGif /> </Box>
        } else {
            return (
                <Paper className='paper-background'>
                    <Grid container>
                        <Grid item md={6} xs={12} className='header-align'>
                            <Box className='heading'>
                                {label}
                            </Box>
                            <Box className='sub-heading'>
                                {'Register area stop for student/staff mapping'}
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12} >
                            <Box className='header-align end-flex-prop'>
                                <Button
                                    variant='contained'
                                    // component={Link} to={viewUrl}
                                    onClick={this.viewRouteArea}
                                    className='editbutton-view'
                                ><VisibilityOutlinedIcon className='visibility-icon' /> {viewText}</Button>
                            </Box>
                        </Grid>
                    </Grid>
                    {!isGoogleMap ?
                        <Grid container>
                            <Grid item md={8} xs={12}>
                                <MultipleAddTextFields
                                    fieldDefaultValue={[]}
                                    fieldDetails={statefieldDetails}
                                    updateParent={this.updateParent}
                                    ref={'validateErrors'}
                                    hideAddAnother={isEditForm}
                                    idFormat={'route_area_add_2022_08_11_3_pm_'}
                                />
                            </Grid>
                        </Grid>
                        :
                        <Grid container spacing={3}>
                            <Grid item md={8} xs={12}>
                                <Paper className='paper-plain-background min-height-50vh'>
                                    <Grid container spacing={3} className='mt-20'>
                                        <Grid item md={6} xs={12}>
                                            <TextField
                                                id='route-name'
                                                label='Area Name'
                                                name='area_name'
                                                autoComplete="off"
                                                value={routeDetails.area_name}
                                                className='w-100'
                                                variant="outlined"
                                                inputProps={{ maxLength: 50 }}
                                                helperText={fieldErrors['area_name'] ? fieldErrors['area_name'] : ''}
                                                error={fieldErrors['area_name'] ? true : false}
                                                onChange={(e) => this.handleChange(e)}
                                                required
                                            />
                                        </Grid>
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
                                    </Grid>
                                    <Box className='text-blue text-underline mt-20 cursor-pointer' onClick={this.handleDialogOpen}>
                                        Click here to select address
                                    </Box>
                                    <Box className='mt-10 text-red'>
                                        {fieldErrors['select_address']}
                                    </Box>
                                    {routeDetails.pincode_map &&
                                        <Grid container spacing={3} className='mt-20'>
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
                                                    disabled={!enableToEdit['city_map']}
                                                    value={routeDetails.city_map}
                                                    className='w-100'
                                                    variant="outlined"
                                                    inputProps={{ maxLength: 50 }}
                                                    helperText={fieldErrors['city_map'] ? fieldErrors['city_map'] : ''}
                                                    error={fieldErrors['city_map'] ? true : false}
                                                    onChange={(e) => this.handleChange(e)}
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
                                                    disabled={!enableToEdit['district_map']}
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
                                                    disabled={!enableToEdit['state_map']}
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
                                                    disabled={!enableToEdit['country_map']}
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
                                                    disabled={!enableToEdit['pincode_map']}
                                                />
                                            </Grid>
                                        </Grid>
                                    }
                                </Paper>
                            </Grid>
                            <Grid item md={4} xs={12}>
                                <Paper className='paper-plain-background min-height-50vh mt-20'>
                                    {addressList.length > 1 &&
                                        <div className='pt-10'>
                                            <MultipleSelectDropdown
                                                data_list={addressList}
                                                selected_list={selected_list}
                                                error={fieldErrors['selected_list'] && fieldErrors['selected_list']}
                                                label="Address List"
                                                onChange={this.onChangeAddress}
                                            />
                                        </div>
                                    }
                                    <Box className='pv-10'>
                                        <Grid container spacing={1}>
                                            <Grid item md={6} xs={6} className='text-blue'>
                                                <Box>{`${alias_names['school']} Address`}</Box>
                                            </Grid>
                                            <Grid item md={6} xs={6} className='text-blue'>
                                                <Box>{`Distance from ${alias_names['school']}`}</Box>
                                            </Grid>
                                        </Grid>
                                        {selected_list.map((data, index) => {
                                            return <Grid container spacing={1}>
                                                <Grid item md={8} xs={8}>
                                                    <Box>{`${index + 1}. ${data.name}`}</Box>
                                                </Grid>
                                                <Grid item md={4} xs={4}>
                                                    {data?.selected_route &&
                                                        <div className='display-flex '>
                                                            <Box className='text-bold'>{data?.selected_route?.distance_label}</Box>
                                                            {data.route_list && data.route_list.length > 1 &&
                                                                <Tooltip title={'Change route'} enterDelay={400}
                                                                    enterNextDelay={400} placement='top-start'
                                                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                                                    <div className='p-l-5 pointer text-blue'>
                                                                        <EditIcon style={{ height: '20px', width: '20px' }} onClick={() => this.handleModifyClick(index)} />
                                                                    </div>
                                                                </Tooltip>
                                                            }
                                                        </div>
                                                    }
                                                    {data.route_list && data.route_list.length > 1 && !data.selected_route &&
                                                        <Tooltip title={fieldErrors[`${index}_select`] ? fieldErrors[`${index}_select`] : 'Multiple routes found'} enterDelay={400}
                                                            enterNextDelay={400} placement='top-start'
                                                            classes={{ tooltip: 'tooltip-show-data' }}>
                                                            <div className={fieldErrors[`${index}_select`] ? 'text-red display-flex text-bold pointer' : 'display-flex text-bold pointer'}>
                                                                <div className='text-underline' onClick={() => this.handleClick(index)}>Select</div>
                                                                <InfoIcon />
                                                            </div>
                                                        </Tooltip>
                                                    }
                                                </Grid>
                                            </Grid>
                                        })}
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>
                    }
                    <Box className="submt-button-float-bottom">
                        <Button variant='contained'
                            color='primary' className='submit'
                            disabled={submitDisable}
                            onClick={this.saveDataGoogleApi}>submit
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
                    {
                        googleMapLocator &&
                        <Dialog open={true}
                            className={'dialog-custom-application-form'}
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
                                    <Grid item md={6} xs={10}>
                                        <AddPlaceNameWithMap
                                            textClassName='width-95-perc'
                                            placeholder={'Search Near Place'}
                                            handleUpdateDetails={this.handleLocateUpdateDetails}
                                            fieldError={fieldError ? fieldError['address_map'] : ''}
                                            defaultValue={addressInformations['address_map']}
                                        />
                                        <div className='text-red pt-10'>{errorData}</div>
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
                        showMultipleRouteDialog && selected_institute !== '' &&
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
                                        {`Select the best area route from institute ${selected_list[selected_institute].name}`}
                                    </Typography>
                                </Toolbar>
                            </AppBar>
                            <DialogTitle id='form-dialog-title'></DialogTitle>
                            <DialogContent>
                                <Grid container spacing={4}>
                                    <FormControl className='width-100-perc'>
                                        <RadioGroup value={selected_route_area} onChange={this.handleChangeRouteArea} name='selected_route_area' row>
                                            {selected_list[selected_institute].route_list.map((data) => {
                                                return <Grid item md={4} xs={12}>
                                                    <Paper className={selected_route_area !== '' && selected_list[selected_institute].route_list[selected_route_area].name == data.name ? 'selected-route-area-paper' : ''}>
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
                </Paper >
            )
        }
    }
}



export default withRouter(AddRouteArea);
