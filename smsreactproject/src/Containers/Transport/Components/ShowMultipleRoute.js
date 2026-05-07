import React, { Component } from "react";
import {
    withGoogleMap,
    GoogleMap,
    Marker,
    Polyline,
    DirectionsRenderer,
} from "react-google-maps";
import {
    Grid, Box
} from '@material-ui/core';
const iconUrls = {
    default: "https://maps.google.com/mapfiles/kml/paddle/grn-circle.png",
    selected: "https://maps.google.com/mapfiles/kml/paddle/red-circle.png",
    school: "http://maps.google.com/mapfiles/kml/pal2/icon2.png",
};

class ShowMultipleRoute extends Component {
    constructor(props) {
        super(props);

        this.state = {
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
            distance: '',
            route_details: this.props.route_details,
            location_details: this.props.location_details,
        };
        this.previosOverlay = null
    }


    render() {
        const { route_details, location_details } = this.state;
        const GoogleMapExample = withGoogleMap(props => (
            <GoogleMap
                defaultZoom={8}
                defaultCenter={location_details.institute}
                options={{ streetViewControl: false, mapTypeControl: false }}
            // zoom={updated_zoom}
            >

                <DirectionsRenderer
                    directions={route_details.result}
                    options={{ suppressMarkers: true }}
                />

                <Marker
                    position={location_details.area}
                    icon={iconUrls.default}
                />

                <Marker
                    position={location_details.institute}
                    icon={iconUrls.school}
                >
                </Marker>

                {this.state.polyline !== null && (
                    <Polyline path={this.state.polyline} />
                )}
            </GoogleMap>
        ));

        return (
            <div className="mt-40">
                <Grid container spacing={1}>
                    <Grid item md={8} xs={8}>
                        <Box>Distance</Box>
                        <Box>Duration</Box>
                    </Grid>
                    <Grid item md={4} xs={4} className='text-bold'>
                        <Box>{route_details.distance_label}</Box>
                        <Box>{route_details.duration_label}</Box>
                    </Grid>
                </Grid>
                {route_details.distance_label &&
                    <div className="p-5px">
                        <GoogleMapExample
                            containerElement={<div style={{ width: "100%" }} />}
                            mapElement={<div style={{ height: `300px`, width: `100%` }} />}
                        />
                    </div>
                }
                <div></div>
            </div>
        );
    }
}

export default ShowMultipleRoute;
