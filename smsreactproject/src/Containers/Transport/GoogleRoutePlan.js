import React, { Component } from "react";
import GoogleMapDrawLine from "Containers/Transport/Components/GoogleMapDrawLine";
import { withScriptjs } from "react-google-maps";
import { withRouter, Link } from "react-router-dom";
import moment from "moment";
import _, { cloneDeep } from "lodash";
import {
  Paper,
  Box,
  Button,
  Grid,
  TextField,
  Tooltip,
} from "@material-ui/core";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import Divider from "@material-ui/core/Divider";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import DragIndicatorIcon from "@material-ui/icons/DragIndicator";
import LocationOnOutlinedIcon from "@material-ui/icons/LocationOnOutlined";
import Chip from "@material-ui/core/Chip";
import Avatar from "@material-ui/core/Avatar";
import PersonAddIcon from "@material-ui/icons/PersonAdd";
import InfoIcon from "@material-ui/icons/Info";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import DirectionsBusIcon from "@material-ui/icons/DirectionsBus";
import OutlinedFlagSharpIcon from "@material-ui/icons/OutlinedFlagSharp";
import Backdrop from "@material-ui/core/Backdrop";
import CircularProgress from "@material-ui/core/CircularProgress";
import { withStyles } from "@material-ui/core/styles";
import LoadingGif from "Components/LoadingGif";

import { GET_URL, POST_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  getUrlParam,
  dateFormat,
  timeFormat,
} from "Includes/functions";
import AssignStudentModal from "Containers/Transport/AssignStudentModal";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import {
  MuiPickersUtilsProvider,
  KeyboardTimePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import Swal from "sweetalert2";
import { GOOGLE_API_KEY } from "Includes/api/constant";

const grid = 12;

const GoogleMapDrawLineLoader = withScriptjs(GoogleMapDrawLine);

const iconUrls = {
  default: "https://maps.google.com/mapfiles/kml/paddle/grn-circle.png",
  selected: "https://maps.google.com/mapfiles/kml/paddle/red-circle.png",
  // school: "http://maps.google.com/mapfiles/kml/shapes/schools.png",
  school: "http://maps.google.com/mapfiles/kml/pal2/icon2.png",
};

const getListStyle = (isDraggingOver) => ({
  background: isDraggingOver ? "lightblue" : "#F0F5FE",
  padding: grid,
});

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const getItemStyle = (isDragging, draggableStyle) => ({
  // some basic styles to make the pickup_items look a bit nicer
  userSelect: "none",
  padding: `15px`,
  paddingBotton: `0px`,
  margin: `0 0 ${grid}px 0`,
  boxShadow: `rgba(149, 157, 165, 0.2) 0px 8px 24px`,
  // boxShadow: `0 1px 1px rgba(0,0,0,0.11),
  // 0 2px 2px rgba(0,0,0,0.11),
  // 0 4px 4px rgba(0,0,0,0.11),
  // 0 8px 8px rgba(0,0,0,0.11),
  // 0 16px 16px rgba(0,0,0,0.11),
  // 0 32px 32px rgba(0,0,0,0.11`,

  // change background colour if dragging
  background: isDragging ? "#E1F0FF" : "white",

  // styles we need to apply on draggables
  ...draggableStyle,
});

const styles = (theme) => ({
  backdrop: {
    zIndex: theme.zIndex.drawer + 1,
    color: "#fff",
  },
});

class GoogleRoutePlan extends Component {
  constructor(props) {
    super(props);

    this.state = {
      addressInformations: {},
      isDialogOpen: false,
      lat_lng: { lat: 12.972442, lng: 77.580643 },
      searchStudent: "",
      routeDetails: {},
      route_type: "Pickup",
      update_list: false,
      isView: false,
      errors: {},
      vehicleList: {},
      isDraggable: true,
      viewRouteSummary: false,
      pickup_items: [],
      studentList: [],
      removedPickStudents: {},
      removedDropStudents: {},
      removedAreaIds: [], //only for update stores table row id instead of area id
      removedPickStudentIds: [], // only for update stores table row id instead of student id
      removedDropStudentIds: [], // only for update stores table row id instead of student id
      marker_type: { Pickup: "area", Drop: "area" },
      isEditRoutePlan: false,
      parentDirectionList: [],
      fieldErrors: {},
      drop_items: [],
      loading: true,
      editDetails: {},
    };
    this.googleMapRef = React.createRef();
    this.studentModalRef = React.createRef();
  }

  componentDidMount = () => {
    if (
      this.props.location.pathname === Actions.transport_route_map.update.url ||
      this.props.location.pathname === Actions.transport_route_map_view.view.url
    ) {
      if (this.props.location.state && this.props.location.state.detail) {
        let { yearName, year, selected_address, lat, lng } = getUrlParam();
        let institute_address = {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          id: selected_address,
        };
        if (
          Actions.transport_route_map_view.view.url ===
          this.props.location.pathname
        ) {
          this.setState({
            isView: true,
            isDraggable: false,
          });
        }
        this.setState(
          {
            yearName,
            year,
            institute_address,
            isEdit: true,
            route_id: this.props.location.state.detail,
          },
          () => {
            this.getVehicleList();
          }
        );
      } else {
        this.props.history.push(Actions.transport_route_map.view.url);
      }
    } else {
      let { yearName, year, selected_address, lat, lng } = getUrlParam();
      let institute_address = {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        id: selected_address,
      };
      this.setState(
        {
          yearName,
          year,
          institute_address,
        },
        () => {
          this.getVehicleList();
        }
      );
    }
  };

  getVehicleList = () => {
    let { year, isEdit, loading } = this.state;
    let params = { is_active: 1, academic_year: year };
    getRequest(GET_URL.vehicledriver.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          let vehicleList = response.data.data;
          this.setState({ vehicleList, loading: isEdit ? true : false }, () => {
            if (isEdit) {
              this.updateFields();
            }
          });
        }
      }
    );
  };

  getFormattedAddress = (map_address) => {
    let return_result = "";
    return_result =
      map_address.address_one +
      " " +
      map_address.address_two +
      "  " +
      map_address.city +
      "," +
      " " +
      map_address.district +
      "," +
      " " +
      map_address.state +
      "," +
      " " +
      map_address.country +
      "," +
      " " +
      map_address.pincode;
    return return_result;
  };

  updateFields = () => {
    let { routeDetails, marker_type, vehicleList } = this.state;
    let url = `${GET_URL.route.api}${this.props.location.state.detail}/`;
    getRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        let tempData = response.data.data;
        routeDetails["routename"] = tempData["name"];
        let pickup_items = [];
        let drop_items = [];
        tempData["existing_pickup_route_plans"] = [];
        tempData["existing_drop_route_plans"] = [];
        tempData["pickup_routes"].map((data, index) => {
          data["students"] = [];
          data["selected"] = true;
          data["order"] = data["sequence"];
          marker_type["Pickup"] =
            data["area_details"]["area_type"] === 1 ? "area" : "student";
          data["address_detail"] = this.getFormattedAddress(
            data["area_details"]
          );
          data["area_details"]["name"] =
            data["area_details"]?.name ?? data["area_details"]?.address_one;
          data["distance"] =
            data["area_details"]?.name ?? data["area_details"]?.km;
          data["address_details"] = { area_details: data["area_details"] };
          data["location"] = {
            lat: parseFloat(data["area_details"]["latitude"]),
            lng: parseFloat(data["area_details"]["longitude"]),
          };
          if (data["pickup_time"]) {
            data["pickup_time"] = moment(data["pickup_time"], "HH:mm:ss");
          } else {
            data["pickup_time"] = null;
          }
          // data["pickup_time"] = moment(data["pickup_time"], "hh:mm:ss");
          data.users.map((user_data) => {
            user_data["student"]["user_student"] = user_data["id"];
            data["students"].push(user_data.student);
          });
          tempData.existing_pickup_route_plans.push(data["id"]);
          if (marker_type["Pickup"] === "student") {
            data.name =
              data.students.length > 1 ? data.students[0]["name"] : "";
          }
          pickup_items.push(data);
        });

        tempData["drop_routes"].map((data) => {
          data["students"] = [];
          data["selected"] = true;
          data["order"] = data["sequence"];
          marker_type["Drop"] =
            data["area_details"]["area_type"] === 1 ? "area" : "student";
          data["address_detail"] = this.getFormattedAddress(
            data["area_details"]
          );
          data["area_details"]["name"] =
            data["area_details"]?.name ?? data["area_details"]?.address_one;
          data["address_details"] = { area_details: data["area_details"] };
          data["location"] = {
            lat: parseFloat(data["area_details"]["latitude"]),
            lng: parseFloat(data["area_details"]["longitude"]),
          };
          if (data["drop_time"]) {
            data["drop_time"] = moment(data["drop_time"], "HH:mm:ss");
          } else {
            data["drop_time"] = null;
          }
          data["distance"] =
            data["area_details"]?.name ?? data["area_details"]?.km;
          data.users.map((user_data) => {
            user_data["student"]["user_student"] = user_data["id"];
            data["students"].push(user_data.student);
          });
          tempData.existing_drop_route_plans.push(data["id"]);
          if (marker_type["Drop"] === "student") {
            data.name =
              data.students.length > 1 ? data.students[0]["name"] : "";
          }
          drop_items.push(data);
        });
        tempData["vehicle_detail"].map((data) => {
          if (data?.assignment_type === 1) {
            routeDetails.pickupSelectedvehicle = data["vehicle"];
            routeDetails.oldPickupSelectedvehicle = data;
            vehicleList.pickup_list.unshift(data["vehicle"]);
          } else if (data?.assignment_type === 2) {
            routeDetails.dropSelectedvehicle = data["vehicle"];
            routeDetails.oldDropSelectedvehicle = data;
            vehicleList.drop_list.unshift(data["vehicle"]);
          }
        });
        this.setState({
          routeDetails,
          pickup_items,
          drop_items,
          marker_type,
          loading: false,
          editDetails: tempData,
          vehicleList,
        });
      }
    });
  };

  handleSelectRoute = (updated_list, marker_type_temp) => {
    this.setState({ loading: true }, () => {
      let { route_type, marker_type, pickup_items, drop_items } = this.state;
      let pickup_list = [];
      let drop_list = [];
  
      // pick existing items for merging
      let existing_list = route_type === "Pickup" ? pickup_items : drop_items;
  
      updated_list.forEach((data) => {
        if (data["selected"]) {
          let existing = existing_list.find(
            (item) => item.area_details?.id === data.area_details?.id
          );
  
          if (existing) {
            // preserve students and users
            data.students = existing.students || [];
            data.users = existing.users || [];
          } else {
            // initialize students if new area
            if (!data.students) data.students = [];
          }
  
          if (route_type === "Pickup") {
            if (!data["pickup_time"]) data["pickup_time"] = "";
            pickup_list.push(data);
          } else {
            if (!data["drop_time"]) data["drop_time"] = "";
            drop_list.push(data);
          }
        }
      });
  
      if (route_type === "Pickup") {
        this.setState({ pickup_items: pickup_list });
      } else {
        this.setState({ drop_items: drop_list });
      }
  
      marker_type[route_type] = marker_type_temp;
      this.setState({
        isEditRoutePlan: true,
        loading: false,
        marker_type,
      });
    });
  };
  

  changeToggle = (e, value) => {
    let { route_type, pickup_items, drop_items, marker_type } = this.state;
    if (route_type !== value && value) {
      let pick_up_to_drop_items = _.cloneDeep(pickup_items);
      let drop_up_to_pick_items = _.cloneDeep(drop_items);
      this.setState({ loading: true }, () => {
        if (value === "Drop" && drop_items.length === 0) {
          pick_up_to_drop_items.map((data) => {
            delete data["pickup_time"];
            delete data["id"];
            data["drop_time"] = "";
            marker_type["Drop"] =
              data["area_details"]["area_type"] === 1 ? "area" : "student";
          });
          pick_up_to_drop_items = pick_up_to_drop_items.reverse();
          this.setState({
            drop_items: [...pick_up_to_drop_items],
            marker_type,
          });
        } else if (pickup_items.length === 0) {
          drop_up_to_pick_items.map((data) => {
            delete data["drop_time"];
            delete data["id"];
            data["pickup_time"] = "";
            marker_type["Pickup"] =
              data["area_details"]["area_type"] === 1 ? "area" : "student";
          });
          drop_up_to_pick_items = drop_up_to_pick_items.reverse();
          this.setState({
            pickup_items: [...drop_up_to_pick_items],
            marker_type,
          });
        }
        this.setState({
          route_type: value,
          loading: false,
        });
      });
    }
  };

  handleChange = (e) => {
    let { name, value } = e.target;
    let { routeDetails } = this.state;
    routeDetails[name] = value;
    this.setState({
      routeDetails,
    });
  };

  getUnassignedStudentList = (index, areaData) => {
    let { year, studentList, route_type } = this.state;
    let params = {
      is_active: true,
      academic_year: year,
      unassigned_route: 1,
      area: areaData["id"],
      student_data: 1,
    };
    if (route_type === "Pickup") {
      params["pickup"] = true;
    } else {
      params["drop"] = true;
    }
    this.setState({ loadingStudentModal: true });
    getRequest(GET_URL.routeuseraddress.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          studentList = {};
          studentList = this.removeExistingStudentList(
            response.data.data,
            route_type
          );
          this.setState({ studentList, loadingStudentModal: false }, () => {
            this.studentModalRef.current.openModal(index, areaData["name"]);
          });
        }
      }
    );
  };

  removeExistingStudentList = (studentData, route_type) => {
    let { pickup_items, drop_items, removedPickStudents, removedDropStudents } =
      this.state;
    let existingStudentListIds = [];
    if (route_type === "Pickup") {
      pickup_items.forEach((item) => {
        item.students.forEach((studentData) => {
          existingStudentListIds.push(studentData["id"]);
        });
      });
      for (let i = 0; i < studentData.length; i++) {
        if (studentData[i]["id"] in removedPickStudents) {
          delete removedPickStudents[studentData[i]["id"]];
        }
        if (existingStudentListIds.includes(studentData[i]["id"])) {
          studentData.splice(i, 1);
          i--;
          continue; //when splice we wont get index
        }
      }
      if (Object.keys(removedPickStudents).length != 0) {
        for (let id in removedPickStudents) {
          studentData.push(removedPickStudents[id]);
        }
      }
    } else {
      drop_items.forEach((item) => {
        item.students.forEach((studentData) => {
          existingStudentListIds.push(studentData["id"]);
        });
      });
      for (let i = 0; i < studentData.length; i++) {
        if (studentData[i]["id"] in removedDropStudents) {
          delete removedDropStudents[studentData[i]["id"]];
        }
        if (existingStudentListIds.includes(studentData[i]["id"])) {
          studentData.splice(i, 1);
          i--;
          continue; //when splice we wont get index
        }
      }
      if (Object.keys(removedDropStudents).length != 0) {
        for (let id in removedDropStudents) {
          studentData.push(removedDropStudents[id]);
        }
      }
    }

    return studentData;
  };

  addStudentDataToList = (itemIndex, studentData) => {
    let {
      pickup_items,
      drop_items,
      removedPickStudents,
      removedDropStudents,
      route_type,
    } = this.state;
    studentData["newly_added"] = true;
    if (route_type === "Pickup") {
      let studentMergedData =
        pickup_items[itemIndex]["students"].concat(studentData);
      studentData.map((rowData) => {
        if (rowData["id"] in removedPickStudents) {
          delete removedPickStudents[rowData["id"]];
        }
      });
      pickup_items[itemIndex]["students"] = studentMergedData;
      this.setState(
        {
          pickup_items,
        },
        () => {
          this.setState({ studentList: [] });
        }
      );
    } else {
      let studentMergedData =
        drop_items[itemIndex]["students"].concat(studentData);
      studentData.map((rowData) => {
        if (rowData["id"] in removedDropStudents) {
          delete removedDropStudents[rowData["id"]];
        }
      });
      drop_items[itemIndex]["students"] = studentMergedData;
      this.setState(
        {
          drop_items,
        },
        () => {
          this.setState({ studentList: [] });
        }
      );
    }
  };

  removeStudentData = (itemIndex, studentIndex) => {
    let {
      pickup_items,
      drop_items,
      route_type,
      removedPickStudents,
      removedDropStudents,
      removedPickStudentIds,
      removedDropStudentIds,
    } = this.state;
    if (route_type === "Pickup") {
      removedPickStudents[
        pickup_items[itemIndex].students[studentIndex]["id"]
      ] = pickup_items[itemIndex].students[studentIndex];
      if (
        pickup_items[itemIndex].users &&
        pickup_items[itemIndex].users[studentIndex] &&
        !("newly_added" in pickup_items[itemIndex]?.users[studentIndex])
      ) {
        removedPickStudentIds.push(
          pickup_items[itemIndex].users[studentIndex]?.pickup_user_mapping_id
        );
      }
      pickup_items[itemIndex].students.splice(studentIndex, 1);
      if (pickup_items[itemIndex].users) {
        pickup_items[itemIndex].users.splice(studentIndex, 1);
      }
      this.setState({
        pickup_items,
        removedPickStudents,
        removedPickStudentIds,
      });
    } else {
      removedDropStudents[drop_items[itemIndex]?.students[studentIndex]["id"]] =
        drop_items[itemIndex].students[studentIndex];
      if (!("newly_added" in drop_items[itemIndex].students[studentIndex])) {
        removedDropStudentIds.push(
          drop_items[itemIndex].users[studentIndex]?.drop_user_mapping_id
        );
      }
      drop_items[itemIndex].students.splice(studentIndex, 1);
      drop_items[itemIndex].users.splice(studentIndex, 1);
      this.setState({
        drop_items,
        removedDropStudents,
        removedDropStudentIds,
      });
    }
  };

  handleDropDownWithSearchChange = (name, newValue) => {
    let { fieldErrors, routeDetails } = this.state;
    delete fieldErrors[name];
    routeDetails[name] = newValue;
    this.setState({
      routeDetails,
      fieldErrors,
    });
  };

  onDragEnd = (result) => {
    const { route_type, pickup_items, drop_items } = this.state;
    if (!result.destination) {
      return;
    }
    if (route_type === "Pickup") {
      const items = reorder(
        pickup_items,
        result.source.index,
        result.destination.index
      );
      this.setState({
        pickup_items: [...items],
      });
    } else {
      const items = reorder(
        drop_items,
        result.source.index,
        result.destination.index
      );
      this.setState({
        drop_items: [...items],
      });
    }
  };

  changepickupdroptime = (e, itemIndex, validate) => {
    let { route_type, pickup_items, drop_items } = this.state;
    if (route_type === "Pickup") {
      pickup_items[itemIndex]["pickup_time"] = e;
    } else {
      drop_items[itemIndex]["drop_time"] = e;
    }
    if (validate) {
      if (this.validteTime()) {
        this.setState({
          pickup_items,
          drop_items,
        });
      }
    } else {
      this.setState({
        pickup_items,
        drop_items,
      });
    }
  };

  validteTime = () => {
    let { route_type } = this.state;
    let return_data = true;
    if (route_type === "Pickup") {
      return_data = this.validatePickupTiming();
    } else {
      return_data = this.validateDropTiming();
    }
    return return_data;
  };

  validatePickupTiming = () => {
    return true; //removing the validation
    let { pickup_items, errors } = this.state;
    errors = {};
    let pickupTimeList = [];
    let trackPickupTime = 0;
    for (let areaIndex = 0; areaIndex < pickup_items.length; areaIndex++) {
      if (!!pickup_items[areaIndex]["pickup_time"]) {
        pickupTimeList.push(pickup_items[areaIndex]["pickup_time"]);
      }
    }
    pickupTimeList = pickupTimeList.sort();

    for (let index = 0; index < pickup_items.length; index++) {
      let item = pickup_items[index];
      if (item["pickup_time"]) {
        if (item["pickup_time"] != pickupTimeList[trackPickupTime]) {
          errors[index] = {
            pickup_time: `Pickup time should be greater than coming stops ${timeFormat(
              pickupTimeList[trackPickupTime]
            )}`,
          };
          break;
        }
        trackPickupTime++;
      }
    }
    this.setState({ errors: errors });
    if (Object.keys(errors).length > 0) {
      return false;
    }
    return true;
  };

  validateDropTiming = () => {
    let { drop_items, errors } = this.state;
    errors = {};
    let dropTimeList = [];
    for (let areaIndex = 0; areaIndex < drop_items.length; areaIndex++) {
      if (!!drop_items[areaIndex]["drop_time"]) {
        dropTimeList.push(drop_items[areaIndex]["drop_time"]);
      }
    }
    dropTimeList = dropTimeList.sort();
    let trackDropTime = 0;
    for (let index = 0; index < drop_items.lengthKeyboardTimePicker; index++) {
      let item = drop_items[index];
      if (item["drop_time"]) {
        if (item["drop_time"] != dropTimeList[trackDropTime]) {
          errors[index] = {
            drop_time: `Drop time should be greater than coming stops ${timeFormat(
              dropTimeList[trackDropTime]
            )}`,
          };
          break;
        }
        trackDropTime++;
      }
    }

    this.setState({ errors: errors });
    if (Object.keys(errors).length > 0) {
      return false;
    }
    return true;
  };

  submit = () => {
    let response = this.validateAndFormatData();
    if (response["Result"]) {
      let postData = response["post_data"];
      const url = POST_URL.route.api;
      postRequest(url, postData).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          }).then(this.goToViewPage());
        }
      });
    } else {
      this.setSnackBardata(response["Reason"]);
    }
  };

  setSnackBardata = (alertData, errorStatus = "error") => {
    this.setState({
      alertData,
      errorStatus,
      openSnackbar: true,
    });
  };

  validateAndFormatData = () => {
    this.setState({
      errors: {},
    });
    let returnResponse = { Result: true, post_data: {} };
    let {
      pickup_items,
      drop_items,
      institute_address,
      editDetails,
      routeDetails,
      errors,
      year,
      isEdit,
      intialAreaListKeyValue,
    } = this.state;
    let tempAreaData = {};
    let pickup_routes = [];
    let drop_routes = [];
    errors = {};
    returnResponse["post_data"]["delete_pickup_routes"] = editDetails[
      "existing_pickup_route_plans"
    ]
      ? editDetails["existing_pickup_route_plans"]
      : [];
    returnResponse["post_data"]["delete_drop_routes"] = editDetails[
      "existing_drop_route_plans"
    ]
      ? editDetails["existing_drop_route_plans"]
      : [];
    returnResponse["post_data"]["vehicle_assignment_detail"] = [];
    if (!!!routeDetails.routename) {
      errors["routename"] = "Route Name is Mandatory";
      returnResponse["Result"] = false;
      returnResponse["Reason"] = "Route name is mandatory";
    }
    if (!!routeDetails.routename) {
      let index = "";
      for (let areaIndex = 0; areaIndex < pickup_items.length; areaIndex++) {
        errors[areaIndex] = {};
        // if (!pickup_items[areaIndex]["pickup_time"]) {
        //   errors[areaIndex][
        //     "pickup_time"
        //   ] = `Pickup time is mandatory in ${pickup_items[areaIndex]["area_details"]["name"]}`;
        //   returnResponse["Reason"] =
        //     Object.keys(errors[areaIndex]).length > 1
        //       ? "Clear all error(s)"
        //       : `Pickup time is mandatory in ${pickup_items[areaIndex]["area_details"]["name"]}`;
        //   returnResponse["Result"] = false;
        // }
        if (
          isEdit &&
          returnResponse["post_data"]["delete_pickup_routes"].includes(
            pickup_items[areaIndex]["id"]
          )
        ) {
          index = returnResponse["post_data"]["delete_pickup_routes"].findIndex(
            (data) => data === pickup_items[areaIndex]["id"]
          );
          returnResponse["post_data"]["delete_pickup_routes"].splice(index, 1);
        }
      }
      for (let areaIndex = 0; areaIndex < drop_items.length; areaIndex++) {
        errors[areaIndex] = {};
        if (!drop_items[areaIndex]["drop_time"]) {
          errors[areaIndex][
            "drop_time"
          ] = `Drop time is mandatory in ${drop_items[areaIndex]["area_details"]["name"]}`;
          returnResponse[
            "Reason"
          ] = `Drop time is mandatory in ${drop_items[areaIndex]["area_details"]["name"]}`;
          returnResponse["Result"] = false;
        }
        if (
          isEdit &&
          returnResponse["post_data"]["delete_drop_routes"].includes(
            drop_items[areaIndex]["id"]
          )
        ) {
          index = returnResponse["post_data"]["delete_drop_routes"].findIndex(
            (data) => data === drop_items[areaIndex]["id"]
          );
          returnResponse["post_data"]["delete_drop_routes"].splice(index, 1);
        }
      }
    }
    if (returnResponse["Result"]) {
      let tempDuplicateStudentIds = [];
      let tempStudentData = {};
      if (isEdit) {
        returnResponse["post_data"]["id"] = this.props.location.state.detail;
        returnResponse["post_data"]["delete_route_user_pickup_mapping"] =
          this.state.removedPickStudentIds;
        returnResponse["post_data"]["delete_route_user_drop_mapping"] =
          this.state.removedDropStudentIds;
      }
      returnResponse["post_data"]["name"] = routeDetails.routename;
      returnResponse["post_data"]["institute_address"] = institute_address.id;
      returnResponse["post_data"]["academic_year"] = year;
      loop1: for (
        let areaIndex = 0;
        areaIndex < pickup_items.length;
        areaIndex++
      ) {
        tempAreaData = {};
        tempAreaData["sequence"] = areaIndex + 1;
        if (pickup_items[areaIndex]["id"]) {
          tempAreaData["id"] = pickup_items[areaIndex]["id"];
        }
        tempAreaData["area"] = pickup_items[areaIndex]["area_details"]["id"];
        if (pickup_items[areaIndex]["area_details"]) {
          returnResponse["post_data"]["destination"] =
            pickup_items[areaIndex]["area_details"]["name"];
        } else {
          returnResponse["post_data"]["destination"] =
            intialAreaListKeyValue[pickup_items[areaIndex]["area"]];
        }
        if (pickup_items[areaIndex]["pickup_time"]) {
          tempAreaData["pickup_time"] = dateFormat(
            pickup_items[areaIndex]["pickup_time"],
            "HH:mm:ss"
          );
        } else {
          tempAreaData["pickup_time"] = null; // or "" if your API allows
        }
        tempAreaData["users"] = [];
        for (
          let studentIndex = 0;
          studentIndex < pickup_items[areaIndex]["students"].length;
          studentIndex++
        ) {
          tempStudentData = pickup_items[areaIndex]["students"][studentIndex];
          tempAreaData["users"].push(tempStudentData["user_student"]);
          if (
            tempDuplicateStudentIds.includes(tempStudentData["user_student"])
          ) {
            returnResponse[
              "Reason"
            ] = `Duplicate Student Data - ${tempStudentData["name"]} in ${pickup_items[areaIndex]["area_details"]["name"]}`;
            returnResponse["Result"] = false;
            break loop1;
          }
          tempDuplicateStudentIds.push(tempStudentData["user_student"]);
        }
        pickup_routes.push(tempAreaData);
      }
      let temp_pick_vehicle = {};
      temp_pick_vehicle["assignment_type"] = 1;
      temp_pick_vehicle["vehicle"] = routeDetails.pickupSelectedvehicle?.id;
      if (isEdit && routeDetails.oldPickupSelectedvehicle?.vehicle) {
        temp_pick_vehicle["id"] = routeDetails.oldPickupSelectedvehicle.id;
      }
      returnResponse["post_data"]["vehicle_assignment_detail"].push(
        temp_pick_vehicle
      );
      loop1: for (
        let areaIndex = 0;
        areaIndex < drop_items.length;
        areaIndex++
      ) {
        tempAreaData = {};
        tempAreaData["sequence"] = areaIndex + 1;
        if (drop_items[areaIndex]["id"]) {
          tempAreaData["id"] = drop_items[areaIndex]["id"];
        }
        tempAreaData["area"] = drop_items[areaIndex]["area_details"]["id"];
        if (drop_items[areaIndex]["area_details"]) {
          returnResponse["post_data"]["destination"] =
            drop_items[areaIndex]["area_details"]["name"];
        } else {
          returnResponse["post_data"]["destination"] =
            intialAreaListKeyValue[drop_items[areaIndex]["area"]];
        }
        if (drop_items[areaIndex]["drop_time"]) {
          tempAreaData["drop_time"] = dateFormat(
            drop_items[areaIndex]["drop_time"],
            "HH:mm:ss"
          );
        } else {
          tempAreaData["drop_time"] = null; // safe default
        }

        tempAreaData["users"] = [];
        tempDuplicateStudentIds = [];
        for (
          let studentIndex = 0;
          studentIndex < drop_items[areaIndex]["students"].length;
          studentIndex++
        ) {
          tempStudentData = drop_items[areaIndex]["students"][studentIndex];
          tempAreaData["users"].push(tempStudentData["user_student"]);
          if (
            tempDuplicateStudentIds.includes(tempStudentData["user_student"])
          ) {
            returnResponse[
              "Reason"
            ] = `Duplicate Student Data - ${tempStudentData["name"]} in ${drop_items[areaIndex]["area_details"]["name"]}`;
            returnResponse["Result"] = false;
            break loop1;
          }
          tempDuplicateStudentIds.push(tempStudentData["user_student"]);
        }
        drop_routes.push(tempAreaData);
      }
      if (routeDetails?.dropSelectedvehicle?.id) {
        temp_pick_vehicle = {};
        temp_pick_vehicle["assignment_type"] = 2;
        temp_pick_vehicle["vehicle"] = routeDetails.dropSelectedvehicle.id;
        if (isEdit && routeDetails.oldDropSelectedvehicle?.vehicle) {
          temp_pick_vehicle["id"] = routeDetails.oldDropSelectedvehicle.id;
        }
        returnResponse["post_data"]["vehicle_assignment_detail"].push(
          temp_pick_vehicle
        );
      }
    }
    if (
      returnResponse["Result"] &&
      pickup_items.length === 0 &&
      drop_items.length === 0
    ) {
      returnResponse["Result"] = false;
      returnResponse["Result"] = "No Data to Save";
    }
    returnResponse["post_data"]["pickup_routes"] = pickup_routes;
    returnResponse["post_data"]["drop_routes"] = drop_routes;
    if (Object.keys(errors).length > 0) {
      this.setState({ errors: errors });
    }
    return returnResponse;
  };

  goToViewPage = () => {
    const { institute_address } = this.state;
    let sectionInformation = {
      selected_address: institute_address.id,
    };
    let searchParam = "?" + new URLSearchParams(sectionInformation).toString();
    this.props.history.push({
      pathname: Actions.transport_route_map.view.url,
      search: searchParam,
    });
  };

  removeArea = (index, route_type) => {
    let { pickup_items, drop_items } = this.state;
    if (route_type === "Pickup") {
      pickup_items.splice(index, 1);
    } else {
      drop_items.splice(index, 1);
    }
    this.setState({
      pickup_items,
      drop_items,
    });
  };

  render() {
    const {
      route_type,
      lat_lng,
      subheading,
      yearName,
      update_list,
      isView,
      routeDetails,
      errors,
      vehicleList,
      pickup_items,
      isDraggable,
      loading,
      loadingStudentModal,
      isEditRoutePlan,
      marker_type,
      fieldErrors,
      institute_address,
      year,
      drop_items,
      isEdit,
    } = this.state;
    let displayRouteSummary = "none";
    let selected_items = route_type === "Pickup" ? pickup_items : drop_items;
    const { classes } = this.props;
    if (loading) {
      return (
        <Box>
          {" "}
          <LoadingGif />{" "}
        </Box>
      );
    } else {
      return (
        <Paper className="paper-background">
          <Box>
            <Grid container className="">
              <Grid item md={6} xs={12} sm={12} className="header-align">
                <Box className="heading">
                  {isView ? (
                    <div>View Route Planning</div>
                  ) : (
                    <div>Create Route Planning</div>
                  )}
                </Box>
                <Box className="sub-heading">{subheading}</Box>
                <Box className="year-std-box mr-40">
                  <Box className="academic-std-head "> Academic Year</Box>
                  <Box className="aca-std-white-background">{yearName}</Box>
                </Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className="header-align end-flex-prop">
                  {isUserHasPermission("transport_route_map", "view") && (
                    <Button
                      variant="contained"
                      onClick={this.goToViewPage}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.transport_route_map.view.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Grid container justifyContent="center">
              <Grid item md={4} xs={12}>
                <Box className="mt-20">
                  <Paper className="width-fit-content">
                    <TextField
                      id="route-name"
                      label="Route Name"
                      name="routename"
                      autoComplete="off"
                      value={routeDetails.routename}
                      className="width-300px"
                      variant="outlined"
                      inputProps={{ maxLength: 50 }}
                      helperText={
                        errors["routename"] ? errors["routename"] : ""
                      }
                      error={errors["routename"] ? true : false}
                      onChange={(e) => this.handleChange(e)}
                      required
                      size="small"
                      disabled={isView}
                    />
                  </Paper>
                </Box>
              </Grid>
              <Grid item md={3} xs={12}>
                <Box className="mt-20 text-align-right">
                  <ToggleButtonGroup
                    size="medium"
                    value={route_type}
                    exclusive
                    onChange={this.changeToggle}
                    style={{ backgroundColor: "white" }}
                  >
                    <ToggleButton
                      key={1}
                      value="Pickup"
                      className={
                        route_type == "Pickup"
                          ? "selected-transaction-type"
                          : "not-selected-transaction-type"
                      }
                    >
                      Pickup
                    </ToggleButton>
                    <ToggleButton
                      key={2}
                      value="Drop"
                      className={
                        route_type == "Drop"
                          ? "selected-transaction-type"
                          : "not-selected-transaction-type"
                      }
                    >
                      Drop
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Grid>
            </Grid>

            <Grid container justifyContent="center">
              <Grid item md={7} xs={12}>
                <Paper className="paper-plain-background mt-20 min-height-58vh">
                  {/* {route_type === 'Drop' ? 'Ride start from school' : 'Ride ends at school'} */}
                  <Grid container className="mt-20">
                    <Grid item md={6} xs={12}>
                      {!update_list && !isView && (
                        <GoogleMapDrawLineLoader
                          lat_lng={lat_lng}
                          googleMapURL={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=drawing`}
                          loadingElement={<div style={{ height: `100%` }} />}
                          selected_items={selected_items}
                          handleSelectRoute={this.handleSelectRoute}
                          route_type={route_type}
                          isEditRoutePlan={isEditRoutePlan}
                          isEdit={isEdit}
                          marker_type={marker_type}
                          institute_address={institute_address}
                          year={year}
                        />
                      )}
                    </Grid>
                    <Grid item md={6} xs={12}>
                      {/* <Dropdown
                                            data={vehicleList}
                                            name='pickupSelectedvehicle'
                                            value={routeDetails.pickupSelectedvehicle}
                                            onChange={this.handleChange}
                                            label='Assign vehicle'
                                            fullWidth
                                            hideSelect={true}
                                        /> */}
                      {route_type === "Pickup" ? (
                        <DropDownWithSearch
                          id="combo-box-demo"
                          options={vehicleList?.pickup_list}
                          value={routeDetails.pickupSelectedvehicle}
                          onChange={(e, newValue) =>
                            this.handleDropDownWithSearchChange(
                              "pickupSelectedvehicle",
                              newValue
                            )
                          }
                          name="pickupSelectedvehicle"
                          label={"Assign vehicle"}
                          // className='width-100'
                          fullWidth
                          helperText={
                            fieldErrors["pickupSelectedvehicle"] &&
                            fieldErrors["pickupSelectedvehicle"]
                          }
                          error={
                            fieldErrors["pickupSelectedvehicle"] &&
                            fieldErrors["pickupSelectedvehicle"]
                          }
                          required
                          size="small"
                          disabled={isView}
                        />
                      ) : (
                        <DropDownWithSearch
                          id="combo-box-demo"
                          options={vehicleList.drop_list}
                          value={routeDetails.dropSelectedvehicle}
                          onChange={(e, newValue) =>
                            this.handleDropDownWithSearchChange(
                              "dropSelectedvehicle",
                              newValue
                            )
                          }
                          name="dropSelectedvehicle"
                          label={"Assign vehicle"}
                          // className='width-100'
                          fullWidth
                          helperText={
                            fieldErrors["dropSelectedvehicle"] &&
                            fieldErrors["dropSelectedvehicle"]
                          }
                          error={
                            fieldErrors["dropSelectedvehicle"] &&
                            fieldErrors["dropSelectedvehicle"]
                          }
                          required
                          size="small"
                          disabled={isView}
                        />
                      )}
                    </Grid>
                  </Grid>
                  {selected_items.length > 0 && (
                    <div className="mt-20">
                      <DragDropContext onDragEnd={this.onDragEnd}>
                        <Droppable droppableId="droppable">
                          {(provided, snapshot) => (
                            <div
                              {...provided.droppableProps}
                              ref={provided.innerRef}
                              style={getListStyle(snapshot.isDraggingOver)}
                              className="p-25"
                            >
                              {selected_items.map((item, index) => (
                                <Draggable
                                  key={"key_" + index}
                                  draggableId={"item_" + index}
                                  index={index}
                                  isDragDisabled={!isDraggable}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      style={getItemStyle(
                                        snapshot.isDragging,
                                        provided.draggableProps.style
                                      )}
                                      className="position-relative"
                                    >
                                      <Box
                                        position="absolute"
                                        style={{
                                          left: "-5px",
                                          color: "#c3bfbf",
                                          top: 0,
                                          cursor: "grabbing",
                                        }}
                                      >
                                        <DragIndicatorIcon />
                                      </Box>
                                      {(index != selected_items.length - 1 ||
                                        selected_items.length == 1) && (
                                        <div className="float-right route-mapping-source-background">
                                          {"Stop" + (parseInt(index) + 1)}
                                        </div>
                                      )}
                                      {index == selected_items.length - 1 &&
                                        selected_items.length > 1 && (
                                          <div className="float-right route-mapping-source-background">
                                            {" "}
                                            Destination
                                          </div>
                                        )}
                                      <div className="ml-5">
                                        <Box display="flex">
                                          <div className="area-head-heading">
                                            {" "}
                                            {item["area_details"]["name"]}{" "}
                                          </div>
                                          <LocationOnOutlinedIcon className="fs-18" />
                                        </Box>
                                        <Box
                                          mb={2}
                                          className="student-list-route-plan"
                                        >
                                          {item.students.map(
                                            (studentData, studentIndex) => {
                                              return (
                                                <Box
                                                  mt={1}
                                                  mr={2}
                                                  key={studentIndex}
                                                >
                                                  {isView ? (
                                                    <Chip
                                                      avatar={
                                                        <Avatar
                                                          alt="Natacha"
                                                          src=""
                                                        />
                                                      }
                                                      // label={getFullName(studentData.first_name, studentData.middle_name, studentData.last_name)}
                                                      label={studentData.name}
                                                      variant="outlined"
                                                      className="mr-13"
                                                    />
                                                  ) : (
                                                    <Chip
                                                      avatar={
                                                        <Avatar
                                                          alt="Natacha"
                                                          src=""
                                                        />
                                                      }
                                                      // label={getFullName(studentData.first_name, studentData.middle_name, studentData.last_name)}
                                                      label={studentData.name}
                                                      variant="outlined"
                                                      className="mr-13"
                                                      onDelete={() =>
                                                        this.removeStudentData(
                                                          index,
                                                          studentIndex
                                                        )
                                                      }
                                                    />
                                                  )}{" "}
                                                </Box>
                                              );
                                            }
                                          )}
                                        </Box>
                                        {!isView ? (
                                          <>
                                            <Divider />
                                            <Box
                                              className="routeplan-card-bottom"
                                              style={{ placeItems: "center" }}
                                            >
                                              <PersonAddIcon
                                                onClick={() =>
                                                  this.getUnassignedStudentList(
                                                    index,
                                                    item["area_details"]
                                                  )
                                                }
                                                className="pointer"
                                              />
                                              <Box
                                                ml={2}
                                                className="width-fit-content"
                                              >
                                                {route_type === "Drop" ? (
                                                  <>
                                                    <MuiPickersUtilsProvider
                                                      utils={DateFnsUtils}
                                                    >
                                                      <KeyboardTimePicker
                                                        label="Drop Time"
                                                        value={item.drop_time}
                                                        onChange={(e) =>
                                                          this.changepickupdroptime(
                                                            e,
                                                            index
                                                          )
                                                        }
                                                        onBlur={(e) =>
                                                          this.changepickupdroptime(
                                                            e,
                                                            index,
                                                            true
                                                          )
                                                        }
                                                        onClose={
                                                          this
                                                            .validateDropTiming
                                                        }
                                                        error={
                                                          errors[index] &&
                                                          errors[index][
                                                            "drop_time"
                                                          ]
                                                            ? true
                                                            : false
                                                        }
                                                        InputLabelProps={{
                                                          shrink: item.drop_time
                                                            ? true
                                                            : false,
                                                        }}
                                                        name="drop_time"
                                                        KeyboardButtonProps={{
                                                          "aria-label":
                                                            "Change time",
                                                        }}
                                                        inputProps={{
                                                          readOnly: true,
                                                        }}
                                                        helperText=""
                                                      />
                                                    </MuiPickersUtilsProvider>
                                                    {/* <TextField
                                                                                                        id="time"
                                                                                                        label=""
                                                                                                        type="time" 
                                                                                                        ampm={true}
                                                                                                        name='drop_time'
                                                                                                        defaultValue={item.drop_time}
                                                                                                        onChange={(e) => this.changepickupdroptime(e, index)}
                                                                                                        onBlur={(e) => this.changepickupdroptime(e, index, true)}
                                                                                                        onClose={(e) => this.changepickupdroptime(e, index)}
                                                                                                        InputLabelProps={{
                                                                                                            shrink: true,
                                                                                                        }}
                                                                                                        inputProps={{
                                                                                                            step: 300, // 5 min
                                                                                                        }}
                                                                                                        helperText='Drop time'
                                                                                                        error={(errors[index] && errors[index]['drop_time']) ? true : false}
                                                                                                    /> */}
                                                    {errors[index] &&
                                                      errors[index][
                                                        "drop_time"
                                                      ] && (
                                                        <Tooltip
                                                          title={
                                                            errors[index][
                                                              "drop_time"
                                                            ]
                                                          }
                                                          enterDelay={400}
                                                          enterNextDelay={400}
                                                          placement="top-start"
                                                          classes={{
                                                            tooltip:
                                                              "tooltip-show-data",
                                                          }}
                                                        >
                                                          <InfoIcon className="time-table-info-icon cursor-pointer" />
                                                        </Tooltip>
                                                      )}
                                                  </>
                                                ) : (
                                                  <>
                                                    <MuiPickersUtilsProvider
                                                      utils={DateFnsUtils}
                                                    >
                                                      <KeyboardTimePicker
                                                        label="Pickup Time"
                                                        value={item.pickup_time}
                                                        onChange={(e) =>
                                                          this.changepickupdroptime(
                                                            e,
                                                            index
                                                          )
                                                        }
                                                        onBlur={(e) =>
                                                          this.changepickupdroptime(
                                                            e,
                                                            index,
                                                            true
                                                          )
                                                        }
                                                        onClose={
                                                          this
                                                            .validatePickupTiming
                                                        }
                                                        error={
                                                          errors[index] &&
                                                          errors[index][
                                                            "pickup_time"
                                                          ]
                                                            ? true
                                                            : false
                                                        }
                                                        InputLabelProps={{
                                                          shrink:
                                                            item.pickup_time
                                                              ? true
                                                              : false,
                                                        }}
                                                        name="pickup_time"
                                                        KeyboardButtonProps={{
                                                          "aria-label":
                                                            "Change time",
                                                        }}
                                                        inputProps={{
                                                          readOnly: true,
                                                        }}
                                                        helperText=""
                                                      />
                                                    </MuiPickersUtilsProvider>
                                                    {/* 
                                                                                                    <TextField
                                                                                                        id="time"
                                                                                                        label=""
                                                                                                        type="time"
                                                                                                        name='pickup_time'
                                                                                                        ampm={true}
                                                                                                        defaultValue={item.pickup_time}
                                                                                                        onChange={(e) => this.changepickupdroptime(e, index)}
                                                                                                        onBlur={(e) => this.changepickupdroptime(e, index, true)}
                                                                                                        onClose={(e) => this.changepickupdroptime(e, index)}
                                                                                                        InputLabelProps={{
                                                                                                            shrink: true,
                                                                                                        }}
                                                                                                        inputProps={{
                                                                                                            step: 300, // 5 min
                                                                                                        }}
                                                                                                        className='ml-20'
                                                                                                        helperText='Pickup time'
                                                                                                        error={(errors[index] && errors[index]['pickup_time']) ? true : false}
                                                                                                    /> */}
                                                    {errors[index] &&
                                                      errors[index][
                                                        "pickup_time"
                                                      ] && (
                                                        <Tooltip
                                                          title={
                                                            errors[index][
                                                              "pickup_time"
                                                            ]
                                                          }
                                                          enterDelay={400}
                                                          enterNextDelay={400}
                                                          placement="top-start"
                                                          classes={{
                                                            tooltip:
                                                              "tooltip-show-data",
                                                          }}
                                                        >
                                                          <InfoIcon className="time-table-info-icon cursor-pointer" />
                                                        </Tooltip>
                                                      )}
                                                  </>
                                                )}
                                              </Box>
                                              <DeleteOutlineIcon
                                                onClick={() =>
                                                  this.removeArea(
                                                    index,
                                                    route_type
                                                  )
                                                }
                                                className="margin-left-auto error-content pointer"
                                              />
                                            </Box>
                                          </>
                                        ) : (
                                          <>
                                            <Box display="flex">
                                              {route_type === "Pickup" ? (
                                                <Box mr={2}>
                                                  <b>Pickup Time: </b>
                                                  {dateFormat(
                                                    item.pickup_time,
                                                    "hh:mm A"
                                                  )}
                                                </Box>
                                              ) : (
                                                <Box mr={2}>
                                                  <b>Pickup Time: </b>
                                                  {dateFormat(
                                                    item.drop_time,
                                                    "hh:mm A"
                                                  )}
                                                </Box>
                                              )}
                                            </Box>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </div>
                  )}
                  <Box display={displayRouteSummary}>
                    <DirectionsBusIcon />
                    <Box className="map-list-outer-box" mb={2}>
                      {selected_items.map((data, index) => {
                        return (
                          <Box display="flex" alignItems="center" key={index}>
                            <Box className="arrow-right"> </Box>
                            {/* <Box ml={2}>{data['area_details']['name']}</Box> */}
                          </Box>
                        );
                      })}
                    </Box>
                    <OutlinedFlagSharpIcon />
                  </Box>

                  {!isView && (
                    <Box className="submt-button-float-bottom">
                      <Button
                        variant="contained"
                        color="primary"
                        className="submit"
                        disabled={this.state.submitDisable}
                        onClick={() => this.submit()}
                      >
                        Submit &nbsp;{" "}
                      </Button>
                    </Box>
                  )}
                  <AssignStudentModal
                    ref={this.studentModalRef}
                    studentList={this.state.studentList}
                    addStudentDataToList={this.addStudentDataToList}
                  />
                  <Backdrop
                    className={classes.backdrop}
                    open={loadingStudentModal}
                  >
                    <CircularProgress color="inherit" />
                  </Backdrop>
                </Paper>
              </Grid>
              {/* <Grid item md={4} xs={12}>
                            <Paper className="paper-plain-background pv-20 mt-20 height-55vh">

                            </Paper>
                        </Grid> */}
            </Grid>
            <Grid container justify="center">
              <Grid item xl={6} lg={8} md={9} sm={12} className="dropable-card">
                {/* <Box fontWeight="bold">
										Bus Stops
									</Box> */}
              </Grid>
            </Grid>
          </Box>
        </Paper>
      );
    }
  }
}

export default withRouter(withStyles(styles)(GoogleRoutePlan));
