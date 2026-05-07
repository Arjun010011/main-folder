import React, { Component } from 'react'
import { Paper, Box, Grid, Button, Icon, CircularProgress } from '@material-ui/core';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import { withRouter } from 'react-router-dom';
import classNames from 'classnames';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';

import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import CalenderView from 'Containers/General/Components/CalenderView';
import ActionColumn from 'Components/ActionColumnNew'
import AllMUIDataTable from 'Components/AllMUIDataTable';
import loadingBar from 'images/loading.gif'
import { getRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, DEL_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { getFinancialYear, SetFinancialYear, dateFormat, isUserHasPermission, getKeyValueMap } from 'Includes/functions';
import { Dropdown } from 'Components/DropDown';
import { minDate, maxDate, options } from 'Constants';
import './styles.scss';


function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const fieldDetails = [
    {
        label: 'Holiday Name', regex: nameAndNumberRegex, autoFocus: true, name: 'reason', md: 12, className: 'width-100',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 100
    },
    {
        label: 'From Date', regex: '', name: 'from_date', md: 12, minDate: new Date(), maxDate: maxDate, className: 'width-100',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'date'
    },
    {
        label: 'To Date', regex: '', name: 'to_date', md: 12, maxDate: maxDate, className: 'width-100',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'date', parentMinDate: 'from_date'
    },
]

class HolidayCalenderView extends Component {
    constructor() {
        super()
        this.state = {
            financialYearList: [],
            selectedCountry: '',
            holidayList: [],
            eventList: [],
            GridEnabled: true,
            ListEnabled: false,
            loading: true,
            selectedToDelete: [],
            tableUpdating: false,
            error: {},
            columns: [
                {
                    name: "id",
                    label: "id",
                    options: {
                        filter: true,
                        sort: true,
                        display: false
                    }
                },
                {
                    name: "Serial Number",
                    label: "Sl NO",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                tableMeta.rowIndex + 1
                            )
                        }
                    }
                },
                {
                    name: "reason",
                    label: "Holiday Name",
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div className='mui-table-custom-value-left-align text-transform-none'>
                                {value}
                            </div>)

                        }
                    }
                },
                {
                    name: 'from_date',
                    label: 'From Date',
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                dateFormat(value, 'DD-MM-YYYY')
                            )
                        }
                    }
                },
                {
                    name: 'to_date',
                    label: 'To Date',
                    options: {
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                dateFormat(value, 'DD-MM-YYYY')
                            )
                        }
                    }
                },
                {
                    name: 'Actions',
                    label: 'Actions',
                    options: {
                        display: this.updatePermissions('display'),
                        filter: true,
                        sort: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (<div>
                                <ActionColumn
                                    id={tableMeta.rowData[0]}
                                    fieldValues={this.fieldValues(tableMeta.rowData[2], tableMeta.rowData[3], tableMeta.rowData[4])}
                                    label='Please Update Holiday Calender Details'
                                    fieldDetails={fieldDetails}
                                    updateUrl={PUT_URL.holidaycalender.api}
                                    updatePostFormat={this.updatePostFormat}
                                    updateType={this.updateType}
                                    deleteUrl={DEL_URL.holidaycalender.api}
                                    deleteType={this.deleteType}
                                    baseClassName='action-basic-detail-width'
                                    enabledActions={this.state.enabledActions}
                                />
                            </div>
                            );
                        }
                    }
                }

            ]
        }
    }

    fieldValues(reason, from, to) {
        let fieldValues = [];
        fieldValues.push(reason);
        fieldValues.push(from);
        fieldValues.push(to);
        return fieldValues
    }

    updatePostFormat = (newData) => {
        let { selectedCountry } = this.state
        let payload = {
            financial_year: selectedCountry,
            reason: newData.reason,
            from_date: dateFormat(newData.from_date, 'YYYY-MM-DD'),
            to_date: dateFormat(newData.to_date, 'YYYY-MM-DD')
        }
        return payload
    }

    updatePermissions = (name) => {
        let test = true
        const hasEditPermission = isUserHasPermission('view_holiday_calender', 'update')
        const hasDeletePermission = isUserHasPermission('view_holiday_calender', 'delete')
        let permissions = [];
        let enabledActions = []
        if (hasEditPermission) {
            enabledActions.push('edit')
            permissions.push('view_holiday_calender');
        }
        if (hasDeletePermission) {
            enabledActions.push('delete')
            permissions.push('view_holiday_calender');
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
                permissions,
                columns: this.state.columns
            })
        }
    }

    componentDidMount = () => {
        this.getfinancialYearList()
        this.updatePermissions('actions');
        this.setState({
            options: options
        })
    }


    updateType = (newData, id) => {
        let { holidayList, eventList, columns } = this.state
        this.setState({ tableUpdating: true })
        let holiday = holidayList
        let events = eventList
        holiday.map((data, index) => {
            if (data.id === id) {
                holiday[index].reason = newData.reason
                holiday[index].from_date = newData.from_date
                holiday[index].to_date = newData.to_date
            }
        })
        events.map((data, index) => {
            if (data.id === id) {
                events[index].title = newData.reason
                events[index].start = new Date(newData.from_date)
                events[index].end = new Date(newData.to_date)
            } 
        })
        this.setState({
            holidayList: [...holiday],
            eventList: [...events],
            tableUpdating: false, 
            columns: columns
        })
        return true
    }

    getfinancialYearList = () => {
        const url = GET_URL.financialyear.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let fromYear = ''
                let ToYear = ''
                response.data.data.map((data) => {
                    fromYear = data.start_date.split('-');
                    ToYear = data.end_date.split('-');
                    data.name = fromYear[0] + '-' + ToYear[0]
                })
                this.setState({
                    financialYearList: response.data.data,
                })
                if (this.props.location.state) {
                    let selectedCountry = this.props.location.state.selectedCountry
                    this.setState({
                        selectedCountry: selectedCountry,
                    })
                    this.getholidayList(selectedCountry);
                }
                else if (getFinancialYear()) {
                    let yearValue = getFinancialYear()
                    this.getholidayList(yearValue);
                }
                else {
                    this.setState({
                        loading: false
                    })
                }
            }
        })
    }

    deleteType = async (id) => {
        let state = this.state.holidayList
        let events = this.state.eventList
        state.map((data, index) => {
            if (data.id === id) {
                state.splice(index, 1)
                events.splice(index, 1)
            }
        })
        this.setState({
            holidayList: state,
            eventList: events
        })
    }

    onChange = async (e) => {
        let { value, name } = e.target;
        if (value !== 0) {
            this.setState({
                error: {},
                [name]: value,
                tableUpdating: true
            }, () => {
                this.getholidayList(value);
            })
            SetFinancialYear(value)
        }
    }

    getholidayList = (id) => {
        const url = GET_URL.holidaycalender.api
        const params = { financial_year: id, is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let list = []
                response.data.data.map((data) => {
                    let newEvent = {}
                    newEvent['id'] = data['id']
                    newEvent['title'] = data['reason']
                    newEvent['start'] = new Date(data['from_date']) 
                    newEvent['start'].setHours(0) 
                    newEvent['start'].setMinutes(0) 
                    newEvent['start'].setSeconds(0)
                    newEvent['end'] = new Date(data['to_date']) 
                    newEvent['end'].setHours(23) 
                    newEvent['end'].setMinutes(59) 
                    newEvent['end'].setSeconds(59)
                    newEvent['allDay'] = true
                    list.push(newEvent)
                })
                this.setState({
                    holidayList: response.data.data,
                    eventList: list,
                    tableUpdating: false,
                    loading: false
                })
            }
        })
    }


    handleAddButton = () => {
        let { selectedCountry, error, alertData, financialYearList } = this.state;
        if (selectedCountry && selectedCountry !== 0) {

            let countryNames = getKeyValueMap(financialYearList, 'id', 'name')
            let countryName = countryNames[selectedCountry]

            let fromDate, toDate

            financialYearList.map((data) => {
                if (data.id == selectedCountry) {
                    fromDate = data.start_date
                    toDate = data.end_date
                }
            })

            let yearInformation = {
                selectedCountry: selectedCountry,
                countryName: countryName,
                fromDate: fromDate,
                toDate: toDate,
            }
            let searchParam = "?" + new URLSearchParams(yearInformation).toString()
            this.props.history.push({
                pathname: Actions.view_holiday_calender.create.url,
                search: searchParam,
            });

        }
        else {
            alertData = 'Please select Financial year'
            error.country = alertData
            this.setState({
                open: true,
                alertData,
                error
            })
        }

    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    render() {
        const { ListEnabled, GridEnabled, loading, financialYearList, selectedCountry, holidayList, columns, options, open, error, alertData,
            eventList, tableUpdating } = this.state
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
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    Holiday Calender for staff
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('view_holiday_calender', 'create') && <Button
                                        variant="contained"
                                        onClick={this.handleAddButton}
                                        className='editbutton-view'
                                    ><AddCircleOutlineOutlinedIcon className='visibility-icon' /> {Actions.view_holiday_calender.create.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container>
                            <Grid item md={4} xs={12} className='margin-top-20'>
                                <Dropdown
                                    data={financialYearList}
                                    name='selectedCountry'
                                    value={selectedCountry}
                                    onChange={this.onChange}
                                    label='Financial Year'
                                    error={error.country}
                                    hideSelect={true}
                                />
                            </Grid>
                            {selectedCountry &&
                                <Grid item md={7} xs={12} className='text-align-right'>
                                    <Box className='list-grid-toggle-holiday-calender-div header-align'>
                                        <Button className={GridEnabled === true ? 'list-selected-toggle' : 'grid-selected-toggle'}
                                            onClick={(e) => this.setState({ GridEnabled: true, ListEnabled: false })}
                                            disabled={this.state.GridEnabled === true}>
                                            <Box className={GridEnabled === true ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>calendar View</Box>
                                            <Icon className={classNames(GridEnabled === true ? 'list-selected-toggle-icon' : 'grid-selected-toggle-icon', "fa fa-th-large")} />
                                        </Button>
                                        <Button className={ListEnabled === true ? 'list-selected-toggle' : 'grid-selected-toggle'}
                                            onClick={(e) => this.setState({ GridEnabled: false, ListEnabled: true })}
                                            disabled={this.state.ListEnabled === true}>
                                            <Box className={ListEnabled === true ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>List View</Box>
                                            <Icon className={classNames(ListEnabled === true ? 'list-selected-toggle-icon' : 'grid-selected-toggle-icon', "fa fa-bars")} />
                                        </Button>
                                    </Box>
                                </Grid>
                            }
                        </Grid>
                        {selectedCountry &&
                            <Grid container className='header-align'>
                                <Grid item lg={8} xs={12}>
                                    {this.state.GridEnabled === true &&
                                        <Paper>
                                            <CalenderView
                                                eventList={eventList}
                                            />
                                        </Paper>
                                    }
                                    {this.state.ListEnabled === true &&
                                        <Paper>
                                            <AllMUIDataTable
                                                key={holidayList}
                                                title={tableUpdating ? <CircularProgress className='white-text' /> : ''}
                                                data={holidayList}
                                                columns={columns}
                                                options={options}
                                            />
                                        </Paper>
                                    }
                                </Grid>
                            </Grid>
                        }
                        {!selectedCountry &&
                            <BlankPagewithIcon data='Change the Financial year and expect the result' />
                        }
                        <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                            <Alert onClose={this.handleClose} severity="error">
                                {alertData}
                            </Alert>
                        </Snackbar>
                    </Paper>
                </Box>
            )
        }
    }
}
export default withRouter(HolidayCalenderView)




