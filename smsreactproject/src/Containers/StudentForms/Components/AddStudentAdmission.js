import React, { Component, Fragment } from 'react'
import {
    Paper, withStyles, Box, Button, Grid, Toolbar, IconButton, CircularProgress, TextField, Dialog, AppBar,
    Tooltip, Typography
} from '@material-ui/core';
import { Link } from 'react-router-dom';
import classNames from 'classnames'
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import Swal from 'sweetalert2'
import _ from 'lodash';

import { Dropdown } from 'Components/DropDown';
import { DateRange } from 'Components/DateRange';
import StudentGridCard from 'Components/ProfileGridCard';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import {
    getFullName, dateFormat, getIsGridOrListView, setIsGridOrListView, getPaginationProps,
    getSettingValue, updatePermissions, getFormatMessage, getAcademicYear
} from 'Includes/functions';
import LoadingGif from 'Components/LoadingGif';
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';
import CloseIcon from '@material-ui/icons/Close';
import { cloneDeep } from 'lodash';

const isResidential = parseInt(getSettingValue('is_residential'));


const Styles = theme => ({
    appBar: {
        position: 'relative',
        backgroundColor: '#4680FF'
    },
    title: {
        marginLeft: theme.spacing(2),
        flex: 1,
    },
})



class StudentList extends Component {
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
            studentTypeList: [{ name: 'All', id: 'All' }, { name: 'Day Scholar', id: 'Day Scholar' }, { name: 'Residential', id: 'Residential' }],
            student_type: 'All',
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            filterList: [],
            selectedStandard: 'all',
            openDialog: false,
            yearList: [],
            selectedYear: '',
            columns: [
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
                    name: "full_name",
                    label: <FormattedMessage {...commonMessages.studentName} />,
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "current_standard_name",
                    label: <FormattedMessage {...commonMessages.standard} />,
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "current_standard_section_name",
                    label: <FormattedMessage {...commonMessages.sectionName} />,
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "mobile_num",
                    label: <FormattedMessage {...commonMessages.mobileNo} />,
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "dob",
                    label: <FormattedMessage {...commonMessages.dob} />,
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (value && dateFormat(value, 'DD-MM-YYYY'));
                        }
                    }
                },
                {
                    name: "current_reg_num",
                    label: <FormattedMessage {...commonMessages.regNum} />,
                    options: {
                        filter: false,
                        sort: true,
                        display: true
                    }
                },
                {
                    name: "student_type",
                    label: <FormattedMessage {...commonMessages.studentType} />,
                    options: {
                        filter: false,
                        sort: true,
                        display: !!isResidential,
                        download: !!isResidential
                    }
                },
                {
                    name: "Actions",
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        filter: false,
                        sort: false,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                {(this.props.existingSiblings.includes(tableMeta.rowData[0]) || this.props.studentId === tableMeta.rowData[0]) ?
                                    <Tooltip title={this.props.studentId === tableMeta.rowData[0] ? 'Current Student' : 'Already added to sibling'} enterDelay={400}
                                        enterNextDelay={400} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <Button className='custom-button opacity-0-5'>
                                            Add Sibling
                                        </Button>
                                    </Tooltip>
                                    :
                                    <Button className='custom-button'
                                        onClick={() => this.handleAddSibling(tableMeta.rowIndex)}>
                                        Add Sibling
                                    </Button>
                                }
                            </div>
                            );
                        }
                    }
                }
            ]
        }
    }

    handleAddSibling = (index) => {
        this.props.addSibling(this.state.studentList.student_list[index])
        this.props.handleClose()
    }

    async componentDidMount() {
        this.getAcademicYearList();
    }

    getAcademicYearList = () => {
        let { selectedYear } = this.state;
        const url = GET_URL.getacademicyear.api
        const param = { is_active: true }
        getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    yearList: response.data.data,
                }, () => {
                    if (getAcademicYear()) {
                        selectedYear = getAcademicYear()
                        this.setState({
                            selectedYear
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

    getStandardList = () => {
        const { selectedYear } = this.state;
        const url = GET_URL.getstandard.api
        const param = { is_active: true, academic_year: selectedYear }
        getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                let temp = { id: 'all', name: 'All' }
                response.data.data.unshift(temp)
                this.setState({
                    standardList: response.data.data,
                }, () => {
                    this.getStudentList();
                })
            }
        })
    }

    onChange = (e) => {
        let { value, name } = e.target;
        this.setState({
            [name]: value,
        }, () => {
            if (name === 'selectedYear') {
                this.getStandardList();
            }
            else {
                this.getStudentList();
            }
        })
    }

    getStudentList = (paginationProps) => {
        this.setState({ tableUpdating: true })
        let { pagination, selectedStandard, student_type, selectedYear } = this.state;
        let { existingSiblings } = this.props;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        const url = GET_URL.student.api
        let params;
        if (selectedStandard && selectedStandard !== 'all') {
            params = { ...pagination_params, sibling_data: 1, is_active: true, student_academic_year: selectedYear, current_standard: selectedStandard, admission_num: true };
        }
        else {
            params = { ...pagination_params, sibling_data: 1, is_active: true, student_academic_year: selectedYear, admission_num: true };
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
                studentList.data.student_list.map((data) => {
                    data['full_name'] = getFullName(data['first_name'], data['middle_name'], data['last_name'])
                })
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
            pagination, studentTypeList, selectedYear, standardList, selectedStandard, openDialog } = this.state
        let { classes } = this.props
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            onDownload: (buildHead, buildBody, columns, data) => {
                const bodyData = data.map((data_value) => {
                    return data_value;
                })
                const bodyColumn = columns.map((column_name) => {
                    column_name.label = getFormatMessage(column_name.label)
                    return column_name;
                })
                return "\uFEFF" + buildHead(bodyColumn) + buildBody(bodyData);
            },
            downloadOptions: {
                filename: "Student_List.csv",
                filterOptions: {
                    useDisplayedColumnsOnly: true,
                    useDisplayedRowsOnly: true,
                },
            },
        };
        if (loading) {
            return <LoadingGif />
        }
        else {
            return (
                <>
                    <Dialog fullScreen open={true} onClose={this.props.handleClose} >
                        <AppBar className={classes.appBar} style={{ position: 'fixed' }}>
                            <Toolbar>
                                <IconButton edge="start" color="inherit" onClick={this.props.handleClose} aria-label="close">
                                    <CloseIcon />
                                </IconButton>
                                <Typography variant="h6" className={classes.title}>
                                    Add Sibling
                                </Typography>
                            </Toolbar>
                        </AppBar>
                        <Paper className={classNames('paper-background')}>
                            <Grid container spacing={2}>
                                <Grid item md={4} xs={12} className={classNames('header-align')}>
                                    <Box className='heading'>
                                        Student List
                                    </Box>
                                </Grid>
                            </Grid>
                            <Grid container spacing={2}>
                                <Grid item md={4} xs={12}>
                                    <Box className='header-align'>
                                        <Dropdown
                                            data={yearList}
                                            name='selectedYear'
                                            value={selectedYear}
                                            onChange={this.onChange}
                                            label={<FormattedMessage {...commonMessages.academicYear} />}
                                            className='width-100'
                                            hideSelect={true}
                                        />
                                    </Box>
                                </Grid>
                                <Grid item md={4} xs={12}>
                                    <Box className='header-align'>
                                        <Dropdown
                                            data={standardList}
                                            name='selectedStandard'
                                            value={selectedStandard}
                                            onChange={this.onChange}
                                            label={<FormattedMessage {...commonMessages.standard} />}
                                            className='width-100'
                                            hideSelect={true}
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
                                </Grid>
                            </Grid>
                        </Paper>
                    </Dialog>
                </>
            )
        }
    }
}
export default withStyles(Styles)(StudentList)
