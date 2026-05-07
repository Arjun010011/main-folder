import React, { Component } from 'react'
import { Link, withRouter } from 'react-router-dom';
import { Paper, Box, Button, Grid, Tooltip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@material-ui/core';
import classNames from 'classnames'
import Swal from 'sweetalert2'

import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL,POST_URL } from 'Includes/urls';
import { Dropdown } from 'Components/DropDown';
import LoadingGif from 'Components/LoadingGif';
import { options } from 'Constants';
import {
    SetAcademicYear, getKeyValueInArray, checkLocalAcademicYear, isUserHasPermission,
    getFullName, getSettingValue
} from 'Includes/functions';
import { Actions } from 'Constants/permissions';
import { GOOGLE_API_KEY } from 'Includes/api/constant';
import InfoIcon from "@material-ui/icons/Info";

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

class StudentLocationRegistrationView extends Component {
    constructor() {
        super()
        this.state = {
            studentList: [],
            dataReady: false,
            loading: true,
            tableUpdating: false,
            copyFromPreviousYearLoading: false,
            copyDialogOpen: false,
            copySourceYear: '',
            academicYearList: [],
            year: '',
            yearName: '',
            showunassigned: 0,
            unassignedOnly: 0,
            options: {
                ...options,
                filter: true,
            },
            columns: [
                {
                    name: "id",
                    label: "ID",
                    options: {
                        filter: false,
                        sort: true,
                        display: false,
                        viewColumns: false,
                    }
                },
                {
                    name: "user_student",
                    label: "ID",
                    options: {
                        filter: false,
                        sort: true,
                        display: false,
                        viewColumns: false,
                    }
                },
                {
                    name: "address_id",
                    label: "ID",
                    options: {
                        filter: false,
                        sort: true,
                        display: false,
                        viewColumns: false,
                    }
                },
                {
                    name: "full_name",
                    label: "Student Name",
                    options: {
                        filter: false,
                        sort: false,
                        searchable: true,
                    }
                },
                {
                    name: "standard",
                    label: `${alias_names['standard']}`,
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "selected_area",
                    label: "Registered Area",
                    options: {
                        filter: false,
                        sort: true,
                        display: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {value &&
                                    <div className='display-flex'>
                                        <div className='mr-5'>{value}</div>
                                        <Tooltip title={tableMeta.rowData[7]} enterDelay={400}
                                            enterNextDelay={400} placement='top-start'
                                            classes={{ tooltip: 'tooltip-show-data' }}>
                                            <InfoIcon className='pointer' />
                                        </Tooltip>
                                    </div>
                                }
                            </div>
                            )
                        }
                    }
                },
                {
                    name: "student_address",
                    label: "Student address",
                    options: {
                        filter: false,
                        sort: true,
                        display: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {value &&
                                    <div className='display-flex'>
                                        <div className='mr-5'>{value}</div>
                                        <Tooltip title={tableMeta.rowData[7]} enterDelay={400}
                                            enterNextDelay={400} placement='top-start'
                                            classes={{ tooltip: 'tooltip-show-data' }}>
                                            <InfoIcon className='pointer' />
                                        </Tooltip>
                                    </div>
                                }
                            </div>
                            )
                        }
                    }
                },
                {
                    name: "address_detail",
                    label: "Address Details",
                    options: {
                        filter: false,
                        sort: true,
                        display: false,
                        viewColumns: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {(tableMeta.rowData[5] || tableMeta.rowData[6]) &&
                                    <Tooltip title={value} enterDelay={400}
                                        enterNextDelay={400} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <InfoIcon className='pointer' />
                                    </Tooltip>
                                }
                            </div>
                            )
                        }
                    }
                },
                {
                    name: "actions",
                    label: "Action",
                    options: {
                        filter: false,
                        sort: false,
                        display: (isUserHasPermission('transport_student_address_registration', 'update') &&
                            isUserHasPermission('transport_student_address_registration', 'create')) ? true : false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return <Box>
                                {tableMeta.rowData[2] ?
                                    isUserHasPermission('transport_student_address_registration', 'update') && <Button
                                        variant="contained"
                                        onClick={() => this.handleUpdateAddressButton(true, tableMeta.rowData[0], tableMeta.rowData[1], tableMeta.rowData[2])}
                                        className='custom-button'
                                    >
                                        <div>Modify address</div>
                                    </Button>
                                    :
                                    isUserHasPermission('transport_student_address_registration', 'create') && <Button
                                        variant="contained"
                                        onClick={() => this.handleUpdateAddressButton(false, tableMeta.rowData[0], tableMeta.rowData[1])}
                                        className='custom-button'
                                    >
                                        <div>Add address</div>
                                    </Button>
                                }
                            </Box>
                        },
                    }
                }
            ]
        }
    }

    componentDidMount() {
        this.getAcademicYearList();
        this.updatePermissions();
    }


    handleUpdateAddressButton = (isEdit, studentId, userId, id) => {
        const { year, yearName } = this.state;
        let url = Actions.transport_student_address_registration.create.url
        if (isEdit) {
            url = Actions.transport_student_address_registration.update.url
        }
        let formInformation = {
            yearName: yearName,
            year: year,
            studentId: studentId,
            userId: userId,
            id: id,
        }
        let searchParam = "?" + new URLSearchParams(formInformation).toString()
        this.props.history.push({
            pathname: url,
            search: searchParam,
        });
    }

    updatePermissions = (name) => {
        let test = true
        const hasViewPermission = isUserHasPermission('transport_student_address_registration', 'view')
        const hasEditPermission = isUserHasPermission('transport_student_address_registration', 'update')
        const hasDeletePermission = isUserHasPermission('transport_student_address_registration', 'delete')
        let enabledActions = [];
        if (hasViewPermission) {
            enabledActions.push('view')
        }
        if (hasEditPermission) {
            enabledActions.push('edit')
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
        }
        if (enabledActions.length === 0) {
            test = false;
        }
        if (name === 'display') {
            return test
        }
        else {
            this.setState({
                enabledActions: enabledActions,
                columns: this.state.columns
            })
        }
    }

    getAcademicYearList = () => {
        let { academicYearList, year, yearName } = this.state;
        let params = { is_active: true,is_finance_page: true };
        getRequest(GET_URL.getacademicyear.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                academicYearList = response.data.data;
                year = checkLocalAcademicYear(academicYearList);
                yearName = getKeyValueInArray(academicYearList, 'id', year, 'name')
                this.setState({ year:year?year:'', yearName, academicYearList }, () => {
                    if (year) {
                        this.getStudentList();
                    }
                    else {
                        this.setState({ loading: false })
                    }
                })
            }
        });
    }

    getStudentList = () => {
        const url = GET_URL.routeuseraddress.api
        const params = { academic_year: this.state.year, student_data: 1 }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.map((data) => {
                    data['full_name'] = getFullName(data['first_name'], data['middle_name'], data['last_name'])
                    data['selected_area'] = this.getAddress('area', data)
                    data['address_id'] = data.address_details?.id
                    data['student_address'] = this.getAddress('student', data)
                    data['address_detail'] = this.getAddress('detail', data)
                })
                this.setState({
                    studentList: response.data.data,
                    dataReady: true,
                    loading: false
                }) 
            }
        })
    }

    getAddress = (name, data) => {
        let return_data = ''
        if (name === 'area') {
            if (data?.address_details?.area_details?.area_type === 1) {
                return_data = data?.address_details?.area_details?.name
            }
        }
        else if (name === 'student') {
            if (data?.address_details?.area_details?.area_type === 2) {
                return_data = data?.address_details?.area_details.address_one
            }
        }
        else if (name === 'detail' && data?.address_details) {
            return_data = this.getFormattedAddress(data?.address_details?.area_details)
        }
        return return_data
    }

    getFormattedAddress = (map_address) => {
        let return_result = ''
        return_result = map_address.address_one + " " + map_address.address_two + "  " +
            map_address.city + ',' + " " + map_address.district + ',' + " " + map_address.state + ',' + " " +
            map_address.country + ',' + " " + map_address.pincode
        return return_result
    }

    handleChange = async (e) => {
        let value = e.target.value;
        let { academicYearList, year, yearName } = this.state;
        if (value !== 0 && value !== year) {
            yearName = getKeyValueInArray(academicYearList, 'id', value, 'name')
            this.setState({
                year: value,
                yearName
            }, () => { SetAcademicYear(value); this.getStudentList() })
        }
    }

    filterAssignedUnassigned = (e) => {
        this.setState({
            unassignedOnly: e.target.value
        });
    }

    handleOpenCopyDialog = () => {
        const { year } = this.state;
        if (!year) {
            Swal.fire({ icon: 'warning', text: 'Please select an academic year first.' });
            return;
        }
        this.setState({ copyDialogOpen: true, copySourceYear: '' });
    }

    handleCloseCopyDialog = () => {
        this.setState({ copyDialogOpen: false, copySourceYear: '' });
    }

    handleCopySourceYearChange = (e) => {
        this.setState({ copySourceYear: e.target.value });
    }

    handleConfirmCopyFromYear = () => {
        const { year, copySourceYear } = this.state;
        if (!copySourceYear) {
            Swal.fire({ icon: 'warning', text: 'Please select an academic year to copy from.' });
            return;
        }
        if (copySourceYear === year) {
            Swal.fire({ icon: 'warning', text: 'Source and target year cannot be the same.' });
            return;
        }
        this.setState({ copyFromPreviousYearLoading: true });
        const url = POST_URL.copyrouteuseraddress.api;
        const data = {
            source_academic_year: copySourceYear,
            target_academic_year: year
        };
        postRequest(url, data, this.props).then((response) => {
            this.setState({ copyFromPreviousYearLoading: false });
            if (response && response.status === 200) {
                Swal.fire({ icon: 'success', text: 'Successfully copied from selected year.' });
                this.handleCloseCopyDialog();
                this.getStudentList();
            }
        }).catch(() => {
            this.setState({ copyFromPreviousYearLoading: false });
        });
    }

    render() {
        let { loading, tableUpdating, academicYearList, year, yearName, showunassigned, copyFromPreviousYearLoading, copyDialogOpen, copySourceYear } = this.state;
        const copySourceYearList = academicYearList.filter(ay => ay.id !== parseInt(year));
        if (loading) {
            return <LoadingGif />
        }
        else {
            return (
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={12} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                Student Address Registered List
                            </Box>
                        </Grid> 
                    </Grid>
                    <Grid container spacing={2} alignItems='flex-end'>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box mt={2}>
                                <Dropdown
                                    data={academicYearList}
                                    name='year'
                                    value={year}
                                    onChange={this.handleChange}
                                    label='Academic Year'
                                    fullWidth
                                    hideSelect={true}
                                />
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box mt={2}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={this.handleOpenCopyDialog}
                                    disabled={copyFromPreviousYearLoading || !year}
                                >
                                    Copy from previous year
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container className={classNames('flex-justify-center', 'header-align')}>
                        <Grid item md={12} xs={12}>
                            <Paper>
                                <AllMUIDataTable
                                    title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                    data={this.state.studentList}
                                    columns={this.state.columns}
                                    options={this.state.options}
                                />
                            </Paper>
                        </Grid>
                    </Grid>
                    <Dialog open={copyDialogOpen} onClose={this.handleCloseCopyDialog}>
                        <DialogTitle>Copy from previous year</DialogTitle>
                        <DialogContent>
                            <Box mt={2} minWidth={300}>
                                <Dropdown
                                    data={copySourceYearList}
                                    name='copySourceYear'
                                    value={copySourceYear}
                                    onChange={this.handleCopySourceYearChange}
                                    label='Select academic year to copy from'
                                    fullWidth
                                    hideSelect={true}
                                />
                                <Box mt={2}>
                                    Data will be copied to: <strong>{yearName || year}</strong>
                                </Box>
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.handleCloseCopyDialog}>Cancel</Button>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={this.handleConfirmCopyFromYear}
                                disabled={copyFromPreviousYearLoading || !copySourceYear}
                            >
                                {copyFromPreviousYearLoading ? <CircularProgress size={24} className='white-text' /> : 'Copy'}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Paper>
            )
        }
    }
}

export default withRouter(StudentLocationRegistrationView);
