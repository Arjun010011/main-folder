import React, { Component } from "react";
import {
    withGoogleMap,
    GoogleMap,
    Marker,
    Polyline,
    InfoWindow,
    DirectionsRenderer,
    fitBounds
} from "react-google-maps";
import _ from 'lodash';

const iconUrls = {
    default: "https://maps.google.com/mapfiles/kml/paddle/grn-circle.png",
    selected: "https://maps.google.com/mapfiles/kml/paddle/red-circle.png",
    school: "http://maps.google.com/mapfiles/kml/shapes/schools.png",
};
const google = window.google;

class GoogleMapDrawLine extends Component {
    constructor(props) {
        super(props);

        this.state = {
            drawingControlEnabled: true,
            marker: { lat: 12.9817347, lng: 77.6334081 },
            polyline: null,
            circleRadius: null,
            circleCenter: null,
            rectangle: null,
            polygon: null,
            visible: true,
            lat_lng: this.props.lat_lng,
            marker_list: [],
            old_marker_list: [],
            directions: null,
            showInfoWindow: false,
            showError: '',
            searchStudent: '',
            isDialogOpen: false,
            updated_center: this.props.lat_lng,
            updated_zoom: 12,
            distance: ''
        };
        this.previosOverlay = null
    }


    updateDetails = (data) => {
        this.setState({
            marker: data
        })
    }

    getLatAndLngDetails = () => {
        let data = { location: this.state.marker, distance: this.state.distance }
        return data
    }

    handleDialogOpen = () => {
        this.setState({
            isDialogOpen: !this.state.isDialogOpen
        })
    }


    handleDragEnd = (coord) => {
        const { latLng } = coord;
        const lat = latLng.lat();
        const lng = latLng.lng();
        this.setState({
            marker: { lat: lat, lng: lng }
        })
    }

    render() {
        const { marker, updated_zoom, updated_center, lat_lng } = this.state;
        const GoogleMapExample = withGoogleMap(props => (
            <GoogleMap
                // defaultCenter={this.props.lat_lng}
                defaultZoom={12}
                defaultCenter={marker}
            // zoom={updated_zoom}
            >
                <DirectionsRenderer
                    directions={this.state.directions}
                    options={{ suppressMarkers: true }}
                />

                <Marker
                    position={{ lat: marker.lat, lng: marker.lng }}
                    icon={iconUrls.default}
                    draggable={true}
                    onDragEnd={this.handleDragEnd}
                />
                {this.state.polyline !== null && (
                    <Polyline path={this.state.polyline} />
                )}
            </GoogleMap>
        ));

        return (
            <div className="pt-20">
                <GoogleMapExample
                    containerElement={<div style={{ width: "100%" }} />}
                    mapElement={<div style={{ height: `70vh`, width: `100%` }} />}
                />
            </div>
        );
    }
}

export default GoogleMapDrawLine;
