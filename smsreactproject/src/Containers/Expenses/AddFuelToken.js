import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import { Paper, Box, Grid, Button, TextareaAutosize, TextField, FormControl, FormHelperText, CircularProgress, Tooltip } from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import { MuiPickersUtilsProvider, KeyboardDatePicker, } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import moment from 'moment';
import Snackbar from '@material-ui/core/Snackbar';

import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import loadingBar from 'images/loading.gif'
import { Divider } from '@material-ui/core';
import { gstinNumberRegex, amountRegexWithDecimals, numberRegex } from 'Constants/regularExpression'
import { getRequest, putRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, POST_URL } from 'Includes/urls'
import { getUrlParam, getKeyValueMap, dateFormat, validateDate, Alert, isUserHasPermission, NumberFormatCustom } from 'Includes/functions';
import './styles.scss';
import { Actions } from 'Constants/permissions';
import commonMessages from 'Constants/messages'
import messages from './messages';
import { FormattedMessage } from 'react-intl';

class AddFuelToken extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            expenses: { receipt_preview: '', selectedExpenses: null, receipt: '' },
            fieldErrors: {},
            helperText: {},
            loading: true,
            maximumAmount: '',
            enableUploadIcons: true,
            isEnable: {},
            upload_name: 'Upload Receipt',
            openError: false,
            alertData: 'clear the errors',
            expenseDetails: {},
            isEdit: false,
            submitDisable: false,
            pageLoading: false,
            isBlankPage: true,
            loadingVehicles: false,
            vehicles: [],
            staffList: []
        }
    }


    componentDidMount = () => {
        let { year, yearName, fromDate, toDate } = getUrlParam();
        if (year && yearName && fromDate && toDate) {
            var SpecialTo = moment(toDate, "YYYY/MM/DD");
            if (moment() > SpecialTo) {
                toDate = new Date()
            }
            this.setState({
                year: year,
                yearName: yearName,
                fromDate: fromDate,
                toDate: toDate,
            })
            this.getVehicles()
            this.getStaffList()
        }
        else {
            this.props.history.push(Actions.fuel_token.view.url);
        }
    }

    getStaffList = () => {
        const url = GET_URL.staff.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    staffList: response.data.data,
                    loading: false
                })
            }
        })
    }

    handleSearchChange = (e) => {
        let { expenses, fieldErrors } = this.state;
        let { name, value } = e.target;
        expenses[name] = value
        delete fieldErrors[name]
        // if (name === 'liter' && !numberRegex.value.test(value) || parseInt(value) <= 0 || parseInt(value) > 200) {
        //     fieldErrors['liter'] = <FormattedMessage {...messages.enter1to100Liter} />
        // }
        this.setState({
            expenses,
            fieldErrors
        })
    }

    handleDropDownWithSearchChange = (e, newValue, name) => {
        let { expenses, fieldErrors } = this.state;
        delete fieldErrors[name]
        expenses[name] = newValue
        this.setState({
            expenses,
            fieldErrors,
        })
    }

    handleDateSearchChange = (e) => {
        let { expenses, fromDate, toDate, fieldErrors, helperText, isEnable } = this.state;
        expenses['for_date'] = e
        delete fieldErrors['for_date']
        helperText['for_date'] = ''
        fromDate = dateFormat(fromDate, 'YYYY-MM-DD')
        toDate = dateFormat(toDate, 'YYYY-MM-DD')
        let error = validateDate(e, fromDate, toDate)
        if (error === 'Invalid Date')
            helperText['for_date'] = error
        else if (error !== '')
            fieldErrors['for_date'] = error
        this.setState({
            expenses,
            fieldErrors,
        })
    }

    validation = () => {
        let { openError } = this.state;
        let returnValue = true
        let { expenses, fieldErrors } = this.state;
        if (!expenses.for_date) {
            fieldErrors['for_date'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
        }
        if (!expenses.staff) {
            fieldErrors['staff'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
        }
        if (!expenses.vehicle) {
            fieldErrors['vehicle'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
        }
        // if (!expenses.liter || !numberRegex.value.test(expenses.liter) || parseInt(expenses.liter) <= 0 || parseInt(expenses.liter) > 200) {
        //     fieldErrors['liter'] = !expenses.liter ? <FormattedMessage {...commonMessages.fieldMandatoryError} /> : <FormattedMessage {...messages.enter1to100Liter} />
        // }
        if (Object.keys(fieldErrors).length > 0) {
            returnValue = false
            openError = false
        }
        this.setState({
            fieldErrors,
            openError
        })

        return returnValue
    }

    submit = () => {
        let { expenses, year } = this.state;
        let validate = this.validation();
        if (validate) {
            this.setState({ submitDisable: true })
            let post_data = {
                for_date: dateFormat(expenses.for_date, 'YYYY-MM-DD'),
                vehicle: expenses.vehicle.id,
                liter: parseInt(expenses.liter),
                staff: expenses.staff.id,
                comment: expenses.comment,
                financial_year: year
            }
            let url = POST_URL.token.api;
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
                            pathname: Actions.fuel_token.view.url,
                            state: { detail: response.data.data.id }
                        })
                    }
                    this.setState({ submitDisable: false })
                });
        }
    }

    handleClose = () => {
        this.setState({
            openError: false
        })
    }

    getVehicles = () => {
        const params = { is_active: true }
        getRequest(GET_URL.vehicle.api, params, this.props).then((response) => {
            if (response && response.status === 200) {
                let vehicles = response.data.data;
                vehicles.map((data) => {
                    data['vehicle_name'] = `${data.name} - ${data.vehicle_num}`
                })
                this.setState({ vehicles, loadingVehicles: false })
            }
        });
    }

    render() {
        const { yearName, loading, expenses, fieldErrors, staffList, helperText, enableUploadIcons, vehicles,
            fromDate, toDate, openError, alertData, submitDisable } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <div>
                    <Paper className='paper-background p-b-20px p-t-20px'>
                        <Grid container>
                            <Grid item md={8} xs={12} className='header-align'>
                                <Box className='heading'>
                                    <FormattedMessage {...messages.fuelToken} />
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('expenses_create', 'view') &&
                                        <Button
                                            variant="contained"
                                            component={Link} to={Actions.fuel_token.view.url}
                                            className='editbutton-view'
                                        ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.fuel_token.view.label}</Button>
                                    }
                                </Box>
                            </Grid>
                        </Grid>
                        <Box className="year-std-box mr-40">
                            <Box className="academic-std-head "> <FormattedMessage {...commonMessages.financialYear} /></Box>
                            <Box className=" aca-std-white-background">{yearName}</Box>
                            <Box className="academic-std-head "> From Date - To Date</Box>
                            <Box className=" aca-std-white-background">{dateFormat(fromDate, 'DD-MM-YYYY')}</Box>
                            <Box className=" aca-std-white-background">:</Box>
                            <Box className=" aca-std-white-background">{dateFormat(toDate, 'DD-MM-YYYY')}</Box>
                        </Box>
                        <Grid container spacing={2}>
                            <Grid item md={8} xs={12}>
                                <Paper className='paper-plain-background p-b-20px p-t-20px m-t-20px'>
                                    <Grid container spacing={2}>
                                        <Grid item md={6} xs={12}>
                                            <DropDownWithSearch
                                                id="combo-box-demo"
                                                options={staffList}
                                                value={expenses.staff}
                                                onChange={(e, newValue) => this.handleDropDownWithSearchChange(e, newValue, 'staff')}
                                                optionValue='full_name'
                                                name='staff'
                                                label={<FormattedMessage {...messages.staff} />}
                                                className='width-100'
                                                helperText={expenses.staff ? `` : fieldErrors['staff']}
                                                error={fieldErrors['staff']}
                                                required
                                            />
                                        </Grid>
                                        <Grid item md={6} xs={12}>
                                            <DropDownWithSearch
                                                options={vehicles}
                                                value={expenses.vehicle}
                                                onChange={(e, newValue) => this.handleDropDownWithSearchChange(e, newValue, 'vehicle')}
                                                name='vehicle'
                                                label={<FormattedMessage {...messages.vehicle} />}
                                                optionValue='vehicle_name'
                                                className='width-100'
                                                helperText={expenses.vehicle ? `` : fieldErrors['vehicle']}
                                                error={fieldErrors['vehicle']}
                                                required
                                            />
                                        </Grid>
                                    </Grid>
                                    <Grid container spacing={2} className='header-align'>
                                        <Grid item md={6} xs={12}>
                                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                <KeyboardDatePicker
                                                    className='width-100'
                                                    autoOk
                                                    variant='inline'
                                                    inputVariant="outlined"
                                                    label={<FormattedMessage {...commonMessages.date} />}
                                                    minDate={fromDate}
                                                    maxDate={toDate}
                                                    name='for_date'
                                                    format="dd-MM-yyyy"
                                                    value={expenses.for_date ? expenses.for_date : null}
                                                    required={true}
                                                    onChange={(e) => this.handleDateSearchChange(e)}
                                                    KeyboardButtonProps={{
                                                        'aria-label': 'change date',
                                                    }}
                                                    helperText={fieldErrors['for_date'] === "" ? helperText['for_date'] : fieldErrors['for_date']}
                                                    error={fieldErrors['for_date'] && (fieldErrors['for_date'] === "" ? false : true)}
                                                />
                                            </MuiPickersUtilsProvider>
                                        </Grid>
                                        <Grid item md={6} xs={12}>
                                            <TextField
                                                label={<FormattedMessage {...messages.NoOfLiterFuel} />}
                                                name='liter'
                                                value={expenses.liter}
                                                className='width-100'
                                                inputProps={{ maxLength: '15' }}
                                                fullWidth={true}
                                                variant="outlined"
                                                helperText={fieldErrors['liter'] === '' ? helperText['liter'] : fieldErrors['liter']}
                                                error={fieldErrors['liter']}
                                                onChange={(e) => this.handleSearchChange(e)}
                                                required
                                            />
                                        </Grid>
                                    </Grid>
                                    <Grid container>
                                        <Grid item md={12}>
                                            <FormControl
                                                fullWidth
                                                error={fieldErrors.comment && (fieldErrors.comment ? true : false)}
                                            >
                                                <Box className='create-expenses-comment header-align'>Comment</Box>
                                                <TextareaAutosize aria-label="minimum height"
                                                    className='create-expenses-comment-auto-size'
                                                    value={expenses.comment}
                                                    name='comment'
                                                    onChange={(e) => this.handleSearchChange(e)}
                                                    required
                                                />
                                                {fieldErrors.comment &&
                                                    <FormHelperText>{fieldErrors.comment}</FormHelperText>
                                                }
                                            </FormControl>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Grid>

                            <Grid item md={4} xs={12}>
                                <Paper className='p-b-20px p-t-20px create-expenses-right-part-paper m-t-20px'>
                                    <Box>
                                        <Box className='expense-add-fuel-review'>
                                            Review Details
                                        </Box>
                                        {expenses.staff &&
                                            <Box className='create-expenses-outer-box-label-value'>
                                                <Box className='create-expenses-label'>Staff Name</Box>
                                                <Box className='create-expenses-value'>{expenses.staff.full_name}</Box>
                                            </Box>
                                        }
                                        {expenses.vehicle &&
                                            <Box className='create-expenses-outer-box-label-value'>
                                                <Box className='create-expenses-label'>Vehicle Name</Box>
                                                <Box className='create-expenses-value'>{expenses.vehicle.name}</Box>
                                            </Box>
                                        }
                                        {expenses.vehicle &&
                                            <Box className='create-expenses-outer-box-label-value'>
                                                <Box className='create-expenses-label'>Vehicle No.</Box>
                                                <Box className='create-expenses-value'>{expenses.vehicle.vehicle_num}</Box>
                                            </Box>
                                        }
                                        {expenses.for_date &&
                                            <Box className='create-expenses-outer-box-label-value'>
                                                <Box className='create-expenses-label'>{<FormattedMessage {...commonMessages.date} />}</Box>
                                                <Box className='create-expenses-value'>{dateFormat(expenses.for_date, 'DD-MM-YYYY')}</Box>
                                            </Box>
                                        }
                                        {expenses.liter &&
                                            <Box>
                                                <Divider variant='middle' />
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='create-expenses-total-label'>{<FormattedMessage {...messages.NoOfLiterFuel} />}</Box>
                                                    <Box className='create-expenses-total-value'>{expenses.liter}</Box>
                                                </Box>
                                            </Box>
                                        }
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>
                        <Grid item md={12}>
                            <Box display='flex' marginLeft='auto' justifyContent='flex-end' className='header-align'>
                                <Button variant="contained" color="primary"
                                    className='submit'
                                    disabled={submitDisable ? submitDisable : !enableUploadIcons}
                                    onClick={this.submit}>
                                    Submit And Print
                                </Button>
                            </Box>
                        </Grid>
                    </Paper>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openError} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </div>
            )
        }
    }
}


export default withRouter(AddFuelToken)
