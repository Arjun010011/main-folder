import React, { Component } from 'react'
import { Paper, Box, Grid, Tooltip } from '@material-ui/core';
import moment from 'moment';
import classNames from 'classnames';
import _ from 'lodash';
import { withRouter } from 'react-router-dom';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import loadingBar from 'images/loading.gif'
import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import CreateHomeWorkModal from "./Components/CreateHomeWorkModal";

import { Actions } from 'Constants/permissions';
import {
    isUserHasPermission, updatePermissions, getUrlParam, dateFormat, getFormatMessage, numberWithCommas, getFullName
} from 'Includes/functions';
import { options, minDate, DEFAULT_PAGINATION_PROPS_ID_LIST, maxDate } from 'Constants';
import { image_formats } from 'Containers/Expenses/Constants';
import { Today } from '@material-ui/icons';
import AllHomeWorkList from './Components/AllHomeWorkList';
// import EvaluateHomeWorkList from './Components/EvaluateHomeWorkList';
// import CompletedHomeWorkList from './Components/CompletedHomeWorkList';

class HomeWorkList extends Component {
    constructor() {
        super()
        this.permission = updatePermissions('abacus_managehomework', ['update', 'delete'])
        this.state = {
            homeWorkList: [],
            loading: true,
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
            dateRangeDropdownList: [{ id: 'today', name: 'Today' }, { id: 'tom', name: 'Tomorrow' }, { id: 'week', name: 'This week' }],
            isDateRange: false,
            dateRangeDropdown: 'week',
            hasEvaluatePermission: false,
            evaluate_list: [],
            standardList: [],
            homework: {},
            dropDownTypeValue: '',
        }
        this.dateRange = React.createRef();
        this.createEditHomeWorkRef = React.createRef();
        this.getHomeWork = React.createRef();
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
        let { currentTab, dateRangeDropdown, dateRangeValue } = this.state
        this.permission.unshift('View')
        const hasEvaluatePermission = isUserHasPermission(
            "abacus_evaluatestudentshomework",
            "create"
        );
        let { dateRangeDropdownParam, dateRangeValueStart, dateRangeValueEnd, id } = getUrlParam()
        if (dateRangeDropdownParam && dateRangeValueStart && dateRangeValueEnd) {
            dateRangeDropdown = dateRangeDropdownParam
            dateRangeValue = { start: dateRangeValueStart, end: dateRangeValueEnd }
        }
        this.setState({
            dateRangeDropdown,
            dateRangeValue,
            currentTab,
            options: _.cloneDeep(options),
            hasEvaluatePermission,
        }, () => {
            this.getStandard(id);
        })
    }

    getStandard = (id) => {
        const params = { is_active: true };
        getRequest(GET_URL.getstandardandsection.api, params, this.props).then(
            (response) => {
                if (response && response.status === 200) {
                    const standardList = response.data.data;
                    this.setState({
                        standardList,
                        loading: false
                    },()=>{
                        if (Actions.abacus_managehomework.create.url === this.props.location.pathname) {
                            this.createEditHomeWorkRef.current.handleClickOpen()
                        }
                        else if (Actions.abacus_managehomework.update.url === this.props.location.pathname) {
                            if (id) {
                                this.createEditHomeWorkRef.current.editHomeWork(id)
                            }
                            else {
                                this.changeTab('HomeWorkList')
                            }
                        }
            
                    });
                }
            }
        );
    };

    handleCloseLargeImage = () => {
        this.setState({
            largeImagePreview: ''
        })
    }


    handleNavigateCreate = () => {
        const { dateRangeValue, dateRangeDropdown } = this.state
        let sectionInformation = {
            'dateRangeValueStart': dateRangeValue.start,
            'dateRangeValueEnd': dateRangeValue.end,
            'dateRangeDropdownParam': dateRangeDropdown,
        }
        let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
        this.props.history.push({
            pathname: Actions.abacus_managehomework.create.url,
            search: searchParam,
        });
    }

    changeTab = (name) => {
        const { dateRangeValue, dateRangeDropdown } = this.state
        let sectionInformation = {
            'dateRangeValueStart': dateRangeValue.start,
            'dateRangeValueEnd': dateRangeValue.end,
            'dateRangeDropdownParam': dateRangeDropdown,
        }
        let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
        if (name === 'Evaluation') {
            this.props.history.push({
                pathname: Actions.abacus_managehomework_evaluate_list.view.url,
                search: searchParam,
            });
        }
        else if (name === 'HomeWorkList') {
            this.props.history.push({
                pathname: Actions.abacus_managehomework.view.url,
                search: searchParam,
            });
        }
        else if (name === 'Completed') {
            this.props.history.push({
                pathname: Actions.abacus_managehomework_completed_list.view.url,
                search: searchParam,
            });
        }
    };

    evaluatehomework = () => {
        this.setState({
            isEvaluatePage: false
        })
    }

    getHomeWorkList = () => {
       this.changeTab('HomeWorkList')
    }

    editHomeWork = (id) => {
        const { dateRangeValue, dateRangeDropdown } = this.state
        let sectionInformation = {
            'dateRangeValueStart': dateRangeValue.start,
            'dateRangeValueEnd': dateRangeValue.end,
            'dateRangeDropdownParam': dateRangeDropdown,
            'id': id
        }
        let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
        this.props.history.push({
            pathname: Actions.abacus_managehomework.update.url,
            search: searchParam,
        });
    }

    viewHomeWork = (id) => {
        const { dateRangeValue, dateRangeDropdown } = this.state
        let sectionInformation = {
            'dateRangeValueStart': dateRangeValue.start,
            'dateRangeValueEnd': dateRangeValue.end,
            'dateRangeDropdownParam': dateRangeDropdown,
            'id': id
        }
        let searchParam = "?" + new URLSearchParams(sectionInformation).toString()
        this.props.history.push({
            pathname: Actions.abacus_viewhomework.view.url,
            search: searchParam,
        });
    }

    updateDateRange = (dateRangeValue, dateRangeDropdown) => {
        this.setState({
            dateRangeDropdown,
            dateRangeValue
        })
    }

    render() {
        const { loading, dropDownTypeValue, standardList, isEdit, currentTab, hasEvaluatePermission,
            largeImagePreview, dateRangeValue, dateRangeDropdown } = this.state
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
                const bodyData = data.map((data_value, i) => {
                    if (data_value.data[1]) {
                        data_value.data[1] = 'Deposite'
                    }
                    else {
                        data_value.data[1] = 'Withdraw'
                    }
                    data_value.data[0] = dateFormat(data_value.data[0], 'DD-MM-YYYY')
                    return data_value
                })
                columns.forEach(column_name => {
                    column_name.label = getFormatMessage(column_name.label)
                })
                return "\uFEFF" + buildHead(columns) + buildBody(bodyData);
            },
            downloadOptions: {
                filename: "Bank_Transactions.csv",
                filterOptions: {
                    useDisplayedColumnsOnly: true,
                    useDisplayedRowsOnly: true,
                },
            },
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
                <Box>
                    <Paper className={classNames('paper-background')}>
                        {largeImagePreview &&
                            <Box className='set-question-large-image-preview-box'>
                                <img src={largeImagePreview} alt='Image Preview' className='set-question-large-image-preview' />
                                <Tooltip title='Close Image' placement='top-start'>
                                    <Box className='set-question-large-image-remove-icon-box'
                                        onClick={this.handleCloseLargeImage}>
                                        <HighlightOffIcon className='set-question-large-image-remove-icon' />
                                    </Box>
                                </Tooltip>
                            </Box>
                        }
                        <Grid container>
                            <Grid item md={6} xs={12} className='header-align display-flex'>
                                <Box
                                    className={
                                        currentTab === "HomeWorkList"
                                            ? "leave-management-selected-heading"
                                            : "leave-management-heading"
                                    }
                                    onClick={() => this.changeTab("HomeWorkList")}
                                >
                                   Abacus Home Work List
                                    {currentTab === "HomeWorkList" && (
                                        <Box className="leave-management-selected-heading-underline" />
                                    )}
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('abacus_managehomework', 'create') &&
                                        <Box className="button-align">
                                            <CreateHomeWorkModal
                                                ref={this.createEditHomeWorkRef}
                                                standardList={standardList}
                                                getHomeWorkList={this.getHomeWorkList}
                                                isEdit={isEdit}
                                                handleNavigateCreate={this.handleNavigateCreate}
                                                changeTab={this.changeTab}
                                            />
                                        </Box>
                                    }
                                </Box>

                            </Grid>
                        </Grid>
                        <hr style={{ marginTop: "-4px" }} />
                        <Grid container className={classNames('header-align')}>
                            <Grid item md={12} xs={12}>
                                {currentTab === "HomeWorkList" &&
                                    <AllHomeWorkList
                                        editHomeWork={this.editHomeWork}
                                        viewHomeWork={this.viewHomeWork}
                                        currentTab={currentTab}
                                        updateDateRange={this.updateDateRange}
                                        parentDateRangeValue={dateRangeValue}
                                        parentDateRangeDropdown={dateRangeDropdown}
                                    />
                                }
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(HomeWorkList)