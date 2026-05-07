import React, { Component } from "react";
import { Paper, Box, Button, Grid, CircularProgress } from "@material-ui/core";
import { Link } from "react-router-dom";
import classNames from "classnames";
import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import Swal from "sweetalert2";
import _ from "lodash";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import ToggleButton from "@material-ui/lab/ToggleButton";

import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, PUT_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import {
  getFullName,
  getPaginationProps,
  updatePermissions,
  isUserHasPermission,
  dateFormat,
} from "Includes/functions";
import LoadingGif from "Components/LoadingGif";
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import StudentListActions from "Includes/StudentListActions";
import ActionColumn from "Components/ActionColumnNew";
import { numberRegex } from "Constants/regularExpression";
import { cloneDeep } from "lodash";
import messages from "./messages";

const fieldDetails = [
  {
    label: <FormattedMessage {...commonMessages.sectionName} />,
    regex: numberRegex,
    name: "machine_user_id",
    md: 12,
    className: "width-100",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "text",
    autoFocus: true,
    maxLength: "25",
  },
];

class StaffBioMetricList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("staff_bio_id", ["update"]);
    this.state = {
      studentList: [],
      AllStudentList: [],
      dataReady: false,
      GridEnabled: false,
      ListEnabled: true,
      loading: true,
      tableUpdating: false,
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      filterList: [],
      selectedStandard: "all",
      selectedTab: "biometric",
      columns: [],
      userlogcolumns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "created",
          label: <FormattedMessage {...commonMessages.date} />,
          options: {
            filter: false,
            sort: true,
            search: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <div>{dateFormat(value, "YYYY-MM-DD HH:mm:ss A")}</div>;
            },
          },
        },
        {
          name: "machine_user_id",
          label: <FormattedMessage {...messages.machineUserId} />,
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "is_data_processed",
          label: "Is Data Processed",
          options: {
            filter: false,
            sort: true,
            search: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <div>{value ? "Yes" : "No"}</div>;
            },
          },
        },
        {
          name: "full_name",
          label: <FormattedMessage {...commonMessages.name} />,
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
      ],
      logcolumns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "for_date",
          label: <FormattedMessage {...commonMessages.date} />,
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "machine_user_id",
          label: <FormattedMessage {...messages.machineUserId} />,
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "operation",
          label: <FormattedMessage {...messages.operation} />,
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "json",
          label: <FormattedMessage {...commonMessages.json} />,
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
      ],
      biocolumns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "full_name",
          label: <FormattedMessage {...commonMessages.staffName} />,
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "machine_user_id",
          label: "Machine User Id",
          options: {
            filter: false,
            sort: true,
            display: true,
          },
        },
        {
          name: "is_user_updated_to_machine",
          label: "User Updated To Machine",
          options: {
            filter: false,
            sort: true,
            display: true,
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
              return (
                <div>
                  <ActionColumn
                    id={tableMeta.rowData[0]}
                    fieldValues={[tableMeta.rowData[3]]}
                    label="Edit Machine ID"
                    fieldDetails={fieldDetails}
                    postUrl={POST_URL.machineusermapping.api}
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
  }

  async componentDidMount() {
    this.permission = [...this.permission];
    this.getStaffBioList();
  }

  updatePostFormat = (newData, id) => {
    let { studentList } = this.state;
    let first_name = "";
    let last_name = "";
    let user_id = "";

    studentList.data_list.map((data) => {
      if (data["id"] === id) {
        first_name = data.user_details.staff["first_name"];
        last_name = data.user_details.staff["last_name"];
        user_id = data.user;
      }
    });
    let payload = [
      {
        machine_user_id: parseInt(newData.machine_user_id),
        machine_id: null,
        first_name: first_name,
        last_name: last_name,
        id: id,
        user_id: user_id,
      },
    ];
    return payload;
  };

  updateType = (newData, id) => {
    let { studentList } = this.state;
    let temp_list = cloneDeep(studentList);
    for (const data of temp_list.data_list) {
      if (data.id === id) {
        data.machine_user_id = newData.machine_user_id;
        break;
      }
    }
    this.setState({
      studentList: cloneDeep(temp_list),
    });
    return true;
  };

  setActiveTab = (selectedTabArg) => {
    let { selectedTab } = this.state;
    if (!selectedTabArg !== selectedTab && selectedTabArg) {
      this.setState({ selectedTab: selectedTabArg }, () => {
        this.getStaffBioList();
      });
    }
  };

  getStaffBioList = (paginationProps) => {
    this.setState({ tableUpdating: true });
    let { pagination, selectedTab, biocolumns, logcolumns, userlogcolumns } =
      this.state;
    this.currentPagination = pagination;
    if (paginationProps && paginationProps !== "download") {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    let url = GET_URL.machineusermapping.api;
    let params = { ...pagination_params, is_active: true, only_mapped: 1 };
    let tempColumns = cloneDeep(biocolumns);
    if (selectedTab === "attendance_log") {
      url = GET_URL.machineattendancelog.api;
      params = { ...pagination_params };
      tempColumns = cloneDeep(logcolumns);
    } else if (selectedTab === "user_log") {
      url = GET_URL.machineuserlog.api;
      params = { ...pagination_params };
      tempColumns = cloneDeep(userlogcolumns);
    }
    let prop = { ...this.props };
    if (paginationProps === "download") {
      params["download_excel"] = 1;
      prop.responseType = "blob";
    }
    getRequest(url, params, prop).then((response) => {
      if (response && response.status === 200) {
        if (paginationProps === "download") {
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
        this.callApi = true;
        const studentList = response.data;
        if (selectedTab === "biometric") {
          if (studentList?.data?.data_list) {
            studentList.data.data_list.map((data) => {
              data["is_user_updated_to_machine"] = data[
                "is_user_updated_to_machine"
              ]
                ? "Yes"
                : "No";
              data["full_name"] = data?.["user_details"]?.["staff"]
                ? data?.["user_details"]?.["staff"]?.["full_name"]
                : data?.["user_details"]?.["student"]?.["full_name"];
            });
          }
        } else if (selectedTab === "attendance_log") {
          {
            studentList.data.data_list.map((data) => {
              data["json"] = data["json"];
            });
          }
        } else if (selectedTab === "user_log") {
          studentList.data.data_list.map((data) => {
            data["full_name"] = data?.["user_details"]?.["staff"]
              ? data?.["user_details"]?.["staff"]?.["full_name"]
              : data?.["user_details"]?.["student"]?.["full_name"];
          });
        }
        this.setState({
          studentList: studentList.data,
          AllStudentList: [],
          dataReady: true,
          loading: false,
          tableUpdating: false,
          columns: cloneDeep(tempColumns),
          pagination: this.currentPagination
            ? this.currentPagination
            : this.state.pagination,
        });
      }
    });
    return false;
  };

  render() {
    let { loading, tableUpdating, studentList, pagination, selectedTab } =
      this.state;
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
        return this.getStaffBioList("download");
      },
    };
    if (loading) {
      return <LoadingGif />;
    } else {
      return (
        <Paper className={classNames("paper-background")}>
          <Grid container spacing={2}>
            <Grid item md={6} xs={12} className={classNames("header-align")}>
              <Box className="heading">Staff Biometric Id's</Box>
            </Grid>
            <Grid item md={6} xs={12}>
              <Box className={classNames("header-align", "end-flex-prop")}>
                {isUserHasPermission("staff_bio_id", "create") &&
                  selectedTab === "biometric" && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.staff_bio_id.create.url}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineIcon className="visibility-icon" />{" "}
                      {Actions.staff_bio_id.create.label}
                    </Button>
                  )}
              </Box>
            </Grid>
          </Grid>

          <Box className={classNames("header-align", "end-flex-prop")}>
            <Paper>
              <ToggleButtonGroup
                size="small"
                value={selectedTab}
                exclusive
                onChange={(e, val) => this.setActiveTab(val)}
              >
                <ToggleButton key={1} value="biometric">
                  Biometric Details
                </ToggleButton>
                <ToggleButton key={2} value="attendance_log">
                  Attendance Log
                </ToggleButton>
                <ToggleButton key={3} value="user_log">
                  User Log
                </ToggleButton>
              </ToggleButtonGroup>
            </Paper>
          </Box>
          {tableUpdating ? (
            <LoadingGif />
          ) : (
            <Paper className="mt-30">
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
                onTableChange={this.getStaffBioList}
                serverSide={true}
                pagination={pagination}
                count={studentList.count}
              />
            </Paper>
          )}
        </Paper>
      );
    }
  }
}

export default StaffBioMetricList;
