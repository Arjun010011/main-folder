import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Tooltip,
  Button,
  CircularProgress,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import classNames from "classnames";

import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import loadingBar from "images/loading.gif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import {
  dateFormat,
  getAcademicYear,
  isUserHasPermission,
  updatePermissions,
} from "Includes/functions";
import { minDate, maxDate, options } from "Constants";
import { Actions } from "Constants/permissions";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { cloneDeep } from "lodash";

class TemplateCardList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("academic_year", ["update", "delete"]);
    this.state = {
      academicYearList: [{ id: 1, name: "Birthday Card" }],
      loading: true,
      selectedToDelete: [],
      enabledActions: [],
      optionsLocal: {},
      tableUpdating: false,
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "name",
          label: "Template Name",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
          },
        },
        {
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <Button
                    className="custom-button"
                    onClick={() => this.handleCreate(tableMeta.rowData[0])}
                  >
                    Click Here
                  </Button>
                </div>
              );
            },
          },
        },
      ],
    };
  }

  handleCreate = (id) => {
    let formInformation = {
      form_id: id,
    };
    let searchParam = "?" + new URLSearchParams(formInformation).toString();
    this.props.history.push({
      pathname: Actions.template_card.create.url,
      search: searchParam,
    });
  };

  updatePermissionTable = (permission, is_active) => {
    let return_permission = [];
    let return_temp = "";
    permission.map((data) => {
      return_temp = "";
      if (data === "delete") {
        return_temp = is_active ? "disable" : "enable";
      } else {
        return_temp = data;
      }
      return_permission.push(return_temp);
    });
    return return_permission;
  };

  componentDidMount = () => {
    // this.getAcademicYearList();
    this.setState({
      optionsLocal: { ...options },
      loading: false,
    });
  };

  getAcademicYearList = () => {
    const url = GET_URL.academicyear.api;
    const params = {};
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((data) => {
          data["start_date_label"] = dateFormat(
            data["start_date"],
            "DD-MM-YYYY"
          );
          data["end_date_label"] = dateFormat(data["end_date"], "DD-MM-YYYY");
        });
        this.setState({
          academicYearList: response.data.data,
          loading: false,
        });
      }
    });
  };

  onTableChange = (tableState) => {
    let newOptions = { ...this.state.optionsLocal };
    newOptions["searchText"] = tableState["searchText"];
    this.setState({
      optionsLocal: { ...newOptions },
    });
  };

  render() {
    const { loading, academicYearList, columns, optionsLocal, tableUpdating } =
      this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
          <Paper className={classNames("paper-background")}>
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Box className="heading">Template List</Box>
              </Grid>
              <Grid item md={6} xs={12}>
                {/* <Box className={classNames("header-align", "end-flex-prop")}>
                  {isUserHasPermission("academic_year", "create") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.academic_year.create.url}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.template_card.create.label}
                    </Button>
                  )}
                </Box> */}
              </Grid>
            </Grid>
            <Grid container className={classNames("header-align")}>
              <Grid item md={8}>
                <Paper>
                  <AllMUIDataTable
                    key={academicYearList}
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    data={academicYearList}
                    columns={columns}
                    options={optionsLocal}
                    onTableChange={this.onTableChange}
                  />
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      );
    }
  }
}
export default withRouter(TemplateCardList);
