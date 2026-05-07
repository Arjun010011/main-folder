import React, { useState, useImperativeHandle } from "react";
import {
  Grid,
  AppBar,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Tooltip,
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import AddPlaceNameWithMap from "Containers/Transport/AddPlaceNameWithMap";
import GoogleMapLocator from "Components/GoogleMapLocator";
import { GOOGLE_API_KEY } from "Includes/api/constant";
import { getFormattedAddress } from "Includes/functions";
import MyLocationIcon from "@material-ui/icons/MyLocation";

import "./styles.scss";

const AutoCompleteAddress = React.forwardRef((props, ref) => {
  const {
    updateParentAddress,
    addressDetails,
    address_type,
    address_placeHolder,
    showSearchOption,
    isAddressExist,
  } = props;
  const [addressInformations, setAddressInformations] = useState({});
  const [fieldError, setFieldError] = useState({});
  const [loading, setLoading] = useState(true);
  const [googleMapLocator, setGoogleMapLocator] = useState(false);
  const [enableToEdit, setEnableToEdit] = useState({});
  const [currentLocation, setCurrentLocation] = useState({});

  const googleMapRef = React.useRef(null);

  useImperativeHandle(ref, () => ({
    updateErrors(fieldErrors) {
      if (fieldErrors.address_one_map) {
        fieldErrors["address_map"] =
          "Select address using find location on map";
      }
      setFieldError(() => fieldErrors);
    },
  }));

  const updateErrors = (fieldErrors) => {
    setFieldError(() => fieldErrors);
  };

  const onChange = (e) => {
    let { name, value } = e.target;
    let address_temp = { ...addressInformations };
    address_temp[name] = value;
    delete fieldError[name];
    delete fieldError["address_map"];
    setFieldError(() => fieldError);
    setAddressInformations(() => address_temp);
    updateParentAddress(address_temp);
  };

  const handleUpdateDetails = (data) => {
    let address_temp = { ...addressInformations, ...data };
    setAddressInformations(() => address_temp);
    updateParentAddress(address_temp);
  };

  const handleLocateUpdateDetails = (data) => {
    if (data["latitude_and_langitude_map"]) {
      googleMapRef.current.updateDetails(data["latitude_and_langitude_map"]);
    }
  };

  React.useEffect(() => {
    setAddressInformations(() => addressDetails);
    setLoading(() => false);
  }, []);

  const handleDialogOpen = () => {
    setGoogleMapLocator(() => !googleMapLocator);
    updateErrors({});
  };

  const selectAddress = async () => {
    let lat_lng = googleMapRef.current.getLatAndLngDetails();
    await fetch(
      "https://maps.googleapis.com/maps/api/geocode/json?latlng=" +
        lat_lng["lat"] +
        "," +
        lat_lng["lng"] +
        "&sensor=true&key=" +
        GOOGLE_API_KEY
    )
      .then((response) => response.json())
      .then(async (responseJson) => {
        let formatted_address = await getFormattedAddress(
          responseJson.results[0]
        );
        let address_temp = formatted_address;
        address_temp["address_one_map"] =
          formatted_address?.address_one_map ??
          addressInformations.address_one_map;
        address_temp["address_two_map"] =
          formatted_address?.address_two_map ??
          addressInformations.address_two_map;
        let enableToEdit = {
          city_map: "",
          district_map: "",
          state_map: "",
          country_map: "",
          pincode_map: "",
        };
        Object.keys(enableToEdit).map((data) => {
          if (!address_temp[data]) {
            enableToEdit[data] = true;
            address_temp[data] = "";
          }
        });
        setAddressInformations(() => address_temp);
        setEnableToEdit(() => enableToEdit);
        setGoogleMapLocator(() => false);
        updateParentAddress(address_temp);
        updateErrors({});
      });
  };

  const getCurrentLocation = () => {
    // local_time_out_ref = setTimeout("geolocFail()", 10000);
    // if (navigator.geolocation) {
    // navigator.geolocation.getCurrentPosition(gpsSuccess, gpsError, gpsOptions);
    var options = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    };
    navigator.geolocation.getCurrentPosition(
      showPosition,
      errorPosition,
      options
    );
    // }
  };

  const errorPosition = () => {
    console.log("error cant find location");
  };

  function showPosition(position) {
    const { latitude, longitude, accuracy } = position.coords;
    let currentLocation = { lat: latitude, lng: longitude };
    setCurrentLocation(currentLocation);
    googleMapRef.current.updateDetails(currentLocation);
  }

  return (
    <div>
      <Grid container>
        <Grid item md={12} xs={12} className="m-t-10px">
          {!loading && (
            <>
              {showSearchOption ? (
                <AddPlaceNameWithMap
                  textClassName="width-95-perc"
                  placeholder={address_placeHolder}
                  placeType={address_type}
                  handleUpdateDetails={handleUpdateDetails}
                  fieldError={fieldError ? fieldError["address_map"] : ""}
                  updateErrors={updateErrors}
                  defaultValue={addressInformations["address_map"]}
                />
              ) : (
                <div className="text-red fs-16 font-weight-bold">
                  {fieldError["address_map"]}
                </div>
              )}
              <div className="width-95-perc text-blue text-underline">
                <div
                  className="cursor-pointer fs-16"
                  onClick={handleDialogOpen}
                >
                  Click here to find location on map
                </div>
              </div>
            </>
          )}
        </Grid>
        {!addressInformations.country_map && isAddressExist && (
          <Grid item md={6} xs={12} className="mt-20">
            <TextField
              id="address_one_map"
              autoComplete="off"
              label="Address Line 1"
              name="address_one_map"
              variant="outlined"
              required
              value={addressInformations.address_one_map}
              className="width-form-90"
              inputProps={{ maxLength: 50 }}
              fullWidth
              InputLabelProps={{
                shrink: addressInformations.address_one_map ? true : false,
              }}
              onChange={(e) => onChange(e)}
              error={
                fieldError["address_one_map"] && fieldError["address_one_map"]
              }
              helperText={
                fieldError["address_one_map"] && fieldError["address_one_map"]
              }
            />
          </Grid>
        )}
        {addressInformations.country_map && (
          <>
            <Grid item md={6} xs={12} className="mt-20">
              <TextField
                id="address_one_map"
                autoComplete="off"
                label="Address Line 1"
                name="address_one_map"
                variant="outlined"
                required
                value={addressInformations.address_one_map}
                className="width-form-90"
                inputProps={{ maxLength: 50 }}
                fullWidth
                InputLabelProps={{
                  shrink: addressInformations.address_one_map ? true : false,
                }}
                onChange={(e) => onChange(e)}
                error={
                  fieldError["address_one_map"] && fieldError["address_one_map"]
                }
                helperText={
                  fieldError["address_one_map"] && fieldError["address_one_map"]
                }
              />
            </Grid>
            <Grid item md={6} xs={12} className="mt-20">
              <TextField
                id="address_two_map"
                autoComplete="off"
                label="Address Line 2"
                name="address_two_map"
                variant="outlined"
                value={addressInformations.address_two_map}
                className="width-form-90"
                inputProps={{ maxLength: 50 }}
                fullWidth
                InputLabelProps={{
                  shrink: addressInformations.address_two_map ? true : false,
                }}
                onChange={(e) => onChange(e)}
                error={
                  fieldError["address_two_map"] && fieldError["address_two_map"]
                }
                helperText={
                  fieldError["address_two_map"] && fieldError["address_two_map"]
                }
              />
            </Grid>
            <Grid item md={6} xs={12} className="mt-20">
              <TextField
                id="city"
                autoComplete="off"
                label="City"
                name="city_map"
                variant="outlined"
                required
                value={addressInformations.city_map}
                disabled={!enableToEdit["city_map"]}
                className="width-form-90"
                inputProps={{ maxLength: 50 }}
                fullWidth
                InputLabelProps={{
                  shrink: addressInformations.city_map ? true : false,
                }}
                onChange={(e) => onChange(e)}
                error={fieldError["city_map"] && fieldError["city_map"]}
                helperText={fieldError["city_map"] && fieldError["city_map"]}
              />
            </Grid>
            <Grid item md={6} xs={12} className="mt-20">
              <TextField
                id="district"
                autoComplete="off"
                label="District"
                name="district_map"
                variant="outlined"
                required
                value={addressInformations.district_map}
                disabled={!enableToEdit["district_map"]}
                className="width-form-90"
                inputProps={{ maxLength: 50 }}
                fullWidth
                InputLabelProps={{
                  shrink: addressInformations.district_map ? true : false,
                }}
                onChange={(e) => onChange(e)}
                error={fieldError["district_map"] && fieldError["district_map"]}
                helperText={
                  fieldError["district_map"] && fieldError["district_map"]
                }
              />
            </Grid>
            <Grid item md={6} xs={12} className="mt-20">
              <TextField
                id="state"
                autoComplete="off"
                label="State"
                name="state_map"
                variant="outlined"
                required
                value={addressInformations.state_map}
                disabled={!enableToEdit["state_map"]}
                className="width-form-90"
                inputProps={{ maxLength: 50 }}
                fullWidth
                InputLabelProps={{
                  shrink: addressInformations.state_map ? true : false,
                }}
                onChange={(e) => onChange(e)}
                error={fieldError["state_map"] && fieldError["state_map"]}
                helperText={fieldError["state_map"] && fieldError["state_map"]}
              />
            </Grid>
            <Grid item md={6} xs={12} className="mt-20">
              <TextField
                id="country"
                autoComplete="off"
                label="Country"
                name="country_map"
                variant="outlined"
                required
                value={addressInformations.country_map}
                disabled={!enableToEdit["country_map"]}
                className="width-form-90"
                inputProps={{ maxLength: 50 }}
                fullWidth
                InputLabelProps={{
                  shrink: addressInformations.country_map ? true : false,
                }}
                onChange={(e) => onChange(e)}
                error={fieldError["country_map"] && fieldError["country_map"]}
                helperText={
                  fieldError["country_map"] && fieldError["country_map"]
                }
              />
            </Grid>
            <Grid item md={6} xs={12} className="mt-20">
              <TextField
                id="pincode"
                autoComplete="off"
                label="Postal Code"
                name="pincode_map"
                variant="outlined"
                required
                value={addressInformations.pincode_map}
                disabled={!enableToEdit["pincode_map"]}
                className="width-form-90"
                inputProps={{ maxLength: 6 }}
                fullWidth
                InputLabelProps={{
                  shrink: addressInformations.pincode_map ? true : false,
                }}
                onChange={(e) => onChange(e)}
                error={fieldError["pincode_map"] && fieldError["pincode_map"]}
                helperText={
                  fieldError["pincode_map"] && fieldError["pincode_map"]
                }
              />
            </Grid>
          </>
        )}
      </Grid>
      {googleMapLocator && (
        <Dialog
          open={true}
          className={"dialog-custom-application-form"}
          // onClose={this.handleCloseDialog}
          aria-labelledby="form-dialog-title"
        >
          <AppBar style={{ width: "1000px", right: "auto" }}>
            <Toolbar>
              <IconButton
                edge="start"
                color="inherit"
                onClick={handleDialogOpen}
                aria-label="close"
              >
                <CloseIcon />
              </IconButton>
              <Typography variant="h6">Locate the address</Typography>
            </Toolbar>
          </AppBar>
          <DialogTitle id="form-dialog-title"></DialogTitle>
          <DialogContent>
            <Grid container className="mt-20 mb-20">
              <Grid item md={1} xs={1} className="align-self-center">
                <div
                  onClick={() => getCurrentLocation()}
                  className="text-align-center"
                >
                  <Tooltip
                    title={"Get Current Location"}
                    enterDelay={400}
                    enterNextDelay={400}
                    placement="top-start"
                    classes={{ tooltip: "tooltip-show-data" }}
                  >
                    <MyLocationIcon
                      style={{
                        fontSize: "40px",
                        color: "blue",
                        cursor: "pointer",
                      }}
                    />
                  </Tooltip>
                </div>
              </Grid>
              <Grid item md={6} xs={10}>
                <AddPlaceNameWithMap
                  textClassName="width-95-perc"
                  placeholder={"Search Near Place"}
                  handleUpdateDetails={handleLocateUpdateDetails}
                  fieldError={fieldError ? fieldError["address_map"] : ""}
                  updateErrors={updateErrors}
                  defaultValue={addressInformations["address_map"]}
                />
              </Grid>
              <Grid item md={4} xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  className="submit"
                  onClick={selectAddress}
                >
                  Select the address
                </Button>
              </Grid>
            </Grid>
            <GoogleMapLocator ref={googleMapRef} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
});

export default AutoCompleteAddress;
