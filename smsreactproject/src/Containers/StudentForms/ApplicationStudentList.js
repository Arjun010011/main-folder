import React, { Component, Fragment } from 'react'
import { Paper, Box, Button, Grid, Tooltip, CircularProgress, TextField } from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames'
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import GetAppIcon from '@material-ui/icons/GetApp';
import CropFreeIcon from '@material-ui/icons/CropFree';
import Swal from 'sweetalert2'
import _ from 'lodash';
import { debounceSearchRender } from "mui-datatables";

import { DateRange } from 'Components/DateRange';
import { Dropdown } from 'Components/DropDown';
import StudentGridCard from 'Components/ProfileGridCard';
import AllMUIDataTable from 'Components/AllMUIDataTable';
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls'
import StudentListActions from 'Includes/StudentListActions';
import { Actions } from 'Constants/permissions';
import {
    isUserHasPermission, dateFormat, getIsGridOrListView, setIsGridOrListView, getAcademicYear, SetAcademicYear, getPaginationProps,
    getSettingValue, getFullName, getFormatMessage, updatePermissions
} from 'Includes/functions';
import LoadingGif from 'Components/LoadingGif';
import { multiOptions, DEFAULT_PAGINATION_PROPS_ID_LIST, lastYearDate } from 'Constants';
import messages from './messages';
import { downloadPublicFormQrPoster } from './publicFormQrDownload';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';

const isResidential = parseInt(getSettingValue('is_residential'));

class ApplicationStudentList extends Component {
    constructor() {
        super()
        this.permission = updatePermissions('application_student', ['view']);
        this.state = {
            studentList: [],
            AllStudentList: [],
            dataReady: false,
            GridEnabled: false,
            ListEnabled: true,
            loading: true,
            tableUpdating: false,
            student_type: 'All',
            enabledActions: [],
            filterList: [],
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            studentTypeList: [{ name: 'All', id: 'All' }, { name: 'Day Scholar', id: 'Day Scholar' }, { name: 'Residential', id: 'Residential' }],
            searchStudent: '',
            dateRangeValue: {},
            dateRangeValueDefault: {},
            current_standard: null,
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
                                    <Tooltip title={tableMeta.rowData[9]?'Existing Student':tableMeta.rowData[7] === true ? 'Admission Done' : 'Admission Not Done'} enterDelay={400}
                                        enterNextDelay={400} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <Box className={tableMeta.rowData[9]? 'application-old-student-list-admitted' : tableMeta.rowData[7] === true ? 'application-student-list-admitted' : 'application-student-list-not-admitted'}>
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
                        display: true,
                    }
                },
                {
                    name: "mobile_num",
                    label: <FormattedMessage {...commonMessages.mobileNo} />,
                    options: {
                        filter: false,
                        sort: true,
                        display: true,
                    }
                },
                {
                    name: "application_date",
                    label: <FormattedMessage {...messages.applicationDate} />,
                    options: {
                        filter: false,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return dateFormat(value, 'DD-MM-YYYY')
                        },
                    }
                },
                {
                    name: "id",
                    label: <FormattedMessage {...messages.applicationNo} />,
                    options: {
                        filter: false,
                        sort: true,
                        display: true,
                        download: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<Box className='text-transform-none'>
                                {tableMeta.rowData[6]}
                            </Box>)

                        },
                    }
                },
                {
                    name: "application_payment",
                    label: "Reciept ID",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false,
                        download: false,
                    }
                },
                {
                    name: "application_num",
                    label: <FormattedMessage {...messages.applicationNo} />,
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false,
                    }
                },
                {
                    name: "admission",
                    label: "Admission",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false,
                        download: false,
                    }
                },
                {
                    name: "student_type",
                    label: <FormattedMessage {...commonMessages.studentType} />,
                    options: {
                        filter: false,
                        sort: true,
                        display: !!isResidential,
                        download: false,
                    }
                },
                {
                    name: "student",
                    label: "Admission",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false,
                        download: false,
                    }
                },
                {
                    name: "Action",
                    label: <FormattedMessage {...commonMessages.actions} />,
                    options: {
                        display: this.permission.length > 0,
                        filter: false,
                        sort: false,
                        viewColumns: false,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <StudentListActions
                                    id={this.getAplicationId(tableMeta.rowData[4])}
                                    index={tableMeta.rowIndex}
                                    deleteStudent={this.deleteStudent}
                                    url={GET_URL.applicationFeesReceipt.api}
                                    printId={tableMeta.rowData[5] ? tableMeta.rowData[5] + '/' : null}
                                    handlePrintForm={this.handlePrintForm}
                                    print_form_label="Print Application Form"
                                    editURL={Actions.application_student_list.update.url}
                                    viewURL={Actions.application_student.view.url}
                                    enabledActions={this.permission}
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

    getAplicationId = (data) => {
        const id = data.split('###')
        return id[0]
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
                minDate={lastYearDate()}
                maxDate={academicYearToDate}
                startDate={dateRangeValueDefault.start}
                endDate={dateRangeValueDefault.end}
                ref={this.dateRange}
                label={<FormattedMessage {...commonMessages.dateRange} />}
                hideClearIcon={true}
            />
        </Fragment>;
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

    componentDidMount() {
        let { GridEnabled, ListEnabled } = this.state
        this.getAcademicYearList();
        if (this.permission.includes('view')) {
            this.permission.push('print')
            this.permission.push('printForm')
        }
        this.permission = [...this.permission, ...updatePermissions('application_student_list', ['update', 'delete'])]
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

    handleChangeDateRange = (value) => {
        let { pagination } = this.state;
        this.setState({
            dateRangeValue: value,
            dateRangeValueDefault: value
        }, () => {
            this.getStudentList(pagination)
        })
    }

    onFilterChangeHandler = (type) => {
        if (type === 'reset') {
            this.setState({
                tableUpdating: true,
                current_standard: null,
                dateRangeValue: {},
                dateRangeValueDefault: {}
            }, () => {
                this.getStudentList();
                this.dateRange.current.handleClear();
            })
        }
    }

    getAcademicYearList = async () => {
        let { year } = this.state
        const url = GET_URL.getacademicyear.api
        const param = { is_active: true, is_finance_page: true }
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


    onChange = async (e) => {
        let { value } = e.target;
        if (value !== 0) {
            SetAcademicYear(value)
            this.setState({
                year: value,
                tableUpdating: true,
                academicYearFromDate: '',
                academicYearToDate: '',
                current_standard: null,
                dateRangeValue: {},
                error: {}
            }, () => {
                this.getStandardList();
            })
        }
    }

    getStandardList = () => {
        let { year, yearList, academicYearFromDate, academicYearToDate } = this.state;
        yearList.map((data) => {
            if (data.id == year) {
                academicYearFromDate = data.start_date
                academicYearToDate = data.end_date
            }
        })
        const url = GET_URL.getstandard.api
        const param = { is_active: true, academic_year: year , is_finance_page: true}
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


    onChangeStudentType = async (e) => {
        let { value } = e.target;
        this.setState({
            student_type: value,
            tableUpdating: true,
            academicYearFromDate: '',
            academicYearToDate: '',
            current_standard: null,
            dateRangeValue: {}
        }, () => {
            this.getStudentList();
        })
    }


    getStudentList = (paginationProps) => {
        let { pagination, year, current_standard, dateRangeValue, student_type } = this.state;
        this.setState({ tableUpdating: true, dateRangeValue: dateRangeValue, })
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, entry_academic_year: year, is_active: true };
        if (current_standard && !_.isEmpty(dateRangeValue)) {
            params = { ...pagination_params, entry_academic_year: year, is_active: true, current_standard: current_standard, from_date: dateRangeValue.start, to_date: dateRangeValue.end };
        }
        if (current_standard && _.isEmpty(dateRangeValue)) {
            params = { ...pagination_params, entry_academic_year: year, is_active: true, current_standard: current_standard };
        }
        if (!_.isEmpty(dateRangeValue) && current_standard) {
            params = { ...pagination_params, entry_academic_year: year, is_active: true, current_standard: current_standard, from_date: dateRangeValue.start, to_date: dateRangeValue.end };
        }
        if (!_.isEmpty(dateRangeValue) && !current_standard) {
            params = { ...pagination_params, entry_academic_year: year, is_active: true, from_date: dateRangeValue.start, to_date: dateRangeValue.end };
        }
        if (student_type !== 'All') {
            let temp = {}
            temp['student_type'] = student_type === 'Day Scholar' ? 'D' : 'R'
            params = { ...params, ...temp }
        }
        let prop = { ...this.props };
        if ( paginationProps === 'download' ){
        params['download_excel'] = 1;
        prop.responseType = "blob";
        }
        const url = GET_URL.application.api
        getRequest(url, params, prop).then((response) => {
            if (response && response.status === 200) {
                if (paginationProps === "download") {
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement("a");
                    link.href = url;
                    link.setAttribute("download", `Application_Student_List.xlsx`);
                    document.body.appendChild(link);
                    console.log(link , 'pooja')
                    link.click();
                    this.setState({
                      tableUpdating: false,
                      loading: false,
                    });
                    return;
                  }
                this.setState({ tableLoading: true }, () => {
                const studentList = response.data;
                studentList.data.student_list.map((data) => {
                    data['full_name'] = getFullName(data['first_name'], data['middle_name'], data['last_name'])
                    data['id'] = `${data['id']}###${data['application_num']}`
                })
                this.setState({
                    studentList: studentList.data,
                    AllStudentList: studentList.data,
                    dataReady: true,
                    loading: false,
                    tableUpdating: false,
                    tableLoading:false,
                    pagination: this.currentPagination,
                    dateRangeValue: dateRangeValue
                });
            })
            }
        });
        return false
    };



    deleteStudent = async (id, index) => {
        this.setState({ tableUpdating: true })
        let { studentList, columns } = this.state
        const del_url = DEL_URL.application.api
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

    handlePrintForm = async (id) => {
        const prop = { responseType: "blob", return_error: true };
        const response = await getRequest(
            `${GET_URL.getapplication.api}${id}/`,
            { application_form_download: 1 },
            prop
        );

        if (response && response.status === 200 && response.data) {
            const data = new Blob([response.data], { type: "application/pdf" });
            const fileURL = URL.createObjectURL(data);
            const height = (window.screen.height * 75) / 100;
            const width = (window.screen.width * 75) / 100;
            const mywindow = window.open(
                fileURL,
                "PRINT",
                "height=" + height + ",width=" + width + ""
            );
            if (mywindow) {
                mywindow.print();
            }
            return;
        }

        Swal.fire({
            icon: "error",
            title: "Failed to download PDF document",
        });
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

    handleFilterClose = () => {
        // this.setState({
        // dateRangeValueDefault: {}
        // })
    }

    generateApplicationQrPoster = () => {
        const { year, yearList } = this.state;
        if (!year) {
            const alertData = <FormattedMessage {...commonMessages.selectAcademicYear} />;
            this.setState({
                open: true,
                alertData,
                error: { year: alertData },
            });
            return;
        }
        downloadPublicFormQrPoster('application', year, yearList, 'all');
    }

    handleAddApplicationButton = () => {
        let { year, error, alertData, yearList } = this.state;
        if (year !== '') {
            let start_date, end_date, year_name
            yearList.map((data) => {
                if (data.id == year) {
                    start_date = data.start_date
                    end_date = data.end_date
                    year_name = data.name
                }
            })
            let yearInformation = {
                year,
                year_name,
                start_date,
                end_date
            }
            let searchParam = "?" + new URLSearchParams(yearInformation).toString()
            this.props.history.push({
                pathname: Actions.application_student_list.create.url,
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
        let { ListEnabled, GridEnabled, yearList, year, studentList, tableUpdating, loading, enabledActions, searchStudent,
            pagination, tableLoading, open, error, studentTypeList, student_type
        } = this.state
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: true,
            download: true,
            print: false,
            // customSearchRender: debounceSearchRender(200),
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            customFilterDialogFooter: () => {
                return this.geFilterOptions();
            },
            onFilterChange: (onFilterChange, filterList, type) => {
                this.onFilterChangeHandler(type, onFilterChange);
            },
            onRowsDelete: (rowsDeleted) => {
                this.multiDelete(rowsDeleted.data);
                return false
            },
            onDownload: () => {
                return this.getStudentList("download");
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
                                <FormattedMessage {...messages.applicationFormLabel} />
                            </Box>
                        </Grid>
                        <Grid item lg={6} md={6} xs={12} >
                            <Box className={classNames('header-align', 'end-flex-prop')} display="flex" flexWrap="wrap" style={{ gap: 8 }} justifyContent="flex-end">
                                {isUserHasPermission('application_student_list', 'create') && <Button
                                    variant="contained"
                                    onClick={this.handleAddApplicationButton}
                                    className='editbutton-view'
                                ><AddCircleOutlineIcon className='visibility-icon' /> {Actions.application_student_list.create.label}</Button>}
                                {isUserHasPermission('application_student_list', 'create') && <Button
                                    variant="contained"
                                    onClick={this.generateApplicationQrPoster}
                                    className='editbutton-view ml-10'
                                ><CropFreeIcon className='visibility-icon' /> Generate public application QR</Button>}
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
                        <Grid item md={4} xs={12}>
                            {year && !!isResidential &&
                                <Box className='header-align'>
                                    <Dropdown
                                        data={studentTypeList}
                                        name='student_type'
                                        value={student_type}
                                        onChange={this.onChangeStudentType}
                                        label={<FormattedMessage {...commonMessages.selectStudentType} />}
                                        hideSelect={true}
                                    />
                                </Box>
                            }
                        </Grid>
                        {GridEnabled &&
                            <Grid item md={6} xs={12} className='end-flex-prop header-align'>
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
                            {this.state.GridEnabled === true &&
                                <StudentGridCard
                                    list={studentList.student_list}
                                    deleteStudent={this.deleteStudent}
                                    enabledActions={enabledActions}
                                    name='Enquiry'
                                    editURL={Actions.application_student_list.update.url}
                                    viewURL={Actions.application_student.view.url}
                                />
                            }
                            <Paper>
                                {/* {!tableLoading && */}
                                    <AllMUIDataTable
                                    data={studentList.student_list}
                                    key={studentList.student_list}
                                    title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                    columns={this.state.columns}
                                    options={options}
                                    onTableChange={this.getStudentList}
                                    serverSide={true}
                                    pagination={pagination}
                                    count={studentList.count}
                                    loading={tableUpdating}
                                    />
                                {/* } */}
                            </Paper>

                        </Grid>
                    </Grid>
                </Paper>
            )
        }
    }
}
export default withRouter(ApplicationStudentList)
