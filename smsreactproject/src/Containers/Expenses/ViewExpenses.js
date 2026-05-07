import React, { Component } from "react";
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from "@material-ui/core";
import Swal from "sweetalert2";
import AddCircleOutlineOutlinedIcon from "@material-ui/icons/AddCircleOutlineOutlined";
import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import { withRouter } from "react-router-dom";
import classNames from "classnames";

import { DropDownWithSearch } from "Components/DropDownWithSearch";
import { DateRange } from "Components/DateRange";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import { Dropdown } from "Components/DropDown";
import StudentListActions from "Includes/StudentListActions";
import AllMUIDataTable from "Components/AllMUIDataTable";
import loadingBar from "images/loading.gif";
import { getRequest, deleteRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL } from "Includes/urls";
import { Actions } from "Constants/permissions";
import {
  isUserHasPermission,
  checkLocalFinancialYear,
  SetFinancialYear,
  getPaginationProps,
  getKeyValueMap,
  numberWithCommas,
  dateFormat,
} from "Includes/functions";
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import { image_formats } from "Containers/Expenses/Constants";
import { cloneDeep } from "lodash";
import moment from "moment";
import { getFormDefinitionValue } from "Includes/CheckFormDefinition";

class ViewExpenses extends Component {
  constructor(props) {
    super(props);
    this.state = {
      expenseList: [],
      loading: true,
      selectedToDelete: [],
      tableUpdating: false,
      yearList: [],
      year: "",
      pageLoading: true,
      isBlankPage: true,
      error: {},
      selectedExpenses: {},
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      dateRangeValue: {},
      minDate: "",
      maxDate: "",
      enableDateRange: false,
      expensesTypeList: [],
      blankData: "Select Financial year",
      total_details: {},
      largeImagePreview: "",
      columns: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
            download: false,
          },
        },
        {
          name: "payee_name",
          label: "Payee Name",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "expense_type_name",
          label: "Expense Type",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              const tokenDetails = tableMeta.rowData[7];
              const tokenNum = tokenDetails?.token_num;

              return (
                <Box>
                  {tokenNum ? `${value} (${tokenNum})` : value}
                </Box>
              );
            },
          },
        },
        {
          name: "ref_number",
          label: "Ref Num",
          options: {
            filter: true,
            sort: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <Box>{value}</Box>;
            },
          },
        },
        {
          name: "date",
          label: "Date",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <Box>{dateFormat(value, "DD-MM-YYYY")}</Box>;
            },
          },
        },
        {
          name: "amount",
          label: "Amount",
          options: {
            filter: true,
            sort: true,
            display: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return numberWithCommas(value);
            },
          },
        },
        {
          name: "tax_amount",
          label: "Tax",
          options: {
            filter: true,
            sort: true,
            display: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return numberWithCommas(value);
            },
          },
        },
        {
          name: "total_amount",
          label: "Total Amount",
          options: {
            filter: true,
            sort: true,
            display: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return numberWithCommas(value);
            },
          },
        },
        {
          name: "purchased_receipt_num",
          label: "Purchased Receipt Num",
          options: {
            filter: true,
            sort: true,
            display: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return value;
            },
          },
        },
        {
          name: "mode_of_payment",
          label: "Mode of Payment",
          options: {
            filter: true,
            sort: true,
            display: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              // Handle mode_of_payment - it might be an object or a string
              let modeOfPayment = value;
              if (modeOfPayment && typeof modeOfPayment === "object") {
                modeOfPayment = modeOfPayment["id"] || modeOfPayment["name"] || "";
              }

              // Find the index of cheque_clearance_date column in the columns array
              const columns = this.state.columns;
              const chequeClearanceDateColumnIndex = columns.findIndex(col => col.name === "cheque_clearance_date");

              // Get cheque clearance date value from rowData
              let chequeClearanceDate = null;
              if (chequeClearanceDateColumnIndex !== -1) {
                chequeClearanceDate = tableMeta.rowData[chequeClearanceDateColumnIndex];
              }

              // Check if mode of payment is Cheque and cheque clearance date exists
              const isCheque = modeOfPayment === "Cheque";

              return (
                <Box>
                  <Box>{modeOfPayment || ""}</Box>
                  {isCheque && chequeClearanceDate && (
                    <Box style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Clearance: {dateFormat(chequeClearanceDate, "DD-MM-YYYY")}
                    </Box>
                  )}
                </Box>
              );
            },
          },
        },
        {
          name: "cheque_clearance_date",
          label: "Cheque Clearance Date",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
            download: false,
          },
        },
        {
          name: "token_details",
          label: "Total Amount",
          options: {
            filter: false,
            sort: false,
            display: false,
            download: false,
            view_columns: false,
          },
        },
        {
          name: "attachment_details",
          label: "Receipt",
          options: {
            filter: false,
            sort: false,
            search: false,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              return (
                <Box>
                  {value && value.file && (
                    <Box style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <Box
                        onClick={() => this.handleViewImage(value)}
                        className="view-expenses-image-view"
                        style={{ cursor: "pointer", color: "#1976d2" }}
                      >
                        {"[View]"}
                      </Box>
                      <a
                        href={value.file}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ cursor: "pointer", color: "#1976d2", textDecoration: "none" }}
                      >
                        {"[Download]"}
                      </a>
                    </Box>
                  )}
                  {(!value || !value.file) && (
                    <Box style={{ color: "#999" }}>{"------"}</Box>
                  )}
                </Box>
              );
            },
          },
        },
        {
          name: "created",
          label: "Created",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
            download: false,
          },
        },
        {
          name: "Action",
          label: "Action",
          options: {
            display: this.updatePermissions("display"),
            filter: true,
            sort: false,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              // Per-row time window check for edit/delete
              let rowEnabledActions = [...this.state.enabledActions];
              const columns = this.state.columns;
              const createdColIndex = columns.findIndex(col => col.name === "created");
              const createdDate = createdColIndex !== -1 ? tableMeta.rowData[createdColIndex] : null;
              const validDays = getFormDefinitionValue("expense_configuration", "valid_days_to_edit_delete_expense", 7);
              if (validDays && validDays > 0 && createdDate) {
                const daysSinceCreated = moment().diff(moment(createdDate), "days");
                if (daysSinceCreated > validDays) {
                  rowEnabledActions = rowEnabledActions.filter(a => a !== "edit" && a !== "delete");
                }
              }
              return (
                <div>
                  <StudentListActions
                    id={tableMeta.rowData[0]}
                    index={tableMeta.rowIndex}
                    deleteStudent={this.deleteExpense}
                    editURL={Actions.expenses_create.update.url}
                    viewURL={Actions.expenses_individual.view.url}
                    enabledActions={rowEnabledActions}
                    printId={
                      tableMeta.rowData[0] ? tableMeta.rowData[0] + "/" : null
                    }
                    print_label="Print"
                    url={GET_URL.expense.api}
                    params={{ print_receipt: 1 }}
                  />
                </div>
              );
            },
          },
        },
      ],
      transport_column: [
        {
          name: "id",
          label: "id",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
            download: false,
          },
        },
        {
          name: "vehicle_details",
          label: "vehicle",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "token_detail",
          label: "Token (Num of liter)",
          options: {
            filter: true,
            sort: true,
          },
        },
        {
          name: "date",
          label: "Date",
          options: {
            filter: true,
            sort: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return <Box>{dateFormat(value, "DD-MM-YYYY")}</Box>;
            },
          },
        },
        {
          name: "amount",
          label: "Amount",
          options: {
            filter: true,
            sort: true,
            display: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return numberWithCommas(value);
            },
          },
        },
        {
          name: "tax_amount",
          label: "Tax",
          options: {
            filter: true,
            sort: true,
            display: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return numberWithCommas(value);
            },
          },
        },
        {
          name: "total_amount",
          label: "Total Amount",
          options: {
            filter: true,
            sort: true,
            display: true,
            customBodyRender: (value, tableMeta, updateValue) => {
              return numberWithCommas(value);
            },
          },
        },
        {
          name: "created",
          label: "Created",
          options: {
            filter: false,
            sort: false,
            display: false,
            viewColumns: false,
            download: false,
          },
        },
        {
          name: "Action",
          label: "Action",
          options: {
            display: this.updatePermissions("display"),
            filter: true,
            sort: false,
            download: false,
            customBodyRender: (value, tableMeta, updateValue) => {
              // Per-row time window check for edit/delete
              let rowEnabledActions = [...this.state.enabledActions];
              const columns = this.state.transport_column;
              const createdColIndex = columns.findIndex(col => col.name === "created");
              const createdDate = createdColIndex !== -1 ? tableMeta.rowData[createdColIndex] : null;
              const validDays = getFormDefinitionValue("expense_configuration", "valid_days_to_edit_delete_expense", 7);
              if (validDays && validDays > 0 && createdDate) {
                const daysSinceCreated = moment().diff(moment(createdDate), "days");
                if (daysSinceCreated > validDays) {
                  rowEnabledActions = rowEnabledActions.filter(a => a !== "edit" && a !== "delete");
                }
              }
              return (
                <div>
                  <StudentListActions
                    id={tableMeta.rowData[0]}
                    index={tableMeta.rowIndex}
                    deleteStudent={this.deleteExpense}
                    editURL={Actions.expenses_create.update.url}
                    viewURL={Actions.expenses_individual.view.url}
                    enabledActions={rowEnabledActions}
                    printId={
                      tableMeta.rowData[0] ? tableMeta.rowData[0] + "/" : null
                    }
                    print_label="Print"
                    url={GET_URL.expense.api}
                    params={{ print_receipt: 1 }}
                  />
                </div>
              );
            },
          },
        },
        {
          name: "token_details",
          label: "Total Amount",
          options: {
            filter: false,
            sort: false,
            display: false,
            download: false,
            view_columns: false,
          },
        },

      ],
    };
  }

  fieldValues(name, code) {
    let fieldValues = [];
    fieldValues.push(name);
    fieldValues.push(code);
    return fieldValues;
  }

  updatePostFormat = (newData) => {
    let payload = {
      name: newData.name,
      code: newData.code,
    };
    return payload;
  };

  updatePermissions = (name) => {
    let test = true;
    const { isComponent } = this.props;
    const hasViewPermission = isUserHasPermission(
      "expenses_individual",
      "view"
    );
    const hasEditPermission = isUserHasPermission("expenses_create", "update");
    const hasDeletePermission = isUserHasPermission(
      "expenses_create",
      "delete"
    );
    let enabledActions = [];
    if (hasViewPermission) {
      enabledActions.push("view");
      enabledActions.push("print");
    }
    if (hasEditPermission) {
      enabledActions.push("edit");
    }
    if (hasDeletePermission) {
      enabledActions.push("delete");
    }
    if (enabledActions.length === 0) {
      test = false;
    }
    if (name === "display") {
      if (isComponent) {
        return false;
      }
      return test;
    } else {
      this.setState({
        enabledActions: enabledActions,
        columns: this.state.columns,
      });
    }
  };

  componentDidMount = () => {
    const pagination_types = JSON.parse(
      localStorage.getItem("pagination_types")
    )
      ? JSON.parse(localStorage.getItem("pagination_types"))
      : {};
    if (pagination_types["expense_list"]) {
      let pagination_temp = cloneDeep(this.state.pagination);
      pagination_temp["page"] = pagination_types["expense_list"]["page"];
      pagination_temp["rowsPerPage"] =
        pagination_types["expense_list"]["rowsPerPage"];
      this.setState(
        {
          pagination: cloneDeep(pagination_temp),
        },
        () => {
          this.getFinancialYearList();
        }
      );
    } else {
      this.getFinancialYearList();
    }

    this.updatePermissions("actions");
    let options = { ...multiOptions };
    this.setState({
      options: options,
    });
  };

  getTotalExpenses = () => {
    let { dateRangeValue, total_details, selectedExpenses } = this.state;
    let params = {
      from_date: dateRangeValue.start,
      to_date: dateRangeValue.end,
    };
    if (selectedExpenses.id && selectedExpenses.id !== "all") {
      params["expense_plan"] = selectedExpenses.id;
    }
    getRequest(GET_URL.balance.api, params, this.props).then((response) => {
      if (response && response.status === 200) {
        total_details["expenses"] = numberWithCommas(
          response.data.data["expense"]
        );
        this.setState({
          total_details,
        });
      }
    });
  };

  updateDateRange = (year) => {
    let { yearList, minDate, maxDate } = this.state;
    yearList.map((data) => {
      if (data.id == year) {
        minDate = data.start_date;
        maxDate = data.end_date;
      }
    });
    this.setState({
      minDate,
      maxDate,
      enableDateRange: true,
    });
  };

  getFinancialYearList = () => {
    const url = GET_URL.financialyear.api;
    const param = { is_active: true };
    getRequest(url, param, this.props).then((response) => {
      if (response && response.status === 200) {
        let startDateKey = getKeyValueMap(
          response.data.data,
          "id",
          "start_date"
        );
        let endDateKey = getKeyValueMap(response.data.data, "id", "end_date");
        this.setState({
          yearList: response.data.data,
          loading: false,
          startDateKey,
          endDateKey,
        });
        let year = checkLocalFinancialYear(response.data.data);
        if (year) {
          let dateRangeValue = {
            start: startDateKey[year],
            end: endDateKey[year],
          };
          this.setState(
            {
              year,
              dateRangeValue,
            },
            () => {
              this.getExpensesList();
              this.getExpensesTypes(year, true);
              this.updateDateRange(year);
            }
          );
        } else {
          this.setState({
            pageLoading: false,
          });
        }
      }
    });
  };

  getExpensesList = (paginationProps) => {
    this.setState({
      tableUpdating: true,
    });
    const pagination_types = JSON.parse(
      localStorage.getItem("pagination_types")
    )
      ? JSON.parse(localStorage.getItem("pagination_types"))
      : {};
    this.getTotalExpenses();
    let { dateRangeValue, year, selectedExpenses, pagination } = this.state;
    this.currentPagination = pagination;
    if (paginationProps === "default") {
      this.currentPagination = cloneDeep(DEFAULT_PAGINATION_PROPS_ID_LIST);
      delete pagination_types.expense_list;
      let temp_new = { ...pagination_types };
      localStorage.setItem("pagination_types", JSON.stringify(temp_new));
    } else if (paginationProps) {
      this.currentPagination = { ...paginationProps };
      let temp = {};
      temp = { expense_list: this.currentPagination };
      let temp_new = { ...pagination_types, ...temp };
      localStorage.setItem("pagination_types", JSON.stringify(temp_new));
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    let params = {
      ...pagination_params,
      is_active: true,
      expense_plan__financial_year: year,
      expense_for: 1,
    };
    if (dateRangeValue.start && dateRangeValue.end) {
      params["start_date"] = dateRangeValue.start;
      params["end_date"] = dateRangeValue.end;
    }
    if (selectedExpenses.id && selectedExpenses.id !== "all") {
      params["expense_plan"] = selectedExpenses.id;
    }
    const url = GET_URL.expense.api;
    let prop = { ...this.props };
    if (paginationProps === "download") {
      params["download_excel"] = 1;
      prop.responseType = "blob";
    }
    getRequest(url, params, prop).then((response) => {
      if (response && response.status === 200) {
        if (paginationProps === "download") {
          let startLabel = dateFormat(
            dateRangeValue.start,
            "DD-MM-YYYY hh:mm:A"
          );
          let endLabel = dateFormat(dateRangeValue.end, "DD-MM-YYYY hh:mm:A");
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement("a");
          link.href = url;
          link.setAttribute(
            "download",
            `Expenses - [${startLabel} - ${endLabel}].xlsx`
          );
          document.body.appendChild(link);
          link.click();
          this.setState({
            tableUpdating: false,
            loading: false,
          });
          return;
        }
        response.data.data.data_list.map((data, index) => {
          data["token_detail"] = data["token_details"]
            ? `${data["token_details"].token_num} (${data["token_details"].liter})`
            : "";
          data["vehicle_details"] = data["other_details"]
            ? `${data["other_details"]["vehicle_num"]} (${data["other_details"]["name"]})`
            : "";
        });
        this.setState({
          expensesList: response.data.data,
          pageLoading: false,
          isBlankPage: false,
          tableUpdating: false,
          pagination: this.currentPagination
            ? this.currentPagination
            : this.state.pagination,
        });
      }
      this.setState({
        tableUpdating: false,
        loading: false,
      });
    });
    return false;
  };

  getExpensesTypes = (year, is_initial) => {
    const url = GET_URL.expenseplan.api;
    const params = {
      financial_year: year,
      is_active: true,
      expense_type__expense_for: 1,
    };
    getRequest(url, params, this.props).then((response) => {
      if (response && response.status === 200) {
        let temp = { id: "all", expense_type_name: "All" };
        response.data.data.unshift(temp);
        this.setState(
          {
            expensesTypeList: response.data.data,
            selectedExpenses: temp,
            year,
          },
          () => {
            if (!is_initial) {
              this.getExpensesList("default");
            }
          }
        );
      }
    });
  };

  deleteExpense = async (id, index) => {
    this.setState({ tableUpdating: true });
    let { expensesList, columns } = this.state;
    const del_url = DEL_URL.expense.api;
    const url = del_url + id + "/";
    deleteRequest(url, {}, this.props).then((response) => {
      if (response && response.status === 200) {
        expensesList.data_list.splice(index, 1);
        this.setState({
          expensesList,
          columns: [...columns],
        });
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
    this.setState({ tableUpdating: false });
  };

  onChange = (e) => {
    let { name, value } = e.target;
    if (value !== 0) {
      SetFinancialYear(value);
      this.setState({
        [name]: value,
        pageLoading: true,
        isBlankPage: true,
        error: {},
      });
      this.updateDateRange(value);
      this.getExpensesTypes(value);
    }
  };

  handleDropDownSearchChange = (e, newValue) => {
    let { year } = this.state;
    if (newValue) {
      this.setState(
        {
          selectedExpenses: newValue,
          tableUpdating: true,
        },
        () => {
          this.getExpensesList("default");
        }
      );
    }
  };

  handleAddExpensesButton = () => {
    let { year, error, alertData, yearList } = this.state;
    if (year !== "") {
      let yearName, fromDate, toDate;
      yearList.map((data) => {
        if (data.id == year) {
          yearName = data.name;
          fromDate = data.start_date;
          toDate = data.end_date;
        }
      });
      let yearInformation = {
        year: year,
        yearName: yearName,
        fromDate: fromDate,
        toDate: toDate,
      };
      let searchParam = "?" + new URLSearchParams(yearInformation).toString();
      this.props.history.push({
        pathname: Actions.expenses_create.create.url,
        search: searchParam,
      });
    } else {
      alertData = "Select Financial Year";
      error.year = alertData;
      this.setState({
        open: true,
        alertData,
        error,
      });
    }
  };

  handleChangeDateRange = (value) => {
    this.setState(
      {
        dateRangeValue: value,
      },
      () => {
        this.getExpensesList("default");
      }
    );
  };

  handleViewImage = (attachment_details) => {
    let file = attachment_details.file;
    let file_extension = `${file.slice(
      (Math.max(0, file.lastIndexOf(".")) || Infinity) + 1
    )}`;
    if (image_formats.includes(file_extension)) {
      this.setState({ largeImagePreview: file });
    } else {
      window.open(file);
    }
  };

  handleCloseLargeImage = () => {
    this.setState({ largeImagePreview: "" });
  };

  render() {
    const {
      loading,
      blankData,
      columns,
      tableUpdating,
      yearList,
      year,
      pageLoading,
      isBlankPage,
      error,
      expensesTypeList,
      expensesList,
      selectedExpenses,
      minDate,
      maxDate,
      enableDateRange,
      pagination,
      transport_column,
      total_details,
      largeImagePreview,
    } = this.state;
    const { isComponent } = this.props;
    let classNamePaper = isComponent ? "" : "paper-background";

    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [5, 10, 25, 50, 100],
      onDownload: (buildHead, buildBody, columns, data) => {
        return this.getExpensesList("download");
      },
      downloadOptions: {
        filename: "Expenses.csv",
        filterOptions: {
          useDisplayedColumnsOnly: true,
          useDisplayedRowsOnly: true,
        },
      },
    };

    if (loading) {
      return (
        <Box display="flex">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    } else {
      return (
        <Box>
          {largeImagePreview && (
            <Box className="set-question-large-image-preview-box">
              <img
                src={largeImagePreview}
                alt="Receipt Preview"
                className="set-question-large-image-preview"
              />
              <Tooltip title="Close Image" placement="top-start">
                <Box
                  className="set-question-large-image-remove-icon-box"
                  onClick={this.handleCloseLargeImage}
                >
                  <HighlightOffIcon className="set-question-large-image-remove-icon" />
                </Box>
              </Tooltip>
            </Box>
          )}
          <Paper
            className={classNamePaper}
            style={
              isComponent && { background: "transparent", boxShadow: "none" }
            }
          >
            {!isComponent && (
              <Grid container>
                <Grid
                  item
                  md={6}
                  xs={12}
                  className={classNames("header-align")}
                >
                  <Box className="heading">Expenses</Box>
                </Grid>

                <Grid item md={6} xs={12}>
                  <Box className={classNames("header-align", "end-flex-prop")}>
                    {isUserHasPermission("expenses_create", "create") && (
                      <Button
                        variant="contained"
                        onClick={this.handleAddExpensesButton}
                        className="editbutton-view"
                      >
                        <AddCircleOutlineOutlinedIcon className="visibility-icon" />{" "}
                        {Actions.expenses_create.create.label}
                      </Button>
                    )}
                  </Box>
                </Grid>
              </Grid>
            )}
            <Grid container className="" spacing={2}>
              <Grid item lg={3} md={4} xs={6}>
                <Dropdown
                  data={yearList}
                  name="year"
                  value={year}
                  onChange={this.onChange}
                  label="Financial year"
                  className="width-100"
                  error={error.year}
                  hideSelect
                />
              </Grid>
              <Grid item lg={3} md={4} xs={6}>
                <DropDownWithSearch
                  id="combo-box-demo"
                  options={expensesTypeList}
                  value={selectedExpenses}
                  onChange={(e, newValue) =>
                    this.handleDropDownSearchChange(e, newValue)
                  }
                  name="selectedExpenses"
                  optionValue="expense_type_name"
                  label="Expense Type"
                  className="width-100"
                  error={error["selectedExpenses"]}
                  disabled={year ? false : true}
                  hideClearIcon={true}
                />
              </Grid>
              <Grid item lg={4} md={12} xs={12}>
                {enableDateRange && (
                  <DateRange
                    handleChange={this.handleChangeDateRange}
                    minDate={minDate}
                    maxDate={maxDate}
                  />
                )}
              </Grid>
            </Grid>
            <Grid container className={classNames("header-align")}>
              {isBlankPage && !pageLoading && (
                <Grid item md={12}>
                  <BlankPagewithIcon data={blankData} />
                </Grid>
              )}
              {pageLoading && (
                <Box className="loading">
                  <CircularProgress />
                </Box>
              )}
              {!pageLoading && !isBlankPage && (
                <Grid item md={12}>
                  <Paper>
                    <AllMUIDataTable
                      key={expensesList.data_list}
                      title={
                        tableUpdating ? (
                          <CircularProgress className="white-text" />
                        ) : (
                          `Total expenses ${total_details?.expenses}`
                        )
                      }
                      data={expensesList.data_list}
                      columns={
                        selectedExpenses.expense_type_codename == "transport"
                          ? transport_column
                          : columns
                      }
                      options={options}
                      onTableChange={this.getExpensesList}
                      serverSide={true}
                      pagination={pagination}
                      count={expensesList.count}
                    />
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Box>
      );
    }
  }
}
export default withRouter(ViewExpenses);
