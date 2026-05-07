import React, { Component, Fragment } from 'react'
import { Paper, Box, Grid, Button, CircularProgress, IconButton, Tooltip, Typography } from '@material-ui/core';
import PrintOutlinedIcon from '@material-ui/icons/PrintOutlined';
import Swal from 'sweetalert2'
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { DateRange } from 'Components/DateRange';
import moment from 'moment';

import Skeleton from '@material-ui/lab/Skeleton';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { Dropdown } from 'Components/DropDown';
import StudentListActions from 'Includes/StudentListActions'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest, putRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getKeyValueMap, getUrlParam, getFullName, getPaginationProps, dateFormat } from 'Includes/functions';
import { DEFAULT_PAGINATION_PROPS, minDate } from 'Constants';
import { values } from 'react-intl/locale-data/hi';

class SchoolVisitorList extends Component {
    constructor() {
        super()
        let date = new Date();
        this.state = {
            visitorsList: { data_list: [] },
            summary: { total_visitors: 0, checked_out: 0, still_inside: 0 },
            buildingList: [],
            selectedBuilding: '',
            loading: true,
            dateRangeValue: {
                start: dateFormat(new Date(date.getFullYear(), date.getMonth(), 1), 'YYYY-MM-DD'), end: dateFormat(new Date(), 'YYYY-MM-DD')
            },
            error: {},
            floorLoading: false,
            pageLoading: false,
            pagination: { ...DEFAULT_PAGINATION_PROPS },
            isBlankPage: true,
            blankData: 'Select Building',
            isSingleBuilding: false,
            printVisitorId: null,
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: false,
                        sort: false,
                        display: false,
                        viewColumns: false,
                        download: false,
                    }
                },
                {
                    name: "name",
                    label: "Visitor Name",
                    options: {
                        filter: true,
                        sort: true,
                    }
                },
                {
                    name: "checkin",
                    label: "Check In",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "checkout",
                    label: "Check Out",
                    options: {
                        filter: false,
                        sort: true,
                    }
                },
                {
                    name: "visited_for",
                    label: "Visited For",
                    options: {
                        filter: false,
                        sort: false,
                    }
                },
                {
                    name: "visited_name",
                    label: "Name",
                    options: {
                        filter: false,
                        sort: false,
                    }
                },
                {
                    name: 'Actions',
                    label: 'Action',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: true,
                        sort: true,
                        download: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            const visitorId = tableMeta.rowData[0];
                            const printing = this.state.printVisitorId === visitorId;
                            return (<div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                <StudentListActions
                                    id={visitorId}
                                    index={tableMeta.rowIndex}
                                    deleteStudent={this.deleteVisitor}
                                    editURL={Actions.school_visitor.update.url}
                                    viewURL={Actions.school_visitor_individual.view.url}
                                    enabledActions={this.state.enabledActions}
                                />
                                {isUserHasPermission('school_visitor', 'view') && (
                                    <Tooltip title="Print visitor pass">
                                        <span>
                                            <IconButton
                                                size="small"
                                                onClick={() => this.printVisitorPass(visitorId)}
                                                disabled={printing || !!this.state.printVisitorId}
                                            >
                                                {printing ? <CircularProgress size={20} /> : <PrintOutlinedIcon />}
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                )}
                            </div>
                            );
                        }
                    }
                }

            ],
        }
        this.dateRange = React.createRef();
    }



    updateCreatePermissions = () => {
        if (isUserHasPermission('room_allocation', 'view')) {
            return true
        }
        else {
            return false
        }
    }

    updatePermissions = (name) => {
        let test = true
        const hasViewPermission = isUserHasPermission('school_visitor_individual', 'view')
        const hasEditPermission = isUserHasPermission('school_visitor', 'update')
        const hasDeletePermission = isUserHasPermission('school_visitor', 'delete')
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

    deleteVisitor = async (id, index) => {
        this.setState({ tableUpdating: true })
        let { visitorsList, columns } = this.state
        const del_url = DEL_URL.visitor.api
        const url = del_url + id + '/';
        deleteRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                visitorsList.data_list.splice(index, 1)
                this.setState({
                    visitorsList,
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

    componentDidMount = () => {
        this.getSchoolBuildingList()
        this.updatePermissions('actions');
    }

    getSchoolBuildingList = () => {
        const url = GET_URL.buildingdata.api
        const params = { is_active: true, building_type: 'School' }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    buildingList: response.data.data,
                    selectedBuilding: response.data.data.length === 1 ? response.data.data[0]['id'] : '',
                    isSingleBuilding: response.data.data.length === 1 ? true : false,
                    loading: response.data.data.length === 1 ? true : false
                }, () => {
                    if (response.data.data.length === 1) {
                        this.getVisitorsList()
                    }
                    else {
                        let { selectedBuilding } = getUrlParam();
                        if (!!selectedBuilding && selectedBuilding !== 'undefined') {
                            this.setState({
                                selectedBuilding,
                                loading: true
                            }, () => {
                                this.getVisitorsList()
                            })
                        }
                    }
                })
            }
        })
    }

    getVisitorsList = (paginationProps) => {
        this.setState({ tableUpdating: true })
        let { pagination, dateRangeValue, selectedBuilding } = this.state;
        this.currentPagination = pagination;
        if (paginationProps) {
            this.currentPagination = { ...paginationProps };
        }
        let pagination_params = getPaginationProps(this.currentPagination);
        let params = {
            ...pagination_params, pagination: true, is_active: true, fromDate: `${dateRangeValue.start} 00:00:00`, toDate: `${dateRangeValue.end} 23:59:00`,
            building: selectedBuilding,
        };
        const url = GET_URL.visitor.api
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                response.data.data.data_list.map((data) => {
                    data.checkin = dateFormat(data.checkin, 'DD-MM-YYYY hh:mm A')
                    data.checkout = dateFormat(data.checkout, 'DD-MM-YYYY hh:mm A')
                    if (data.user_details) {
                        data.visited_for = data.user_details['staff'] ? 'Staff' : 'Student'
                        data.visited_name = data.user_details['staff'] ? getFullName(data.user_details.staff.first_name, data.user_details.staff.middle_name, data.user_details.staff.last_name) :
                            getFullName(data.user_details.student.first_name, data.user_details.student.middle_name, data.user_details.student.last_name)
                    }
                })
                const payload = response.data.data;
                const summary = payload.summary || {
                    total_visitors: payload.count || 0,
                    checked_out: 0,
                    still_inside: 0,
                };
                this.setState({
                    visitorsList: payload,
                    summary,
                    isBlankPage: false,
                    tableUpdating: false,
                    loading: false,
                    pagination: this.currentPagination
                        ? this.currentPagination
                        : this.state.pagination,
                })
            }
        })
    }

    handleChangeDateRange = (value) => {
        let { pagination } = this.state;
        this.setState({
            dateRangeValue: value,
        }, () => {
            this.getVisitorsList(pagination)
        })
    }

    onChange = (e) => {
        let { name, value } = e.target;
        this.setState({
            [name]: value,
            error: {}
        }, () => {
            this.getVisitorsList()
        })
    }

    printVisitorPass = (visitorId) => {
        if (!visitorId) return;
        this.setState({ printVisitorId: visitorId });
        const url = GET_URL.visitor.api;
        const params = { print_pass: 1, visitor: visitorId };
        const prop = { ...this.props, responseType: 'blob', return_error: true };
        getRequest(url, params, prop).then((response) => {
            if (response && response.status === 200) {
                const Data = new Blob([response.data], { type: 'application/pdf' });
                const fileURL = URL.createObjectURL(Data);
                const height = (window.screen.height * 75) / 100;
                const width = (window.screen.width * 75) / 100;
                const win = window.open(fileURL, 'PRINT', `height=${height},width=${width}`);
                if (win) {
                    win.print();
                }
            } else {
                Swal.fire({
                    type: 'error',
                    title: 'Error',
                    text: 'Could not generate visitor pass.',
                });
            }
            this.setState({ printVisitorId: null });
        }).catch(() => {
            this.setState({ printVisitorId: null });
            Swal.fire({
                type: 'error',
                title: 'Error',
                text: 'Could not generate visitor pass.',
            });
        });
    };

    handleAddVisitor = () => {
        let { selectedBuilding, buildingList, error } = this.state;
        let buildingInformation = {}
        if (!!selectedBuilding) {
            let buildingName = getKeyValueMap(buildingList, 'id', 'name')
            buildingName = buildingName[selectedBuilding]
            buildingInformation = {
                selectedBuilding: selectedBuilding,
                buildingName: buildingName,
            }
            let searchParam = "?" + new URLSearchParams(buildingInformation).toString()
            this.props.history.push({
                pathname: Actions.school_visitor.create.url,
                search: searchParam,
            });
        }
        else {
            error['selectedBuilding'] = 'Select Building'
            this.setState({
                error
            })
        }
    }

    render() {
        const { loading, selectedBuilding, columns, tableUpdating, buildingList, isBlankPage, error, floorList,
            visitorsList, pageLoading, blankData, pagination, dateRangeValue, isSingleBuilding, summary } = this.state
        const { isComponent } = this.props;
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
                    data_value.data[1] = data_value.data[1].toString()
                    data_value.data[2] = data_value.data[2] === true ? '' : data_value.data[2]
                    return data_value;
                })
                return "\uFEFF" + buildHead(columns) + buildBody(bodyData);
            },
            downloadOptions: {
                filename: "School_Visitors.csv",
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
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    {Actions.school_visitor.view.label}
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('school_visitor', 'create') && <Button
                                        variant='contained'
                                        onClick={this.handleAddVisitor}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.school_visitor.create.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            {!isSingleBuilding &&
                                <Grid item md={3} xs={12} className='mt-20'>
                                    <Dropdown
                                        data={buildingList}
                                        name='selectedBuilding'
                                        fullWidth
                                        value={selectedBuilding}
                                        onChange={this.onChange}
                                        label='Building'
                                        hideSelect={true}
                                        error={error.selectedBuilding}
                                    />
                                </Grid>
                            }
                            {selectedBuilding &&
                                <Grid item md={4} xs={12}>
                                    <DateRange
                                        handleChange={this.handleChangeDateRange}
                                        minDate={minDate}
                                        maxDate={new Date()}
                                        label='Visitors date range'
                                        ref={this.dateRange}
                                        hideClearIcon={true}
                                        startDate={dateRangeValue.start}
                                        endDate={dateRangeValue.end}
                                    />
                                </Grid>
                            }

                        </Grid>
                        {selectedBuilding && !isBlankPage && !pageLoading && (
                            <Grid container spacing={2} className="mt-20 mb-10">
                                <Grid item xs={12} sm={4}>
                                    <Paper variant="outlined" style={{ padding: 16, height: '100%' }}>
                                        <Typography variant="body2" color="textSecondary">
                                            Total visitors
                                        </Typography>
                                        <Typography variant="h5" component="p">
                                            {summary.total_visitors ?? visitorsList.count ?? 0}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Paper variant="outlined" style={{ padding: 16, height: '100%' }}>
                                        <Typography variant="body2" color="textSecondary">
                                            Still on premises
                                        </Typography>
                                        <Typography variant="h5" component="p" style={{ color: '#1976d2' }}>
                                            {summary.still_inside ?? 0}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            No check-out recorded yet
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Paper variant="outlined" style={{ padding: 16, height: '100%' }}>
                                        <Typography variant="body2" color="textSecondary">
                                            Checked out
                                        </Typography>
                                        <Typography variant="h5" component="p" style={{ color: '#2e7d32' }}>
                                            {summary.checked_out ?? 0}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>
                        )}
                        {(isBlankPage && !pageLoading) &&
                            <Box className='header-align'>
                                <BlankPagewithIcon data={blankData} />
                            </Box>
                        }
                        {pageLoading &&
                            <Box display='flex'>
                                <CircularProgress className='loading' />
                            </Box>
                        }
                        {!isBlankPage && !pageLoading &&
                            <Grid container className='header-align'>
                                <Grid item md={12}>
                                    <Paper>
                                        <AllMUIDataTable
                                            title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                            key={visitorsList.data_list}
                                            data={visitorsList.data_list}
                                            columns={columns}
                                            options={options}
                                            onTableChange={this.getVisitorsList}
                                            serverSide={true}
                                            pagination={pagination}
                                            count={visitorsList.count}
                                        />
                                    </Paper>
                                </Grid>
                            </Grid>
                        }
                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(SchoolVisitorList)