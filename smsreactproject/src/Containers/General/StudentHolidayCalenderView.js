import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Button,
  Icon,
  CircularProgress,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@material-ui/core";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import MenuBookOutlinedIcon from "@material-ui/icons/MenuBookOutlined";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import Snackbar from "@material-ui/core/Snackbar";
import MuiAlert from "@material-ui/lab/Alert";
import Swal from 'sweetalert2'

import BlankPagewithIcon from "Components/BlankPageWithIcon";
import CalenderView from "Containers/General/Components/CalenderView";
import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import loadingBar from "images/loading.gif";
import { getRequest, deleteRequest} from "Includes/api/apicall";
import { GET_URL,  DEL_URL } from "Includes/urls";
import { nameAndNumberRegex } from "Constants/regularExpression";
import { Actions } from "Constants/permissions";
import {
  getFinancialYear,
  SetFinancialYear,
  dateFormat,
  isUserHasPermission,
  getKeyValueMap,
  getAcademicYear,
  SetAcademicYear,
} from "Includes/functions";
import { Dropdown } from "Components/DropDown";
import { minDate, maxDate, options } from "Constants";
import StudentListActions from "Includes/StudentListActions";
import "./styles.scss";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const fieldDetails = [
  {
    label: "Holiday Name",
    regex: nameAndNumberRegex,
    autoFocus: true,
    name: "reason",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 100,
  },
  {
    label: "From Date",
    regex: "",
    name: "from_date",
    md: 12,
    minDate: new Date(),
    maxDate: maxDate,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "date",
  },
  {
    label: "To Date",
    regex: "",
    name: "to_date",
    md: 12,
    maxDate: maxDate,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "date",
    parentMinDate: "from_date",
  },
];

class StudentHolidayCalenderView extends Component {
  constructor() {
    super();
    this.state = {
      academicYearList: [],
      selectedCountry: "",
      holidayList: [],
      eventList: [],
      GridEnabled: false,
      ListEnabled: true,
      loading: true,
      selectedToDelete: [],
      tableUpdating: false,
      selectedPlan: "",
      planList: [],
      calenderTypeList: [],
      selectedCalenderType: "",
      error: {},
      noPlanDialogOpen: false,
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: true,
            sort: true,
            display: false,
          },
        },
        {
          name: "Serial Number",
          label: "Sl NO",
          options: {
            filter: false,
            sort: false,
            search: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return tableMeta.rowIndex + 1;
            },
          },
        },
        {
          name: "reason",
          label: "Calender Name",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div className="mui-table-custom-value-left-align text-transform-none">
                  {value}
                </div>
              );
            },
          },
        },
        {
          name: "from_date",
          label: "From Date",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return dateFormat(value, "DD-MM-YYYY");
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
              return dateFormat(value, "DD-MM-YYYY");
            },
          },
        },
        {
          name: "calender_type",
          label: "Calender Type",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {value === "holiday" ? (
                    <div className="text-blue">Holiday</div>
                  ) : (
                    <div className="text-green">Event</div>
                  )}
                </div>
              );
            },
          },
        },

        {
          name: "Actions",
          label: "Actions",
          options: {
            display: this.updatePermissions("display"),
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <StudentListActions
                    id={tableMeta.rowData[0]}
                    index={tableMeta.rowIndex}
                    deleteStudent={this.deleteType}
                    editURL={Actions.student_holiday_calender.update.url}
                    viewURL={Actions.student_holiday_calender.view.url}
                    enabledActions={this.state.enabledActions}
                    editExtraParams={{
                      selectedCountry: this.state.selectedCountry,
                      yearName: this.state.yearName,
                      fromDate: this.state.fromDate,
                      toDate: this.state.toDate,
                    }}
                  />

                  {/* <ActionColumn
                    id={tableMeta.rowData[0]}
                    fieldValues={this.fieldValues(
                      tableMeta.rowData[2],
                      tableMeta.rowData[3],
                      tableMeta.rowData[4]
                    )}
                    label="Please Update Holiday Calender Details"
                    fieldDetails={fieldDetails}
                    updateUrl={PUT_URL.holidaycalenderforstudent.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    deleteUrl={DEL_URL.holidaycalenderforstudent.api}
                    deleteType={this.deleteType}
                    baseClassName="action-basic-detail-width"
                    enabledActions={this.state.enabledActions}
                  /> */}
                </div>
              );
            },
          },
        },
      ],
    };
  }

  fieldValues(reason, from, to) {
    let fieldValues = [];
    fieldValues.push(reason);
    fieldValues.push(from);
    fieldValues.push(to);
    return fieldValues;
  }

  updatePostFormat = (newData) => {
    let { selectedCountry } = this.state;
    let payload = {
      academic_year: selectedCountry,
      reason: newData.reason,
      from_date: dateFormat(newData.from_date, "YYYY-MM-DD"),
      to_date: dateFormat(newData.to_date, "YYYY-MM-DD"),
    };
    return payload;
  };

  updatePermissions = (name) => {
    let test = true;
    const hasEditPermission = isUserHasPermission(
      "student_holiday_calender",
      "update"
    );
    const hasDeletePermission = isUserHasPermission(
      "student_holiday_calender",
      "delete"
    );
    let permissions = [];
    let enabledActions = [];
    if (hasEditPermission) {
      enabledActions.push("edit");
      permissions.push("student_holiday_calender");
    }
    if (hasDeletePermission) {
      enabledActions.push("delete");
      permissions.push("student_holiday_calender");
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

  componentDidMount = () => {
    this.getacademicYearList();
    this.updatePermissions("actions");
    this.setState({
      options: options,
    });
  };

  updateType = (newData, id) => {
    let { holidayList, eventList, columns } = this.state;
    this.setState({ tableUpdating: true });
    let holiday = holidayList;
    let events = eventList;
    holiday.map((data, index) => {
      if (data.id === id) {
        holiday[index].reason = newData.reason;
        holiday[index].from_date = newData.from_date;
        holiday[index].to_date = newData.to_date;
      }
    });
    events.map((data, index) => {
      if (data.id === id) {
        events[index].title = newData.reason;
        events[index].start = new Date(newData.from_date);
        events[index].end = new Date(newData.to_date);
      }
    });
    this.setState({
      holidayList: [...holiday],
      eventList: [...events],
      tableUpdating: false,
      columns: columns,
    });
    return true;
  };

  getacademicYearList = () => {
    const url = GET_URL.getacademicyear.api;
    const params = { is_active: true };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let fromYear = "";
        let ToYear = "";
        response.data.data.map((data) => {
          fromYear = data.start_date.split("-");
          ToYear = data.end_date.split("-");
          // data.name = fromYear[0] + "-" + ToYear[0];
        });
        this.setState({
          academicYearList: response.data.data,
        });
        if (this.props.location.state) {
          let fromDate = "";
          let toDate = "";
          let yearName = "";
          let selectedCountry = this.props.location.state.selectedCountry;
          response.data.data.map((data) => {
            if (data.id == selectedCountry) {
              fromDate = data.start_date;
              toDate = data.end_date;
              yearName = data.name;
            }
          });
          this.setState({
            selectedCountry: selectedCountry,
            fromDate,
            toDate,
            yearName,
          });
          this.getHolidayPlanList(selectedCountry);
          this.getCalenderTypeList(selectedCountry);
        } else if (getAcademicYear()) {
          let yearValue = getAcademicYear();
          this.getHolidayPlanList(yearValue);
          this.getCalenderTypeList(yearValue);
        }
        this.setState({
          loading: false,
        });
      } else {
        this.setState({ loading: false });
      }
    }).catch(() => {
      this.setState({ loading: false });
    });
  };

  deleteType = (id, index) => {
    let { holidayList } = this.state
    const del_url = DEL_URL.holidaycalenderforstudent.api
    const url = del_url + id + '/';
    this.setState({ tableUpdating: true })
    deleteRequest(url, {}, this.props).then(response => {
        if (response && response.status === 200) {
            holidayList.splice(index, 1)
            this.setState({
              holidayList:[...holidayList],
            })
            Swal.fire({
                position: 'top-end',
                type: 'success',
                title: response.data.Reason,
                showConfirmButton: false,
                timer: 1500
            })
          }
          this.setState({ tableUpdating: false })
    })
}

  onChange = async (e) => {
    let { value, name } = e.target;
    const { academicYearList } = this.state;
    if (value !== 0) {
      if (name === "selectedCountry") {
        let fromDate, toDate;
        academicYearList.map((data) => {
          if (data.id == value) {
            fromDate = data.start_date;
            toDate = data.end_date;
          }
        });

        this.setState(
          {
            error: {},
            [name]: value,
            tableUpdating: true,
            fromDate,
            toDate,
          },
          () => {
            this.getholidayList(value);
            this.getHolidayPlanList(value);
          }
        );
        SetAcademicYear(value);
      } else {
        this.setState(
          {
            [name]: value,
          },
          () => {
            this.getholidayList(this.state.selectedCountry);
          }
        );
      }
    }
  };


  getholidayList = (id, isDownload=false) => {
    const { selectedPlan, selectedCalenderType } = this.state;
    const url = GET_URL.holidaycalenderforstudent.api;
    let params = { academic_year: id, is_active: true };
    if (selectedPlan !== "all" && selectedPlan) {
      params["calender_plan"] = selectedPlan;
    }
    if (selectedCalenderType !== "all" && selectedCalenderType) {
      params["calender_type"] = selectedCalenderType;
    }
    if( isDownload ){
      params['download_pdf'] = true
    }
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        if (isDownload) {
          let Data = new Blob([response.data], { type: "application/pdf" });
          let fileURL = URL.createObjectURL(Data);
          const height = (window.screen.height * 75) / 100;
          const width = (window.screen.width * 75) / 100;
          window.open(
            fileURL,
            "PRINT",
            "height=" + height + ",width=" + width + ""
          );
          this.setState({ tableUpdating: false });
        } else {
          const rows = Array.isArray(response.data?.data)
            ? response.data.data
            : [];
          const list = [];
          rows.forEach((data) => {
            let newEvent = {};
            newEvent["id"] = data["id"];
            newEvent["title"] = data["reason"];
            newEvent["start"] = new Date(data["from_date"]);
            newEvent["start"].setHours(0);
            newEvent["start"].setMinutes(0);
            newEvent["start"].setSeconds(0);
            newEvent["end"] = new Date(data["to_date"]);
            newEvent["end"].setHours(23);
            newEvent["end"].setMinutes(59);
            newEvent["end"].setSeconds(59);
            newEvent["allDay"] = true;
            list.push(newEvent);
          });
          this.setState({
            holidayList: rows,
            eventList: list,
            tableUpdating: false,
            loading: false,
            selectedCountry: id,
          });
        }
      } else {
        this.setState({ tableUpdating: false, loading: false });
      }
    }).catch(() => {
      this.setState({ tableUpdating: false, loading: false });
    });
  };

  navigateToCreateHolidayPlan = () => {
    const { selectedCountry, academicYearList } = this.state;
    if (!selectedCountry) {
      this.setState({
        open: true,
        alertData: "Please select Academic Year first",
        error: { ...this.state.error, country: "Please select Academic Year first" },
      });
      return;
    }
    const yearNames = getKeyValueMap(academicYearList, "id", "name");
    const yearName = yearNames[selectedCountry] || "";
    const searchParam =
      "?" +
      new URLSearchParams({
        year: String(selectedCountry),
        yearName: yearName,
      }).toString();
    this.props.history.push({
      pathname: Actions.student_holiday_calender_plan.create.url,
      search: searchParam,
    });
  };

  getHolidayPlanList = (id) => {
    const url = GET_URL.holidayplan.api;
    const params = { is_active: true, academic_year: id };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let plan_list = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        let selectedPlan = "";
        if (plan_list.length > 1) {
          let temp = { id: "all", name: "All" };
          plan_list = [temp, ...plan_list];
          selectedPlan = "all";
        } else if (plan_list.length === 1) {
          selectedPlan = plan_list[0]["id"];
        }
        this.setState({
          planList: plan_list,
          selectedPlan: selectedPlan,
        }, () => {
          this.getholidayList(id);
        });
      } else {
        this.setState({ tableUpdating: false, loading: false });
      }
    }).catch(() => {
      this.setState({ tableUpdating: false, loading: false });
    });
  };

  handleAddButton = () => {
    let { selectedCountry, error, alertData, academicYearList, planList } =
      this.state;
    if (selectedCountry && selectedCountry !== 0) {
      alertData = "Create Holiday Plan before adding holiday";
      error.selectedPlan = alertData;
      if (planList.length < 1) {
        if (isUserHasPermission("student_holiday_calender_plan", "create")) {
          this.setState({ noPlanDialogOpen: true, alertData, error });
        } else {
          this.setState({ open: true, alertData, error });
        }
        return;
      }
      let yearNames = getKeyValueMap(academicYearList, "id", "name");
      let yearName = yearNames[selectedCountry];
      let fromDate, toDate;

      academicYearList.map((data) => {
        if (data.id == selectedCountry) {
          fromDate = data.start_date;
          toDate = data.end_date;
        }
      });

      let yearInformation = {
        selectedCountry: selectedCountry,
        yearName: yearName,
        fromDate: fromDate,
        toDate: toDate,
      };
      let searchParam = "?" + new URLSearchParams(yearInformation).toString();
      this.props.history.push({
        pathname: Actions.student_holiday_calender.create.url,
        search: searchParam,
      });
    } else {
      alertData = "Please select Financial year";
      error.country = alertData;
      this.setState({
        open: true,
        alertData,
        error,
      });
    }
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  getCalenderTypeList = (year) => {
    const url = GET_URL.calendertype.api;
    const params = { is_active: true, academic_year: year };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.calender_type_list.unshift({
          name: "all",
          label: "All",
        });
        this.setState({
          calenderTypeList: response.data.data.calender_type_list,
          selectedCalenderType: "all",
        });
      }
    });
  };


  render() {
    const {
      ListEnabled,
      GridEnabled,
      loading,
      academicYearList,
      selectedCountry,
      holidayList,
      columns,
      options,
      open,
      error,
      alertData,
      eventList,
      tableUpdating,
      selectedPlan,
      planList,
      calenderTypeList,
      selectedCalenderType,
      noPlanDialogOpen,
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
                <Box className="heading">Calender for student</Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box
                  className={classNames("header-align", "end-flex-prop")}
                  display="flex"
                  flexWrap="wrap"
                  alignItems="center"
                  style={{ gap: 8 }}
                >
                  {selectedCountry &&
                    planList.length < 1 &&
                    isUserHasPermission(
                      "student_holiday_calender_plan",
                      "create"
                    ) && (
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={this.navigateToCreateHolidayPlan}
                      >
                        <MenuBookOutlinedIcon
                          className="visibility-icon"
                          style={{ marginRight: 6 }}
                        />
                        Create holiday plan
                      </Button>
                    )}
                  {isUserHasPermission(
                    "student_holiday_calender",
                    "create"
                  ) && (
                    <Button
                      variant="contained"
                      onClick={this.handleAddButton}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.student_holiday_calender.create.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Grid container>
              <Grid item md={4} xs={12} className="margin-top-20">
                <Dropdown
                  data={academicYearList}
                  name="selectedCountry"
                  value={selectedCountry}
                  onChange={this.onChange}
                  label="Academic Year"
                  error={error.country}
                  hideSelect={true}
                  size={"small"}
                />
              </Grid>
              {planList.length > 2 && (
                <Grid item md={4} xs={12} className="margin-top-20">
                  <Dropdown
                    data={planList}
                    name="selectedPlan"
                    value={selectedPlan}
                    onChange={this.onChange}
                    label="Plan Name"
                    error={error.selectedPlan}
                    hideSelect={true}
                    size={"small"}
                  />
                </Grid>
              )}
              {calenderTypeList.length > 2 && (
                <Grid item md={4} xs={12} className="margin-top-20">
                  <Dropdown
                    data={calenderTypeList}
                    name="selectedCalenderType"
                    value={selectedCalenderType}
                    onChange={this.onChange}
                    label="Calender Type"
                    error={error.selectedCalenderType}
                    hideSelect={true}
                    size={"small"}
                    customId="name"
                    customName="label"
                  />
                </Grid>
              )}
            </Grid>
            {selectedCountry &&
              planList.length < 1 &&
              isUserHasPermission(
                "student_holiday_calender_plan",
                "create"
              ) && (
                <Box
                  mt={2}
                  mb={1}
                  p={2}
                  bgcolor="#e3f2fd"
                  borderRadius={4}
                  border="1px solid #90caf9"
                >
                  <Typography variant="subtitle2" gutterBottom>
                    No holiday plan for this academic year
                  </Typography>
                  <Typography variant="body2" color="textSecondary" paragraph>
                    Add a calendar plan first, then you can add holidays and
                    events for students.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={this.navigateToCreateHolidayPlan}
                  >
                    <MenuBookOutlinedIcon style={{ marginRight: 8 }} />
                    Create holiday plan
                  </Button>
                </Box>
              )}
            {selectedCountry && (
              <Grid container className="header-align">
                <Grid item lg={8} xs={12}>
                  {this.state.GridEnabled === true && (
                    <Paper>
                      <CalenderView eventList={eventList} />
                    </Paper>
                  )}
                  
                  {this.state.ListEnabled === true && (
                    <>
                      {selectedCountry && 
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => this.getholidayList(selectedCountry, true)}
                          style={{ 
                            margin: '10px 0', backgroundColor: '#4caf50', color: 'white', marginLeft: 'auto', 
                            display: 'flex', justifyContent: 'flex-end', marginBottom: '10px'
                          }}
                        >
                          Download Pdf
                        </Button>
                      }
                      <AllMUIDataTable
                        key={holidayList}
                        title={
                          tableUpdating ? (
                            <CircularProgress className="white-text" />
                          ) : (
                            ""
                          )
                        }
                        data={holidayList}
                        columns={columns}
                        options={options}
                      />
                    </>
                  )}
                </Grid>
              </Grid>
            )}
            {!selectedCountry && (
              <BlankPagewithIcon data="Change the Academic year and expect the result" />
            )}
            <Snackbar
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              open={open}
              autoHideDuration={2000}
              onClose={this.handleClose}
            >
              <Alert onClose={this.handleClose} severity="error">
                {alertData}
              </Alert>
            </Snackbar>

            <Dialog
              open={noPlanDialogOpen}
              onClose={() => this.setState({ noPlanDialogOpen: false })}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Create a holiday plan first</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  There is no holiday calendar plan for the selected academic
                  year. Create a plan (and link standards) before adding holidays
                  or events.
                </DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={() => this.setState({ noPlanDialogOpen: false })}
                  color="default"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    this.setState({ noPlanDialogOpen: false });
                    this.navigateToCreateHolidayPlan();
                  }}
                  color="primary"
                  variant="contained"
                >
                  Create holiday plan
                </Button>
              </DialogActions>
            </Dialog>
          </Paper>
        </Box>
      );
    }
  }
}
export default withRouter(StudentHolidayCalenderView);
