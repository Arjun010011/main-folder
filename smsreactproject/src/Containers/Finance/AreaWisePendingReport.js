import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import {
  Grid,
  Paper,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
} from "@material-ui/core";
import { Search, Print } from "@material-ui/icons";
import { getRequest } from "Includes/api/apicall";
import { GET_URL } from "Includes/urls";
import { numberWithCommas, checkLocalAcademicYear, SetAcademicYear } from "Includes/functions";
import { Dropdown } from "Components/DropDown";
import loadingBar from "images/loading.gif";
import {
  LocationOn,
  People,
  AccountBalance,
  Payment,
  Receipt,
} from "@material-ui/icons";

class AreaWisePendingReport extends Component {
  constructor() {
    super();
    this.state = {
      loading: true,
      reportData: null,
      yearList: [],
      selectedYear: null,
      standardList: [],
      selectedStandard: null,
      areaList: [],
      selectedArea: null,
      selectedAreaId: 0, // Default to "All Areas"
      areaSearchTerm: "",
      dialogOpen: false,
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
      this.setAreaWisePendingReportAcademicYear(storedYearList);
      return;
    }
    
    // If not in Redux or not valid, fetch from API
    const params = { is_active: true };
    getRequest(GET_URL.getacademicyear.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          let yearList = response.data.data || response.data || [];
          if (Array.isArray(yearList) && yearList.length > 0) {
            this.setAreaWisePendingReportAcademicYear(yearList);
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

  setAreaWisePendingReportAcademicYear = (yearList) => {
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
    const params = { academic_year: selectedYear.id };
    getRequest(
      GET_URL.getstandard.api,
      params,
      this.props
    ).then((response) => {
      if (response && response.status === 200) {
        const standardList = response.data.data || response.data || [];
        this.setState(
          {
            standardList: [{ id: 0, name: "All Standards" }, ...standardList],
            selectedStandard: null,
          },
          () => {
            this.getAreaList();
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

  getAreaList = () => {
    const params = { is_active: true };
    getRequest(GET_URL.area.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          const areaList = response.data.data || response.data || [];
          this.setState(
            {
              areaList: [{ id: 0, name: "All Areas" }, ...areaList],
              selectedAreaId: 0, // Set to 0 (All Areas) by default
            },
            () => {
              this.getReportData();
            }
          );
        } else {
          this.setState({ loading: false, areaList: [] });
        }
      })
      .catch((error) => {
        console.error("Error fetching area list:", error);
        this.setState({ loading: false, areaList: [] });
      });
  };

  getReportData = () => {
    const { selectedYear, selectedStandard, selectedAreaId } = this.state;
    if (!selectedYear || !selectedYear.id) {
      console.warn("Academic year not selected");
      return;
    }

    this.setState({ loading: true });
    const params = {
      academic_year: selectedYear.id,
    };
    if (selectedStandard && selectedStandard.id && selectedStandard.id !== 0) {
      params.standard = selectedStandard.id;
    }
    // Only add area parameter if a specific area is selected (not "All Areas" which is 0)
    if (selectedAreaId && selectedAreaId !== 0) {
      params.area = selectedAreaId;
    }

    getRequest(GET_URL.area_wise_pending_report.api, params, this.props)
      .then((response) => {
        if (response && response.status === 200) {
          this.setState({
            reportData: response.data.data,
            loading: false,
          });
        } else {
          this.setState({ loading: false });
        }
      })
      .catch((error) => {
        console.error("Error fetching area-wise pending report:", error);
        this.setState({ loading: false });
      });
  };

  onChangeYear = (e, index) => {
    // Prevent changing year while loading
    if (this.state.loading) {
      return;
    }
    
    const selectedId = parseInt(e.target.value);
    if (selectedId && selectedId !== 0) {
      const selectedYear = this.state.yearList.find(year => year.id === selectedId || year.id === parseInt(selectedId));
      if (selectedYear) {
        SetAcademicYear(selectedId);
        this.setState({ 
          selectedYear: selectedYear,
          selectedStandard: null,
          selectedAreaId: 0, // Reset to "All Areas"
          reportData: null,
          standardList: [],
          areaList: [],
          loading: true
        }, () => {
          this.getStandardList();
        });
      }
    }
  };

  onChangeStandard = (e, index) => {
    // Prevent changing standard while loading
    if (this.state.loading) {
      return;
    }
    
    const selectedId = e.target.value;
    if (selectedId && selectedId !== 0) {
      const selectedStandard = this.state.standardList.find(std => std.id === selectedId);
      if (selectedStandard) {
        this.setState({ selectedStandard: selectedStandard }, () => {
          this.getReportData();
        });
      }
    } else {
      this.setState({ selectedStandard: null }, () => {
        this.getReportData();
      });
    }
  };

  onChangeArea = (e, index) => {
    // Prevent changing area while loading
    if (this.state.loading) {
      return;
    }
    
    const selectedId = parseInt(e.target.value);
    // Handle "All Areas" (id: 0) explicitly - use 0 as the value
    if (selectedId === 0 || !selectedId) {
      this.setState({ selectedAreaId: 0 }, () => {
        this.getReportData();
      });
    } else {
      const selectedArea = this.state.areaList.find(area => area.id === selectedId);
      if (selectedArea) {
        this.setState({ selectedAreaId: selectedId }, () => {
          this.getReportData();
        });
      }
    }
  };

  handleAreaClick = (area) => {
    this.setState({
      selectedArea: area,
      dialogOpen: true,
    });
  };

  handleCloseDialog = () => {
    this.setState({
      dialogOpen: false,
      selectedArea: null,
    });
  };

  handleAreaSearchChange = (e) => {
    this.setState({
      areaSearchTerm: e.target.value,
    });
  };

  // Print student list
  printStudentList = () => {
    const { selectedArea, selectedYear } = this.state;
    
    if (!selectedArea || !selectedArea.students || selectedArea.students.length === 0) {
      return;
    }

    try {
      // Prepare HTML content for printing
      const areaName = selectedArea.area_name || "Area";
      const yearName = selectedYear?.year_name || "";
      const currentDate = new Date().toLocaleDateString();
      
      // Build table rows
      const tableRows = selectedArea.students.map((studentData, index) => {
        const fullName = [
          studentData.student?.first_name || "",
          studentData.student?.middle_name || "",
          studentData.student?.last_name || ""
        ].filter(Boolean).join(" ");

        return `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${fullName || "N/A"}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${studentData.student?.current_reg_num || "N/A"}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${studentData.standard_name || "N/A"}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${numberWithCommas(studentData.transport_fee_total ? parseFloat(studentData.transport_fee_total).toFixed(2) : "0.00")}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #388e3c;">${numberWithCommas(studentData.transport_fee_paid ? parseFloat(studentData.transport_fee_paid).toFixed(2) : "0.00")}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #d32f2f;">${numberWithCommas(studentData.transport_fee_pending ? parseFloat(studentData.transport_fee_pending).toFixed(2) : "0.00")}</td>
          </tr>
        `;
      }).join("");

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Area-wise Pending Report - ${areaName}</title>
            <style>
              @media print {
                body { margin: 0; padding: 20px; }
                .no-print { display: none; }
              }
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                padding: 0;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #333;
                padding-bottom: 10px;
              }
              .header h2 {
                margin: 5px 0;
                color: #1976d2;
              }
              .summary {
                margin: 15px 0;
                padding: 10px;
                background-color: #f5f5f5;
                border-radius: 4px;
              }
              .summary p {
                margin: 5px 0;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th {
                background-color: #1976d2;
                color: white;
                padding: 12px 8px;
                text-align: left;
                border: 1px solid #ddd;
                font-weight: bold;
              }
              th.text-right {
                text-align: right;
              }
              td {
                padding: 8px;
                border: 1px solid #ddd;
              }
              .footer {
                margin-top: 20px;
                text-align: right;
                font-size: 12px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>Area-wise Pending Report</h2>
              <h3>${areaName}</h3>
            </div>
            <div class="summary">
              <p><strong>Academic Year:</strong> ${yearName}</p>
              <p><strong>Total Students:</strong> ${selectedArea.student_count || 0}</p>
              <p><strong>Total Fee:</strong> ₹${numberWithCommas(selectedArea.total_fee ? parseFloat(selectedArea.total_fee).toFixed(2) : "0.00")}</p>
              <p><strong>Total Paid:</strong> <span style="color: #388e3c;">₹${numberWithCommas(selectedArea.total_paid ? parseFloat(selectedArea.total_paid).toFixed(2) : "0.00")}</span></p>
              <p><strong>Total Pending:</strong> <span style="color: #d32f2f;">₹${numberWithCommas(selectedArea.total_pending ? parseFloat(selectedArea.total_pending).toFixed(2) : "0.00")}</span></p>
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 5%;">S.No</th>
                  <th style="width: 25%;">Student Name</th>
                  <th style="width: 15%;">Admission No</th>
                  <th style="width: 10%;">Standard</th>
                  <th style="width: 15%;" class="text-right">Total Fee</th>
                  <th style="width: 15%;" class="text-right">Paid</th>
                  <th style="width: 15%;" class="text-right">Pending</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            <div class="footer">
              <p>Generated on: ${currentDate}</p>
            </div>
          </body>
        </html>
      `;

      // Open print window
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for content to load, then print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            // Close window after printing (optional)
            printWindow.onafterprint = () => {
              printWindow.close();
            };
          }, 250);
        };
      }
    } catch (error) {
      console.error("Error printing student list:", error);
      alert("Failed to print student list. Please try again.");
    }
  };

  render() {
    const { loading, reportData, yearList, selectedYear, standardList, selectedStandard, areaList, selectedAreaId, selectedArea, areaSearchTerm, dialogOpen } = this.state;
    
    // Filter areas based on search term
    const filteredAreas = reportData && reportData.areas 
      ? reportData.areas.filter(area => 
          area.area_name && 
          area.area_name.toLowerCase().includes(areaSearchTerm.toLowerCase())
        )
      : [];

    return (
      <Box p={3}>
        <Typography variant="h5" gutterBottom style={{ fontWeight: "bold", marginBottom: "20px" }}>
          Area-wise Pending Report
        </Typography>

        {/* Filters */}
        <Paper style={{ padding: "20px", marginBottom: "20px" }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <Dropdown
                data={yearList}
                name="selectedYear"
                value={selectedYear ? parseInt(selectedYear.id) : 0}
                onChange={this.onChangeYear}
                label="Academic Year"
                customName="year_name"
                customId="id"
                required={true}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Dropdown
                data={standardList}
                name="selectedStandard"
                value={selectedStandard ? selectedStandard.id : 0}
                onChange={this.onChangeStandard}
                label="Standard (Optional)"
                customName="name"
                customId="id"
                hideSelect={true}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Dropdown
                data={areaList}
                name="selectedArea"
                value={selectedAreaId !== null && selectedAreaId !== undefined ? selectedAreaId : 0}
                onChange={this.onChangeArea}
                label="Area (Optional)"
                customName="name"
                customId="id"
                hideSelect={true}
                disabled={loading}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Summary Cards */}
        {reportData && reportData.summary && (
          <Grid container spacing={3} style={{ marginBottom: "20px" }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card style={{ backgroundColor: "#e3f2fd" }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <LocationOn style={{ color: "#1976d2", marginRight: "8px" }} />
                    <Typography variant="body2" color="textSecondary">
                      Total Areas
                    </Typography>
                  </Box>
                  <Typography variant="h4" style={{ fontWeight: "bold", color: "#1976d2" }}>
                    {reportData.summary.total_areas || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card style={{ backgroundColor: "#f3e5f5" }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <People style={{ color: "#7b1fa2", marginRight: "8px" }} />
                    <Typography variant="body2" color="textSecondary">
                      Total Students
                    </Typography>
                  </Box>
                  <Typography variant="h4" style={{ fontWeight: "bold", color: "#7b1fa2" }}>
                    {reportData.summary.total_students || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card style={{ backgroundColor: "#e8f5e9" }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Payment style={{ color: "#388e3c", marginRight: "8px" }} />
                    <Typography variant="body2" color="textSecondary">
                      Total Paid
                    </Typography>
                  </Box>
                  <Typography variant="h4" style={{ fontWeight: "bold", color: "#388e3c" }}>
                    {numberWithCommas((reportData.summary.total_paid || 0).toFixed(2))}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card style={{ backgroundColor: "#ffebee" }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Receipt style={{ color: "#d32f2f", marginRight: "8px" }} />
                    <Typography variant="body2" color="textSecondary">
                      Total Pending
                    </Typography>
                  </Box>
                  <Typography variant="h4" style={{ fontWeight: "bold", color: "#d32f2f" }}>
                    {numberWithCommas((reportData.summary.total_pending || 0).toFixed(2))}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Loading */}
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <img src={loadingBar} className="loading" alt="loading" />
          </Box>
        )}

        {/* Areas List */}
        {!loading && reportData && reportData.areas && reportData.areas.length > 0 && (
          <Paper style={{ padding: "24px" }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" style={{ fontWeight: "bold" }}>
                Areas ({filteredAreas.length})
              </Typography>
              <TextField
                placeholder="Search areas..."
                variant="outlined"
                size="small"
                value={areaSearchTerm}
                onChange={this.handleAreaSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                style={{ minWidth: "250px" }}
              />
            </Box>
            {filteredAreas.length > 0 ? (
              <Grid container spacing={3}>
                {filteredAreas.map((area, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card 
                    style={{ 
                      cursor: "pointer",
                      transition: "all 0.3s",
                      border: "1px solid #e0e0e0"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                    onClick={() => this.handleAreaClick(area)}
                  >
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <LocationOn style={{ color: "#1976d2", marginRight: "8px" }} />
                        <Typography variant="h6" style={{ fontWeight: "bold" }}>
                          {area.area_name}
                        </Typography>
                      </Box>
                      <Box mb={1}>
                        <Typography variant="body2" color="textSecondary">
                          Students: <strong>{area.student_count}</strong>
                        </Typography>
                      </Box>
                      <Box mb={1}>
                        <Typography variant="body2" color="textSecondary">
                          Total Fee: <strong style={{ color: "#1976d2" }}>{numberWithCommas(area.total_fee.toFixed(2))}</strong>
                        </Typography>
                      </Box>
                      <Box mb={1}>
                        <Typography variant="body2" color="textSecondary">
                          Paid: <strong style={{ color: "#388e3c" }}>{numberWithCommas(area.total_paid.toFixed(2))}</strong>
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          Pending: <strong style={{ color: "#d32f2f" }}>{numberWithCommas(area.total_pending.toFixed(2))}</strong>
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              </Grid>
            ) : (
              <Box style={{ padding: "40px", textAlign: "center" }}>
                <Typography variant="body1" style={{ color: "#999" }}>
                  No areas found matching "{areaSearchTerm}"
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        {/* No Data Message */}
        {!loading && (!reportData || !reportData.areas || reportData.areas.length === 0) && (
          <Paper style={{ padding: "40px", textAlign: "center" }}>
            <Typography variant="body1" style={{ color: "#999" }}>
              No area-wise pending data available. This report shows transport fee pending amounts for students who have opted for transport and are assigned to areas.
            </Typography>
          </Paper>
        )}

        {/* Student Details Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={this.handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center">
              <LocationOn style={{ color: "#1976d2", marginRight: "8px" }} />
              <Typography variant="h6" style={{ fontWeight: "bold" }}>
                {selectedArea?.area_name} - Student Details
              </Typography>
            </Box>
            <Box mt={2}>
              <Typography variant="body2" color="textSecondary">
                Total Students: <strong>{selectedArea?.student_count}</strong> | 
                Total Fee: <strong>{selectedArea ? numberWithCommas(selectedArea.total_fee.toFixed(2)) : numberWithCommas(0)}</strong> | 
                Paid: <strong style={{ color: "#388e3c" }}>{selectedArea ? numberWithCommas(selectedArea.total_paid.toFixed(2)) : numberWithCommas(0)}</strong> | 
                Pending: <strong style={{ color: "#d32f2f" }}>{selectedArea ? numberWithCommas(selectedArea.total_pending.toFixed(2)) : numberWithCommas(0)}</strong>
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedArea && selectedArea.students && selectedArea.students.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow style={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell style={{ fontWeight: "bold" }}>Student Name</TableCell>
                      <TableCell style={{ fontWeight: "bold" }}>Admission No</TableCell>
                      <TableCell style={{ fontWeight: "bold" }}>Standard</TableCell>
                      <TableCell align="right" style={{ fontWeight: "bold" }}>Total Fee</TableCell>
                      <TableCell align="right" style={{ fontWeight: "bold" }}>Paid</TableCell>
                      <TableCell align="right" style={{ fontWeight: "bold" }}>Pending</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedArea.students.map((studentData, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          {studentData.student?.first_name || ""} {studentData.student?.middle_name || ""} {studentData.student?.last_name || ""}
                        </TableCell>
                        <TableCell>{studentData.student?.current_reg_num || "N/A"}</TableCell>
                        <TableCell>{studentData.standard_name || "N/A"}</TableCell>
                        <TableCell align="right">{numberWithCommas(studentData.transport_fee_total.toFixed(2))}</TableCell>
                        <TableCell align="right" style={{ color: "#388e3c" }}>
                          {numberWithCommas(studentData.transport_fee_paid.toFixed(2))}
                        </TableCell>
                        <TableCell align="right" style={{ color: "#d32f2f" }}>
                          {numberWithCommas(studentData.transport_fee_pending.toFixed(2))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body1" style={{ color: "#999", textAlign: "center", padding: "20px" }}>
                No students found for this area.
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            {selectedArea && selectedArea.students && selectedArea.students.length > 0 && (
              <Button
                onClick={this.printStudentList}
                color="primary"
                variant="outlined"
                startIcon={<Print />}
                style={{ marginRight: "8px" }}
              >
                Print
              </Button>
            )}
            <Button onClick={this.handleCloseDialog} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
}

export default withRouter(AreaWisePendingReport);

