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
  isUserHasPermission,
  updatePermissions,
  validateDate,
} from "Includes/functions";
import { Actions } from "Constants/permissions";
import { minDate, maxDate, options } from "Constants";
import messages from "./messages";
import commonMessages from "Constants/messages";
import { FormattedMessage } from "react-intl";

const fieldDetails = [
  {
    label: <FormattedMessage {...commonMessages.start_date} />,
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
    updateChildValue: true,
  },
  {
    label: <FormattedMessage {...commonMessages.end_date} />,
    regex: "",
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
    disabled: true,
  },
];

class FinancialYearList extends Component {
  constructor() {
    super();
    this.permission = updatePermissions("financial_year", ["update", "delete"]);
    this.state = {
      financialYearList: [],
      loading: true,
      selectedToDelete: [],
      closeMenu: true,
      errorContent: "",
      tableUpdating: false,
      optionsLocal: {},
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
          name: "name",
          label: <FormattedMessage {...commonMessages.financialYear} />,
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
                    fieldValues={[tableMeta.rowData[3], tableMeta.rowData[4]]}
                    updateDisableFormat={this.updateDisableFormat}
                    enabledActions={this.updatePermissionTable(
                      this.permission,
                      tableMeta.rowData[1]
                    )}
                    handleDisable={this.handleDisable}
                    getAcademicYearList={this.getFinancialYearList}
                    label={<FormattedMessage {...messages.editFinancialYear} />}
                    fieldDetails={fieldDetails}
                    updateType={this.updateType}
                    baseClassName="action-basic-detail-width"
                    updateUrl={PUT_URL.financialyear.api}
                    updatePostFormat={this.updatePostFormat}
                    updateChildValue={this.updateChildValue}
                    deleteUrl={DEL_URL.financialyear.api}
                    deleteType={this.deleteType}
                  />
                </div>
              );
            },
          },
        },
      ],
    };
  }

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

  updateDisableFormat = (fieldValue, value) => {
    let newData = {};
    newData.start_date = dateFormat(fieldValue[0], "YYYY-MM-DD");
    newData.end_date = dateFormat(fieldValue[1], "YYYY-MM-DD");
    newData.is_active = value;
    let payload = {
      financialyear: newData,
    };
    return payload;
  };

  updateChildValue = (fieldValue) => {
    let value = new Date(fieldValue.start_date);
    let end_date;
    if (value.getDate() === "1") {
      end_date = new Date(value.getFullYear(), value.getMonth(), 0);
    } else {
      end_date = new Date(
        value.getFullYear() + 1,
        value.getMonth(),
        value.getDate() - 1
      );
    }
    fieldValue["end_date"] = end_date;
    return fieldValue;
  };

  componentDidMount = () => {
    this.getFinancialYearList();
    this.setState({
      options_local: { ...options },
    });
  };

  updatePostFormat = (newData) => {
    newData.start_date = dateFormat(newData.start_date, "YYYY-MM-DD");
    newData.end_date = dateFormat(newData.end_date, "YYYY-MM-DD");
    let payload = {
      financialyear: newData,
    };
    return payload;
  };

  updateType = (newData, id) => {
    let financialYear = this.state.financialYearList;
    for (const data of financialYear) {
      if (data.id === id) {
        data.start_date = newData.start_date;
        data.end_date = newData.end_date;
        data.start_date_label = dateFormat(newData.start_date, "DD-MM-YYYY");
        data.end_date_label = dateFormat(newData.end_date, "DD-MM-YYYY");
        break;
      }
    }
    this.setState({
      financialYearList: [...financialYear],
    });
    return true;
  };

  getFinancialYearList = () => {
    const url = GET_URL.financialyear.api;
    const params = {};
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        response.data.data.map((data) => {
          data["start_date_label"] = dateFormat(
            data["start_date"],
            "DD-MM-YYYY"
          );
          data["end_date_label"] = dateFormat(data["end_date"], "DD-MM-YYYY");
        });
        this.setState({
          financialYearList: response.data.data,
          loading: false,
        });
      }
    });
  };

  deleteType = async (id) => {
    let year_list = this.state.financialYearList;
    year_list.map((data, index) => {
      if (data.id === id) {
        year_list.splice(index, 1);
      }
    });
    this.setState({
      financialYearList: year_list,
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
    const {
      loading,
      financialYearList,
      columns,
      options_local,
      tableUpdating,
    } = this.state;
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
                  <FormattedMessage {...commonMessages.financialYear} />
                </Box>
              </Grid>
              <Grid item md={6} xs={12}>
                <Box className={classNames("header-align", "end-flex-prop")}>
                  {isUserHasPermission("financial_year", "create") && (
                    <Button
                      variant="contained"
                      component={Link}
                      to={Actions.financial_year.create.url}
                      className="editbutton-view"
                    >
                      <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                      {Actions.financial_year.create.label}
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
            <Grid container className={classNames("header-align")}>
              <Grid item md={8}>
                <Paper>
                  <AllMUIDataTable
                    key={financialYearList}
                    title={
                      tableUpdating ? (
                        <CircularProgress className="white-text" />
                      ) : (
                        ""
                      )
                    }
                    data={financialYearList}
                    columns={columns}
                    options={options_local}
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
export default FinancialYearList;
