import React, { Component } from 'react';
import {
  Paper,
  Box,
  Grid,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@material-ui/core';
import Swal from 'sweetalert2';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest, putRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import { isUserHasPermission } from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import StudentListActions from 'Includes/StudentListActions'
import classNames from 'classnames';
import SelectedEmployeeTable from 'Components/Shifts/Components/SelectedEmployeeTable';

class ViewAssignTeacher extends Component {
  constructor() {
    super();
    this.state = {
      loading: true,
      tableUpdating: false,
      getAssignTeacherList: [],
      staffList: [],
      openDialog: false,
      selectedRow: null,
      columns: [
        {
          name: 'id',
          label: 'ID',
          options: {
            display: false,
          },
        },
        {
          name: 'standard_name',
          label: 'Standard Name',
        },
        {
          name: 'section_name',
          label: 'Section Name',
        },
        {
          name: 'staff_name',
          label: 'Staff Name',
        },
        {
          name: 'from_date',
          label: 'From Date',
        },
        {
          name: 'to_date',
          label: 'To Date',
        },
        {
          name: 'Actions',
          label: 'Actions',
          options: {
            filter: false,
            sort: false,
            customBodyRender: (_, tableMeta) => (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => this.handleEditClick(tableMeta.rowData)}
                >
                  Edit
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() =>
                    this.deleteExpense(tableMeta.rowData[0], tableMeta.rowIndex)
                  }
                  style={{ marginLeft: '10px' }}
                >
                  Delete
                </Button>
              </>
            ),
          },
        },
      ],
    };
  }

  componentDidMount() {
    this.fetchAssignTeacherList();
    this.fetchStaffList();
  }

  fetchAssignTeacherList = () => {
    const url = GET_URL.staffstandardsectionmapping.api;
    getRequest(url, { is_active: true }, this.props).then((response) => {
      if (response?.status === 200) {
        this.setState({ getAssignTeacherList: response.data.data, loading: false });
      } else {
        Swal.fire('Error', 'Failed to fetch data', 'error');
      }
    });
  };

  fetchStaffList = () => {
    const url = GET_URL.staff.api; // Ensure this endpoint exists
    getRequest(url, {}, this.props).then((response) => {
      if (response?.status === 200) {
        this.setState({ staffList: response.data.data });
      } else {
        Swal.fire('Error', 'Failed to fetch staff list', 'error');
      }
    });
  };

  handleEditClick = (rowData) => {
    const [id, standard_name, section_name, staff_name, from_date, to_date] = rowData;
    // Find the staff ID based on the staff name
    const staff = this.state.staffList.find((s) => s.full_name === staff_name);
  
    this.setState({
      openDialog: true,
      selectedRow: {
        id,
        standard_section: id, // Assuming `id` is used as standard_section
        staff_id: staff?.id || '', // Use staff ID if found
        staff_name,
        from_date,
        to_date,
      },
    });
  };
  

  handleDialogClose = () => {
    this.setState({ openDialog: false, selectedRow: null });
  };

  handleStaffChange = (event) => {
    const selectedStaffId = event.target.value;
    const selectedStaff = this.state.staffList.find((staff) => staff.id === selectedStaffId);
    this.setState((prevState) => ({
      selectedRow: {
        ...prevState.selectedRow,
        staff_id: selectedStaffId,
        staff_name: selectedStaff?.full_name || '',
      },
    }));
  };
  handleDialogSubmit = () => {
    const { selectedRow, getAssignTeacherList } = this.state;
    // Find the corresponding standard_section for the selectedRow
    const selectedItem = getAssignTeacherList.find(item => item.id === selectedRow.standard_section);

    const url = `${PUT_URL.staffstandardsectionmapping.api}${selectedRow.id}/`;
    const data = {
        staff: selectedRow.staff_id,
        standard_section: selectedItem.standard_section, // Use the derived standard_section value
        from_date: selectedRow.from_date,
        to_date: selectedRow.to_date,
    };

    this.setState({ tableUpdating: true });

    putRequest(url, data, this.props)
        .then((response) => {
            if (response?.status === 200) {
                // Update the list with the modified data
                const updatedList = getAssignTeacherList.map((item) =>
                    item.id === selectedRow.id
                        ? {
                              ...item,
                              standard_section: selectedItem.standard_section, // Ensure this is updated
                              staff_name: selectedRow.staff_name,
                              from_date: selectedRow.from_date,
                              to_date: selectedRow.to_date,
                          }
                        : item
                );
                this.setState({
                    getAssignTeacherList: updatedList,
                    openDialog: false,
                    selectedRow: null,
                    tableUpdating: false,
                });
                Swal.fire('Success', 'Data updated successfully', 'success');
            } else {
                Swal.fire('Error', 'Failed to update data', 'error');
                this.setState({ tableUpdating: false });
            }
        })
        .catch((error) => {
            console.error('Error updating data:', error);
            Swal.fire('Error', 'An error occurred while updating data', 'error');
            this.setState({ tableUpdating: false });
        });
};


  deleteExpense = async (id, index) => {
    this.setState({ tableUpdating: true });
    let { getAssignTeacherList, columns } = this.state;
    const del_url = DEL_URL.staffstandardsectionmapping.api;
    const url = del_url + id + '/';
    deleteRequest(url, {}, this.props).then(response => {
        if (response && response.status === 200) {
            getAssignTeacherList.splice(index, 1);
            this.setState({
                getAssignTeacherList,
                columns: [...columns]
            });
            Swal.fire({
            position: 'top-end',
            type: 'success',
            title: response.data.Reason,
            showConfirmButton: false,
            timer: 1500
            });
        }
    });
    this.setState({ tableUpdating: true });
  };

  handleAddExpensesButton = () => {
    this.props.history.push(Actions.standard_assign_teacher.create.url);
  };
  handleDateChange = (field, value) => {
    this.setState((prevState) => ({
      selectedRow: {
        ...prevState.selectedRow,
        [field]: value,
      },
    }));
  };

  render() {
    const { loading, tableUpdating, getAssignTeacherList, columns, openDialog, staffList, selectedRow } =this.state  
    const { isComponent } = this.props;
    let classNamePaper = (isComponent) ? '' : 'paper-background';

    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Box>
        <Paper className={classNamePaper}>
          <Grid container justifyContent="space-between" alignItems="center">
          <Grid item md={6} xs={12} className={classNames('header-align')}>
            <Box className='heading'>
            {Actions.standard_assign_teacher.view.label}
            </Box>
        </Grid>
            <Grid item md={5} xs={12}>
              <Box className={classNames('header-align', 'end-flex-prop')}>
                {isUserHasPermission('standard_assign_teacher', 'create') && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={this.handleAddExpensesButton} // Call the function
                    className="editbutton-view"
                  >
                    <AddCircleOutlineOutlinedIcon className="visibility-icon" /> 
                    {Actions.standard_assign_teacher.create.label}
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
          <Grid container className={classNames('header-align')}>
             <Grid item md={8}>
              <Paper>
          <AllMUIDataTable
            title={tableUpdating ? <CircularProgress size={24} /> : ''}
            data={getAssignTeacherList}
            columns={columns}
            options={{
              selectableRows: 'none', // Disable the checkbox (row selection)
              print: false,
            }}
          />
            </Paper>
          </Grid>
         </Grid>
        </Paper>

        {/* Dialog for Editing */}
        <Dialog open={openDialog} onClose={this.handleDialogClose}>
          <DialogTitle>Edit Teacher Assignment</DialogTitle>
          <DialogContent>
            <FormControl fullWidth>
              <InputLabel>Staff</InputLabel>
              <Select
                value={selectedRow?.staff_id || ''}
                onChange={this.handleStaffChange}
              >
                {staffList.map((staff) => (
                  <MenuItem key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              margin="dense"
              label="From Date"
              type="date"
              value={selectedRow?.from_date || ''}
              InputLabelProps={{ shrink: true }}
              InputProps={{ readOnly: true }} // Makes the field read-only
            />

            <TextField
              fullWidth
              margin="dense"
              label="To Date"
              type="date"
              value={selectedRow?.to_date || ''}
              InputLabelProps={{ shrink: true }}
              InputProps={{ readOnly: true }} // Makes the field read-only
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleDialogClose} color="secondary">
              Cancel
            </Button>
            <Button onClick={this.handleDialogSubmit} color="primary">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
}

export default withRouter(ViewAssignTeacher);
