import React, { Component } from "react";
import {
    withGoogleMap,
    GoogleMap,
    Marker,
    Polyline,
    InfoWindow,
    DirectionsRenderer,
    MarkerClusterer
} from "react-google-maps";
import _ from 'lodash';
import Checkbox from '@material-ui/core/Checkbox';
import ApartmentIcon from '@material-ui/icons/Apartment';
import { DrawingManager } from "react-google-maps/lib/components/drawing/DrawingManager";
import { getTimeFormatFromSeconds, getFullName } from 'Includes/functions';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import InfoIcon from '@material-ui/icons/Info';
import {
    Grid, AppBar, Dialog, DialogContent, DialogTitle, TextField,
    Toolbar, IconButton, Typography, Button, Tooltip, FormControl,
    Select, MenuItem, FormHelperText
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import Slider from '@material-ui/core/Slider';
import { Dropdown } from 'Components/DropDown';
import { GOOGLE_API_KEY } from 'Includes/api/constant';
import Swal from 'sweetalert2';
import { cloneDeep } from 'lodash';
import { GET_URL } from 'Includes/urls';
import { getRequest } from 'Includes/api/apicall';
import LoadingGif from 'Components/LoadingGif';

const iconUrls = {
    default: "https://maps.google.com/mapfiles/kml/paddle/grn-circle.png",
    selected: "https://maps.google.com/mapfiles/kml/paddle/red-circle.png",
    // school: "http://maps.google.com/mapfiles/kml/shapes/schools.png",
    school: "http://maps.google.com/mapfiles/kml/pal2/icon2.png",
};
const google = window.google;
let directionsService;

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

var rad = function (x) {
    return x * Math.PI / 180;
};

var getDistance = function (p1, p2) {
    var R = 6378137; // Earth’s mean radius in meter
    var dLat = rad(p2.lat - p1.lat);
    var dLong = rad(p2.lng - p1.lng);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(rad(p1.lat)) * Math.cos(rad(p2.lat)) *
        Math.sin(dLong / 2) * Math.sin(dLong / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d; // returns the distance in meter
};

function dynamicSort(property) {
    return function (a, b) {
        return (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
    }
}

class GoogleMapDrawLine extends Component {
    constructor(props) {
        super(props);

        this.state = {
            drawingControlEnabled: false,
            marker: null,
            polyline: null,
            circleRadius: null,
            circleCenter: null,
            rectangle: null,
            polygon: null,
            visible: true,
            lat_lng: this.props.lat_lng,
            marker_list: [],
            directions: null,
            showInfoWindow: false,
            showError: '',
            searchStudent: '',
            isDialogOpen: false,
            isDialogOpenNoMap: false, 
            showingInfoWindow: false,
            activeMarker: {},
            selectedPlace: {},
            marker_type: 'area',
            fieldErrors: {},
            marker_type_list: [{ id: 'area', name: 'Area' }, { id: 'student', name: 'Student' }],
            loading: true,
            institute_address: this.props.institute_address,
            directionList: [],
            isOptimize: true,
            selected_items: [],
            institute_to_first_drop: '',
            institute_address_detail: ''
        };
        this.previosOverlay = null
        this.handleOverlayComplete = this.handleOverlayComplete.bind(this)
    }


    handleCreateRoutePlan = () => {
        // if (this.state.polyline && this.state.directionList.length > 0) {
        this.handleOptimizeRoute()
        // }
        // else {
        //     const { route_type } = this.state;
        //     const route = route_type === 'Drop' ? 'drop' : 'pickup'
        //     this.setState({
        //         showError: `Select ${route} locations to show route plan`,
        //         directions: null,
        //         polyline: null
        //     })
        //     this.handleReset()
        // }
    }

    handleMouseOver = e => {
        this.setState({
            showInfoWindow: true
        });
    };
    handleMouseExit = e => {
        this.setState({
            showInfoWindow: false
        });
    };

    //function that is calling the directions service
    getDirection = (origin, destination, waypoints, name) => {
        const { isOptimize } = this.state;
        //this will check if there is a waypoint meaning the array  has 3 or more coordinates

        // if(waypoints.length > 8){
        //     var temp = [];
        //     temp.push(waypoints[0]); //Start Point
        //     temp.push(waypoints[7]); //Last point
        //     temp.push(point); //New point
        //     waypoints = temp; //Replace the old object with this new one
        // }

        waypoints.length >= 1
            ? directionsService.route(
                {
                    origin: origin,
                    destination: destination,
                    travelMode: google.maps.TravelMode.DRIVING,
                    optimizeWaypoints: isOptimize,
                    waypoints: waypoints,
                },
                (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK) {
                        this.updateStudents(result, name)
                        this.setState({
                            directions: result
                        });
                    } else {
                        console.error(`error fetching directions ${result}`);
                    }
                }
            )
            :
            directionsService.route(
                {
                    origin: origin,
                    destination: destination,
                    travelMode: google.maps.TravelMode.DRIVING,
                    optimizeWaypoints: true,
                    provideRouteAlternatives: true,
                },
                (result, status) => {
                    if (status === google.maps.DirectionsStatus.OK) {
                        this.updateStudents(result, name)
                        this.setState({
                            directions: result
                        });
                    } else {
                        console.error(`error fetching directions ${result}`);
                    }
                }
            );
    };


    updateStudents = (result, name) => {
        const { marker_list, marker_type } = this.state;
        const { route_type } = this.props;
        let marker_list_temp = cloneDeep(marker_list)
        let student_location = []
        let routeDetails = { total_distance: 0, total_stops: 0, average_time: 0 }
        result.routes[0].legs.map((data) => {
            routeDetails['total_distance'] = routeDetails['total_distance'] + data['distance']['value']
            routeDetails['average_time'] = routeDetails['average_time'] + data['duration']['value']
        })
        let temp_way = {}
        if (result.request.waypoints) {
            result.request.waypoints.map((data, index) => {
                temp_way = {}
                temp_way['lat'] = result.request.waypoints[result.routes[0].waypoint_order[index]]['location'].location.lat()
                temp_way['lng'] = result.request.waypoints[result.routes[0].waypoint_order[index]]['location'].location.lng()
                temp_way['distance'] = result.routes[0].legs[index + 1]['distance']['value']
                student_location.push(temp_way)
            })
        }
        let temp = { lat: result.request.destination.location.lat(), lng: result.request.destination.location.lng() }
        student_location.push(temp)
        if (route_type === 'Drop') {
            this.setState({
                institute_to_first_drop: result.routes[0].legs[0]['distance']['text'],
                institute_address_detail: result.routes[0].legs[0]['start_address']
            })
        }
        let selected_names = []
        let un_selected_names = []
        student_location.map((student, index) => {
            marker_list_temp.map((data) => {
                if ((student['lat'] == data['location']['lat']) && (student['lng'] == data['location']['lng'])) {
                    data['order'] = index + 1
                    data['distance_km'] = student['distance'] ? parseFloat((student['distance'] / 1000).toFixed(1)) : 'Last stop'
                    if (!selected_names.includes(data)) {
                        selected_names.push(data)
                    }
                }
                else {
                    if (!data.selected && !un_selected_names.includes(data)) {
                        un_selected_names.push(data)
                    }
                }
            })
        })
        routeDetails['total_stops'] = route_type === 'Pickup' ? result.routes[0].legs.length - 1 : result.routes[0].legs.length
        routeDetails['average_time'] = getTimeFormatFromSeconds(routeDetails['average_time'])
        routeDetails['total_distance'] = (routeDetails['total_distance'] / 1000).toFixed(1)
        selected_names.sort(dynamicSort('order'));
        let marker_list_tem = [...selected_names, ...un_selected_names]
        this.setState({ routeDetails, all_marker_list: [...marker_list_tem], marker_list: [...marker_list_tem], loading: false }, () => {
            if (name === 'callAreaOrStudent') {
                if (marker_type === 'area') {
                    this.getAreaList()
                }
                else {
                    this.getStudentList()
                }
            }
        })
    }

    handleOverlayComplete(e, list) {
        if (this.previosOverlay) {
            this.previosOverlay.setMap(null);
        }
        const polygon = e.overlay;
        let directionList = []
        let temp_list = cloneDeep(list)
        temp_list.forEach(place => {
            const latLng = new google.maps.LatLng(place.location.lat, place.location.lng);
            const containsPlace = google.maps.geometry.poly.containsLocation(
                latLng,
                polygon
            );
            place.selected = containsPlace
            place.iconUrl = containsPlace ? iconUrls.selected : iconUrls.default;
            if (containsPlace) {
                directionList.push(place)
            }
        });
        this.setState({
            // marker_list: [...temp_list], all_marker_list: [...temp_list],
            polyline: e.overlay.getPath(), directionList, showError: '', drawingControlEnabled: false
        });
        this.previosOverlay = e.overlay
    }

    handleReset = () => {
        // let { marker_list } = this.state;
        // marker_list.map((data) => {
        //     data['distance_km'] = ''
        //     data['order'] = ''
        //     data['selected'] = false
        // })
        this.setState({
            polyline: null,
            directions: null,
            directionList: [],
            drawingControlEnabled: true,
            marker_list: []
        })
        let routeDetails = {}
        routeDetails['total_stops'] = 0
        routeDetails['average_time'] = 0
        routeDetails['total_distance'] = 0
        this.setState({ routeDetails })
    }

    handleDelete = (index) => {
        let { marker_list, directionList } = this.state;
        marker_list[index]['selected'] = false
        marker_list[index]['distance_km'] = ''
        delete marker_list[index]['order']
        let selectedId = marker_list[index]['id']
        let delete_index = directionList.findIndex(data => data['id'] === selectedId);
        directionList.splice(delete_index, 1)
        this.setState({ marker_list, all_marker_list: [...marker_list], directionList }, () => {
            if (directionList.length > 0) {
                this.handleCreateRoutePlan()
            }
            else {
                this.setState({
                    polyline: null,
                    directions: null,
                    drawingControlEnabled: true
                })
            }
        })
    }

    handleFilter = (e) => {
        let { name, value, filterList } = e.target;
        let { all_marker_list, marker_list } = this.state;
        if (value !== '') {
            let lowerCasedFilter = value.toLowerCase().replace(/\s+/g, "");
            filterList = all_marker_list.filter(item => {
                return Object.keys(item).some(key =>
                    typeof (item[key]) === "string" && item[key].toLowerCase().replace(/\s+/g, "").includes(lowerCasedFilter)
                );
            });
            marker_list = filterList
        }
        else {
            marker_list = [...all_marker_list]
            filterList = []
        }
        this.setState({
            [name]: value,
            filterList,
            marker_list
        })
    }

    handleSelectRoutePlan = () => {
        if (this.state.directionList.length > 0) {
            this.props.handleSelectRoute(this.state.marker_list, this.state.marker_type)
            this.setState({ isDialogOpen: false }, () => {
                this.handleReset()
            })
        }
        else {
            const { route_type } = this.state;
            const route = route_type === 'Drop' ? 'drop' : 'pickup'
            this.setState({
                showError: `Select ${route} locations to show route plan`,
            })
        }
    }

    handleDialogOpen = () => {
        let { isEditRoutePlan, isEdit, marker_type, selected_items = [], route_type, institute_address } = this.props;
        if (isEditRoutePlan || isEdit) {
            let marker_list_temp = cloneDeep(selected_items)
            let directionList_temp = []
            this.setState({
                isDialogOpen: !this.state.isDialogOpen,
                marker_list: [...marker_list_temp],
                marker_type: marker_type[route_type],
                polyline: true,
                drawingControlEnabled: false,
                isOptimize: false,
                isEditRoutePlan,
                route_type,
                isEdit,
                selected_items
            }, () => {
                marker_list_temp.map((data) => {
                    if (data.selected) {
                        data['checked'] = true
                        directionList_temp.push(data)
                    }
                })
                directionsService = new google.maps.DirectionsService();
                const routesCopy = directionList_temp.map((route) => {
                    return {
                        location: { lat: route.location.lat, lng: route.location.lng },
                        stopover: true,
                    };
                });
                let origin, destination;
                if (route_type === 'Pickup') {
                    origin = routesCopy[0].location;
                    destination = new google.maps.LatLng(institute_address.lat, institute_address.lng)
                }
                else {
                    origin = new google.maps.LatLng(institute_address.lat, institute_address.lng)
                    destination = routesCopy.pop().location;
                }
                const waypoints = routesCopy;
                this.getDirection(origin, destination, waypoints, 'callAreaOrStudent');
                this.setState({ directionList: [...directionList_temp] })
            })
        }
        else {
            this.getAreaList()
        }
    }

    getAreaList = () => {
        this.setState({ isDialogOpen: true, showError: '' })
        let { institute_address, marker_list, route_type, isEdit, selected_items, isEditRoutePlan } = this.state;
        let selectedIds = []
        selected_items.forEach((data) => {
            selectedIds.push(data['area_details']['id'])
        })
        const url = GET_URL.area.api;
        const params = { is_active: 1, institute_address: institute_address.id, area_type: 1 }
        getRequest(url, params).then((response) => {
            if (response && response.status === 200) {
                if (!isEditRoutePlan && !isEdit) {
                    this.setState({
                        loading: false
                    })
                }
                let list_temp = []
                let list_temp_key = {}
                response.data.data.map((data) => {
                    if (!selectedIds.includes(data.id)) {
                        list_temp_key = {}
                        data['location'] = { lat: parseFloat(data['latitude']), lng: parseFloat(data['longitude']) }
                        data['iconUrl'] = iconUrls.default
                        data['distance'] = data['km']
                        data['address_detail'] = this.getFormattedAddress(data)
                        list_temp_key['location'] = { lat: parseFloat(data['latitude']), lng: parseFloat(data['longitude']) }
                        list_temp_key['iconUrl'] = iconUrls.default
                        list_temp_key['distance'] = data['km']
                        list_temp_key['address_detail'] = this.getFormattedAddress(data)
                        list_temp_key['name'] = data.name
                        list_temp_key['area_details'] = data
                        list_temp.push(list_temp_key)
                    }
                })
                if (route_type === 'Pickup') {
                    list_temp.sort((a, b) => (a.distance < b.distance) ? 1 : -1)
                }
                else {
                    list_temp.sort((a, b) => (a.distance > b.distance) ? 1 : -1)
                }
                this.setState({
                    marker_list: [...marker_list, ...list_temp],
                    all_marker_list: [...marker_list, ...list_temp],
                })
            }
        })
    }

    getStudentList = () => {
        let { marker_list, route_type, selected_items, isEditRoutePlan, isEdit } = this.state;
        const { year } = this.props
        let selectedIds = []
        selected_items.forEach((data) => {
            selectedIds.push(data['address_details']?.area_details?.id)
        })
        const url = GET_URL.routeuseraddress.api
        const params = { academic_year: year, student_data: 1, area__area_type: 2 }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                if (!isEditRoutePlan && !isEdit) {
                    this.setState({
                        loading: false
                    })
                }
                let list_items = []
                response.data.data.map((data) => {
                    if (!selectedIds.includes(data?.address_details?.area_details?.id)) {
                        data['location'] = this.getAddress('location', data)
                        if (data.address_details) {
                            data.address_details.area_details['name'] = data?.address_details?.area_details?.address_one
                        }
                        data['full_name'] = getFullName(data['first_name'], data['middle_name'], data['last_name'])
                        data['address_id'] = data.address_details?.id
                        data['area_details'] = data.address_details?.area_details
                        data['address_detail'] = this.getAddress('detail', data)
                        data['iconUrl'] = iconUrls.default
                        data['distance'] = data?.address_details?.area_details?.km
                        list_items.push(data)
                    }
                })
                if (route_type === 'Pickup') {
                    list_items.sort((a, b) => (a.distance < b.distance) ? 1 : -1)
                }
                else {
                    list_items.sort((a, b) => (a.distance > b.distance) ? 1 : -1)
                }
                list_items.map((data) => {
                    marker_list.push(data)
                })
                this.setState({
                    marker_list,
                })
            }
        })
    }


    getAddress = (name, data) => {
        let return_data = ''
        if (name === 'location') {
            if (data?.address_details?.area_details?.area_type === 2) {
                return_data = { lat: parseFloat(data?.address_details?.area_details.latitude), lng: parseFloat(data?.address_details?.area_details.longitude) }
            }
        }
        else if (name === 'detail' && data?.address_details) {
            return_data = this.getFormattedAddress(data?.address_details?.area_details)
        }
        return return_data
    }

    getFormattedAddress = (map_address) => {
        let return_result = ''
        return_result = map_address.address_one + " " + map_address.address_two + "  " +
            map_address.city + ',' + " " + map_address.district + ',' + " " + map_address.state + ',' + " " +
            map_address.country + ',' + " " + map_address.pincode
        return return_result
    }

    handleDialogClose = () => {
        this.handleReset()
        this.setState({
            isDialogOpen: false,
            marker_type: 'area',
        })
    }

    onMarkerClick = (index) => {
        let marketListTemp = this.state.marker_list;
        marketListTemp[index]['isOpen'] = !marketListTemp[index]['isOpen']
        this.setState({
            marker_list: [...marketListTemp]
        })
    }

    onDelete = (index) => {
        let marketListTemp = this.state.marker_list;
        marketListTemp.splice(index, 1)
        this.setState({
            marker_list: [...marketListTemp]
        })
    }

    onInfoWindowClose = () => {
        this.setState({
            activeMarker: null,
            showingInfoWindow: false
        });
    };

    handleSearchChange = (e) => {
        let { name, value } = e.target;
        const { marker_type } = this.state;
        Swal.fire({
            title: "Are you sure?",
            text: "You want to change location point!, selected location point will be erased",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Change Type",
        }).then(async (result) => {
            if (result.value && value !== marker_type) {
                this.handleReset()
                this.setState({
                    [name]: value,
                    loading: true,
                    isEdit: false,
                    isEditRoutePlan: false,
                    selected_items: []
                }, () => {
                    if (value === 'area') {
                        this.getAreaList()
                    }
                    else {
                        this.getStudentList()
                    }
                })
            }
        })
    }

    handleResetButton = () => {
        let { marker_list } = this.state;
        marker_list.map((data) => {
            data['distance_km'] = ''
            data['order'] = ''
            data['selected'] = false
            data['checked'] = false
        })
        this.setState({
            polyline: null,
            directions: null,
            directionList: [],
            drawingControlEnabled: true,
            marker_list: [...marker_list]
        })
        let routeDetails = {}
        routeDetails['total_stops'] = 0
        routeDetails['average_time'] = 0
        routeDetails['total_distance'] = 0
        this.setState({ routeDetails })
    }

    handleOptimizeRoute = () => {
        const { marker_list, institute_address } = this.state;
        const { route_type } = this.props;
        let marker_list_temp = cloneDeep(marker_list)
        let directionList_temp = []
        let is_found = false
        marker_list_temp.map((data) => {
            if (data.selected) {
                is_found = true
                directionList_temp.push(data)
            }
        })
        if (!is_found) {
            const route = route_type === 'Drop' ? 'drop' : 'pickup'
            this.setState({
                showError: `Select ${route} locations to show route plan`,
            })
            return
        }
        if (route_type === 'Pickup') {
            directionList_temp.sort((a, b) => (a.distance < b.distance) ? 1 : -1)
        }
        else {
            directionList_temp.sort((a, b) => (a.distance > b.distance) ? 1 : -1)
        }
        directionsService = new google.maps.DirectionsService();
        const routesCopy = directionList_temp.map((route) => {
            return {
                location: { lat: route.location.lat, lng: route.location.lng },
                stopover: true,
            };
        });
        let origin, destination;
        if (route_type === 'Pickup') {
            origin = routesCopy[0].location;
            destination = new google.maps.LatLng(institute_address.lat, institute_address.lng)
        }
        else {
            origin = new google.maps.LatLng(institute_address.lat, institute_address.lng)
            destination = routesCopy.pop().location;
        }
        this.setState({ directionList: [...directionList_temp], isOptimize: true }, () => {
            const waypoints = routesCopy;
            this.getDirection(origin, destination, waypoints);
        })
    }

    handleChanceCheckBox = (index) => {
        let { marker_list,showError } = this.state;
        marker_list[index]['checked'] = !marker_list[index]['checked']
        marker_list[index]['selected'] = marker_list[index]['checked']
        if(marker_list[index]['checked']){
            showError=''
        }
        this.setState({
            marker_list,
            showError
        })
    }

    handleDialogOpenNoMap = () => {
        let { isEditRoutePlan, isEdit, marker_type, selected_items = [], route_type } = this.props;
      
        if (isEditRoutePlan || isEdit) {
          let selectedIds = selected_items.map(m => 
            marker_type[route_type] === 'area'
              ? m.area_details?.id
              : m.address_id
          );
      
          this.setState({
            isDialogOpenNoMap: true,
            marker_type: marker_type[route_type],
            isEditRoutePlan,
            route_type,
            isEdit,
            selected_items,
            loading: true,
          }, () => {
            if (marker_type[route_type] === 'area') {
              this.getAreaListNoMap(selectedIds);
            } else {
              this.getStudentListNoMap(selectedIds);
            }
          });
        } else {
          this.setState({
            isDialogOpenNoMap: true,
            marker_type: marker_type[route_type],
            loading: true,
          }, () => {
            if (marker_type[route_type] === 'area') {
              this.getAreaListNoMap();
            } else {
              this.getStudentListNoMap();
            }
          });
        }
    };
      

    loadAvailableStops = () => {
        const { marker_type } = this.state;
        
        if (marker_type === "area") {
            this.getAreaListNoMap();
        } else {
            this.getStudentListNoMap();
        }
    };
      
    getAreaListNoMap = (selectedIds = []) => {
        let { institute_address, selected_items, route_type } = this.state;
        const url = GET_URL.area.api;
        const params = { is_active: 1, institute_address: institute_address.id, area_type: 1 };
        
        getRequest(url, params).then((response) => {
            if (response && response.status === 200) {
            let list_temp = response.data.data.map((data) => {
               const matched = selected_items.find(
                   s => s.area_details?.id === data.id
               );
               return {
                   name: data.name,
                   area_details: data,
                   location: { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) },
                   iconUrl: iconUrls.default,
                   checked: !!matched,
                   selected: !!matched,
                   order: matched ? matched.order : null,
                   pickup_time: matched?.pickup_time || null,
                   drop_time: matched?.drop_time || null,
                   students: matched?.students || []
               };
            });
            this.setState({ marker_list: list_temp, loading: false });
            }
        });
    };
        
    getStudentListNoMap = (selectedIds = []) => {
        const { year } = this.props;
        const url = GET_URL.routeuseraddress.api;
        const params = { academic_year: year, student_data: 1, area__area_type: 2 };
        
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
            let list_items = response.data.data.map((data, i) => {
                const id = data.address_details?.id;
                return {
                name: getFullName(data.first_name, data.middle_name, data.last_name),
                area_details: data.address_details?.area_details,
                location: {
                    lat: parseFloat(data.address_details?.area_details?.latitude),
                    lng: parseFloat(data.address_details?.area_details?.longitude)
                },
                iconUrl: iconUrls.default,
                address_id: id,
                checked: selectedIds.includes(id),   // ✅ preselect if editing
                selected: selectedIds.includes(id),
                order: selectedIds.includes(id) ? selectedIds.indexOf(id) + 1 : null,
                };
            });
            this.setState({ marker_list: list_items, loading: false });
            }
        });
    };
      

    render() {
        const { routeDetails, marker_list, searchStudent, isDialogOpen, marker_type, marker_type_list,
            fieldErrors, loading, institute_address, institute_to_first_drop, directionList, institute_address_detail } = this.state;
        const { route_type } = this.props;
        const GoogleMapExample = withGoogleMap(props => (
            <GoogleMap
                defaultCenter={this.props.lat_lng}
                defaultZoom={11}
                onLoad={map => this.onMapLoad(map)}
            >
                <DirectionsRenderer
                    directions={this.state.directions}
                    options={{ suppressMarkers: true }}
                />
                {this.state.marker_list.map((marker, index) => {
                    return (
                        <Marker
                            position={{ lat: marker.location.lat, lng: marker.location.lng }}
                            key={index}
                            icon={this.state.directions ? marker.selected ?
                                `https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_red${marker['order']}.png` :
                                marker.iconUrl : `https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_red${index + 1}.png`}
                        >
                        </Marker>
                    )
                }
                )}
                <Marker
                    position={{ lat: institute_address.lat, lng: institute_address.lng }}
                    icon={iconUrls.school}
                >
                    {/* <InfoWindow>
                        <h4>School Location</h4>
                    </InfoWindow> */}
                </Marker>
                {/* <DrawingManager
                    defaultDrawingMode={this.state.drawingControlEnabled ? google.maps.drawing.OverlayType.POLYLINE : google.maps.ControlPosition.TOP_CENTER}
                    defaultOptions={{
                        drawingControl: this.state.drawingControlEnabled,
                        drawingControlOptions: {
                            position: google.maps.ControlPosition.TOP_CENTER,
                            // drawingModes: [google.maps.drawing.OverlayType.POLYLINE]
                        }
                    }}
                    onOverlayStart
                    onOverlayComplete={(e) => this.handleOverlayComplete(e, this.state.marker_list)}
                /> */}
                {this.state.polyline !== null && (
                    <Polyline path={this.state.polyline} />
                )}
            </GoogleMap>
        ));

        

        
        return (
            <div>
                    <Button className="custom-button" onClick={this.handleDialogOpen}>
                        Route Plan With Map
                    </Button>

                    <Button
                    className="custom-button mt-10"
                    onClick={this.handleDialogOpenNoMap}
                    >
                        Route Plan Without Map
                    </Button>
                    <Dialog 
                        open={this.state.isDialogOpenNoMap} 
                        fullScreen 
                        aria-labelledby="form-dialog-title"
                        >
                        <AppBar>
                            <Toolbar>
                            <IconButton edge="start" color="inherit" onClick={() => this.setState({ isDialogOpenNoMap: false })}>
                                <CloseIcon />
                            </IconButton>
                            <Typography variant="h6">
                                {this.props.route_type === 'Drop'
                                ? 'Route planning without map (Drop)'
                                : 'Route planning without map (Pickup)'}
                            </Typography>
                            </Toolbar>
                        </AppBar>
                        <DialogContent>
                            {this.state.loading ? (
                                <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    height: "60vh",
                                    fontSize: "18px",
                                    fontWeight: "bold"
                                }}
                                >
                                {/* If you want gif instead of text: <LoadingGif /> */}
                                Loading stops, please wait...
                                </div>
                            ) : (
                            <Grid container>
                            <Grid item md={12} xs={12}>
                                <div className="assign-perm-note mt-20">
                                Select and arrange stops without map view
                                </div>

                                <div className="mt-20">
                                <table width="100%" className="selectable-row-table">
                                    <thead className="table-select-hostel-thead">
                                    <tr>
                                        <th>Sl Num</th>
                                        <th>Select</th>
                                        <th>{this.state.marker_type === 'area' ? 'Area Name' : 'Students'}</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {this.state.marker_list.map((stop, index) => (
                                        <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <Checkbox
                                                checked={stop.checked || false}
                                                onChange={() => this.handleChanceCheckBox(index)}
                                                color="primary"
                                            />
                                        </td>
                                        <td>{this.state.marker_type === 'area' ? stop.area_details?.name : stop.name}</td>
                                        </tr>
                                    ))}
                                    {this.state.marker_list.length === 0 && (
                                        <tr className="text-center font-weight-bold">
                                        <td colSpan={3}>No Stops Added</td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                                </div>

                                <div className="submt-button-float-bottom">
                                <Button
                                    variant="contained"
                                    color="primary"
                                    className="submit"
                                    onClick={() => {
                                        const selectedStops = this.state.marker_list.filter(m => m.checked);
                                        if (selectedStops.length === 0) {
                                        this.setState({ showError: "Please select at least one stop" });
                                        return;
                                        }
                                        this.props.handleSelectRoute(selectedStops, this.state.marker_type);
                                        this.setState({ isDialogOpenNoMap: false });
                                    }}
                                >
                                    Confirm Route Plan
                                </Button>
                                </div>
                            </Grid>
                            </Grid>
                        )}
                        </DialogContent>
                        </Dialog>
            </div>
        );
    }
}

export default GoogleMapDrawLine;
