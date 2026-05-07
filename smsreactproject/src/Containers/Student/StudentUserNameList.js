import React, { Component, Fragment, forwardRef } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  Tooltip,
  CircularProgress,
  Slide,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import _ from "lodash";
import Snackbar from "@material-ui/core/Snackbar";
import Skeleton from "@material-ui/lab/Skeleton";

import { Dropdown } from "Components/DropDown";
import { DateRange } from "Components/DateRange";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import {
  dateFormat,
  setIsGridOrListView,
  Alert,
  SetAcademicYear,
  getPaginationProps,
  updatePermissions,
  getFormatMessage,
  getFullName,
  getPreviousAcademicYears,
  isUserHasPermission,
  getKeyValueMap,
  getAcademicYear,
  getUrlParam,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { DEFAULT_PAGINATION_PROPS_FIRST_NAMES_LIST } from "Constants";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
export const STUDENT_TYPE = [
  { id: "all", name: "ALL" },
  { id: "new_student", name: "New Student" },
];

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />;
});

class StudentUserNameList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("admission_student", ["view"]);
    this.state = {
      studentList: [],
      AllStudentList: [],
      dataReady: false,
      GridEnabled: false,
      ListEnabled: true,
      loading: true,
      tableUpdating: false,
      selectedSection: "",
      tableLoading: true,
      studentTypeList: [
        { name: "All", id: "All" },
        { name: "Day Scholar", id: "Day Scholar" },
        { name: "Residential", id: "Residential" },
      ],
      student_type: "All",
      pagination: { ...DEFAULT_PAGINATION_PROPS_FIRST_NAMES_LIST },
      filterList: [],
      openPopup: false,
      selectedStudentList: [],
      showEnrollSubmitPopUp: false,
      error: {},
      year: "",
      yearToList: [],
      to_academic_year: "",
      current_standard: "",
      is_academic_newstudent:"",
      to_standard: "",
      standardList: [],
      standardToList: [],
      fieldError: {},
      admission_date: null,
      sectionList: [],
      sectionLoading: false,
      pathname: "student_username_list",
      columns: [
        {
          name: "full_name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: true,
            search: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <Tooltip
                  title={
                    tableMeta.rowData[8]
                      ? "Old Student"
                      : "New Admission Student"
                  }
                  enterDelay={400}
                  enterNextDelay={400}
                  placement="top-start"
                  classes={{ tooltip: "tooltip-show-data" }}
                >
                  <Box display="flex">
                    <Box
                      className={
                        tableMeta.rowData[8]
                          ? "application-old-student-list-admitted"
                          : "application-student-list-admitted"
                      }
                    ></Box>
                    <Box>{value}</Box>
                  </Box>
                </Tooltip>
              );
            },
          },
        },
        {
          name: "current_standard_name",
          label: <FormattedMessage {...commonMessages.standard} />,
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "admission_num",
          label: "Admission Num",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "dob",
          label: <FormattedMessage {...commonMessages.dob} />,
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return value && dateFormat(value, "DD-MM-YYYY");
            },
          },
        },
        {
          name: "username",
          label: "User Name",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "mobile_num",
          label: <FormattedMessage {...commonMessages.mobileNo} />,
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "last_activity",
          label: "Last Activity",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return value && dateFormat(value, "DD-MM-YYYY hh:mm A");
            },
          },
        },
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
          name: "is_new_student",
          label: <FormattedMessage {...commonMessages.studentType} />,
          options: {
            filter: false,
            sort: true,
            display: false,
            download: false,
          },
        },
        {
          name: "current_student_group_name",
          label: "Student Group",
          options: {
            filter: false,
            sort: true,
            display: true,
            download: false,
          },
        },
      ],
    };
    this.dateRange = React.createRef();
  }

  async componentDidMount() {
    this.getAcademicYearList();
    this.permission = [
      ...this.permission,
      ...updatePermissions("admission_student_list", ["update", "delete"]),
    ];
    if (
      this.props.location.pathname === Actions.student_admission_list.view.url
    ) {
      this.setState({
        pathname: "student_admission_list",
      });
    }
  }

  getAcademicYearList = async () => {
    let { year } = this.state;
    const url = GET_URL.getacademicyear.api;
    const param = { is_active: true };
    await getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        let fromYear = "";
        let ToYear = "";
        response.data.data.map((data) => {
          fromYear = data.start_date.split("-");
          ToYear = data.end_date.split("-");
          // data.name = fromYear[0] + "-" + ToYear[0];
        });
        this.setState(
          {
            yearList: response.data.data,
          },
          () => {
            const academicYearId = getAcademicYear();
            if (academicYearId) {
              year = academicYearId;
              this.setState(
                {
                  year,
                },
                () => {
                  this.getStandardList();
                }
              );
            } else {
              this.setState({
                loading: false,
              });
            }
          }
        );
      }
    });
  };

  onChange = async (e) => {
    let { value, name } = e.target;
    if (value !== 0) {
      if (name === "year") {
        SetAcademicYear(value);
      }
      this.setState(
        {
          [name]: value,
          error: {},
        },
        () => {
          if(name==="year"){
            this.getStandardList();
          }
          else if(name==="selectedSection"){
            this.getStudentList()
          }
        }
      );
    }
  };

  getStudentList = (paginationProps) => {
    let { pagination, year, current_standard, dateRangeValue, selectedSection ,is_academic_newstudent} =
      this.state;
    this.setState({ tableUpdating: true, dateRangeValue: dateRangeValue });
    this.currentPagination = pagination;
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    let params = {
      ...pagination_params,
      student_academic_year: year,
      is_active: true,
      admission_num: true,
    };
    if (is_academic_newstudent && is_academic_newstudent !== "all") {
      let temp={};
      temp['is_academic_newstudent'] = is_academic_newstudent;
      params = { ...params, ...temp };
    }
    if (current_standard && current_standard !== "all") {
      let temp = {};
      temp["current_standard"] = current_standard;
      params = { ...params, ...temp };
    }
    if (selectedSection && selectedSection !== "all") {
      let temp = {};
      temp["standard_section"] = selectedSection;
      params = { ...params, ...temp };
    }
    params["admission_history"] = true;
    const url = GET_URL.student.api;
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            tableUpdating: false,
            columns: [...this.state.columns],
          },
          () => {
            const studentList = response.data;
            studentList.data.student_list.map((data) => {
              data["full_name"] = getFullName(
                data["first_name"],
                data["middle_name"],
                data["last_name"]
              );
            });
            this.setState({
              studentList: studentList.data,
              AllStudentList: studentList.data,
              rowsSelected: [],
              dataReady: true,
              loading: false,
              tableLoading: false,
              pagination: this.currentPagination,
            });
          }
        );
      }
    });
  };

  getStandardList = () => {
    const { selectedStandard } = getUrlParam();
    let { year, yearList, academicYearFromDate, academicYearToDate } =
      this.state;
    yearList.map((data) => {
      if (data.id == year) {
        academicYearFromDate = data.start_date;
        academicYearToDate = data.end_date;
      }
    });
    const url = GET_URL.getstandard.api;
    const param = { is_active: true, academic_year: year };
    getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.unshift({ id: "all", name: "All" });
        this.setState(
          {
            standardList: response.data.data,
            current_standard: selectedStandard ? selectedStandard : "all",
            academicYearFromDate,
            academicYearToDate,
          },
          () => {
            this.getStudentList();
          }
        );
      }
    });
  };

  getSectionList = (id) => {
    const { year } = this.state;
    const url = GET_URL.getsection.api;
    const params = {
      academic_year: year,
      is_active: true,
      standard: id,
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let sectionList = response.data.data;
        let temp = { standard_section: "all", id: "all", name: "All" };
        sectionList.unshift(temp);
        this.setState({
          sectionLoading: false,
          selectedSection: "all",
          sectionList,
        });
      }
    });
  };

  handleFilter = (e) => {
    let { name, value, filterList } = e.target;
    let { studentList, AllStudentList } = this.state;
    if (value !== "") {
      let lowerCasedFilter = value.toLowerCase();
      filterList = AllStudentList.filter((item) => {
        return Object.keys(item).some(
          (key) =>
            typeof item[key] === "string" &&
            item[key].toLowerCase().includes(lowerCasedFilter)
        );
      });
      studentList = filterList;
    } else {
      studentList = [...AllStudentList];
      filterList = [];
    }
    this.setState({
      [name]: value,
      studentList,
      filterList,
    });
  };

  onFilterChangeHandler = (type) => {
    if (type === "reset") {
      this.setState(
        {
          current_standard: null,
          dateRangeValue: {},
          dateRangeValueDefault: {},
        },
        () => {
          this.getStudentList();
          this.dateRange.current.handleClear();
        }
      );
    }
  };

  handleStudentTypeChange = (e) => {
    let { value } = e.target;
    const { pagination, error } = this.state;
    delete error["student_type"];
    this.setState(
      {
        is_academic_newstudent: value,
        error,
        sectionLoading: value !== "all",
      },
      () => {
        this.getStudentList(pagination);
      }
    );
  };

  handleStandardChange = (e) => {
    let { value } = e.target;
    const { pagination, error } = this.state;
    delete error["current_standard"];
    this.setState(
      {
        current_standard: value,
        error,
        sectionLoading: value !== "all",
      },
      () => {
        if (value !== "all") {
          this.getSectionList(value);
        }
        this.getStudentList(pagination);
      }
    );
  };

  geFilterOptions = () => {
    let { academicYearFromDate, academicYearToDate } = this.state;
    return (
      <Fragment>
        <DateRange
          handleChange={this.handleChangeDateRange}
          minDate={academicYearFromDate}
          maxDate={academicYearToDate}
          ref={this.dateRange}
          label={<FormattedMessage {...commonMessages.dateRange} />}
        />
      </Fragment>
    );
  };

  handleChangeDateRange = (value) => {
    let { pagination } = this.state;
    this.setState(
      {
        dateRangeValue: value,
        dateRangeValueDefault: {},
      },
      () => {
        this.getStudentList(pagination);
      }
    );
  };

  handleClosePopup = () => {
    this.setState({
      openPopup: false,
    });
  };

  handleAddAdmissionButton = () => {
    let {
      year,
      error,
      alertData,
      yearList,
      standardList,
      current_standard,
      pathname,
      is_academic_newstudent,
    } = this.state;
    if (!year) {
      alertData = <FormattedMessage {...commonMessages.selectAcademicYear} />;
      error.year = alertData;
      this.setState({
        open: true,
        alertData,
        error,
      });
      return;
    }
    if (!current_standard || current_standard === "all") {
      alertData = "Standard All is not a valid choice";
      error.current_standard = alertData;
      this.setState({
        open: true,
        alertData,
        error,
      });
      return;
    }
    let year_name = getKeyValueMap(yearList, "id", "name");
    let standard_name = getKeyValueMap(standardList, "id", "name");
    let yearInformation = {
      year,
      year_name: year_name[year],
      standard: current_standard,
      standard_name: standard_name[current_standard],
    };
    if (is_academic_newstudent) {
    yearInformation['is_academic_newstudent'] = is_academic_newstudent }
    let searchParam = "?" + new URLSearchParams(yearInformation).toString();
    this.props.history.push({
      pathname: Actions[pathname].create.url,
      search: searchParam,
    });
  };

  handlePopupStatus = (selectedRows, actionStatus) => {
    let {
      studentList,
      showEnrollSubmitPopUp,
      selectedStudentList,
      yearList,
      academicYearFromDate,
    } = this.state;
    const yearToList = getPreviousAcademicYears(yearList, academicYearFromDate);
    if (selectedRows && selectedRows.data) {
      const selectedIndices = selectedRows.data.map((data) => data.dataIndex);
      selectedStudentList = studentList.student_list.filter((data, index) =>
        selectedIndices.includes(index)
      );
    }
    this.setState({
      showEnrollSubmitPopUp: !showEnrollSubmitPopUp,
      selectedStudentList,
      actionStatus,
      yearToList,
    });
  };

  onChangeStandard = (e) => {
    let { fieldError } = this.state;
    let { value, name } = e.target;
    delete fieldError[name];
    this.setState({
      [name]: value,
      fieldError,
    });
  };

  handleSearchChange = (e) => {
    let { fieldError } = this.state;
    delete fieldError["admission_date"];
    this.setState({
      admission_date: e,
      fieldError,
    });
  };

  render() {
    let {
      yearList,
      year,
      loading,
      tableUpdating,
      studentList,
      pagination,
      error,
      current_standard,
      standardList,
      snackbar,
      alertData,
      pathname,
      sectionList,
      sectionLoading,
      selectedSection,is_academic_newstudent
    } = this.state;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsSelected: this.state.rowsSelected,
      rowsPerPageOptions: [5, 10, 25, 50, 100, 200],
      onFilterChange: (onFilterChange, filterList, type) => {
        this.onFilterChangeHandler(type, onFilterChange);
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
      downloadOptions: {
        filename: "User_Name_List.csv",
        filterOptions: {
          useDisplayedColumnsOnly: true,
          useDisplayedRowsOnly: true,
        },
      },
    };
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Paper className={classNames("paper-background")}>
          <Grid container>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">{Actions[pathname].view.label}</Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className={classNames("header-align", "end-flex-prop")}>
                {isUserHasPermission(pathname, "create") && (
                  <Button
                    variant="contained"
                    onClick={this.handleAddAdmissionButton}
                    className="editbutton-view"
                  >
                    <AddCircleOutlineIcon className="visibility-icon" />{" "}
                    {Actions[pathname].create.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          <Grid container className="m-bt-15px" spacing={2}>
            <Grid item md={3} xs={12}>
              <Box className="header-align">
                <Dropdown
                  data={yearList}
                  name="year"
                  value={year}
                  onChange={this.onChange}
                  label={<FormattedMessage {...commonMessages.academicYear} />}
                  error={error.year}
                  hideSelect={true}
                  size={"small"}
                  className="width-100"
                />
              </Box>
            </Grid>
            <Grid item md={3} xs={12}>
              <Box className="header-align">
                <Dropdown
                  data={standardList}
                  name={current_standard}
                  value={current_standard}
                  onChange={(e) => this.handleStandardChange(e)}
                  label={<FormattedMessage {...commonMessages.standard} />}
                  hideSelect={true}
                  error={error.current_standard}
                  size={"small"}
                  className="width-100"
                />
              </Box>
            </Grid>
            <Grid item md={3} xs={12}>
              <Box className="header-align">
                <Dropdown
                  data={STUDENT_TYPE}
                  name={is_academic_newstudent}
                  value={is_academic_newstudent}
                  onChange={(e) => this.handleStudentTypeChange(e)}
                  label={"Student Type"}
                  hideSelect={true}
                  error={error.is_academic_newstudent}
                  size={"small"}
                  className="width-100"
                />
              </Box>
            </Grid>
            <Grid item md={3} xs={12}>
              {sectionList.length > 2 &&
                current_standard !== "all" &&
                (sectionLoading ? (
                  <Box className="header-align">
                    <Skeleton
                      variant="rect"
                      className="drop-down-small-skeleton m-t-10px"
                    ></Skeleton>
                  </Box>
                ) : (
                  <Box className="header-align">
                    <Dropdown
                      data={sectionList}
                      name="selectedSection"
                      value={selectedSection}
                      onChange={this.onChange}
                      label={<FormattedMessage {...commonMessages.section} />}
                      className="width-100"
                      hideSelect={true}
                      customId="standard_section"
                      size={"small"}
                    />
                  </Box>
                ))}
            </Grid>
          </Grid>
          <Grid
            container
            className={classNames("flex-justify-center", "header-align")}
          >
            <Grid item md={12} xs={12}>
              <Paper>
                <AllMUIDataTable
                  title={
                    tableUpdating ? (
                      <CircularProgress className="white-text" />
                    ) : (
                      ""
                    )
                  }
                  data={studentList.student_list}
                  columns={this.state.columns}
                  options={options}
                  onTableChange={this.getStudentList}
                  serverSide={true}
                  pagination={pagination}
                  count={studentList.count}
                  hideTextTransform={true}
                />
              </Paper>
            </Grid>
          </Grid>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={snackbar}
            autoHideDuration={10000}
            onClose={this.handleClose}
          >
            <Alert onClose={this.handleClose} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
        </Paper>
      );
    }
  }
}

export default withRouter(StudentUserNameList);
