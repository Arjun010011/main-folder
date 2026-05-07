import React, { Component } from 'react';
import { Box, Paper, Grid, Button } from '@material-ui/core';
import { withRouter } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import Swal from 'sweetalert2';
import './styles.scss';
import MultipleAddTextFields from 'Components/MultipleAddTextFields';
import { nameAndNumberRegex } from 'Constants/regularExpression';
import { POST_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { postRequest } from 'Includes/api/apicall';
import commonMessages from 'Constants/messages';
import messages from './messages';
import { FormattedMessage } from 'react-intl';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const fieldDetails = [
    {
        label: <FormattedMessage {...messages.componentName} />, regex: nameAndNumberRegex,
        autoFocus: false, name: 'name', md: 6, className: 'width-form-100', required: true,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: '25'
    },
    {
        label: 'Codename', regex: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
        autoFocus: false, name: 'codename', md: 6, className: 'width-form-100', required: false,
        id: 'outlined-codename', default: '', rows: null, type: 'text', maxLength: '25',
        helperText: 'Short code for formulas (e.g. BASIC, HRA, PF)'
    }
]


class AddSalaryComponent extends Component {
    constructor() {
        super()
        this.state = {
            salary_components: { earnings: [], deductions: [] },
            open: false,
            submitDisable: false
        }
    }

    updateEarningsSalaryComponents = (stateValue) => {
        let { salary_components } = this.state;
        salary_components.earnings = stateValue;
        this.setState({
            salary_components
        });
    }

    updateDeductionsSalaryComponents = (stateValue) => {
        let { salary_components } = this.state;
        salary_components.deductions = stateValue;
        this.setState({
            salary_components
        });
    }

    validate = () => {
        let { salary_components } = this.state;
        let earningsTest = this.refs.earnings.validateFields();
        let deductionsTest = this.refs.deductions.validateFields();
        if (salary_components.earnings.length === 0 && salary_components.deductions.length === 0) {
            this.setState({
                open: true
            });
        }
        else if (earningsTest && deductionsTest) {
            let post_data = { 'salary_components': salary_components }
            this.setState({ submitDisable: true })
            let url = POST_URL.salarycomponent.api;
            postRequest(url, post_data)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Your Data has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.viewPage();
                    }
                    this.setState({ submitDisable: false });
                });
        }
    }

    viewPage = () => {
        this.props.history.push(Actions.payroll_salarycomponent.view.url);
    }

    handleClose = () => {
        this.setState({
            open: false
        });
    }

    render() {
        const { open, submitDisable } = this.state;
        return (
            <Box>
                <Paper className='paper-background'>
                    <Grid container>
                        <Grid item md={8} xs={12} className='header-align'>
                            <Box className='heading'>
                                <FormattedMessage {...messages.salaryComponent} />
                            </Box>
                            <Box className='sub-heading'>
                                <FormattedMessage {...messages.addsalaryComponentSubHeading} />
                            </Box>
                        </Grid>
                        <Grid item md={4} xs={12} className='header-align' >
                            <Box className='header-align end-flex-prop'>
                                <Button
                                    variant="container"
                                    onClick={() => this.viewPage()}
                                    className='editbutton-view'>
                                    <VisibilityOutlinedIcon className='visibility-icon' />
                                    <FormattedMessage {...messages.salaryComponent} />
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                    <Paper className='header-align border-position'>
                        <Grid container>
                            <Grid item md={6} xs={12}>
                                <Box className='salary-heading'>
                                    <FormattedMessage {...messages.earnings} />
                                </Box>
                                <Box className='salary-margin button-padding white-space'>
                                    <MultipleAddTextFields
                                        fieldDefaultValue={[]}
                                        fieldDetails={fieldDetails}
                                        updateParent={this.updateEarningsSalaryComponents}
                                        ref={'earnings'}
                                        idFormat={'salary_earning_2022_08_11_3_pm_'}
                                    />
                                </Box>
                            </Grid>
                            <Grid item md={6} xs={12}>
                                <Box className='salary-heading'>
                                    <FormattedMessage {...messages.deductions} />
                                </Box>
                                <Box className='salary-margin button-padding white-space'>
                                    <MultipleAddTextFields
                                        fieldDefaultValue={[]}
                                        fieldDetails={fieldDetails}
                                        updateParent={this.updateDeductionsSalaryComponents}
                                        ref={'deductions'}
                                        idFormat={'salary_deductions_2022_08_11_3_pm_'}
                                    />
                                </Box>

                            </Grid>
                        </Grid>
                    </Paper>
                    <Box className="submt-button-float-bottom" mt={3}>
                        <Button variant='contained'
                            color='primary' className='submit'
                            disabled={submitDisable}
                            onClick={this.validate}>
                            <FormattedMessage {...commonMessages.submit} />
                        </Button>
                    </Box>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            Enter atleast 1 Salary Component
                        </Alert>
                    </Snackbar>
                </Paper>
            </Box>
        )
    }
}

export default withRouter(AddSalaryComponent)

