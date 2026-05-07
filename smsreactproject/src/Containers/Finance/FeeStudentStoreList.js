import React, { Component, Fragment } from 'react'
import { Paper, Box, Button, Grid, Tooltip, CircularProgress, TextField } from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames'
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import Swal from 'sweetalert2'
import _ from 'lodash';
import { debounceSearchRender } from "mui-datatables";

import { Dropdown } from 'Components/DropDown';
import AdmissionPrintForm from 'Containers/StudentForms/Components/AdmissionPrintForm';
import { DateRange } from 'Components/DateRange';
import StudentGridCard from 'Components/ProfileGridCard';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls';
import StudentListActions from 'Includes/StudentListActions'
import { Actions } from 'Constants/permissions';
import {
    isUserHasPermission, dateFormat, getIsGridOrListView, setIsGridOrListView, getAcademicYear, SetAcademicYear, getPaginationProps,
    getSettingValue, updatePermissions, getFormatMessage, getFullName
} from 'Includes/functions';
import LoadingGif from 'Components/LoadingGif';
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST } from 'Constants';
import messages from './messages';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';

const isResidential = parseInt(getSettingValue('is_residential'));
const admission_in_reg = parseInt(getSettingValue('admission_in_reg'));
let user = localStorage.getItem("user") != 'undefined' ? JSON.parse(localStorage.getItem("user")) : '';

class FeeStudentStoreList extends Component {
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
            tableLoading: true,
            studentTypeList: [{ name: 'All', id: 'All' }, { name: 'Day Scholar', id: 'Day Scholar' }, { name: 'Residential', id: 'Residential' }],
            student_type: 'All',
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            filterList: [],
            openPopup: false,
            error: {},
            year: '',
            columns: [
                {
                    name: "full_name",
                    label: <FormattedMessage {...commonMessages.studentName} />,
                    options: {
                        filter: false,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box display='flex'>
                                    <Tooltip title={tableMeta.rowData[7] ? 'Re Admission Student' : 'New Admission Student'} enterDelay={400}
                                        enterNextDelay={400} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <Box className={tableMeta.rowData[7] ? 'application-old-student-list-admitted' : 'application-student-list-admitted'}>
                                        </Box>
                                    </Tooltip>
                                    <Box>
                                        {value}
                                    </Box>
                                </Box>
                            )
                        }
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
                    name: "mobile_num",
                    label: <FormattedMessage {...commonMessages.mobileNo} />,
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
                    name: "Actions",
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        filter: false,
                        sort: false,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <StudentListActions
                                    id={tableMeta.rowData[4]}
                                    index={tableMeta.rowIndex}
                                    deleteStudent={this.deleteStudent}
                                    editURL={Actions.admission_student_list.update.url}
                                    viewURL={Actions.admission_student.view.url}
                                    enabledActions={[]}
                                    handlePrintForm={this.handlePrintForm}
                                    viewExtraParams={{ studentId: tableMeta.rowData[4] }}
                                />
                            </div>
                            );
                        }
                    }
                }
            ]
        }
        this.dateRange = React.createRef();
    }

    handlePrintForm = (id) => {
        this.setState({
            student_id: id,
            openPopup: true
        })
    }

    async componentDidMount() {
        let { GridEnabled, ListEnabled, year } = this.state
        this.getAcademicYearList();
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
        })
    }


    getAcademicYearList = async () => {
        let { year } = this.state;
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
                    const academicYearId = user.other_details.academic_year.id;
                    if (academicYearId) {
                        year = academicYearId
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

    onChange = async (e) => {
        let { value } = e.target;
        if (value !== 0) {
            SetAcademicYear(value)
            this.setState({
                year: value,
                error: {}
            }, () => {
                this.getStandardList();
            })
        }
    }

    getStudentList = (paginationProps) => {
        let { pagination, year, current_standard, dateRangeValue, student_type } = this.state;
        this.setState({ tableUpdating: true, dateRangeValue: dateRangeValue })
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = {
            ...pagination_params,
            student_details__entry_academic_year: year,
            is_active: true, admission_num: true
        }
        if (current_standard) {
            let temp = {}
            temp['current_standard'] = current_standard;
            params = { ...params, ...temp }
        }
        if (!_.isEmpty(dateRangeValue)) {
            let temp = {}
            temp['from_date'] = dateRangeValue.start
            temp['to_date'] = dateRangeValue.end
            params = { ...params, ...temp }
        }
        if (student_type !== 'All') {
            let temp = {}
            temp['student_type'] = student_type === 'Day Scholar' ? 'D' : 'R'
            params = { ...params, ...temp }
        }
        params['admission_history'] = true
        const url = GET_URL.student.api
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                this.setState({
                    tableUpdating: false,
                    columns: [...this.state.columns]
                }, () => {
                    const studentList = response.data;
                    studentList.data.student_list.map((data) => {
                        data['full_name'] = getFullName(data['first_name'], data['middle_name'], data['last_name'])
                    })
                    this.setState({
                        studentList: studentList.data,
                        AllStudentList: studentList.data,
                        // tableUpdating: false,
                        dataReady: true,
                        loading: false,
                        tableLoading: false,
                        pagination: this.currentPagination
                    });
                })
            }
        });
    };


    getStandardList = () => {
        let { year, yearList, academicYearFromDate, academicYearToDate } = this.state;
        yearList.map((data) => {
            if (data.id == year) {
                academicYearFromDate = data.start_date
                academicYearToDate = data.end_date
            }
        })
        const url = GET_URL.getstandard.api
        const param = { is_active: true, academic_year: year }
        getRequest(url, param, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    standardList: response.data.data,
                    academicYearFromDate,
                    academicYearToDate
                }, () => {
                    this.getStudentList();
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

    deleteStudent = (id, index) => {
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
                    timer: 1500,
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
            academicYearFromDate: '',
            academicYearToDate: '',
            current_standard: null,
            dateRangeValue: {}
        }, () => {
            this.getStudentList();
        })
    }

    onFilterChangeHandler = (type) => {
        if (type === 'reset') {
            this.setState({
                current_standard: null,
                dateRangeValue: {},
                dateRangeValueDefault: {}
            }, () => {
                this.getStudentList();
                this.dateRange.current.handleClear();
            })
        }
    }

    handleStandardChange = (e) => {
        let { value } = e.target;
        const { pagination } = this.state;
        this.setState({
            current_standard: value
        }, () => {
            this.getStudentList(pagination)
        }
        )
    }


    geFilterOptions = () => {
        let { current_standard, dateRangeValueDefault, academicYearFromDate, academicYearToDate, standardList } = this.state;
        return <Fragment>
            <Box className='margin-top-20'>
                <Dropdown
                    data={standardList}
                    name={current_standard}
                    value={current_standard}
                    onChange={(e) => this.handleStandardChange(e)}
                    label={<FormattedMessage {...commonMessages.standard} />}
                    hideSelect={true}
                />
            </Box>
            <DateRange
                handleChange={this.handleChangeDateRange}
                minDate={academicYearFromDate}
                maxDate={academicYearToDate}
                ref={this.dateRange}
                label={<FormattedMessage {...commonMessages.dateRange} />}
            />
        </Fragment>;
    }

    handleChangeDateRange = (value) => {
        let { pagination } = this.state;
        this.setState({
            dateRangeValue: value,
            dateRangeValueDefault: {}
        }, () => {
            this.getStudentList(pagination)
        })
    }

    handleClosePopup = () => {
        this.setState({
            openPopup: false
        })
    }

    handleAddAdmissionButton = () => {
        let { year, error, alertData, yearList } = this.state;
        if (year !== '') {
            let year_name
            yearList.map((data) => {
                if (data.id == year) {
                    year_name = data.name
                }
            })
            let yearInformation = {
                year,
                year_name,
            }
            let searchParam = "?" + new URLSearchParams(yearInformation).toString()
            this.props.history.push({
                pathname: Actions.admission_student_list.create.url,
                search: searchParam,
            });
        }
        else {
            alertData = <FormattedMessage {...commonMessages.selectAcademicYear} />
            error.year = alertData
            this.setState({
                open: true,
                alertData,
                error
            })
        }
    }

    render() {
        let { ListEnabled, GridEnabled, yearList, year, loading, tableUpdating, enabledActions, searchStudent, studentList,
            pagination, studentTypeList, student_type, openPopup, student_id, error, tableLoading } = this.state
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: true,
            print: false,
            viewColumns: false,
            // customSearchRender: debounceSearchRender(200),
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
                filename: "Admission_Students.csv",
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
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                Fee Student Store List
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container className='m-bt-15px'>
                        <Grid item md={4} xs={12}>
                            <Box className='header-align'>
                                <Dropdown
                                    data={yearList}
                                    name='year'
                                    value={year}
                                    onChange={this.onChange}
                                    label={<FormattedMessage {...commonMessages.academicYear} />}
                                    error={error.year}
                                    hideSelect={true}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container className={classNames('flex-justify-center', 'header-align')}>
                        <Grid item md={12} xs={12}>
                            {GridEnabled === true &&
                                <StudentGridCard
                                    list={studentList.student_list}
                                    delete={this.deleteStudent}
                                    enabledActions={enabledActions}
                                    name='Admission'
                                    editURL={Actions.admission_student_list.update.url}
                                    viewURL={Actions.admission_student.view.url}
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
                                    // loading={tableUpdating}
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

export default withRouter(FeeStudentStoreList)
