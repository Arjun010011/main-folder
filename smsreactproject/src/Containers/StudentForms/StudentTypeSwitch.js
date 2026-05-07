import React, { Component, Fragment } from 'react'
import { Paper, Box, Button, Grid, Icon, CircularProgress, TextField } from '@material-ui/core';
import { Link } from 'react-router-dom';
import classNames from 'classnames'
import { withRouter } from 'react-router-dom';
import Swal from 'sweetalert2'
import _ from 'lodash';

import ActionColumn from 'Components/ActionColumnNew'
import { Dropdown } from 'Components/DropDown';
import { DateRange } from 'Components/DateRange';
import StudentGridCard from 'Components/ProfileGridCard';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL, POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import {
    isUserHasPermission, dateFormat, getIsGridOrListView, setIsGridOrListView, getAcademicYear, SetAcademicYear, getPaginationProps,
    getSettingValue
} from 'Includes/functions';
import LoadingGif from 'Components/LoadingGif';
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';


class StudentTypeSwitch extends Component {
    constructor() {
        super()
        this.state = {
            studentList: [],
            AllStudentList: [],
            dataReady: false,
            GridEnabled: false,
            ListEnabled: true,
            loading: true,
            tableUpdating: false,
            studentTypeList: [{ name: 'Both', id: 'All' }, { name: 'Day Scholar', id: 'Day Scholar' }, { name: 'Residential', id: 'Residential' }],
            student_type: 'All',
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            filterList: [],
            selectedStandard: 'all',
            columns: [
                {
                    name: "first_name",
                    label: "Student Name",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div className='mui-table-custom-value-left-align'>
                                {tableMeta.rowData[6]} {tableMeta.rowData[7]} {tableMeta.rowData[8]}
                            </div>)

                        },
                        customHeadRender: (columnMeta, updateDirection) => (
                            <th key={0} onClick={() => updateDirection(0)} className='mui-table-custom-header-left-align'>
                                {columnMeta.label}
                            </th>
                        )
                    }
                },
                {
                    name: "current_standard_name",
                    label: "Standard Name",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "mobile_num",
                    label: "Mobile Number",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "id",
                    label: "ID",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false,
                    }
                },
                {
                    name: "current_reg_num",
                    label: "Register Number",
                    options: {
                        filter: false,
                        sort: true,
                        display: true
                    }
                },
                {
                    name: "student_type",
                    label: "Student Type",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "first_name",
                    label: "First Name",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false
                    }
                },
                {
                    name: "middle_name",
                    label: "Middle Name",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false
                    }
                },
                {
                    name: "last_name",
                    label: "Last Name",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false
                    }
                },
                {
                    name: "Actions",
                    label: "Actions",
                    options: {
                        display: this.updatePermissions('display'),
                        viewColumns: this.updatePermissions('display'),
                        filter: false,
                        sort: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <Button
                                    className='add-modify-button'
                                    onClick={e => this.callAddStudentType(tableMeta.rowData[3])}
                                >  Change Type
                                </Button>
                            </div>
                            );
                        }
                    }
                }
            ]
        }
    }


    callAddStudentType = (id) => {
        let idInformation = {
            id: id,
        }
        let searchParam = "?" + new URLSearchParams(idInformation).toString()
        this.props.history.push({
            pathname: Actions.student_type_switch_individual.view.url,
            search: searchParam,
        });
    }

    async componentDidMount() {
        let { GridEnabled, ListEnabled, year } = this.state
        this.getStandardList();
        this.updatePermissions('actions');
        if (getIsGridOrListView()) {
            let isGridView = (getIsGridOrListView() === 'true')
            if (isGridView) {
                // GridEnabled = true
                // ListEnabled = false
            }
        }
        this.setState({
            GridEnabled,
            ListEnabled,
            year,
        }, () => {
            this.getStudentList();
        })

    }

    getAcademicYearList = async () => {
        let { year } = this.state
        const url = GET_URL.getacademicyear.api
        const param = { is_active: true }
        await getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                let fromYear = ''
                let ToYear = ''
                response.data.data.map((data) => {
                    fromYear = data.start_date.split('-');
                    ToYear = data.end_date.split('-');
                    // data.name = fromYear[0] + '-' + ToYear[0]
                })
                this.setState({
                    yearList: response.data.data,
                }, () => {
                    if (getAcademicYear()) {
                        year = getAcademicYear()
                        this.setState({
                            year
                        }, () => {
                            this.getStandardList();
                        })
                    }
                    else {
                        this.setState({
                            loading: false
                        })
                    }
                })
            }
        })
    }

    updatePermissions = (name) => {
        let test = true

        const hasViewPermission = isUserHasPermission('student_type_switch_individual', 'view')
        const hasEditPermission = isUserHasPermission('student_type_switch_individual', 'update')

        let enabledActions = [];
        if (hasViewPermission) {
            enabledActions.push('view')
        }
        if (hasEditPermission) {
            enabledActions.push('edit')
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
    onChange = async (e) => {
        let { value } = e.target;
        if (value !== 0) {
            this.setState({
                selectedStandard: value,
            }, () => {
                this.getStudentList();
            })
        }
    }

    getStudentList = (paginationProps) => {
        this.setState({ tableUpdating: true })
        let { pagination, selectedStandard, student_type } = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        const url = GET_URL.student.api
        let params;
        if (selectedStandard && selectedStandard !== 'all') {
            params = { ...pagination_params, is_active: true, current_standard: selectedStandard, student_type_date: 1 };
        }
        else {
            params = { ...pagination_params, is_active: true, student_type_date: 1 };
        }

        if (student_type !== 'All') {
            let temp = {}
            temp['student_type'] = student_type === 'Day Scholar' ? 'D' : 'R'
            params = { ...params, ...temp }
        }
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                this.callApi = true
                const studentList = response.data;
                this.setState({
                    studentList: studentList.data,
                    AllStudentList: [],
                    dataReady: true,
                    loading: false,
                    tableUpdating: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                });
            }
        });
    };

    getStandardList = async () => {
        const f_url = GET_URL.getstandard.api
        const param = { is_active: true }
        await getRequest(f_url, param, this.props).then(response => {
            if (response && response.status === 200) {
                let temp = { id: 'all', name: 'All' }
                response.data.data.unshift(temp)
                this.setState({
                    standardList: response.data.data,
                    loading: false
                })
            }
        })
    }


    multiDelete = (deleteData) => {
        this.setState({ tableUpdating: true })
        let { studentList } = this.state
        let id = []
        deleteData.map((data) => {
            id.push(studentList[data.dataIndex].id)
        })
        const del_url = DEL_URL.studentall.api
        const data = { data: id }
        const url = del_url + 1 + '/';
        deleteRequest(url, data, this.props).then(response => {
            if (response && response.status === 200) {
                id.map((dataID) => {
                    studentList.map((data, index) => {
                        if (dataID === data.id) {
                            studentList.splice(index, 1)
                        }
                    })
                })
                this.setState({
                    studentList: [...studentList]
                })
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
            }
        })
        this.setState({ tableUpdating: false })
    }

    deleteStudent = async (id, index) => {
        this.setState({ tableUpdating: true })
        let { studentList, columns } = this.state
        const del_url = DEL_URL.studentall.api
        const data = { data: [id] }
        const url = del_url + id + '/';
        deleteRequest(url, data, this.props).then(response => {
            if (response && response.status === 200) {
                studentList.student_list.splice(index, 1)
                this.setState({
                    studentList: { ...studentList },
                    columns: [...columns]
                })
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
            }
        })
        this.setState({ tableUpdating: false })
    }

    onChangeHandleView = (name) => {
        let { AllStudentList, studentList, filterList } = this.state;
        let GridEnabled = false
        let ListEnabled = false
        let setValue = false
        if (name === 'GridEnabled') {
            setValue = true
            GridEnabled = true
            if (filterList.length !== 0)
                studentList = [...filterList]
        }
        else {
            studentList = [...AllStudentList]
            ListEnabled = true
        }
        setIsGridOrListView(setValue)
        this.setState({
            GridEnabled,
            ListEnabled,
            studentList
        })
    }

    handleFilter = (e) => {
        let { name, value, filterList } = e.target;
        let { studentList, AllStudentList } = this.state;
        if (value !== '') {
            let lowerCasedFilter = value.toLowerCase();
            filterList = AllStudentList.filter(item => {
                return Object.keys(item).some(key =>
                    typeof (item[key]) === "string" && item[key].toLowerCase().includes(lowerCasedFilter)
                );
            });
            studentList = filterList
        }
        else {
            studentList = [...AllStudentList]
            filterList = []
        }
        this.setState({
            [name]: value,
            studentList,
            filterList
        })
    }

    onChangeStudentType = async (e) => {
        let { value } = e.target;
        this.setState({
            student_type: value,
            tableUpdating: true,
        }, () => {
            this.getStudentList();
        })
    }


    render() {
        let { ListEnabled, GridEnabled, yearList, year, loading, tableUpdating, enabledActions, searchStudent, studentList,
            pagination, studentTypeList, student_type, standardList, selectedStandard } = this.state
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: true,
            viewColumns: true,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            viewColumns: true,
        };
        if (loading) {
            return <LoadingGif />
        }
        else {
            return (
                <Paper className={classNames('paper-background')}>
                    <Grid container spacing={2}>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                Student Type Switch List
                            </Box>
                        </Grid>
                        {/*
                        <Grid item md={4} xs={12} className='margin-top-10'>
                            <Box className='list-grid-toggle-outer-div header-align'>
                                <Button className={ListEnabled === true ? 'list-selected-toggle' : 'grid-selected-toggle'}
                                    onClick={(e) => this.onChangeHandleView('ListEnabled')}
                                    disabled={this.state.ListEnabled === true}>
                                    <Box className={ListEnabled === true ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>List View</Box>
                                    <Icon className={classNames(ListEnabled === true ? 'list-selected-toggle-icon' : 'grid-selected-toggle-icon', "fa fa-bars")} />

                                </Button>
                                <Button className={GridEnabled === true ? 'list-selected-toggle' : 'grid-selected-toggle'}
                                    onClick={(e) => this.onChangeHandleView('GridEnabled')}
                                    disabled={this.state.GridEnabled === true}>
                                    <Box className={GridEnabled === true ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>Grid View</Box>
                                    <Icon className={classNames(GridEnabled === true ? 'list-selected-toggle-icon' : 'grid-selected-toggle-icon', "fa fa-th-large")} />
                                </Button>
                            </Box>
                        </Grid>
                        */}
                    </Grid>
                    <Grid container spacing={2}>
                        <Grid item md={4} xs={12}>
                            <Box className='header-align'>
                                <Dropdown
                                    data={standardList}
                                    name='selectedStandard'
                                    value={selectedStandard}
                                    onChange={this.onChange}
                                    label='Select Standard'
                                    className='width-100'
                                    hideSelect={true}

                                />
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12}>
                            <Box className='header-align'>
                                <Dropdown
                                    data={studentTypeList}
                                    name='student_type'
                                    value={student_type}
                                    onChange={this.onChangeStudentType}
                                    label='Select student type'
                                    hideSelect={true}
                                    className='width-100'
                                />
                            </Box>
                        </Grid>
                        {GridEnabled &&
                            <Grid item md={4} xs={12} className='end-flex-prop header-align'>
                                <TextField
                                    id="outlined-name"
                                    value={searchStudent}
                                    placeholder=""
                                    label="Search Student"
                                    name='searchStudent'
                                    onChange={(e) => { this.handleFilter(e) }}
                                />
                            </Grid>
                        }
                    </Grid>
                    <Grid container className={classNames('flex-justify-center', 'header-align')}>
                        <Grid item md={12} xs={12}>
                            {GridEnabled === true &&
                                <StudentGridCard
                                    list={studentList.student_list}
                                    delete={this.deleteStudent}
                                    enabledActions={enabledActions}
                                    name='Admission'
                                    editURL={Actions.student_type_switch.update.url}
                                    viewURL={Actions.student_type_switch_individual.view.url}
                                />
                            }
                            {ListEnabled === true &&
                                <Paper>
                                    <AllMUIDataTable
                                        title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                        data={studentList.student_list}
                                        columns={this.state.columns}
                                        options={options}
                                        onTableChange={this.getStudentList}
                                        serverSide={true}
                                        pagination={pagination}
                                        count={studentList.count}
                                    />
                                </Paper>
                            }
                        </Grid>
                    </Grid>
                </Paper>
            )
        }
    }
}

export default withRouter(StudentTypeSwitch);
