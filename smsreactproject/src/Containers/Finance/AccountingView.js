import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import {
  Grid,
  Paper,
  Box,
  Tooltip,
  Button,
  Tabs,
  Tab,
  Typography,
  Card,
  CardContent,
} from "@material-ui/core/";
import moment from "moment";
import _ from "lodash";
import GetAppIcon from "@material-ui/icons/GetApp";
import { DropDownWithSearch } from "Components/DropDownWithSearch";

// Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { makeSelectAcademicYear } from "Components/CommonComponent/selectors";
import { setAcademicYear } from "Components/CommonComponent/actions";

import { DateRange } from "Components/DateRange";
import AllMUIDataTable from "Components/AllMUIDataTable";
import { Dropdown } from "Components/DropDown";
import {
  numberWithCommas,
  dateFormat,
  getUrlParam,
  checkLocalAcademicYear,
} from "Includes/functions";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { DEFAULT_PAGINATION_PROPS } from "Constants";
import "./styles.scss";
import { FormattedMessage } from "react-intl";
import commonMessages from "Constants/messages";
import LoadingGif from "Components/LoadingGif";
import { format } from "date-fns";
import Swal from "sweetalert2";

class AccountingView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedTab: 0,
      year: "",
      yearList: [],
      tableData: {},
      loading: true,
      tableUpdating: false,
      dateRangeValue: "",
      pagination: { ...DEFAULT_PAGINATION_PROPS },
      accountType: "all",
      accountId: "",
      accountList: [],
      fromDate: "",
      toDate: "",
      summary: [],
      totalDebit: 0,
      totalCredit: 0,
      dailySummary: [],
      grandTotal: {},
      categorySummary: [],
      handlerSummary: [],
      openingBalance: 0,
      closingBalance: 0,
      staffId: "",
      staffList: [],
    };
  }

  componentDidMount() {
    this.getYearList();
    this.setDefaultDateRange();
  }

  setDefaultDateRange = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.setState(
      {
        fromDate: format(firstDay, "yyyy-MM-dd"),
        toDate: format(lastDay, "yyyy-MM-dd"),
        dateRangeValue: `${format(firstDay, "dd/MM/yyyy")} - ${format(
          lastDay,
          "dd/MM/yyyy"
        )}`,
      },
      () => {
        this.getData();
      }
    );
  };

  getYearList = () => {
    let storedYearList = this.props.getAcademicYearList;

    if (storedYearList && typeof storedYearList.toJS === "function") {
      storedYearList = storedYearList.toJS();
    }

    if (
      storedYearList &&
      Array.isArray(storedYearList) &&
      storedYearList.length > 0
    ) {
      this.setAccountingAcademicYear(storedYearList);
      return;
    }

    const params = { is_active: true };
    getRequest(GET_URL.getacademicyear.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          let yearList = response.data.data || response.data || [];
          if (Array.isArray(yearList) && yearList.length > 0) {
            this.setAccountingAcademicYear(yearList);
            this.props.setAcademicYear && this.props.setAcademicYear(yearList);
          } else {
            console.error("No academic years found in response:", response);
            this.setState({ loading: false, yearList: [] });
          }
        } else {
          console.error("Failed to load academic years:", response);
          this.setState({ loading: false, yearList: [] });
        }
      })
      .catch((error) => {
        console.error("Error loading academic years:", error);
        this.setState({ loading: false, yearList: [] });
      });
  };

  setAccountingAcademicYear = (yearList) => {
    if (yearList.length > 0 && yearList[0].start_date) {
      yearList = yearList.map((data) => {
        if (data.start_date && data.end_date) {
          const fromYear = data.start_date.split("-");
          const toYear = data.end_date.split("-");
          return {
            ...data,
            name: fromYear[0] + "-" + toYear[0],
          };
        }
        return data;
      });
    }

    const yearId = checkLocalAcademicYear(yearList);
    const selectedYear =
      yearId !== 0
        ? yearList.find((year) => year.id === yearId) ||
        (yearList.length > 0 ? yearList[0] : null)
        : yearList.length > 0
          ? yearList[0]
          : null;

    this.setState(
      {
        yearList: yearList,
        year: selectedYear ? selectedYear.id : yearList.length > 0 ? yearList[0].id : "",
      },
      () => {
        this.getAccountList();
        this.getStaffList();
        this.getData();
      }
    );
  };

  getAccountList = () => {
    const params = {
      report_type: "accounts",
      account_type: this.state.accountType || "all",
    };
    getRequest(GET_URL.accounting.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const accountData = response.data.data || [];
          this.setState({
            accountList: accountData,
          });
        } else {
          console.error("Failed to load account list:", response);
          this.setState({
            accountList: [],
          });
        }
      })
      .catch((error) => {
        console.error("Error loading account list:", error);
        this.setState({
          accountList: [],
        });
      });
  };

  getStaffList = () => {
    const params = { is_active: true, employee_status: "F" };
    getRequest(GET_URL.staff.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const staffData = response.data.data || [];
          this.setState({
            staffList: staffData,
          });
        } else {
          this.setState({
            staffList: [],
          });
        }
      })
      .catch((error) => {
        console.error("Error loading staff list:", error);
        this.setState({
          staffList: [],
        });
      });
  };

  getData = () => {
    const { selectedTab, fromDate, toDate, accountType, accountId, year, staffId } =
      this.state;

    if (!fromDate || !toDate) {
      return;
    }

    this.setState({ loading: true, tableUpdating: true });

    const reportTypes = [
      "day_book",
      "ledger",
      "trial_balance",
      "cash_bank_book",
      "profit_loss",
      "cash_in_hand",
      "fixed_assets",
      "bank_accounts",
      "sundry_debtors",
      "loans_advances",
      "staff_advances",
      "cash_tracking",
    ];

    const reportType = reportTypes[selectedTab] || "day_book";

    const params = {
      report_type: reportType,
      from_date: fromDate,
      to_date: toDate,
      academic_year: year || undefined,
    };

    if (accountType !== "all" && accountId) {
      params.account_type = accountType;
      params.account_id = accountId;
    }

    if (staffId) {
      params.staff_id = staffId;
    }

    getRequest(GET_URL.accounting.api, params, this.props)
      .then((response) => {
        try {
          if (response && response.status === 200 && response.data) {
            const data = response.data.data || [];
            const columns = this.getColumns(selectedTab);

            let tableData = {
              columns: columns,
              data: data,
              options: {
                pagination: false,
                search: true,
                download: true,
                print: true,
                viewColumns: true,
                filter: true,
                filterType: "dropdown",
                responsive: "standard",
                selectableRows: "none",
                customToolbar: () => null,
                rowsPerPage: 25,
                rowsPerPageOptions: [10, 25, 50, 100],
              },
            };

            // Set state based on report type
            const stateUpdate = {
              tableData: tableData,
              loading: false,
              tableUpdating: false,
            };

            // Add report-specific data
            if (response.data.grand_total) {
              stateUpdate.grandTotal = response.data.grand_total;
            }
            if (response.data.total_debit !== undefined) {
              stateUpdate.totalDebit = response.data.total_debit || 0;
            }
            if (response.data.total_credit !== undefined) {
              stateUpdate.totalCredit = response.data.total_credit || 0;
            }
            if (response.data.opening_balance !== undefined) {
              stateUpdate.openingBalance = response.data.opening_balance || 0;
            }
            if (response.data.closing_balance !== undefined) {
              stateUpdate.closingBalance = response.data.closing_balance || 0;
            }
            if (response.data.category_summary) {
              stateUpdate.categorySummary = response.data.category_summary || [];
            }
            if (response.data.handler_summary) {
              stateUpdate.handlerSummary = response.data.handler_summary || [];
            }
            if (response.data.daily_summary) {
              stateUpdate.dailySummary = response.data.daily_summary || [];
            }
            if (response.data.summary) {
              stateUpdate.summary = response.data.summary || [];
            }

            this.setState(stateUpdate);
          } else {
            this.setState({ loading: false, tableUpdating: false });
          }
        } catch (error) {
          console.error("Error processing accounting data:", error);
          this.setState({ loading: false, tableUpdating: false });
        }
      })
      .catch((error) => {
        console.error("Error fetching accounting data:", error);
        this.setState({ loading: false, tableUpdating: false });
      });
  };

  getColumns = (tabIndex) => {
    const commonAmountColumn = {
      options: {
        customBodyRender: (value) => {
          if (value === null || value === undefined || value === "") return "";
          const numValue = typeof value === "number" ? value : parseFloat(value) || 0;
          return numberWithCommas(numValue.toFixed(2));
        },
      },
    };

    const reportColumns = {
      0: [
        // Day Book
        {
          name: "date",
          label: "Date",
          options: {
            customBodyRender: (value) => (value ? dateFormat(value) : ""),
          },
        },
        { name: "voucher_type", label: "Voucher Type" },
        { name: "voucher_no", label: "Voucher No" },
        { name: "account", label: "Account" },
        { name: "particulars", label: "Particulars" },
        { name: "debit", label: "Debit", ...commonAmountColumn },
        { name: "credit", label: "Credit", ...commonAmountColumn },
        { name: "mode_of_payment", label: "Mode of Payment" },
        { name: "reference", label: "Reference" },
      ],
      1: [
        // Ledger
        {
          name: "date",
          label: "Date",
          options: {
            customBodyRender: (value) => (value ? dateFormat(value) : ""),
          },
        },
        { name: "voucher_type", label: "Voucher Type" },
        { name: "voucher_no", label: "Voucher No" },
        { name: "account", label: "Account" },
        { name: "particulars", label: "Particulars" },
        { name: "debit", label: "Debit", ...commonAmountColumn },
        { name: "credit", label: "Credit", ...commonAmountColumn },
        { name: "balance", label: "Balance", ...commonAmountColumn },
        { name: "mode_of_payment", label: "Mode of Payment" },
        { name: "reference", label: "Reference" },
      ],
      2: [
        // Trial Balance
        { name: "account_name", label: "Account Name" },
        { name: "account_type", label: "Account Type" },
        { name: "debit", label: "Debit", ...commonAmountColumn },
        { name: "credit", label: "Credit", ...commonAmountColumn },
        {
          name: "balance",
          label: "Balance",
          options: {
            customBodyRender: (value) => {
              const numValue = typeof value === "number" ? value : parseFloat(value) || 0;
              const color = numValue >= 0 ? "green" : "red";
              return (
                <span style={{ color: color }}>
                  {numberWithCommas(numValue.toFixed(2))}
                </span>
              );
            },
          },
        },
      ],
      3: [
        // Cash/Bank Book
        {
          name: "date",
          label: "Date",
          options: {
            customBodyRender: (value) => (value ? dateFormat(value) : ""),
          },
        },
        { name: "voucher_type", label: "Voucher Type" },
        { name: "voucher_no", label: "Voucher No" },
        { name: "particulars", label: "Particulars" },
        { name: "debit", label: "Debit", ...commonAmountColumn },
        { name: "credit", label: "Credit", ...commonAmountColumn },
        { name: "balance", label: "Balance", ...commonAmountColumn },
        { name: "mode_of_payment", label: "Mode of Payment" },
        { name: "reference", label: "Reference" },
      ],
      4: [
        // Profit & Loss
        { name: "account", label: "Account" },
        {
          name: "amount",
          label: "Amount",
          ...commonAmountColumn,
        },
      ],
      5: [
        // Cash-in-Hand
        { name: "particulars", label: "Particulars" },
        { name: "opening_balance", label: "Opening Balance", ...commonAmountColumn },
        { name: "opening_balance_type", label: "Type", options: { customBodyRender: (v) => v === 'CREDIT' ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>Cr</span> : <span style={{ color: '#d32f2f', fontWeight: 600 }}>Dr</span> } },
        { name: "transactions_debit", label: "Transactions Debit", ...commonAmountColumn },
        { name: "transactions_credit", label: "Transactions Credit", ...commonAmountColumn },
        { name: "closing_balance", label: "Closing Balance", ...commonAmountColumn },
      ],
      6: [
        // Fixed Assets
        { name: "particulars", label: "Particulars" },
        { name: "opening_balance", label: "Opening Balance", ...commonAmountColumn },
        { name: "opening_balance_type", label: "Type", options: { customBodyRender: (v) => v === 'CREDIT' ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>Cr</span> : <span style={{ color: '#d32f2f', fontWeight: 600 }}>Dr</span> } },
        { name: "transactions_debit", label: "Transactions Debit", ...commonAmountColumn },
        { name: "transactions_credit", label: "Transactions Credit", ...commonAmountColumn },
        { name: "closing_balance", label: "Closing Balance", ...commonAmountColumn },
      ],
      7: [
        // Bank Accounts
        { name: "particulars", label: "Particulars" },
        { name: "opening_balance", label: "Opening Balance", ...commonAmountColumn },
        { name: "opening_balance_type", label: "Type", options: { customBodyRender: (v) => v === 'CREDIT' ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>Cr</span> : <span style={{ color: '#d32f2f', fontWeight: 600 }}>Dr</span> } },
        { name: "transactions_debit", label: "Transactions Debit", ...commonAmountColumn },
        { name: "transactions_credit", label: "Transactions Credit", ...commonAmountColumn },
        { name: "closing_balance", label: "Current Balance", ...commonAmountColumn },
      ],
      8: [
        // Sundry Debtors
        { name: "particulars", label: "Particulars" },
        { name: "opening_balance", label: "Opening Balance", ...commonAmountColumn },
        { name: "opening_balance_type", label: "Type", options: { customBodyRender: (v) => v === 'CREDIT' ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>Cr</span> : <span style={{ color: '#d32f2f', fontWeight: 600 }}>Dr</span> } },
        { name: "transactions_debit", label: "Transactions Debit", ...commonAmountColumn },
        { name: "transactions_credit", label: "Transactions Credit", ...commonAmountColumn },
        { name: "closing_balance", label: "Closing Balance", ...commonAmountColumn },
      ],
      9: [
        // Loans & Advances
        { name: "particulars", label: "Particulars" },
        { name: "opening_balance", label: "Opening Balance", ...commonAmountColumn },
        { name: "opening_balance_type", label: "Type", options: { customBodyRender: (v) => v === 'CREDIT' ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>Cr</span> : <span style={{ color: '#d32f2f', fontWeight: 600 }}>Dr</span> } },
        { name: "transactions_debit", label: "Transactions Debit", ...commonAmountColumn },
        { name: "transactions_credit", label: "Transactions Credit", ...commonAmountColumn },
        { name: "closing_balance", label: "Closing Balance", ...commonAmountColumn },
      ],
      10: [
        // Staff Advances
        { name: "particulars", label: "Staff Name" },
        { name: "employee_id", label: "Employee ID" },
        { name: "opening_balance", label: "Opening Balance", ...commonAmountColumn },
        { name: "opening_balance_type", label: "Type", options: { customBodyRender: (v) => v === 'CREDIT' ? <span style={{ color: '#2e7d32', fontWeight: 600 }}>Cr</span> : <span style={{ color: '#d32f2f', fontWeight: 600 }}>Dr</span> } },
        { name: "transactions_debit", label: "Transactions Debit", ...commonAmountColumn },
        { name: "transactions_credit", label: "Transactions Credit", ...commonAmountColumn },
        { name: "closing_balance", label: "Closing Balance", ...commonAmountColumn },
      ],
      11: [
        // Cash Tracking
        {
          name: "date",
          label: "Date",
          options: {
            customBodyRender: (value) => (value ? dateFormat(value) : ""),
          },
        },
        { name: "voucher_type", label: "Voucher Type" },
        { name: "voucher_no", label: "Voucher No" },
        { name: "particulars", label: "Particulars" },
        { name: "category", label: "Category" },
        { name: "debit", label: "Debit", ...commonAmountColumn },
        { name: "credit", label: "Credit", ...commonAmountColumn },
        { name: "balance", label: "Balance", ...commonAmountColumn },
        { name: "collected_by", label: "Collected By" },
        { name: "mode_of_payment", label: "Mode of Payment" },
      ],
    };

    return reportColumns[tabIndex] || reportColumns[0];
  };

  handleTabChange = (event, newValue) => {
    this.setState({ selectedTab: newValue }, () => {
      this.getData();
    });
  };

  handleDateRangeChange = (dateRange) => {
    if (dateRange && dateRange.start && dateRange.end) {
      this.setState(
        {
          fromDate: dateRange.start,
          toDate: dateRange.end,
          dateRangeValue: `${format(new Date(dateRange.start), "dd/MM/yyyy")} - ${format(
            new Date(dateRange.end),
            "dd/MM/yyyy"
          )}`,
        },
        () => {
          this.getData();
        }
      );
    }
  };

  handleAccountTypeChange = (event) => {
    this.setState({ accountType: event.target.value, accountId: "" }, () => {
      this.getAccountList();
      this.getData();
    });
  };

  handleAccountChange = (event) => {
    this.setState({ accountId: event.target.value }, () => {
      this.getData();
    });
  };

  handleYearChange = (event) => {
    this.setState({ year: event.target.value }, () => {
      this.getData();
    });
  };

  handleStaffChange = (event) => {
    this.setState({ staffId: event.target.value }, () => {
      this.getData();
    });
  };

  handleDownloadExcel = () => {
    const { selectedTab, fromDate, toDate, accountType, accountId, year, staffId } =
      this.state;

    const reportTypes = [
      "day_book",
      "ledger",
      "trial_balance",
      "cash_bank_book",
      "profit_loss",
      "cash_in_hand",
      "fixed_assets",
      "bank_accounts",
      "sundry_debtors",
      "loans_advances",
      "staff_advances",
      "cash_tracking",
    ];

    const reportType = reportTypes[selectedTab] || "day_book";

    const params = {
      report_type: reportType,
      from_date: fromDate,
      to_date: toDate,
      download_excel: 1,
      long_running_process: 1,
      academic_year: year || undefined,
    };

    if (accountType !== "all" && accountId) {
      params.account_type = accountType;
      params.account_id = accountId;
    }

    if (staffId) {
      params.staff_id = staffId;
    }

    const transactionId = Date.now();
    params.transaction_id = transactionId;

    Swal.fire({
      title: "Generating Report",
      text: "Please wait while we generate your Excel report...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    getRequest(GET_URL.accounting.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200 && response.data && response.data.Result) {
          // Poll for result
          this.pollForExcelResult(transactionId);
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to start report generation",
          });
        }
      })
      .catch((error) => {
        console.error("Error starting Excel download:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to start report generation",
        });
      });
  };

  pollForExcelResult = (transactionId, attempts = 0) => {
    const maxAttempts = 60; // 5 minutes max
    if (attempts >= maxAttempts) {
      Swal.fire({
        icon: "error",
        title: "Timeout",
        text: "Report generation is taking too long. Please try again later.",
      });
      return;
    }

    setTimeout(() => {
      const params = {
        transaction_id: transactionId,
        is_active: true,
      };
      getRequest(GET_URL.longprocessingapiresult.api, params, this.props)
        .then((response) => {
          if (response && response.status === 200 && response.data && response.data.data) {
            const resultData = response.data.data;
            if (resultData.is_process_running === false) {
              Swal.close();
              if (resultData.result_data && resultData.result_data.url) {
                window.open(resultData.result_data.url, "_blank");
              } else if (resultData.result_data && resultData.result_data.error) {
                Swal.fire({
                  icon: "error",
                  title: "Error",
                  text: resultData.result_data.error || "Failed to generate report",
                });
              } else {
                Swal.fire({
                  icon: "error",
                  title: "Error",
                  text: "Failed to generate report",
                });
              }
            } else {
              // Still processing
              this.pollForExcelResult(transactionId, attempts + 1);
            }
          } else {
            this.pollForExcelResult(transactionId, attempts + 1);
          }
        })
        .catch((error) => {
          console.error("Error polling for result:", error);
          this.pollForExcelResult(transactionId, attempts + 1);
        });
    }, 5000); // Poll every 5 seconds
  };

  renderSummary = () => {
    const {
      selectedTab,
      totalDebit,
      totalCredit,
      grandTotal,
      openingBalance,
      closingBalance,
      categorySummary,
      handlerSummary,
    } = this.state;

    if (selectedTab === 0 || selectedTab === 1 || selectedTab === 3) {
      // Day Book, Ledger, Cash/Bank Book
      return (
        <Card style={{ marginBottom: 20 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  Total Debit:{" "}
                  <strong style={{ color: "red" }}>
                    {numberWithCommas(totalDebit.toFixed(2))}
                  </strong>
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  Total Credit:{" "}
                  <strong style={{ color: "green" }}>
                    {numberWithCommas(totalCredit.toFixed(2))}
                  </strong>
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    } else if (selectedTab === 2) {
      // Trial Balance
      const difference = totalCredit - totalDebit;
      return (
        <Card style={{ marginBottom: 20 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Trial Balance Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Total Debit:{" "}
                  <strong style={{ color: "red" }}>
                    {numberWithCommas(totalDebit.toFixed(2))}
                  </strong>
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Total Credit:{" "}
                  <strong style={{ color: "green" }}>
                    {numberWithCommas(totalCredit.toFixed(2))}
                  </strong>
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Difference:{" "}
                  <strong
                    style={{ color: difference === 0 ? "green" : "red" }}
                  >
                    {numberWithCommas(Math.abs(difference).toFixed(2))}
                  </strong>
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    } else if (selectedTab === 4) {
      // Profit & Loss
      const netProfit = totalCredit - totalDebit;
      return (
        <Card style={{ marginBottom: 20 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Profit & Loss Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  Total Income:{" "}
                  <strong style={{ color: "green" }}>
                    {numberWithCommas(totalCredit.toFixed(2))}
                  </strong>
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="textSecondary">
                  Total Expenses:{" "}
                  <strong style={{ color: "red" }}>
                    {numberWithCommas(totalDebit.toFixed(2))}
                  </strong>
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Net Profit/Loss:{" "}
                  <strong
                    style={{ color: netProfit >= 0 ? "green" : "red" }}
                  >
                    {numberWithCommas(Math.abs(netProfit).toFixed(2))}
                  </strong>
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    } else if (selectedTab === 11) {
      // Cash Tracking
      return (
        <Card style={{ marginBottom: 20 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cash Tracking Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Opening Balance:{" "}
                  <strong>{numberWithCommas(openingBalance.toFixed(2))}</strong>
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Total Debit:{" "}
                  <strong style={{ color: "red" }}>
                    {numberWithCommas(totalDebit.toFixed(2))}
                  </strong>
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Total Credit:{" "}
                  <strong style={{ color: "green" }}>
                    {numberWithCommas(totalCredit.toFixed(2))}
                  </strong>
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Closing Balance:{" "}
                  <strong>{numberWithCommas(closingBalance.toFixed(2))}</strong>
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    } else if (grandTotal && Object.keys(grandTotal).length > 0) {
      // Reports with grand total (Cash-in-Hand, Fixed Assets, Bank Accounts, etc.)
      return (
        <Card style={{ marginBottom: 20 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Grand Total
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Opening Balance:{" "}
                  <strong>
                    {numberWithCommas(
                      (grandTotal.opening_balance || 0).toFixed(2)
                    )}
                  </strong>
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Transactions Debit:{" "}
                  <strong style={{ color: "red" }}>
                    {numberWithCommas(
                      (grandTotal.transactions_debit || 0).toFixed(2)
                    )}
                  </strong>
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Transactions Credit:{" "}
                  <strong style={{ color: "green" }}>
                    {numberWithCommas(
                      (grandTotal.transactions_credit || 0).toFixed(2)
                    )}
                  </strong>
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Closing Balance:{" "}
                  <strong>
                    {numberWithCommas(
                      (grandTotal.closing_balance || 0).toFixed(2)
                    )}
                  </strong>
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  render() {
    const {
      selectedTab,
      loading,
      tableData,
      yearList,
      year,
      accountType,
      accountId,
      accountList,
      dateRangeValue,
      tableUpdating,
      staffList,
      staffId,
    } = this.state;

    const tabLabels = [
      "Day Book",
      "Ledger",
      "Trial Balance",
      "Cash/Bank Book",
      "Profit & Loss",
      "Cash-in-Hand",
      "Fixed Assets",
      "Bank Accounts",
      "Sundry Debtors",
      "Loans & Advances",
      "Staff Advances",
      "Cash Tracking",
    ];

    const filteredAccountList =
      accountList && accountList.length > 0
        ? accountList.map((acc) => ({
          value: acc.id,
          label: acc.display_name || acc.name || `Account ${acc.id}`,
        }))
        : [];

    const filteredStaffList =
      staffList && staffList.length > 0
        ? staffList.map((staff) => ({
          value: staff.id,
          label: `${staff.first_name || ""} ${staff.last_name || ""} (${staff.employee_id || ""})`.trim(),
        }))
        : [];

    return (
      <Box style={{ padding: "20px" }}>
        <Paper style={{ padding: "20px", borderRadius: "8px" }}>
          <Typography variant="h5" gutterBottom>
            Accounting Reports
          </Typography>

          {/* Filters */}
          <Grid container spacing={2} style={{ marginTop: 10 }}>
            <Grid item xs={12} md={3}>
              <Dropdown
                label="Academic Year"
                name="year"
                value={year}
                onChange={this.handleYearChange}
                data={yearList}
                customName="name"
                customId="id"
              />
            </Grid>
            {(selectedTab === 1 || selectedTab === 3) && (
              <>
                <Grid item xs={12} md={3}>
                  <Dropdown
                    label="Account Type"
                    value={accountType}
                    onChange={this.handleAccountTypeChange}
                    data={[
                      { id: "all", name: "All" },
                      { id: "student", name: "Student" },
                      { id: "expense", name: "Expense" },
                      { id: "bank", name: "Bank" },
                    ]}
                    customName="name"
                    customId="id"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <DropDownWithSearch
                    label="Account"
                    value={accountId}
                    onChange={this.handleAccountChange}
                    options={filteredAccountList}
                    disabled={accountType === "all"}
                  />
                </Grid>
              </>
            )}
            {selectedTab === 10 && (
              <Grid item xs={12} md={3}>
                <DropDownWithSearch
                  label="Staff"
                  value={staffId}
                  onChange={this.handleStaffChange}
                  options={filteredStaffList}
                />
              </Grid>
            )}
            <Grid item xs={12} md={selectedTab === 1 || selectedTab === 3 ? 3 : 6}>
              <DateRange
                handleChange={this.handleDateRangeChange}
                startDate={this.state.fromDate}
                endDate={this.state.toDate}
                label="Date Range"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<GetAppIcon />}
                onClick={this.handleDownloadExcel}
                style={{ marginTop: 8 }}
              >
                Download Excel
              </Button>
            </Grid>
          </Grid>

          {/* Tabs */}
          <Tabs
            value={selectedTab}
            onChange={this.handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            style={{ marginTop: 20 }}
          >
            {tabLabels.map((label, index) => (
              <Tab key={index} label={label} />
            ))}
          </Tabs>

          {/* Summary */}
          {this.renderSummary()}

          {/* Table */}
          {loading ? (
            <LoadingGif />
          ) : (
            <Box style={{ marginTop: 20 }}>
              {tableData.columns && tableData.columns.length > 0 && (
                <AllMUIDataTable
                  title=""
                  data={tableData.data || []}
                  columns={tableData.columns || []}
                  options={tableData.options || {}}
                  updating={tableUpdating}
                />
              )}
            </Box>
          )}
        </Paper>
      </Box>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  getAcademicYearList: makeSelectAcademicYear(),
});

const mapDispatchToProps = (dispatch) =>
  bindActionCreators(
    {
      setAcademicYear,
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(AccountingView));
