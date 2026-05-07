import React, { Component, Fragment, forwardRef } from "react";
import {
  Paper,
  Box,
  Button,
  Checkbox,
  Grid,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slide,
} from "@material-ui/core";
import { cloneDeep } from "lodash";
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import Swal from "sweetalert2";
import _ from "lodash";
import ClearIcon from "@material-ui/icons/Clear";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import ToggleButton from "@material-ui/lab/ToggleButton";
import { Dropdown } from "Components/DropDown";
import { DateRange } from "Components/DateRange";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import StudentListActions from "Includes/StudentListActions";
import { Actions } from "Constants/permissions";
import { DropDownWithSearchAndAddApi } from "Components/DropDownWithSearchAndAddApi";
import { nameAndNumberRegex } from "Constants/regularExpression";
import {
  setIsGridOrListView,
  SetAcademicYear,
  getPaginationProps,
  Alert,
  getSettingValue,
  updatePermissions,
  getFormatMessage,
  getFullName,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { STUDENT_TYPE, DEFAULT_PAGINATION_WITHOUT_SORT_PROPS } from "Constants";
import messages from "Containers/Enrolement/messages";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import Snackbar from "@material-ui/core/Snackbar";

const isResidential = parseInt(getSettingValue("is_residential"));

// eslint-disable-next-line react/display-name
const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />;
});

const fieldDetails = [
  {
    label: "Reason Name",
    regex: nameAndNumberRegex,
    autoFocus: false,
    name: "name",
    md: 12,
    className: "w-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    maxLength: 50,
    gridClassName: "margin-vertical-20",
  },
];
let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

class AdmissionStudentList extends Component {
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
      studentTypeList: [
        { name: "All", id: "All" },
        { name: "Day Scholar", id: "Day Scholar" },
        { name: "Residential", id: "Residential" },
      ],
      student_type: "All",
      pagination: { ...DEFAULT_PAGINATION_WITHOUT_SORT_PROPS },
      filterList: [],
      openPopup: false,
      error: {},
      studentType: "",
      current_standard: "",
      isAllChecked: false,
      submitDisable: false,
      opensnackbar: false,
      alertData: "",
      year: "",
      selectedStudentList: [],
      showTcStudentPopup: false,
      errorContent: "",
      menu_type: "not_issued",
      dialogOpen: false,
      selectedTcRevert: null,
      selectedTcRevertName: "",
      selectedReason: "",
      reasonList: [],
      columns: [
        {
          name: "checked",
          label: "Select",
          options: {
            filter: false,
            sort: false,
            empty: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <Checkbox
                  edge="end"
                  checked={value}
                  defaultChecked={value}
                  onChange={() => this.handleTableClick(tableMeta.rowIndex)}
                  className={"padding-0"}
                />
              );
            },
            customHeadRender: (columnMeta) => (
              <th className="mui-table-custom-header-left-align pl-7">
                <Checkbox
                  edge="end"
                  checked={this.state.isAllChecked}
                  defaultChecked={this.state.isAllChecked}
                  onChange={() => this.handleAllCheck()}
                  className={"padding-0"}
                />
              </th>
            ),
          },
        },
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
          name: "is_new_student",
          label: "Student Type",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {value ? (
                    <div className="text-green">New Student</div>
                  ) : (
                    <div className="text-blue">Old Student</div>
                  )}
                </div>
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
          name: "mobile_num",
          label: <FormattedMessage {...commonMessages.mobileNo} />,
          options: {
            filter: false,
            sort: true,
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
          label: <FormattedMessage {...commonMessages.admissioNo} />,
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "student_type",
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
      ],
      tc_columns: [
        {
          name: "student_id",
          label: "student",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
            download: false,
          },
        },
        {
          name: "standard",
          label: "standard",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
            download: false,
          },
        },
        {
          name: "name",
          label: <FormattedMessage {...commonMessages.studentName} />,
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "is_new_student",
          label: "Student Type",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {value ? (
                    <div className="text-green">New Student</div>
                  ) : (
                    <div className="text-blue">Old Student</div>
                  )}
                </div>
              );
            },
          },
        },
        {
          name: "standard_name",
          label: <FormattedMessage {...commonMessages.standard} />,
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
          name: "admission_num",
          label: <FormattedMessage {...commonMessages.admissioNo} />,
          options: {
            filter: false,
            sort: true,
          },
        },
        {
          name: "is_tc_issued",
          label: "Status",
          options: {
            filter: false,
            sort: true,
            search: true,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {value ? (
                    <div className="text-blue">TC ISSUED</div>
                  ) : (
                    <div className="red">DELETED</div>
                  )}
                </div>
              );
            },
          },
        },
        {
          name: "is_tc_issued",
          label: "Print",
          options: {
            filter: false,
            sort: true,
            search: true,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {value ? (
                    <Button
                      className="custom-button"
                      onClick={() =>
                        this.handlePrint(
                          tableMeta.rowData[0],
                          tableMeta.rowData[1]
                        )
                      }
                    >
                      Print TC
                    </Button>
                  ) : (
                    <Button className="red"></Button>
                  )}
                </div>
              );
            },
          },
        },
        {
          name: "is_tc_issued",
          label: "Revert Button",
          options: {
            filter: false,
            sort: true,
            search: true,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <Button
                    className="custom-button"
                    onClick={() =>
                      this.handleRevertButtonClick(
                        tableMeta.rowData[0],
                        tableMeta.rowData[2],
                      )
                    }
                  >
                    Revert
                  </Button>
                </div>
              );
            },
          },
        },
        {
          name: "is_tc_issued",
          label: "Details",
          options: {
            filter: false,
            sort: true,
            search: true,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  {value ? (
                    <Button
                      className="custom-button"
                      onClick={() => this.viewDetail(tableMeta.rowData[0])}
                    >
                      Student Details
                    </Button>
                  ) : (
                    <Button className="red"></Button>
                  )}
                </div>
              );
            },
          },
        },
      ],
    };
    this.dateRange = React.createRef();
  }

  viewDetail = (id) => {
    let viewExtraParams = { studentId: id , onlyView: true};
    let searchParam = "?" + new URLSearchParams(viewExtraParams).toString();
    this.props.history.push({
      pathname: Actions.general_student.view.url,
      search: searchParam,
    });
  };

  handlePrint = (student, standard) => {
    let { section } = this.state;
    this.props.history.push(
      Actions.tc_certificate.view.url +
        `/?id=${student}&standard=${standard}&section=${section}`
    );
  };

  handleTableClick = (index) => {
    let { studentList, tableLoading } = this.state;
    this.setState(
      {
        tableLoading: true,
      },
      () => {
        let data_list_temp = { ...studentList };
        data_list_temp.student_list[index]["checked"] =
          !data_list_temp.student_list[index]["checked"];
        this.setState({
          studentList: { ...data_list_temp },
          tableLoading: false,
        });
      }
    );
  };

  handlePrintForm = (id) => {
    this.setState({
      student_id: id,
      openPopup: true,
    });
  };

  handleAllCheck = () => {
    const { isAllChecked, studentList } = this.state;
    this.setState(
      {
        tableLoading: true,
      },
      () => {
        let data_list_temp = { ...studentList };
        data_list_temp.student_list.forEach((data) => {
          data["checked"] = !isAllChecked;
        });
        this.setState({
          studentList: { ...data_list_temp },
          isAllChecked: !isAllChecked,
          tableLoading: false,
        });
      }
    );
  };

  async componentDidMount() {
    let { GridEnabled, ListEnabled, year } = this.state;
    this.getAcademicYearList();
    this.permission = [
      ...this.permission,
      ...updatePermissions("admission_student_list", ["update", "delete"]),
    ];
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
    let { value } = e.target;
    if (value !== 0) {
      SetAcademicYear(value);
      this.setState(
        {
          year: value,
          error: {},
        },
        () => {
          this.getStandardList();
        }
      );
    }
  };

  getStudentList = (paginationProps) => {
    let {
      pagination,
      year,
      current_standard,
      dateRangeValue,
      student_type,
      studentType,
      menu_type,
      tc_columns,
    } = this.state;
    this.setState({
      tableUpdating: true,
      tableLoading: true,
      dateRangeValue: dateRangeValue,
    });
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
    if (menu_type === "issued") {
      params["student_details__entry_academic_year"] = year;
    } else {
      params["academic_year"] = year;
    }
    if (current_standard) {
      let temp = {};
      temp["current_standard"] = current_standard;
      params = { ...params, ...temp };
    }
    if (!_.isEmpty(dateRangeValue)) {
      let temp = {};
      temp["from_date"] = dateRangeValue.start;
      temp["to_date"] = dateRangeValue.end;
      params = { ...params, ...temp };
    }
    if (student_type !== "All") {
      let temp = {};
      temp["student_type"] = student_type === "Day Scholar" ? "D" : "R";
      params = { ...params, ...temp };
    }
    if (studentType) {
      params["is_new_student"] = studentType === "new_student" ? 1 : 0;
    }
    params["admission_history"] = true;
    let url = GET_URL.student.api;
    if (menu_type === "issued") {
      url = GET_URL.deletedstudentlist.api;
    }
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let studentList = {};
        this.setState(
          {
            tableUpdating: false,
          },
          () => {
            if (menu_type === "issued") {
              studentList = response.data;
              studentList.data.data_list.map((data) => {
                data["full_name"] = getFullName(
                  data["first_name"],
                  data["middle_name"],
                  data["last_name"]
                );
              });
            } else {
              studentList = response.data;
              studentList.data.student_list.map((data) => {
                data["full_name"] = getFullName(
                  data["first_name"],
                  data["middle_name"],
                  data["last_name"]
                );
              });
            }
            this.setState({
              studentList: studentList.data,
              AllStudentList: studentList.data,
              // tableUpdating: false,
              dataReady: true,
              loading: false,
              tableLoading: false,
              isAllChecked: false,
              pagination: this.currentPagination,
            });
          }
        );
      }
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
        this.setState(
          {
            standardList: response.data.data,
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
        student_type: value,
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
          current_standard: "",
          dateRangeValue: {},
          dateRangeValueDefault: {},
          studentType: "",
        },
        () => {
          this.getStudentList();
          this.dateRange.current.handleClear();
        }
      );
    }
  };

  handleStandardChange = (e) => {
    let { name, value } = e.target;
    const { pagination } = this.state;
    this.setState(
      {
        [name]: value,
      },
      () => {
        this.getStudentList(pagination);
      }
    );
  };

  geFilterOptions = () => {
    let {
      current_standard,
      studentType,
      academicYearFromDate,
      academicYearToDate,
      standardList,
    } = this.state;
    return (
      <Fragment>
        <Box className="margin-top-20">
          <Dropdown
            data={standardList}
            name={"current_standard"}
            value={current_standard}
            onChange={(e) => this.handleStandardChange(e)}
            label={<FormattedMessage {...commonMessages.standard} />}
            hideSelect={true}
            size="small"
          />
        </Box>
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
        <DateRange
          handleChange={this.handleChangeDateRange}
          minDate={academicYearFromDate}
          maxDate={academicYearToDate}
          ref={this.dateRange}
          label={<FormattedMessage {...commonMessages.dateRange} />}
          size="small"
          className="width-280"
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

  handleShowPopup = () => {
    let { studentList } = this.state;
    let student_list = [];
    studentList.student_list.map((data) => {
      if (data.checked) {
        student_list.push(data);
      }
    });
    if (student_list.length === 0) {
      this.setState({
        opensnackbar: true,
        alertData: "Select atleast 1 student",
      });
      return;
    }
    this.setState({
      selectedStudentList: [...student_list],
      showTcStudentPopup: true,
    });
  };

  saveData = () => {
    const { selectedStudentList } = this.state;
    let temp_list = [];
    selectedStudentList.map((data) => {
      temp_list.push({ standard: data.current_standard, student: data.id });
    });
    let postData = {
      student_list: temp_list,
    };
    postRequest(POST_URL.issuetcforstudent.api, postData, {}).then(
      (response) => {
        if (response && response.status === 200) {
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          this.handlePopupStatus();
          this.getStudentList();
        }
      }
    );
  };

  handleCloseSnackBar = () => {
    this.setState({
      opensnackbar: false,
    });
  };

  handlePopupStatus = () => {
    this.setState({
      showTcStudentPopup: false,
    });
  };

  handleChangeStandard = (e, ind) => {
    const { name, value } = e.target;
    let { selectedStudentList } = this.state;
    selectedStudentList[ind][name] = value;
    this.setState({
      selectedStudentList,
    });
  };

  changeToggle = (e, value) => {
    if (value !== this.state.menu_type) {
      this.setState(
        {
          menu_type: value,
        },
        () => {
          this.getStudentList();
        }
      );
    }
  };

  handleRevertButtonClick = (id, name) => {
    this.setState({
      dialogOpen: true,
      selectedTcRevert: id,
      selectedTcRevertName: name,
    });
    this.getReasonList();
  };

  getReasonList = () => {
    const url = GET_URL.reason.api;
    const params = {
      is_active: true,
      reason_type: "tc_revert",
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          reasonList: response.data.data,
          loading: false,
        });
      }
    });
  };

  handleDropDown = (e, newValue) => {
    if (newValue) {
      this.setState({
        selectedReason: newValue,
      });
    }
  };

  updatePostFormat = (newData) => {
    newData.name = newData.name;
    newData.reason_type = "tc_revert";
    let payload = {
      reason: [newData],
    };
    return payload;
  };

  updateType = (field) => {
    this.setState({ loadingOptions: true });
    let { reasonList } = this.state;
    reasonList.push(field);
    this.setState({ reasonList }, () => {
      this.setState({ loadingOptions: false });
    });
    return true;
  };

  handleDialogClose = () => {
    this.setState({
      dialogOpen: false,
      selectedTcRevert: null,
    });
  };

  saveTcRevert = () => {
    const { selectedReason, selectedTcRevert } = this.state
    const params = {
      is_active: true,
      student_id: selectedTcRevert,
      reason_id: selectedReason.id,
    };
    const url = POST_URL.revert.api;
    postRequest(url, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          this.handleDialogClose();
          this.getStudentList();
        }
      });
      this.setState({
        selectedReason: null,
      });
  };

  render() {
    let {
      submitDisable,
      yearList,
      year,
      loading,
      tableUpdating,
      studentList,
      pagination,
      studentTypeList,
      student_type,
      opensnackbar,
      alertData,
      error,
      tableLoading,
      showTcStudentPopup,
      errorContent,
      selectedStudentList,
      standardList,
      menu_type,
      dialogOpen,
      selectedReason,
      reasonList,
      selectedTcRevertName,
    } = this.state;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: true,
      download: true,
      print: false,
      viewColumns: false,
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
    };
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Paper className={classNames("paper-background")}>
          <Grid container>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">
                <FormattedMessage {...messages.tcHead} />
              </Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className={classNames("header-align", "end-flex-prop")}>
                <Button
                  variant="contained"
                  color="primary"
                  className="submit"
                  disabled={submitDisable}
                  onClick={this.handleShowPopup}
                >
                  submit
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Grid container className="m-bt-15px">
            <Grid item md={4} xs={12}>
              <Box className="header-align">
                <Dropdown
                  data={yearList}
                  name="year"
                  value={year}
                  onChange={this.onChange}
                  label={<FormattedMessage {...commonMessages.academicYear} />}
                  error={error.year}
                  hideSelect={true}
                  size="small"
                />
              </Box>
            </Grid>
            <Grid item md={4} xs={12}>
              {year && !!isResidential && (
                <Box className="header-align">
                  <Dropdown
                    data={studentTypeList}
                    name="student_type"
                    value={student_type}
                    onChange={this.onChangeStudentType}
                    label={
                      <FormattedMessage {...commonMessages.selectStudentType} />
                    }
                    hideSelect={true}
                    size="small"
                  />
                </Box>
              )}
            </Grid>
            <Grid item md={4} xs={12}>
              <Box className="header-align text-align-end">
                <ToggleButtonGroup
                  size="small"
                  value={menu_type}
                  exclusive
                  onChange={this.changeToggle}
                >
                  <ToggleButton
                    key={1}
                    value="not_issued"
                    className={menu_type === "not_issued" && "tc-selected-tab"}
                  >
                    Student List
                  </ToggleButton>
                  <ToggleButton
                    key={2}
                    value="issued"
                    className={menu_type === "issued" && "tc-selected-tab"}
                  >
                    TC Issued List
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Grid>
          </Grid>
          <Dialog
            open={dialogOpen}
            onClose={this.handleDialogClose}
            aria-labelledby="refund-dialog-title"
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle id="refund-dialog-title">Are You Sure You Want To Revert TC for ({selectedTcRevertName})?</DialogTitle>
            <DialogContent>
              <DropDownWithSearchAndAddApi
                options={reasonList}
                value={selectedReason}
                onChange={(e, newValue) => this.handleDropDown(e, newValue)}
                name="selectedReason"
                optionValue="name"
                label="Select Reason"
                className="width-250-px"
                fieldDetails={fieldDetails}
                postUrl={POST_URL.reason.api}
                updatePostFormat={this.updatePostFormat}
                updateType={this.updateType}
                size="small"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={this.handleDialogClose}
                color="secondary">
                Close
              </Button>
              <Button
                onClick={this.saveTcRevert}
                color="primary"
              >
                Submit
              </Button>
            </DialogActions>
          </Dialog>
          <Grid
            container
            className={classNames("flex-justify-center", "header-align")}
          >
            <Grid item md={12} xs={12}>
              {!tableLoading && (
                <Paper>
                  <AllMUIDataTable
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    data={
                      menu_type === "issued"
                        ? studentList.data_list
                        : studentList.student_list
                    }
                    columns={
                      menu_type === "issued"
                        ? cloneDeep(this.state.tc_columns)
                        : cloneDeep(this.state.columns)
                    }
                    options={options}
                    onTableChange={this.getStudentList}
                    serverSide={true}
                    pagination={pagination}
                    count={studentList.count}
                  />
                </Paper>
              )}
            </Grid>
          </Grid>
          <Dialog
            open={showTcStudentPopup}
            onClose={this.handlePopupStatus}
            keepMounted
            TransitionComponent={Transition}
            maxWidth="xs"
            fullWidth={true}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
          >
            <DialogTitle id="form-dialog-title" className="text-center">
              Selected Students To TC
            </DialogTitle>
            <hr />
            <DialogContent>
              <Box className="enroll-block-item">
                {selectedStudentList.map((stu, ind) => {
                  return (
                    <Box key={ind} className="selected-tc-list">
                      <Box className="enrolling-student">{stu.name}</Box>
                      <Dropdown
                        data={standardList}
                        value={stu.current_standard}
                        onChange={(e) => this.handleChangeStandard(e, ind)}
                        variant="standard"
                        name="current_standard"
                      />
                    </Box>
                  );
                })}
              </Box>
              <Box className="error-content flex-justify-center margin-top-10">
                {errorContent}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.handlePopupStatus} color="secondary">
                <FormattedMessage {...commonMessages.close} />
              </Button>
              <Button onClick={this.saveData} color="primary">
                <FormattedMessage {...commonMessages.submit} />
              </Button>
            </DialogActions>
          </Dialog>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={opensnackbar}
            autoHideDuration={10000}
            onClose={this.handleCloseSnackBar}
          >
            <Alert onClose={this.handleCloseSnackBar} severity="error">
              {alertData}
            </Alert>
          </Snackbar>
        </Paper>
      );
    }
  }
}

export default withRouter(AdmissionStudentList);
