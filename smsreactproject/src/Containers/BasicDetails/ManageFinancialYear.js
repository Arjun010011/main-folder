import React, { Component } from 'react';
import { Box, Button, Paper, Grid, Typography } from '@material-ui/core';
import {
    MuiPickersUtilsProvider,
    KeyboardDatePicker,
} from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import { Link, withRouter } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import classNames from 'classnames';
import Swal from 'sweetalert2'
import moment from 'moment';
import { Actions } from 'Constants/permissions';

import { postRequest } from 'Includes/api/apicall';
import { POST_URL } from 'Includes/urls'
import { dateFormat, validateDate } from 'Includes/functions';
import { minDate, maxDate } from 'Constants';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';

class ManageFinancialYear extends Component {
    constructor(props) {
        super(props)

        this.state = {
            financialYear: { start_date: null, end_date: null },
            errors: {},
        }
    }


    async submityear() {
        const validate_post_data = this.validate()
        if (validate_post_data) {
            this.setState({ submitDisable: true })
            const url = POST_URL.financialyear.api
            postRequest(url, validate_post_data, this.props).then(response => {
                if (response && response.status === 200) {
                    this.setState({ submitDisable: false })
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    }).then(
                        this.props.history.push(Actions.financial_year.view.url)
                    )
                }
                this.setState({ submitDisable: false })
            })
        }
    }

    validate = () => {
        let { financialYear, errors } = this.state
        errors = {}
        let returnValue = true
        if (financialYear['start_date'] === null) {
            errors['start_date'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            returnValue = false
        }
        else {
            if (validateDate(financialYear['start_date'], minDate, maxDate)) {
                errors['start_date'] = validateDate(financialYear['start_date'], minDate, maxDate)
                returnValue = false
            }
        }
        if (financialYear['end_date'] === null) {
            errors['end_date'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
            returnValue = false
        }
        else {
            if (validateDate(financialYear['end_date'], minDate, maxDate)) {
                errors['end_date'] = validateDate(financialYear['end_date'], minDate, maxDate)
                returnValue = false
            }
        }
        this.setState({
            errors
        })
        if (returnValue) {
            let post_data = {
                'financialyear': {
                    start_date: dateFormat(financialYear.start_date, 'YYYY-MM-DD'),
                    end_date: dateFormat(financialYear.end_date, 'YYYY-MM-DD')
                }
            }
            returnValue = post_data
        }
        return returnValue
    }


    onChangeDatesYears = (e, date_name) => {
        let { financialYear } = this.state
        financialYear[date_name] = e
        if ((date_name === 'start_date') && e) {
            if (e.getDate() === '1') {
                e = new Date(e.getFullYear(), e.getMonth(), 0);
            }
            else {
                e = new Date(e.getFullYear() + 1, e.getMonth(), (e.getDate() - 1));
            }
            financialYear['end_date'] = e
        }
        this.setState({
            financialYear,
            errors: {}
        })
    }

    onBlurValidation = (e, label) => {
        const { errors, financialYear } = this.state
        let name = e.target.name;
        let value = financialYear[name];
        let error = ''
        if (value === null) {
            error = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        else {
            error = validateDate(value, minDate, maxDate)
        }
        if (error !== '') {
            errors[name] = error
            this.setState({ errors })
        }
    }


    render() {
        let { financialYear, errors } = this.state
        return (
            <div>
                <div >
                    <Paper className={classNames('paper-background')}>
                        <Grid container>
                            <Grid item md={6} xs={12} className={classNames('header-align')}>
                                <Box className='heading'>
                                    <FormattedMessage {...commonMessages.financialYear} />
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12} >
                                <Box className={classNames('header-align', 'end-flex-prop')}>
                                    <Button
                                        variant='contained'
                                        component={Link} to={Actions.financial_year.view.url}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.financial_year.view.label}</Button>
                                </Box>
                            </Grid>
                        </Grid>
                        <Grid container>
                            <Grid item md={6} xs={12}>
                                <Paper className='paper-plain-background header-align p-t-20px p-b-20px'>
                                    <Grid container>
                                        <Grid item md={8} xs={12} className='margin-top-30'>
                                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                <KeyboardDatePicker
                                                    autoOk
                                                    variant='inline'
                                                    inputVariant='outlined'
                                                    label={<FormattedMessage {...commonMessages.start_date} />}
                                                    required={true}
                                                    fullWidth
                                                    name='start_date'
                                                    onBlur={(e) => this.onBlurValidation(e, 'Start Date')}
                                                    format='dd-MM-yyyy'
                                                    value={financialYear.start_date}
                                                    onChange={(e) => this.onChangeDatesYears(e, 'start_date')}
                                                    KeyboardButtonProps={{
                                                        'aria-label': 'change date',
                                                    }}
                                                    helperText={(!errors.start_date) ? 'Format DD-MM-YYYY' : errors.start_date}
                                                    error={errors.start_date && (errors.start_date ? true : false)}
                                                />
                                            </MuiPickersUtilsProvider>
                                        </Grid>
                                        <Grid item md={8} xs={12}>
                                            <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                <KeyboardDatePicker
                                                    autoOk
                                                    variant='inline'
                                                    inputVariant='outlined'
                                                    label={<FormattedMessage {...commonMessages.end_date} />}
                                                    required={true}
                                                    fullWidth
                                                    name='end_date'
                                                    onBlur={(e) => this.onBlurValidation(e, 'End Date')}
                                                    disabled={true}
                                                    format='dd-MM-yyyy'
                                                    value={financialYear.end_date}
                                                    onChange={(e) => this.onChangeDatesYears(e, 'end_date')}
                                                    KeyboardButtonProps={{
                                                        'aria-label': 'change date',
                                                    }}
                                                    helperText={(!errors.end_date) ? 'Format DD-MM-YYYY' : errors.end_date}
                                                    error={errors.end_date && (errors.end_date ? true : false)}
                                                />
                                            </MuiPickersUtilsProvider>
                                        </Grid>
                                    </Grid>
                                    <Grid item md={12}>
                                        <Box display='flex' marginLeft='auto' justifyContent='flex-end' className='header-align'>
                                            <Button variant="contained"
                                                onClick={e => this.setState({ financialYear: { start_date: null, end_date: null }, errors: {} })}>
                                                <FormattedMessage {...commonMessages.reset} />
                                            </Button>
                                            <Box ml={2}>
                                                <Button variant="contained" color="primary"
                                                    className='submit'
                                                    disabled={this.state.submitDisable}
                                                    onClick={e => this.submityear(e)}>
                                                    <FormattedMessage {...commonMessages.submit} />
                                                </Button>
                                            </Box>
                                        </Box>
                                    </Grid>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>
                </div>
            </div>
        )
    }
}



export default withRouter(ManageFinancialYear);

