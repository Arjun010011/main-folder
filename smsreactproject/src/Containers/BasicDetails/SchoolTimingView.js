import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Typography,
  Button,
  CircularProgress,
} from "@material-ui/core";
import Swal from "sweetalert2";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { withRouter } from "react-router-dom";
import classNames from "classnames";

import { Dropdown } from "Components/DropDown";
import StudentListActions from "Includes/StudentListActions";
import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import loadingBar from "images/loading.gif";
import { getRequest, deleteRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL } from "Includes/urls";
import { nameAndNumberRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import {
  dateFormat,
  isUserHasPermission,
  getAcademicYear,
  SetAcademicYear,
} from "Includes/functions";
import { viewTime } from "Includes/viewFunctions";
import { options } from "Constants";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class SchoolTimingView extends Component {
  constructor() {
    super();
    this.state = {
      periodList: [],
      loading: true,
      selectedToDelete: [],
      tableUpdating: false,
      yearList: [],
      year: "",
      errorContent: "",
      error: {},
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            display: false,
          },
        },
        {
          name: "name",
          label: "Plan Name",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "from_date",
          label: "From Date",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <div>{dateFormat(value, "DD-MM-YYYY")}</div>;
            },
          },
        },
        {
          name: "to_date",
          label: "To Date",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <div>{dateFormat(value, "DD-MM-YYYY")}</div>;
            },
          },
        },
        {
          name: "standard_label",
          label: `${alias_names["standard"]}`,
          options: {
            filter: true,
            sort: false,
          },
        },
        {
          name: "Actions",
          label: "Action",
          options: {
            display: this.updatePermissions("display"),
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <StudentListActions
                    id={tableMeta.rowData[0]}
                    index={tableMeta.rowIndex}
                    deleteStudent={this.deleteType}
                    editURL={Actions.school_timing.update.url}
                    viewURL={Actions.school_timing_individual.view.url}
                    enabledActions={this.state.enabledActions}
                  />
                </div>
              );
            },
          },
        },
      ],
    };
  }

  updatePermissions = (name) => {
    let test = true;
    const hasViewPermission = isUserHasPermission(
      "school_timing_individual",
      "view"
    );
    const hasEditPermission = isUserHasPermission("school_timing", "update");
    const hasDeletePermission = isUserHasPermission("school_timing", "delete");
    let enabledActions = [];
    if (hasViewPermission) {
      enabledActions.push("view");
    }
    if (hasEditPermission) {
      enabledActions.push("edit");
    }
    if (hasDeletePermission) {
      enabledActions.push("delete");
    }
    if (enabledActions.length === 0) {
      test = false;
    }
    if (name === "display") {
      return test;
    } else {
      this.setState({
        enabledActions: enabledActions,
        columns: this.state.columns,
      });
    }
  };

  componentDidMount = () => {
    this.getAcademicYearList();
    this.updatePermissions("actions");
    this.setState({
      options: options,
    });
  };

  getAcademicYearList = () => {
    const url = GET_URL.getacademicyear.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        if (getAcademicYear()) {
          let year = getAcademicYear();
          if (year !== 0) {
            this.setState(
              {
                year,
              },
              () => {
                this.getPeriodList();
              }
            );
          }
        } else {
          this.setState({ loading: false });
        }
        this.setState({
          yearList: response.data.data,
        });
      }
    });
  };

  getPeriodList = () => {
    const { year } = this.state;
    this.setState({ tableUpdating: true });
    const url = GET_URL.schooltimings.api;
    const params = { is_active: true, academic_year: year };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let standard_name = [];
        let section_names = [];
        let section_names_temp = [];
        let is_all_selected = false;
        response.data.data.map((data) => {
          standard_name = [];
          section_names = [];
          section_names_temp = [];
          is_all_selected = true;
          data.standard_section_data.map((stData) => {
            section_names_temp = [];
            standard_name.push(stData.standard_name);
            stData.section_list.map((secData) => {
              section_names_temp.push(secData.section__name);
            });
            if (section_names_temp.length > 0) {
              section_names.push([
                `${stData.standard_name} [ ${section_names_temp.join(`, `)} ] `,
              ]);
            }
            if (is_all_selected) {
              is_all_selected =
                stData.total_sections === stData.section_list.length;
              stData["is_all_selected"] = is_all_selected;
            }
          });
          standard_name =
            standard_name.length > 0 ? standard_name.join(`, `) : "";
          data["standard_name"] = standard_name;
          data["section_names"] = section_names.join(`, `);
          data["standard_label"] = section_names.join(`, `);
          if (is_all_selected) {
            data["standard_label"] = standard_name;
          }
        });
        this.setState({
          periodList: response.data.data,
          loading: false,
          tableUpdating: false,
        });
      }
    });
  };

  deleteType = async (id, index) => {
    this.setState({ tableUpdating: true });
    let { periodList, columns } = this.state;
    const del_url = DEL_URL.schooltimings.api;
    const url = del_url + id + "/";
    deleteRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        periodList.splice(index, 1);
        this.setState({
          periodList,
          columns: [...columns],
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
    this.setState({ tableUpdating: false });
  };

  onChange = (e) => {
    const { name, value } = e.target;
    if (value != 0) {
      this.setState({ [name]: value }, () => {
        if (name === "year") {
          SetAcademicYear(value);
          this.getPeriodList();
        }
      });
    }
  };

  handleAddPeriodButton = () => {
    let { year, error, alertData, yearList } = this.state;
    if (year !== "") {
      let yearName, fromDate, toDate;
      yearList.map((data) => {
        if (data.id == year) {
          yearName = data.name;
          fromDate = data.start_date;
          toDate = data.end_date;
        }
      });
      let yearInformation = {
        year: year,
        yearName: yearName,
        fromDate: fromDate,
        toDate: toDate,
      };
      let searchParam = "?" + new URLSearchParams(yearInformation).toString();
      this.props.history.push({
        pathname: Actions.school_timing.create.url,
        search: searchParam,
      });
    } else {
      alertData = "Select Academic Year";
      error.year = alertData;
      this.setState({
        open: true,
        alertData,
        error,
      });
    }
  };

  render() {
    const {
      loading,
      periodList,
      columns,
      options,
      tableUpdating,
      yearList,
      year,
      open,
      alertData,
      error,
    } = this.state;
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
                <Box className="heading">
                  {Actions.school_timing.view.label}
                </Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  {isUserHasPermission("school_timing", "create") && (
                    <Button
                      variant="contained"
                      onClick={this.handleAddPeriodButton}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.school_timing.create.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Box className="header-align">
              <Dropdown
                data={yearList}
                name="year"
                value={year}
                onChange={this.onChange}
                label="Academic Year"
                hideSelect={true}
                error={error.year}
              />
            </Box>
            <Grid container className={classNames("header-align")}>
              <Grid item md={12} xs={12}>
                <Paper>
                  <AllMUIDataTable
                    key={periodList}
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    data={periodList}
                    columns={columns}
                    options={options}
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
export default withRouter(SchoolTimingView);
