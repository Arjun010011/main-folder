import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import {
  Grid,
  Paper,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@material-ui/core";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { DateRange } from "Components/DateRange";
import { dateFormat } from "Includes/functions";
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import loadingBar from "Assets/loading.gif";

class PaymentGatewayList extends Component {
  constructor() {
    super();
    this.dateRange = React.createRef();
    this.state = {
      loading: true,
      paymentList: { data: [], count: 0 },
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      dateRangeValue: {
        start: dateFormat(new Date(new Date().setMonth(new Date().getMonth() - 1)), "YYYY-MM-DD"),
        end: dateFormat(new Date(), "YYYY-MM-DD"),
      },
      tableUpdating: false,
      openHistoryDialog: false,
      transactionHistory: null,
      selectedOrderId: null,
      columns: [
        {
          name: "order_id",
          label: "Order ID",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
          },
        },
        {
          name: "user_name",
          label: "User Name",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
          },
        },
        {
          name: "user_type",
          label: "User Type",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
          },
        },
        {
          name: "amount",
          label: "Amount",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
            customBodyRender: (value) => {
              return `₹${parseFloat(value || 0).toFixed(2)}`;
            },
          },
        },
        {
          name: "payment_status",
          label: "Payment Status",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
          },
        },
        {
          name: "order_status",
          label: "Order Status",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
          },
        },
        {
          name: "mode_of_payment",
          label: "Payment Mode",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
          },
        },
        {
          name: "receipt_num",
          label: "Receipt Number",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
          },
        },
        {
          name: "payment_ref_num",
          label: "Transaction ID",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
          },
        },
        {
          name: "created",
          label: "Date",
          options: {
            filter: false,
            sort: true,
            viewColumns: false,
            display: true,
            customBodyRender: (value) => {
              return value ? dateFormat(value, "DD-MM-YYYY HH:mm") : "-";
            },
          },
        },
        {
          name: "Actions",
          label: "Actions",
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => {
              return (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => this.viewTransactionHistory(tableMeta.rowData[0])}
                >
                  View History
                </Button>
              );
            },
          },
        },
      ],
    };
  }

  componentDidMount() {
    this.getPaymentList();
  }

  getPaymentList = (tableState = null) => {
    this.setState({ tableUpdating: true });
    const { pagination, dateRangeValue } = this.state;
    let params = {};

    // Date range filters
    if (dateRangeValue.start) {
      params.from_date = dateRangeValue.start;
    }
    if (dateRangeValue.end) {
      params.to_date = dateRangeValue.end;
    }

    // Pagination
    if (tableState) {
      params.page = tableState.page + 1;
      params.page_size = tableState.rowsPerPage;
    } else {
      params.page = pagination.page || 1;
      params.page_size = pagination.page_size || 10;
    }

    getRequest(GET_URL.payment_gateway_list.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const data = response.data.data || response.data;
          const count = response.data.count || data.length;
          
          this.setState({
            paymentList: {
              data_list: Array.isArray(data) ? data : [],
              count: count,
            },
            pagination: {
              ...pagination,
              page: params.page - 1,
              page_size: params.page_size,
            },
            tableUpdating: false,
            loading: false,
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching payment list:", error);
        this.setState({
          tableUpdating: false,
          loading: false,
        });
      });
  };

  handleChangeDateRange = (dateRangeValue) => {
    this.setState({ dateRangeValue }, () => {
      this.getPaymentList();
    });
  };

  viewTransactionHistory = (orderId) => {
    this.setState({ selectedOrderId: orderId, openHistoryDialog: true });
    getRequest(`${GET_URL.payment_gateway_list.api}${orderId}/`, {}, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          this.setState({
            transactionHistory: response.data,
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching transaction history:", error);
      });
  };

  handleCloseHistoryDialog = () => {
    this.setState({
      openHistoryDialog: false,
      transactionHistory: null,
      selectedOrderId: null,
    });
  };

  render() {
    const {
      loading,
      paymentList,
      pagination,
      dateRangeValue,
      tableUpdating,
      openHistoryDialog,
      transactionHistory,
      columns,
    } = this.state;

    const options = {
      selectableRows: "none",
      filterType: "dropdown",
      responsive: "simple",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [10, 25, 50, 100],
      serverSide: true,
      count: paymentList.count || 0,
      page: pagination.page || 0,
      rowsPerPage: pagination.page_size || 10,
      onTableChange: (action, tableState) => {
        if (action === "changePage" || action === "changeRowsPerPage") {
          this.getPaymentList(tableState);
        }
      },
    };

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    }

    return (
      <Box>
        <Paper style={{ padding: "20px", marginBottom: "20px" }}>
          <Grid container spacing={2}>
            <Grid item md={4} xs={12}>
              <DateRange
                handleChange={this.handleChangeDateRange}
                label="Payment Date Range"
                ref={this.dateRange}
                startDate={dateRangeValue.start}
                endDate={dateRangeValue.end}
              />
            </Grid>
          </Grid>
        </Paper>

        <Paper>
          <AllMUIDataTable
            title="Payment Gateway List"
            data={paymentList.data_list || []}
            columns={columns}
            options={options}
            pagination={pagination}
            count={paymentList.count || 0}
          />
        </Paper>

        {/* Transaction History Dialog */}
        <Dialog
          open={openHistoryDialog}
          onClose={this.handleCloseHistoryDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Transaction History</DialogTitle>
          <DialogContent>
            {transactionHistory ? (
              <Box>
                <Grid container spacing={2} style={{ marginBottom: "20px" }}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Order ID:</Typography>
                    <Typography variant="body1">{transactionHistory.order_id}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Amount:</Typography>
                    <Typography variant="body1">₹{parseFloat(transactionHistory.amount || 0).toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Payment Status:</Typography>
                    <Typography variant="body1">{transactionHistory.payment_status}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Order Status:</Typography>
                    <Typography variant="body1">{transactionHistory.order_status}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Payment Mode:</Typography>
                    <Typography variant="body1">{transactionHistory.mode_of_payment || "N/A"}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Date:</Typography>
                    <Typography variant="body1">
                      {transactionHistory.created
                        ? dateFormat(transactionHistory.created, "DD-MM-YYYY HH:mm")
                        : "N/A"}
                    </Typography>
                  </Grid>
                  {transactionHistory.fee_collection && (
                    <>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">Receipt Number:</Typography>
                        <Typography variant="body1">
                          {transactionHistory.fee_collection.receipt_num || "N/A"}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2">Transaction ID:</Typography>
                        <Typography variant="body1">
                          {transactionHistory.fee_collection.payment_ref_num || "N/A"}
                        </Typography>
                      </Grid>
                    </>
                  )}
                </Grid>

                {transactionHistory.gateway_response &&
                  Object.keys(transactionHistory.gateway_response).length > 0 && (
                    <Box style={{ marginTop: "20px" }}>
                      <Typography variant="h6" style={{ marginBottom: "10px" }}>
                        Gateway Response
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Field</TableCell>
                              <TableCell>Value</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.entries(transactionHistory.gateway_response).map(([key, value]) => (
                              <TableRow key={key}>
                                <TableCell>{key}</TableCell>
                                <TableCell>{String(value)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}

                {transactionHistory.payment_history &&
                  transactionHistory.payment_history.length > 0 && (
                    <Box style={{ marginTop: "20px" }}>
                      <Typography variant="h6" style={{ marginBottom: "10px" }}>
                        Payment History
                      </Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Details</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {transactionHistory.payment_history.map((history, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  {history.payment_time
                                    ? dateFormat(history.payment_time, "DD-MM-YYYY HH:mm")
                                    : "N/A"}
                                </TableCell>
                                <TableCell>{history.payment_status || "N/A"}</TableCell>
                                <TableCell>{JSON.stringify(history)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
              </Box>
            ) : (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleCloseHistoryDialog} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
}

export default withRouter(PaymentGatewayList);


