import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import {
  Grid,
  Paper,
  Box,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
} from "@material-ui/core";
import DateRangeIcon from "@material-ui/icons/DateRange";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { DateRange } from "Components/DateRange";
import { dateFormat, numberWithCommas } from "Includes/functions";
import { DEFAULT_PAGINATION_PROPS_ID_LIST } from "Constants";
import { Actions } from "Constants/permissions";
import loadingBar from "images/loading.gif";

/**
 * Online Payment List – simplified screen showing only:
 * payment list, student name, amount collected, and link to fee collection screen.
 */
class OnlinePaymentList extends Component {
  constructor() {
    super();
    this.dateRange = React.createRef();
    this.state = {
      loading: true,
      paymentList: { data_list: [], count: 0 },
      summary: null,
      pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
      dateRangeValue: (() => {
        const d = new Date();
        const start = dateFormat(new Date(d.getFullYear(), d.getMonth(), 1), "YYYY-MM-DD");
        const end = dateFormat(new Date(d.getFullYear(), d.getMonth() + 1, 0), "YYYY-MM-DD");
        return { start, end };
      })(),
      selectedMonth: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      })(),
      paymentStatus: "SUCCESS",
      tableUpdating: false,
      columns: [
        {
          name: "order_id",
          label: "Order ID",
          options: { filter: false, sort: true, customBodyRender: (v) => v || "—" },
        },
        {
          name: "user_name",
          label: "Student",
          options: { filter: false, sort: true, customBodyRender: (v) => v || "—" },
        },
        {
          name: "user_type",
          label: "User Type",
          options: { filter: false, sort: true, display: false, customBodyRender: (v) => v || "—" },
        },
        {
          name: "amount",
          label: "Amount",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value) => `₹${parseFloat(value || 0).toFixed(2)}`,
          },
        },
        {
          name: "payment_status",
          label: "Status",
          options: { filter: false, sort: true, customBodyRender: (v) => v || "—" },
        },
        {
          name: "order_status",
          label: "Order Status",
          options: { filter: false, sort: true, customBodyRender: (v) => v || "—" },
        },
        {
          name: "mode_of_payment",
          label: "Payment Mode",
          options: { filter: false, sort: true, customBodyRender: (v) => v || "—" },
        },
        {
          name: "receipt_num",
          label: "Receipt No",
          options: { filter: false, sort: true, customBodyRender: (v) => v || "—" },
        },
        {
          name: "payment_ref_num",
          label: "Transaction ID",
          options: { filter: false, sort: true, customBodyRender: (v) => v || "—" },
        },
        {
          name: "created",
          label: "Date",
          options: {
            filter: false,
            sort: true,
            customBodyRender: (value) => (value ? dateFormat(value, "DD-MM-YYYY HH:mm") : "—"),
          },
        },
        {
          name: "fee_collection_link",
          label: "Fee Collection",
          options: {
            filter: false,
            sort: false,
            customBodyRender: (value, tableMeta) => {
              const feeCollectionId = tableMeta.rowData[11]; // fee_collection_id (hidden)
              const hasLink = feeCollectionId != null && feeCollectionId !== "";
              if (!hasLink) return "—";
              return (
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={() => this.openFeeReceipt(feeCollectionId)}
                >
                  View
                </Button>
              );
            },
          },
        },
        {
          name: "fee_collection_id",
          label: "",
          options: { filter: false, sort: false, display: false },
        },
        {
          name: "student_id",
          label: "",
          options: { filter: false, sort: false, display: false },
        },
      ],
    };
  }

  componentDidMount() {
    this.getPaymentList();
  }

  getPaymentList = (tableState = null) => {
    this.setState({ tableUpdating: true });
    const { pagination, dateRangeValue, paymentStatus } = this.state;
    const params = {};

    if (dateRangeValue.start) params.from_date = dateRangeValue.start;
    if (dateRangeValue.end) params.to_date = dateRangeValue.end;
    if (paymentStatus && paymentStatus !== "all") params.payment_status = paymentStatus;

    if (tableState) {
      params.page = tableState.page + 1;
      params.page_size = tableState.rowsPerPage;
    } else {
      params.page = pagination.page != null ? pagination.page + 1 : 1;
      params.page_size = pagination.page_size || 10;
    }

    getRequest(GET_URL.payment_gateway_list.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const res = response.data;
          const data = res.results || res.data || (Array.isArray(res) ? res : []);
          const count = res.count != null ? res.count : data.length;
          this.setState({
            paymentList: { data_list: Array.isArray(data) ? data : [], count },
            summary: res.summary || null,
            pagination: {
              ...pagination,
              page: (params.page || 1) - 1,
              page_size: params.page_size || 10,
            },
            tableUpdating: false,
            loading: false,
          });
        }
      })
      .catch(() => {
        this.setState({ tableUpdating: false, loading: false });
      });
  };

  handleChangeDateRange = (dateRangeValue) => {
    const monthValue = dateRangeValue && dateRangeValue.start && dateRangeValue.end
      ? this.getMonthValueFromDateRange(dateRangeValue.start, dateRangeValue.end)
      : "";
    this.setState({ dateRangeValue: dateRangeValue || {}, selectedMonth: monthValue }, () => this.getPaymentList());
  };

  handlePaymentStatusChange = (e) => {
    this.setState({ paymentStatus: e.target.value }, () => this.getPaymentList());
  };

  openFeeReceipt = (feeCollectionId) => {
    const url = GET_URL.feecollection.api + feeCollectionId + "/";
    getRequest(url, {}, { ...this.props, responseType: "blob" }).then((response) => {
      if (response && response.status === 200) {
        const data = new Blob([response.data], { type: "application/pdf" });
        const fileURL = URL.createObjectURL(data);
        const height = (window.screen.height * 90) / 100;
        const width = (window.screen.width * 80) / 100;
        window.open(fileURL, "FeeReceipt", `height=${height},width=${width}`);
      }
    });
  };

  getMonthOptions = () => {
    const options = [];
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    for (let y = currentYear; y >= currentYear - 1; y--) {
      const startM = y === currentYear ? currentMonth : 11;
      const endM = 0;
      for (let m = startM; m >= endM; m--) {
        const value = `${y}-${String(m + 1).padStart(2, "0")}`;
        options.push({ value, label: `${monthNames[m]} ${y}` });
      }
    }
    return options;
  };

  getDateRangeFromMonth = (monthValue) => {
    if (!monthValue || monthValue === "") return null;
    const [y, m] = monthValue.split("-").map(Number);
    const start = dateFormat(new Date(y, m - 1, 1), "YYYY-MM-DD");
    const lastDay = new Date(y, m, 0);
    const end = dateFormat(lastDay, "YYYY-MM-DD");
    return { start, end };
  };

  getMonthValueFromDateRange = (start, end) => {
    if (!start || !end) return "";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const firstOfMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const lastOfMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    if (dateFormat(firstOfMonth, "YYYY-MM-DD") === start && dateFormat(lastOfMonth, "YYYY-MM-DD") === end) {
      return `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
    }
    return "";
  };

  handleMonthChange = (e) => {
    const monthValue = e.target.value;
    if (monthValue === "_custom") {
      this.setState({ selectedMonth: "" });
      return;
    }
    const range = this.getDateRangeFromMonth(monthValue);
    if (range) {
      this.setState({ selectedMonth: monthValue, dateRangeValue: range }, () => this.getPaymentList());
    }
  };

  render() {
    const {
      loading,
      paymentList,
      summary,
      pagination,
      dateRangeValue,
      paymentStatus,
      tableUpdating,
      columns,
    } = this.state;

    const options = {
      selectableRows: "none",
      responsive: "standard",
      filter: false,
      download: true,
      print: false,
      viewColumns: false,
      rowsPerPageOptions: [10, 25, 50],
      serverSide: true,
      count: paymentList.count || 0,
      page: pagination.page ?? 0,
      rowsPerPage: pagination.page_size || 10,
      onTableChange: (action, tableState) => {
        if (action === "changePage" || action === "changeRowsPerPage") {
          this.getPaymentList(tableState);
        }
      },
    };

    if (loading) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
          style={{ background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)" }}
        >
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    }

    return (
      <Box>
        <Paper className="paper-background">
          <Grid container>
            <Grid item md={12} xs={12} sm={12}>
              <Box className="header-align heading">Online Payment</Box>
            </Grid>
          </Grid>

        <Box style={{ padding: "16px 24px 24px" }}>
          {/* Date Range & Payment Status - same row */}
          <Grid container spacing={3} alignItems="flex-start" style={{ marginBottom: 24 }}>
            <Grid item xs={12} md={6} lg={5}>
              <Paper
                elevation={0}
                style={{
                  borderRadius: 8,
                  padding: 20,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Box display="flex" alignItems="center" style={{ marginBottom: 16 }}>
                  <DateRangeIcon style={{ fontSize: 20, color: "#64748b", marginRight: 8 }} />
                  <Typography variant="subtitle2" style={{ color: "#64748b", fontWeight: 600 }}>
                    Payment Date Range
                  </Typography>
                </Box>
                <FormControl variant="outlined" size="small" fullWidth style={{ marginBottom: 16 }}>
                  <InputLabel id="month-select-label">Select Month</InputLabel>
                  <Select
                    labelId="month-select-label"
                    value={this.state.selectedMonth || "_custom"}
                    onChange={this.handleMonthChange}
                    label="Select Month"
                  >
                    <MenuItem value="_custom">Custom range</MenuItem>
                    {this.getMonthOptions().map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <DateRange
                  handleChange={this.handleChangeDateRange}
                  label="Date Range"
                  ref={this.dateRange}
                  startDate={dateRangeValue.start}
                  endDate={dateRangeValue.end}
                  size="small"
                  allowFutureEndDate
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <Paper
                elevation={0}
                style={{
                  borderRadius: 8,
                  padding: 20,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Box display="flex" alignItems="center" style={{ marginBottom: 16 }}>
                  <Typography variant="subtitle2" style={{ color: "#64748b", fontWeight: 600 }}>
                    Filter
                  </Typography>
                </Box>
                <Box display="flex" alignItems="flex-start">
                  <FormControl variant="outlined" size="small" style={{ flex: 1 }}>
                    <InputLabel id="payment-status-label">Payment Status</InputLabel>
                    <Select
                      labelId="payment-status-label"
                      value={paymentStatus}
                      onChange={this.handlePaymentStatusChange}
                      label="Payment Status"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="SUCCESS">Paid</MenuItem>
                      <MenuItem value="PENDING">Pending</MenuItem>
                      <MenuItem value="FAILED">Failed</MenuItem>
                      <MenuItem value="NOT_ATTEMPTED">Not Attempted</MenuItem>
                    </Select>
                  </FormControl>
                  <Tooltip
                    title={
                      <Box component="span" style={{ display: "block", padding: "4px 0", fontSize: "0.75rem" }}>
                        <strong>Paid:</strong> Payment completed successfully
                        <br />
                        <strong>Pending:</strong> Payment initiated, awaiting confirmation
                        <br />
                        <strong>Failed:</strong> Payment could not be completed
                        <br />
                        <strong>Not Attempted:</strong> Order created but payment not completed
                      </Box>
                    }
                    placement="top"
                    enterDelay={300}
                  >
                    <IconButton size="small" style={{ marginTop: 8, marginLeft: 4, padding: 4 }}>
                      <InfoOutlinedIcon fontSize="small" style={{ color: "#64748b" }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Summary - compact, above table */}
          {summary != null && (
            <Typography
              variant="caption"
              component="div"
              style={{
                marginBottom: 8,
                color: "#64748b",
                fontSize: "0.7rem",
              }}
            >
              Total Online Payments: <strong style={{ color: "#1565c0" }}>{summary.total_count}</strong>
              {" · "}
              Total Amount Collected: <strong style={{ color: "#2e7d32" }}>{numberWithCommas(parseFloat(summary.total_amount || 0).toFixed(2))}</strong>
            </Typography>
          )}

          {/* Table */}
          <Paper
            elevation={0}
            style={{
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              border: "1px solid #e2e8f0",
            }}
          >
          <AllMUIDataTable
            title="Payment Transactions"
            data={paymentList.data_list || []}
            columns={columns}
            options={options}
            pagination={pagination}
            count={paymentList.count || 0}
          />
        </Paper>
        </Box>
        </Paper>
      </Box>
    );
  }
}

export default withRouter(OnlinePaymentList);
