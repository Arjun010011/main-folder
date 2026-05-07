import React, { Component, Fragment } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  Tooltip,
  CircularProgress,
  TextField,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import Swal from "sweetalert2";
import _ from "lodash";

import ActionColumn from "Components/ActionColumnNew";
import { Dropdown } from "Components/DropDown";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import StudentListActions from "Includes/StudentListActions";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  getKeyValueMap,
  getAcademicYear,
  SetAcademicYear,
  getUrlParam,
  getSettingValue,
  getFullName,
  updatePermissions,
  getFormatMessage,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { numberRegex } from "Constants/regularExpression";
import BlankPagewithIcon from "Components/BlankPageWithIcon";

const isResidential = parseInt(getSettingValue("is_residential"));
const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

const fieldDetails = [
  {
    label: "RFID No.",
    regex: numberRegex,
    name: "rfid",
    md: 12,
    className: "width-100",
    required: false,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    autoFocus: true,
    maxLength: "25",
  },
];

class StudentRfidList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("student_rfid_list", ["update"]);
    this.state = {
      studentList: [],
      dataReady: false,
      GridEnabled: false,
      ListEnabled: true,
      loading: true,
      tableUpdating: false,
      student_type: "All",
      enabledActions: [],
      filterList: [],
      studentTypeList: [
        { name: "All", id: "All" },
        { name: "Day Scholar", id: "Day Scholar" },
        { name: "Residential", id: "Residential" },
      ],
      searchStudent: "",
      dateRangeValue: {},
      dateRangeValueDefault: {},
      current_standard: null,
      isBlankPage: true,
      blankData: "Select academic year, standard and section",
      error: {},
      selectedYear: "",
      selectedSection: "",
      selectedStandard: "",
      columns: [
        {
          name: "student",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: false,
            search: false,
            display: false,
            download: false,
          },
        },
        {
          name: "full_name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "current_reg_num",
          label: <FormattedMessage {...commonMessages.regNum} />,
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "rfid",
          label: "RFID No.",
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "Action",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            viewColumns: false,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <ActionColumn
                    id={tableMeta.rowData[0]}
                    fieldValues={[tableMeta.rowData[3]]}
                    label={`Edit RFID No. for ${tableMeta.rowData[1]}`}
                    fieldDetails={fieldDetails}
                    postUrl={POST_URL.studentrfidregister.api}
                    updatePostFormat={this.updatePostFormat}
                    updateType={this.updateType}
                    baseClassName="action-basic-detail-width"
                    enabledActions={this.permission}
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

  componentDidMount() {
    let { selectedStandard, selectedSection, selectedYear } = getUrlParam();
    this.setState(
      {
        selectedStandard,
        selectedSection,
        selectedYear,
      },
      () => {
        this.getAcademicYearList(
          selectedYear,
          selectedStandard,
          selectedSection
        );
      }
    );
  }

  updatePostFormat = (newData, id) => {
    let payload = {
      rfid_datas: [
        {
          rfid: newData.rfid ? parseInt(newData.rfid, 10) : "",
          student: id,
        },
      ],
    };
    return payload;
  };

  updateType = (newData, id) => {
    let students = this.state.studentList;
    for (const data of students) {
      if (data.student === id) {
        data.rfid = newData.rfid ? parseInt(newData.rfid, 10) : "";
        break;
      }
    }
    this.setState({
      studentList: [...students],
    });
    return true;
  };

  getAcademicYearList = async (year, selectedStandard, selectedSection) => {
    let { selectedYear } = this.state;
    const url = GET_URL.getacademicyear.api;
    const param = { is_active: true };
    await getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            yearList: response.data.data,
          },
          () => {
            if (getAcademicYear() || year) {
              selectedYear = getAcademicYear() ? getAcademicYear() : year;
              this.setState(
                {
                  selectedYear,
                  blankData: `Select ${alias_names["standard"]} and ${alias_names["section"]}`,
                },
                () => {
                  this.getStandardList(selectedStandard, selectedSection);
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

  onChange = (e) => {
    let {
      value,
      name,
      selectedSection,
      selectedStandard,
      sectionList,
      standardList,
    } = e.target;
    if (value !== 0) {
      this.setState(
        {
          [name]: value,
          error: {},
        },
        () => {
          if (name === "selectedYear") {
            selectedStandard = "";
            selectedSection = "";
            standardList = [];
            sectionList = [];
            SetAcademicYear(value);
            this.getStandardList();
            this.setState({
              selectedStandard,
              selectedSection,
              standardList,
              sectionList,
              isBlankPage: true,
              blankData: `Select ${alias_names["standard"]} and ${alias_names["section"]}`,
            });
          } else if (name === "selectedStandard") {
            selectedSection = "";
            this.setState({
              selectedSection,
              isBlankPage: true,
              blankData: `Select ${alias_names["section"]}`,
            });
          } else if (name === "selectedSection") {
            this.getStudentList();
          }
        }
      );
    }
  };

  getStandardList = (selectedStandard, selectedSection) => {
    let { selectedYear } = this.state;
    const url = GET_URL.getstandardandsection.api;
    const param = { is_active: true, academic_year: selectedYear };
    getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        let sectionList = {};
        response.data.data.map((data) => {
          sectionList[data["id"]] = data.sections;
        });
        let section = selectedSection ? selectedSection : "";
        this.setState(
          {
            standardList: response.data.data,
            loading: false,
            sectionList,
            selectedStandard,
            selectedSection: section,
          },
          () => {
            if (selectedSection) {
              this.getStudentList();
            }
          }
        );
      }
    });
  };

  getStudentList = () => {
    let { selectedYear, selectedStandard, selectedSection } = this.state;
    const url = GET_URL.getenrolledstudents.api;
    let params = {
      academic_year: selectedYear,
      is_active: true,
      standard: selectedStandard,
      section: selectedSection,
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((data) => {
          data["full_name"] = getFullName(
            data["student_first_name"],
            data["student_middle_name"],
            data["student_last_name"]
          );
        });
        this.setState({
          studentList: response.data.data,
          dataReady: true,
          loading: false,
          tableUpdating: false,
          isBlankPage: false,
          blankData: "",
        });
      }
    });
  };

  handleAddApplicationButton = () => {
    let {
      selectedYear,
      selectedStandard,
      selectedSection,
      yearList,
      standardList,
      sectionList,
      error,
      alertData,
    } = this.state;
    if (selectedYear && selectedStandard && selectedSection) {
      let yearName = getKeyValueMap(yearList, "id", "name");
      yearName = yearName[selectedYear];
      let standardName = getKeyValueMap(standardList, "id", "name");
      standardName = standardName[selectedStandard];
      let sectionName = getKeyValueMap(
        sectionList[selectedStandard],
        "id",
        "name"
      );
      sectionName = sectionName[selectedSection];
      let yearInformation = {
        selectedYear,
        selectedStandard,
        selectedSection,
        yearName,
        standardName,
        sectionName,
      };
      let searchParam = "?" + new URLSearchParams(yearInformation).toString();
      this.props.history.push({
        pathname: Actions.student_rfid_list.create.url,
        search: searchParam,
      });
    } else {
      let errorData = "";
      if (!selectedYear) {
        errorData = <FormattedMessage {...commonMessages.selectAcademicYear} />;
        error.selectedYear = errorData;
      } else if (!selectedStandard) {
        errorData = errorData ? (
          <FormattedMessage {...commonMessages.clearAllErrors} />
        ) : (
          <FormattedMessage {...commonMessages.selectStandard} />
        );
        error.selectedStandard = errorData;
      } else if (!selectedSection) {
        errorData = errorData ? (
          <FormattedMessage {...commonMessages.clearAllErrors} />
        ) : (
          <FormattedMessage {...commonMessages.selectSection} />
        );
        error.selectedSection = errorData;
      }
      alertData = errorData;
      this.setState({
        open: true,
        alertData,
        error,
      });
    }
  };

  render() {
    let {
      yearList,
      selectedYear,
      studentList,
      tableUpdating,
      loading,
      isBlankPage,
      blankData,
      error,
      standardList,
      selectedStandard,
      selectedSection,
      sectionList,
    } = this.state;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [10, 25, 50, 100],
      onDownload: (buildHead, buildBody, columns, data) => {
        columns.forEach((column_name) => {
          column_name.label = getFormatMessage(column_name.label);
        });
        return "\uFEFF" + buildHead(columns) + buildBody(data);
      },
      downloadOptions: {
        filename: "Student_RFID_List.csv",
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
              <Box className="heading">Student RFID List</Box>
            </Grid>
            <Grid item lg={6} md={3} xs={12}>
              <Box className={classNames("header-align", "end-flex-prop")}>
                {isUserHasPermission("student_rfid_list", "create") && (
                  <Button
                    variant="contained"
                    onClick={this.handleAddApplicationButton}
                    className="editbutton-view"
                  >
                    <AddCircleOutlineIcon className="visibility-icon" />{" "}
                    {Actions.student_rfid_list.create.label}
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
                  name="selectedYear"
                  value={selectedYear}
                  onChange={this.onChange}
                  label={<FormattedMessage {...commonMessages.academicYear} />}
                  error={error.selectedYear}
                  hideSelect={true}
                />
              </Box>
            </Grid>
            <Grid item md={3} xs={12}>
              <Box className="header-align">
                <Dropdown
                  data={standardList}
                  name="selectedStandard"
                  value={selectedStandard}
                  onChange={this.onChange}
                  label={<FormattedMessage {...commonMessages.standard} />}
                  error={error.selectedStandard}
                  hideSelect={true}
                />
              </Box>
            </Grid>
            <Grid item md={3} xs={12}>
              <Box className="header-align">
                <Dropdown
                  data={selectedStandard ? sectionList[selectedStandard] : []}
                  name="selectedSection"
                  value={selectedSection}
                  onChange={this.onChange}
                  label={<FormattedMessage {...commonMessages.section} />}
                  error={error.selectedSection}
                  hideSelect={true}
                />
              </Box>
            </Grid>
          </Grid>
          {isBlankPage ? (
            <Box className="header-align">
              <BlankPagewithIcon data={blankData} />
            </Box>
          ) : (
            <Grid container className={"header-align"}>
              <Grid item md={8} xs={12}>
                <Paper>
                  <AllMUIDataTable
                    data={studentList}
                    key={studentList}
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    columns={this.state.columns}
                    options={options}
                  />
                </Paper>
              </Grid>
            </Grid>
          )}
        </Paper>
      );
    }
  }
}
export default withRouter(StudentRfidList);
