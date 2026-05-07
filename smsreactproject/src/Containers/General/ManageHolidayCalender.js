import React, { Component } from 'react'
import { Paper, Box, Grid, Button, CircularProgress } from '@material-ui/core';
import Swal from 'sweetalert2'
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import _ from 'lodash';
import moment from 'moment';

import MultipleAddTextFields from 'Components/MultipleAddTextFields';
import loadingBar from 'images/loading.gif'
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import { nameAndNumberRegex } from 'Constants/regularExpression'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, dateFormat, getUrlParam } from 'Includes/functions';
import { Dropdown } from 'Components/DropDown';
import { minDate, maxDate } from 'Constants';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}


const holidayCalender_global = [
    {
        label: 'Holiday Name', regex: nameAndNumberRegex, autoFocus: true, name: 'reason', md: 12, className: 'width-form-95',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 100
    },
    {
        label: 'From Date', regex: '', name: 'from_date', md: 6, minDate: new Date(), maxDate: maxDate, className: 'width-form-95',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'date'
    },
    {
        label: 'To Date', regex: '', name: 'to_date', md: 6, maxDate: maxDate, className: 'width-form-95',
        required: true, id: 'outlined-textarea', default: '', rows: null, type: 'date', parentMinDate: 'from_date',
    },
]
class ManageHolidayCalender extends Component {
    constructor() {
        super()
        this.state = {
            holidayList: [],
            loading: true,
            open: false,
            alertData: '',
            selectedCountry: '',
            error: {},
            fieldDetail: null
        }
    }


    componentDidMount = () => {
        let { selectedCountry, countryName, fromDate, toDate } = getUrlParam();

        if (selectedCountry && countryName && fromDate && toDate) {

            let fieldDetail = _.cloneDeep(holidayCalender_global)
            fieldDetail.map((field) => {
                if (field.name === 'from_date') {
                    field['minDate'] = moment().add(1, 'days');
                    field['maxDate'] = toDate
                }
                if (field.name === 'to_date') {
                    field['maxDate'] = toDate
                }
            })

            this.setState({
                selectedCountry: selectedCountry,
                countryName: countryName,
                fromDate: dateFormat(fromDate, 'YYYY-MM-DD'),
                loading: false,
                fieldDetail: fieldDetail
            })
        }
        else {
            this.props.history.push(Actions.manage_states.view.url)
        }

    }


    updateholidayListValue = (stateValue) => {
        let { holidayList } = this.state
        holidayList = stateValue
        this.setState({
            holidayList
        })
    }

    validate = () => {
        let { holidayList, selectedCountry } = this.state
        let holidayValidate = true;
        holidayValidate = this.refs.holiday.validateFields();
        if (holidayValidate) {
            holidayList.map((data) => {
                data.from_date = dateFormat(data.from_date, 'YYYY-MM-DD')
                data.to_date = dateFormat(data.to_date, 'YYYY-MM-DD')
            })
            let post_data = {
                'financial_year': selectedCountry,
                'holidays': holidayList
            }
            this.setState({ submitDisable: true })
            let url = POST_URL.holidaycalender.api;
            postRequest(url, post_data, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Your Data has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.props.history.push({
                            pathname: Actions.view_holiday_calender.view.url,
                            state: { selectedCountry: selectedCountry }
                        })
                    }
                    this.setState({ submitDisable: false })
                });
        }
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    handleViewButton = () => {
        let { selectedCountry } = this.state;
        this.props.history.push({
            pathname: Actions.view_holiday_calender.view.url,
            state: { selectedCountry: selectedCountry }
        })
    }

    render() {
        const { loading, alertData, open, countryName, fieldDetail } = this.state
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
                                    Holiday Calendar for {countryName}
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    {isUserHasPermission('view_holiday_calender', 'view') && <Button
                                        variant="contained"
                                        onClick={this.handleViewButton}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.view_holiday_calender.view.label}</Button>}
                                </Box>
                            </Grid>
                        </Grid>

                        <Grid container className={classNames('header-align')}>
                            <Grid item md={8} xs={12}>
                                {fieldDetail &&
                                    <MultipleAddTextFields
                                        fieldDefaultValue={[]}
                                        fieldDetails={fieldDetail}
                                        updateParent={this.updateholidayListValue}
                                        isEmptyNotAllowed={true}
                                        handleDateRange={{ status: true, fromDate: 'from_date', toDate: 'to_date', conflictWith: 'reason' }}
                                        ref={'holiday'}
                                        idFormat={'holiday_add_2022_08_11_2_pm_'}
                                    />
                                }
                                <Box className='end-flex-prop  margin-top-30'>
                                    <Box>
                                        <Button variant="contained" color="primary"
                                            className='submit'
                                            disabled={this.state.submitDisable}
                                            onClick={() => this.validate()}>
                                            Submit &nbsp;{' '}
                                        </Button>
                                    </Box>
                                </Box>

                            </Grid>
                        </Grid>
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
export default withRouter(ManageHolidayCalender)




