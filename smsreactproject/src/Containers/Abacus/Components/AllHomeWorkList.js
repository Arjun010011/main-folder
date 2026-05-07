import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, Tooltip } from '@material-ui/core';
import Swal from 'sweetalert2'
import moment from 'moment';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import _, { cloneDeep } from 'lodash';
import { withRouter } from 'react-router-dom';
import { DateRange } from 'Components/DateRange';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import { Dropdown } from 'Components/DropDown';
import PictureAsPdfIcon from '@material-ui/icons/PictureAsPdf';
import ImageIcon from '@material-ui/icons/Image';

import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import HomeWorkListAction from 'Containers/Diary/Components/HomeWorkListAction';
import {
    getUrlParam, updatePermissions, getPaginationProps, dateFormat, getFormatMessage, numberWithCommas, getFullName
} from 'Includes/functions';
import { options, minDate, DEFAULT_PAGINATION_PROPS_ID_LIST, maxDate } from 'Constants';
import { image_formats } from 'Containers/Expenses/Constants';
import { Today } from '@material-ui/icons';
import ErrorHandler from "Components/ErrorHandler";

class AllHomeWorkList extends Component {
    constructor() {
        super()
        this.permission = updatePermissions('abacus_managehomework', ['update', 'delete'])
        this.state = {
            homeWorkList: [],
            loading: false,
            selectedToDelete: [],
            tableUpdating: false,
            bankLoaded: false,
            fieldDetails: null,
            pagination: { ...DEFAULT_PAGINATION_PROPS_ID_LIST },
            currentTab: 'HomeWorkList',
            bank_id: '',
            id: '',
            bank_name: '',
            account_num: '',
            fee_name: '',
            dateRangeValue: {},
            largeImagePreview: '',
            isOpenedDateRange: false,
            dateRangeDropdownList: [{ id: 'today', name: 'Today' }, { id: 'tom', name: 'Tomorrow' }, { id: 'week', name: 'This week' }, { id: 'custom', name: 'Custom Date Range', hide: true }],
            isDateRange: false,
            dateRangeDropdown: 'week',
            hasEvaluatePermission: false,
            evaluate_list: [],
            standardList: [],
            isInitialPageRender: true,
            homework: {},
            downloadLoading: {
                pdf: false,
                img: false
            }
        }
        this.columns = [
            {
                name: "id",
                label: "SLNO",
                options: {
                    filter: false,
                    sort: false,
                    viewColumns: false,
                    display: false,
                    download: false,
                }
            },
            {
                name: "standard_name",
                label: "CENTER",
                options: {
                    filter: false,
                    sort: true,
                    search: true,
                    display: false,
                }
            },
            {
                name: "staff_first_name",
                label: "Staff Name",
                options: {
                    filter: false,
                    sort: true,
                    search: true,
                }
            },
            {
                name: "due_date",
                label: "DATE",
                options: {
                    filter: false,
                    sort: true,
                    search: true,
                }
            },
            {
                name: "update",
                label: "Staff Name",
                options: {
                    filter: false,
                    sort: true,
                    search: true,
                    display: false,
                    download: false
                }
            },
            {
                name: "evaluate",
                label: "Staff Name",
                options: {
                    filter: false,
                    sort: true,
                    search: true,
                    display: false,
                    download: false
                }
            },
            {
                name: "total_student",
                label: "Total Students",
                options: {
                    filter: false,
                    sort: true,
                    search: true,
                }
            },
            {
                name: "is_view_only",
                label: "Is View",
                options: {
                    filter: false,
                    sort: false,
                    viewColumns: false,
                    display: false,
                    download: false
                }
            },
            {
                name: "actions",
                label: "Action",
                options: {
                    filter: false,
                    sort: false,
                    search: false,
                    download: false,
                    customBodyRender: (value, tableMeta, updateValue) => {
                        return (
                            <HomeWorkListAction
                                id={tableMeta.rowData[0]}
                                index={tableMeta.rowIndex}
                                update={tableMeta.rowData[4]}
                                isViewOnly={tableMeta.rowData[7]}
                                deleteHomeWork={() =>
                                    this.deleteHomeWork(
                                        tableMeta.rowData[0],
                                        tableMeta.rowIndex,
                                    )
                                }
                                viewHomeWork={() =>
                                    this.viewHomeWork(tableMeta.rowData[0], tableMeta.rowIndex)
                                }
                                editHomeWork={() =>
                                    this.editHomeWork(tableMeta.rowData[0], tableMeta.rowIndex)
                                }
                                options={this.permission}
                            />
                        )
                    }
                }
            },
        ]
        this.dateRange = React.createRef();
        this.createEditHomeWorkRef = React.createRef();
    }

    goToEvaluatePage = (id, index) => {
        const { evaluate_list } = this.state;
        let data = evaluate_list['data_list'][index]
        const homework = { id: id, homeWorkData: data }
        this.setState({
            homework,
            isEvaluatePage: true
        })
    }

    handleViewImage = (attachment_details) => {
        let file = attachment_details.file
        let file_extension = `${file.slice((Math.max(0, file.lastIndexOf(".")) || Infinity) + 1)}`;
        if (image_formats.includes(file_extension)) {
            this.setState({
                largeImagePreview: file
            })
        }
        else {
            window.open(file);
        }
    }

    componentDidMount = () => {
        let { dateRangeValue, dateRangeDropdown, dateRangeDropdownList } = this.state;
        let { parentDateRangeValue, parentDateRangeDropdown } = this.props;
        let expanded = parentDateRangeDropdown
        let dropdownlist = cloneDeep(dateRangeDropdownList)
        if (expanded) {
            let start, end;
            if (parentDateRangeValue.start && parentDateRangeValue.end) {
                start = parentDateRangeValue.start
                end = parentDateRangeValue.end
            }
            else if (expanded === 'today') {
                start = dateFormat(new Date(), 'YYYY-MM-DD')
                end = dateFormat(new Date(), 'YYYY-MM-DD')
            }
            else if (expanded === 'tom') {
                start = dateFormat(moment(new Date()).add(1, 'days'), 'YYYY-MM-DD')
                end = dateFormat(moment(new Date()).add(1, 'days'), 'YYYY-MM-DD')
            }
            else if (expanded === 'week') {
                start = dateFormat(new Date(), 'YYYY-MM-DD')
                end = dateFormat(moment(new Date()).add(7, 'days'), 'YYYY-MM-DD')
            }
            if (expanded === 'custom') {
                dropdownlist[3]['hide'] = false
            }
            dateRangeValue.start = start
            dateRangeValue.end = end
            dateRangeDropdown = expanded
        }
        else {
            dateRangeValue.start = dateFormat(new Date(), 'YYYY-MM-DD')
            dateRangeValue.end = dateFormat(moment(new Date()).add(7, 'days'), 'YYYY-MM-DD')
        }
        this.permission.unshift('View')
        this.getStandard();
        this.setState({
            options: _.cloneDeep(options),
            dateRangeValue,
            dateRangeDropdown,
            dateRangeDropdownList: [...dropdownlist]
        }, () => {
            let startDate = moment(dateRangeValue.start)
            let endDate = moment(dateRangeValue.end)
            this.dateRange.current.onChange(moment.range(startDate.clone(), endDate.clone()));
        })
    }

    getStandard = () => {
        const params = { is_active: true };
        getRequest(GET_URL.getstandardandsection.api, params, this.props).then(
            (response) => {
                if (response && response.status === 200) {
                    const standardList = response.data.data;
                    this.setState({
                        standardList,
                    });
                }
            }
        );
    };

    handleChangeDateRange = (value, isOpened) => {
        let { dateRangeDropdown, dateRangeDropdownList, isInitialPageRender } = this.state;
        let { parentDateRangeDropdown } = this.props;
        if (isOpened || (isInitialPageRender && parentDateRangeDropdown === 'custom')) {
            dateRangeDropdownList[dateRangeDropdownList.length - 1]['hide'] = false
            dateRangeDropdown = 'custom'
        }
        else {
            dateRangeDropdownList[dateRangeDropdownList.length - 1]['hide'] = true
        }
        this.setState({
            dateRangeValue: value,
            dateRangeDropdown,
            dateRangeDropdownList,
            tableUpdating: true,
            isInitialPageRender: false
        }, () => {
            this.props.updateDateRange(value, dateRangeDropdown)
            this.getAllHomeWorkList()
        })
    }

    getAllHomeWorkList = (paginationProps) => {
        let { pagination, id, dateRangeValue } = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = { ...pagination_params, is_active: true, }
        if (!_.isEmpty(dateRangeValue)) {
            let temp = {}
            temp['from_date'] = dateRangeValue.start
            temp['to_date'] = dateRangeValue.end
            params = { ...params, ...temp }
        }
        const url = GET_URL.diary.api
        getRequest(url, params, this.props).then((response) => {
            if (response && response.status === 200) {
                this.callApi = true
                response.data.data.data_list.map((data, index) => {
                    data['staff_name'] = getFullName(data['staff_first_name'], data['staff_middle_name'], data['staff_last_name'])
                    data['is_view_only'] = moment(dateFormat(data['due_date'], 'YYYY-MM-DD')).isBefore(dateFormat(new Date(), 'YYYY-MM-DD'))
                    data['due_date'] = dateFormat(data['due_date'], 'DD-MM-YYYY')

                })
                this.setState({
                    homeWorkList: response.data.data,
                    loading: false,
                    tableUpdating: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                });
            }
        });
    };

    onChangeDateRangeDropdown = (e) => {
        let { name, value } = e.target;
        let { dateRangeValue, pagination } = this.state;
        let start, end;
        if (value === 'today') {
            start = dateFormat(new Date(), 'YYYY-MM-DD')
            end = dateFormat(new Date(), 'YYYY-MM-DD')
        }
        else if (value === 'tom') {
            start = dateFormat(moment(new Date()).add(1, 'days'), 'YYYY-MM-DD')
            end = dateFormat(moment(new Date()).add(1, 'days'), 'YYYY-MM-DD')
        }
        else if (value === 'week') {
            start = dateFormat(new Date(), 'YYYY-MM-DD')
            end = dateFormat(moment(new Date()).add(7, 'days'), 'YYYY-MM-DD')
        }
        dateRangeValue.start = start
        dateRangeValue.end = end
        this.setState({
            dateRangeValue,
            [name]: value,
            isDropDownDateRange: true,
            tableUpdating: true
        }, () => {
            let startDate = moment(start)
            let endDate = moment(end)
            this.dateRange.current.onChange(moment.range(startDate.clone(), endDate.clone()));
            this.props.updateDateRange(dateRangeValue, value)
        })
    }

    editHomeWork = (id) => {
        this.props.editHomeWork(id)
    };

   // File: src/utils/DownloadReportHandler.js

handleDownloadReport = (format) => {
    const { dateRangeValue } = this.state;
    this.setState(prevState => ({
        downloadLoading: {
            ...prevState.downloadLoading,
            [format]: true
        }
    }));

    clearInterval(this.setTime);
    const transaction_id = Date.now();
    const url = `${GET_URL.diaryreport.api}?long_running_process=1&transaction_id=${transaction_id}`;

    const fileName = `Diary_Report_${dateFormat(new Date(), "DD-MM-YYYY HH:MM:SS A")}`;
    const params = {
        from_date: dateRangeValue.start,
        to_date: dateRangeValue.end,
        document_type: format,
        file_name: fileName,
        is_active: true,
        ordering: '-id'
    };

    const prop = {
        ...this.props,
        responseType: "blob",
        return_error_message: true
    };

    getRequest(url, params, prop)
        .then((response) => {
            if (response?.status === 200) {
                clearInterval(this.setTime);
                this.setState({
                    transaction_id,
                    count: 60,
                    setTimeLimit: 0,
                    currentFileName: fileName
                }, () => {
                    this.setIntervalTime(format);
                });
            } else {
                this.handleDownloadComplete(format);
            }
        })
        .catch((error) => {
            console.error("Error initiating report generation:", error);
            this.handleDownloadComplete(format);
        });
};

setIntervalTime = (format) => {
    clearInterval(this.setTime);
    this.setTime = setInterval(() => {
        this.getlongprocessingapiresult(format);
    }, 5000);

    this.setTimeLimit = 0;
    const timeChecker = setInterval(() => {
        this.setTimeLimit += 1;
        if (this.setTimeLimit >= 40) {
            clearInterval(this.setTime);
            clearInterval(timeChecker);
            this.handleDownloadComplete(format);
        }
    }, 5000);
};

getlongprocessingapiresult = (format) => {
    const { count, currentFileName } = this.state;
    if (count <= 0) {
        Swal.fire({
            icon: "error",
            title: `The process is getting too delayed, please contact ${process.env.REACT_APP_ENV} team !!`,
            showConfirmButton: true,
        });
        clearInterval(this.setTime);
        this.handleDownloadComplete(format);
        return;
    }

    this.setState({ count: count - 1 });

    const params = {
        transaction_id: this.state.transaction_id,
        is_active: true,
    };
    const props = {
        ...this.props,
        return_error_message: true
    };

    getRequest(GET_URL.longprocessingapiresult.api, params, props)
    .then((response) => {
        if (response?.status === 200) {
            const result = response.data?.data;

            console.log("API full response data:", result);

            if (!result?.is_process_running) {
                const data = result?.result_data;
                if (!data || Object.keys(data).length === 0) {
                    console.warn("result_data is empty:", data);
                    this.handleDownloadComplete(format);
                    return;
                }

                if (data?.error) {
                    ErrorHandler({
                        response: {
                            status: 400,
                            data: data.error,
                        },
                    });
                    this.handleDownloadComplete(format);
                    return;
                }

                try {
                    if (data.url) {
                        window.open(data.url, '_self');
                    } else if (data.file_data) {
                        const contentType = format === 'pdf' ? 'application/pdf' : 'image/png';
                        const blob = new Blob([data.file_data], { type: contentType });
                        const fileURL = URL.createObjectURL(blob);

                        if (format === 'pdf') {
                            const height = (window.screen.height * 75) / 100;
                            const width = (window.screen.width * 75) / 100;
                            window.open(fileURL, '_blank', `height=${height},width=${width}`);
                        } else {
                            const link = document.createElement('a');
                            link.href = fileURL;
                            link.download = data.file_name || `${currentFileName}.${format}`;
                            document.body.appendChild(link);
                            link.click();
                            setTimeout(() => {
                                document.body.removeChild(link);
                                URL.revokeObjectURL(fileURL);
                            }, 100);
                        }
                    }
                } catch (error) {
                    console.error('Error handling file download:', error);
                    ErrorHandler({
                        response: {
                            status: 400,
                            data: 'Failed to process download file',
                        },
                    });
                }
            }
        }
        this.handleDownloadComplete(format);
    })

        .catch((error) => {
            console.error('Download request failed:', error);
            this.handleDownloadComplete(format);
            ErrorHandler(error);
        });
};

handleDownloadComplete = (format) => {
    clearInterval(this.setTime);
    this.setState(prevState => ({
        downloadLoading: {
            ...prevState.downloadLoading,
            [format]: false
        }
    }));
};


    render() {
        const { loading, homeWorkList, pagination, dateRangeDropdownList, dateRangeDropdown, dateRangeValue,
            tableUpdating, downloadLoading } = this.state
        const { currentTab } = this.props;
        const options = {
            selectableRows: "none",
            filterType: "dropdown",
            responsive: "simple",
            filter: false,
            download: false,
            print: false,
            viewColumns: false,
            rowsPerPageOptions: [5, 10, 25, 50, 100],
            customToolbar: () => {
                return (
                    <div>
                        <Tooltip title="Download PDF Report">
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<PictureAsPdfIcon />}
                                onClick={() => this.handleDownloadReport('pdf')}
                                disabled={downloadLoading.pdf}
                                style={{ marginRight: '10px' }}
                            >
                                {downloadLoading.pdf ? <CircularProgress size={24} color="inherit" /> : 'PDF'}
                            </Button>
                        </Tooltip>
                        <Tooltip title="Download Image Report">
                            <Button
                                variant="contained"
                                color="secondary"
                                startIcon={<ImageIcon />}
                                onClick={() => this.handleDownloadReport('img')}
                                disabled={downloadLoading.img}
                            >
                                {downloadLoading.img ? <CircularProgress size={24} color="inherit" /> : 'Image'}
                            </Button>
                        </Tooltip>
                    </div>
                );
            }
        };

        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Box className={currentTab === 'HomeWorkList' ? '' : 'display-none'}>
                    <Grid container spacing={2}>
                        <Grid item md={4} xs={12} className='margin-top-15'>
                            <Dropdown
                                data={dateRangeDropdownList}
                                name='dateRangeDropdown'
                                value={dateRangeDropdown}
                                onChange={this.onChangeDateRangeDropdown}
                                label='Due date range type'
                                hideSelect={true}
                            />
                        </Grid>
                        <Grid item md={4} xs={12}>
                            <DateRange
                                handleChange={this.handleChangeDateRange}
                                minDate={minDate}
                                maxDate={maxDate}
                                label='Custom due date range'
                                ref={this.dateRange}
                                hideClearIcon={true}
                            />
                        </Grid>
                    </Grid>

                    <Grid container className={classNames('header-align')}>
                        <Grid item md={12} xs={12}>
                            <AllMUIDataTable
                                key={homeWorkList.data_list}
                                title={tableUpdating ? <CircularProgress className='white-text' /> :
                                    `${dateFormat(dateRangeValue.start, 'DD-MM-YYYY')} TO ${dateFormat(dateRangeValue.end, 'DD-MM-YYYY')}`}
                                data={homeWorkList.data_list}
                                columns={this.columns}
                                options={options}
                                onTableChange={this.getAllHomeWorkList}
                                serverSide={true}
                                pagination={pagination}
                                count={homeWorkList.count}
                            />
                        </Grid>
                    </Grid>
                </Box>
            )
        }
    }
}
export default withRouter(AllHomeWorkList)