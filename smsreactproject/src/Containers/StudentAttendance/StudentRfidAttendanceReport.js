import React, { Component } from "react";
import { Paper, Box, Button, Grid } from "@material-ui/core";
import classNames from "classnames";
import { withRouter } from "react-router-dom";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import StudentListActions from "Includes/StudentListActions";
import { Actions } from "Constants/permissions";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import {
  dateFormat,
  isUserHasPermission,
  printPDFService,
  checkLocalAcademicYear,
  SetAcademicYear,
  updatePermissions,
  getKeyValueInArray,
  getFullName,
  getKeyValueMap,
  getCurrentAndPreviousAcademicYears,
  getPaginationProps,
  validateDate,
  getStandard,
  SetStandard,
  getAcademicYear,
  getStandardSection,
  setStandardSection,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { DEFAULT_PAGINATION_PROPS_FIRST_NAMES_LIST } from "Constants";
import { Dropdown } from "Components/DropDown";
import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import { roundOffDecimal } from "Constants";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import moment from "moment";
import { DateRange } from "Components/DateRange";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class StudentRfidAttendanceReport extends Component {
  constructor() {
    super();
    let date = new Date();
    this.permission = updatePermissions("student_rfid_attendance_history", [
      "view",
    ]);
    this.state = {
      year: "",
      errors: {},
      yearList: [],
      standard: "",
      standardList: [],
      standard_section: "",
      section_list: [],
      standard_section_mapping: {},
      startDate: dateFormat(
        new Date(date.getFullYear(), date.getMonth(), 1),
        "YYYY-MM-DD"
      ),
      endDate: dateFormat(date, "YYYY-MM-DD"),
      selected_date: new Date(),
      minDate: "",
      maxDate: "",
      loading: true,
      pagination: { ...DEFAULT_PAGINATION_PROPS_FIRST_NAMES_LIST },
      tableLoading: false,
      date_range: { minDate: "", maxDate: "" },
      updating_date_range: false,
      columns: [
        {
          name: "id",
          label: "ID",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
          },
        },
        {
          name: "student_name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: false,
            search: false,
          },
        },
        {
          name: "admission_num",
          label: <FormattedMessage {...commonMessages.admissioNo} />,
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "in_time",
          label: "In Time",
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "out_time",
          label: "Out Time",
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "status",
          label: "Status",
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => {
              return (
                <Box className="cloumn-width white-space">
                  <Box className="text-capitalize">{value}</Box>
                </Box>
              );
            },
          },
        },
      ],
    };
  }

  componentDidMount() {
    this.getAcademicYear();
    if (getAcademicYear()) {
      this.setState(
        {
          year: getAcademicYear(),
        },
        () => {
          this.getStandard();
        }
      );
    }
  }

  getAcademicYear = () => {
    const param = { is_active: true };
    getRequest(GET_URL.getacademicyear.api, param, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          const yearList = getCurrentAndPreviousAcademicYears(
            response.data.data
          );
          let start_date_object = getKeyValueMap(yearList, "id", "start_date");
          let end_date_object = getKeyValueMap(yearList, "id", "end_date");
          const year = checkLocalAcademicYear(yearList);
          this.setState(
            { yearList, start_date_object, end_date_object },
            () => {
              if (year) {
                let date_range = {};
                date_range["minDate"] = start_date_object[year];
                date_range["maxDate"] = end_date_object[year];
                this.setState({ date_range, year });
              } else {
                this.setState({
                  loading: year ? true : false,
                });
              }
            }
          );
        }
      }
    );
  };

  getStandard = () => {
    let { year, standard, standard_section } = this.state;
    const params = { academic_year: year, is_active: true };
    getRequest(GET_URL.getstandardandsection.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          let standard_section_mapping = [];
          response.data.data.map((data) => {
            standard_section_mapping[data["id"]] = data?.sections ?? [];
          });
          if (response.data.data.length == 1) {
            standard = response.data.data[0];
          } else if (getStandard()) {
            standard = getStandard();
          }
          if (standard) {
            if (standard_section_mapping?.[standard]?.length === 1) {
              standard_section =
                standard_section_mapping[standard][0]["standard_section"];
            } else if (getStandardSection()) {
              standard_section = getStandardSection();
            }
          }
          this.setState(
            {
              standardList: response.data.data,
              standard: standard,
              loading: standard_section ? true : false,
              standard_section_mapping,
              standard_section,
            },
            () => {
              if (standard && standard_section) {
                this.getStudentList();
              }
            }
          );
        }
      }
    );
  };

  getAttendanceReport = (studentid) => {
    let { standard_section } = this.state;
    let props = { ...this.props };
    let { from_date, to_date } = this.getDataParams();
    props.url = `${GET_URL.attendance.api}${studentid}/?from_date=${from_date}&to_date=${to_date}&standard_section=${standard_section}`;
    printPDFService(props);
  };

  onChange = async (e) => {
    const { start_date_object, end_date_object } = this.state;
    let value = e.target.value;
    const name = e.target.name;
    if (value) {
      if (name === "year") {
        this.setState({ updating_date_range: true }, () => {
          let date_range = {};
          date_range["minDate"] = start_date_object[value];
          date_range["maxDate"] = end_date_object[value];
          this.setState(
            {
              [name]: value,
              standard: "",
              standard_section: "",
              studentList: [],
              date_range,
              updating_date_range: false,
            },
            () => {
              this.getStandard();
              SetAcademicYear(value);
              SetStandard("");
              setStandardSection("");
            }
          );
        });
      } else if (name === "standard") {
        this.setState(
          {
            [name]: value,
            standard_section: "",
            studentList: [],
          },
          () => {
            SetStandard(value);
            setStandardSection("");
          }
        );
      } else if (name === "standard_section") {
        this.setState(
          {
            [name]: value,
            studentList: [],
          },
          () => {
            this.getStudentList();
            setStandardSection(value);
          }
        );
      }
    }
  };

  getStudentList = (paginationProps) => {
    this.setState({ tableUpdating: true });
    let { pagination, year, standard, standard_section, selected_date } =
      this.state;
    if (!standard_section) return;
    this.currentPagination = pagination;
    let pagination_params = getPaginationProps(this.currentPagination);
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    const url = GET_URL.rfidattendance.api;
    const params = {
      ...pagination_params,
      academic_year: year,
      standard: standard,
      standard_section: standard_section,
      for_date: dateFormat(selected_date, "YYYY-MM-DD"),
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const studentList = response.data;
        studentList.data.data_list.map((data) => {
          data["in_time"] = data["in_time"]
            ? dateFormat(data["in_time"], "DD-MM-YYYY hh:mm A")
            : "";
          data["out_time"] = data["out_time"]
            ? dateFormat(data["out_time"], "DD-MM-YYYY hh:mm A")
            : "";
        });
        this.setState({
          studentList: studentList.data,
          AllStudentList: [],
          dataReady: true,
          loading: false,
          tableUpdating: false,
          pagination: this.currentPagination
            ? this.currentPagination
            : this.state.pagination,
        });
      }
    });
  };

  handleChangeDateRange = (value) => {
    this.setState(
      {
        dateRangeValue: value,
        startDate: "",
        endDate: "",
      },
      () => {
        this.getStudentList();
      }
    );
  };

  getBlankPageMessage = () => {
    let { standard_section, standard, year } = this.state;
    if (!standard_section) {
      if (!standard) {
        if (!year) {
          return `Select the Academic year, ${alias_names["standard"]} and  ${alias_names["section"]} to view the student List`;
        }
        return `Select the ${alias_names["standard"]} and  ${alias_names["section"]} to view the student List`;
      }
      return `Select the  ${alias_names["section"]} to view the student List`;
    }
  };

  downloadRfidReport = (status) => {
    const { year, standard ,selected_date} = this.state;
    let params = {
      download_excel: 1,
      academic_year: year,
      for_date: dateFormat(selected_date, "YYYY-MM-DD"),
    };
    if (status !== "All") {
      params["standard_id"] = standard;
    }
    let prop = { ...this.props };
    prop.responseType = "blob";
    const url = GET_URL.rfidattendance.api;
    getRequest(url, params, prop).then((response) => {
      if (response && response.status === 200) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Student_List.xlsx`);
        document.body.appendChild(link);
        link.click();
        this.setState({
          tableUpdating: false,
          loading: false,
        });
        return;
      }
    });
    return false;
  };

  onChangeSelectedDate = (e, fromDate, toDate) => {
    const { errors } = this.state;
    this.setState(
      {
        selected_date: e,
      },
      () => {
        let error = "";
        if (e === null) {
          this.setState({
            isBlankPage: true,
          });
          error = `Select Date`;
        } else {
          error = validateDate(e, fromDate, toDate);
        }
        if (error !== "" && error !== "Invalid Date") {
          errors["selected_date"] = error;
        } else {
          errors["selected_date"] = "";
          if (error !== "Invalid Date") {
            this.setState({
              tableUpdating: true,
            });
            this.getStudentList();
          }
        }
        this.setState({ errors });
      }
    );
  };

  handleGoToModifyAttendance = () => {
    this.props.history.push({
      pathname: Actions.student_rfid_attendance_report.create.url,
    });
  };

  render() {
    let {
      loading,
      date_range,
      yearList,
      standardList,
      standard,
      studentList,
      year,
      standard_section,
      standard_section_mapping,
      fromDate,
      selected_date,
      errors,
      pagination,
    } = this.state;
    if (loading) {
      return <LoadingGif />;
    } else {
      const options = {
        selectableRows: "none",
        filterType: "dropdown",
        responsive: "simple",
        filter: false,
        download: true,
        print: false,
        viewColumns: false,
        rowsPerPageOptions: [5, 10, 25, 50, 100],
        onDownload: () => {
          return this.downloadRfidReport();
        },
      };
      return (
        <Paper
          className={classNames("paper-background")}
          style={{ background: "transparent", boxShadow: "none" }}
        >
          <Grid container>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">Student RFID Attendance Report</Box>
            </Grid>
            <Grid item lg={6} md={3} xs={12}>
              <Box className={classNames("header-align", "end-flex-prop")}>
                {isUserHasPermission(
                  "student_rfid_attendance_report",
                  "create"
                ) && (
                  <Button
                    variant="contained"
                    onClick={this.handleGoToModifyAttendance}
                    className="editbutton-view"
                  >
                    <AddCircleOutlineIcon className="visibility-icon" />{" "}
                    {Actions.student_rfid_attendance_report.create.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          <Grid container spacing={2} className={classNames("header-align")}>
            <Grid item lg={3} md={3} xs={6}>
              <Dropdown
                data={yearList}
                name="year"
                value={year}
                required={true}
                hideSelect={true}
                onChange={(e) => this.onChange(e, "year")}
                label={<FormattedMessage {...commonMessages.academicYear} />}
              />
            </Grid>
            <Grid item lg={3} md={3} xs={6}>
              <Dropdown
                data={standardList}
                name="standard"
                value={standard}
                required={true}
                hideSelect={true}
                onChange={(e) => this.onChange(e, "standard")}
                label={<FormattedMessage {...commonMessages.standard} />}
              />
            </Grid>
            <Grid item lg={3} md={3} xs={6}>
              {standard_section_mapping?.[standard]?.length > 0 && (
                <Dropdown
                  data={standard_section_mapping?.[standard]}
                  name="standard_section"
                  customId={"standard_section"}
                  value={standard_section}
                  required={true}
                  hideSelect={true}
                  onChange={(e) => this.onChange(e, "standard_section")}
                  label={<FormattedMessage {...commonMessages.section} />}
                />
              )}
            </Grid>
            {standard_section && (
              <Grid item lg={3} md={3}>
                <div className="text-align-end">
                  <Button
                    className="custom-button"
                    onClick={() => this.downloadRfidReport("All")}
                  >
                    Download All
                  </Button>
                </div>
              </Grid>
            )}
          </Grid>
          {standard && standard_section && (
            <div className="mt-20">
              <MuiPickersUtilsProvider utils={DateFnsUtils}>
                <KeyboardDatePicker
                  autoOk
                  variant="inline"
                  inputVariant="outlined"
                  label="Select Date"
                  name="selected_date"
                  minDate={fromDate}
                  maxDate={new Date()}
                  format="dd-MM-yyyy"
                  value={selected_date}
                  onChange={(e) =>
                    this.onChangeSelectedDate(e, fromDate, new Date())
                  }
                  KeyboardButtonProps={{
                    "aria-label": "change date",
                  }}
                  helperText={
                    !errors.selected_date
                      ? "Valid Format DD-MM-YYYY"
                      : errors.selected_date
                  }
                  error={
                    errors.selected_date &&
                    (errors.selected_date ? true : false)
                  }
                />
              </MuiPickersUtilsProvider>
            </div>
          )}
          <Grid
            container
            className={classNames("flex-justify-center", "header-align")}
          >
            <Grid item md={12} xs={12} className={classNames("header-align")}>
              {!standard_section && (
                <BlankPagewithIcon data={this.getBlankPageMessage()} />
              )}
              {standard && standard_section && (
                <Paper>
                  <AllMUIDataTable
                    options={options}
                    data={studentList.data_list}
                    columns={this.state.columns}
                    onTableChange={this.getStudentList}
                    serverSide={true}
                    pagination={pagination}
                    count={studentList.count}
                  />
                </Paper>
              )}
            </Grid>
          </Grid>
        </Paper>
      );
    }
  }
}

export default withRouter(StudentRfidAttendanceReport);
