import React, { Component, Fragment, forwardRef } from "react";
import {
  Paper,
  Box,
  Button,
  Grid,
  Tooltip,
  CircularProgress,
  TextField,
  Dialog,
  Slide,
  DialogActions,
  DialogTitle,
  DialogContent,
  Typography,
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import Swal from "sweetalert2";
import _ from "lodash";
import { debounceSearchRender } from "mui-datatables";
import PropTypes from "prop-types";
import ClearIcon from "@material-ui/icons/Clear";
import { SUCCESS_MSG_PROPS } from "Constants";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
  KeyboardDateTimePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import Snackbar from "@material-ui/core/Snackbar";

import { Dropdown } from "Components/DropDown";
import AdmissionPrintForm from "Containers/StudentForms/Components/AdmissionPrintForm";
import { DateRange } from "Components/DateRange";
import StudentGridCard from "Components/ProfileGridCard";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest, deleteRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL, POST_URL } from "Includes/urls";
import StudentListActions from "Includes/StudentListActions";
import { Actions } from "Constants/permissions";
import {
  validateDate,
  dateFormat,
  getIsGridOrListView,
  setIsGridOrListView,
  Alert,
  SetAcademicYear,
  getPaginationProps,
  getSettingValue,
  updatePermissions,
  getFormatMessage,
  getFullName,
  getPreviousAcademicYears,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { minDate, DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import FeeAdjustmentApproval from "./FeeCollection/FeeAdjustmentApproval";

const isResidential = parseInt(getSettingValue("is_residential"));
const admission_in_reg = parseInt(getSettingValue("admission_in_reg"));
let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />;
});

class FeeAdjustmentApprovalList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("admission_student", ["view"]);
    this.state = {
      studentList: { data_list: [], count: 0 },
      AllStudentList: { data_list: [], count: 0 },
      dataReady: false,
      GridEnabled: false,
      ListEnabled: true,
      loading: true,
      tableUpdating: false,
      tableLoading: true,
      statusList: [
        { name: "All", id: "All" },
        { name: "Pending", id: "0,3" },
        { name: "Approved", id: "1" },
        { name: "Rejected", id: "2" },
      ],
      status: "0,3",
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      filterList: [],
      openPopup: false,
      selectedStudentList: [],
      showEnrollSubmitPopUp: false,
      error: {},
      year: "",
      yearToList: [],
      to_academic_year: "",
      current_standard: null,
      to_standard: "",
      standardList: null,
      standardToList: [],
      fieldError: {},
      admission_date: null,
      columns: [
        {
          name: "student_data",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: true,
            search: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <Tooltip
                  title={
                    tableMeta.rowData[7]
                      ? "Re Admission Student"
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
                        tableMeta.rowData[7]
                          ? "application-old-student-list-admitted"
                          : "application-student-list-admitted"
                      }
                    ></Box>
                    <Box>{value.name}</Box>
                  </Box>
                </Tooltip>
              );
            },
          },
        },
        {
          name: "student_data",
          label: <FormattedMessage {...commonMessages.standard} />,
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
              <>{value.current_standard_name}</>
              )
            },
          },
        },
        {
          name: "student_data",
          label: <FormattedMessage {...commonMessages.mobileNo} />,
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
              <>{value.mobile_num}</>
              )
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
          name: "admission_num",
          label: "Admission Num",
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "status",
          label: <FormattedMessage {...commonMessages.studentType} />,
          options: {
            filter: false,
            sort: true,
            display: !!isResidential,
            download: !!isResidential,
          },
        },
        {
          name: "admission_history",
          label: <FormattedMessage {...commonMessages.studentType} />,
          options: {
            filter: false,
            sort: true,
            display: false,
            download: false,
          },
        },
        {
          name: "approval_status_text",
          label: 'Approval Status',
          options: {
            filter: false,
            sort: true,
            display: true,
            download: false,
          },
        },
        {
          name: "approval_status",
          label: 'Approval Status',
          options: {
            filter: false,
            sort: true,
            display: false,
            download: false,
          },
        },
        {
          name: "approved_documents",
          label: 'Documents',
          options: {
            filter: false,
            sort: false,
            display: true,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              const documents = value || [];
              if (documents.length === 0) {
                return <Typography variant="body2" style={{ color: '#999', fontSize: '12px' }}>No documents</Typography>;
              }
              return (
                <Tooltip
                  title={
                    <div style={{ padding: '4px' }}>
                      {documents.map((doc, idx) => (
                        <div key={doc.id || idx} style={{ marginBottom: '4px' }}>
                          {doc.file_name || 'Document'}
                        </div>
                      ))}
                    </div>
                  }
                  enterDelay={400}
                  enterNextDelay={400}
                  placement="top-start"
                >
                  <Box display="flex" alignItems="center" gap="4px">
                    <AttachFileIcon style={{ color: '#1976d2', fontSize: '18px' }} />
                    <Typography variant="body2" style={{ fontSize: '12px' }}>
                      {documents.length} file{documents.length > 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Tooltip>
              );
            },
          },
        },
        {
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              let isHasApprovalPermission = true;
              let isAdjustmentReason = "";
              let adjustmentParentIds = [tableMeta.rowData[3]];
              return (
                <div>
                  {isHasApprovalPermission  && (tableMeta.rowData[8] == '0' || tableMeta.rowData[8] == '3')? (
                    <div className="d-flex flex-justify-center-flex-prop ">
                      <Tooltip
                        title={"Concession Approval"}
                        enterDelay={400}
                        enterNextDelay={400}
                        placement="top-start"
                        classes={{ tooltip: "tooltip-show-data" }}
                      >
                        <Button
                          className="custom-button-approval"
                          onClick={(e) =>
                            this.adjustmentApproval(e, adjustmentParentIds)
                          }
                        >
                          Concession Approval
                        </Button>
                      </Tooltip>
                    </div>
                  ) : (
                    <div className="text-red text-align-center">{tableMeta.rowData[7]}</div>
                  )}
                </div>
              );
            },
            customHeadRender: (columnMeta, updateDirection) => (
              <th className="mui-table-custom-header-center-align">
                {columnMeta.label}
              </th>
            ),
          },
        },
      ],
    };
    this.dateRange = React.createRef();
  }

  adjustmentApproval = (e, parentIds) => {
    e.stopPropagation();
    this.setState({
      adjustmentApprovalEnabled: true,
      parentIds: parentIds,
    });
  };

  handlePrintForm = (id) => {
    this.setState({
      student_id: id,
      openPopup: true,
    });
  };

  async componentDidMount() {
    let { GridEnabled, ListEnabled, year } = this.state;
    this.getAcademicYearList();
    this.getStudentList();
    this.permission = [
      ...this.permission,
      ...updatePermissions("admission_student_list", ["update", "delete"]),
    ];
    if (getIsGridOrListView()) {
      let isGridView = getIsGridOrListView() === "true";
      if (isGridView) {
        // GridEnabled = true
        // ListEnabled = false
      }
    }

    this.setState({
      GridEnabled,
      ListEnabled,
    });
  }

  getAcademicYearList = () => {
    const url = GET_URL.getacademicyear.api;
    const param = { is_active: true };
    getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.unshift({ id: "all", name: "All" });
        this.setState({
          yearList: response.data.data,
          year: "all",
          loading: false,
        });
      }
    });
  };

  onChange = async (e) => {
    let { value, name } = e.target;
    if (value !== 0) {
      SetAcademicYear(value);
      this.setState(
        {
          [name]: value,
          error: {},
        },
        () => {
          if (value !== "all") {
            this.getStandardList();
          } else {
            this.getStudentList();
          }
        }
      );
    }
  };

  onChangeToYear = async (e) => {
    let { fieldError } = this.state;
    let { value, name } = e.target;
    delete fieldError[name];
    if (value !== 0) {
      this.setState(
        {
          [name]: value,
          error: {},
          fieldError,
        },
        () => {
          this.getToStandardList();
        }
      );
    }
  };

  getToStandardList = () => {
    let { to_academic_year } = this.state;
    const url = GET_URL.getstandard.api;
    const param = { is_active: true, academic_year: to_academic_year };
    getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          standardToList: response.data.data,
        });
      }
    });
  };

  getStudentList = (paginationProps) => {
    let { pagination, year, current_standard, dateRangeValue, status } =
      this.state;
    this.setState({ tableUpdating: true, dateRangeValue: dateRangeValue });
    this.currentPagination = pagination;
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    let params = {
      ...pagination_params,
      is_active: true,
      admission_num: true,
    };
    if (year && year !== "all") {
      let temp = {};
      temp["student_academic_year"] = year;
      if (current_standard && current_standard !== "all") {
        temp["current_standard"] = current_standard;
        params = { ...params, ...temp };
      }
      params = { ...params, ...temp };
    }
    if (!_.isEmpty(dateRangeValue)) {
      let temp = {};
      temp["from_date"] = dateRangeValue.start;
      temp["to_date"] = dateRangeValue.end;
      params = { ...params, ...temp };
    }
    if (status !== "All") {
      let temp = {};
      temp['approval_statuses'] = status
      params = { ...params, ...temp };
    }
    
    params["admission_history"] = true;
    const url = GET_URL.adjustmentapprovalrequest.api;
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            tableUpdating: false,
            columns: [...this.state.columns],
          },
          () => {
            const studentList = response.data;
            // Ensure data_list exists and is an array
            const dataList = (studentList?.data?.data_list || []);
            dataList.map((data) => {
              if (data && data.student_data) {
                data["full_name"] = getFullName(
                  data.student_data["first_name"],
                  data.student_data["middle_name"],
                  data.student_data["last_name"]
                );
              }
            });
            // Ensure we have a valid structure
            const listData = studentList?.data || { data_list: [], count: 0 };
            this.setState({
              studentList: listData,
              AllStudentList: listData,
              // tableUpdating: false,
              rowsSelected: [],
              dataReady: true,
              loading: false,
              tableLoading: false,
              pagination: this.currentPagination,
            });
          }
        );
      } else {
        // Handle error case
        this.setState({
          tableUpdating: false,
          studentList: { data_list: [], count: 0 },
          AllStudentList: { data_list: [], count: 0 },
          loading: false,
          tableLoading: false,
        });
      }
    }).catch((error) => {
      console.error('Error fetching adjustment approval list:', error);
      this.setState({
        tableUpdating: false,
        studentList: { data_list: [], count: 0 },
        AllStudentList: { data_list: [], count: 0 },
        loading: false,
        tableLoading: false,
      });
    });
  };

  getStandardList = () => {
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
            current_standard: "all",
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

  onChangeHandleView = (name) => {
    let { AllStudentList, studentList, filterList } = this.state;
    let GridEnabled = false;
    let ListEnabled = false;
    let setValue = false;
    if (name === "GridEnabled") {
      setValue = true;
      GridEnabled = true;
      if (filterList.length !== 0) studentList = [...filterList];
    } else {
      studentList = [...AllStudentList];
      ListEnabled = true;
    }
    setIsGridOrListView(setValue);
    this.setState({
      GridEnabled,
      ListEnabled,
      studentList,
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

  onChangeStudentType = async (e) => {
    let { value } = e.target;
    this.setState(
      {
        status: value,
        academicYearFromDate: "",
        academicYearToDate: "",
        current_standard: null,
        dateRangeValue: {},
      },
      () => {
        this.getStudentList();
      }
    );
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

  handleStandardChange = (e) => {
    let { value } = e.target;
    const { pagination } = this.state;
    this.setState(
      {
        current_standard: value,
      },
      () => {
        this.getStudentList(pagination);
      }
    );
  };

  geFilterOptions = () => {
    let {
      current_standard,
      dateRangeValueDefault,
      academicYearFromDate,
      academicYearToDate,
      standardList,
    } = this.state;
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
    let { year, error, alertData, yearList } = this.state;
    if (year !== "") {
      let year_name;
      yearList.map((data) => {
        if (data.id == year) {
          year_name = data.name;
        }
      });
      let yearInformation = {
        year,
        year_name,
      };
      let searchParam = "?" + new URLSearchParams(yearInformation).toString();
      this.props.history.push({
        pathname: Actions.admission_student_list.create.url,
        search: searchParam,
      });
    } else {
      alertData = <FormattedMessage {...commonMessages.selectAcademicYear} />;
      error.year = alertData;
      this.setState({
        open: true,
        alertData,
        error,
      });
    }
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
      selectedStudentList = studentList.data_list.filter((data, index) =>
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

  submit = () => {
    const {
      selectedStudentList,
      to_academic_year,
      to_standard,
      admission_date,
      academicYearFromDate,
    } = this.state;
    let fieldError = {};
    if (selectedStudentList.length === 0) {
      this.setState({
        alertData: <FormattedMessage {...commonMessages.studentErr} />,
        snackbar: true,
        severity: "error",
      });
      return;
    }
    if (!to_academic_year) {
      fieldError["to_academic_year"] = "Select Academic Year";
      this.setState({
        alertData: "Select Academic Year",
        snackbar: true,
        severity: "error",
        fieldError,
      });
      return;
    }
    if (!to_standard) {
      fieldError["to_standard"] = "Select Standard";
      this.setState({
        alertData: "Select Standard",
        snackbar: true,
        severity: "error",
        fieldError,
      });
      return;
    }
    if (!admission_date) {
      fieldError["admission_date"] = "Select Admission Date";
      this.setState({
        alertData: "Select Admission Date",
        snackbar: true,
        severity: "error",
        fieldError,
      });
      return;
    }
    if (validateDate(admission_date, minDate, academicYearFromDate)) {
      fieldError["admission_date"] = validateDate(
        admission_date,
        minDate,
        academicYearFromDate
      );
      this.setState({
        alertData: validateDate(admission_date, minDate, academicYearFromDate),
        snackbar: true,
        severity: "error",
        fieldError,
      });
      return;
    }
    const payload = {
      academic_year: to_academic_year,
      standard: to_standard,
      student_ids: selectedStudentList.map((data) => data.id),
      admission_date: dateFormat(admission_date, "YYYY-MM-DD"),
    };
    let url = POST_URL.movestudenttopreviousyear.api;
    postRequest(url, payload, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            ...SUCCESS_MSG_PROPS,
            title: response.data.Reason,
          });
          this.getStudentList();
        }
        this.setState({ showEnrollSubmitPopUp: false });
      })
      .catch(() => {
        this.setState({ showEnrollSubmitPopUp: false });
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

  handleCloseAdjustmentDetail = () => {
    this.setState({
      adjustmentApprovalEnabled: false,
    });
  };

  handleCloseApproval = (isUpdateRequired) => {
    if (isUpdateRequired) {
      this.getStudentList();
    }
    this.handleCloseAdjustmentDetail();
  };

  render() {
    let {
      ListEnabled,
      GridEnabled,
      yearList,
      yearToList,
      year,
      loading,
      tableUpdating,
      enabledActions,
      searchStudent,
      studentList,
      pagination,
      statusList,
      status,
      openPopup,
      student_id,
      error,
      showEnrollSubmitPopUp,
      selectedStudentList,
      to_standard,
      standardToList,
      to_academic_year,
      current_standard,
      standardList,
      fieldError,
      academicYearFromDate,
      admission_date,
      snackbar,
      alertData,
      adjustmentApprovalEnabled,
      parentIds,
    } = this.state;
    const options = {
      selectableRows: "multiple",
      filterType: "dropdown",
      responsive: "simple",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsSelected: this.state.rowsSelected,
      // customSearchRender: debounceSearchRender(200),
      rowsPerPageOptions: [5, 10, 25, 50, 100],
      customFilterDialogFooter: () => {
        return this.geFilterOptions();
      },
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
        filename: "Admission_Students.csv",
        filterOptions: {
          useDisplayedColumnsOnly: true,
          useDisplayedRowsOnly: true,
        },
      },
      customToolbarSelect: (selectedRows) => (
        <MuiToolbar
          name={<FormattedMessage {...messages.enrollStudents} />}
          selectedRows={selectedRows}
          showEnableFeaturePopup={this.handlePopupStatus}
        />
      ),
    };
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Paper className={classNames("paper-background")}>
          <Grid container>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">Fee Adjustment Approval List</Box>
            </Grid>
          </Grid>
          <Grid container spacing={3}>
            <Grid item lg={3} md={4} xs={12}>
              <Box className="header-align">
                <Dropdown
                  data={statusList}
                  name="status"
                  value={status}
                  onChange={this.onChangeStudentType}
                  label={"Approval Status"}
                  hideSelect={true}
                />
              </Box>
            </Grid>
            <Grid item lg={3} md={4} xs={12}>
              <Box className="header-align">
                <Dropdown
                  data={yearList}
                  name="year"
                  value={year}
                  onChange={this.onChange}
                  label={<FormattedMessage {...commonMessages.academicYear} />}
                  error={error.year}
                  hideSelect={true}
                />
              </Box>
            </Grid>
            {year !== "all" && standardList && (
              <Grid item lg={3} md={4} xs={12}>
                <Box className="header-align">
                  <Dropdown
                    data={standardList}
                    name={current_standard}
                    value={current_standard}
                    onChange={(e) => this.handleStandardChange(e)}
                    label={<FormattedMessage {...commonMessages.standard} />}
                    hideSelect={true}
                  />
                </Box>
              </Grid>
            )}
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
                  data={studentList.data_list}
                  columns={this.state.columns}
                  options={options}
                  onTableChange={this.getStudentList}
                  serverSide={true}
                  pagination={pagination}
                  count={studentList.count}
                  // loading={tableUpdating}
                />
              </Paper>
            </Grid>
          </Grid>
          {adjustmentApprovalEnabled && (
            <FeeAdjustmentApproval
              closeInParent={this.handleCloseApproval}
              parentIds={parentIds}
            />
          )}
          <Dialog
            open={showEnrollSubmitPopUp}
            onClose={this.handlePopupStatus}
            keepMounted
            TransitionComponent={Transition}
            maxWidth="md"
            fullWidth={true}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="form-dialog-title">
              <Box className="dropdown-outer-box">
                <Box className="enroll-dropdown-item">
                  <Dropdown
                    data={yearToList}
                    name="to_academic_year"
                    value={to_academic_year}
                    onChange={this.onChangeToYear}
                    label={
                      <FormattedMessage {...commonMessages.academicYear} />
                    }
                    hideSelect={true}
                    helperText={
                      fieldError["to_academic_year"] &&
                      fieldError["to_academic_year"]
                    }
                    error={
                      fieldError["to_academic_year"] &&
                      fieldError["to_academic_year"]
                    }
                  />
                </Box>
                <Box className="enroll-dropdown-item">
                  <Dropdown
                    data={standardToList}
                    name="to_standard"
                    value={to_standard}
                    onChange={(e) => this.onChangeStandard(e)}
                    label={<FormattedMessage {...commonMessages.standard} />}
                    hideSelect={true}
                    helperText={
                      fieldError["to_standard"] && fieldError["to_standard"]
                    }
                    error={
                      fieldError["to_standard"] && fieldError["to_standard"]
                    }
                  />
                </Box>
                <Box className="enroll-dropdown-item">
                  <MuiPickersUtilsProvider utils={DateFnsUtils}>
                    <KeyboardDatePicker
                      className={""}
                      autoOk
                      variant="inline"
                      inputVariant="outlined"
                      label={"Admission Date"}
                      name={"admission_date"}
                      required={true}
                      // minDate={field.parentMinDate ? fieldValue[field.parentMinDate] : field.minDate}
                      maxDate={academicYearFromDate}
                      format="dd-MM-yyyy"
                      value={admission_date}
                      onChange={(e) => this.handleSearchChange(e)}
                      KeyboardButtonProps={{
                        "aria-label": "change date",
                      }}
                      inputProps={{ maxLength: 50 }}
                      helperText={
                        fieldError["admission_date"] &&
                        fieldError["admission_date"]
                      }
                      error={
                        fieldError["admission_date"] &&
                        fieldError["admission_date"]
                      }
                    />
                  </MuiPickersUtilsProvider>
                </Box>
              </Box>
            </DialogTitle>
            <hr />
            <DialogContent>
              <Box>
                <Box className="">
                  {selectedStudentList.map((stu, ind) => {
                    return (
                      <Box key={ind} className="d-flex">
                        <Box className="enrolling-student">{stu.name}</Box>
                        {/* <Box
                          className="close-enrolling-student pointer"
                          onClick={() => this.removeEnrollingStudent(ind)}
                        >
                          <ClearIcon fontSize="7px" />
                        </Box> */}
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
              <Button onClick={this.submit} color="primary">
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
        </Paper>
      );
    }
  }
}

export default withRouter(FeeAdjustmentApprovalList);

const MuiToolbar = ({ selectedRows, showEnableFeaturePopup }) => {
  return (
    <div className="toolbar-select">
      <Button
        variant="contained"
        color="primary"
        className="mr-20 submit"
        onClick={() => showEnableFeaturePopup(selectedRows)}
      >
        Concession Approval
      </Button>
    </div>
  );
};

MuiToolbar.propTypes = {
  selectedRows: PropTypes.array.isRequired,
  showEnableFeaturePopup: PropTypes.func.isRequired,
};
