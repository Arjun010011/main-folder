import React, { Component, Fragment } from 'react';
import { Paper, Box, Grid, Button, CircularProgress, Chip } from '@material-ui/core';
import Swal from 'sweetalert2';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

import ActionColumn from 'Components/ActionColumnNew';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { dateFormat, isUserHasPermission, updatePermissions } from 'Includes/functions';
import { minDate, maxDate } from 'Constants';
import { Dropdown } from 'Components/DropDown';

class HrStaffDepartmentMappingList extends Component {
    constructor() {
        super();
        this.permission = updatePermissions('hr_assign_department', ['update', 'delete']);

        this.state = {
            departmentList: [],
            staffDepartmentList: [],
            loading: true,
            tableUpdating: false,
            selected_department: '',
            columns: [
                {
                    name: 'id',
                    label: 'id',
                    options: { filter: false, sort: false, display: false, viewColumns: false }
                },
                {
                    name: 'staff_name',
                    label: 'Staff Name',
                    options: { filter: true, sort: true, search: true }
                },
                {
                    name: 'department_name',
                    label: 'Department Name',
                    options: { filter: true, sort: true }
                },
                {
                    name: 'from_date',
                    label: 'From Date',
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value) => value ? dateFormat(value, 'DD-MM-YYYY') : '-'
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        display: true,
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        customBodyRender: (value, tableMeta) => {
                            const rowId = tableMeta.rowData[0];
                            const fromDateRaw = tableMeta.rowData[3];
                            const fromDate = fromDateRaw ? new Date(fromDateRaw) : null;

                            return (
                                <ActionColumn
                                    id={rowId}
                                    fieldValues={[this.getDepartmentId(rowId), fromDate]}
                                    label={`Update Mapping`}
                                    fieldDetails={[
                                        {
                                            label: 'Department',
                                            name: 'department',
                                            type: 'dropDown',
                                            md: 12,
                                            className: 'width-100',
                                            required: true,
                                            list: this.state.departmentList.map(d => ({ id: d.id, name: d.name }))
                                        },
                                        {
                                            label: 'From Date',
                                            name: 'from_date',
                                            type: 'date',
                                            md: 12,
                                            className: 'width-100',
                                            required: true,
                                            minDate: minDate,
                                            maxDate: maxDate
                                        }
                                    ]}
                                    updateUrl={PUT_URL.department_staff_mapping.api}
                                    updatePostFormat={(newData) => ({
                                        department: newData.department,
                                        from_date: newData.from_date ? dateFormat(newData.from_date, 'YYYY-MM-DD') : null
                                    })}
                                    getData={() => this.getMappingDetails(rowId)}
                                    isGetData={true}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.department_staff_mapping.api}
                                    deleteType={this.deleteType}
                                    baseClassName="action-basic-detail-width"
                                    enabledActions={this.permission}
                                />
                            );
                        }
                    }
                }
            ]
        };
    }

    componentDidMount() {
        this.getDepartmentList();
        this.getMappingList();
    }

    getDepartmentList = () => {
        getRequest(GET_URL.hr_department.api, { is_active: true }, this.props).then(res => {
            if (res?.status === 200) {
                this.setState({ departmentList: res.data?.data || [] });
            }
        });
    }

    getMappingList = () => {
        this.setState({ tableUpdating: true });
        const params = { is_active: true };
        if (this.state.selected_department) {
            params.department = this.state.selected_department;
        }
        getRequest(GET_URL.department_staff_mapping.api, params, this.props).then(res => {
            if (res?.status === 200) {
                this.setState({ staffDepartmentList: res.data?.data || [], tableUpdating: false, loading: false });
            } else {
                this.setState({ tableUpdating: false, loading: false });
            }
        });
    }

    getDepartmentId = (rowId) => {
        const mapping = this.state.staffDepartmentList.find(m => m.id === rowId);
        return mapping ? mapping.department : '';
    }

    getMappingDetails = (id) => {
        return new Promise((resolve) => {
            const mapping = this.state.staffDepartmentList.find(m => m.id === id);
            if (mapping) {
                resolve([mapping.department, mapping.from_date ? new Date(mapping.from_date) : null]);
            } else {
                resolve([]);
            }
        });
    }

    updateType = () => {
        this.getMappingList();
        return true;
    }

    deleteType = (id) => {
        const staffDepartmentList = this.state.staffDepartmentList.filter(m => m.id !== id);
        this.setState({ staffDepartmentList });
    }

    onChangeDepartment = (e) => {
        this.setState({ selected_department: e.target.value }, this.getMappingList);
    }

    render() {
        if (this.state.loading) {
            return (
                <Box display="flex"><img src={loadingBar} className="loading" alt="loading" /></Box>
            );
        }

        return (
            <Box>
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className="header-align">
                            <Box className="heading">Staff Department Mapping</Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box className="header-align end-flex-prop">
                                {isUserHasPermission('hr_assign_department', 'create') && (
                                    <Button
                                        variant="contained"
                                        component={Link}
                                        to={Actions.hr_assign_department?.create?.url || '/hr/assign/department'}
                                        className="editbutton-view"
                                    >
                                        <AddCircleOutlineOutlinedIcon className="visibility-icon" /> Assign Department
                                    </Button>
                                )}
                            </Box>
                        </Grid>
                    </Grid>

                    <Grid container className="header-align" spacing={3}>
                        <Grid item md={4} xs={12}>
                            <Dropdown
                                data={this.state.departmentList}
                                name='selected_department'
                                value={this.state.selected_department}
                                onChange={this.onChangeDepartment}
                                label='Filter by Department'
                                hideSelect={false}
                            />
                        </Grid>
                        <Grid item md={12} xs={12}>
                            <Paper>
                                <AllMUIDataTable
                                    title={this.state.tableUpdating ? <CircularProgress className="white-text" /> : ''}
                                    data={this.state.staffDepartmentList}
                                    columns={this.state.columns}
                                    options={{ selectableRows: 'none' }}
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>
        );
    }
}

export default HrStaffDepartmentMappingList;
