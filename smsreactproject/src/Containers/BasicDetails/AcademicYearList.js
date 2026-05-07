import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Tooltip,
  Button,
  CircularProgress,
} from "@material-ui/core";
import Swal from "sweetalert2";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import { Link } from "react-router-dom";
import classNames from "classnames";

import ActionColumn from "Components/ActionColumnNew";
import AllMUIDataTable from "Components/AllMUIDataTable";
import loadingBar from "images/loading.gif";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL, DEL_URL } from "Includes/urls";
import {
  dateFormat,
  getAcademicYear,
  getSettingValue,
  isUserHasPermission,
  updatePermissions,
} from "Includes/functions";
import { minDate, maxDate, options } from "Constants";
import { Actions } from "Constants/permissions";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";
import { cloneDeep } from "lodash";

const isAcademicBranchMappingEnabled =
  parseInt(getSettingValue("is_academic_branch_mapping"), 10) === 1;

const baseFieldDetails = [
  {
    label: <FormattedMessage {...commonMessages.start_date} />,
    regex: "",
    name: "start_date",
    md: 12,
    minDate: minDate,
    maxDate: maxDate,
    className: "width-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "date",
  },
  {
    label: <FormattedMessage {...commonMessages.end_date} />,
    name: "end_date",
    md: 12,
    minDate: minDate,
    maxDate: maxDate,
    className: "width-90",
    required: true,
    id: "outlined-textarea",
    default: "",
    rows: null,
    type: "date",
  },
];

class AcademicYearList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("academic_year", ["update", "delete"]);
    this.state = {
      academicYearList: [],
      branchList: [],
      loading: true,
      selectedToDelete: [],
      enabledActions: [],
      optionsLocal: {},
      tableUpdating: false,
      columns: [
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
          name: "is_active",
          label: "is_active",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "start_date",
          label: "id",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "end_date",
          label: "id",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "name",
          label: <FormattedMessage {...commonMessages.academicYear} />,
          options: {
            filter: false,
            search: true,
            sort: true,
            sortDirection: "asc",
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <Tooltip
                  title={tableMeta.rowData[1] === true ? "Enabled" : "Disabled"}
                  enterDelay={400}
                  enterNextDelay={400}
                  placement="top-start"
                  classes={{ tooltip: "tooltip-show-data" }}
                >
                  <Box display="flex">
                    <Box
                      className={
                        tableMeta.rowData[1] === true
                          ? "application-student-list-admitted"
                          : "application-student-list-not-admitted"
                      }
                    ></Box>
                    <Box
                      className={
                        tableMeta.rowData[1] === true ? "" : "opacity-0-5"
                      }
                    >
                      {value}
                    </Box>
                  </Box>
                </Tooltip>
              );
            },
          },
        },
        {
          name: "start_date_label",
          label: <FormattedMessage {...commonMessages.start_date} />,
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <Tooltip
                  title={tableMeta.rowData[1] === true ? "Enabled" : "Disabled"}
                  enterDelay={400}
                  enterNextDelay={400}
                  placement="top-start"
                  classes={{ tooltip: "tooltip-show-data" }}
                >
                  <Box
                    className={
                      tableMeta.rowData[1] === true ? "" : "opacity-0-5"
                    }
                  >
                    {value}
                  </Box>
                </Tooltip>
              );
            },
          },
        },
        {
          name: "end_date_label",
          label: <FormattedMessage {...commonMessages.end_date} />,
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <Tooltip
                  title={tableMeta.rowData[1] === true ? "Enabled" : "Disabled"}
                  enterDelay={400}
                  enterNextDelay={400}
                  placement="top-start"
                  classes={{ tooltip: "tooltip-show-data" }}
                >
                  <Box
                    className={
                      tableMeta.rowData[1] === true ? "" : "opacity-0-5"
                    }
                  >
                    {value}
                  </Box>
                </Tooltip>
              );
            },
          },
        },
        {
          name: "branch_display",
          label: "Branch",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              const display = value || "";
              return (
                <Tooltip
                  title={tableMeta.rowData[1] === true ? "Enabled" : "Disabled"}
                  enterDelay={400}
                  enterNextDelay={400}
                  placement="top-start"
                  classes={{ tooltip: "tooltip-show-data" }}
                >
                  <Box
                    className={
                      tableMeta.rowData[1] === true ? "" : "opacity-0-5"
                    }
                  >
                    {display || "—"}
                  </Box>
                </Tooltip>
              );
            },
          },
        },
        {
          name: "finance_enabled",
          label: "Finance Enabled",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              const enabled = tableMeta.rowData[1] === true ? "" : "opacity-0-5";
              const text = value === true || value === "true" ? "Yes" : "No";
              return (
                <Tooltip
                  title={tableMeta.rowData[1] === true ? "Enabled" : "Disabled"}
                  enterDelay={400}
                  enterNextDelay={400}
                  placement="top-start"
                  classes={{ tooltip: "tooltip-show-data" }}
                >
                  <Box className={enabled}>{text}</Box>
                </Tooltip>
              );
            },
          },
        },
        {
          name: "branch_selected_list",
          label: "branch_selected_list",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: false,
          },
        },
        {
          name: "Actions",
          label: <FormattedMessage {...commonMessages.actions} />,
          options: {
            display: this.permission.length > 0,
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <div>
                  <ActionColumn
                    id={tableMeta.rowData[0]}
                    fieldValues={[
                      tableMeta.rowData[2],
                      tableMeta.rowData[3],
                      tableMeta.rowData[8],
                      tableMeta.rowData[9],
                    ]}
                    label={<FormattedMessage {...messages.editAcademicYear} />}
                    fieldDetails={this.getFieldDetails()}
                    updateType={this.updateType}
                    updateUrl={PUT_URL.academicyear.api}
                    updatePostFormat={this.updatePostFormat}
                    updateDisableFormat={this.updateDisableFormat}
                    baseClassName="action-basic-detail-width"
                    enabledActions={this.updatePermissionTable(
                      this.permission,
                      tableMeta.rowData[1]
                    )}
                    deleteUrl={DEL_URL.academicyear.api}
                    handleDisable={this.handleDisable}
                    getAcademicYearList={this.getAcademicYearList}
                  />
                </div>
              );
            },
          },
        },
      ],
    };
  }

  getFieldDetails = () => {
    const details = [...baseFieldDetails];
    details.push({
      type: "switch",
      name: "finance_enabled",
      label: "Finance Enabled",
      md: 12,
    });
    if (isAcademicBranchMappingEnabled && (this.state.branchList || []).length > 0) {
      details.push({
        type: "multiselect",
        name: "branch",
        selectLabel: "Branch",
        md: 12,
        list: (this.state.branchList || []).map((b) => ({
          id: b.id,
          name: b.name || b.branch_name || String(b.id),
        })),
      });
    }
    return details;
  };

  updatePermissionTable = (permission, is_active) => {
    let return_permission = [];
    let return_temp = "";
    permission.map((data) => {
      return_temp = "";
      if (data === "delete") {
        return_temp = is_active ? "disable" : "enable";
      } else {
        return_temp = data;
      }
      return_permission.push(return_temp);
    });
    return return_permission;
  };

  updatePostFormat = (newData) => {
    newData.start_date = dateFormat(newData.start_date, "YYYY-MM-DD");
    newData.end_date = dateFormat(newData.end_date, "YYYY-MM-DD");
    newData.finance_enabled = Boolean(newData.finance_enabled);
    if (Array.isArray(newData.branch)) {
      newData.branch = newData.branch.map((b) => (typeof b === "object" && b != null ? b.id : b));
    }
    let payload = {
      academicyear: newData,
    };
    return payload;
  };

  updateDisableFormat = (fieldValue, value, id) => {
    let newData = {};
    newData.start_date = dateFormat(fieldValue[0], "YYYY-MM-DD");
    newData.end_date = dateFormat(fieldValue[1], "YYYY-MM-DD");
    newData.is_active = value;
    let payload = {
      academicyear: newData,
    };
    if (id == getAcademicYear()) {
      localStorage.removeItem("academic-year");
    }
    return payload;
  };

  updateType = (newData, id) => {
    let academicYear = this.state.academicYearList;
    const branchList = this.state.branchList || [];
    for (const data of academicYear) {
      if (data.id === id) {
        data.start_date = newData.start_date;
        data.end_date = newData.end_date;
        data.start_date_label = dateFormat(newData.start_date, "DD-MM-YYYY");
        data.end_date_label = dateFormat(newData.end_date, "DD-MM-YYYY");
        data.finance_enabled = Boolean(newData.finance_enabled);
        if (Array.isArray(newData.branch)) {
          data.branch_selected_list = newData.branch;
          data.branch_display = newData.branch
            .map((b) => (typeof b === "object" && b != null ? b.name : ""))
            .filter(Boolean)
            .join(", ");
        }
        break;
      }
    }
    this.setState({
      academicYearList: cloneDeep(academicYear),
    });
    return true;
  };

  componentDidMount = () => {
    if (isAcademicBranchMappingEnabled) {
      getRequest(GET_URL.branch.api, { is_active: true }, this.props).then(
        (response) => {
          if (response && response.status === 200) {
            const list = response.data.data || response.data || [];
            this.setState({
              branchList: Array.isArray(list) ? list : [],
            });
          }
        }
      );
    }
    this.getAcademicYearList();
    this.setState({
      optionsLocal: { ...options },
    });
  };

  getAcademicYearList = () => {
    const url = GET_URL.academicyear.api;
    const params = {};
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        const list = response.data.data || [];
        list.forEach((data) => {
          data["start_date_label"] = dateFormat(
            data["start_date"],
            "DD-MM-YYYY"
          );
          data["end_date_label"] = dateFormat(data["end_date"], "DD-MM-YYYY");
          // Branch names comma-separated (API sends branch_data with branch_name)
          let branchNames = [];
          if (Array.isArray(data.branch_data)) {
            branchNames = data.branch_data.map((b) => b.branch_name || b.name || "");
          } else if (Array.isArray(data.branch_names)) {
            branchNames = data.branch_names;
          } else if (Array.isArray(data.branch_list)) {
            branchNames = data.branch_list.map((b) => b.name || b.branch_name || "");
          } else if (Array.isArray(data.branches)) {
            branchNames = data.branches;
          }
          data["branch_display"] = branchNames.filter(Boolean).join(", ");
          // For edit form: selected list of { id, name } (branch_data has branch id and branch_name)
          data["branch_selected_list"] = (data.branch_data || []).map((b) => ({
            id: b.branch,
            name: b.branch_name || "",
          }));
          // Finance enabled (ensure boolean for display)
          data["finance_enabled"] = data.finance_enabled === true || data.finance_enabled === "true";
        });
        this.setState({
          academicYearList: list,
          loading: false,
        });
      }
    });
  };

  deleteType = async (id) => {
    let year_list = this.state.academicYearList;
    year_list.map((data, index) => {
      if (data.id === id) {
        year_list.splice(index, 1);
      }
    });
    this.setState({
      academicYearList: year_list,
    });
  };

  onTableChange = (tableState) => {
    let newOptions = { ...this.state.optionsLocal };
    newOptions["searchText"] = tableState["searchText"];
    this.setState({
      optionsLocal: { ...newOptions },
    });
  };

  render() {
    const { loading, academicYearList, columns, optionsLocal, tableUpdating } =
      this.state;
    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
          <Paper className={classNames("paper-background")}>
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Box className="heading">
                  <FormattedMessage {...commonMessages.academicYear} />
                </Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  {isUserHasPermission("academic_year", "create") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.academic_year.create.url}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.academic_year.create.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Grid container className={classNames("header-align")}>
              <Grid item md={8}>
                <Paper>
                  <AllMUIDataTable
                    key={academicYearList}
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    data={academicYearList}
                    columns={columns}
                    options={optionsLocal}
                    onTableChange={this.onTableChange}
                  />
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      );
    }
  }
}
export default AcademicYearList;
