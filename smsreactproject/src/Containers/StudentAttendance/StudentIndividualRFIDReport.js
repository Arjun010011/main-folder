import React, { Component, Fragment } from "react";
import {
  Paper,
  Box,
  Grid,
  Button,
  CircularProgress,
  Tooltip,
} from "@material-ui/core";
import moment from "moment";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import { DateRange } from "Components/DateRange";
import VisibilityOutlinedIcon from "@material-ui/icons/VisibilityOutlined";
import ActionColumn from "Components/ActionColumnNew";

import BlankPagewithIcon from "Components/BlankPageWithIcon";
import AllMUIDataTable from "Components/AllMUIDataTable";
import loadingBar from "images/loading.gif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  timeFormat,
  getPaginationProps,
  dateFormat,
} from "Includes/functions";
import { DEFAULT_PAGINATION_WITHOUT_SORT_PROPS } from "Constants";

const fieldDetailsGlobal = [
  {
    label: "Is Absent",
    regex: null,
    name: "isAbsent",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: false,
    rows: null,
    type: "switch",
    emptyRemainingValues: true,
  },
  {
    label: "In Time",
    regex: null,
    name: "in_time",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "date_time",
    isDisableWhenPresent: "isAbsent",
    isDependentIndex: 0,
    isMinMaxDateNeedUpdate: true
  },
  {
    label: "Out Time",
    regex: null,
    name: "out_time",
    md: 12,
    className: "width-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "date_time",
    isDisableWhenPresent: "isAbsent",
    isDependentIndex: 0,
    parentMinDate: "in_time",
    isMinMaxDateNeedUpdate: true
  },
];

class StudentIndividualRFIDReport extends Component {
  constructor() {
    super();
    this.state = {
      checkIn_checkOut_List: { data_list: [] },
      loading: true,
      dateRangeValue: {},
      // startDate: dateFormat(new Date(date.getFullYear(), date.getMonth(), 1), 'YYYY-MM-DD'),
      // endDate: dateFormat(date, 'YYYY-MM-DD'),
      error: {},
      floorLoading: false,
      pageLoading: false,
      isOpenedDateRange: false,
      dateRangeDropdownList: [
        { id: "l1m", name: "Last 1 Month" },
        { id: "l3m", name: "Last 3 Months" },
        { id: "l6m", name: "Last 6 Months" },
        { id: "l1y", name: "Last 1 Year" },
      ],
      isDateRange: false,
      dateRangeDropdown: "l1m",
      pagination: { ...DEFAULT_PAGINATION_WITHOUT_SORT_PROPS },
      isBlankPage: true,
      blankData: "Select date range",
      enabledActions: [],
      fieldDetails: [],
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
            download: false,
          },
        },
        {
          name: "for_date",
          label: "id",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
            download: false,
          },
        },
        {
          name: "for_date_label",
          label: "Attendance Date",
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "status",
          label: "Status",
          options: {
            filter: false,
            sort: false,
            search: true,
          },
        },
        {
          name: "in_time",
          label: "In Time",
          options: {
            filter: false,
            sort: false,
            search: true,
          },
        },
        {
          name: "out_time",
          label: "Out Time",
          options: {
            filter: false,
            sort: false,
            search: true,
          },
        },
        {
          name: "Actions",
          label: "Actions",
          options: {
            display: this.updatePermissions("display"),
            filter: false,
            sort: false,
            viewColumns: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <ActionColumn
                    id={tableMeta.rowData[0]}
                    fieldValues={this.fieldValues(
                      tableMeta.rowData[4],
                      tableMeta.rowData[5]
                    )}
                    selectedDate={tableMeta.rowData[1]}
                    label="Update Attendance Details"
                    fieldDetails={this.state.fieldDetails}
                    updateUrl={POST_URL.rfidattendance.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    baseClassName="action-basic-detail-width"
                    enabledActions={this.state.enabledActions}
                  />
                </div>
              );
            },
          },
        },
      ],
    };
    this.dateRange = React.createRef();
  }

  updatePostFormat = (newData) => {
    let payload = {};
    if (newData["isAbsent"]) {
      payload = {
        status: "absent",
      };
    } else {
      let validate = true;
      if (!newData.in_time) {
        validate = false;
        payload["error"] = "Enter In Time";
      }
      // let error_check_out = ''
      // error_check_out = validateDate(newData.out_time?newData.out_time:new Date(), newData.in_time,new Date(),'time')
      // if (error_check_out !== '') {
      //     payload['error'] = `Minimum time ${dateFormat(newData.in_time, 'DD-MM-YYYY hh:mm A')}`
      //     validate = false
      // }
      if (newData.in_time && newData.out_time && validate) {
        let DutyDayStartTime = moment(newData.in_time, "YYYY-MM-DD HH:mm");
        let DutyDayEndTime = moment(newData.out_time, "YYYY-MM-DD HH:mm");
        let diffTime = DutyDayEndTime.diff(DutyDayStartTime, "minutes");
        if (diffTime < 5) {
          validate = false;
          payload["error"] =
            "Difference between In time and Out time should be minimum 5 minutes";
        } else if (diffTime > 720) {
          validate = false;
          payload["error"] =
            "Difference between In time and Out time should not exceed 12 hours";
        }
      }
      if (validate) {
        payload = {
          student_id:[],
          status: "present",
          in_time: dateFormat(newData.in_time, "YYYY-MM-DD HH:mm:ss"),
          out_time: newData.out_time
            ? dateFormat(newData.out_time, "YYYY-MM-DD HH:mm:ss")
            : null,
        };
      }
    }
    return payload;
  };
  
  fieldValues(in_time="", out_time="") {
    let fieldValues = [];
    if (in_time) {
      fieldValues.push(false);
    } else {
      fieldValues.push(true);
    }
    fieldValues.push(in_time);
    fieldValues.push(out_time);
    return fieldValues;
  }

  updatePermissions = (name) => {
    let test = true;
    const hasEditPermission = isUserHasPermission(
      "manage_staff_attendance",
      "update"
    );
    let enabledActions = [];
    if (hasEditPermission) {
      enabledActions.push("edit");
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
    let { dateRangeValue } = this.state;
    const date_range = this.props.location.state.date_range;
    dateRangeValue.start = dateFormat(date_range.minDate, "YYYY-MM-DD");
    dateRangeValue.end = dateFormat(date_range.maxDate, "YYYY-MM-DD");
    this.updatePermissions();
    this.setState(
      {
        dateRangeValue,
        date_range,
        fieldDetails: fieldDetailsGlobal,
      },
      () => {
        this.getStudentHistoryList();
      }
    );
  };

  getStudentHistoryList = (paginationProps) => {
    let { pagination, dateRangeValue } = this.state;
    const id = this.props.location.state.detail;
    const year = this.props.location.state.year;
    const name = this.props.location.state.name;
    dateRangeValue.start = new Date(
      new Date(dateRangeValue.start).setHours(0, 0, 0, 0)
    );
    dateRangeValue.end = new Date(
      new Date(dateRangeValue.end).setHours(23, 59, 0, 0)
    );

    this.currentPagination = pagination;
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    let params = {
      ...pagination_params,
      pagination: true,
      is_active: true,
      academic_year: year,
      fromDate: dateFormat(dateRangeValue.start, "YYYY-MM-DD"),
      toDate: dateFormat(dateRangeValue.end, "YYYY-MM-DD"),
    };
    const url = GET_URL.studentrfidattendancereport.api + id + "/";
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.data_list.map((data) => {
          data["for_date_label"] = data["for_date"]
            ? dateFormat(data["for_date"], "DD-MM-YYYY")
            : "";
          data["in_time"] = data["in_time"]
            ? dateFormat(data["in_time"], "DD-MM-YYYY hh:mm A")
            : "";
          data["out_time"] = data["out_time"]
            ? dateFormat(data["out_time"], "DD-MM-YYYY  hh:mm A")
            : "";
        });
        this.setState({
          checkIn_checkOut_List: response.data.data,
          isBlankPage: false,
          loading: false,
          tableUpdating: false,
          academic_year: year,
          name: name,
          pagination: this.currentPagination
            ? this.currentPagination
            : this.state.pagination,
        });
      }
    });
  };

  onChangeDateRangeDropdown = (e) => {
    let { name, value } = e.target;
    let { dateRangeValue, pagination } = this.state;
    let start, end;
    end = dateFormat(new Date(), "YYYY-MM-DD");
    if (value === "l1m") {
      start = dateFormat(
        moment(new Date()).subtract(1, "months"),
        "YYYY-MM-DD"
      );
    } else if (value === "l3m") {
      start = dateFormat(
        moment(new Date()).subtract(3, "months"),
        "YYYY-MM-DD"
      );
    } else if (value === "l6m") {
      start = dateFormat(
        moment(new Date()).subtract(6, "months"),
        "YYYY-MM-DD"
      );
    } else if (value === "l1y") {
      start = dateFormat(
        moment(new Date()).subtract(12, "months"),
        "YYYY-MM-DD"
      );
    }
    dateRangeValue.start = start;
    dateRangeValue.end = end;
    this.setState(
      {
        dateRangeValue,
        [name]: value,
        isDropDownDateRange: true,
      },
      () => {
        let startDate = moment(start);
        let endDate = moment(end);
        this.dateRange.current.onChange(
          moment.range(startDate.clone(), endDate.clone())
        );
        this.getStudentHistoryList(pagination);
      }
    );
  };

  handleChangeDateRange = (value, isOpened) => {
    let { pagination, dateRangeDropdown, dateRangeDropdownList } = this.state;
    if (isOpened) {
      let isCustomExist = false;
      let temp = { id: "custom", name: "Custom Date Range" };
      dateRangeDropdownList.map((data) => {
        if (data.id === "custom") {
          isCustomExist = true;
        }
      });
      if (!isCustomExist) {
        dateRangeDropdownList.push(temp);
      }
      dateRangeDropdown = "custom";
    } else {
      dateRangeDropdownList.map((data, index) => {
        if (data.id === "custom") {
          dateRangeDropdownList.splice(index, 1);
        }
      });
    }
    this.setState(
      {
        dateRangeValue: value,
        dateRangeDropdown,
        dateRangeDropdownList,
      },
      () => {
        this.getStudentHistoryList();
      }
    );
  };

  gotoViewCheckInCheckOutList = () => {
    let { selectedBuilding } = this.state;
    let buildingInformation = {
      selectedBuilding: selectedBuilding,
    };
    let searchParam = "?" + new URLSearchParams(buildingInformation).toString();
    this.props.history.push({
      pathname: Actions.student_rfid_attendance_report.view.url,
      search: searchParam,
    });
  };

  render() {
    const {
      loading,
      name,
      columns,
      tableUpdating,
      isBlankPage,
      date_range,
      checkIn_checkOut_List,
      pageLoading,
      blankData,
      pagination,
      dateRangeValue,
    } = this.state;
    const { isComponent } = this.props;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [5, 10, 25, 50, 100],
    };
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
          <Paper className="paper-background">
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Box className="heading">Student RFID History</Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  {isUserHasPermission(
                    "student_rfid_attendance_report",
                    "view"
                  ) && (
                    <Button
                      variant="contained"
                      onClick={() => this.gotoViewCheckInCheckOutList()}
                      className="editbutton-view"
                    >
                      <VisibilityOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.student_rfid_attendance_report.view.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Box className="md-down-justify-start md-up-justify-start mb-y-20">
              <Box className="year-std-box mr-40">
                <Box className="academic-std-head">Student Name</Box>
                <Box className=" exam-mark-add-heading-bg">{name}</Box>
              </Box>
            </Box>
            <Grid container spacing={2}>
              {/* <Grid item md={4} xs={12} className='margin-top-15'>
                                <Dropdown
                                    data={dateRangeDropdownList}
                                    name='dateRangeDropdown'
                                    value={dateRangeDropdown}
                                    onChange={this.onChangeDateRangeDropdown}
                                    label='Date Range'
                                    hideSelect={true}
                                />
                            </Grid> */}
              <Grid item md={4} xs={12}>
                <DateRange
                  handleChange={this.handleChangeDateRange}
                  minDate={date_range.minDate}
                  maxDate={date_range.maxDate}
                  startDate={dateRangeValue.start}
                  endDate={dateRangeValue.end}
                  label="Custom Date range"
                  ref={this.dateRange}
                  hideClearIcon={true}
                />
              </Grid>
            </Grid>

            {isBlankPage && !pageLoading && (
              <Box className="header-align">
                <BlankPagewithIcon data={blankData} />
              </Box>
            )}
            {pageLoading && (
              <Box display="flex">
                <CircularProgress className="loading" />
              </Box>
            )}
            {!isBlankPage && !pageLoading && (
              <Grid container className="header-align">
                <Grid item md={8} xs={12}>
                  <Paper>
                    <AllMUIDataTable
                      key={checkIn_checkOut_List.data_list}
                      title={
                        tableUpdating ? (
                          <CircularProgress className="white-text" />
                        ) : (
                          ""
                        )
                      }
                      data={checkIn_checkOut_List.data_list}
                      columns={columns}
                      options={options}
                      onTableChange={this.getStudentHistoryList}
                      serverSide={true}
                      pagination={pagination}
                      count={checkIn_checkOut_List.count}
                    />
                  </Paper>
                </Grid>
              </Grid>
            )}
          </Paper>
        </Box>
      );
    }
  }
}
export default withRouter(StudentIndividualRFIDReport);
