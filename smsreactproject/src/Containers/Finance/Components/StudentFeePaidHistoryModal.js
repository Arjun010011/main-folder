import React, { useRef } from "react";
import { withStyles } from "@material-ui/core/styles";
import { makeStyles } from "@material-ui/core/styles";
import {
  CircularProgress,
  TableRow,
  TableCell,
  Table,
  TableHead,
  Box,
  Dialog,
  Tooltip,
  Button,
} from "@material-ui/core";
import MuiDialogTitle from "@material-ui/core/DialogTitle";
import MuiDialogContent from "@material-ui/core/DialogContent";
import AllMUIDataTable from "Components/AllMUIDataTable";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";
import WarningIcon from "@material-ui/icons/Warning";
import {
  numberWithCommas,
  dateFormat,
  getNameOfMultiplePayment,
  isUserHasPermission,
} from "Includes/functions";
import { GET_URL } from "Includes/urls";
import { getRequest } from "Includes/api/apicall";
import { nameAndNumberAndHyphenRegex } from "Constants/regularExpression";
import AppBar from "@material-ui/core/AppBar";
import LoadingGif from "Components/LoadingGif";
import Toolbar from "@material-ui/core/Toolbar";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";

const useStyles = makeStyles((theme) => ({
  appBar: {
    position: "relative",
    backgroundColor: "#4680FF",
  },
  title: {
    flex: 1,
  },
}));

const fieldDetails = [
  {
    label: "Reason Name",
    regex: nameAndNumberAndHyphenRegex,
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

const styles = (theme) => ({
  root: {
    margin: 0,
    padding: theme.spacing(2),
  },
  closeButton: {
    position: "absolute",
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
});

const DialogTitle = withStyles(styles)((props) => {
  const { children, classes, onClose, ...other } = props;
  return (
    <MuiDialogTitle disableTypography className={classes.root} {...other}>
      <Typography variant="h6">{children}</Typography>
      {onClose ? (
        <IconButton
          aria-label="close"
          className={classes.closeButton}
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      ) : null}
    </MuiDialogTitle>
  );
});

const DialogContent = withStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
}))(MuiDialogContent);

export default function StudentFeePaidHistoryModal(props) {
  const classes = useStyles();
  const [open, setOpen] = React.useState(true);
  const [studentFeeList, setStudentFeeList] = React.useState([]);
  const [paymentDetail, setPaymentDetail] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [totalAmount, setTotalAmount] = React.useState({});
  const [columns, setColumns] = React.useState([]);
  const [options, setOptions] = React.useState({});
  const [yearList, setYearList] = React.useState([]);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [printLoading, setPrintLoading] = React.useState({});

  const printReciept = (id) => {
    let printTemp = { ...printLoading };
    printTemp[id] = true;
    setPrintLoading({...printTemp})
    // this.setState({ printLoading: { ...printTemp } });
    let get_url = GET_URL.feecollection.api + id + "/";
    let prop = {};
    prop.responseType = "blob";
    getRequest(get_url, {}, prop).then((response) => {
      let printTemp = { ...printLoading };
      delete printTemp[id];
      setPrintLoading(printTemp)
      // this.setState({ printLoading: printTemp });
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

  const updateOptions = async (paymentDetailTemp) => {
    await setOptions(() => {});
    const optionsTemp = {
      filterType: "dropdown",
      responsive: "standard",
      filter: false,
      download: false,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [5, 10, 15],
      rowsPerPage: 15,
      selectableRows: "none",
      expandableRowsHeader: "",
      expandableRows: true,
      expandableRowsOnClick: true,
      rowsExpanded: studentFeeList.map((el, i) => {
        return i;
      }),
      renderExpandableRow: (rowData, rowMeta) => {
        let planId = rowData[0];
        const studentDetail =
          paymentDetailTemp[
            `${planId}${selectedYear.academic_year}${props.student_id}`
          ];
        let slno = 1;
        if (Boolean(studentDetail) && studentDetail.length > 0) {
          return (
            <TableRow>
              <TableCell colSpan={rowData.length} size="small">
                <Table className="payment-history-table">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <FormattedMessage {...commonMessages.slno} />{" "}
                      </TableCell>
                      <TableCell>
                        <FormattedMessage {...commonMessages.receiptNumber} />
                      </TableCell>
                      <TableCell>
                        <FormattedMessage {...commonMessages.transactionDate} />
                      </TableCell>
                      <TableCell>
                        <FormattedMessage {...commonMessages.amountPaid} />{" "}
                      </TableCell>
                      <TableCell> Collected By </TableCell>
                      <TableCell> Mode Of Payment - Ref No </TableCell>
                      <TableCell className="text-align-center">
                        <FormattedMessage {...commonMessages.actions} />{" "}
                      </TableCell>
                      {/* <TableCell className="text-align-center"> <FormattedMessage {...commonMessages.actions} /> </TableCell> */}
                    </TableRow>
                    {studentDetail.map((data, key) => {
                      return (
                        <TableRow key={key}>
                          <TableCell>{slno++}</TableCell>
                          <TableCell>
                            {data["fee_collection__receipt_num"]}
                          </TableCell>
                          <TableCell>
                            <div className="d-flex">
                              <div>
                                {dateFormat(
                                  data["transaction_date"],
                                  "DD-MM-YYYY"
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {numberWithCommas(data["amount_paid"])}
                          </TableCell>
                          <TableCell>
                            {data["collected_user_full_name"]}
                          </TableCell>
                          <TableCell>
                            {getNameOfMultiplePayment(
                              data["mode_of_payment_list"]
                            )}
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
                                      onClick={() =>  printReciept(data["fee_collection"])}
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
                                      this.handleCancel(data, key, rowData[12])
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
      },
    };
    setOptions(() => optionsTemp);
  };

  React.useEffect(() => {
    updateOptions(paymentDetail);
  }, [studentFeeList, paymentDetail]);

  const handleClose = () => {
    props.closeInParent();
  };

  const getFeeDetails = () => {
    let params = {
      academic_year: props.yearId,
      standard: props.current_standard,
      student: props.studentId,
    };
    getRequest(GET_URL.feeplan.api, params, props).then((response) => {
      if (response && response.status === 200) {
        let feePlan = response.data.data.plans;
        let paymentDetail = {};
        let paymentTempList = [];
        if (feePlan) {
          feePlan.map((data) => {
            let totalPaidAmount = 0;
            paymentTempList = [];
            data["standard_fee"].map((termData) => {
              termData["amount_paid"] = termData["pending_amount"];
              termData["adjustment_list_temp"] = termData["adjustment_list"];
              termData["is_checked"] = false;
              if (termData["paid_amount"]) {
                totalPaidAmount += termData["paid_amount"];
              }
              paymentTempList = [
                ...paymentTempList,
                ...(Array.isArray(termData.payment_detail) ? termData.payment_detail : []),
              ];
            });
            data["total_paid_amount"] = totalPaidAmount;
            data["status"] =
              data["pending_amount"] > 0 ? "Pending" : "Fully Paid";
            paymentDetail[
              `${data["id"]}${selectedYear.academic_year}${props.student_id}`
            ] = paymentTempList;
          });
        }
        setPaymentDetail(() => paymentDetail);
        setStudentFeeList(() => response.data.data.plans);
        let temp_totalAmount = { ...totalAmount };
        temp_totalAmount["pending"] = selectedYear.pending_amount;
        setTotalAmount(() => temp_totalAmount);
        setLoading(() => false);
      }
    });
  };

  React.useEffect(() => {
    getFeeDetails();
    const columns = [
      {
        label: "id",
        name: "id",
        options: {
          filter: false,
          sort: false,
          display: false,
          viewColumns: false,
        },
      },
      {
        label: "Fee Type",
        name: "fee_type_name",
        options: {
          filter: false,
          sort: true,
        },
      },
      {
        label: "Status",
        name: "status",
        options: {
          filter: false,
          sort: true,
          customBodyRender: (value, tableMeta, updateValue) => {
            return (
              <div>
                {value === "Fully Paid" ? (
                  <div className="text-green text-bold">{value} </div>
                ) : (
                  <div className="text-red text-bold">{value} </div>
                )}
              </div>
            );
          },
        },
      },
      {
        name: "total_amount",
        label: "Total Amount",
        options: {
          filter: false,
          sort: true,
          customBodyRender: (value, tableMeta, updateValue) => {
            return <div>{numberWithCommas(value)}</div>;
          },
        },
      },
      {
        name: "adjustment_amount",
        label: "Discount Amount",
        options: {
          filter: false,
          sort: true,
          customBodyRender: (value, tableMeta, updateValue) => {
            return <div>{numberWithCommas(value)}</div>;
          },
        },
      },
      {
        name: "total_paid_amount",
        label: "Paid Amount",
        options: {
          filter: false,
          sort: true,
          customBodyRender: (value, tableMeta, updateValue) => {
            return <div>{numberWithCommas(value)}</div>;
          },
        },
      },
      {
        name: "pending_amount",
        label: "Pending Amount",
        options: {
          filter: false,
          sort: true,
          customBodyRender: (value, tableMeta, updateValue) => {
            return <div>{numberWithCommas(value)}</div>;
          },
        },
      },
    ];
    setColumns(() => columns);
  }, []);

  return (
    <div>
      <Dialog
        fullScreen
        onClose={handleClose}
        aria-labelledby="customized-dialog-title"
        open={open}
      >
        <AppBar className={classes.appBar}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => handleClose("close")}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
            <Typography variant="h6" className={classes.title}>
              Student Fee History
            </Typography>
          </Toolbar>
        </AppBar>
        <DialogContent>
          <div className="mt-30">
            {loading ? (
              <LoadingGif />
            ) : (
              <>
                <div className="mt-30">
                  <AllMUIDataTable
                    key={studentFeeList}
                    data={studentFeeList}
                    columns={columns}
                    options={options}
                    highlighRow={true}
                  />
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
