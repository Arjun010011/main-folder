import React, { Component, Fragment, forwardRef } from "react";
import Grid from "@material-ui/core/Grid";
import {
  Box,
  Paper,
  Slide,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Radio,
  Icon,
  Checkbox,
} from "@material-ui/core";
import ClearIcon from "@material-ui/icons/Clear";
import Snackbar from "@material-ui/core/Snackbar";
import { FormattedMessage } from "react-intl";
import PropTypes from "prop-types";
import Swal from "sweetalert2";
import _ from "lodash";
import BlankPagewithIcon from "Components/BlankPageWithIcon";

import {
  checkLocalAcademicYear,
  SetAcademicYear,
  dateFormat,
  getSettingValue,
  Alert,
  getFullName,
  getCurrentAndPreviousAcademicYears,
  numberWithCommas,
} from "Includes/functions";
import { STUDENT_TYPE,SUCCESS_MSG_PROPS, DATATABLEROWSPERPAGEOPT } from "Constants";
import { getRequest, postRequest } from "Includes/api/apicall";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { GET_URL, POST_URL } from "Includes/urls";
import { Dropdown } from "Components/DropDown";
import commonMessages from "Constants/messages";
import messages from "./messages";
import "./styles.scss";
import { FlareSharp } from "@material-ui/icons";

const isResidential = parseInt(getSettingValue("is_residential"));
const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

// eslint-disable-next-line react/display-name
const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />;
});

class PromoteStudent extends Component {
  state = {
    year: "",
    yearList: [],
    standardList: [],
    from_standard: "",
    studentList: [],
    selectedStudent: [],
    enrollingStudentIds: [],
    selectedStudentList: [],
    promotestudent: { to_selected_standard: "" },
    fromStandardName: "",
    blankPageMessage: " ",
    actionStatus: "pass",
    showEnrollSubmitPopUp: false,
    studentName: "",
    openStudentHistoryPopUp: false,
    history: [],
    rowsSelected: [],
    tableUpdating: false,
    selected_tab: "Promote",
    toStandardName: "",
    fieldError: {},
    loadingText: "loading..............................................",
    isDepromoteStudent: false,
    bulkCancelMode: false,
    isDisabled: false,
    bulkCancelLoading: false,
    unEnrolledCols: [
      {
        name: "student",
        label: "id",
        options: {
          sort: false,
          filter: false,
          display: false,
          search: false,
          viewColumns: false,
        },
      },
      {
        name: "name",
        label: <FormattedMessage {...commonMessages.studentName} />,
        options: {
          filter: false,
          sort: true,
          search: true,
          customBodyRender: (value) => {
            return <Box className="text-left">{value}</Box>;
          },
        },
      },
      {
        name: "admission_num",
        label: "Admission No.",
        options: {
          filter: false,
          sort: true,
          search: true,
        },
      },
      {
        name: "pending_amount",
        label: "Pending Amount",
        options: {
          filter: false,
          sort: true,
          search: true,
          customBodyRender: (value) => {
            return <Box className="text-left">{numberWithCommas(value)}</Box>;
          },
        },
      },
      {
        name: "section_name",
        label: <FormattedMessage {...commonMessages.sectionName} />,
        options: {
          filter: false,
          sort: true,
          search: true,
        },
      },
      {
        name: "student_type",
        label: <FormattedMessage {...commonMessages.studentType} />,
        options: {
          filter: !!isResidential,
          sort: true,
          display: !!isResidential,
          viewColumns: !!isResidential,
        },
      },
      {
        name: "progress_status",
        label: <FormattedMessage {...commonMessages.result} />,
        options: {
          filter: false,
          sort: true,
          search: false,
          customBodyRender: (value) => {
            if (value) {
              return (
                <div className="toolbar-select">
                  {value === "Pass" ? "PASS" : "RETENTION"}
                </div>
              );
            }
          },
        },
      },
      {
        name: "Actions",
        label: <FormattedMessage {...commonMessages.actions} />,
        options: {
          filter: false,
          download: false,
          sort: false,
          customBodyRender: (value, tableMeta) => {
            return (
              <div>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() =>
                    this.openStudentHistory(
                      tableMeta.rowData[0],
                      tableMeta.rowData[1]
                    )
                  }
                >
                  <FormattedMessage {...messages.reportHistory} />
                </Button>
              </div>
            );
          },
        },
      },
      {
        name: "progress_status",
        label: "Cancel",
        options: {
          filter: false,
          download: false,
          sort: false,
          customBodyRender: (value, tableMeta) => {
            return (
              <div>
                {value && (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() =>
                      this.handleDepromoteStudent(
                        tableMeta.rowData[0],
                        tableMeta.rowData[1]
                      )
                    }
                  >
                    Cancel
                  </Button>
                )}
              </div>
            );
          },
        },
      },
    ],
  };

  handleDepromoteStudent = (studentId, studentName) => {
    if (this.state.bulkCancelLoading) return;
    let { studentList, selectedStudentList } = this.state;
    if (studentName === "multiple") {
      studentName = "";
      if (studentId && studentId.data) {
        const selectedIndices = studentId.data.map((data) => data.dataIndex);
        selectedStudentList = studentList.filter((data, index) =>
          selectedIndices.includes(index)
        );
        selectedStudentList = selectedStudentList.map((data) => data.student);
      }
    } else {
      selectedStudentList = [studentId];
    }
    const { promotestudent, from_standard } = this.state;

    Swal.fire({
      title: `<strong>Are you sure want to De promote ${studentName}</strong>`,
      text: "You won't be able to revert again!",
      type: "info",
      showCloseButton: true,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      confirmButtonColor: "green",
      cancelButtonColor: "orange",
    }).then((result) => {
      if (result.value) {
        const targetYear = promotestudent?.to_academic_year?.id;
        if (!targetYear) {
          this.setState({
            alertData: "To Academic Year is missing for cancel.",
            snackbar: true,
            severity: "error",
          });
          return;
        }
        // Cancel should not require manual "To Standard" selection.
        // Split selected students by their promoted target standard:
        // - Pass => next standard
        // - Fail/retained => same standard
        const selectedRows = Array.isArray(studentId?.data)
          ? studentList.filter((data, index) =>
              studentId.data.map((x) => x.dataIndex).includes(index)
            )
          : studentList.filter((x) => selectedStudentList.includes(x.student));
        const nextStandardId =
          promotestudent?.to_selected_standard ||
          promotestudent?.to_standard_list?.[0]?.id ||
          "";
        const passStudentIds = selectedRows
          .filter((r) => r.progress_status === "Pass")
          .map((r) => r.student);
        const retainStudentIds = selectedRows
          .filter((r) => r.progress_status !== "Pass")
          .map((r) => r.student);
        if (!passStudentIds.length && !retainStudentIds.length) {
          this.setState({
            alertData: "No promoted students selected for cancel.",
            snackbar: true,
            severity: "error",
          });
          return;
        }
        const candidatePassStandards = [
          ...(nextStandardId ? [nextStandardId] : []),
          ...((promotestudent?.to_standard_list || []).map((s) => s.id).filter(Boolean)),
        ].filter((v, i, a) => a.indexOf(v) === i);
        const selectedNameMap = {};
        selectedRows.forEach((r) => {
          selectedNameMap[r.student] = r.name || r.student_first_name || "Student";
        });
        const runCancel = async () => {
          this.setState({ bulkCancelLoading: true });
          let successCount = 0;
          const failedStudents = [];
          // Retained students (fail) remain in same standard; one request is enough.
          if (retainStudentIds.length && from_standard) {
            const resp = await postRequest(
              POST_URL.depromotestudent.api,
              {
                from_academic_year: targetYear,
                student: retainStudentIds,
                from_standard: from_standard,
              },
              this.props
            );
            if (resp && resp.status === 200) {
              successCount += retainStudentIds.length;
            } else {
              retainStudentIds.forEach((sid) => failedStudents.push(selectedNameMap[sid] || `${sid}`));
            }
          }
          // Pass students are cancelled together against selected target standard
          // (single request to avoid N API calls).
          if (passStudentIds.length && candidatePassStandards.length) {
            const resp = await postRequest(
              POST_URL.depromotestudent.api,
              {
                from_academic_year: targetYear,
                student: passStudentIds,
                from_standard: candidatePassStandards[0],
              },
              this.props
            );
            if (resp && resp.status === 200) {
              successCount += passStudentIds.length;
            } else {
              passStudentIds.forEach((sid) => failedStudents.push(selectedNameMap[sid] || `${sid}`));
            }
          }
          if (successCount > 0) {
            Swal.fire({
              ...SUCCESS_MSG_PROPS,
              title: `Cancel completed for ${successCount} student(s)${
                failedStudents.length ? `; ${failedStudents.length} failed` : ""
              }.`,
            });
            this.getStudentList();
          } else if (failedStudents.length) {
            this.setState({
              alertData: `${failedStudents.join(", ")} - Not able to depromote. Not valid input`,
              snackbar: true,
              severity: "error",
            });
          }
          this.setState({ bulkCancelLoading: false });
        };
        runCancel().catch(() => {
          this.setState({ showEnrollSubmitPopUp: false, bulkCancelLoading: false });
        });
      }
    });
  };

  handleSelectFunction = (action) => {
    let { studentList, bulkCancelMode } = this.state;
    if (
      bulkCancelMode &&
      action.previousSelectedRow === null &&
      action.selectedRows.data.length > 0
    ) {
      let rowsSelected = [];
      let from = action.page === 0 ? 0 : action.page * action.rowsPerPage;
      let to =
        action.page === 0
          ? action.rowsPerPage
          : action.page * action.rowsPerPage + action.rowsPerPage;
      if (to > studentList.length) {
        to = studentList.length;
      }
      for (let i = from; i < to; i++) {
        if (studentList[i]["progress_status"] !== null) {
          rowsSelected.push(i);
        }
      }
      this.setState({
        rowsSelected,
      });
    } else if (
      !bulkCancelMode &&
      action.previousSelectedRow === null &&
      action.selectedRows.data.length > 0
    ) {
      let rowsSelected = [];
      let from = action.page === 0 ? 0 : action.page * action.rowsPerPage;
      let to =
        action.page === 0
          ? action.rowsPerPage
          : action.page * action.rowsPerPage + action.rowsPerPage;
      if (to > studentList.length) {
        to = studentList.length;
      }
      for (let i = from; i < to; i++) {
        if (studentList[i]["progress_status"] === null) {
          rowsSelected.push(i);
        }
      }
      this.setState({
        rowsSelected,
      });
    } else if (action.previousSelectedRow === null) {
      this.setState({ rowsSelected: [] });
    }
  };

  componentDidMount() {
    this.getAcademicYear();
  }

  getAcademicYear = () => {
    const params = {};
    getRequest(GET_URL.getacademicyear.api, params, this.props).then(
      (response) => {
        if (response && response.status === 200) {
          const yearList = getCurrentAndPreviousAcademicYears(
            response.data.data
          );
          const year = checkLocalAcademicYear(yearList);
          this.setState({ yearList, year: year ? year : "" }, () => {
            if (year) {
              this.getStandardsList(year);
            }
          });
        }
      }
    );
  };

  getStandardsList = (year) => {
    const params = { academic_year: year };
    getRequest(GET_URL.getstandard.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const standardList = response.data.data;
        this.setState({
          standardList,
          from_standard: "",
          promotestudent: { to_selected_standard: "" },
          studentList: [],
        });
      }
    });
  };

  getToFromStandards = () => {
    const { from_standard, year } = this.state;
    let url = `${GET_URL.getpromotestudent.api}${year}/`;
    const params = { standard: from_standard };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const promotestudent = response.data.data;
        this.setState(
          { promotestudent, tableUpdating: true, studentList: [] },
          () => {
            this.getStudentList();
          }
        );
      } else {
        this.setState({
          from_standard: "",
          promotestudent: { to_selected_standard: "" },
          studentList: [],
        });
      }
    });
  };

  onFilterChangeHandler = (type) => {
    if (type === "reset") {
      this.setState(
        {
          studentType: "",
        },
        () => {
          this.getStudentList();
        }
      );
    }
  };
 
  getStudentList = () => {
    const url = GET_URL.getpromotestudent.api;
    const { year, from_standard, studentType } = this.state;
    let params = {
      academic_year: year,
      standard: from_standard,
    };
    if (studentType) {
      params["is_new_student"] = studentType === "new_student" ? 1 : 0;
    }
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const studentList = response.data.data || [];
        let enableAllCheckBox = false;
        if (Array.isArray(studentList)) {
          studentList.map((data) => {
            if (data.progress_status === null) {
              enableAllCheckBox = true;
            }
            data["name"] = getFullName(
              data.student_first_name,
              data.student_middle_name,
              data.student_last_name
            );
          });
        }
        this.setState({
          studentList: [...studentList],
          rowsSelected: [],
          enableAllCheckBox,
        });
      } else {
        console.error("Error fetching promote student list:", response);
      }
      this.setState({ tableUpdating: false });
    }).catch((error) => {
      console.error("Error in getStudentList:", error);
      this.setState({ tableUpdating: false });
    });
  };

  onChange = async (e) => {
    let value = e.target.value;
    if (value !== 0) {
      this.setState(
        { year: value, studentList: [], promotestudent: {}, rowsSelected: [] },
        () => {
          SetAcademicYear(value);
          this.getStandardsList(value);
        }
      );
    }
  };

  onChangeStandard = async (e) => {
    const { selected_tab } = this.state;
    let { value, name } = e.target;
    let fromStandardName = "";
    // eslint-disable-next-line no-unused-vars
    for (const std of this.state.standardList) {
      if (std.id === value) {
        fromStandardName = std.name;
        break;
      }
    }
    if (value !== 0) {
      this.setState(
        {
          [name]: value,
          fromStandardName,
          // studentList: [],
          promotestudent: {},
          rowsSelected: [],
        },
        () => {
          if (name === "from_standard") {
            if (selected_tab === "Promote") {
              this.getToFromStandards();
            }
          }
        }
      );
    }
  };

  onChangeToStandard = async (e) => {
    let { promotestudent, fieldError } = this.state;
    let { value, name } = e.target;
    if (value !== 0) {
      delete fieldError[name];
      let toStandardName = "";
      // eslint-disable-next-line no-unused-vars
      for (const std of this.state.standardList) {
        if (std.id === value) {
          toStandardName = std.name;
          break;
        }
      }
      promotestudent[name] = value;
      this.setState({
        promotestudent,
        fieldError,
        toStandardName,
      });
    }
  };

  removeEnrollingStudent = (index) => {
    let { selectedStudentList } = this.state;
    selectedStudentList.splice(index, 1);
    if (selectedStudentList.length === 0) {
      this.handlePopupStatus();
    }
    this.setState({ selectedStudentList });
  };

  openStudentHistory = (studentId, name) => {
    const params = {
      student: studentId,
    };
    const url = GET_URL.promotestudent.api;
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        if (response.data.data.length > 0) {
          this.setState({
            openStudentHistoryPopUp: true,
            history: response.data.data,
            studentName: name,
          });
        } else {
          Swal.fire({
            type: "warning",
            title: "History not found!!",
            text: "",
          });
        }
      }
    });
  };

  submit = () => {
    const {
      selectedStudentList,
      year,
      from_standard,
      promotestudent,
      actionStatus,
    } = this.state;
    if (selectedStudentList.length === 0) {
      this.setState({
        alertData: <FormattedMessage {...commonMessages.studentErr} />,
        snackbar: true,
        severity: "error",
      });
      return;
    }
    if (!promotestudent.to_selected_standard) {
      this.setState({
        alertData: "Select To Standard",
        snackbar: true,
        severity: "error",
        fieldError: { to_selected_standard: "Select Standard" },
      });
      return;
    }
    this.setState({ isDisabled: true });
    const payload = {
      from_academic_year: year,
      to_academic_year: promotestudent.to_academic_year.id,
      student: selectedStudentList.map((data) => data.student),
      from_standard,
      to_standard: promotestudent.to_selected_standard,
      is_passed: true,
    };
    if (actionStatus === "fail") {
      payload.to_standard = from_standard;
      payload.is_passed = false;
    }
    let url = POST_URL.promotestudent.api;
    postRequest(url, payload, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            ...SUCCESS_MSG_PROPS,
            title: response.data.Reason,
          });
          this.getStudentList();
        }
        this.setState({ showEnrollSubmitPopUp: false, isDisabled: false });
      })
      .catch(() => {
        this.setState({ showEnrollSubmitPopUp: false, isDisabled: false });
      });
  };

  handleClose = () => this.setState({ snackbar: false });

  handleCloseHistory = () => {
    this.setState({
      openStudentHistoryPopUp: false,
      history: [],
      studentName: "",
    });
  };

  handlePopupStatus = (selectedRows, actionStatus) => {
    let {
      studentList,
      showEnrollSubmitPopUp,
      selectedStudentList,
      promotestudent,
    } = this.state;
    if (!promotestudent.to_selected_standard) {
      this.setState({
        alertData: "Select To Standard",
        snackbar: true,
        severity: "error",
        fieldError: { to_selected_standard: "Select Standard" },
      });
      return;
    }
    if (selectedRows && selectedRows.data) {
      const selectedIndices = selectedRows.data.map((data) => data.dataIndex);
      selectedStudentList = studentList.filter((data, index) =>
        selectedIndices.includes(index)
      );
    }
    this.setState({
      showEnrollSubmitPopUp: !showEnrollSubmitPopUp,
      selectedStudentList,
      actionStatus,
    });
  };

  CustomCheckbox = (props) => {
    let { studentList, enableAllCheckBox, bulkCancelMode } = this.state;
    let enableCheckBox = true;
    let index = "";
    if (!props.hasOwnProperty("indeterminate")) {
      index = props["data-index"] === null ? 0 : props["data-index"];
      if (
        !bulkCancelMode &&
        studentList &&
        studentList[index]?.["progress_status"] !== null
      ) {
        enableCheckBox = false;
      } else if (
        bulkCancelMode &&
        studentList &&
        studentList[index]?.["progress_status"] === null
      ) {
        enableCheckBox = false;
      }
    } else if (!enableAllCheckBox) {
      let newProps = { ...Object.assign({}, props) };
      newProps.checked = false;
      newProps.disabled = true;
      return <Checkbox disabled {...newProps} />;
    }
    if (enableCheckBox) {
      let newProps = { ...Object.assign({}, props) };
      newProps.color =
        props["data-description"] === "row-select"
          ? "primary"
          : "rgba(0, 0, 0, 0.54)";
      return <Checkbox {...newProps} />;
    } else {
      let newProps = { ...Object.assign({}, props) };
      newProps.checked = false;
      newProps.disabled = true;
      return <Checkbox disabled {...newProps} />;
    }
  };

  handleResetSelection = () => {
    this.setState({ rowsSelected: [] });
  };

  onChangeHandleView = (user) => {
    const { year, standard } = this.state;
    this.setState(
      {
        selected_tab: user,
        checkInOutList: [],
      },
      () => {
        if (year && standard) {
          this.getStudentList();
        }
      }
    );
  };

  handleStandardChange = (e) => {
    let { name, value } = e.target;
    this.setState(
      {
        [name]: value,
      },
      () => {
        this.getStudentList();
      }
    );
  };

  toggleBulkCancelMode = () => {
    this.setState((prev) => ({
      bulkCancelMode: !prev.bulkCancelMode,
      isDepromoteStudent: !prev.bulkCancelMode,
      rowsSelected: [],
    }));
  };

  geFilterOptions = () => {
    let {
      studentType,
    } = this.state;
    return (
      <Fragment>
        <Box className="margin-top-20">
          <Dropdown
            data={STUDENT_TYPE}
            name={"studentType"}
            value={studentType}
            onChange={(e) => this.handleStandardChange(e)}
            label={"Student Type"}
            hideSelect={true}
            size="small"
          />
        </Box>
      </Fragment>
    );
  };

  render() {
    let {
      studentList,
      year,
      from_standard,
      fromStandardName,
      promotestudent,
      standardList,
      yearList,
      alertData,
      snackbar,
      selectedStudentList,
      unEnrolledCols,
      actionStatus,
      showEnrollSubmitPopUp,
      history,
      studentName,
      openStudentHistoryPopUp,
      updating,
      tableUpdating,
      toStandardName,
      selected_tab,
      isDisabled,
      isDepromoteStudent,
      bulkCancelMode,
      fieldError,
      bulkCancelLoading,
    } = this.state;
    const totalStudents = Array.isArray(studentList) ? studentList.length : 0;
    const promotedStudents = Array.isArray(studentList)
      ? studentList.filter((stu) => stu.progress_status !== null).length
      : 0;
    const passStudents = Array.isArray(studentList)
      ? studentList.filter((stu) => stu.progress_status === "Pass").length
      : 0;
    const failStudents = Array.isArray(studentList)
      ? studentList.filter((stu) => stu.progress_status === "Fail").length
      : 0;
    const pendingStudents = totalStudents - promotedStudents;

    const unEnrolledOptions = {
      responsive: "scroll",
      filter: true,
      download: false,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
      selectableRows: "multiple",
      selectToolbarPlacement: "replace",
      rowsSelected: this.state.rowsSelected,
      textLabels: {
        body: {
          noMatch: tableUpdating
            ? this.state.loadingText
            : "Sorry, there is no matching data to display",
        },
      },
      customFilterDialogFooter: () => {
        return this.geFilterOptions();
      },
      onFilterChange: (onFilterChange, filterList, type) => {
        this.onFilterChangeHandler(type, onFilterChange);
      },
      onTableChange: (action, tableState) => {
        if (action === "rowSelectionChange") {
          this.handleSelectFunction(tableState);
        }
        if (action === "changePage" || action === "changeRowsPerPage") {
          this.handleResetSelection();
        }
      },
      customToolbarSelect: (selectedRows) => (
        <MuiToolbar
          name={<FormattedMessage {...messages.enrollStudents} />}
          selectedRows={selectedRows}
          showEnableFeaturePopup={this.handlePopupStatus}
          bulkCancelMode={bulkCancelMode}
          bulkCancelLoading={bulkCancelLoading}
          handleDepromoteStudent={this.handleDepromoteStudent}
        />
      ),
    };
    return (
      <>
        <Paper>
          <Box className="paper-background">
            <Grid container>
              <Grid item lg={10} md={4} xs={12} sm={12}>
                <Box className="header-align heading">
                  <FormattedMessage {...messages.promoteHead} />
                </Box>
              </Grid>
              <Grid item md={12} xs={12} sm={12}>
                <Box className="staff-list-assigned-shift">
                  Note:
                  <br />
                  1.Only completed academic year will be listed
                  <br />
                  2.Only students who are enrolled for the selected academic
                  year will be listed
                </Box>
                <Box className="dropdown-outer-box">
                  <Box className="enroll-dropdown-item">
                    <Dropdown
                      data={yearList}
                      name="year"
                      value={year}
                      onChange={this.onChange}
                      label={"From Academic Year"}
                      hideSelect={true}
                    />
                  </Box>
                  <Box className="enroll-dropdown-item">
                    <Dropdown
                      data={standardList}
                      name="from_standard"
                      value={from_standard}
                      onChange={(e) =>
                        this.onChangeStandard(e, "from_standard")
                      }
                      label="From Standard"
                      hideSelect={true}
                    />
                  </Box>
                </Box>
              </Grid>
              {from_standard && (
                <Grid item md={12} xs={12} sm={12}>
                  <Box
                    mt={1}
                    mb={1.5}
                    p={1.5}
                    style={{
                      border: "1px solid #dbeafe",
                      borderRadius: 10,
                      background: "linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <Box><strong>Total:</strong> {totalStudents}</Box>
                    <Box><strong>Promoted:</strong> {promotedStudents}</Box>
                    <Box><strong>Pass:</strong> {passStudents}</Box>
                    <Box><strong>Fail/Retained:</strong> {failStudents}</Box>
                    <Box><strong>Pending:</strong> {pendingStudents}</Box>
                  </Box>
                </Grid>
              )}
              {promotestudent.to_standard_list && (
                <Grid item md={12} xs={12} sm={12} className="filter-details">
                  <Box className="md-up-justify-start md-down-justify-space-evenly mb-y-20">
                    <Box className="year-std-box">
                      <Box className="academic-std-head">
                        {<FormattedMessage {...messages.toacademicYear} />}:
                      </Box>
                      <Box className=" aca-std-white-background">
                        {promotestudent.to_academic_year.name}
                      </Box>
                    </Box>
                    <Box className="year-std-box standards-create-fee" mx={2}>
                      <Box className="academic-std-head">
                        <FormattedMessage {...commonMessages.toStandard} />:
                      </Box>
                      <Box className="enroll-dropdown-item ml-10">
                        <Dropdown
                          style={"width-250-px"}
                          variant="standard"
                          data={promotestudent.to_standard_list}
                          name="to_selected_standard"
                          value={promotestudent.to_selected_standard}
                          onChange={(e) => this.onChangeToStandard(e)}
                          label={
                            <FormattedMessage {...commonMessages.standard} />
                          }
                          hideSelect={true}
                          error={
                            fieldError["to_selected_standard"] &&
                            fieldError["to_selected_standard"]
                          }
                        />
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              )}
              {!updating && promotestudent.to_standard_list && (
                <Grid container>
                  <Grid item md={12} xs={12} sm={12}>
                    <Box mb={1} display="flex" justifyContent="flex-end">
                      <Button
                        variant={bulkCancelMode ? "contained" : "outlined"}
                        color="secondary"
                        onClick={this.toggleBulkCancelMode}
                        style={{ textTransform: "none", fontWeight: 700 }}
                      >
                        {bulkCancelMode ? "Exit Bulk Cancel" : "Bulk Cancel"}
                      </Button>
                    </Box>
                    <Box>
                      <AllMUIDataTable
                        key={`promote-student-table-${bulkCancelMode ? "cancel" : "promote"}`}
                        title=""
                        data={studentList}
                        columns={unEnrolledCols}
                        options={unEnrolledOptions}
                        viewSetting="enrollment_assign_subject_to_students"
                        CustomCheckbox={this.CustomCheckbox}
                      />
                    </Box>
                  </Grid>
                </Grid>
              )}
            </Grid>
            {!from_standard && (
              <BlankPagewithIcon data={`Select ${alias_names["standard"]}`} />
            )}
          </Box>
          <Dialog
            open={showEnrollSubmitPopUp}
            onClose={this.handlePopupStatus}
            keepMounted
            TransitionComponent={Transition}
            maxWidth="xs"
            fullWidth={true}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            {promotestudent && promotestudent.to_selected_standard && (
              <DialogTitle id="form-dialog-title" className="text-center">
                {actionStatus === "pass" ? (
                  <FormattedMessage
                    {...messages.promotepassStuHead}
                    values={{
                      from_standard_name: fromStandardName,
                      to_standard_name: toStandardName,
                    }}
                  />
                ) : (
                  <FormattedMessage
                    {...messages.promoteFailStuHead}
                    values={{ from_standard_name: fromStandardName }}
                  />
                )}
              </DialogTitle>
            )}
            <hr />
            <DialogContent>
              <Box>
                <Box className="enroll-block-item">
                  {selectedStudentList.map((stu, ind) => {
                    return (
                      <Box key={ind} className="enrolling-student-bock">
                        <Box className="enrolling-student">{stu.name}</Box>
                        <Box
                          className="close-enrolling-student pointer"
                          onClick={() => this.removeEnrollingStudent(ind)}
                        >
                          <ClearIcon fontSize="7px" />
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
              {/* <Box className='error-content flex-justify-center margin-top-10'>
                  {errorContent}
                </Box> */}
            </DialogContent>
            <DialogActions>
              <Button onClick={this.handlePopupStatus} color="secondary">
                <FormattedMessage {...commonMessages.close} />
              </Button>
              <Button
                disabled={isDisabled}
                onClick={this.submit}
                color="primary"
              >
                <FormattedMessage {...commonMessages.submit} />
              </Button>
            </DialogActions>
          </Dialog>
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
          <Dialog
            fullWidth={true}
            maxWidth={"md"}
            aria-labelledby="max-width-dialog-title"
            open={openStudentHistoryPopUp}
          >
            <DialogTitle id="max-width-dialog-title">
              History - {studentName}
            </DialogTitle>
            <Divider
              className="mr-10 homework-view-devider"
              orientation="vertical"
              flexItem
            />
            <Box className="studentsSelect">
              <TableContainer component={Paper}>
                <Table aria-label="customized table">
                  <TableHead>
                    <TableRow>
                      <TableCell>From Year</TableCell>
                      <TableCell>From Standard</TableCell>
                      <TableCell>To Year</TableCell>
                      <TableCell>To Standard</TableCell>
                      <TableCell>Result</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((std, index) => {
                      let result =
                        std.from_standard_name === std.to_standard_name
                          ? "Fail"
                          : "Pass";
                      return (
                        <TableRow key={index}>
                          <TableCell>{std.from_academic_year_value}</TableCell>
                          <TableCell>{std.from_standard_name}</TableCell>
                          <TableCell>{std.to_academic_year_value}</TableCell>
                          <TableCell>{std.to_standard_name}</TableCell>
                          <TableCell>{result}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            <DialogActions>
              <Button
                autoFocus
                onClick={this.handleCloseHistory}
                color="primary"
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </>
    );
  }
}

export default PromoteStudent;

const MuiToolbar = ({
  selectedRows,
  showEnableFeaturePopup,
  bulkCancelMode,
  bulkCancelLoading,
  handleDepromoteStudent,
}) => {
  return (
    <div className="toolbar-select">
      {bulkCancelMode ? (
        <Button
          variant="contained"
          color="secondary"
          disabled={bulkCancelLoading}
          onClick={() => handleDepromoteStudent(selectedRows, "multiple")}
        >
          {bulkCancelLoading ? "Cancelling..." : "Cancel"}
        </Button>
      ) : (
        <div className="toolbar-select">
          <Button
            variant="contained"
            color="primary"
            className="mr-20 submit"
            onClick={() => showEnableFeaturePopup(selectedRows, "pass")}
          >
            <FormattedMessage {...commonMessages.pass} />
          </Button>
          <Button
            variant="contained"
            color="secondary"
            className="mr-20"
            onClick={() => showEnableFeaturePopup(selectedRows, "fail")}
          >
            <FormattedMessage {...commonMessages.fail} />
          </Button>
        </div>
      )}
    </div>
  );
};

MuiToolbar.propTypes = {
  selectedRows: PropTypes.array.isRequired,
  showEnableFeaturePopup: PropTypes.func.isRequired,
  bulkCancelMode: PropTypes.bool.isRequired,
  bulkCancelLoading: PropTypes.bool.isRequired,
  handleDepromoteStudent: PropTypes.func.isRequired,
};
