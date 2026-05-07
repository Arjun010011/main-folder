import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import {
  Grid,
  Paper,
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  IconButton,
  Menu,
  MenuItem,
} from "@material-ui/core";
import {
  AccountBalance,
  Payment,
  TrendingUp,
  TrendingDown,
  AccountBalanceWallet,
  Business,
  PictureAsPdf,
} from "@material-ui/icons";
import Swal from "sweetalert2";
import { getRequest } from "Includes/api/apicall";
import { GET_URL, POST_URL } from "Includes/urls";
import { numberWithCommas, getFullName, checkLocalFinancialYear, SetFinancialYear, } from "Includes/functions";
import { Dropdown } from "Components/DropDown";
import loadingBar from "images/loading.gif";

class TransactionSummaryDashboard extends Component {
  constructor() {
    super();
    this.state = {
      loading: true,
      staffList: [],
      bankList: [],
      bankBalances: [],
      staffBalances: [],
      financialYearList: [],
      selectedFinancialYear: '',
      summary: {
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalBankBalance: 0,
        totalCashBalance: 0,
      },
      pdfMenuAnchor: null,
      pollTimer: null,
    };
  }

  componentDidMount() {
    // First fetch financial year list, then staff list and bank list, then fetch summary data
    Promise.all([
      this.getfinancialYearList(),
      this.getStaffList(),
      this.getBankList()
    ]).then(() => {
      this.fetchSummaryData();
    });
  }

  componentWillUnmount() {
    if (this.state.pollTimer) {
      clearInterval(this.state.pollTimer);
    }
  }

  getStaffList = () => {
    return new Promise((resolve) => {
      const url = GET_URL.staff.api;
      const params = { is_active: true };
      getRequest(url, params, this.props)
        .then((response) => {
          if (response && response.status === 200) {
            this.setState({ staffList: response.data.data || [] }, () => {
              resolve();
            });
          } else {
            resolve();
          }
        })
        .catch(() => {
          resolve();
        });
    });
  };

  getBankList = () => {
    return new Promise((resolve) => {
      const url = GET_URL.bankdetail.api;
      const params = { is_active: true };
      if (this.state.selectedFinancialYear) {
        params.financial_year_id = this.state.selectedFinancialYear;
      }
      getRequest(url, params, this.props)
        .then((response) => {
          if (response && response.status === 200) {
            this.setState({ bankList: response.data.data || [] }, () => {
              resolve();
            });
          } else {
            resolve();
          }
        })
        .catch(() => {
          resolve();
        });
    });
  };

  getfinancialYearList = () => {
    return new Promise((resolve) => {
      const url = GET_URL.financialyear.api
      const params = { is_active: true }
      getRequest(url, params, this.props).then(response => {
        if (response && response.status === 200) {
          let fromYear = ''
          let ToYear = ''
          const financialYearList = response.data.data.map((data) => {
            fromYear = data.start_date.split('-');
            ToYear = data.end_date.split('-');
            return {
              ...data,
              name: fromYear[0] + '-' + ToYear[0]
            };
          })

          // Check and set financial year from localStorage
          let selectedYear = checkLocalFinancialYear(financialYearList);
          // If no year from localStorage, use first year as default
          if (!selectedYear && financialYearList.length > 0) {
            selectedYear = financialYearList[0].id;
          }

          this.setState({
            financialYearList: financialYearList,
            selectedFinancialYear: selectedYear || ''
          }, () => {
            resolve();
          });
        } else {
          resolve();
        }
      }).catch(() => {
        resolve();
      });
    });
  }

  handleFinancialYearChange = (e) => {
    const { value, name } = e.target;
    if (value !== 0 && value !== '') {
      this.setState({
        [name]: value,
      }, () => {
        SetFinancialYear(value);
        this.getBankList().then(() => {
          this.fetchSummaryData();
        });
      });
    } else {
      this.setState({
        [name]: '',
      }, () => {
        this.getBankList().then(() => {
          this.fetchSummaryData();
        });
      });
    }
  }

  fetchSummaryData = () => {
    this.setState({ loading: true });
    // Clear any previous poll timer
    if (this.state.pollTimer) {
      clearInterval(this.state.pollTimer);
    }

    const url = GET_URL.depositdata.api;
    const transactionId = Date.now();
    const params = {
      deposit_amount_summary: true,
      long_running_process: 1,
      transaction_id: transactionId,
    };

    // Add financial_year_id if selected
    if (this.state.selectedFinancialYear) {
      params.financial_year_id = this.state.selectedFinancialYear;
    }

    getRequest(url, params, this.props)
      .then((response) => {
        if (response && response.status === 200 && response.data?.Result) {
          // LRP started — poll for result
          let pollCount = 0;
          const timer = setInterval(() => {
            pollCount++;
            if (pollCount > 60) {
              clearInterval(timer);
              this.setState({ loading: false, pollTimer: null });
              return;
            }
            getRequest(
              GET_URL.longprocessingapiresult.api,
              { transaction_id: transactionId, is_active: true },
              this.props
            ).then((res) => {
              if (res?.status === 200 && res.data?.data) {
                const resultData = res.data.data;
                if (resultData.is_process_running === false) {
                  clearInterval(timer);
                  this.setState({ pollTimer: null });
                  if (resultData.result_data && !resultData.result_data.error) {
                    this.handleSummaryResponse(resultData.result_data);
                  } else {
                    this.setState({ loading: false });
                  }
                }
              }
            });
          }, 3000);
          this.setState({ pollTimer: timer });
        } else if (response && response.status === 200) {
          // Fallback: immediate data (non-LRP)
          this.handleSummaryResponse(response.data.data || response.data || {});
        } else {
          this.setState({ loading: false });
        }
      })
      .catch((error) => {
        console.error("Error fetching summary data:", error);
        this.setState({ loading: false });
      });
  };

  handleSummaryResponse = (responseData) => {
    const { staffList } = this.state;

    // Extract totals from response
    const totals = responseData.totals || {};
    const totalDeposits = parseFloat(totals.total_deposits || 0);
    const totalWithdrawals = parseFloat(totals.total_withdrawals || 0);
    const totalBankBalance = parseFloat(totals.total_bank_balance || 0);
    const totalCashBalance = parseFloat(totals.total_cash_in_hand || 0);

    // Extract bank_accounts array
    const bankAccountsList = responseData.bank_accounts || [];

    // Format bank balances
    const formattedBankBalances = bankAccountsList
      .filter((bank) => bank.bank_id !== null)
      .map((bank) => {
        return {
          id: bank.bank_id,
          name: bank.display_name || bank.bank_name || "N/A",
          accountNumber: bank.account_num || "N/A",
          openingBalance: parseFloat(bank.opening_balance || 0),
          closingBalance: parseFloat(bank.closing_balance || 0),
          debit: parseFloat(bank.debit || 0),
          credit: parseFloat(bank.credit || 0),
        };
      });

    // Extract cash_in_hand array and match with staff list
    const cashInHandList = responseData.cash_in_hand || [];

    // Format staff balances by matching user_id with staffList
    const formattedStaffBalances = cashInHandList
      .filter((cashItem) => cashItem.user_id !== null)
      .map((cashItem) => {
        // Find staff by user_id
        const staff = staffList.find((s) => s.user_id === cashItem.user_id);
        let name = "N/A";

        if (staff) {
          name = getFullName(
            staff.first_name,
            staff.middle_name,
            staff.last_name
          ) || staff.username || "N/A";
        } else if (cashItem.name) {
          name = cashItem.name;
        } else if (cashItem.user_id) {
          name = `User ID: ${cashItem.user_id}`;
        }

        return {
          userId: cashItem.user_id,
          id: staff ? staff.id : cashItem.user_id,
          name: name,
          openingBalance: parseFloat(cashItem.opening_balance || 0),
          closingBalance: parseFloat(cashItem.closing_balance || 0),
          debit: parseFloat(cashItem.debit || 0),
          credit: parseFloat(cashItem.credit || 0),
        };
      });

    this.setState({
      summary: {
        totalDeposits,
        totalWithdrawals,
        totalBankBalance,
        totalCashBalance,
      },
      bankBalances: formattedBankBalances,
      staffBalances: formattedStaffBalances,
      loading: false,
    });
  };

  renderSummaryCards = () => {
    const { summary } = this.state;

    const cards = [
      {
        title: "Total Deposits",
        value: numberWithCommas(summary.totalDeposits.toFixed(2)),
        icon: <TrendingUp style={{ fontSize: 28, color: "#388e3c" }} />,
        color: "#388e3c",
        bgColor: "#e8f5e9",
      },
      {
        title: "Total Withdrawals",
        value: numberWithCommas(summary.totalWithdrawals.toFixed(2)),
        icon: <TrendingDown style={{ fontSize: 28, color: "#d32f2f" }} />,
        color: "#d32f2f",
        bgColor: "#ffebee",
      },
      {
        title: "Total Bank Balance",
        value: numberWithCommas(summary.totalBankBalance.toFixed(2)),
        icon: <AccountBalance style={{ fontSize: 28, color: "#7b1fa2" }} />,
        color: "#7b1fa2",
        bgColor: "#f3e5f5",
      },
      {
        title: "Total Cash in Hand",
        value: numberWithCommas(summary.totalCashBalance.toFixed(2)),
        icon: <AccountBalanceWallet style={{ fontSize: 28, color: "#f57c00" }} />,
        color: "#f57c00",
        bgColor: "#fff3e0",
      },
      {
        title: "Grand Total",
        value: numberWithCommas(
          (summary.totalBankBalance + summary.totalCashBalance).toFixed(2)
        ),
        icon: <Business style={{ fontSize: 28, color: "#0288d1" }} />,
        color: "#0288d1",
        bgColor: "#e1f5fe",
      },
    ];

    return (
      <Grid container spacing={2} style={{ marginBottom: "20px" }}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <Card
              style={{
                background: `linear-gradient(135deg, ${card.bgColor} 0%, #ffffff 100%)`,
                borderLeft: `3px solid ${card.color}`,
                height: "100%",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <CardContent style={{ padding: "12px 16px" }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box style={{ flex: 1 }}>
                    <Typography
                      color="textSecondary"
                      variant="caption"
                      style={{
                        fontWeight: 500,
                        marginBottom: "4px",
                        fontSize: "0.75rem",
                      }}
                    >
                      {card.title}
                    </Typography>
                    <Typography
                      variant="h6"
                      style={{
                        color: card.color,
                        fontWeight: "bold",
                        fontSize: "1rem",
                      }}
                    >
                      {card.value}
                    </Typography>
                  </Box>
                  <Box style={{ marginLeft: "8px" }}>{card.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  renderBankBalanceTable = () => {
    const { bankBalances } = this.state;

    return (
      <Paper style={{ marginBottom: "20px" }}>
        <Box p={2}>
          <Typography variant="h6" gutterBottom style={{ fontWeight: "bold" }}>
            Bank-wise Balance Summary
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell style={{ fontWeight: 700, fontSize: "0.95rem" }}>Bank Name</TableCell>
                  <TableCell style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    Account Number
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1976d2" }}>
                    Opening Balance
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 700, fontSize: "0.95rem", color: "#2e7d32" }}>
                    Credit
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 700, fontSize: "0.95rem", color: "#d32f2f" }}>
                    Debit
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 700, fontSize: "0.95rem", color: "#e65100" }}>
                    {(() => {
                      const selectedFY = this.state.financialYearList.find(fy => fy.id === this.state.selectedFinancialYear);
                      return selectedFY && selectedFY.is_locked ? 'Closing Balance' : 'Current Balance';
                    })()}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bankBalances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No bank accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  bankBalances.map((bank) => (
                    <TableRow key={bank.id} hover>
                      <TableCell style={{ fontWeight: 500 }}>{bank.name}</TableCell>
                      <TableCell>{bank.accountNumber}</TableCell>
                      <TableCell align="right" style={{
                        color: "#1976d2",
                        fontWeight: 600,
                        fontSize: "0.95rem"
                      }}>
                        {numberWithCommas(bank.openingBalance.toFixed(2))}
                      </TableCell>
                      <TableCell align="right" style={{
                        color: "#2e7d32",
                        fontWeight: 600,
                        fontSize: "0.95rem"
                      }}>
                        {numberWithCommas(bank.credit.toFixed(2))}
                      </TableCell>
                      <TableCell align="right" style={{
                        color: "#d32f2f",
                        fontWeight: 600,
                        fontSize: "0.95rem"
                      }}>
                        {numberWithCommas(bank.debit.toFixed(2))}
                      </TableCell>
                      <TableCell align="right" style={{
                        color: "#e65100",
                        fontWeight: 600,
                        fontSize: "0.95rem"
                      }}>
                        {numberWithCommas(bank.closingBalance.toFixed(2))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>
    );
  };

  renderStaffBalanceTable = () => {
    const { staffBalances } = this.state;

    return (
      <Paper style={{ marginBottom: "20px" }}>
        <Box p={2}>
          <Typography variant="h6" gutterBottom style={{ fontWeight: "bold" }}>
            User-wise Cash in Hand Summary
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell style={{ fontWeight: 700, fontSize: "0.95rem" }}>Staff Name</TableCell>
                  <TableCell align="right" style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1976d2" }}>
                    Opening Balance
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 700, fontSize: "0.95rem", color: "#2e7d32" }}>
                    Credit
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 700, fontSize: "0.95rem", color: "#d32f2f" }}>
                    Debit
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: 700, fontSize: "0.95rem", color: "#e65100" }}>
                    Closing Balance
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staffBalances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No staff members found
                    </TableCell>
                  </TableRow>
                ) : (
                  staffBalances.map((staff) => (
                    <TableRow key={staff.id} hover>
                      <TableCell style={{ fontWeight: 500 }}>{staff.name}</TableCell>
                      <TableCell align="right" style={{
                        color: "#1976d2",
                        fontWeight: 600,
                        fontSize: "0.95rem"
                      }}>
                        {numberWithCommas(staff.openingBalance.toFixed(2))}
                      </TableCell>
                      <TableCell align="right" style={{
                        color: "#2e7d32",
                        fontWeight: 600,
                        fontSize: "0.95rem"
                      }}>
                        {numberWithCommas(staff.credit.toFixed(2))}
                      </TableCell>
                      <TableCell align="right" style={{
                        color: "#d32f2f",
                        fontWeight: 600,
                        fontSize: "0.95rem"
                      }}>
                        {numberWithCommas(staff.debit.toFixed(2))}
                      </TableCell>
                      <TableCell align="right" style={{
                        color: "#e65100",
                        fontWeight: 600,
                        fontSize: "0.95rem"
                      }}>
                        {numberWithCommas(staff.closingBalance.toFixed(2))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>
    );
  };

  handlePDFMenuOpen = (event) => {
    this.setState({ pdfMenuAnchor: event.currentTarget });
  };

  handlePDFMenuClose = () => {
    this.setState({ pdfMenuAnchor: null });
  };

  handleDownloadPDF = (reportType) => {
    const { selectedFinancialYear } = this.state;

    const params = {
      deposit_amount_summary: true,
      download_pdf: true,
    };

    // Add financial_year_id if selected
    if (selectedFinancialYear) {
      params.financial_year_id = selectedFinancialYear;
    }

    // Add bank_report only if Bank Report is selected
    if (reportType === 'bank') {
      params.bank_report = true;
    }
    // For Cash In Hand Report, don't add bank_report param

    const url = GET_URL.depositdata.api;

    // Create a temporary props object for the API call with blob response type
    const apiProps = {
      ...this.props,
      responseType: 'blob',
    };

    getRequest(url, params, apiProps)
      .then((response) => {
        if (response && response.status === 200) {
          const Data = new Blob([response.data], { type: "application/pdf" });
          const fileURL = URL.createObjectURL(Data);
          const height = (window.screen.height * 75) / 100;
          const width = (window.screen.width * 75) / 100;
          const mywindow = window.open(
            fileURL,
            "PRINT",
            "height=" + height + ",width=" + width + ""
          );
          mywindow.print();
        }
      })
      .catch((error) => {
        console.error("Error downloading PDF:", error);
        Swal.fire({
          type: "error",
          title: "Error",
          text: "Failed to download PDF. Please try again.",
        });
      });

    this.handlePDFMenuClose();
  };

  render() {
    const { loading } = this.state;

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" p={4} style={{ minHeight: '300px' }}>
          <img src={loadingBar} className='loading' alt="Loading..." />
        </Box>
      );
    }

    return (
      <Box p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" style={{ marginBottom: "20px" }}>
          <Typography
            variant="h5"
            style={{ fontWeight: "bold" }}
          >
            Transaction Summary Dashboard
          </Typography>
          <Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PictureAsPdf />}
              onClick={this.handlePDFMenuOpen}
              style={{ marginLeft: "10px" }}
            >
              Download PDF
            </Button>
            <Menu
              anchorEl={this.state.pdfMenuAnchor}
              keepMounted
              open={Boolean(this.state.pdfMenuAnchor)}
              onClose={this.handlePDFMenuClose}
            >
              <MenuItem onClick={() => this.handleDownloadPDF('bank')}>
                Bank Report
              </MenuItem>
              <MenuItem onClick={() => this.handleDownloadPDF('cash')}>
                Cash In Hand Report
              </MenuItem>
            </Menu>
          </Box>
        </Box>
        <Grid container spacing={2} style={{ marginBottom: "20px" }}>
          <Grid item md={4} xs={12}>
            <Dropdown
              data={this.state.financialYearList}
              name="selectedFinancialYear"
              value={this.state.selectedFinancialYear || 0}
              onChange={this.handleFinancialYearChange}
              label="Financial Year"
              customName="name"
              customId="id"
              hideSelect={true}
            />
          </Grid>
        </Grid>


        {/* Summary Cards */}
        {this.renderSummaryCards()}

        {/* Bank Balance Table */}
        {this.renderBankBalanceTable()}

        {/* Staff Balance Table */}
        {this.renderStaffBalanceTable()}
      </Box>
    );
  }
}

export default withRouter(TransactionSummaryDashboard);

