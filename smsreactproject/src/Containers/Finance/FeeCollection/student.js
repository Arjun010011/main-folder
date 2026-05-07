import React, { Component, Fragment } from "react";
import { withRouter } from "react-router-dom";
import {
  CircularProgress,
  Box,
  Button,
  Tooltip,
  Dialog,
} from "@material-ui/core";
import CheckCircleOutlinedIcon from "@material-ui/icons/CheckCircleOutlined";
import { MuiPickersUtilsProvider, DatePicker } from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import moment from "moment";
import {
  numberWithCommas,
  dateFormat,
  getFormatMessage,
  getFullName,
  isUserHasPermission,
  getNameOfMultiplePayment,
  getAdmissionHistory,
} from "Includes/functions";
import TableRow from "@material-ui/core/TableRow";
import TableCell from "@material-ui/core/TableCell";
import Table from "@material-ui/core/Table";
import TableHead from "@material-ui/core/TableHead";
import { getRequest, deleteRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, DEL_URL, PUT_URL } from "Includes/urls";
import ReceiptIcon from "@material-ui/icons/Receipt";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";
import CloseIcon from "@material-ui/icons/Close";
import Slide from "@material-ui/core/Slide";
import WarningIcon from "@material-ui/icons/Warning";
import { cloneDeep } from "lodash";
import Swal from "sweetalert2";
import { debounceSearchRender } from "mui-datatables";
import EditIcon from "@material-ui/icons/Edit";

import AllMUIDataTable from "Components/AllMUIDataTable";
import { DATATABLEROWSPERPAGEOPT } from "Constants";
import { Actions } from "Constants/permissions";
import "../styles.scss";
import InvoiceSelection from "Containers/Invoices/FinancePaymentInvoiceSelection";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import messages from "../messages";
import FeeCancelReason from "./FeeCancelReason";
import FeeTransactionModify from "./FeeTransactionModify";
import FeeAdjustmentApproval from "./FeeAdjustmentApproval";
import StudentProfileCard from "Components/StudentProfileCard";
import { Dropdown } from "Components/DropDown";
import {
  isFormDefinitionEnabled,
} from "Includes/CheckFormDefinition";

const invoiceSelectionModule = "fee_collection";

let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});
class StudentDataTable extends Component {
  state = {
    tableData: this.props.data,
    dataReady: false,
    tableUpdating: true,
    showInvoicePopUp: false,
    open: true,
    paymentDetail: {},
    paymentLoader: true,
    openedExpandRow: {},
    reasonOpen: false,
    errors: {},
    reason: "",
    transactionDate: "",
    transError: "",
    delError: "",
    printLoading: {},
    adjustmentApprovalEnabled: false,
    parentIds: [],
    itemList: [],
    columnHeader: {},
    selected_group: "",
    is_rte_fee_enabled:isFormDefinitionEnabled(
      "fee_configurations",
      "is_rte_fee_enabled",
      1
    ),
    schoolCode: user ? user.institute_details.code : "",
  };
  columns = [
    {
      label: <FormattedMessage {...commonMessages.studentName} />,
      name: "name",
      options: {
        filter: false,
        sort: true,
        customBodyRender: (value, tableMeta, updateValue) => {
          return (
            <StudentProfileCard
              student_name={getFullName(
                tableMeta.tableData[tableMeta.rowIndex]["first_name"],
                tableMeta.tableData[tableMeta.rowIndex]["middle_name"],
                tableMeta.tableData[tableMeta.rowIndex]["last_name"]
              )}
              section_name={tableMeta.rowData[26]}
              id={tableMeta.tableData[tableMeta.rowIndex]["id"]}
              isApiCall={true}
            />
          );
        },
      },
    },
    {
      name: "parent_name",
      label: "Parent Name",
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value, tableMeta, updateValue) => {
          let father_name = "[F]";
          let mother_name = "[M]";
          let guard_name = "[G]";
          return (
            <Tooltip
              title={
                value.includes(mother_name)
                  ? "Mother Name"
                  : value.includes(guard_name)
                  ? "Guardian Name"
                  : value.includes(father_name)
                  ? "Father Name"
                  : ""
              }
              enterDelay={400}
              enterNextDelay={400}
              placement="top-start"
              classes={{ tooltip: "tooltip-show-data" }}
            >
              <Box>{value}</Box>
            </Tooltip>
          );
        },
      },
    },
    {
      name: "admission_num",
      label: "Admission No.",
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value, tableMeta, updateValue) => {
          return <div>{getAdmissionHistory(value, tableMeta.rowData[24])}</div>;
        },
      },
    },
    {
      name: "student_group_name",
      label: "Student Group Name",
      options: {
        filter: false,
        sort: false,
        display: (this.state.schoolCode === "vgoei") ? true : false,
        customBodyRender: (value) => {
          return value;
        },
      },
    },
    {
      name: "total_amount",
      label: <FormattedMessage {...commonMessages.totalAmount} />,
      options: {
        filter: false,
        sort: false,
        download: true,
        customBodyRender: (value, tableMeta) => {
          return (
            <Box>
              {tableMeta.rowData[14] ? (
                <Box>
                  {`${numberWithCommas(value)} + ${numberWithCommas(
                    tableMeta.rowData[14]
                  )} (Fine)`}
                </Box>
              ) : (
                numberWithCommas(value)
              )}
            </Box>
          );
        },
      },
    },
    {
      name: "paid_amount",
      label: <FormattedMessage {...commonMessages.amountPaid} />,
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value, tableMeta) => {
          return <Box>{numberWithCommas(value)}</Box>;
        },
      },
    },
    {
      name: "total_discount_amount",
      label: <FormattedMessage {...commonMessages.discount} />,
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value, tableMeta) => {
          return (
            <Box>
              {tableMeta.rowData[8] ? (
                <Tooltip
                  enterDelay={100}
                  enterNextDelay={200}
                  title={this.showDiscountSummary(
                    tableMeta.rowData[8],
                    tableMeta.rowData[23]
                  )}
                  placement="bottom-start"
                  arrow={true}
                  classes={{
                    tooltip: "tooltip-show-data",
                  }}
                >
                  <div>
                    {numberWithCommas(
                      tableMeta.rowData[8] + tableMeta.rowData[23]
                    )}
                  </div>
                </Tooltip>
              ) : (
                numberWithCommas(value)
              )}
            </Box>
          );
        },
      },
    },
    {
      name: "pending_amount",
      label: <FormattedMessage {...messages.pendingAmount} />,
      options: {
        filter: false,
        sort: false,
        customBodyRender: (value, tableMeta) => {
          let reason = tableMeta["tableData"][tableMeta["rowIndex"]]["reason"];
          if (Object.keys(reason).length > 0) {
            return (
              <Tooltip
                enterDelay={100}
                enterNextDelay={200}
                title={Object.values(reason)}
                placement="bottom-start"
                arrow={true}
                classes={{
                  tooltip: "tooltip-show-data",
                }}
              >
                <WarningIcon style={{ color: "#f6c342" }} />
              </Tooltip>
            );
          } else {
            return <Box>{numberWithCommas(value)}</Box>;
          }
        },
      },
    },
    {
      name: "concession_amount",
      label: <FormattedMessage {...commonMessages.concessionAmount} />,
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
      },
    },
    {
      name: "standard_fee_amount",
      label: <FormattedMessage {...messages.standardAmount} />,
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
        download: false,
      },
    },
    {
      name: "first_name",
      label: "First Name",
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
        download: false,
      },
    },
    {
      name: "middle_name",
      label: "Middle Name",
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
        download: false,
      },
    },
    {
      name: "last_name",
      label: "Last Name",
      options: {
        filter: false,
        sort: false,
        display: false,
        download: false,
        viewColumns: false,
      },
    },
    {
      name: "id",
      label: "Id",
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
        download: false,
      },
    },
    {
      name: "total_fine_amount",
      label: "Id",
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
        download: false,
      },
    },
    {
      name: "total_amount",
      label: "Id",
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
        download: false,
      },
    },
    {
      name: "is_new_student",
      label: "is_new_student",
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
        download: false,
      },
    },
    {
      name: "current_standard",
      label: "current_standard",
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
        download: false,
      },
    },
    {
      name: "fee_collection_standard",
      label: "fee_collection_standard",
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
        download: false,
      },
    },
    {
      name: "adjustment_in_pending_block_fee_collection",
      label: "adjustment_in_pending_block_fee_collection",
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
        download: false,
      },
    },
    {
      name: "adjustment_in_pending_block_fee_collection_error",
      label: "adjustment_in_pending_block_fee_collection_error",
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
        download: false,
      },
    },
    {
      name: "is_has_approval_permission_on_adj",
      label: "is_has_approval_permission_on_adj",
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
        download: false,
      },
    },
    {
      name: "adjustment_unapproved_parent_ids",
      label: "adjustment_unapproved_parent_ids",
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
        download: false,
      },
    },
    {
      name: "total_adjusted_amount",
      label: <FormattedMessage {...commonMessages.concessionAmount} />,
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
      },
    },
    {
      name: "admission_history",
      label: <FormattedMessage {...commonMessages.concessionAmount} />,
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
      },
    },
    {
      name: "student_group_name",
      label: <FormattedMessage {...commonMessages.concessionAmount} />,
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
      },
    },
    {
      name: "section_name",
      label: '',
      options: {
        filter: false,
        sort: false,
        display: false,
        viewColumns: false,
      },
    },
    {
      name: "Action",
      label: <FormattedMessage {...commonMessages.actions} />,
      options: {
        filter: false,
        sort: false,
        setCellProps: () => ({
          style: {
            whiteSpace: "nowrap",
            position: "sticky",
            right: "0",
            background: "white",
            zIndex: 100,
          },
        }),

        setCellHeaderProps: () => ({
          style: {
            whiteSpace: "nowrap",
            position: "sticky",
            right: 0,
            zIndex: 1001,
            background: "white",
            height: "40px",
          },
        }),
        empty: true,
        download: false,
        display: this.props.updatePermissions("display"),
        customBodyRender: (value, tableMeta) => {
          let studentDetails = {};
          this.props.data.student_list.map((data) => {
            if (data.id === tableMeta.rowData[13]) {
              studentDetails = data;
            }
          });
          const { yearId, adjustmentEnabled } = this.props;
          let id = studentDetails.id;
          let isAdjustmentRequested = tableMeta.rowData[19];
          let isAdjustmentReason = tableMeta.rowData[20];
          // let isAdjustmentReason = "Adjustment Pending For Approval"
          // let isAdjustmentRequested = false
          let isHasApprovalPermission = tableMeta.rowData[21];
          // let isHasApprovalPermission = false;
          let standardId = tableMeta.rowData[18];
          let adjustmentParentIds = tableMeta.rowData[22];
          return (
            <Box
              className="flex-justify-center-flex-prop"
              width="100%"
              whiteSpace="nowrap"
            >
              {!this.state.is_rte_fee_enabled && tableMeta.rowData[25] === "RTE" && !tableMeta.rowData[7]? (
                <>
                  <Button
                    size="small"
                    className="custom-button width-100-perc fs-12"
                    variant="outlined"
                  >
                    RTE Student
                  </Button>
                </>
              ) : (
                <>
                  {adjustmentEnabled && isAdjustmentRequested ? (
                    isHasApprovalPermission ? (
                      <Button
                        size="small"
                        className={"collect-fees"}
                        onClick={(e) =>
                          this.adjustmentApproval(e, adjustmentParentIds)
                        }
                      >
                        Approve Concession
                      </Button>
                    ) : (
                      // <div className="d-flex flex-justify-center-flex-prop ">
                      //   <Tooltip title={'Concession Approval'} enterDelay={400}
                      //     enterNextDelay={400} placement='top-start'
                      //     classes={{ tooltip: 'tooltip-show-data' }}>
                      //     <Button
                      //       className='custom-button-approval'
                      //       onClick={(e) => this.adjustmentApproval(e, adjustmentParentIds)}>
                      //       Concession Approve
                      //     </Button>
                      //   </Tooltip>
                      // </div>
                      <div className="text-red">{isAdjustmentReason}</div>
                    )
                  ) : (
                    <>
                      {this.props.data.approved_std_id.includes(standardId) &&
                        !studentDetails.is_paid_full_fee &&
                        ((Actions.fee_adjustment.create.url &&
                          adjustmentEnabled &&
                          !this.props.hideSetAdjustmentButton) ||
                          (Actions.fee_collection.create.url &&
                            !adjustmentEnabled)) && (
                          <Button
                            size="small"
                            className={"collect-fees width-100-perc"}
                            onClick={() => {
                              this.pushToFeesCollection(yearId, standardId, id);
                            }}
                          >
                            {adjustmentEnabled
                              ? "Set Adjustment"
                              : "Collect Fees"}
                          </Button>
                        )}

                      {studentDetails.is_paid_full_fee &&
                        tableMeta.rowData[4] > 0 && (
                          <Button
                            size="small"
                            className="approved-button"
                            variant="outlined"
                            onClick={() => {
                              this.pushToFeesCollection(yearId, standardId, id);
                            }}
                          >
                            Fees collected
                            <CheckCircleOutlinedIcon />
                          </Button>
                        )}
                      {studentDetails.is_paid_full_fee &&
                        tableMeta.rowData[4] === 0 && (
                          <Button
                            size="small"
                            className="custom-button fs-12"
                            variant="outlined"
                            onClick={() => {
                              this.pushToFeesCollection(yearId, standardId, id);
                            }}
                          >
                            {tableMeta.rowData[15] === 0
                              ? "Fees Not Yet Planned"
                              : "No Fees"}
                          </Button>
                        )}
                      <Box pl={2}></Box>
                    </>
                  )}
                </>
              )}
            </Box>
          );
        },
        customHeadRender: (columnMeta, updateDirection) => (
          <th className="mui-table-custom-header-center-align">
            {columnMeta.label}
          </th>
        ),
      },
    },
  ];

  adjustmentApproval = (e, parentIds) => {
    e.stopPropagation();
    this.setState({
      adjustmentApprovalEnabled: true,
      parentIds: parentIds,
    });
  };

  showDiscountSummary = (concession, adjustment) => {
    return (
      <table>
        <tr>
          <td>Concession Amount</td>
          <td>{numberWithCommas(concession)}</td>
        </tr>
        <tr>
          <td>Adjustment Amount</td>
          <td>{numberWithCommas(adjustment)}</td>
        </tr>
      </table>
    );
  };

  // componentDidMount = () => {
  //   const { adjustmentEnabled } = this.props;
  //   const pagination_types = JSON.parse(
  //     localStorage.getItem("pagination_types")
  //   )  
  //     ? JSON.parse(localStorage.getItem("pagination_types"))
  //     : {};
  //   if (adjustmentEnabled && pagination_types["fee_adjustment"]) {
  //     this.columns = pagination_types["fee_adjustment"]["columns"];
  //   } else if (pagination_types["fee_collection"]) {
  //     let newColumns=[...this.columns]
  //     pagination_types["fee_collection"]["columns"].map((newData)=>{
  //       newColumns.map((data)=>{
  //         if(newData["name"]===data["name"]){
  //           data["options"]["display"]=newData["display"]
  //         }
  //       })
  //     })
  //     this.columns = cloneDeep(newColumns)
  //   }
  // };

  changePage = (tableState, action) => {
    const { adjustmentEnabled } = this.props;
    if (action === "viewColumnsChange") {
      // const pagination_types = JSON.parse(
      //   localStorage.getItem("pagination_types")
      // )
      //   ? JSON.parse(localStorage.getItem("pagination_types"))
      //   : {};
      // this.currentPagination = { ...tableState };
      // let temp = {};
      // if (adjustmentEnabled) {
      //   temp = { fee_adjustment: this.currentPagination };
      // } else {
      //   temp = { fee_collection: this.currentPagination };
      // }
      // let temp_new = { ...pagination_types, ...temp };
      // localStorage.setItem("pagination_types", JSON.stringify(temp_new));
    } else {
      // this.setState({ tableUpdating: true }, () => {
      this.props.getFinanceStudentList(tableState, action);
    }
    // });
  };

  pushToFeesCollection = (yearId, standardId, id) => {
    const { quickpay, adjustmentEnabled } = this.props;
    let searchState = {
      yearid: yearId,
      standardid: standardId,
      studentid: id,
      quickpay: quickpay,
    };
    let searchParam = "?" + new URLSearchParams(searchState).toString();
    let url = adjustmentEnabled
      ? Actions.fee_adjustment.create.url
      : Actions.fee_collection.create.url;
    this.props.history.push({
      pathname: url,
      search: searchParam,
    });
  };

  static getDerivedStateFromProps(props) {
    let tempData = props.data;
    if (tempData["student_list"]) {
      tempData["student_list"].map((data) => {
        data["local_name"] = getFullName(
          data["first_name"],
          data["middle_name"],
          data["last_name"]
        );
      });
    }
    return {
      tableData: tempData,
      tableUpdating: false,
    };
  }

  handleSearchChange = (e) => {
    let payment_end_date = moment(e).format("YYYY-MM-DD");
    let paymentDateError = "";
    this.setState({
      payment_end_date,
      paymentDateError,
    });
    let pagination = { ...this.props.pagination };
    pagination["custom"] = {
      payment_end_date,
    };
    this.props.getFinanceStudentList(pagination, "custom");
  };
  getDatePicker = () => {
    const { selected_group } = this.state;
    const { groupList } = this.props;
    let payment_end_date = new Date();
    if (
      this.props.pagination.custom &&
      this.props.pagination.custom.payment_end_date
    ) {
      payment_end_date = this.props.pagination.custom.payment_end_date;
    } else {
      payment_end_date = this.state.pagination;
    }
    const maxDate = this.props.maxDate ? this.props.maxDate : null;
    return (
      <Fragment>
        {groupList.length > 0 && (
          <Dropdown
            className="filter-dropdown"
            data={groupList}
            name="selected_group"
            value={selected_group}
            onChange={this.onChange}
            label="Student Group"
            size="small"
          />
        )}
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <DatePicker
            autoOk
            openTo="year"
            className="payment-date-filter"
            format="dd/MM/yyyy"
            label="Payment end date"
            maxDate={maxDate ? maxDate : undefined}
            variant="inline"
            views={["date"]}
            value={payment_end_date ? payment_end_date : new Date()}
            onChange={this.handleSearchChange}
          />
        </MuiPickersUtilsProvider>
      </Fragment>
    );
  };

  onChange = (e) => {
    let { name, value } = e.target;
    let pagination = { ...this.props.pagination };
    if (value) {
      pagination["student_group"] = value;
      this.setState(
        {
          [name]: value,
        },
        () => {
          this.props.getFinanceStudentList(pagination, "custom");
        }
      );
    } else {
      let pagination = { ...this.props.pagination };
      pagination["custom"] = {};
      pagination["student_group"] = "";
      this.props.getFinanceStudentList(pagination, "custom");
    }
  };

  onFilterChangeHandler = (type) => {
    if (type === "reset") {
      let pagination = { ...this.props.pagination };
      pagination["custom"] = {};
      pagination["student_group"] = "";
      this.setState({ selected_group: "" });
      this.props.getFinanceStudentList(pagination, "custom");
    }
  };

  printReciept = (id) => {
    let { printLoading } = this.state;
    let printTemp = { ...printLoading };
    printTemp[id] = true;
    this.setState({ printLoading: { ...printTemp } });
    let get_url = GET_URL.feecollection.api + id + "/";
    let prop = {};
    prop.responseType = "blob";
    getRequest(get_url, {}, prop).then((response) => {
      let printTemp = { ...printLoading };
      delete printTemp[id];
      this.setState({ printLoading: printTemp });
      if (response && response.status === 200) {
        let Data = new Blob([response.data], { type: "application/pdf" });
        let fileURL = URL.createObjectURL(Data);
        const height = (window.screen.height * 90) / 100;
        const width = (window.screen.width * 80) / 100;
        const mywindow = window.open(
          fileURL,
          "PRINT",
          "height=" + height + ",width=" + width + ""
        );
        mywindow.print();
        mywindow.onafterprint = mywindow.close;
      }
    });
    // const url = GET_URL.payment.api + id + '/'
    // getRequest(url, {}, this.props).then((response) => {
    //   let data = response.data.data;
    //   let invoiceComponent = <InvoiceSelection invoiceData={data} invoiceSelect={invoiceSelectionModule} />
    //   this.setState({
    //     open: true,
    //     showInvoicePopUp: true,
    //     loadComponent: invoiceComponent,
    //   })
    // });
  };

  handleClose = () => {
    this.setState({
      open: false,
    });
  };

  customExpandButton = (props) => {
    if (!props.dataIndex && props.dataIndex !== 0)
      return <div style={{ width: "24px" }} />;
    return (
      <Button
        size="small"
        className="custom-expand-button"
        variant="outlined"
        {...props}
      >
        {" "}
        Receipts
      </Button>
    );
  };

  handleCancel = (data, index, studentId) => {
    const fee_config = JSON.parse(localStorage.getItem("fee_configurations"))
      ? JSON.parse(localStorage.getItem("fee_configurations"))
      : {};
    if (fee_config?.valid_days_to_delete_fees) {
      var today_date = new Date();
      var today = dateFormat(today_date, "YYYY-MM-DD");
      var lastDate = dateFormat(
        new Date(
          today_date.getTime() -
            fee_config?.valid_days_to_delete_fees * 24 * 60 * 60 * 1000
        ),
        "YYYY-MM-DD"
      );
      let transactionDate = dateFormat(data.transaction_date, "YYYY-MM-DD");
      if (moment(transactionDate).isBetween(lastDate, today, null, "[]")) {
        this.setState({
          reasonOpen: true,
          deletedId: data.id,
          deletedIndex: index,
          studentId,
        });
      } else {
        Swal.fire({
          type: "info",
          title: `Transaction cannot be canceled since it was made ${fee_config?.valid_days_to_delete_fees} days ago`,
          showConfirmButton: true,
        });
      }
    } else {
      this.setState({
        reasonOpen: true,
        deletedId: data.id,
        deletedIndex: index,
        studentId,
      });
    }
  };

  deleteReciept = (reason) => {
    this.setState({ tableUpdating: true });
    let { paymentDetail, deletedIndex, deletedId, studentId } = this.state;
    let { yearId } = this.props;
    const url = DEL_URL.feecollection.api + deletedId + "/";
    let post_data = { data: { reason: reason } };
    let props = { ...this.props };
    props["return_error_message"] = true;
    deleteRequest(url, post_data, props, true).then((response) => {
      if (response && response.status === 200) {
        let pagination = { ...this.props.pagination };
        paymentDetail[`${yearId}${studentId}`].splice(deletedIndex, 1);
        this.setState({ paymentDetail });
        pagination["custom"] = {};
        this.props.getFinanceStudentList(pagination, "custom");
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        this.setState({
          reasonOpen: false,
          reason: "",
          deletedId: "",
          deletedIndex: "",
        });
      } else {
        this.setState({
          delError: response,
        });
      }
    });
    this.setState({ tableUpdating: false });
  };

  handleReasonClose = () => {
    this.setState({
      reasonOpen: false,
      deletedId: "",
      deletedIndex: "",
      reason: "",
    });
  };

  handleTextChange = (e) => {
    this.setState({
      searchText: e.target.value,
    });
  };

  handleEditTransactionDate = (data, index, studentId) => {
    this.setState({
      transError: "",
      isTransactionDialog: true,
      transId: data["id"],
      transactionDate: data["transaction_date"],
      studentId,
      deletedIndex: index,
    });
  };

  handleTransactionClose = () => {
    this.setState({
      isTransactionDialog: false,
      transId: "",
      deletedIndex: "",
      reason: "",
    });
  };

  updateTransaction = (transaction_date) => {
    this.setState({ tableUpdating: true });
    let { paymentDetail, deletedIndex, studentId, transId } = this.state;
    const { yearId } = this.props;
    const url = PUT_URL.feecollection.api + transId + "/";
    let post_data = {
      data: { transaction_date: dateFormat(transaction_date, "YYYY-MM-DD") },
    };
    let props = { ...this.props };
    props["return_error_message"] = true;
    putRequest(url, post_data, props, true).then((response) => {
      if (response && response.status === 200) {
        let pagination = { ...this.props.pagination };
        paymentDetail[`${yearId}${studentId}`][deletedIndex][
          "transaction_date"
        ] = transaction_date;
        this.setState({ paymentDetail });
        pagination["custom"] = {};
        this.props.getFinanceStudentList(pagination, "custom");
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        this.setState({
          isTransactionDialog: false,
          transId: "",
          deletedIndex: "",
        });
      } else {
        this.setState({
          transError: response,
        });
      }
    });
    this.setState({ tableUpdating: false });
  };

  handleCloseAdjustmentDetail = () => {
    this.setState({
      adjustmentApprovalEnabled: false,
    });
  };

  handleCloseApproval = (isUpdateRequired) => {
    if (isUpdateRequired) {
      let pagination = { ...this.props.pagination };
      pagination["custom"] = {};
      this.props.getFinanceStudentList(pagination, "custom");
    }
    this.handleCloseAdjustmentDetail();
  };

  comapreBy = (key, val) => {
    return (a, b) => {
      if (val === 1) {
        if (a[key] < b[key]) return -1;
        if (a[key] > b[key]) return 1;
      } else {
        if (a[key] < b[key]) return 1;
        if (a[key] > b[key]) return -1;
      }
      return 0;
    };
  };

  requestSort = (key) => {
    let columnCopy = { ...this.state.columnHeader };
    if (columnCopy[key]) {
      if (columnCopy[key] === 1) {
        columnCopy[key] = 2;
      } else {
        columnCopy[key] = 1;
      }
    } else {
      columnCopy[key] = 1;
    }
    let customerListCopy = [...this.state.itemList];
    customerListCopy.sort(this.comapreBy(key, columnCopy[key]));
    this.setState({
      columnHeader: { ...columnCopy },
      itemList: [...customerListCopy],
    });
  };

  render() {
    const {
      tableData,
      showInvoicePopUp,
      open,
      loadComponent,
      reasonOpen,
      delError,
      transError,
      transactionDate,
      isTransactionDialog,
      adjustmentApprovalEnabled,
      parentIds,
    } = this.state;
    const { columns } = this;
    const { pagination, data, adjustmentEnabled } = this.props;
    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "responsive",
      // customSearchRender: debounceSearchRender(200),
      filter: true,
      download: true,
      fixedHeader: true,
      print: false,
      viewColumns: true,
      rowsPerPageOptions: DATATABLEROWSPERPAGEOPT,
      expandableRows: adjustmentEnabled ? false : true,
      expandableRowsOnClick: true,
      customFilterDialogFooter: () => {
        return this.getDatePicker();
      },
      expandableRowsHeader: "",
      onFilterChange: (onFilterChange, filterList, type) => {
        this.onFilterChangeHandler(type);
      },
      onRowExpansionChange: (
        currentRowsExpanded,
        allRowsExpanded,
        rowsExpanded
      ) => {
        const { yearId, standardId } = this.props;
        let { paymentDetail, openedExpandRow } = this.state;
        currentRowsExpanded.map((openedRow) => {
          const data = tableData.student_list[openedRow["index"]];
          if (
            data &&
            "id" in data &&
            !(`${yearId}${data["id"]}` in paymentDetail)
          ) {
            this.setState({ paymentLoader: true });
            const url = GET_URL.payment.api;
            let params = {
              standard: standardId,
              academic_year: yearId,
              student: data["id"],
            };
            getRequest(url, params, this.props).then((response) => {
              paymentDetail[`${yearId}${data["id"]}`] = response.data.data;
              if (openedExpandRow[data["id"]]) {
                delete openedExpandRow[data["id"]];
              } else {
                openedExpandRow[data["id"]] = true;
              }
              this.setState({
                paymentDetail,
                openedExpandRow,
                paymentLoader: false,
              });
              let tempColumns = cloneDeep(this.columns);
              this.columns = [];
              this.columns = cloneDeep(tempColumns);
            });
          }
        });
      },
      renderExpandableRow: (rowData, rowMeta) => {
        const { yearId, standardId } = this.props;
        const { paymentDetail, paymentLoader, printLoading, itemList } =
          this.state;
        const studentDetail = paymentDetail[`${yearId}${rowData[13]}`];
        let slno = 1;
        if (!paymentLoader) {
          if (Boolean(studentDetail) && studentDetail.length > 0) {
            return (
              <TableRow>
                <TableCell colSpan={rowData.length}>
                  <Box fontSize="18px" fontWeight="bold" mb={1}>
                    Payment History
                  </Box>
                  <Table style={{ width: "100%" }}>
                    <TableHead>
                      <TableRow className="feecollection-background-table">
                        <TableCell>
                          <FormattedMessage {...commonMessages.slno} />{" "}
                        </TableCell>
                        <TableCell
                          className="pointer"
                          onClick={() => this.requestSort("receipt_num")}
                        >
                          <FormattedMessage {...commonMessages.receiptNumber} />
                        </TableCell>
                        <TableCell
                          className="pointer"
                          onClick={() => this.requestSort("transaction_date")}
                        >
                          <FormattedMessage
                            {...commonMessages.transactionDate}
                          />
                        </TableCell>
                        <TableCell
                          className="pointer"
                          onClick={() => this.requestSort("total_amount")}
                        >
                          <FormattedMessage {...commonMessages.amountPaid} />
                        </TableCell>
                        <TableCell> Mode Of Payment - Ref No </TableCell>
                        <TableCell> Collected By</TableCell>
                        <TableCell className="text-align-center">
                          <FormattedMessage {...commonMessages.actions} />{" "}
                        </TableCell>
                      </TableRow>
                      {studentDetail.map((data, key) => {
                        return (
                          <TableRow key={key}>
                            <TableCell>{slno++}</TableCell>
                            <TableCell>{data["payment_detail_receipt_num"] ?? data["receipt_num"]}</TableCell>
                            <TableCell>
                              <div className="d-flex align-items-center">
                                <div>
                                  {dateFormat(
                                    data["transaction_date"],
                                    "DD-MM-YYYY"
                                  )}
                                </div>
                                {isUserHasPermission(
                                  "fee_collection",
                                  "update"
                                ) && (
                                  <Tooltip
                                    title={"Edit Transaction Date"}
                                    enterDelay={400}
                                    enterNextDelay={400}
                                    placement="top-start"
                                    classes={{ tooltip: "tooltip-show-data" }}
                                  >
                                    <div
                                      className="pl-10 pointer"
                                      onClick={() =>
                                        this.handleEditTransactionDate(
                                          data,
                                          key,
                                          rowData[13]
                                        )
                                      }
                                    >
                                      <EditIcon />
                                    </div>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {numberWithCommas(data["total_amount"])}
                            </TableCell>
                            <TableCell>
                              {getNameOfMultiplePayment(
                                data["mode_of_payment_list"]
                              )}
                            </TableCell>
                            <TableCell>
                              {data["collected_user_full_name"]}
                            </TableCell>
                            <TableCell className="text-align-center padding-0">
                              <div className="d-flex flex-justify-center-flex-prop ">
                                <Tooltip
                                  title={"Print Reciept"}
                                  enterDelay={400}
                                  enterNextDelay={400}
                                  placement="top-start"
                                  classes={{ tooltip: "tooltip-show-data" }}
                                >
                                  <>
                                    {printLoading[data["id"]] ? (
                                      <div className="d-flex mt-10">
                                        <div>
                                          <CircularProgress className="height-width-25px" />
                                        </div>
                                        <Button className="apply-leave-button height-width-25px opacity-7">
                                          Print
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        className="apply-leave-button height-width-25px"
                                        onClick={() =>
                                          this.printReciept(data["id"])
                                        }
                                      >
                                        Print
                                      </Button>
                                    )}
                                  </>
                                </Tooltip>
                                {isUserHasPermission(
                                  "fee_collection",
                                  "delete"
                                ) && (
                                  <Tooltip
                                    title={"Cancel Transaction"}
                                    enterDelay={400}
                                    enterNextDelay={400}
                                    placement="top-start"
                                    classes={{ tooltip: "tooltip-show-data" }}
                                  >
                                    <Button
                                      className="apply-leave-reset-button height-width-25px"
                                      onClick={(e) =>
                                        this.handleCancel(
                                          data,
                                          key,
                                          rowData[13]
                                        )
                                      }
                                    >
                                      Cancel
                                    </Button>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableHead>
                  </Table>
                </TableCell>
              </TableRow>
            );
          } else {
            return (
              <TableRow>
                <TableCell colSpan={rowData.length}>
                  <Box fontWeight="20px">No Payment History</Box>
                </TableCell>
              </TableRow>
            );
          }
        } else {
          return (
            <TableRow>
              <TableCell colSpan={rowData.length}>
                <Box>
                  {" "}
                  <FormattedMessage {...commonMessages.tableLoading} />{" "}
                </Box>
              </TableCell>
            </TableRow>
          );
        }
      },
      textLabels: {
        body: {
          noMatch:
            this.state.tableUpdating || this.props.loading
              ? "loading.............................................."
              : this.props.tableError
              ? this.props.tableError
              : "Sorry, there is no matching data to display",
        },
      },
      downloadOptions: {
        filename: "feecollection.csv",
        filterOptions: {
          useDisplayedColumnsOnly: true,
          useDisplayedRowsOnly: true,
        },
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
    };

    return (
      <>
        <Box>
          <Box></Box>
          <AllMUIDataTable
            data={data.student_list}
            key={data.student_list}
            title=""
            columns={columns}
            options={options}
            serverSide={true}
            pagination={pagination}
            count={data.count}
            onTableChange={this.changePage}
            onSearch={this.props.onSearch}
            loading={this.props.loading}
            viewColumns={true}
            // CustomExpandButton={this.customExpandButton}
          />
        </Box>
        {showInvoicePopUp && (
          <Dialog
            fullScreen
            open={open}
            onClose={() => this.handleClose("close")}
            TransitionComponent={Transition}
          >
            <AppBar style={{ position: "relative" }}>
              <Toolbar>
                <IconButton
                  edge="start"
                  color="inherit"
                  onClick={() => this.handleClose("close")}
                  aria-label="close"
                >
                  <CloseIcon />
                </IconButton>
                <Typography variant="h6">
                  <FormattedMessage {...commonMessages.invoice} />
                </Typography>
              </Toolbar>
            </AppBar>
            <Box>{loadComponent}</Box>
          </Dialog>
        )}

        {reasonOpen && (
          <FeeCancelReason
            handleReasonClose={this.handleReasonClose}
            deleteReciept={this.deleteReciept}
            delError={delError}
          />
        )}

        {isTransactionDialog && (
          <FeeTransactionModify
            transactionDate={transactionDate}
            updateTransaction={this.updateTransaction}
            handleTransactionClose={this.handleTransactionClose}
            transError={transError}
          />
        )}

        {adjustmentApprovalEnabled && (
          <FeeAdjustmentApproval
            closeInParent={this.handleCloseApproval}
            parentIds={parentIds}
          />
        )}
      </>
    );
  }
}

export default withRouter(StudentDataTable);
