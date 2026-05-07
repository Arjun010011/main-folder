import React, { useEffect, useRef } from "react";
import {
  Button,
  Box,
  Tooltip,
  TableRow,
  TableCell,
  Table,
  TableHead,
  CircularProgress,
} from "@material-ui/core";
import {
  numberWithCommas,
  isUserHasPermission,
  dateFormat,
  getNameOfMultiplePayment,
} from "Includes/functions";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert } from "Includes/functions";
// import './styles.scss';
import EditIcon from "@material-ui/icons/Edit";
import { withRouter } from "react-router-dom";
import moment from "moment";
import Swal from "sweetalert2";

import { nameAndNumberAndHyphenRegex } from "Constants/regularExpression";
import { minDate, reasonType } from "Constants";
import { POST_URL, GET_URL, DEL_URL, PUT_URL } from "Includes/urls";
import {
  getRequest,
  postRequest,
  deleteRequest,
  putRequest,
} from "Includes/api/apicall";
import Skeleton from "@material-ui/lab/Skeleton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import { Actions } from "Constants/permissions";
import CheckCircleOutlinedIcon from "@material-ui/icons/CheckCircleOutlined";
import LoadingGif from "Components/LoadingGif";
import { cloneDeep } from "lodash";
import FeeCancelReason from "Containers/Finance/FeeCollection/FeeCancelReason";
import FeeTransactionModify from "Containers/Finance/FeeCollection/FeeTransactionModify";
import {
  isFormDefinitionEnabled,
} from "Includes/CheckFormDefinition";

function StudentFeeCollection(props) {
  const [alertData, setAlertData] = React.useState("");
  const [snackbar, setSnackbar] = React.useState(false);
  const [studentFeeList, setStudentFeeList] = React.useState([]);
  const [paymentDetail, setPaymentDetail] = React.useState({});
  const [openedExpandRow, setOpenedExpandRow] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [studentDetails, setStudentDetails] = React.useState({});
  const [totalAmount, setTotalAmount] = React.useState({});
  const [columns, setColumns] = React.useState([]);
  const [options, setOptions] = React.useState({});
  const [cancelReasonOpen, setCancelReasonOpen] = React.useState(false);
  const [isTransactionDialog, setIsTransactionDialog] = React.useState(false);
  const [deleteInformation, setDeleteInformation] = React.useState({});
  const [transactionInformation, setTransactionInformation] = React.useState(
    {}
  );
  const [itemList, setItemList] = React.useState([]);
  const [columnHeader, setColumnHeader] = React.useState({});
  const [is_rte_fee_enabled]=React.useState(isFormDefinitionEnabled(
    "fee_configurations",
    "is_rte_fee_enabled",
    1
  ))

  const paymentLoader = useRef(null);
  const printLoading = useRef(null);

  const getStudentDetails = () => {
    const postData = {
      student_ids: [parseInt(props.student_id)],
    };
    postRequest(POST_URL.getfeelistforstudent.api, postData, props).then(
      (response) => {
        if (response && response.status === 200) {
          let temp_totalAmount = { ...totalAmount };
          temp_totalAmount["pending"] = 0;
          if (response.data.data?.[props.student_id]) {
            response.data.data[props.student_id]["student_group_name"] =
              response.data.student_details[props.student_id]?.[
                "student_group_name"
              ]??null;
            for (const data of response.data.data?.[props.student_id]) {
              temp_totalAmount["pending"] += data["pending_amount"]
                ? parseFloat(data["pending_amount"])
                : 0;
            }
          }
          setTotalAmount(() => temp_totalAmount);
          setStudentFeeList(() => response.data.data[props.student_id]);
          setStudentDetails(
            () => response.data.student_details[props.student_id]
          );
        }
        setLoading(() => false);
      }
    );
  };

  React.useEffect(() => {
    updateOptions(paymentDetail);
  }, [studentFeeList, paymentDetail, paymentLoader, itemList]);

  const printReciept = (id) => {
    printLoading.current = { [id]: true };
    let get_url = GET_URL.feecollection.api + id + "/";
    let prop = {};
    prop.responseType = "blob";
    getRequest(get_url, {}, prop).then((response) => {
      delete printLoading.current[id];
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
  };

  const comapreBy = (key, val) => {
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

  const requestSort = (key) => {
    let columnCopy = columnHeader;
    if (columnCopy[key]) {
      if (columnCopy[key] === 1) {
        columnCopy[key] = 2;
      } else {
        columnCopy[key] = 1;
      }
    } else {
      columnCopy[key] = 1;
    }
    let customerListCopy = [...itemList];
    customerListCopy.sort(comapreBy(key, columnCopy[key]));
    setColumnHeader(columnCopy);
    setItemList(customerListCopy);
  };

  const updateOptions = async () => {
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
      renderExpandableRow: (rowData, rowMeta) => {
        let yearId = rowData[0];
        const studentDetail = paymentDetail[`${yearId}${props.student_id}`];
        let slno = 1;
        if (!paymentLoader?.current) {
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
                          onClick={() => requestSort("receipt_num")}
                        >
                          <FormattedMessage {...commonMessages.receiptNumber} />
                        </TableCell>
                        <TableCell
                          className="pointer"
                          onClick={() => requestSort("transaction_date")}
                        >
                          <FormattedMessage
                            {...commonMessages.transactionDate}
                          />
                        </TableCell>
                        <TableCell
                          className="pointer"
                          onClick={() => requestSort("total_amount")}
                        >
                          <FormattedMessage {...commonMessages.amountPaid} />
                        </TableCell>
                        <TableCell className="pointer">
                          <FormattedMessage {...commonMessages.modOfPayment} />
                        </TableCell>
                        <TableCell className="text-align-center">
                          <FormattedMessage {...commonMessages.actions} />
                        </TableCell>
                      </TableRow>
                      {studentDetail.map((data, key) => {
                        return (
                          <TableRow key={key}>
                            <TableCell>{slno++}</TableCell>
                            <TableCell>{data["payment_detail_receipt_num"] ?? data["receipt_num"]}</TableCell>
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
                              {numberWithCommas(data["total_amount"])}
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
                                    {printLoading?.current?.[data["id"]] ? (
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
                                        onClick={() => printReciept(data["id"])}
                                      >
                                        Print
                                      </Button>
                                    )}
                                  </>
                                </Tooltip>
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
                  <FormattedMessage {...commonMessages.tableLoading} />
                </Box>
              </TableCell>
            </TableRow>
          );
        }
      },
      onRowExpansionChange: (currentRowsExpanded) => {
        let openedExpandRowTemp = { ...openedExpandRow };
        let paymentDetailTemp = cloneDeep(paymentDetail);
        currentRowsExpanded.map((openedRow) => {
          const yearId =
            studentFeeList[openedRow["dataIndex"]]["academic_year"];
          const standardId = studentFeeList[openedRow["dataIndex"]]["standard"];
          const data = studentFeeList[openedRow["dataIndex"]];
          if (
            data &&
            "student" in data &&
            !(`${yearId}${data["student"]}` in paymentDetailTemp)
          ) {
            paymentLoader.current = true;
            const url = GET_URL.payment.api;
            let params = {
              standard: standardId,
              academic_year: yearId,
              student: data["student"],
            };
            getRequest(url, params, props).then((response) => {
              if (response && response.status === 200) {
                paymentLoader.current = false;
                paymentDetailTemp[`${yearId}${data["student"]}`] =
                  response.data.data;
                if (openedExpandRowTemp[data["student"]]) {
                  delete openedExpandRowTemp[data["student"]];
                } else {
                  openedExpandRowTemp[data["student"]] = true;
                }
                setOpenedExpandRow(() => openedExpandRowTemp);
                setPaymentDetail(() => paymentDetailTemp);
              }
            });
          }
        });
      },
    };
    setOptions(() => optionsTemp);
  };

  useEffect(() => {
    updateColumns();
  }, [options, paymentLoader, printLoading]);

  const updateColumns = () => {
    const columnsTemp = cloneDeep(columns);
    setColumns(() => []);
    setColumns(() => columnsTemp);
  };

  React.useEffect(() => {
    getStudentDetails();
    const columns = [
      {
        label: "Academic Year",
        name: "academic_year",
        options: {
          filter: false,
          sort: false,
          display: false,
          download: false,
        },
      },
      {
        label: "Academic Year",
        name: "standard",
        options: {
          filter: false,
          sort: false,
          display: false,
          download: false,
        },
      },
      {
        label: "Error",
        name: "error",
        options: {
          filter: false,
          sort: false,
          display: false,
          download: false,
        },
      },
      {
        label: "Academic Year",
        name: "amount",
        options: {
          filter: false,
          sort: false,
          display: false,
          download: false,
        },
      },
      {
        label: "Academic Year",
        name: "is_paid_full_fee",
        options: {
          filter: false,
          sort: false,
          display: false,
          download: false,
        },
      },
      {
        label: "Academic Year",
        name: "year_name",
        options: {
          filter: false,
          sort: true,
        },
      },
      {
        label: "Standard",
        name: "standard_name",
        options: {
          filter: false,
          sort: true,
        },
      },
      {
        name: "admission_num",
        label: "Admission No.",
        options: {
          filter: false,
          sort: true,
        },
      },
      {
        name: "total_payable",
        label: "Total Amount",
        options: {
          filter: false,
          sort: true,
        },
      },
      {
        name: "paid_amount",
        label: "Paid Amount",
        options: {
          filter: false,
          sort: true,
        },
      },
      {
        name: "pending_amount",
        label: "Pending Amount",
        options: {
          filter: false,
          sort: true,
        },
      },
      {
        label: "Group Name",
        name: "student_group_name",
        options: {
          filter: false,
          sort: false,
          display: false,
          download: false,
        },
      },
      {
        name: "Action",
        label: "Pay Now",
        options: {
          filter: false,
          sort: false,
          download: false,
          display: true,
          customBodyRender: (value, tableMeta) => {
            const yearId = tableMeta.rowData[0];
            const standardId = tableMeta.rowData[1];
            const id = props.student_id;
            return (
                <Button
                size="small"
                className="custom-button width-100-perc fs-12"
                variant="outlined"
                >
                    Pay Now
                </Button>
            );
          },
        },
      },
    ];
    setColumns(() => columns);
  }, []);

  const handleCloseSnackBar = () => {
    setSnackbar(false);
  };


  const deleteReciept = (reason) => {
    const url = DEL_URL.feecollection.api + deleteInformation["deleteId"] + "/";
    let post_data = { data: { reason: reason } };
    let prop = { ...props };
    prop["return_error_message"] = true;
    deleteRequest(url, post_data, prop, true).then((response) => {
      if (response && response.status === 200) {
        let paymentDetailTemp = { ...paymentDetail };
        paymentDetailTemp[
          `${deleteInformation["yearId"]}${props.student_id}`
        ].splice(deleteInformation["deletedIndex"], 1);
        setPaymentDetail(() => paymentDetailTemp);
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        let deleteInformationTemp = {
          deleteId: "",
          deletedIndex: "",
          yearId: "",
        };
        setDeleteInformation(() => deleteInformationTemp);
        setCancelReasonOpen(() => false);
      } else {
        let deleteInformationTemp = { ...deleteInformation };
        deleteInformationTemp["delError"] = response;
        setDeleteInformation(() => deleteInformation);
      }
    });
  };

  const handleEditTransactionDate = (data, index, yearId) => {
    let transactionInformation = {
      transError: "",
      transId: data["id"],
      transactionDate: data["transaction_date"],
      yearId: yearId,
      editIndex: index,
    };
    setTransactionInformation(() => transactionInformation);
    setIsTransactionDialog(() => true);
  };

  const updateTransaction = (transaction_date) => {
    const url =
      PUT_URL.feecollection.api + transactionInformation["transId"] + "/";
    let post_data = {
      data: { transaction_date: dateFormat(transaction_date, "YYYY-MM-DD") },
    };
    let prop = { ...props };
    prop["return_error_message"] = true;
    putRequest(url, post_data, prop, true).then((response) => {
      if (response && response.status === 200) {
        let paymentDetailTemp = { ...paymentDetail };
        paymentDetailTemp[
          `${transactionInformation["yearId"]}${props.student_id}`
        ][transactionInformation.editIndex]["transaction_date"] =
          transaction_date;
        setPaymentDetail(() => paymentDetailTemp);
        Swal.fire({
          position: "top-end",
          type: "success",
          title: response.data.Reason,
          showConfirmButton: false,
          timer: 1500,
        });
        setIsTransactionDialog(() => false);
        let transactionInformationTemp = {};
        setTransactionInformation(() => transactionInformationTemp);
      } else {
        let transactionInformationTemp = {};
        setTransactionInformation(() => transactionInformationTemp);
      }
    });
  };

  return (
    <div className="mt-30">
      {loading ? (
        <LoadingGif />
      ) : (
        <AllMUIDataTable
          key={studentFeeList}
          title={`${studentDetails.name} ( Total Pending : ${numberWithCommas(
            totalAmount.pending
          )} )`}
          data={studentFeeList}
          columns={columns}
          options={options}
        />
      )}
    </div>
  );
}

export default withRouter(StudentFeeCollection);
