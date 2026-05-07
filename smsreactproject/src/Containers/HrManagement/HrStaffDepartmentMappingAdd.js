import React, { Component } from 'react';
import { Paper, Box, CircularProgress, Grid, Button } from '@material-ui/core';
import Swal from 'sweetalert2';
import { MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import classNames from 'classnames';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link, withRouter } from 'react-router-dom';

import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';
import { Actions } from 'Constants/permissions';
import { Dropdown } from 'Components/DropDown';
import { minDate, maxDate } from 'Constants';
import { dateFormat } from 'Includes/functions';
import '../BasicDetails/styles.scss';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

class HrStaffDepartmentMappingAdd extends Component {
    state = {
        loading: false,
        loadingStaff: false,
        errors: {},
        departmentList: [],
        selectedDepartment: '',
        staffList: [],
        staffIndex: [],
        submitDisable: false,
        open: false,
        alertData: '',
        columns: [
            { name: "full_name", label: "Staff Name", options: { filter: true, sort: true } },
            { name: "mobile_num", label: "Mobile Number", options: { filter: true, sort: true } },
            { name: "group_name", label: "Group Name", options: { filter: true, sort: true } },
            {
                name: "from_date",
                label: "From Date",
                options: {
                    filter: false,
                    sort: false,
                    customBodyRender: (value, tableMeta) => {
                        const rowIndex = tableMeta.rowIndex;
                        const row = this.state.staffList[rowIndex];
                        return (
                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                <KeyboardDatePicker
                                    autoOk
                                    variant="inline"
                                    inputVariant="outlined"
                                    format="dd-MM-yyyy"
                                    value={row?.from_date || null}
                                    onChange={(date) => this.handleRowDateChange(rowIndex, 'from_date', date)}
                                    maxDate={maxDate}
                                    minDate={minDate}
                                    InputProps={{ style: { width: 150, fontSize: 12 } }}
                                />
                            </MuiPickersUtilsProvider>
                        );
                    },
                },
            }
        ]
    };

    componentDidMount() {
        this.getDepartmentList();
        this.loadData();
    }

    handleRowDateChange = (rowIndex, field, date) => {
        this.setState((s) => {
            const staffList = [...s.staffList];
            staffList[rowIndex] = { ...staffList[rowIndex], [field]: date };
            return { staffList };
        });
    };

    getDepartmentList = () => {
        getRequest(GET_URL.hr_department.api, { is_active: true }, this.props).then((resp) => {
            if (resp?.status === 200) {
                this.setState({ departmentList: resp.data?.data || [] });
            }
        });
    };

    loadData = async () => {
        this.setState({ loadingStaff: true });
        try {
            // First fetch already-assigned staff IDs
            const mappingResp = await getRequest(GET_URL.department_staff_mapping.api, { is_active: true }, this.props);
            const assignedStaffIds = new Set();
            if (mappingResp?.status === 200) {
                const mappings = mappingResp.data?.data || [];
                mappings.forEach(m => {
                    if (m.staff) assignedStaffIds.add(m.staff);
                });
            }

            // Then fetch all active staff and filter out already-assigned ones
            const response = await getRequest(GET_URL.staffalldetail.api, { employee_status: 'Active' }, this.props);
            if (response?.status === 200) {
                const raw = Array.isArray(response.data) ? response.data : (response.data?.data || []);
                const today = new Date();
                const staffList = raw
                    .filter(staff => !assignedStaffIds.has(staff.id))
                    .map((staff) => {
                        const groupName = staff.users?.groups && staff.users.groups.length > 0
                            ? staff.users.groups.map(g => g.name).join(', ')
                            : '';
                        return {
                            ...staff,
                            full_name: staff.name || staff.first_name || '',
                            group_name: groupName,
                            from_date: today
                        };
                    });
                this.setState({ staffList, loadingStaff: false });
            } else {
                this.setState({ staffList: [], loadingStaff: false });
            }
        } catch {
            this.setState({ staffList: [], loadingStaff: false });
        }
    };

    onChangeDepartment = (e) => {
        const { value } = e.target;
        this.setState((s) => ({
            selectedDepartment: value,
            errors: { ...s.errors, selectedDepartment: null }
        }));
    };

    submit = () => {
        const { staffIndex, staffList, selectedDepartment } = this.state;
        const nextErrors = {};

        if (!selectedDepartment) nextErrors.selectedDepartment = 'Select Department';
        if (!staffIndex || staffIndex.length === 0) {
            nextErrors.staffNotSelected = 'Staff not selected';
            this.setState({ errors: nextErrors, open: true, alertData: 'Select at least One Staff' });
            return;
        }

        const missingDates = [];
        (staffIndex || []).forEach(({ dataIndex }) => {
            const r = staffList[dataIndex];
            if (!r?.from_date) missingDates.push(r?.full_name || r?.id);
        });

        if (missingDates.length) nextErrors.from_date = 'From Date required for all selected staff';

        if (Object.keys(nextErrors).length) {
            this.setState({ errors: nextErrors, open: true, alertData: 'Please fix the errors and try again.' });
            return;
        }

        const payload = staffIndex.map(({ dataIndex }) => {
            const r = staffList[dataIndex];
            return {
                staff: r.id,
                department: selectedDepartment,
                from_date: dateFormat(r.from_date, 'YYYY-MM-DD'),
                is_active: true
            };
        });

        this.setState({ submitDisable: true });
        postRequest(POST_URL.department_staff_mapping.api, payload, this.props).then((response) => {
            if (response && response.status === 200) {
                Swal.fire({
                    position: 'top-end',
                    icon: 'success',
                    title: response.data?.Reason || 'Saved',
                    showConfirmButton: false,
                    timer: 1500,
                });
                this.props.history.push(Actions.hr_assign_department?.view?.url || '/hr/assign/department/list');
            } else {
                this.setState({ open: true, alertData: response?.data?.Reason || 'Failed to save' });
            }
            this.setState({ submitDisable: false });
        }).catch(() => this.setState({ submitDisable: false }));
    };

    handleClose = () => this.setState({ open: false });

    render() {
        const { loading, open, alertData, staffList, staffIndex, departmentList, selectedDepartment, errors, loadingStaff, submitDisable } = this.state;

        const tableOptions = {
            selectableRows: 'multiple',
            onTableChange: (action, tableState) => {
                if (action === 'rowSelectionChange') {
                    this.setState({ staffIndex: tableState.selectedRows.data });
                }
            }
        };

        if (loading) {
            return <Box display="flex"><img src={loadingBar} className="loading" alt="loading" /></Box>;
        }

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className="header-align">
                            <Box className="heading">Assign Department to Staff</Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                <Button
                                    variant="contained"
                                    component={Link} to={Actions.hr_assign_department?.view?.url || '/hr/assign/department/list'}
                                    className="editbutton-view"
                                >
                                    <VisibilityOutlinedIcon className="visibility-icon" /> View Assignments
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    <Grid container spacing={3}>
                        <Grid item md={8} xs={12}>
                            <Paper className="paper-plain-background">
                                <AllMUIDataTable
                                    title={loadingStaff ? <CircularProgress className="white-text" /> : ''}
                                    data={staffList}
                                    columns={this.state.columns}
                                    options={tableOptions}
                                />
                            </Paper>
                        </Grid>
                        <Grid item md={4} xs={12}>
                            <Paper className="paper-plain-background header-align staff-assigned-shift-paper p-b-20px">
                                <Grid item md={12} xs={12} className="p-t-20px">
                                    <Dropdown
                                        data={departmentList}
                                        name="selectedDepartment"
                                        value={selectedDepartment}
                                        onChange={this.onChangeDepartment}
                                        error={errors.selectedDepartment}
                                        label="Select Department"
                                        hideSelect
                                    />
                                </Grid>

                                <Box className="staff-assigned-shift-table">
                                    <Box className="staff-list-assigned-shift">Selected Staff</Box>
                                    {staffIndex.map((data, index) => (
                                        <Box key={index} className="selected-assigned-staff">
                                            {staffList[data.dataIndex]?.full_name || staffList[data.dataIndex]?.user?.username}
                                        </Box>
                                    ))}
                                </Box>

                                <Box className="assign-shift-submit-position">
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={this.submit}
                                        disabled={submitDisable}
                                    >
                                        Submit
                                    </Button>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>

                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                    <Alert onClose={this.handleClose} severity="error">{alertData}</Alert>
                </Snackbar>
            </Box>
        );
    }
}

export default withRouter(HrStaffDepartmentMappingAdd);
