import React, { Component } from "react";
import {
  Paper,
  Box,
  Grid,
  Button,
  CircularProgress,
  FormControl,
  TextareaAutosize,
  FormHelperText,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  Tooltip,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from "@material-ui/core";
import Swal from "sweetalert2";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import classNames from "classnames";
import _ from "lodash";
import { withRouter } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  MuiPickersUtilsProvider,
  KeyboardDateTimePicker
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";

import AllMUIDataTable from "Components/AllMUIDataTable";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import loadingBar from "images/loading.gif";
import { getRequest, postRequest, deleteRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL, DEL_URL } from "Includes/urls";
import {
  isUserHasPermission,
  getPaginationProps,
  dateFormat,
  validateDate,
  getAcademicYear,
  getStandard,
  SetAcademicYear,
} from "Includes/functions";
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert } from "Includes/functions";
import { FormattedMessage } from "react-intl";
import messages from "./messages";
import commonMessages from "Constants/messages";
import ActionColumn from "Components/ActionColumnNew";
import { Actions } from "Constants/permissions";

const alias_names = JSON.parse(localStorage.getItem("alias_name"))
  ? JSON.parse(localStorage.getItem("alias_name"))
  : {};

class LibCheckinoutcreate extends Component {
  constructor() {
    super();
    this.state = {
      stockVerificationList: [],
      loading: false,
      submitDisable: false,
      tableUpdating: false,
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      enabledActions: [],
      verificationForList: [],
      selectedVerificationFor: "",
      barcode: "",
      sequenceStart: "",
      sequenceEnd: "",
      sequenceResult: null,
      sequenceLoading: false,
      sequenceDialogOpen: false,
      stockverificationcount: 0,
      snackbar: false,
      verification_list_columns: [
        {
            name: "id",
            label: "Id",
            options: {
              filter: false,
              sort: false,
              viewColumns: false,
              display: false,
              download: false,
            },
        },
        {
          name: "bar_code",
          label: "Bar Code",
          options: {
            filter: false,
            sort: false,
            viewColumns: false,
            display: true,
            download: false,
          },
        },
        {
          name: "book_title",
          label: "book_title",
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "verified_date",
          label: "Verified Date",
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "remarks",
          label: "Remarks",
          options: {
            filter: false,
            sort: true,
            search: true,
          },
        },
        {
          name: "verified_by_name",
          label: "Verified By",
          options: {
            filter: false,
            sort: true,
            search: true,
          }
        },
        {
            name: "Actions",
            label: <FormattedMessage {...commonMessages.actions} />,
            options: {
                display: true,
                filter: false,
                sort: false,
                customBodyRender: (value, tableMeta) => (
                    <ActionColumn
                        id={tableMeta.rowData[0]}
                        fieldValues={[tableMeta.rowData[1], tableMeta.rowData[2]]}
                        label="edit"
                        baseClassName='action-basic-detail-width'
                        deleteUrl={DEL_URL.librarystockverification.api}
                        deleteType={this.deleteType}
                        enabledActions={['delete']}
                    />
                ),
            },
        },
      ],
    };
    this.dateRange = React.createRef();
    this.searchBarCode = React.createRef();
  }

  deleteType = (id) => {
    this.setState((prevState) => ({
      stockVerificationList: prevState.stockVerificationList.filter(item => item.id !== id)
    }));
  };

  handleCloseSnackBar = () => {
    this.setState({snackbar: false});
  };

  getStockVerificationList = (paginationProps) => {
    this.setState({ tableUpdating: true });
    let {
      pagination,
    } = this.state;
    this.currentPagination = pagination;
    if (paginationProps && paginationProps !== "download") {
      this.currentPagination = { ...paginationProps };
    }
    let pagination_params = getPaginationProps(this.currentPagination);
    const url = GET_URL.librarystockverification.api;
    let params = { ...pagination_params, is_active: true };
    if(this.state.selectedVerificationFor){
      params['stock_verification_parent'] = this.state.selectedVerificationFor.id
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
          link.setAttribute("download", `StockVerificationList.xlsx`);
          document.body.appendChild(link);
          link.click();
          this.setState({
            tableUpdating: false,
            loading: false,
          });
          return;
        }
        this.callApi = true;
        this.setState({
          stockVerificationList: response.data.data.data_list,
          stockverificationcount: response.data.data.count,
          dataReady: true,
          loading: false,
          tableUpdating: false,
          pagination: this.currentPagination
            ? this.currentPagination
            : this.state.pagination,
        });
      }else{
        this.setState({
          tableUpdating: false
        })
      }
    });
    return false;
  };

  updatePermissions = (name) => {
    let test = true;
    const hasViewPermission = isUserHasPermission(
      "checkIn_checkOut_Individual",
      "view"
    );
    // const hasDeletePermission = isUserHasPermission('checkIn_checkOut_List', 'delete')
    let enabledActions = [];
    if (hasViewPermission) {
      enabledActions.push("view");
    }
    // if (hasDeletePermission) {
    //     enabledActions.push('delete')
    // }
    if (enabledActions.length === 0) {
      test = false;
    }
    if (name === "display") {
      return test;
    } else {
      this.setState({
        enabledActions: enabledActions,
      });
    }
  };

  getStockVerificaionParentList = () => {
    const url = GET_URL.librarystockverificationparent.api;
    let params = { is_active: true };
    let prop = { ...this.props };
    getRequest(url, params, prop).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          verificationForList: response.data.data,
        });
        this.getStockVerificationList();
      }
    });
  }

  componentDidMount = () => {
    this.updatePermissions();
    this.setState(
      {
        isBlankPage: false,
      },
      () => {
        this.getStockVerificaionParentList();
      }
    );
  };

  onChange = (e) => {
    let { name, value } = e.target;
    this.setState({
      [name]: value,
    });
  };

  handleChangeCheckInOut = (e, name) => {
    let { fieldValue, fieldError } = this.state;
    if (name === "checkIn") {
      delete fieldError["checkIn"];
    } else {
      delete fieldError["checkIn"];
    }
    fieldValue[name] = e;
    this.setState({
      fieldValue,
      fieldError,
    });
  };

  handleClose = () => {
    this.setState({
      openDialog: false,
    });
    this.getStockVerificationList();
  };

  submit = () => {
    let returnValue = this.validation();
    if (returnValue) {
      this.setState({
        submitDisable: true,
      });
      let propsValue = { ...this.props };
      propsValue["return_error_message"] = true;
      let postUrl = POST_URL.usercheckincheckout.api;
      postRequest(postUrl, returnValue, propsValue).then((response) => {
        if (response && response.status === 200) {
          this.getStockVerificationList();
          Swal.fire({
            position: "top-end",
            type: "success",
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500,
          });
          this.setState({
            openDialog: false,
          });
        } else {
          this.setState({
            errorContent: response,
          });
        }
        this.setState({
          submitDisable: false,
        });
      });
    }
  };

  validation = () => {
    const {
      fieldValue,
      fieldError,
      selected_user,
      selected_action,
      allocation_detail,
    } = this.state;
    let returnValue = true;
    let error = "";
    let value = "";
    let name = "";
    let minDate = "";
    if (selected_action === "CheckIn") {
      name = "checkIn";
      value = fieldValue["checkIn"];
      minDate = allocation_detail["attendance_checkout"]
        ? allocation_detail["attendance_checkout"]
        : allocation_detail["checkin"];
    } else {
      name = "checkOut";
      value = fieldValue["checkOut"];
      minDate = allocation_detail["attendance_checkin"];
    }
    if (value === null) {
      error = `Please Enter Start Date`;
      returnValue = false;
    } else {
      error = validateDate(value, minDate, new Date(), "time");
    }
    if (!fieldValue["reason"] && selected_action === "CheckOut") {
      returnValue = false;
      fieldError["reason"] = `Please Enter Reason`;
    }
    if (error !== "") {
      returnValue = false;
      fieldError[name] = `Date should be within ${selected_action === "CheckIn"
        ? allocation_detail["attendance_checkout"]
          ? "last checked-out"
          : "start date"
        : "last Checked-in"
        } (${dateFormat(minDate, "DD-MM-YYYY hh:mm A")}) To Current time`;
    }
    this.setState({
      fieldValue,
      fieldError,
    });

    if (returnValue) {
      returnValue = { attendance_data: [] };
      let post_data = {
        reason: selected_action === "CheckOut" ? fieldValue["reason"] : "",
        checkin:
          selected_action === "CheckIn"
            ? dateFormat(fieldValue["checkIn"], "YYYY-MM-DD HH:mm:ss")
            : allocation_detail["attendance_checkin"]
              ? dateFormat(
                allocation_detail["attendance_checkin"],
                "YYYY-MM-DD HH:mm:ss"
              )
              : null,
        checkout:
          selected_action === "CheckOut"
            ? dateFormat(fieldValue["checkOut"], "YYYY-MM-DD HH:mm:ss")
            : null,
        roomallocation: allocation_detail["id"],
        student:
          selected_user === "student" ? allocation_detail["student"] : null,
        staff: selected_user === "staff" ? allocation_detail["staff"] : null,
      };
      if (allocation_detail["attendance_id"] && selected_action == "CheckOut") {
        post_data["id"] = allocation_detail["attendance_id"];
      }
      returnValue.attendance_data.push(post_data);
    }
    return returnValue;
  };

  onChangeReason = (e) => {
    const { fieldError, fieldValue } = this.state;
    let { name, value } = e.target;
    fieldValue[name] = value;
    delete fieldError[name];
    this.setState({
      fieldValue,
      fieldError,
    });
  };

  handleKeyDown = (e) => {
    if (e.key === "Enter" && this.state.barcode) {
      this.setState({ tableUpdating: true }, () => {
        this.updateStockVerification();
      });
    }
  };


  updateStockVerification = () => {
    let selectedVerificationFor = this.state.selectedVerificationFor;
    if( !selectedVerificationFor ){
      Swal.fire({
        type: "error",
        title: "Error",
        text: 'Please select Verification For',
      });
      return false
    }
    const url = POST_URL.librarystockverification.api;
    let post_data = {
      data_list:[
        {
          "remarks": "",
          "bar_code": this.state.barcode
        }
      ],
      "stock_verification_parent_id": selectedVerificationFor.id,
      fordate: dateFormat(new Date(), "YYYY-MM-DD"),
    };
    postRequest(url, post_data, {'return_error_message': true}).then((response) => {
      if (response && response.status === 200) {
        this.getStockVerificationList();
      }else{
        this.setState({alertData: response, snackbar: true})
      }
      this.setState({ barcode: '' });
      this.setState({ tableUpdating: false });
      this.searchBarCode.current.focus(); 
    });
  };

  changeToggle = (e, value) => {
    if (value !== this.state.tab_menu) {
      this.setState(
        {
          tab_menu: value,
        },
        () => {
          if (value === 1) {
            this.getStockVerificationList();
          }
        }
      );
    }
  };

  onChangeYear = (e) => {
    let { name, value } = e.target;
    this.setState(
      {
        [name]: value,
        isBlankPage: false,
      },
      () => {
        if (name === "selectedYear") {
          this.getStandardList();
          SetAcademicYear(value);
        }
        this.getStockVerificationList();
      }
    );
  };

  handleDropDownWithSearchChange = (e, newValue) => {
    this.setState({
      selectedVerificationFor: newValue
    }, ()=>{
      this.getStockVerificationList();
    });
  };

  findMissingInSequence = () => {
    const { sequenceStart, sequenceEnd, selectedVerificationFor } = this.state;
    const start = (sequenceStart || "").trim();
    const end = (sequenceEnd || "").trim();
    if (!start || !end) {
      Swal.fire({
        type: "error",
        title: "Error",
        text: "Enter both start and end book numbers (e.g. PU004000 and PU004100).",
      });
      return;
    }
    const params = {
      start_barcode: start,
      end_barcode: end,
    };
    if (selectedVerificationFor && selectedVerificationFor.id) {
      params.stock_verification_parent_id = selectedVerificationFor.id;
    }
    this.setState({ sequenceLoading: true, sequenceResult: null });
    const url = `${GET_URL.librarystockverification.api}missing-sequence/`;
    getRequest(url, params, { return_error: true }).then((response) => {
      if (response && response.status === 200) {
        this.setState({
          sequenceResult: response.data.data,
          sequenceLoading: false,
          sequenceDialogOpen: true,
        });
      } else {
        const d = response && response.data;
        let msg =
          (d && (d.detail || d.message)) ||
          (Array.isArray(d) && d[0]) ||
          "Could not compute missing sequence.";
        if (Array.isArray(msg)) {
          msg = msg.map((x) => (typeof x === "string" ? x : x && String(x))).join(" ");
        }
        this.setState({ sequenceLoading: false });
        Swal.fire({
          type: "error",
          title: "Error",
          text: typeof msg === "string" ? msg : JSON.stringify(msg),
        });
      }
    });
  };

  closeSequenceDialog = () => {
    this.setState({ sequenceDialogOpen: false });
  };

  /** Format start/end for header using same padding as backend when possible */
  formatSequenceRangeLabel = (data) => {
    if (!data) return "";
    const w = data.digit_width || 1;
    const p = data.prefix != null ? String(data.prefix) : "";
    const a = String(data.start_number).padStart(w, "0");
    const b = String(data.end_number).padStart(w, "0");
    return `${p}${a} → ${p}${b}`;
  };

  renderExcelLikeTable = (rows, headerBg, zebraEven) => {
    const list = Array.isArray(rows) ? rows : [];
    return (
      <TableContainer
        component={Paper}
        elevation={0}
        style={{
          maxHeight: "min(52vh, 520px)",
          border: "1px solid #b4b4b4",
          borderRadius: 2,
          overflow: "auto",
        }}
      >
        <Table
          stickyHeader
          size="small"
          padding="checkbox"
          style={{
            fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Consolas, monospace',
            fontSize: 13,
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                align="right"
                style={{
                  width: 56,
                  minWidth: 56,
                  fontWeight: 600,
                  backgroundColor: headerBg,
                  color: "#fff",
                  borderRight: "1px solid rgba(255,255,255,0.25)",
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                }}
              >
                #
              </TableCell>
              <TableCell
                style={{
                  fontWeight: 600,
                  backgroundColor: headerBg,
                  color: "#fff",
                  position: "sticky",
                  top: 0,
                  zIndex: 2,
                }}
              >
                Book number
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  style={{
                    textAlign: "center",
                    color: "#757575",
                    fontStyle: "italic",
                    borderBottom: "none",
                  }}
                >
                  — None —
                </TableCell>
              </TableRow>
            ) : (
              list.map((code, idx) => (
                <TableRow
                  key={`${code}-${idx}`}
                  style={{
                    backgroundColor:
                      idx % 2 === 0 ? (zebraEven || "#ffffff") : "#f2f2f2",
                  }}
                >
                  <TableCell
                    align="right"
                    style={{
                      borderRight: "1px solid #d0d0d0",
                      color: "#333",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {idx + 1}
                  </TableCell>
                  <TableCell style={{ borderLeft: "none" }}>{code}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  downloadMissingSequence = () => {
    const { sequenceResult, sequenceStart, sequenceEnd } = this.state;
    if (!sequenceResult) {
      return;
    }
    const missingList = sequenceResult.missing_in_catalog || [];
    const notVerifiedList = sequenceResult.not_yet_verified || [];
    const rows = [
      "Type,Book Number",
      ...missingList.map((x) => `Missing from catalog,${x}`),
      ...notVerifiedList.map((x) => `Not verified in session,${x}`),
    ];
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const objectUrl = window.URL.createObjectURL(blob);
    link.href = objectUrl;
    link.setAttribute(
      "download",
      `MissingSequence_${(sequenceStart || "").trim()}_${(sequenceEnd || "").trim()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  };

  render() {
    const {
      loading,
      stockVerificationList,
      openDialog,
      fieldValue,
      fieldError,
      errorContent,
      submitDisable,
      selected_action,
      user_name,
      checkinMinDate,
      pagination,
      isBlankPage,
      errors,
      tableUpdating,
      verification_list_columns,
      barcode,
      tab_menu,
      verificationForList,
      selectedVerificationFor,
      stockverificationcount,
      sequenceStart,
      sequenceEnd,
      sequenceResult,
      sequenceLoading,
      sequenceDialogOpen,
    } = this.state;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [5, 10, 25, 50, 100],
      downloadOptions: {
        filename: "Checkin_Checkout_List.csv",
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
          <Paper className={classNames("paper-background")}>
            <Grid container>
              <Grid item md={6} xs={12} className={classNames("header-align")}>
                <Box className="heading">Library Stock Verification</Box>
              </Grid>
              <Grid item md={6} xs={12} className={classNames("header-align", "text-align-end")}>
                <Button
                  variant="outlined"
                  color="primary"
                  component={Link}
                  to={Actions.library_stock_verifiction.create.url}
                >
                  Open Report Screen
                </Button>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item md={9} xs={12} className="mt-20 text-align-center">
                <div className="d-flex align-items-center">
                  <div className="d-flex">
                    <DropDownWithSearch
                        id='select_verification_parent'
                        options={verificationForList}
                        value={selectedVerificationFor}
                        optionValue="name"
                        name="select_verification_parent"
                        label="Verification For"
                        onChange={(e, newValue) =>
                          this.handleDropDownWithSearchChange(
                            e,
                            newValue
                          )
                        }
                    />
                    <TextField
                      autoFocus
                      id="barcode"
                      autoComplete="off"
                      label="Search Barcode Num"
                      name="barcode"
                      variant="outlined"
                      value={barcode}
                      onKeyDown={(e) => this.handleKeyDown(e)}
                      className="width-350px ml-20"
                      inputProps={{ maxLength: 50 }}
                      size="large"
                      onChange={(e) => this.onChange(e)}
                      error={errors?.["barcode"]}
                      helperText={errors?.["barcode"]}
                      ref={this.searchBarCode}
                    />
                  </div>
                  <div className="ml-20">
                    <Button
                      variant="contained"
                      color="primary"
                      className="submit"
                      disabled={submitDisable}
                      onClick={this.updateStockVerification}
                    >
                      Submit
                    </Button>
                  </div>
                </div>
                <Box className="mt-20 width-100">
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Find missing numbers in a range (same prefix; trailing digits define the sequence).
                  </Typography>
                  <div className="d-flex align-items-flex-start flex-wrap">
                    <TextField
                      label="Start book number"
                      name="sequenceStart"
                      variant="outlined"
                      value={sequenceStart}
                      onChange={this.onChange}
                      className="width-350px mr-20 mt-10"
                      size="small"
                      placeholder="e.g. PU004000"
                      inputProps={{ maxLength: 50 }}
                    />
                    <TextField
                      label="End book number"
                      name="sequenceEnd"
                      variant="outlined"
                      value={sequenceEnd}
                      onChange={this.onChange}
                      className="width-350px mr-20 mt-10"
                      size="small"
                      placeholder="e.g. PU004100"
                      inputProps={{ maxLength: 50 }}
                    />
                    <Button
                      variant="outlined"
                      color="primary"
                      className="mt-10"
                      disabled={sequenceLoading}
                      onClick={this.findMissingInSequence}
                    >
                      {sequenceLoading ? (
                        <CircularProgress size={22} />
                      ) : (
                        "Show missing"
                      )}
                    </Button>
                  </div>
                </Box>
              </Grid>
              <Grid
                item
                md={3}
                xs={12}
                className={classNames("header-align", "text-align-end")}
              >
                <ToggleButtonGroup
                  size="small"
                  value={tab_menu}
                  exclusive
                  onChange={this.changeToggle}
                >
                  {/* <ToggleButton key={1} value={1}>
                    Check in/out
                  </ToggleButton> */}
                  {/* <ToggleButton key={2} value={2}>
                    Status List
                  </ToggleButton> */}
                </ToggleButtonGroup>
              </Grid>
            </Grid>
              <>
                {!isBlankPage && (
                  <Grid container className={classNames("header-align mt-20")}>
                    <Grid item md={12} xs={12}>
                        {!selectedVerificationFor ? (
                          <BlankPagewithIcon  data="Please Select Stock Verification For"/>
                        ): (
                          <>
                            <div style={{
                                backgroundColor: "#FBFDFD",
                                border: "1px solid rgba(151, 151, 151, 0.5)",
                                borderRadius: "5px",
                                color: "#464D68 !important",
                                fontSize: "20px",
                                padding: "5px",
                                marginBottom: "5px",
                                display: "inline-block"
                            }}>
                              Total Verified Books : {stockverificationcount}
                            </div>
                            <AllMUIDataTable
                              key="library-stock-verification-table"
                              title={
                                tableUpdating ? (
                                  <CircularProgress className="white-text" />
                                ) : (
                                  ""
                                )
                              }
                              data={stockVerificationList}
                              columns={verification_list_columns}
                              options={options}
                              onTableChange={this.getStockVerificationList}
                              serverSide={true}
                              pagination={pagination}
                              count={stockVerificationList.count}
                              autoFocus={false}
                            />
                          </>
                        )}
                    </Grid>
                  </Grid>
                )}
              </>
          </Paper>
          <Dialog
            open={sequenceDialogOpen}
            onClose={this.closeSequenceDialog}
            fullWidth
            maxWidth={false}
            scroll="paper"
            PaperProps={{
              style: {
                width: "min(96vw, 1280px)",
                minHeight: "78vh",
                maxHeight: "94vh",
                display: "flex",
                flexDirection: "column",
              },
            }}
          >
            <DialogTitle style={{ paddingBottom: 8 }}>
              <Typography variant="h6" component="span">
                Missing sequence report
              </Typography>
              {sequenceResult && (
                <Typography
                  variant="caption"
                  display="block"
                  color="textSecondary"
                  style={{ marginTop: 6 }}
                >
                  Range: {this.formatSequenceRangeLabel(sequenceResult)} · Expected:{" "}
                  {sequenceResult.total_expected} · In catalog: {sequenceResult.found_in_catalog}
                  {typeof sequenceResult.verified_in_this_session === "number" && (
                    <> · Verified this session: {sequenceResult.verified_in_this_session}</>
                  )}
                </Typography>
              )}
            </DialogTitle>
            <DialogContent
              dividers
              style={{
                flex: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                paddingTop: 8,
              }}
            >
              {sequenceResult && (() => {
                const showNotVerified = Array.isArray(sequenceResult.not_yet_verified);
                return (
                <Grid container spacing={2} style={{ flex: 1, minHeight: 0 }}>
                  <Grid
                    item
                    xs={12}
                    md={showNotVerified ? 6 : 12}
                    style={{ display: "flex", flexDirection: "column", minHeight: 0 }}
                  >
                    <Typography
                      variant="subtitle2"
                      style={{ color: "#b71c1c", marginBottom: 8, fontWeight: 600 }}
                    >
                      Missing from catalog (no book record) —{" "}
                      {(sequenceResult.missing_in_catalog || []).length}
                    </Typography>
                    {this.renderExcelLikeTable(
                      sequenceResult.missing_in_catalog,
                      "#217346",
                      "#ffffff"
                    )}
                  </Grid>
                  {showNotVerified && (
                    <Grid item xs={12} md={6} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
                      <Typography
                        variant="subtitle2"
                        style={{ color: "#e65100", marginBottom: 8, fontWeight: 600 }}
                      >
                        In catalog, not verified this session —{" "}
                        {sequenceResult.not_yet_verified.length}
                      </Typography>
                      {this.renderExcelLikeTable(
                        sequenceResult.not_yet_verified,
                        "#4472c4",
                        "#ffffff"
                      )}
                    </Grid>
                  )}
                </Grid>
                );
              })()}
            </DialogContent>
            <Divider />
            <DialogActions style={{ padding: "12px 16px" }}>
              <Button onClick={this.closeSequenceDialog} color="default" variant="outlined">
                Close
              </Button>
              <Button onClick={this.downloadMissingSequence} color="primary" variant="contained">
                Download Excel (CSV)
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog
            open={openDialog}
            className="action-basic-detail-width"
            onClose={this.handleClose}
            aria-labelledby="form-dialog-title"
          >
            <DialogTitle id="form-dialog-title"></DialogTitle>
            <DialogContent className={""}>
              <DialogContentText
                style={{
                  textAlign: "center",
                  fontSize: "20px",
                  fontWeight: "700",
                }}
              >
                {`Enter Details for ${user_name}`}
              </DialogContentText>
              <Box>
                <MuiPickersUtilsProvider utils={DateFnsUtils}>
                  {selected_action === "CheckIn" && (
                    <KeyboardDateTimePicker
                      autoComplete="off"
                      variant="dialog"
                      ampm={true}
                      className="width-100"
                      autoOk
                      inputVariant="outlined"
                      label="Check In"
                      name="checkIn"
                      minDate={checkinMinDate}
                      maxDate={new Date()}
                      format="dd-MM-yyyy hh:mm a"
                      value={fieldValue["checkIn"]}
                      onChange={(e) =>
                        this.handleChangeCheckInOut(e, "checkIn")
                      }
                      KeyboardButtonProps={{
                        "aria-label": "change date",
                      }}
                      inputProps={{ maxLength: 50 }}
                      helperText={
                        !fieldError["checkIn"]
                          ? "Format DD-MM-YYYY"
                          : fieldError["checkIn"]
                      }
                      error={fieldError["checkIn"] ? true : false}
                    />
                  )}
                  {selected_action === "CheckOut" && (
                    <KeyboardDateTimePicker
                      autoComplete="off"
                      variant="dialog"
                      ampm={true}
                      className="width-100"
                      autoOk
                      inputVariant="outlined"
                      label="Check Out"
                      name="checkOut"
                      minDate={checkinMinDate}
                      maxDate={new Date()}
                      format="dd-MM-yyyy hh:mm a"
                      value={fieldValue["checkOut"]}
                      onChange={(e) =>
                        this.handleChangeCheckInOut(e, "checkOut")
                      }
                      KeyboardButtonProps={{
                        "aria-label": "change date",
                      }}
                      inputProps={{ maxLength: 50 }}
                      helperText={
                        !fieldError["checkOut"]
                          ? "Format DD-MM-YYYY"
                          : fieldError["checkOut"]
                      }
                      error={fieldError["checkOut"] ? true : false}
                    />
                  )}
                </MuiPickersUtilsProvider>
              </Box>
              {selected_action === "CheckOut" && (
                <FormControl
                  fullWidth
                  error={
                    fieldError["reason"] &&
                    (fieldError["reason"] ? true : false)
                  }
                >
                  <Box className="leave-pending-staff-label">Reason</Box>
                  <TextareaAutosize
                    aria-label="minimum height"
                    className="check-in-out-text-area-auto-size-reason"
                    value={fieldValue["reason"]}
                    name="reason"
                    onChange={this.onChangeReason}
                    required
                  />
                  {fieldError["reason"] && (
                    <FormHelperText>{fieldError["reason"]}</FormHelperText>
                  )}
                </FormControl>
              )}
              <Box className="error-content flex-justify-center margin-top-10">
                {errorContent}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.handleClose} color="secondary">
                Close
              </Button>
              <Button
                disabled={submitDisable}
                onClick={this.submit}
                color="primary"
              >
                Submit
              </Button>
            </DialogActions>
          </Dialog>
          <Snackbar
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            open={this.state.snackbar}
            autoHideDuration={10000}
            onClose={this.handleCloseSnackBar}
          >
            <Alert onClose={this.handleCloseSnackBar} severity="error">
              {this.state.alertData}
            </Alert>
          </Snackbar>
        </Box>
      );
    }
  }
}
export default withRouter(LibCheckinoutcreate);
