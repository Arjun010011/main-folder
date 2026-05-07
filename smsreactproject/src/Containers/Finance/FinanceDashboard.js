import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import {
  Grid,
  Paper,
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Button,
  IconButton,
  Tooltip,
} from "@material-ui/core";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { numberWithCommas, dateFormat, checkLocalAcademicYear, SetAcademicYear } from "Includes/functions";
import { Dropdown } from "Components/DropDown";
import loadingBar from "images/loading.gif";
import * as XLSX from "xlsx";
import GetAppIcon from "@material-ui/icons/GetApp";
import PictureAsPdfIcon from "@material-ui/icons/PictureAsPdf";
import Chart from "react-apexcharts";
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Payment,
  Receipt,
  Assessment,
  Refresh,
} from "@material-ui/icons";

// Redux
import { createStructuredSelector } from "reselect";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { makeSelectAcademicYear } from "Components/CommonComponent/selectors";
import { setAcademicYear } from "Components/CommonComponent/actions";

class FinanceDashboard extends Component {
  constructor() {
    super();
    this.state = {
      loading: true,
      dashboardData: null,
      // If user didn't force recalculation, backend serves cached calculations.
      dataSource: "cached", // "live" | "cached"
      yearList: [],
      selectedYear: null,
      standardList: [],
      selectedStandard: null,
      activeTab: 0,
    };
  }

  componentDidMount() {
    this.getYearList();
  }

  getYearList = () => {
    // Check if year list is available from props (Redux store)
    let storedYearList = this.props.getAcademicYearList;
    
    // Handle Immutable.js objects from Redux
    if (storedYearList && typeof storedYearList.toJS === 'function') {
      storedYearList = storedYearList.toJS();
    }
    
    // Check if storedYearList is actually an array
    if (storedYearList && Array.isArray(storedYearList) && storedYearList.length > 0) {
      this.setFinanceDashboardAcademicYear(storedYearList);
      return;
    }
    
    // If not in Redux or not valid, fetch from API
    const params = { is_active: true, is_finance_page: true };
    getRequest(GET_URL.getacademicyear.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          let yearList = response.data.data || response.data || [];
          if (Array.isArray(yearList) && yearList.length > 0) {
            this.setFinanceDashboardAcademicYear(yearList);
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

  setFinanceDashboardAcademicYear = (yearList) => {
    // Ensure yearList is an array
    if (!Array.isArray(yearList) || yearList.length === 0) {
      console.error("Invalid yearList:", yearList);
      this.setState({ loading: false, yearList: [] });
      return;
    }
    
    // Add year_name field if not present (for Dropdown component)
    yearList = yearList.map(year => {
      if (!year.year_name && year.name) {
        year.year_name = year.name;
      } else if (!year.year_name && year.start_date && year.end_date) {
        const startYear = new Date(year.start_date).getFullYear();
        const endYear = new Date(year.end_date).getFullYear();
        year.year_name = `${startYear}-${endYear}`;
      }
      return year;
    });
    
    const yearId = checkLocalAcademicYear(yearList);
    const selectedYear = yearId !== 0 
      ? yearList.find(year => year.id === yearId) || (yearList.length > 0 ? yearList[0] : null)
      : (yearList.length > 0 ? yearList[0] : null);
    
    this.setState(
      {
        yearList: yearList,
        selectedYear: selectedYear,
        loading: false,
      },
      () => {
        if (this.state.selectedYear) {
          this.getStandardList();
        }
      }
    );
  };

  getStandardList = () => {
    const { selectedYear } = this.state;
    if (!selectedYear || !selectedYear.id) {
      this.setState({ standardList: [], selectedStandard: null, loading: false });
      return;
    }

    this.setState({ loading: true, standardList: [] });
    const params = { academic_year: selectedYear.id, is_finance_page: true };
    getRequest(
      GET_URL.getstandard.api,
      params,
      this.props
    ).then((response) => {
      if (response && response.status === 200) {
        const standardList = response.data.data || response.data || [];
        this.setState(
          {
            standardList: standardList,
            selectedStandard: null,
          },
          () => {
            this.getDashboardData();
          }
        );
      } else {
        this.setState({ loading: false, standardList: [] });
      }
    }).catch((error) => {
      console.error("Error fetching standard list:", error);
      this.setState({ loading: false, standardList: [] });
    });
  };

  getDashboardData = (forceRecalculate = false) => {
    const { selectedYear, selectedStandard } = this.state;
    if (!selectedYear || !selectedYear.id) {
      console.warn("Academic year not selected");
      return;
    }

    this.setState({
      loading: true,
      dataSource: forceRecalculate ? "live" : "cached",
    });
    const params = {
      academic_year: selectedYear.id,
    };
    if (selectedStandard && selectedStandard.id) {
      params.standard = selectedStandard.id;
    }
    if (forceRecalculate) {
      params.force_recalculate = '1';
    }

    getRequest(GET_URL.finance_dashboard.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          this.setState({
            dashboardData: response.data.data,
            loading: false,
          });
        } else {
          this.setState({ loading: false });
        }
      })
      .catch((error) => {
        console.error("Error fetching dashboard data:", error);
        this.setState({ loading: false });
      });
  };

  onChangeYear = (e, index) => {
    const selectedId = parseInt(e.target.value);
    if (selectedId && selectedId !== 0) {
      const selectedYear = this.state.yearList.find(year => year.id === selectedId || year.id === parseInt(selectedId));
      if (selectedYear) {
        // Save to localStorage (same as other screens)
        SetAcademicYear(selectedId);
        this.setState({ 
          selectedYear: selectedYear,
          selectedStandard: null,
          dashboardData: null,
          standardList: [],
          loading: true
        }, () => {
          // Clear standard list first, then fetch new standards
          this.getStandardList();
        });
      } else {
        console.error("Year not found in yearList:", selectedId, this.state.yearList);
        this.setState({ 
          selectedYear: null, 
          selectedStandard: null, 
          dashboardData: null,
          standardList: [],
          loading: false
        });
      }
    } else {
      this.setState({ 
        selectedYear: null, 
        selectedStandard: null, 
        dashboardData: null,
        standardList: [],
        loading: false
      });
    }
  };

  onChangeStandard = (e, index) => {
    const selectedId = e.target.value;
    if (selectedId && selectedId !== 0) {
      const selectedStandard = this.state.standardList.find(std => std.id === selectedId);
      if (selectedStandard) {
        this.setState({ selectedStandard: selectedStandard }, () => {
          this.getDashboardData();
        });
      }
    } else {
      this.setState({ selectedStandard: null }, () => {
        this.getDashboardData();
      });
    }
  };

  handleTabChange = (event, newValue) => {
    this.setState({ activeTab: newValue });
  };

  // Helper function to export table data to Excel (XLSX format)
  exportToExcel = (data, headers, filename) => {
    try {
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      
      // Set column widths
      const colWidths = headers.map((header, index) => {
        const maxLength = Math.max(
          header.length,
          ...data.map(row => String(row[index] || "").length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      
      // Generate XLSX file and download
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      // Fallback to CSV if XLSX fails
      let csvContent = "\uFEFF"; // BOM for UTF-8
      csvContent += headers.join(",") + "\n";
      data.forEach((row) => {
        csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",") + "\n";
      });
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Helper function to export table data to PDF (downloads without opening new tab)
  exportToPDF = (tableId, filename) => {
    const table = document.getElementById(tableId);
    if (!table) {
      console.error("Table not found:", tableId);
      return;
    }

    // Create HTML content optimized for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <meta charset="utf-8">
          <style>
            @page { 
              margin: 1cm; 
              size: A4;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              font-size: 10px;
            }
            h2 { 
              margin-bottom: 15px; 
              color: #333;
              text-align: center;
            }
            table { 
              border-collapse: collapse; 
              width: 100%; 
              margin-top: 10px;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 6px; 
              text-align: left; 
            }
            th { 
              background-color: #f2f2f2; 
              font-weight: bold; 
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
          </style>
        </head>
        <body>
          <h2>${filename}</h2>
          ${table.outerHTML}
        </body>
      </html>
    `;

    // Create a completely hidden iframe for PDF generation
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.top = "-9999px";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    // Write content to iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Wait for iframe to load, then trigger print (which allows saving as PDF)
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          
          // Clean up iframe after a delay
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
        } catch (error) {
          console.error("Error printing PDF:", error);
          // Fallback: download as HTML
          const blob = new Blob([htmlContent], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${filename}.html`;
          link.style.visibility = "hidden";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }
      }, 100);
    };

    // Trigger load if already loaded
    if (iframe.contentDocument && iframe.contentDocument.readyState === "complete") {
      iframe.onload();
    }
  };

  renderSummaryCards = () => {
    const { dashboardData } = this.state;
    if (!dashboardData) return null;

    const collectionRate =
      dashboardData.total_fee_amount > 0
        ? (dashboardData.total_collected / dashboardData.total_fee_amount) * 100
        : 0;

    const cards = [
      {
        title: "Total Students",
        value: dashboardData.total_students.toString(),
        icon: <AccountBalance style={{ fontSize: 28, color: "#1976d2" }} />,
        color: "#1976d2",
        bgColor: "#e3f2fd",
      },
      {
        title: "Total Payable Fee Amount",
        value: numberWithCommas(dashboardData.total_fee_amount.toFixed(2)),
        icon: <Receipt style={{ fontSize: 28, color: "#7b1fa2" }} />,
        color: "#7b1fa2",
        bgColor: "#f3e5f5",
      },
      {
        title: "Total Collected",
        value: numberWithCommas(dashboardData.total_collected.toFixed(2)),
        icon: <Payment style={{ fontSize: 28, color: "#388e3c" }} />,
        color: "#388e3c",
        bgColor: "#e8f5e9",
      },
      {
        title: "Total Pending",
        value: numberWithCommas(dashboardData.total_pending.toFixed(2)),
        icon: <TrendingDown style={{ fontSize: 28, color: "#d32f2f" }} />,
        color: "#d32f2f",
        bgColor: "#ffebee",
      },
      {
        title: "Collection Rate",
        value: `${collectionRate.toFixed(2)}%`,
        icon: <TrendingUp style={{ fontSize: 28, color: "#f57c00" }} />,
        color: "#f57c00",
        bgColor: "#fff3e0",
      },
      {
        title: "Total Adjustment",
        value: numberWithCommas(dashboardData.total_adjustment.toFixed(2)),
        icon: <Assessment style={{ fontSize: 28, color: "#0288d1" }} />,
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
                      style={{ fontWeight: 500, marginBottom: "4px", fontSize: "0.75rem" }}
                    >
                      {card.title}
                    </Typography>
                    <Typography
                      variant="h6"
                      style={{ color: card.color, fontWeight: "bold", fontSize: "1rem" }}
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

  renderTermWiseReport = () => {
    const { dashboardData } = this.state;
    if (!dashboardData?.term_breakdown) return null;

    const termData = dashboardData.term_breakdown;
    const terms = Object.keys(termData);
    if (terms.length === 0) return null;

    // Prepare data for export
    const exportData = terms.map((term) => [
      term,
      numberWithCommas((termData[term].total_amount || 0).toFixed(2)),
      numberWithCommas((termData[term].discounted_amount || 0).toFixed(2)),
      numberWithCommas((termData[term].paid_amount || 0).toFixed(2)),
      numberWithCommas((termData[term].pending_amount || 0).toFixed(2)),
      termData[term].student_count || 0,
    ]);
    const exportHeaders = ["Term Name", "Total Amount", "Discounted Amount", "Amount Paid", "Amount Pending", "Total Students Opted"];

    const handleExcelExport = () => {
      this.exportToExcel(exportData, exportHeaders, "Term_wise_Report");
    };

    const handlePDFExport = () => {
      this.exportToPDF("term-wise-table", "Term-wise Fee Report");
    };

    // Calculate totals for footer
    const totals = terms.reduce(
      (acc, term) => {
        acc.total_amount += termData[term].total_amount || 0;
        acc.discounted_amount += termData[term].discounted_amount || 0;
        acc.paid_amount += termData[term].paid_amount || 0;
        acc.pending_amount += termData[term].pending_amount || 0;
        acc.student_count += termData[term].student_count || 0;
        return acc;
      },
      { total_amount: 0, discounted_amount: 0, paid_amount: 0, pending_amount: 0, student_count: 0 }
    );

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper style={{ padding: "24px", borderRadius: "8px" }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5" style={{ fontWeight: "bold" }}>
                Term-wise Fee Report
              </Typography>
              <Box>
                <Tooltip title="Download Excel">
                  <IconButton onClick={handleExcelExport} color="primary">
                    <GetAppIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download PDF">
                  <IconButton onClick={handlePDFExport} color="secondary">
                    <PictureAsPdfIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <TableContainer id="term-wise-table">
              <Table>
              <TableHead>
                <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell style={{ fontWeight: "bold" }}>Term Name</TableCell>
                  <TableCell align="right" style={{ fontWeight: "bold" }}>
                    Total Amount
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: "bold" }}>
                    Discounted Amount
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: "bold" }}>
                    Amount Paid
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: "bold" }}>
                    Amount Pending
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: "bold" }}>
                    Total Students Opted
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {terms.map((term) => (
                  <TableRow key={term} hover>
                    <TableCell>
                      <Chip
                        label={term}
                        color="primary"
                        variant="outlined"
                        style={{ fontWeight: "bold" }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" style={{ fontWeight: "bold", color: "#1976d2" }}>
                        {numberWithCommas((termData[term].total_amount || 0).toFixed(2))}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" style={{ fontWeight: "bold", color: "#2e7d32" }}>
                        {numberWithCommas((termData[term].discounted_amount || 0).toFixed(2))}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" style={{ fontWeight: "bold", color: "#2e7d32" }}>
                        {numberWithCommas((termData[term].paid_amount || 0).toFixed(2))}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" style={{ fontWeight: "bold", color: "#d32f2f" }}>
                        {numberWithCommas((termData[term].pending_amount || 0).toFixed(2))}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" style={{ fontWeight: "bold" }}>
                        {termData[term].student_count || 0}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total Row */}
                <TableRow style={{ backgroundColor: "#f9f9f9" }}>
                  <TableCell style={{ fontWeight: "bold" }}>Total</TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" style={{ fontWeight: "bold", color: "#1976d2" }}>
                      {numberWithCommas(totals.total_amount.toFixed(2))}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" style={{ fontWeight: "bold", color: "#2e7d32" }}>
                      {numberWithCommas(totals.discounted_amount.toFixed(2))}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" style={{ fontWeight: "bold", color: "#2e7d32" }}>
                      {numberWithCommas(totals.paid_amount.toFixed(2))}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" style={{ fontWeight: "bold", color: "#d32f2f" }}>
                      {numberWithCommas(totals.pending_amount.toFixed(2))}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" style={{ fontWeight: "bold" }}>
                      {totals.student_count}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  renderStandardWiseReport = () => {
    const { dashboardData } = this.state;
    if (!dashboardData?.standard_breakdown) return null;

    const standardData = dashboardData.standard_breakdown;
    // Sort standards by sequence
    const standards = Object.keys(standardData).sort((a, b) => {
      const seqA = standardData[a].sequence || 9999;
      const seqB = standardData[b].sequence || 9999;
      return seqA - seqB;
    });
    if (standards.length === 0) return null;

    // Prepare data for export
    const exportData = standards.map((std) => {
      const data = standardData[std];
      const rate = data.collection_rate || 0;
      return [
        std,
        numberWithCommas(data.total_fee.toFixed(2)),
        numberWithCommas(data.total_collected.toFixed(2)),
        numberWithCommas((data.total_discount || 0).toFixed(2)),
        numberWithCommas(data.total_pending.toFixed(2)),
        `${rate.toFixed(1)}%`,
      ];
    });
    const exportHeaders = ["Standard", "Total Amount", "Collected", "Discount", "Pending", "Collection Rate"];

    const handleExcelExport = () => {
      this.exportToExcel(exportData, exportHeaders, "Standard_wise_Report");
    };

    const handlePDFExport = () => {
      this.exportToPDF("standard-wise-table", "Standard-wise Fee Report");
    };

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper style={{ padding: "24px", borderRadius: "8px" }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5" style={{ fontWeight: "bold" }}>
                Standard-wise Fee Report
              </Typography>
              <Box>
                <Tooltip title="Download Excel">
                  <IconButton onClick={handleExcelExport} color="primary">
                    <GetAppIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download PDF">
                  <IconButton onClick={handlePDFExport} color="secondary">
                    <PictureAsPdfIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <TableContainer id="standard-wise-table">
            <Table>
              <TableHead>
                <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell style={{ fontWeight: "bold" }}>Standard</TableCell>
                  <TableCell align="right" style={{ fontWeight: "bold" }}>
                    Total Amount
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: "bold" }}>
                    Collected
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: "bold" }}>
                    Discount
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: "bold" }}>
                    Pending
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: "bold" }}>
                    Collection Rate
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {standards.map((std) => {
                  const data = standardData[std];
                  const rate = data.collection_rate || 0;
                  return (
                    <TableRow key={std} hover>
                      <TableCell>
                        <Chip
                          label={std}
                          color="primary"
                          style={{ fontWeight: "bold" }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" style={{ fontWeight: "bold", color: "#1976d2" }}>
                          {numberWithCommas(data.total_fee.toFixed(2))}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body1"
                          style={{ color: "#388e3c", fontWeight: "bold" }}
                        >
                          {numberWithCommas(data.total_collected.toFixed(2))}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body1"
                          style={{ color: "#f57c00", fontWeight: "bold" }}
                        >
                          {numberWithCommas((data.total_discount || 0).toFixed(2))}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body1"
                          style={{ color: "#d32f2f", fontWeight: "bold" }}
                        >
                          {numberWithCommas(data.total_pending.toFixed(2))}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" alignItems="center" justifyContent="flex-end">
                          <Box width="100px" mr={1}>
                            <LinearProgress
                              variant="determinate"
                              value={rate}
                              style={{
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: "#e0e0e0",
                              }}
                            />
                          </Box>
                          <Typography variant="body2" style={{ minWidth: "50px" }}>
                            {rate.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  renderAreaWisePendingReport = () => {
    const { dashboardData } = this.state;
    if (!dashboardData?.area_wise_pending) return null;

    const areaData = dashboardData.area_wise_pending;
    const areas = Object.keys(areaData);
    if (areas.length === 0) {
      return (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper style={{ padding: "24px", borderRadius: "8px", textAlign: "center" }}>
              <Typography variant="body1" style={{ color: "#999" }}>
                No area-wise pending data available. This report shows transport fee pending amounts for students who have opted for transport and are assigned to areas.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      );
    }

    // Prepare data for export
    const exportData = areas.map((area) => {
      const data = areaData[area];
      return [
        area,
        data.student_count || 0,
        numberWithCommas((data.total_fee || 0).toFixed(2)),
        numberWithCommas((data.total_paid || 0).toFixed(2)),
        numberWithCommas((data.total_pending || 0).toFixed(2)),
      ];
    });
    const exportHeaders = ["Area Name", "Student Count", "Total Fee", "Total Paid", "Total Pending"];

    const handleExcelExport = () => {
      this.exportToExcel(exportData, exportHeaders, "Area_wise_Pending_Report");
    };

    const handlePDFExport = () => {
      this.exportToPDF("area-wise-pending-table", "Area-wise Pending Report");
    };

    // Calculate totals
    const totals = areas.reduce(
      (acc, area) => {
        const data = areaData[area];
        acc.student_count += data.student_count || 0;
        acc.total_fee += data.total_fee || 0;
        acc.total_paid += data.total_paid || 0;
        acc.total_pending += data.total_pending || 0;
        return acc;
      },
      { student_count: 0, total_fee: 0, total_paid: 0, total_pending: 0 }
    );

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper style={{ padding: "24px", borderRadius: "8px" }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5" style={{ fontWeight: "bold" }}>
                Area-wise Pending Report (Transport Fees)
              </Typography>
              <Box>
                <Tooltip title="Download Excel">
                  <IconButton onClick={handleExcelExport} color="primary">
                    <GetAppIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download PDF">
                  <IconButton onClick={handlePDFExport} color="secondary">
                    <PictureAsPdfIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: "16px" }}>
              Shows pending transport fee amounts grouped by area for students who have opted for transport and are assigned to areas.
            </Typography>
            <TableContainer id="area-wise-pending-table">
              <Table>
                <TableHead>
                  <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                    <TableCell style={{ fontWeight: "bold" }}>Area Name</TableCell>
                    <TableCell align="right" style={{ fontWeight: "bold" }}>
                      Student Count
                    </TableCell>
                    <TableCell align="right" style={{ fontWeight: "bold" }}>
                      Total Fee
                    </TableCell>
                    <TableCell align="right" style={{ fontWeight: "bold" }}>
                      Total Paid
                    </TableCell>
                    <TableCell align="right" style={{ fontWeight: "bold" }}>
                      Total Pending
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {areas.map((area) => {
                    const data = areaData[area];
                    return (
                      <TableRow key={area} hover>
                        <TableCell>
                          <Chip
                            label={area}
                            color="primary"
                            style={{ fontWeight: "bold" }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" style={{ fontWeight: "bold" }}>
                            {data.student_count || 0}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" style={{ fontWeight: "bold", color: "#1976d2" }}>
                            {numberWithCommas((data.total_fee || 0).toFixed(2))}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body1"
                            style={{ color: "#388e3c", fontWeight: "bold" }}
                          >
                            {numberWithCommas((data.total_paid || 0).toFixed(2))}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body1"
                            style={{ color: "#d32f2f", fontWeight: "bold" }}
                          >
                            {numberWithCommas((data.total_pending || 0).toFixed(2))}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Total Row */}
                  <TableRow style={{ backgroundColor: "#f5f5f5", fontWeight: "bold" }}>
                    <TableCell>
                      <Typography variant="body1" style={{ fontWeight: "bold" }}>
                        Grand Total
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" style={{ fontWeight: "bold" }}>
                        {totals.student_count}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" style={{ fontWeight: "bold", color: "#1976d2" }}>
                        {numberWithCommas(totals.total_fee.toFixed(2))}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" style={{ fontWeight: "bold", color: "#388e3c" }}>
                        {numberWithCommas(totals.total_paid.toFixed(2))}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" style={{ fontWeight: "bold", color: "#d32f2f" }}>
                        {numberWithCommas(totals.total_pending.toFixed(2))}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  renderFeeTypeWiseReport = () => {
    const { dashboardData } = this.state;
    if (!dashboardData?.fee_type_detailed) return null;

    const feeTypeData = dashboardData.fee_type_detailed;
    const feeTypes = Object.keys(feeTypeData);
    if (feeTypes.length === 0) return null;

    // Prepare data for export (same structure as term-wise report)
    const exportData = feeTypes.map((type) => [
        type,
      numberWithCommas((feeTypeData[type].total_amount || 0).toFixed(2)),
      numberWithCommas((feeTypeData[type].discounted_amount || 0).toFixed(2)),
      numberWithCommas((feeTypeData[type].paid_amount || 0).toFixed(2)),
      numberWithCommas((feeTypeData[type].pending_amount || 0).toFixed(2)),
      feeTypeData[type].student_count || 0,
    ]);
    const exportHeaders = ["Fee Type Name", "Total Amount", "Discounted Amount", "Amount Paid", "Amount Pending", "Total Students Opted"];

    const handleExcelExport = () => {
      this.exportToExcel(exportData, exportHeaders, "Fee_Type_wise_Report");
    };

    const handlePDFExport = () => {
      this.exportToPDF("fee-type-wise-table", "Fee Type-wise Fee Report");
    };

    // Calculate totals for footer (same as term-wise report)
    const totals = feeTypes.reduce(
      (acc, type) => {
        acc.total_amount += feeTypeData[type].total_amount || 0;
        acc.discounted_amount += feeTypeData[type].discounted_amount || 0;
        acc.paid_amount += feeTypeData[type].paid_amount || 0;
        acc.pending_amount += feeTypeData[type].pending_amount || 0;
        acc.student_count += feeTypeData[type].student_count || 0;
        return acc;
      },
      { total_amount: 0, discounted_amount: 0, paid_amount: 0, pending_amount: 0, student_count: 0 }
    );

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper style={{ padding: "24px", borderRadius: "8px" }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5" style={{ fontWeight: "bold" }}>
                Fee Type-wise Fee Report
              </Typography>
              <Box>
                <Tooltip title="Download Excel">
                  <IconButton onClick={handleExcelExport} color="primary">
                    <GetAppIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download PDF">
                  <IconButton onClick={handlePDFExport} color="secondary">
                    <PictureAsPdfIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <TableContainer id="fee-type-wise-table">
            <Table>
              <TableHead>
                <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                  <TableCell style={{ fontWeight: "bold" }}>Fee Type Name</TableCell>
                  <TableCell align="right" style={{ fontWeight: "bold" }}>
                    Total Amount
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: "bold" }}>
                    Discounted Amount
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: "bold" }}>
                    Amount Paid
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: "bold" }}>
                    Amount Pending
                  </TableCell>
                  <TableCell align="right" style={{ fontWeight: "bold" }}>
                    Total Students Opted
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {feeTypes.map((type) => (
                    <TableRow key={type} hover>
                      <TableCell>
                      <Chip
                        label={type}
                        color="primary"
                        variant="outlined"
                        style={{ fontWeight: "bold" }}
                      />
                      </TableCell>
                      <TableCell align="right">
                      <Typography variant="body1" style={{ fontWeight: "bold", color: "#1976d2" }}>
                        {numberWithCommas((feeTypeData[type].total_amount || 0).toFixed(2))}
                      </Typography>
                      </TableCell>
                      <TableCell align="right">
                      <Typography variant="body1" style={{ fontWeight: "bold", color: "#2e7d32" }}>
                        {numberWithCommas((feeTypeData[type].discounted_amount || 0).toFixed(2))}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                      <Typography variant="body1" style={{ fontWeight: "bold", color: "#2e7d32" }}>
                        {numberWithCommas((feeTypeData[type].paid_amount || 0).toFixed(2))}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                      <Typography variant="body1" style={{ fontWeight: "bold", color: "#d32f2f" }}>
                        {numberWithCommas((feeTypeData[type].pending_amount || 0).toFixed(2))}
                      </Typography>
                      </TableCell>
                    <TableCell align="right">
                      <Typography variant="body1" style={{ fontWeight: "bold" }}>
                        {feeTypeData[type].student_count || 0}
              </Typography>
                  </TableCell>
                </TableRow>
                ))}
                {/* Total Row */}
                <TableRow style={{ backgroundColor: "#f9f9f9" }}>
                  <TableCell style={{ fontWeight: "bold" }}>Total</TableCell>
                        <TableCell align="right">
                    <Typography variant="body1" style={{ fontWeight: "bold", color: "#1976d2" }}>
                      {numberWithCommas(totals.total_amount.toFixed(2))}
                    </Typography>
                        </TableCell>
                        <TableCell align="right">
                    <Typography variant="body1" style={{ fontWeight: "bold", color: "#2e7d32" }}>
                      {numberWithCommas(totals.discounted_amount.toFixed(2))}
                    </Typography>
                        </TableCell>
                        <TableCell align="right">
                    <Typography variant="body1" style={{ fontWeight: "bold", color: "#2e7d32" }}>
                      {numberWithCommas(totals.paid_amount.toFixed(2))}
                    </Typography>
                        </TableCell>
                        <TableCell align="right">
                    <Typography variant="body1" style={{ fontWeight: "bold", color: "#d32f2f" }}>
                      {numberWithCommas(totals.pending_amount.toFixed(2))}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" style={{ fontWeight: "bold" }}>
                      {totals.student_count}
                          </Typography>
                        </TableCell>
                      </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    );
  };


  renderOverview = () => {
    const { dashboardData, loading } = this.state;
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    }
    if (!dashboardData) {
      return (
        <Box style={{ padding: "40px", textAlign: "center", color: "#999" }}>
          <Typography variant="body1">No dashboard data available. Please select an academic year.</Typography>
        </Box>
      );
    }

    // Monthly Collection Data
    const monthlyCollection = dashboardData.monthly_collection || {};
    const monthlyData = Object.entries(monthlyCollection).map(([key, value]) => {
      const item = typeof value === 'object' && value !== null ? value : { total: value || 0, count: 0 };
      return {
        month: key,
        total: item.total || 0,
        count: item.count || 0,
      };
    });

    const handleMonthlyExcelExport = () => {
      const exportData = monthlyData.map((row) => [row.month, numberWithCommas(row.total.toFixed(2)), row.count]);
      this.exportToExcel(exportData, ["Month", "Total Collection", "Transaction Count"], "Monthly_Collection");
    };

    const handleMonthlyPDFExport = () => {
      this.exportToPDF("monthly-collection-table", "Monthly Collection");
    };

    return (
      <Box>
        <Typography variant="h5" gutterBottom style={{ fontWeight: "bold", marginBottom: "20px" }}>
          Finance Dashboard Overview
        </Typography>
        <Typography variant="body1" style={{ color: "#666", marginBottom: "30px" }}>
          View detailed reports and graphs in the respective tabs above.
        </Typography>

        {/* Monthly Collection Table */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper style={{ padding: "24px", borderRadius: "8px" }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" style={{ fontWeight: "bold" }}>
                  Monthly Collection
                </Typography>
                <Box>
                  <Tooltip title="Download Excel">
                    <IconButton onClick={handleMonthlyExcelExport} color="primary" size="small">
                      <GetAppIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download PDF">
                    <IconButton onClick={handleMonthlyPDFExport} color="secondary" size="small">
                      <PictureAsPdfIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              {monthlyData.length > 0 ? (
                <TableContainer id="monthly-collection-table">
                  <Table>
                    <TableHead>
                      <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                        <TableCell style={{ fontWeight: "bold" }}>Month</TableCell>
                        <TableCell align="right" style={{ fontWeight: "bold" }}>Total Collection</TableCell>
                        <TableCell align="right" style={{ fontWeight: "bold" }}>Transaction Count</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {monthlyData.map((row, index) => (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Chip label={row.month} color="default" variant="outlined" style={{ fontWeight: "bold" }} />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body1" style={{ fontWeight: "bold", color: "#388e3c" }}>
                              {numberWithCommas(row.total.toFixed(2))}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">{row.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box style={{ padding: "40px", textAlign: "center", color: "#999" }}>
                  <Typography variant="body1">No monthly collection data available</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  renderOverviewCharts = () => {
    const { dashboardData, loading } = this.state;
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    }
    if (!dashboardData) {
      return (
        <Box style={{ padding: "40px", textAlign: "center", color: "#999" }}>
          <Typography variant="body1">No dashboard data available. Please select an academic year.</Typography>
        </Box>
      );
    }

    // Monthly Collection Data
    const monthlyCollection = dashboardData.monthly_collection || {};
    const monthlyData = Object.entries(monthlyCollection).map(([key, value]) => {
      const item = typeof value === 'object' && value !== null ? value : { total: value || 0, count: 0 };
      return {
        month: key,
        total: item.total || 0,
        count: item.count || 0,
      };
    }).sort((a, b) => {
      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    });

    // Payment Mode Breakdown Data
    const paymentModeBreakdown = dashboardData.payment_mode_breakdown || {};
    const paymentModeData = Object.entries(paymentModeBreakdown).map(([key, value]) => {
      const item = typeof value === 'object' && value !== null ? value : { total: value || 0, count: 0 };
      return {
        mode: key,
        total: item.total || 0,
        count: item.count || 0,
      };
    });

    // Standard-wise Breakdown Data
    const standardBreakdown = dashboardData.standard_breakdown || {};
    const standardData = Object.entries(standardBreakdown)
      .map(([key, value]) => ({
        standard: key,
        total_fee: value.total_fee || 0,
        total_collected: value.total_collected || 0,
        total_pending: value.total_pending || 0,
        sequence: value.sequence || 9999,
      }))
      .sort((a, b) => a.sequence - b.sequence);

    // Term-wise Breakdown Data
    const termBreakdown = dashboardData.term_breakdown || {};
    const termData = Object.entries(termBreakdown).map(([key, value]) => ({
      term: key,
      total_amount: value.total_amount || 0,
      paid_amount: value.paid_amount || 0,
      pending_amount: value.pending_amount || 0,
    }));

    // Monthly Collection Chart Options
    const monthlyChartOptions = {
      chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: true },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          endingShape: 'rounded',
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => numberWithCommas(val.toFixed(0)),
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent'],
      },
      xaxis: {
        categories: monthlyData.map(item => item.month),
      },
      yaxis: {
        title: {
          text: 'Amount (₹)',
        },
        labels: {
          formatter: (val) => numberWithCommas(val.toFixed(0)),
        },
      },
      fill: {
        opacity: 1,
      },
      colors: ['#1976d2'],
      tooltip: {
        y: {
          formatter: (val) => `₹ ${numberWithCommas(val.toFixed(2))}`,
        },
      },
    };
    const monthlyChartSeries = [
      {
        name: 'Collection',
        data: monthlyData.map(item => item.total),
      },
    ];

    // Payment Mode Pie Chart Options
    const paymentModeChartOptions = {
      chart: {
        type: 'donut',
        height: 350,
      },
      labels: paymentModeData.map(item => item.mode),
      legend: {
        position: 'bottom',
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => `${val.toFixed(1)}%`,
      },
      colors: ['#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#d32f2f', '#0288d1', '#5d4037', '#455a64'],
      tooltip: {
        y: {
          formatter: (val) => `₹ ${numberWithCommas(val.toFixed(2))}`,
        },
      },
    };
    const paymentModeChartSeries = paymentModeData.map(item => item.total);

    // Standard-wise Collection Chart Options
    const standardChartOptions = {
      chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: true },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          endingShape: 'rounded',
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => numberWithCommas(val.toFixed(0)),
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent'],
      },
      xaxis: {
        categories: standardData.map(item => item.standard),
      },
      yaxis: {
        title: {
          text: 'Amount (₹)',
        },
        labels: {
          formatter: (val) => numberWithCommas(val.toFixed(0)),
        },
      },
      fill: {
        opacity: 1,
      },
      colors: ['#1976d2', '#388e3c', '#d32f2f'],
      tooltip: {
        y: {
          formatter: (val) => `₹ ${numberWithCommas(val.toFixed(2))}`,
        },
      },
      legend: {
        position: 'top',
      },
    };
    const standardChartSeries = [
      {
        name: 'Total Fee',
        data: standardData.map(item => item.total_fee),
      },
      {
        name: 'Collected',
        data: standardData.map(item => item.total_collected),
      },
      {
        name: 'Pending',
        data: standardData.map(item => item.total_pending),
      },
    ];

    // Term-wise Breakdown Chart Options
    const termChartOptions = {
      chart: {
        type: 'bar',
        height: 350,
        toolbar: { show: true },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          endingShape: 'rounded',
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => numberWithCommas(val.toFixed(0)),
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent'],
      },
      xaxis: {
        categories: termData.map(item => item.term),
      },
      yaxis: {
        title: {
          text: 'Amount (₹)',
        },
        labels: {
          formatter: (val) => numberWithCommas(val.toFixed(0)),
        },
      },
      fill: {
        opacity: 1,
      },
      colors: ['#388e3c', '#d32f2f'],
      tooltip: {
        y: {
          formatter: (val) => `₹ ${numberWithCommas(val.toFixed(2))}`,
        },
      },
      legend: {
        position: 'top',
      },
    };
    const termChartSeries = [
      {
        name: 'Paid',
        data: termData.map(item => item.paid_amount),
      },
      {
        name: 'Pending',
        data: termData.map(item => item.pending_amount),
      },
    ];

    return (
      <Grid container spacing={3}>
        {/* Monthly Collection Chart */}
        {monthlyData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper style={{ padding: "24px", borderRadius: "8px" }}>
              <Typography variant="h6" style={{ fontWeight: "bold", marginBottom: "20px" }}>
                Monthly Collection
              </Typography>
              <Chart
                options={monthlyChartOptions}
                series={monthlyChartSeries}
                type="bar"
                height={350}
              />
            </Paper>
          </Grid>
        )}

        {/* Payment Mode Breakdown Chart */}
        {paymentModeData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper style={{ padding: "24px", borderRadius: "8px" }}>
              <Typography variant="h6" style={{ fontWeight: "bold", marginBottom: "20px" }}>
                Payment Mode Breakdown
              </Typography>
              <Chart
                options={paymentModeChartOptions}
                series={paymentModeChartSeries}
                type="donut"
                height={350}
              />
            </Paper>
          </Grid>
        )}

        {/* Standard-wise Collection Chart */}
        {standardData.length > 0 && (
        <Grid item xs={12}>
          <Paper style={{ padding: "24px", borderRadius: "8px" }}>
              <Typography variant="h6" style={{ fontWeight: "bold", marginBottom: "20px" }}>
                Standard-wise Fee Collection
              </Typography>
              <Chart
                options={standardChartOptions}
                series={standardChartSeries}
                type="bar"
                height={350}
              />
            </Paper>
          </Grid>
        )}

        {/* Term-wise Breakdown Chart */}
        {termData.length > 0 && (
          <Grid item xs={12}>
            <Paper style={{ padding: "24px", borderRadius: "8px" }}>
              <Typography variant="h6" style={{ fontWeight: "bold", marginBottom: "20px" }}>
                Term-wise Fee Breakdown
                          </Typography>
              <Chart
                options={termChartOptions}
                series={termChartSeries}
                type="bar"
                height={350}
              />
            </Paper>
          </Grid>
        )}

        {/* Show message if no data */}
        {monthlyData.length === 0 && paymentModeData.length === 0 && standardData.length === 0 && termData.length === 0 && (
          <Grid item xs={12}>
            <Paper style={{ padding: "40px", borderRadius: "8px", textAlign: "center" }}>
              <Typography variant="body1" style={{ color: "#999" }}>
                No chart data available. Please ensure there is financial data for the selected period.
              </Typography>
          </Paper>
        </Grid>
        )}
      </Grid>
    );
  };

  render() {
    const {
      loading,
      dashboardData,
      yearList,
      selectedYear,
      standardList,
      selectedStandard,
      activeTab,
      dataSource,
    } = this.state;

    if (loading && !dashboardData) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <img src={loadingBar} className="loading" alt="loading" />
        </Box>
      );
    }

    return (
      <Box style={{ padding: "20px" }}>
        {/* Filters */}
        <Paper
          style={{
            padding: "20px",
            marginBottom: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          {dashboardData && dataSource === "cached" && (
            <Box
              mb={2}
              p={1.5}
              borderRadius="6px"
              style={{
                backgroundColor: "#FFF3E0",
                border: "1px solid #FFE0B2",
              }}
            >
              <Typography
                variant="body2"
                style={{ color: "#EF6C00", fontWeight: 700 }}
              >
                You are viewing previously saved data, not the latest live data.
                Click the refresh icon to get the latest totals.
              </Typography>
            </Box>
          )}
          <Grid container spacing={2}>
            <Grid item md={4} xs={12}>
              <Dropdown
                data={yearList}
                name="selectedYear"
                value={selectedYear ? parseInt(selectedYear.id) : 0}
                onChange={this.onChangeYear}
                label="Academic Year"
                customName="year_name"
                customId="id"
                required={true}
              />
            </Grid>
            <Grid item md={4} xs={12}>
              <Dropdown
                data={standardList}
                name="selectedStandard"
                value={selectedStandard ? selectedStandard.id : 0}
                onChange={this.onChangeStandard}
                label="Standard (Optional)"
                customName="name"
                customId="id"
                hideSelect={true}
              />
            </Grid>
            <Grid item md={4} xs={12}>
              <Box
                mt={2}
                display="flex"
                alignItems="flex-start"
                gap={2}
                flexWrap="wrap"
              >
                <Box>
                  <Typography
                    variant="caption"
                    style={{
                      color: "#EF6C00",
                      fontWeight: 800,
                      display: "block",
                      lineHeight: 1.2,
                    }}
                  >
                    Last Updated
                  </Typography>
                  <Typography
                    variant="h6"
                    style={{
                      color: "#E65100",
                      fontWeight: 900,
                      lineHeight: 1.2,
                    }}
                  >
                    {dashboardData?.last_calculated
                      ? dateFormat(
                          dashboardData.last_calculated,
                          "DD-MM-YYYY HH:mm"
                        )
                      : "N/A"}
                  </Typography>
                </Box>
                <Tooltip title="Refresh and recalculate dashboard data">
                  <IconButton
                    size="medium"
                    onClick={() => this.getDashboardData(true)}
                    style={{ padding: "8px", marginTop: 2 }}
                    disabled={loading}
                  >
                    <Refresh style={{ fontSize: "26px" }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {dashboardData && (
          <>
            {/* Summary Cards */}
            {this.renderSummaryCards()}

            {/* Tabs for Reports */}
            <Paper style={{ borderRadius: "8px", marginBottom: "20px" }}>
              <Tabs
                value={activeTab}
                onChange={this.handleTabChange}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="Overview" />
                <Tab label="Graphs" />
                <Tab label="Term-wise Report" />
                <Tab label="Standard-wise Report" />
                <Tab label="Fee Type-wise Report" />
                <Tab label="Area-wise Pending Report" />
              </Tabs>
            </Paper>

            {/* Tab Content */}
            <Box style={{ marginTop: "20px" }}>
              {activeTab === 0 && this.renderOverview()}
              {activeTab === 1 && this.renderOverviewCharts()}
              {activeTab === 2 && this.renderTermWiseReport()}
              {activeTab === 3 && this.renderStandardWiseReport()}
              {activeTab === 4 && this.renderFeeTypeWiseReport()}
              {activeTab === 5 && this.renderAreaWisePendingReport()}
            </Box>
          </>
        )}
      </Box>
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
  connect(mapStateToProps, mapDispatchToProps)(FinanceDashboard)
);
