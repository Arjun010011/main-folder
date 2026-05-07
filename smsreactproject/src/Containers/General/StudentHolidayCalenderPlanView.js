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
  getKeyValueMap,
} from "Includes/functions";
import { viewTime } from "Includes/viewFunctions";
import { options } from "Constants";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class StudentHolidayCalenderPlanView extends Component {
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
          name: "standard_detail",
          label: `${alias_names["standard"]}`,
          options: {
            filter: true,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {value.map((data, index) => {
                    return data.length == index + 1 && data.length !== 1
                      ? ` ${data.name}`
                      : `${(index ? ", " : " ") + data.name}`;
                  })}
                </div>
              );
            },
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
                    editURL={Actions.student_holiday_calender_plan.update.url}
                    viewURL={Actions.student_holiday_calender_plan.view.url}
                    enabledActions={this.state.enabledActions}
                    editExtraParams={{
                      academic_year: this.state.year,
                      yearName: this.state.yearName,
                    }}
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
    const hasEditPermission = isUserHasPermission(
      "student_holiday_calender_plan",
      "update"
    );
    const hasDeletePermission = isUserHasPermission(
      "student_holiday_calender_plan",
      "delete"
    );
    let enabledActions = [];
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
    let { loading } = this.state;
    const url = GET_URL.getacademicyear.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        if (getAcademicYear()) {
          let year = getAcademicYear();
          const yearName = getKeyValueMap(response.data.data,"id", "name");
          if (year !== 0) {
            this.setState(
              {
                year,
                yearName: yearName[year]
              },
              () => {
                this.getPeriodList();
              }
            );
          }
        } else {
          loading = false;
        }
        let fromYear = "";
        let ToYear = "";
        response.data.data.map((data) => {
          fromYear = data.start_date.split("-");
          ToYear = data.end_date.split("-");
          // data.name = fromYear[0] + "-" + ToYear[0];
        });
        this.setState({
          yearList: response.data.data,
          loading,
        });
      }
    });
  };

  getPeriodList = () => {
    const { year } = this.state;
    this.setState({ tableUpdating: true });
    const url = GET_URL.holidayplan.api;
    const params = { is_active: true, academic_year: year };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
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
    const del_url = DEL_URL.holidayplan.api;
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
    const { yearList } = this.state;
    if (value != 0) {
      this.setState({ [name]: value }, () => {
        if (name === "year") {
          const yearName = getKeyValueMap(yearList, "id", "name");
          SetAcademicYear(value);
          this.setState({
            yearName:yearName[value],
          });
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
      };
      let searchParam = "?" + new URLSearchParams(yearInformation).toString();
      this.props.history.push({
        pathname: Actions.student_holiday_calender_plan.create.url,
        search: searchParam,
      });
    } else {
      alertData = "Please Select Academic Year";
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
      yearName,
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
                <Box className="heading">Student Holiday Calender Plan</Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  {isUserHasPermission(
                    "student_holiday_calender_plan",
                    "create"
                  ) && (
                    <Button
                      variant="contained"
                      onClick={this.handleAddPeriodButton}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.student_holiday_calender_plan.create.label}
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
export default withRouter(StudentHolidayCalenderPlanView);
