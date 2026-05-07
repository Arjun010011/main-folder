import React, { Component } from "react";
import {
  FormControl, InputLabel, Select, MenuItem, Box, Grid,
  IconButton, Menu, Typography, TextField, Button
} from "@material-ui/core";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import Swal from "sweetalert2";
import MUIDataTable from "mui-datatables";
import { getRequest, putRequest } from "Includes/api/apicall";
import { GET_URL, PUT_URL } from "Includes/urls";

class ApplicationFeesTransaction extends Component {
  state = {
    academicYears: [],
    selectedYear: "",
    standards: [],
    selectedStandard: "",
    transactions: [],
    editingId: null,
    editedDate: "",
    anchorEl: null,
    selectedActionId: null,
  };

  componentDidMount() {
    this.getAcademicYears();
  }

  getAcademicYears = () => {
    getRequest(GET_URL.getacademicyear.api, {}, {}).then((response) => {
      if (response?.status === 200) {
        this.setState({ academicYears: response.data.data });
      }
    });
  };

  getStandards = (academicYearId) => {
    const params = { academic_year: academicYearId, is_active: true };
    getRequest(GET_URL.getstandard.api, params, {}).then((response) => {
      if (response?.status === 200) {
        this.setState({ standards: response.data.data });
      }
    });
  };

  fetchTransactions = (standardId) => {
    const params = { standard_id: standardId };
    getRequest(GET_URL.applicationfeestransaction.api, params, {}).then((response) => {
      if (response?.status === 200) {
        this.setState({ transactions: response.data });
      }
    });
  };

  handleAcademicYearChange = (event) => {
    const selectedYear = event.target.value;
    this.setState({ selectedYear, selectedStandard: "", standards: [], transactions: [] });
    this.getStandards(selectedYear);
  };

  handleStandardChange = (event) => {
    const selectedStandard = event.target.value;
    this.setState({ selectedStandard, transactions: [] });
    this.fetchTransactions(selectedStandard);
  };

  handleEditClick = (id, currentDate) => {
    this.setState({ editingId: id, editedDate: currentDate, anchorEl: null });
  };

  handleDateChange = (e) => {
    this.setState({ editedDate: e.target.value });
  };

  handleSave = () => {
    const { editingId, editedDate } = this.state;
    const url = PUT_URL.applicationfeestransaction.api + editingId + '/';
    const payload = { transaction_date: editedDate };

    putRequest(url, payload, this.props).then(response => {
      if (response?.status === 200) {
        Swal.fire({
          position: 'top-end',
          icon: 'success',
          title: response.data.Reason || "Transaction updated successfully!",
          showConfirmButton: false,
          timer: 1500,
        }).then(() => {
          this.setState({ editingId: null, editedDate: "" });
          this.fetchTransactions(this.state.selectedStandard);
        });
      }
    });
  };

  handleMenuOpen = (event, id) => {
    this.setState({ anchorEl: event.currentTarget, selectedActionId: id });
  };

  handleMenuClose = () => {
    this.setState({ anchorEl: null });
  };

  getFullName = (student) => {
    if (!student) return "";
    return [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ");
  };

  render() {
    const {
      academicYears, selectedYear, standards, selectedStandard,
      transactions, editingId, editedDate, anchorEl, selectedActionId
    } = this.state;

    const columns = [
      { name: "id", label: "ID" },
      {
        name: "student_details",
        label: "Student",
        options: {
          customBodyRender: (value) => this.getFullName(value)
        }
      },
      { name: "amount_paid", label: "Amount" },
      {
        name: "transaction_date",
        label: "Date",
        options: {
          customBodyRenderLite: (dataIndex) => {
            const txn = transactions[dataIndex];
            return editingId === txn.id ? (
              <TextField
                type="date"
                size="small"
                value={editedDate}
                onChange={this.handleDateChange}
              />
            ) : txn.transaction_date;
          }
        }
      },
      {
        name: "actions",
        label: "Actions",
        options: {
          customBodyRenderLite: (dataIndex) => {
            const txn = transactions[dataIndex];
            return (
              <div>
                <IconButton
                  onClick={(e) => this.handleMenuOpen(e, txn.id)}
                  size="small"
                >
                  <MoreVertIcon />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl) && selectedActionId === txn.id}
                  onClose={this.handleMenuClose}
                >
                  <MenuItem onClick={() => this.handleEditClick(txn.id, txn.transaction_date)}   style={{ minWidth: 120 }}>
                    Edit
                  </MenuItem>
                </Menu>
                {editingId === txn.id && (
                  <Box mt={1}>
                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      onClick={this.handleSave}
                      style={{ minWidth: 120 }} 
                    >
                      Save
                    </Button>
                  </Box>
                )}
              </div>
            );
          }
        }
      }
    ];

    const options = {
      filter: true,
      download: true,
      print: true,
      search: true,
      viewColumns: false,
      selectableRows: "none",
      rowsPerPage: 5,
      rowsPerPageOptions: [5, 10, 25],
      responsive: "standard",
      customToolbarSelect: () => {},
    };

    return (
      <Box p={2}>
        <Typography variant="h6" style={{ color: "#4680ff", marginBottom: 16 }}>
          Application Fees Transactions
        </Typography>

        <Grid container spacing={2} alignItems="center" style={{ marginBottom: 24 }}>
          <Grid item xs={12} sm={3}>
            <FormControl variant="outlined" fullWidth size="small">
              <InputLabel>Academic Year</InputLabel>
              <Select
                value={selectedYear}
                onChange={this.handleAcademicYearChange}
                label="Academic Year"
              >
                {academicYears.map((year) => (
                  <MenuItem key={year.id} value={year.id}>
                    {year.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={3}>
            <FormControl variant="outlined" fullWidth size="small">
              <InputLabel>Standard</InputLabel>
              <Select
                value={selectedStandard}
                onChange={this.handleStandardChange}
                label="Standard"
                disabled={!standards.length}
              >
                {standards.map((std) => (
                  <MenuItem key={std.id} value={std.id}>
                    {std.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <MUIDataTable
          data={transactions}
          columns={columns}
          options={options}
        />
      </Box>
    );
  }
}

export default ApplicationFeesTransaction;
