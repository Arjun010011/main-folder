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
import { withRouter } from "react-router-dom";
import classNames from "classnames";
import Swal from "sweetalert2";
import _ from "lodash";
import ClearIcon from "@material-ui/icons/Clear";
import moment from "moment";

import { Dropdown } from "Components/DropDown";
import { DateRange } from "Components/DateRange";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest, postRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import StudentListActions from "Includes/StudentListActions";
import { Actions } from "Constants/permissions";
import {
  dayCheck,
  getPaginationProps,
  Alert,
  getSettingValue,
  updatePermissions,
  getFormatMessage,
  getFullName,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { STUDENT_TYPE, DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import messages from "Containers/Enrolement/messages";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import Snackbar from "@material-ui/core/Snackbar";


class BirthdayList extends Component {
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
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
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
      selectedStandard: "all",
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
          name: "staff",
          label: <FormattedMessage {...commonMessages.standard} />,
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return value ? "Staff" : "Student";
            },
          },
        },
        {
          name: "student__current_standard__name",
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
          name: "dob",
          label: <FormattedMessage {...commonMessages.dob} />,
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              if (dayCheck(value) === "Today") {
                return (
                  <div className="text-green text-bold">{dayCheck(value)}</div>
                );
              }
              if (dayCheck(value) === "Tomorrow") {
                return (
                  <div className="text-blue text-bold">{dayCheck(value)}</div>
                );
              }
              return <div>{dayCheck(value)}</div>;
            },
          },
        },
      ],
    };
    this.dateRange = React.createRef();
  }

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
          columns: [...this.state.columns],
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
        data_list_temp.data_list.forEach((data) => {
          data["checked"] = !isAllChecked;
        });
        this.setState({
          studentList: { ...data_list_temp },
          isAllChecked: !isAllChecked,
          columns: [...this.state.columns],
          tableLoading: false,
        });
      }
    );
  };

  componentDidMount() {
    this.getStandardList();
    this.getStudentList();
  }

  getStandardList = async () => {
    const f_url = GET_URL.getstandard.api;
    const param = { is_active: true };
    await getRequest(f_url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        let temp = { id: "all", name: "All" };
        response.data.data.unshift(temp);
        this.setState({
          standardList: response.data.data,
          loading: false,
        });
      }
    });
  };

  getStudentList = (paginationProps) => {
    let { pagination, selectedStandard } = this.state;
    this.setState({ tableUpdating: true });
    this.currentPagination = pagination;
    if (paginationProps) {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    let params = {
      ...pagination_params,
      is_active: true,
    };
    if (selectedStandard !== "all") {
      params["standard"] = selectedStandard;
    }
    const url = GET_URL.userbirthday.api;
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        this.setState(
          {
            tableUpdating: false,
            columns: [...this.state.columns],
          },
          () => {
            const studentList = response.data;
            studentList.data.data_list.map((data) => {
              if (data["student__first_name"]) {
                data["full_name"] = getFullName(
                  data["student__first_name"],
                  data["student__middle_name"],
                  data["student__last_name"]
                );
                data["mobile_num"]=data["student__mobile_num"]
              }
              else if(data["staff__first_name"]){
                data["full_name"] = getFullName(
                  data["staff__first_name"],
                  data["staff__middle_name"],
                  data["staff__last_name"]
                );
                data["mobile_num"]=data["staff__middle_name"]
              }
            });
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

  handleClosePopup = () => {
    this.setState({
      openPopup: false,
    });
  };

  handleShowPopup = () => {
    let { studentList } = this.state;
    let student_list = [];
    studentList.data_list.map((data) => {
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
      selectedStandard,
      tableLoading,
      showTcStudentPopup,
      errorContent,
      selectedStudentList,
      standardList,
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
                {Actions.user_birthday_list.view.label}
              </Box>
            </Grid>
          </Grid>
          <Grid container className="m-bt-15px">
            <Grid item md={4} xs={12}>
              <Box className="header-align">
                <Dropdown
                  data={standardList}
                  name="selectedStandard"
                  value={selectedStandard}
                  onChange={this.handleStandardChange}
                  label={<FormattedMessage {...commonMessages.standard} />}
                  className="width-100"
                  hideSelect={true}
                />
              </Box>
            </Grid>
          </Grid>
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
                    data={studentList.data_list}
                    columns={this.state.columns}
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

export default withRouter(BirthdayList);
