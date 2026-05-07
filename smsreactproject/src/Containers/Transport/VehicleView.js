import React, { Component } from "react";
import { Link, withRouter } from "react-router-dom";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import { Grid, Paper, Box, Button, CircularProgress } from "@material-ui/core";
import Swal from "sweetalert2";
import AllMUIDataTable from "Components/AllMUIDataTable";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";

import { getRequest, postRequest, deleteRequest } from "Includes/api/apicall";
import { Actions } from "Constants/permissions";
import { isUserHasPermission, getFormatMessage } from "Includes/functions";
import { GET_URL, POST_URL, DEL_URL } from "Includes/urls";
import StudentListActions from "Includes/StudentListActions";
import loadingBar from "images/loading.gif";
import classNames from "classnames";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";
import "./styles.scss";

class VehicleView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      vehicles: null,
      tableUpdating: false,
    };
    this.columns = [
      {
        name: "name",
        label: <FormattedMessage {...commonMessages.name} />,
        options: {
          filter: true,
          sort: true,
        },
      },
      {
        name: "vehicle_num",
        label: <FormattedMessage {...messages.vehicleNumber} />,
        options: {
          filter: true,
          sort: false,
        },
      },
      {
        name: "vehicle_code",
        label: <FormattedMessage {...messages.vehicleCode} />,
        options: {
          filter: true,
          sort: false,
        },
      },
      {
        name: "model",
        label: <FormattedMessage {...messages.model} />,
        options: {
          filter: true,
          sort: false,
        },
      },
      {
        name: "manufacturer",
        label: <FormattedMessage {...messages.manufacturer} />,
        options: {
          filter: true,
          sort: false,
        },
      },
      {
        name: "seat_capacity",
        label: <FormattedMessage {...messages.capacity} />,
        options: {
          filter: true,
          sort: true,
        },
      },
      {
        name: "id",
        label: "id",
        options: {
          filter: true,
          sort: true,
          display: false,
          donwload: false,
        },
      },
      {
        name: "Actions",
        label: <FormattedMessage {...commonMessages.actions} />,
        options: {
          display: this.updatePermissions("display"),
          filter: false,
          sort: false,
          download: false,
          customBodyRender: (value, tableMeta, updateValue) => {
            return (
              <div>
                <StudentListActions
                  id={tableMeta.rowData[6]}
                  index={tableMeta.rowIndex}
                  deleteStudent={this.deleteVehicle}
                  editURL={Actions.transport_vehicle.update.url}
                  viewURL={Actions.transport_vehicle.view.url}
                  enabledActions={["edit", "delete", "sync"]}
                  handleActive={this.handleActive}
                />
              </div>
            );
          },
        },
      },
    ];
  }

  handleActive = (id) => {
    let { vehicles } = this.state;
    this.setState({ tableUpdating: true, vehicles: [...vehicles] });
    let post_data = {
      vehicle_id: id,
    };
    let postUrl = POST_URL.routedetailsgps.api;
    postRequest(postUrl, post_data, this.props).then((response) => {
      if (response && response.status === 200) {
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
      }
      this.setState({ tableUpdating: false });
    });
  };

  componentDidMount() {
    this.fetchVehicles();
  }

  deleteVehicle = (id, index) => {
    let url = `${DEL_URL.vehicle.api}${id}/`;
    let { vehicles } = this.state;
    deleteRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        vehicles.splice(index, 1);
        this.setState({
          vehicles: [...vehicles],
        });
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
  };

  fetchVehicles = () => {
    const params = { is_active: true };
    getRequest(GET_URL.vehicle.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let vehicles = response.data.data;
        this.setState({ vehicles });
      }
    });
  };

  updatePermissions = (name) => {
    let test = true;
    const hasEditPermission = isUserHasPermission(
      "transport_vehicle",
      "update"
    );
    const hasSyncPermission = isUserHasPermission(
      "transport_vehicle_sync",
      "post"
    );
    const hasDeletePermission = isUserHasPermission(
      "transport_vehicle",
      "delete"
    );
    let permissions = [];
    let enabledActions = [];
    if (hasEditPermission) {
      enabledActions.push("edit");
      permissions.push("transport_vehicle");
    }
    if (hasSyncPermission) {
      enabledActions.push("sync");
    }
    if (hasDeletePermission) {
      enabledActions.push("delete");
      permissions.push("transport_vehicle");
    }
    if (enabledActions.length === 0) {
      test = false;
    }
    if (name === "display") {
      return test;
    } else {
      this.setState({
        enabledActions: enabledActions,
        permissions,
        columns: this.state.columns,
      });
    }
  };

  render() {
    const { loading, tableUpdating } = this.state;
    const options = {
      selectableRows: "none",
      responsive: "scroll",
      viewColumns: false,
      filter: false,
      print: false,
      downloadOptions: {
        filename: "vehicles.csv",
        filterOptions: {
          useDisplayedColumnsOnly: true,
          useDisplayedRowsOnly: true,
        },
      },
      onDownload: (buildHead, buildBody, columns, data) => {
        const bodyData = data.map((data_value) => {
          return data_value;
        });
        const bodyColumn = columns.map((column_name) => {
          column_name.label = getFormatMessage(column_name.label);
          return column_name;
        });
        return "\uFEFF" + buildHead(bodyColumn) + buildBody(bodyData);
      },
    };
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className={"loading"} alt="loading" />
        </Box>
      );
    } else {
      return (
        <>
          <Paper>
            <Box className="paper-background">
              <Grid container>
                <Grid
                  item
                  md={6}
                  xs={12}
                  className={classNames("header-align")}
                >
                  <Box className="heading">Vehicles</Box>
                  <Box className="sub-heading">List of Vehicles in school</Box>
                </Grid>
                <Grid item md={6} xs={12}>
                  <Box className={classNames("header-align", "end-flex-prop")}>
                    {isUserHasPermission("transport_vehicle", "create") && (
                      <Button
                        variant="contained"
                        component={Link}
                        to={Actions.transport_vehicle.create.url}
                        className="editbutton-view"
                      >
                        <AddCircleOutlineOutlinedIcon className="visibility-icon" />
                        {Actions.transport_vehicle.create.label}
                      </Button>
                    )}
                  </Box>
                </Grid>
                <Grid item md={12} xs={12} sm={12}>
                  <Paper style={{ marginTop: "40px" }}>
                    <AllMUIDataTable
                      data={this.state.vehicles}
                      columns={this.columns}
                      options={options}
                      title={tableUpdating?<CircularProgress className="white-text"/>:""}
                    />
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </>
      );
    }
  }
}

export default withRouter(VehicleView);
