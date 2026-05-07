import React, { Component, Fragment } from "react";
import { withRouter } from "react-router-dom";
import {
  Grid,
  Paper,
  Box,
  CircularProgress,
  Tooltip,
  Button,
  Icon,
  Tabs,
  Tab,
  Typography,
  Card,
  CardContent,
} from "@material-ui/core/";
import moment from "moment";
import _ from "lodash";
import InfoIcon from "@material-ui/icons/Info";
import classNames from "classnames";
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
  getPaginationProps,
  numberWithCommas,
  dateFormat,
  getFullName,
  getUrlParam,
  getRowsPerPageOptions,
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

class TallyView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedTab: 0,
      year: "",
      yearList: [],
      tableData: {},
      loading: true,
      tableUpdating: false,
      daterange: {},
      datePickerOpen: false,
      minDate: "",
      maxDate: "",
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
    };
  }

  componentDidMount() {
    this.getYearList();
    // getAccountList will be called after year is set or when accountType changes
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
    // Check if year list is available from props (Redux store)
    let storedYearList = this.props.getAcademicYearList;
    
    // Handle Immutable.js objects from Redux
    if (storedYearList && typeof storedYearList.toJS === 'function') {
      storedYearList = storedYearList.toJS();
    }
    
    // Check if storedYearList is actually an array
    if (storedYearList && Array.isArray(storedYearList) && storedYearList.length > 0) {
      this.setTallyAcademicYear(storedYearList);
      return;
    }
    
    // If not in Redux or not valid, fetch from API
    const params = { is_active: true ,is_finance_page: true};
    getRequest(GET_URL.getacademicyear.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          // Handle different response structures
          let yearList = response.data.data || response.data || [];
          if (Array.isArray(yearList) && yearList.length > 0) {
            this.setTallyAcademicYear(yearList);
            // Store in Redux for future use
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

  setTallyAcademicYear = (yearList) => {
    console.log(yearList, 'kumaran')
    // Format year names if they have start_date and end_date
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
    
    // Use checkLocalAcademicYear to get default year from localStorage
    const yearId = checkLocalAcademicYear(yearList);
    const selectedYear = yearId !== 0 
      ? yearList.find(year => year.id === yearId) || (yearList.length > 0 ? yearList[0] : null)
      : (yearList.length > 0 ? yearList[0] : null);
    
    this.setState(
      {
        yearList: yearList,
        year: selectedYear ? selectedYear.id : (yearList.length > 0 ? yearList[0].id : ""),
      },
      () => {
        // Load account list when year is set
        if (this.state.year) {
          this.getAccountList();
          this.getData();
        } else {
          this.setState({ loading: false });
        }
      }
    );
  };

  getAccountList = () => {
    const params = {
      view_type: "accounts",
      account_type: this.state.accountType || "all",
    };
    getRequest(GET_URL.tally.api, params, this.props)
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

  getData = () => {
    const { selectedTab, fromDate, toDate, accountType, accountId, year } =
      this.state;

    if (!fromDate || !toDate) {
      return;
    }

    this.setState({ loading: true, tableUpdating: true });

    let viewType = "ledger";
    if (selectedTab === 1) viewType = "daybook";
    else if (selectedTab === 2) viewType = "trial_balance";

    const params = {
      view_type: viewType,
      from_date: fromDate,
      to_date: toDate,
      account_type: accountType,
      account_id: accountId || undefined,
      academic_year: year || undefined,
    };

    getRequest(GET_URL.tally.api, params)
      .then((response) => {
        try {
          if (response && response.status === 200 && response.data) {
            const data = response.data.data || [];
            const columns = this.getColumns(selectedTab);

            let tableData = {
              columns: columns,
              data: data,
              options: {
                pagination: false, // Disable server-side pagination for now
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

            if (selectedTab === 0) {
              // Ledger view
              this.setState({
                tableData: tableData,
                summary: response.data.summary || [],
                totalDebit: response.data.total_debit || 0,
                totalCredit: response.data.total_credit || 0,
                loading: false,
                tableUpdating: false,
              });
            } else if (selectedTab === 1) {
              // Day Book view
              this.setState({
                tableData: tableData,
                dailySummary: response.data.daily_summary || [],
                totalDebit: response.data.total_debit || 0,
                totalCredit: response.data.total_credit || 0,
                loading: false,
                tableUpdating: false,
              });
            } else if (selectedTab === 2) {
              // Trial Balance view
              this.setState({
                tableData: tableData,
                totalDebit: response.data.total_debit || 0,
                totalCredit: response.data.total_credit || 0,
                loading: false,
                tableUpdating: false,
              });
            }
          } else {
            this.setState({ loading: false, tableUpdating: false });
          }
        } catch (error) {
          console.error("Error processing tally data:", error);
          this.setState({ loading: false, tableUpdating: false });
        }
      })
      .catch((error) => {
        console.error("Error fetching tally data:", error);
        this.setState({ loading: false, tableUpdating: false });
      });
  };

  getColumns = (tabIndex) => {
    if (tabIndex === 0) {
      // Ledger columns
      return [
        {
          name: "date",
          label: "Date",
          options: {
            customBodyRender: (value) => {
              return value ? dateFormat(value) : "";
            },
          },
        },
        {
          name: "voucher_type",
          label: "Voucher Type",
        },
        {
          name: "voucher_no",
          label: "Voucher No",
        },
        {
          name: "account",
          label: "Account",
        },
        {
          name: "particulars",
          label: "Particulars",
        },
        {
          name: "debit",
          label: "Debit",
          options: {
            customBodyRender: (value) => {
              return value && typeof value === 'number' ? numberWithCommas(value.toFixed(2)) : "0.00";
            },
          },
        },
        {
          name: "credit",
          label: "Credit",
          options: {
            customBodyRender: (value) => {
              return value && typeof value === 'number' ? numberWithCommas(value.toFixed(2)) : "0.00";
            },
          },
        },
        {
          name: "balance",
          label: "Balance",
          options: {
            customBodyRender: (value) => {
              return value && typeof value === 'number' ? numberWithCommas(value.toFixed(2)) : "0.00";
            },
          },
        },
        {
          name: "mode_of_payment",
          label: "Mode of Payment",
        },
        {
          name: "reference",
          label: "Reference",
        },
      ];
    } else if (tabIndex === 1) {
      // Day Book columns
      return [
        {
          name: "date",
          label: "Date",
          options: {
            customBodyRender: (value) => {
              return value ? dateFormat(value) : "";
            },
          },
        },
        {
          name: "voucher_type",
          label: "Voucher Type",
        },
        {
          name: "voucher_no",
          label: "Voucher No",
        },
        {
          name: "account",
          label: "Account",
        },
        {
          name: "particulars",
          label: "Particulars",
        },
        {
          name: "debit",
          label: "Debit",
          options: {
            customBodyRender: (value) => {
              return value && typeof value === 'number' ? numberWithCommas(value.toFixed(2)) : "0.00";
            },
          },
        },
        {
          name: "credit",
          label: "Credit",
          options: {
            customBodyRender: (value) => {
              return value && typeof value === 'number' ? numberWithCommas(value.toFixed(2)) : "0.00";
            },
          },
        },
        {
          name: "mode_of_payment",
          label: "Mode of Payment",
        },
        {
          name: "reference",
          label: "Reference",
        },
      ];
    } else {
      // Trial Balance columns
      return [
        {
          name: "account_name",
          label: "Account Name",
        },
        {
          name: "account_type",
          label: "Account Type",
        },
        {
          name: "debit",
          label: "Debit",
          options: {
            customBodyRender: (value) => {
              return value && typeof value === 'number' ? numberWithCommas(value.toFixed(2)) : "0.00";
            },
          },
        },
        {
          name: "credit",
          label: "Credit",
          options: {
            customBodyRender: (value) => {
              return value && typeof value === 'number' ? numberWithCommas(value.toFixed(2)) : "0.00";
            },
          },
        },
        {
          name: "balance",
          label: "Balance",
          options: {
            customBodyRender: (value) => {
              const numValue = value && typeof value === 'number' ? value : 0;
              const color = numValue >= 0 ? "green" : "red";
              return (
                <span style={{ color: color }}>
                  {numberWithCommas(numValue.toFixed(2))}
                </span>
              );
            },
          },
        },
      ];
    }
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
          dateRangeValue: `${format(
            new Date(dateRange.start),
            "dd/MM/yyyy"
          )} - ${format(new Date(dateRange.end), "dd/MM/yyyy")}`,
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

  renderSummary = () => {
    const { selectedTab, summary, dailySummary, totalDebit, totalCredit } =
      this.state;

    if (selectedTab === 0) {
      // Ledger summary
      return (
        <Card style={{ marginBottom: 20 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Account Summary
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
    } else if (selectedTab === 1) {
      // Day Book summary
      return (
        <Card style={{ marginBottom: 20 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Daily Summary
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
    } else {
      // Trial Balance summary
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
                    {numberWithCommas(difference.toFixed(2))}
                  </strong>
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      );
    }
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
    } = this.state;

    const filteredAccountList = accountList.filter(
      (acc) => acc.type === accountType || accountType === "all"
    );

    return (
      <Fragment>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper style={{ padding: 20 }}>
              <Typography variant="h5" gutterBottom>
                Tally View - Accounting Ledger
              </Typography>

              {/* Filters */}
              <Grid container spacing={2} style={{ marginTop: 10 }}>
                <Grid item xs={12} md={3}>
                  <Dropdown
                    label="Academic Year"
                    name="year"
                    value={year}
                    onChange={this.handleYearChange}
                    data={yearList || []}
                    customName="name"
                    customId="id"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Dropdown
                    label="Account Type"
                    name="accountType"
                    value={accountType}
                    onChange={this.handleAccountTypeChange}
                    data={[
                      { id: "all", name: "All" },
                      { id: "student", name: "Student" },
                      { id: "fee_type", name: "Fee Type" },
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
                    options={filteredAccountList && filteredAccountList.length > 0 ? filteredAccountList.map((acc) => ({
                      value: acc.id,
                      label: acc.display_name || acc.name || `Account ${acc.id}`,
                    })) : []}
                    disabled={accountType === "all"}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <DateRange
                    handleChange={this.handleDateRangeChange}
                    startDate={this.state.fromDate}
                    endDate={this.state.toDate}
                    label="Date Range"
                  />
                </Grid>
              </Grid>

              {/* Tabs */}
              <Tabs
                value={selectedTab}
                onChange={this.handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                style={{ marginTop: 20 }}
              >
                <Tab label="Ledger" />
                <Tab label="Day Book" />
                <Tab label="Trial Balance" />
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
          </Grid>
        </Grid>
      </Fragment>
    );
  }
}

const mapStateToProps = createStructuredSelector({
  getAcademicYearList: makeSelectAcademicYear(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ setAcademicYear }, dispatch);
}

export default withRouter(
  connect(mapStateToProps, mapDispatchToProps)(TallyView)
);

