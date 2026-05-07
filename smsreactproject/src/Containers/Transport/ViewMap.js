import React, { useEffect, useState, useCallback } from "react";
import {
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Box,
  Divider,
  CircularProgress,
} from "@material-ui/core";
import { Autocomplete } from "@material-ui/lab";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { GET_URL } from "Includes/urls";
import { getRequest } from "Includes/api/apicall";

const containerStyle = {
  width: "100%",
  height: "650px",
  borderRadius: "12px",
};

const center = {
  lat: 12.9716,
  lng: 77.5946,
};

const ViewMap = () => {
  const [locations, setLocations] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedEntity, setSelectedEntity] = useState(null);
  const [trackingType, setTrackingType] = useState("driver");
  const [iframeUrl, setIframeUrl] = useState("");
  const [defaultFeature,setDefaultFeature]= useState(0);

  const academicYear = localStorage.getItem("academic-year");


  const getFormdefination = async() => {
    const url = GET_URL.formdefinition.api
    const response = await getRequest(url)
    let data=response.data.data
    data.map((item)=> {
      if(item.form_name == "transport_configurations" && item.column_name == "gps_tracking_selection"){
        setDefaultFeature(parseInt(item.default_value))
        return
      }
    })

    
  }

  console.log('feature',defaultFeature)

  const fetchDrivers = useCallback((search = "") => {
    getRequest(GET_URL.transportdriver.api, {
      academic_year: academicYear,
      search: search,
    }).then((response) => {
      if (response?.data?.data) setDrivers(response.data.data);
    });
  }, [academicYear]);

  const fetchVehicles = useCallback((search = "") => {
    getRequest(GET_URL.vehicle.api, {
      academic_year: academicYear,
      search: search,
    }).then((response) => {
      if (response?.data?.data) setVehiclesList(response.data.data);
    });
  }, [academicYear]);

  const loadLocations = async (id = null, type = trackingType) => {
    setLoading(true);
    try {
      let response;
      if (type === "driver") {
        const params = id ? { driver: id } : {};
        response = await getRequest(GET_URL.driverlocation.api, params);
      } else {
        const params = id ? { vehicle: id, read: true } : { read: true };
        response = await getRequest(GET_URL.gpslocation.api, params);
      }

      if (response?.data?.data) {
        const data = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
        const formatted = data.map((item) => ({
          lat: parseFloat(item.latitude),
          lng: parseFloat(item.longitude),
          name: item.driver || item.vehicle || "Tracking Point",
        }));
        setLocations(formatted);
      }
    } catch (error) {
      console.error("Tracking Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getFormdefination();
    fetchDrivers();
    fetchVehicles();
  }, [fetchDrivers, fetchVehicles]);

  useEffect(() => {
  if (defaultFeature === 0) {
    setTrackingType("driver");
  } else if (defaultFeature === 1) {
    setTrackingType("gps");
  } else if (defaultFeature === 2) {
    setTrackingType("url");
  }
}, [defaultFeature]);

  const handleTrackingChange = (event) => {
    const type = event.target.value;
    setTrackingType(type);
    setSelectedEntity(null);
    setIframeUrl("");
    setLocations([]);
    if (type !== "url") loadLocations(null, type);
  };

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "YOUR_GOOGLE_MAP_KEY",
  });

  if (!isLoaded) return <Box p={4} textAlign="center"><CircularProgress /></Box>;

  return (
      <Paper elevation={4} style={{ borderRadius: 16, overflow: "hidden" }}>
        {/* Header Section */}
        <Box p={3} display="flex" justifyContent="space-between" alignItems="center" bgcolor="#ffffff">
          <Box>
            <Typography variant="h6" className="heading">
              Live Fleet Tracking
            </Typography>
          </Box>
          {loading && <CircularProgress size={20} />}
        </Box>
        
        <Divider />

        {/* Compact Controls Section */}
        <Box p={2} bgcolor="#fcfcfc">
          <Grid container spacing={2} alignItems="center">
            {/* Tracking Type - Small Width */}

            {/* Search Input - Reduced Width */}
            <Grid item xs={12} sm={5} md={4}>
              {trackingType === "driver" ? (
                <Autocomplete
                  options={drivers}
                  size="small"
                  getOptionLabel={(o) => o.full_name || ""}
                  value={selectedEntity}
                  onChange={(_, val) => {
                    setSelectedEntity(val);
                    loadLocations(val?.id, "driver");
                  }}
                  onInputChange={(_, val) => fetchDrivers(val)}
                  renderInput={(params) => <TextField {...params} label="Search Driver" variant="outlined" />}
                />
              ) : (
                <Autocomplete
                  options={vehiclesList}
                  size="small"
                  getOptionLabel={(o) => `${o.vehicle_num}`}
                  value={selectedEntity}
                  onChange={(_, val) => {
                    setSelectedEntity(val);
                    if (trackingType === "url") setIframeUrl(val?.url || "");
                    else loadLocations(val?.id, "gps");
                  }}
                  onInputChange={(_, val) => fetchVehicles(val)}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label={trackingType === "url" ? "Select Vehicle URL" : "Search Vehicle"} 
                      variant="outlined" 
                    />
                  )}
                />
              )}
            </Grid>
          </Grid>
        </Box>

        {/* Map / Content View */}
        <Box p={1} bgcolor="#f0f2f5">
          {(trackingType === "gps" || trackingType === "driver") && (
            <div style={{ position: "relative" }}>
              <GoogleMap 
                mapContainerStyle={containerStyle} 
                center={locations.length > 0 ? { lat: locations[0].lat, lng: locations[0].lng } : center} 
                zoom={14}
              >
                {locations.map((loc, i) => (
                  <Marker key={i} position={{ lat: loc.lat, lng: loc.lng }} title={loc.name} />
                ))}
              </GoogleMap>
            </div>
          )}

          {trackingType === "url" && (
            <Paper elevation={0} style={{ height: "650px", borderRadius: 12, overflow: "hidden" }}>
              {iframeUrl ? (
                <iframe title="Tracking" src={iframeUrl} width="100%" height="100%" style={{ border: "none" }} />
              ) : (
                <Box display="flex" height="100%" alignItems="center" justifyContent="center">
                  <Typography color="textSecondary">Select a vehicle to load tracking window</Typography>
                </Box>
              )}
            </Paper>
          )}
        </Box>
      </Paper>
  );
};

export default ViewMap;