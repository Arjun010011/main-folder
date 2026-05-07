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
} from "@material-ui/core";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import Swal from "sweetalert2";
import _ from "lodash";
import { cloneDeep } from "lodash";
import { debounceSearchRender } from "mui-datatables";
import PropTypes from "prop-types";
import ClearIcon from "@material-ui/icons/Clear";
import { CUSTOM_CODE, SUCCESS_MSG_PROPS } from "Constants";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
  KeyboardDateTimePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import Snackbar from "@material-ui/core/Snackbar";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import CloseIcon from "@material-ui/icons/Close";
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";

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
  checkLocalStandard,
  SetStandard,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { minDate, DEFAULT_PAGINATION_PROPS_FIRST_NAMES_LIST } from "Constants";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import AddFinanceInputField from "Containers/Finance/FeeCollection/AddFinanceInputField";
import BlankPagewithIcon from "Components/BlankPageWithIcon";

const isResidential = parseInt(getSettingValue("is_residential"));
const admission_in_reg = parseInt(getSettingValue("admission_in_reg"));
let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />;
});

class StudentCustomFees extends Component {
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
      tableLoading: true,
      feeTypeList: [],
      loadingText: "loading..............................................",
      fee_type: [],
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
      to_standard: "",
      standardList: [],
      standardToList: [],
      fieldError: {},
      admission_date: null,
      tableLoadingTab: false,
      blankPageMessage: "",
      submitDisable: false,
      modifiedStudent: false,
      features: [],
      columns: [
        {
          name: "full_name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: true,
            search: true,
            setCellProps: () => ({
              style: {
                whiteSpace: "nowrap",
                position: "sticky",
                left: "0",
                background: "white",
                zIndex: 100,
              },
            }),
            setCellHeaderProps: () => ({
              style: {
                whiteSpace: "nowrap",
                position: "sticky",
                left: 0,
                zIndex: 101,
              },
            }),
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
                    <Box>{value}</Box>
                  </Box>
                </Tooltip>
              );
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
      ],
    };
    this.dateRange = React.createRef();
  }

  handleChange = (e, id, index) => {
    let { modifiedStudent, AllStudentList } = this.state;
    let tempList = cloneDeep(this.state.studentList);
    tempList.student_list[index][id] = e.target.value;
    if (
      !modifiedStudent &&
      AllStudentList.student_list[index][id] != tempList.student_list[index][id]
    ) {
      modifiedStudent = true;
    }
    this.setState({
      studentList: tempList,
      modifiedStudent,
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
    this.permission = [
      ...this.permission,
      ...updatePermissions("admission_student_list", ["update", "delete"]),
    ];
  }

  getFinanceTypeList = () => {
    const { year, current_standard } = this.state;
    const url = GET_URL.addFeeType.api;
    const params = {
      is_active: true,
      codename: "custom",
      standard: current_standard,
      academic_year: year,
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let columnTemp = [
          {
            name: "full_name",
            label: <FormattedMessage {...commonMessages.studentName} />,
            options: {
              filter: false,
              sort: true,
              search: true,
              setCellProps: () => ({
                style: {
                  whiteSpace: "nowrap",
                  position: "sticky",
                  left: "0",
                  background: "white",
                  zIndex: 100,
                },
              }),
              setCellHeaderProps: () => ({
                style: {
                  whiteSpace: "nowrap",
                  position: "sticky",
                  left: 0,
                  zIndex: 101,
                },
              }),
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
                      <Box>{value}</Box>
                    </Box>
                  </Tooltip>
                );
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
        ];

        response.data.data.map((data) => {
          columnTemp.push({
            name: data.id.toString(),
            label: data.name,
            options: {
              filter: true,
              sort: true,
              customBodyRender: (value, tableMeta, updateValue) => {
                return (
                  <>
                    {(value!=0&&(!value || value === "disable")) && !this.state.tableUpdating ? (
                      <div className="text-red">
                        {`Not Enabled ${data.name} Fee`}
                      </div>
                    ) : (
                      <AddFinanceInputField
                        fieldValue={value}
                        disabled={this.state.tableUpdating}
                        onBlurFieldValue={(e) =>
                          this.handleChange(
                            e,
                            data.id.toString(),
                            tableMeta.rowIndex
                          )
                        }
                        max={1000000}
                      />
                    )}
                  </>
                );
              },
            },
          });
        });
        this.setState(
          {
            feeTypeList: response.data.data,
            fee_type: response.data.data,
            columns: [...columnTemp],
          },
          () => {
            if (response.data.data.length > 0) {
              this.getStudentList();
              this.setState({
                blankPageMessage: "",
              });
            } else {
              this.setState({
                loading: false,
                blankPageMessage:
                  "Custom Fee is not planned with selected year and standard",
              });
            }
          }
        );
      }
    });
  };

  getAcademicYearList = async () => {
    let { year } = this.state;
    const url = GET_URL.getacademicyear.api;
    const param = { is_active: true ,is_finance_page: true};
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
            const academicYearId = user.other_details.academic_year.id;
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
      SetAcademicYear(value);
      this.setState(
        {
          [name]: value,
          error: {},
          studentList: {},
          tableLoading: true,
        },
        () => {
          this.getStandardList();
        }
      );
    }
  };

  getFeeTypes = () => {
    const { fee_type } = this.state;
    let return_value = [];
    fee_type.map((data) => {
      return_value.push(data["id"]);
    });
    return return_value.join(",");
  };

  getStudentList = (paginationProps) => {
    let {
      pagination,
      modifiedStudent,
      year,
      current_standard,
      dateRangeValue,
      fee_type,
    } = this.state;
    this.setState(
      { tableUpdating: true, dateRangeValue: dateRangeValue },
      () => {
        if (modifiedStudent) {
          this.setState({
            snackbar: true,
            alertData:
              "There are moodified amount in this page, please submit it before action",
            tableUpdating: false,
          });
          return false;
        }
        this.currentPagination = pagination;
        if (paginationProps) {
          this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = {
          ...pagination_params,
          academic_year: year,
          is_active: true,
          codename: CUSTOM_CODE,
        };
        if (current_standard && current_standard !== "all") {
          let temp = {};
          temp["standard"] = current_standard;
          params = { ...params, ...temp };
        }
        if (fee_type.length > 0) {
          params["fee_types"] = this.getFeeTypes();
        }
        const url = GET_URL.fianceStudentlist.api;
        getRequest(url, params, this.props).then((response) => {
          if (response && response.status === 200) {
            this.setState(
              {
                tableUpdating: false,
                studentList:[],
                AllStudentList:[]
              },
              () => {
                const studentList = response.data;
                studentList.data.student_list.map((stuData) => {
                  stuData["full_name"] = getFullName(
                    stuData["first_name"],
                    stuData["middle_name"],
                    stuData["last_name"]
                  );
                  stuData["fee_type_feature_map"] = {};
                  let foundFeetype = false;
                  if (stuData.data && stuData.data.length > 0) {
                    fee_type.map((data) => {
                      foundFeetype = false;
                      stuData.data.map((fData) => {
                        if (fData.codename === "custom") {
                          if (data["id"] == fData.fee_type) {
                            foundFeetype = true;
                            stuData[fData.fee_type.toString()] = fData.amount;
                            stuData["fee_type_feature_map"][fData.fee_type] =
                              fData["standard_fee"][0]["id"];
                          }
                        }
                      });
                      if (!foundFeetype) {
                        stuData[data["id"].toString()] = "disable";
                      }
                    });
                  }
                });
                this.setState({
                  studentList: cloneDeep(studentList.data),
                  AllStudentList: cloneDeep(studentList.data),
                  rowsSelected: [],
                  dataReady: true,
                  loading: false,
                  tableLoading: false,
                  pagination: this.currentPagination,
                  modifiedStudent: false,
                });
              }
            );
          }
        });
      }
    );
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
    const param = { is_active: true, academic_year: year , is_finance_page: true};
    getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        const standardList = response.data.data;
        const standard = checkLocalStandard(standardList);
        this.setState(
          {
            standardList: response.data.data,
            current_standard: standard ? standard : "",
            academicYearFromDate,
            academicYearToDate,
          },
          () => {
            if (standard) {
              this.getFinanceTypeList();
              this.setState({
                blankPageMessage: "Select Standard",
              });
            } else {
              this.setState({
                loading: false,
                blankPageMessage: "Select Standard",
              });
            }
          }
        );
      }
    });
  };

  onChangeFeeType = (feeTypes) => {
    this.setState({ tableLoadingTab: true }, () => {
      let columnTemp = [
        {
          name: "full_name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: true,
            search: true,
            setCellProps: () => ({
              style: {
                whiteSpace: "nowrap",
                position: "sticky",
                left: "0",
                background: "white",
                zIndex: 100,
              },
            }),
            setCellHeaderProps: () => ({
              style: {
                whiteSpace: "nowrap",
                position: "sticky",
                left: 0,
                zIndex: 101,
              },
            }),
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
                    <Box>{value}</Box>
                  </Box>
                </Tooltip>
              );
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
      ];
      feeTypes.map((data) => {
        columnTemp.push({
          name: data.id.toString(),
          label: data.name,
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <>
                  {value === "disable" && !this.state.tableUpdating ? (
                    <div className="text-red">
                      {`Not Enabled ${data.name} Fee`}
                    </div>
                  ) : (
                    <AddFinanceInputField
                      fieldValue={value}
                      disabled={this.state.tableUpdating}
                      onBlurFieldValue={(e) =>
                        this.handleChange(
                          e,
                          data.id.toString(),
                          tableMeta.rowIndex
                        )
                      }
                      max={1000000}
                    />
                  )}
                </>
              );
            },
          },
        });
      });
      this.setState(
        {
          fee_type: feeTypes,
          columns: [...columnTemp],
          tableLoadingTab: false,
        },
        () => {
          this.getStudentList();
        }
      );
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

  handleStandardChange = (e) => {
    let { value } = e.target;
    SetStandard(value);
    this.setState(
      {
        current_standard: value,
      },
      () => {
        this.getFinanceTypeList();
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

  removeEnrollingStudent = (index) => {
    let { studentList } = this.state;
    studentList.student_list.splice(index, 1);
    if (studentList.student_list.length === 0) {
      this.handlePopupStatus();
    }
    this.setState({ studentList });
  };

  getPostDatValidate = () => {
    let { studentList, fee_type } = this.state;
    let selectedFeeTypeIds = fee_type.map((data) => data.id);
    let post_data = {
      student_feature: [],
      feature_status: 1,
      deleted_feature: [],
      feature: [],
      fee_plan_item_selling_mapping: {},
      student_custom_fee_type_mapping: {},
    };
    studentList.student_list.map((data) => {
      let intersection = selectedFeeTypeIds.filter((value) =>
        Object.keys(data).includes(value.toString())
      );
      if (
        intersection.length > 0 &&
        data?.["fee_type_feature_map"] &&
        Object.keys(data["fee_type_feature_map"]).length > 0
      ) {
        post_data["student_feature"].push(data["id"]);
        fee_type.map((intData) => {
          if (
            intersection.includes(intData["id"]) &&
            data?.["fee_type_feature_map"]?.[intData.id]
          ) {
            if (
              !post_data["feature"].includes(
                data["fee_type_feature_map"][intData.id]
              )
            ) {
              post_data["feature"].push(
                data["fee_type_feature_map"][intData.id]
              );
            }
            if (!post_data["student_custom_fee_type_mapping"][data["id"]]) {
              post_data["student_custom_fee_type_mapping"][data["id"]] = {};
            }
            post_data["student_custom_fee_type_mapping"][data["id"]][
              data["fee_type_feature_map"][intData.id]
            ] = { amount: parseFloat(data[[intData.id].toString()]) };
          }
        });
      }
    });
    if (post_data["student_feature"].length === 0) {
      this.setState({
        snackbar: true,
        alertData:
          "There are no students mapped with feature or not entered amount",
      });
      return false;
    }
    return post_data;
  };

  saveData = () => {
    let validate = this.getPostDatValidate();
    if (validate) {
      const url = POST_URL.feature.api;
      postRequest(url, validate, this.props).then((response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          this.setState({ modifiedStudent: false });
        }
      });
    }
  };

  handleClose = () => {
    this.setState({
      snackbar: false,
      alertData: "",
    });
  };

  render() {
    let {
      fee_type,
      yearList,
      feeTypeList,
      year,
      loading,
      tableUpdating,
      tableLoadingTab,
      studentList,
      pagination,
      error,
      showEnrollSubmitPopUp,
      selectedStudentList,
      current_standard,
      standardList,
      blankPageMessage,
      snackbar,
      alertData,
      submitDisable,
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
      // customSearchRender: debounceSearchRender(200),
      textLabels: {
        body: {
          noMatch: this.state.tableUpdating
            ? this.state.loadingText
            : "Sorry, there is no matching data to display",
        },
      },
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
              <Box className="heading">
                {Actions.student_custom_fees.view.label}
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
                />
              </Box>
            </Grid>
            {feeTypeList.length > 1 && (
              <Grid item md={3} xs={12}>
                <Box className="header-align">
                  <MultipleSelectDropdown
                    data_list={feeTypeList}
                    selected_list={fee_type}
                    // error={fieldValue[field.name + '_error'] && fieldValue[field.name + '_error']}
                    label={"Select Fee Type"}
                    onChange={(e) => this.onChangeFeeType(e)}
                  />
                </Box>
              </Grid>
            )}
          </Grid>
          <Paper>
            {blankPageMessage ? (
              <div>
                <BlankPagewithIcon data={blankPageMessage} />
              </div>
            ) : (
              !tableLoadingTab && (
                <div className="pb-40">
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
                    // loading={tableUpdating}
                  />
                </div>
              )
            )}
          </Paper>
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
            <Box ml={4} mr={4} mt={2}>
              <div className="form-left-heading">Update fee amount</div>
              <div className="d-flex">
                <Box mt={2}>
                  <AddFinanceInputField
                    label="Previous Fees"
                    fieldValue={"1000"}
                    onBlurFieldValue={(e) => this.handleChange(e)}
                    max={1000000}
                  />
                </Box>
              </div>
            </Box>
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
          {!tableUpdating && (
            <Box className="submt-button-float-bottom">
              <Button
                variant="contained"
                color="primary"
                className="submit"
                disabled={submitDisable}
                onClick={this.saveData}
              >
                submit
              </Button>
            </Box>
          )}
        </Paper>
      );
    }
  }
}

export default withRouter(StudentCustomFees);

const MuiToolbar = ({ selectedRows, showEnableFeaturePopup }) => {
  return (
    <div className="toolbar-select">
      <Button
        variant="contained"
        color="primary"
        className="mr-20 submit"
        onClick={() => showEnableFeaturePopup(selectedRows)}
      >
        Move To Previous Year
      </Button>
    </div>
  );
};

MuiToolbar.propTypes = {
  selectedRows: PropTypes.array.isRequired,
  showEnableFeaturePopup: PropTypes.func.isRequired,
};
