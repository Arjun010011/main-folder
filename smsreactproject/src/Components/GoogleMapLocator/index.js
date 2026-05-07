// import React from "react";
// import {
//   withGoogleMap,
//   withScriptjs,
//   GoogleMap,
//   Marker
// } from "react-google-maps";

import { GOOGLE_API_KEY } from 'Includes/api/constant';

import React from 'react'
import { compose, withProps, lifecycle } from 'recompose'
import { withScriptjs, withGoogleMap, GoogleMap, Marker } from 'react-google-maps'
const {
  StandaloneSearchBox
} = require("react-google-maps/lib/components/places/StandaloneSearchBox");


const DirectionsComponent = compose(
  withProps({
    googleMapURL: `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&v=3.exp&libraries=geometry,drawing,places`,
    loadingElement: <div style={{ height: `400px` }} />,
    containerElement: <div style={{ width: `100%` }} />,
    mapElement: <div style={{ height: `80vh`, width: `100%` }} />,
  }),

  withScriptjs,
  withGoogleMap,
  lifecycle({
    componentWillMount() {
      const refs = {};
      

      this.setState({
        places: [],
        onSearchBoxMounted: ref => {
          refs.searchBox = ref;
        },
        onPlacesChanged: () => {
          const places = refs.searchBox.getPlaces();

          this.setState({
            places
          });
        }
      });
    },

  })
)(props =>
  <div data-standalone-searchbox="">
    <GoogleMap defaultZoom={12}
        center={props.details}
    >
      <Marker
        position={props.details}
        draggable={true}
        onDragEnd={props.handleDragEnd}
      />
    </GoogleMap>
  </div>

);

class MapComponent extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      progress: { lat: 12.972442, lng: 77.580643 },
    }
  }

  getLatAndLngDetails=()=>{
    return this.state.progress;
  }

  updateDetails = (data) => {
    this.setState({
      progress: data
    })
  }


  handleDragEnd = (coord) => {
    const { latLng } = coord;
    const lat = latLng.lat();
    const lng = latLng.lng();
    this.setState({
      progress:{lat:lat,lng:lng}
    })
  }


  
  render() {
    const { progress } = this.state;
    return (
      <div>
        <DirectionsComponent details={progress} handleDragEnd={this.handleDragEnd}/>
      </div>

    )
  }
}

export default MapComponent

// const MapComponent = withScriptjs(withGoogleMap(props => <GoogleMapLocator {...props}/>));

// export default () => (
//   <MapComponent
//     googleMapURL={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&v=3.exp&libraries=geometry,drawing,places`}
//     loadingElement={<div style={{ height: `100%` }} />}
//     containerElement={<div style={{ height: `85%`,marginTop:'20px', width: "100%" }} />}
//     mapElement={<div style={{ height: `100%` }} 
//     />
//   }
//   /> 
// );
