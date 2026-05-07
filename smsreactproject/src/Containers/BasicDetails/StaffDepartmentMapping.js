import React, { Component } from 'react'
import {
    Paper, FormHelperText, Box, CircularProgress, Grid, Button, Switch, withStyles, FormControlLabel
} from '@material-ui/core';
import Swal from 'sweetalert2'
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import classNames from 'classnames'
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link, withRouter } from 'react-router-dom';

import BlankPagewithIcon from "Components/BlankPageWithIcon/index";
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { Actions } from 'Constants/permissions';
import { Dropdown } from 'Components/DropDown';
import { minDate, maxDate } from 'Constants';
import { dateFormat, validateDate } from 'Includes/functions';
import backGround from 'images/backgroundSchoolView.png'
import './styles.scss'

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const useStyles = {
    divStyle: {
        backgroundRepeat: 'no-repeat',
        backgroundImage: `url(${backGround})`,
        backgroundSize: '105%',
        marginBottom: '40px',
        paddingBottom: '40px'
    },
    loading: {
        marginRight: 'auto',
        marginLeft: 'auto',
        marginTop: '35vh',
        width: '20vh'
    },
    submit: {
        height: '37px',
        marginTop: 'auto',
        marginBottom: '20px',
        marginRight: '20px',
        color: '#ffffff'
    },
};

class StaffDepartmentMapping extends Component {
    state = {
        yearList: [],
        loading: false,
        loadingStaff: false,
        year: '',
        fromDate: '',
        toDate: '',
        errors: {},
        departmentList: [],
        selectedDepartment: '',
        manageyear: { start_date: null, end_date: null },
        staffList: [],
        selectedToggle: 'custom',
        staffIndex: [],
        staffids: [],
        submitDisable: false,
        applyDisable: true,
        enableTitle: false,
        enableTable: false,
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
                                    InputProps={{ style: { width: 140, fontSize: 12 } }}
                                />
                            </MuiPickersUtilsProvider>
                        );
                    },
                },
            },
            {
                name: "is_hod",
                label: "Is HOD",
                options: {
                    filter: true,
                    sort: false,
                    customBodyRender: (value, tableMeta) => {
                        const rowIndex = tableMeta.rowIndex;
                        const row = this.state.staffList[rowIndex];
                        const checked = !!row?.is_hod;

                        return (
                            <div>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={checked}
                                            name="is_hod"
                                            color="primary"
                                            onChange={(e) => this.handleChangePlan(e, rowIndex, "is_hod")}
                                        />
                                    }
                                    label={<div className="text-blue">{checked ? "Yes" : "No"}</div>}
                                />

                                {checked && (
                                    <div style={{ marginTop: 8 }}>
                                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                            <KeyboardDatePicker
                                                autoOk
                                                variant="inline"
                                                inputVariant="outlined"
                                                format="dd-MM-yyyy"
                                                value={row?.from_date_hod || null}
                                                onChange={(date) => this.handleRowDateChange(rowIndex, "from_date_hod", date)}
                                                minDate={minDate}
                                                maxDate={maxDate}
                                                InputProps={{ style: { width: 160, fontSize: 12 } }}
                                                label="From Date HOD"
                                            />
                                        </MuiPickersUtilsProvider>
                                    </div>
                                )}
                            </div>
                        );
                    },
                },
            },
        ]
    }

    componentDidMount = async () => {
        const todayISO = dateFormat(new Date(), 'YYYY-MM-DD');
        await this.getDepartmentList();
        this.getStaffList(todayISO, todayISO);
    };

    handleRowDateChange = (rowIndex, field, date) => {
        this.setState((s) => {
            const staffList = [...s.staffList];
            const row = { ...staffList[rowIndex], [field]: date };
            staffList[rowIndex] = row;
            return { staffList };
        });
    };

    // handleChangePlan = (e, rowIndex, field) => {
    //     const checked = e.target.checked;
    //     this.setState((s) => {
    //         const staffList = [...s.staffList];
    //         const row = { ...staffList[rowIndex], [field]: checked };
    //         if (field === "is_hod") {
    //             row.from_date_hod = checked ? (row.from_date_hod || new Date()) : null;
    //         }
    //         staffList[rowIndex] = row;
    //         return { staffList };
    //     });
    // };
    handleChangePlan = (e, rowIndex, field) => {
        const checked = e.target.checked;
        this.setState((s) => {
            const staffList = [...s.staffList];
            const row = { ...staffList[rowIndex], [field]: checked };
            if (field === "is_hod") {
                row.from_date_hod = checked ? (row.from_date_hod || new Date()) : null;
            }
            staffList[rowIndex] = row;
            return { staffList };
        });
    };


    getDepartmentList = async () => {
        const url = GET_URL.branch.api;
        const param = { is_active: true };
        const resp = await getRequest(url, param, this.props);

        if (resp?.status === 200) {
            const departmentList = (resp.data?.data).map((d) => ({
                id: d.id,
                name: d.name,
            }))
            this.setState({ departmentList });
        }
    };

    onChangeYear = async (e) => {
        const { value } = e.target;
        const { errors, selectedToggle } = this.state;
        if (value !== 0) {
            let fromDate = '', toDate = '', fromDateValue = '', toDateValue = '';
            this.state.yearList.forEach((d) => {
                if (d.id === value) {
                    fromDate = dateFormat(d.start_date, 'DD-MM-YYYY');
                    toDate = dateFormat(d.end_date, 'DD-MM-YYYY');
                    fromDateValue = d.start_date;
                    toDateValue = d.end_date;
                }
            });
            delete errors['year'];
            this.setState({
                year: value, errors, open: false, applyDisable: false,
                fromDate, toDate, staffList: [], staffIndex: [], enableTitle: false,
                fromDateValue, toDateValue,
            }, () => this.applyUpdateStaffList(selectedToggle));
        }
    }

    applyUpdateStaffList = (name) => {
        const { fromDateValue, toDateValue, manageyear, errors } = this.state;
        if (name === 'custom') {
            let ok = true;
            const e1 = validateDate(manageyear.start_date, minDate, maxDate);
            if (e1 !== '') { errors['start_date'] = e1; ok = false; }
            const e2 = validateDate(manageyear.end_date, manageyear.start_date, maxDate);
            if (e2 !== '') { errors['end_date'] = e2; ok = false; }
            this.setState({ errors });
            if (ok) {
                const s = dateFormat(manageyear.start_date, 'YYYY-MM-DD');
                const t = dateFormat(manageyear.end_date, 'YYYY-MM-DD');
                this.getStaffList(s, t);
            }
        } else if (name === 'financial') {
            const s = dateFormat(fromDateValue, 'YYYY-MM-DD');
            const t = dateFormat(toDateValue, 'YYYY-MM-DD');
            this.getStaffList(s, t);
        }
    }

    // getStaffList = () => {
    //     this.setState({ loadingStaff: true });

    //     const url = GET_URL.staffhodbranchmapping.api;

    //     const params = {
    //         is_group_mapped_staff: parseInt(0),
    //     };

    //     getRequest(url, params, this.props)
    //         .then((response) => {
    //             const today = new Date();

    //             if (response?.status === 200) {
    //                 const raw = Array.isArray(response.data)
    //                     ? response.data
    //                     : Array.isArray(response.data?.data)
    //                         ? response.data.data
    //                         : [];

    //                 const staffList = raw.map((staff) => ({
    //                     ...staff,
    //                     is_hod: !!staff.is_hod,
    //                 }));

    //                 this.setState({ staffList });
    //             } else {
    //                 this.setState({ staffList: [] });
    //             }

    //             this.setState({
    //                 loadingStaff: false,
    //                 enableTable: true,
    //             });
    //         })
    //         .catch(() => {
    //             this.setState({ loadingStaff: false, staffList: [], enableTable: true });
    //         });
    // };
    getStaffList = () => {
        this.setState({ loadingStaff: true });

        const url = GET_URL.staffhodbranchmapping.api;
        const params = { is_group_mapped_staff: 0 };

        getRequest(url, params, this.props)
            .then((response) => {
                const today = new Date();

                if (response?.status === 200) {
                    const raw = Array.isArray(response.data)
                        ? response.data
                        : Array.isArray(response.data?.data)
                            ? response.data.data
                            : [];

                    const staffList = raw.map((staff) => ({
                        ...staff,
                        from_date: staff.from_date ? new Date(staff.from_date) : today,
                        is_hod: !!staff.is_hod,
                        from_date_hod: staff.from_date_hod ? new Date(staff.from_date_hod) : null,
                    }));

                    this.setState({ staffList });
                } else {
                    this.setState({ staffList: [] });
                }

                this.setState({ loadingStaff: false, enableTable: true });
            })
            .catch(() => {
                this.setState({ loadingStaff: false, staffList: [], enableTable: true });
            });
    };

    AssignTime = () => {
        let { staffList, manageyear } = this.state;
      
        const updatedStaffList = staffList.map((staff) => ({
          ...staff,
          from_date: manageyear.start_date,
        }));
      
        this.setState({ staffList: updatedStaffList });
      };

    onchangeDepartment = (e) => {
        const { name, value } = e.target;
        let { errors } = this.state;
        if (value !== 0) {
            delete errors[name];
            this.setState({ [name]: value, open: false, errors });
        }
    }

    // submit = async () => {
    //     let { selectedToggle, staffIndex, staffList, manageyear, fromDateValue, toDateValue, selectedShift, errors } = this.state;
    //     this.validate(errors);
    //     if ((Object.keys(errors).length !== 0)) {
    //         this.setState({ errors });
    //         return;
    //     }

    //     const assignments = staffIndex.map(({ dataIndex }) => {
    //         const r = staffList[dataIndex];
    //         return {
    //             staffid: r.id,
    //             fromdate: dateFormat(r.from_date, "YYYY-MM-DD"),
    //             is_hod: !!r.is_hod,
    //             shift: selectedShift,
    //         };
    //     });

    //     const url = POST_URL.assignshift.api;
    //     const postData = { assignments };

    //     this.setState({ submitDisable: true });
    //     postRequest(url, postData, this.props).then((response) => {
    //         if (response && response.status === 200) {
    //             Swal.fire({
    //                 position: 'top-end',
    //                 type: 'success',
    //                 title: response.data.Reason,
    //                 showConfirmButton: false,
    //                 timer: 1500
    //             });
    //             this.props.history.push(Actions.assign_shift.view.url);
    //         }
    //         this.setState({ submitDisable: false });
    //     });
    // }
    validate = (errors) => {
        const { selectedDepartment, staffIndex } = this.state;

        if (!selectedDepartment) {
            errors['selectedDepartment'] = 'Select Department';
        }

        if (!staffIndex || staffIndex.length === 0) {
            errors['staffNotSelected'] = 'Staff not selected';
            this.setState({ open: true, alertData: 'Select at least One Staff' });
        }
    };

    submit = () => {
        const { staffIndex, staffList, selectedDepartment, errors } = this.state;

        const nextErrors = { ...errors };
        if (!selectedDepartment) nextErrors.selectedDepartment = 'Select Department';
        if (!staffIndex || staffIndex.length === 0) nextErrors.staffNotSelected = 'Staff not selected';

        const missingDates = [];
        const missingHodDates = [];
        (staffIndex || []).forEach(({ dataIndex }) => {
            const r = staffList[dataIndex];
            if (!r?.from_date) missingDates.push(r?.full_name || r?.id);
            if (r?.is_hod && !r?.from_date_hod) missingHodDates.push(r?.full_name || r?.id);
        });

        if (missingDates.length) nextErrors.from_date = 'From Date required for all selected staff';
        if (missingHodDates.length) nextErrors.from_date_hod = 'From Date HOD required for selected HODs';

        if (Object.keys(nextErrors).length) {
            this.setState({ errors: nextErrors, open: true, alertData: 'Please fix the errors and try again.' });
            return;
        }

        const staff_list = staffIndex.map(({ dataIndex }) => {
            const r = staffList[dataIndex];
            const item = {
                staff_id: r.id,
                from_date: dateFormat(r.from_date, 'YYYY-MM-DD'),
                is_hod: !!r.is_hod,
            };
            if (item.is_hod && r.from_date_hod) {
                item.from_date_hod = dateFormat(r.from_date_hod, 'YYYY-MM-DD');
            }
            return item;
        });
        const payload = {
            staff_list,
            department_id: selectedDepartment,
        };
        const postUrl = POST_URL.staffhodbranchmapping.api;
        this.setState({ submitDisable: true });
        postRequest(postUrl, payload, this.props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data?.Reason || 'Saved',
                        showConfirmButton: false,
                        timer: 1500,
                    });
                    this.props.history.push(Actions.assign_department.view.url);
                } else {
                    this.setState({ open: true, alertData: response?.data?.Reason || 'Failed to save' });
                }
                this.setState({ submitDisable: false });
            });
    };


    onBlurValidation = (e) => {
        const { errors, manageyear } = this.state;
        const name = e.target.name;
        const value = manageyear[name];
        let minDateValue = minDate;
        if (name === 'end_date') minDateValue = manageyear.start_date;
        const err = validateDate(value, minDateValue, maxDate);
        if (err !== '') {
            errors[name] = err;
            this.setState({ errors, applyDisable: true });
        }
    }

    onChangeDatesYears = (e, date_name) => {
        let { manageyear, applyDisable, errors, selectedToggle } = this.state;
        manageyear[date_name] = e;
        delete errors[date_name];
        if (manageyear['start_date'] && manageyear['end_date']) applyDisable = false;
        this.setState({ manageyear, applyDisable, errors }, () => {
            if (date_name === 'end_date' || (date_name === 'start_date' && Boolean(manageyear['end_date']))) {
                this.applyUpdateStaffList(selectedToggle);
            }
        });
    }

    changeToggle = (event, value) => {
        if (value !== null) {
            this.setState({
                selectedToggle: value,
                enableTitle: false,
                staffList: [],
                staffIndex: [],
                enableTable: false,
                fromDateValue: '',
                toDateValue: '',
                manageyear: { start_date: null, end_date: null },
                year: '',
                applyDisable: true,
            });
        }
    }

    handleClose = () => this.setState({ open: false });

    render() {
        const {
            loading, fromDate, alertData, open, staffList, selectedToggle, staffIndex, toDate,
            departmentList, selectedDepartment, errors, manageyear, yearList, year,
            enableTitle
        } = this.state;

        const tableOptions = {
            selectableRows: 'multiple',
            customToolbarSelect: () => { },
            onRowsClick: () => { },
            onTableChange: (action, tableState) => {
                if (action === 'rowSelectionChange') {
                    let { errors } = this.state;
                    delete errors['staffNotSelected'];
                    this.setState({
                        staffIndex: tableState.selectedRows.data,
                        errors,
                        open: false
                    });
                }
            }
        };
        if (loading) {
            return (
                <Box display="flex">
                    <img src={loadingBar} className="loading" alt="loading" />
                </Box>
            );
        }
        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>Assign Department to Staffs</Box>
                        </Grid>
                        <Grid item md={6} xs={12} >
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                <Button
                                    variant='contained'
                                    component={Link} to={Actions.assign_department.view.url}
                                    className='editbutton-view'
                                >
                                    <VisibilityOutlinedIcon className='visibility-icon' /> {Actions.assign_department.view.label}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>

                    <Grid container spacing={3}>
                        <Grid item md={8} xs={12}>
                            <Paper className='paper-plain-background header-align'>

                                <Grid item container spacing={2}>
                                    <Grid item md={5} xs={12} className='margin-top-30'>
                                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                            <KeyboardDatePicker
                                                autoOk
                                                variant='inline'
                                                inputVariant='outlined'
                                                label='From Date'
                                                fullWidth
                                                name='start_date'
                                                minDate={minDate}
                                                maxDate={Boolean(manageyear.end_date) ? manageyear.end_date : maxDate}
                                                onBlur={this.onBlurValidation}
                                                InputLabelProps={{ shrink: manageyear.start_date ? true : false }}
                                                format='dd-MM-yyyy'
                                                value={manageyear.start_date || null}
                                                onChange={(e) => this.onChangeDatesYears(e, 'start_date')}
                                                KeyboardButtonProps={{ 'aria-label': 'change date' }}
                                                helperText={(!errors.start_date) ? 'Valid Format DD-MM-YYYY' : errors.start_date}
                                                error={Boolean(errors.start_date)}
                                            />
                                        </MuiPickersUtilsProvider>
                                    </Grid>
                                    <Grid item md={6} xs={12} >
                                        <Box>
                                            <Button
                                            onClick = {this.AssignTime}
                                            >
                                            Apply All
                                            </Button>
                                        </Box>
                                    </Grid>
                                    {/* <Grid item md={5} xs={12} className='margin-top-30'>
                                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                            <KeyboardDatePicker
                                                autoOk
                                                variant='inline'
                                                inputVariant='outlined'
                                                label='To Date'
                                                fullWidth
                                                name='end_date'
                                                minDate={manageyear.start_date}
                                                maxDate={maxDate}
                                                onBlur={this.onBlurValidation}
                                                format='dd-MM-yyyy'
                                                value={manageyear.end_date}
                                                disabled={!manageyear.start_date}
                                                InputLabelProps={{ shrink: manageyear.end_date ? true : false }}
                                                onChange={(e) => this.onChangeDatesYears(e, 'end_date')}
                                                KeyboardButtonProps={{ 'aria-label': 'change date' }}
                                                helperText={(!errors.end_date) ? 'Valid Format DD-MM-YYYY' : errors.end_date}
                                                error={Boolean(errors.end_date)}
                                            />
                                        </MuiPickersUtilsProvider>
                                    </Grid> */}
                                </Grid>

                                <Grid container className='flex-justify-center header-align staff-assign-shift-table '>
                                    <Grid item md={12}>
                                        <Paper>
                                            <AllMUIDataTable
                                                title={this.state.loadingStaff ? <CircularProgress className='white-text' /> : ''}
                                                data={staffList}
                                                columns={this.state.columns}
                                                options={tableOptions}
                                            />
                                        </Paper>
                                    </Grid>
                                </Grid>

                            </Paper>
                        </Grid>

                        <Grid item md={4} xs={12}>
                            <Paper className='paper-plain-background header-align staff-assigned-shift-paper p-b-20px'>
                                <Grid item md={12} xs={12} className='p-t-20px'>
                                    <Dropdown
                                        data={departmentList}
                                        name='selectedDepartment'
                                        value={selectedDepartment}
                                        onChange={this.onchangeDepartment}
                                        error={errors.selectedDepartment}
                                        label='Assign Department'
                                        hideSelect
                                    />
                                </Grid>

                                <Box className={!this.state.enableTable ? 'staff-assigned-shift-table' : 'staff-assigned-enabletable-shift-table'}>
                                    <Box className='staff-list-assigned-shift'>Users who are selected for assigning a department</Box>
                                    {this.state.staffIndex.map((data, index) => (
                                        <Box key={index}>
                                            <Box className='selected-assigned-staff'>
                                                {staffList[data.dataIndex]?.full_name}
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>

                                <Box className='assign-shift-submit-position'>
                                    <Button
                                        variant="contained"
                                        className='submit'
                                        onClick={this.submit}
                                        disabled={this.state.submitDisable}
                                    >
                                        Submit
                                    </Button>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>

                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                    <Alert onClose={this.handleClose} severity="error">
                        {alertData}
                    </Alert>
                </Snackbar>
            </Box>
        )
    }
}

export default withRouter(StaffDepartmentMapping)
