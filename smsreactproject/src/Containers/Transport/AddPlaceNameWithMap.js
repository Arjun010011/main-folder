import React from 'react';
import PlacesAutocomplete, {
  geocodeByAddress,
  getLatLng,
} from 'react-autocomplete-places';

import {getFormattedAddress} from 'Includes/functions';
import './styles.scss';

const borderRed='border-color-red'

  class AddPlaceName extends React.Component {
  constructor(props) {
    super(props);
    this.state = { address: '' };
  }
 
  handleChange = address => {
    this.setState({ address },()=>{
    this.props.handleUpdateDetails({address_map:address})
    });
    if(this.props.updateErrors){
      this.props.updateErrors({})
    }
  };
 
  handleSelect = address => {
    geocodeByAddress(address)
      .then(results => this.getDetails(results,address))
      .then(latLng => console.log('Success', latLng))
      .catch(error => console.error('Error', error));
  };

  getDetails=async(result,address)=>{
    let ArrayFromString = address.split(",");
    let firstElement = ArrayFromString[0];
    let address_details=await getFormattedAddress(result[0])
    address_details['address_one_map']=firstElement+' '+address_details['address_one_map']
    this.props.handleUpdateDetails(address_details)
    this.setState({
      address:''
    })
  }
 
  componentDidMount=()=>{
    if(this.props.defaultValue){
      this.setState({
        address:this.props.defaultValue
      })
    }
  }

  render() {
    const {placeholder, placeType, textClassName, fieldError}=this.props;
    return (
      <PlacesAutocomplete
        value={this.state.address} 
        onChange={this.handleChange}
        onSelect={this.handleSelect}
        searchOptions={placeType && {types:placeType}}
      >
        {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
          <div>
            <input
              {...getInputProps({
                placeholder: placeholder,
                // className: 'location-search-input',
              })}
              className={`${textClassName} location-search-input text-field-address-custom ${fieldError&& borderRed}`}
            />
            <div className='text-red'>{fieldError}</div>
            <div className={suggestions.length>0?"autocomplete-dropdown-container":''}>
              {loading && <div>Loading...</div>}
              {suggestions.map(suggestion => {
                const className = suggestion.active
                  ? 'suggestion-item--active'
                  : 'suggestion-item';
                // inline style for demonstration purpose
                const style = suggestion.active
                  ? { backgroundColor: '#fafafa', cursor: 'pointer', padding: '5px 0px' }
                  : { backgroundColor: '#ffffff', cursor: 'pointer', padding: '5px 0px'};
                return (
                  <div
                    {...getSuggestionItemProps(suggestion, {
                      className,
                      style,
                    })}
                  >
                    <span>{suggestion.description}</span>
                  </div>
                );
              })}
            </div>
          </div> 
        )}
      </PlacesAutocomplete>
    );
  }
}

export default AddPlaceName