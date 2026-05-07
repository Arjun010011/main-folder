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
  Paper,
} from "@material-ui/core";
import {
  numberWithCommas,
  isUserHasPermission,
  dateFormat,
  CaptilizeString,
  getFullName,
} from "Includes/functions";
import Snackbar from "@material-ui/core/Snackbar";
import { Alert } from "Includes/functions";
import { withRouter } from "react-router-dom";

import { POST_URL, GET_URL } from "Includes/urls";
import { getRequest, postRequest } from "Includes/api/apicall";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import { Actions } from "Constants/permissions";
import CheckCircleOutlinedIcon from "@material-ui/icons/CheckCircleOutlined";
import LoadingGif from "Components/LoadingGif";
import { cloneDeep } from "lodash";
import { DropDownWithSearch } from "Components/DropDownWithSearch";
import BlankPagewithIcon from "Components/BlankPageWithIcon";
import "./styles.scss";

function StudentFeeCollection(props) {
  const [alertData] = React.useState("");
  const [snackbar, setSnackbar] = React.useState(false);
  const [studentFeeList, setStudentFeeList] = React.useState([]);
  const [paymentDetail, setPaymentDetail] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [totalAmount, setTotalAmount] = React.useState({});
  const [columns, setColumns] = React.useState([]);
  const [options, setOptions] = React.useState({});
  const [yearList, setYearList] = React.useState([]);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [yearLoading, setYearLoading] = React.useState(false);
  const [studentDetails, setStudentDetails] = React.useState({});
  const [columnHeader, setColumnHeader] = React.useState({});

  const paymentLoader = useRef(true);
  const printLoading = useRef(null);

  const getYearDetails = () => {
    const postData = {
      student_ids: [parseInt(props.student_id)],
    };
    postRequest(POST_URL.getfeelistforstudent.api, postData, props).then(
      (response) => {
        if (response && response.status === 200) {
          if (response.data.data?.[props.student_id]) {
            for (const data of response.data.data?.[props.student_id]) {
              data["year_name"] = `${data["year_name"]} [ ${CaptilizeString(
                data["standard_name"]
              )} ]`;
            }
            setSelectedYear(
              () =>
                response.data.data?.[props.student_id][
                  response.data.data?.[props.student_id].length - 1
                ]
            );
          }
          setYearList(() => response.data.data[props.student_id]);
        }
        setLoading(() => false);
      }
    );
  };

  React.useEffect(() => {
    updateOptions(paymentDetail);
  }, [studentFeeList, paymentDetail, paymentLoader, columnHeader]);

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

  const requestSort = (currentId, key) => {
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
    let customerListCopy = [...paymentDetail[currentId]];
    customerListCopy.sort(comapreBy(key, columnCopy[key]));
    setColumnHeader(columnCopy);
    setPaymentDetail({ ...paymentDetail, [currentId]: customerListCopy });
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
        let currentId = `${planId}${selectedYear.academic_year}${props.student_id}`;
        const studentDetail = paymentDetailTemp[[currentId]];
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
                      <TableCell
                        className="pointer"
                        onClick={() =>
                          requestSort(currentId, "fee_collection__receipt_num")
                        }
                      >
                        <FormattedMessage {...commonMessages.receiptNumber} />
                      </TableCell>
                      <TableCell
                        className="pointer"
                        onClick={() =>
                          requestSort(currentId, "transaction_date")
                        }
                      >
                        <FormattedMessage {...commonMessages.transactionDate} />
                      </TableCell>
                      <TableCell
                        className="pointer"
                        onClick={() => requestSort(currentId, "amount_paid")}
                      >
                        <FormattedMessage {...commonMessages.amountPaid} />{" "}
                      </TableCell>
                      <TableCell> Collected By </TableCell>
                      <TableCell> Mode Of Payment </TableCell>
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
                          <TableCell>{data["mode_of_payment"]}</TableCell>
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

  useEffect(() => {
    updateColumns();
  }, [options, paymentLoader, printLoading]);

  const updateColumns = () => {
    const columnsTemp = cloneDeep(columns);
    setColumns(() => []);
    setColumns(() => columnsTemp);
  };

  React.useEffect(() => {
    getYearDetails();
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

  const handleCloseSnackBar = () => {
    setSnackbar(false);
  };

  const onChangeYear = (e, newValue) => {
    setSelectedYear(() => newValue);
  };

  const getFeeDetails = () => {
    let params = {
      academic_year: selectedYear.academic_year,
      standard: selectedYear.standard,
      student: props.student_id,
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
              if( !termData.payment_detail ){
                termData['payment_detail'] = []
              }
              if (termData["paid_amount"]) {
                totalPaidAmount += termData["paid_amount"];
              }
              paymentTempList = [
                ...paymentTempList,
                ...termData.payment_detail,
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
        setStudentDetails(() => response.data.data.student);
        let temp_totalAmount = { ...totalAmount };
        temp_totalAmount["pending"] = selectedYear.pending_amount;
        setTotalAmount(() => temp_totalAmount);
        setYearLoading(() => false);
      }
    });
  };

  React.useEffect(() => {
    if (selectedYear) {
      setYearLoading(() => true);
      getFeeDetails();
    }
  }, [selectedYear]);

  return (
    <div className="mt-30">
      {loading ? (
        <LoadingGif />
      ) : (
        <>
          <div>
            <DropDownWithSearch
              id="combo-box-demo"
              options={yearList}
              value={selectedYear}
              onChange={(e, newValue) => onChangeYear(e, newValue)}
              optionValue="year_name"
              label={"Academic Year"}
              autoCompleteClassName="width-300px"
              className="width-inherit bg-white"
              size="small"
            />
          </div>
          {yearLoading ? (
            <div className="loading">
              <CircularProgress />
            </div>
          ) : selectedYear ? (
            <div className="mt-30">
              <AllMUIDataTable
                key={studentFeeList}
                title={`${getFullName(
                  studentDetails.first_name,
                  studentDetails.middle_name,
                  studentDetails.last_name
                )} ( Total Pending : ${numberWithCommas(
                  totalAmount.pending
                )} )`}
                data={studentFeeList}
                columns={columns}
                options={options}
                highlighRow={true}
              />
            </div>
          ) : (
            <div className="mt-20">
              <BlankPagewithIcon
                data={"Select Academic Year For Fee History"}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default withRouter(StudentFeeCollection);
