import React, { Component } from 'react'
import classNames from "classnames";
import { withRouter } from 'react-router-dom';
import { Grid, FormLabel, Box, Button, Paper, Divider } from '@material-ui/core';

import DynamicForm from 'Components/DynamicForm';
import AddressFields from 'Components/AddressFields';
import { pinCodeRegex } from 'Constants/regularExpression'
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';

import { patchRequest } from 'Includes/api/apicall';
import { PUT_URL } from 'Includes/urls'

import { nameRegex, nameAndNumberRegex, gstinNumberRegex, faxNumberRegex } from 'Constants/regularExpression'
import { maxFileSize } from 'Constants'

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const fieldDetails = [
    {
        label: 'Company Name', regex: '', name: 'name', md: 12, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 100
    },
    {
        label: 'School Code', regex: '', name: 'code', md: 6, className: 'width-form-90', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 25,
    },
    {
        label: 'School Type', regex: '', name: 'type', md: 6, className: 'width-form-90', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 25
    },
    {
        label: 'Board Name', regex: '', name: 'board_name', md: 6, className: 'width-form-90', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 25
    },
    {
        label: 'GSTIN Number', regex: '', name: 'gstin_num', md: 6, className: 'width-form-90', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 25, helperText: 'Format 22AAAAA0000A1Z2'
    },
    {
        label: 'Fax Number', regex: '', name: 'fax_num', md: 6, className: 'width-form-90', required: false, id: 'outlined-textarea',
        default: '', rows: null, type: 'text', maxLength: 25, helperText: 'Format: 11111111222'
    },
    {
        label: 'Mobile Number', regex: null, name: 'tel_num', md: 6, className: 'width-form-90', required: false, id: 'outlined-textarea',
        default: '', rows: null, type: 'phone_number'
    },
    {
        label: 'Alternative Number', regex: null, name: 'tel_num_2', md: 6, className: 'width-form-90', required: false, id: 'outlined-textarea',
        default: '', rows: null, type: 'phone_number'
    },
    {
        label: 'Company Address', regex: '', name: 'address', md: 12, className: 'width-form-95', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 25
    },
    {
        label: 'Pincode', regex: '', name: 'pincode', md: 6, className: 'width-form-90', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 25
    },
    {
        label: 'Data Base Key', regex: '', name: 'database_key', md: 6, className: 'width-form-90', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 25
    },
    {
        label: 'Data Base Name', regex: '', name: 'database_name', md: 6, className: 'width-form-90', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 25
    },
    {
        label: 'Domain', regex: '', name: 'domain', md: 6, className: 'width-form-90', required: false,
        id: 'outlined-textarea', default: '', rows: null, type: 'text', maxLength: 25
    },
]


class CompanyInformation extends Component {
    constructor(props) {
        super(props)
        this.state = {
            fieldErrors: {},
            datalist: {},
            fieldDetails: null,
            school: {}

        }
    }

    componentDidMount() {
        this.updateSchoolDetail()
    }

    updateParent = (name, value) => {
        let { school } = this.state
        school[name] = value
        this.setState({
            school
        })
    }

    getData = () => {
        return this.state.school
    }

    updateSchoolDetail = (schoolInf) => {
        let school = { ...this.state.school }
        let fieldDetail = [...fieldDetails]
        let value
        fieldDetail.forEach((field) => {
            if (schoolInf) {
                value = schoolInf[field['name']]
            }
            else {
                value = field.default
            }
            field.default = value
            school[field['name']] = value
        })
        this.setState({
            school,
            fieldDetails: fieldDetail
        })
    }

    submit = () => {
        const { school, fieldDetails, fieldErrors } = this.state
        let test = true
        let addressTest = true
        fieldDetails.forEach((field) => {
            let value = school[field.name];
            let name = field.name;
            if (field.required && (value === '' || value === null || value === 0)) {
                fieldErrors[name] = `${field.label} is Mandatory`
                test = false
            }
            else if (field.regex && !field.regex.value.test(value) && value !== '') {
                fieldErrors[name] = field.regex.errorText;
                test = false
            }
        })

        if (test) {
            this.props.submit(school);
        }
        else {
            this.setState({
                open: true,
                alertData: 'Please clear the errors'
            })
            this.refs.DynamicForm.updateErrors(fieldErrors)
        }
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }


    render() {
        const { open, alertData, fieldDetails, } = this.state;
        const { submitDisable } = this.props;
        return (
            <>
                <Paper>
                    <Grid container >
                        <Grid item md={4} xs={12} sm={12} >
                            <Box className="header-align">
                                <Box className='form-left-heading'>
                                   Company Info
                                </Box>
                                <Box mt={2}>
                                    <FormLabel className='form-left-sub-heading'>
                                        Company Details
                                    </FormLabel>
                                </Box>
                            </Box>
                            <Box className={classNames('form-inner-border', 'hide-vl-on-900')}></Box>
                        </Grid>
                        <Grid item md={8} xs={12} sm={12}>
                            {fieldDetails &&
                                <DynamicForm
                                    fieldDetails={fieldDetails}
                                    updateParent={this.updateParent}
                                    ref={'DynamicForm'}
                                    idFormat={'company_2022_08_11_01_23_pm_'}
                                />
                            }
                            <Grid item xs={12} >
                                <Box mt={3} mb={3}>
                                    <Divider />
                                </Box>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item md={12} xs={12}>
                        <Box display='flex' justifyContent='flex-end'>
                            <Button variant='contained'
                                color='primary' className='submit'
                                disabled={submitDisable}
                                onClick={this.submit}>submit
                                </Button>
                        </Box>
                    </Grid>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Paper>
            </>
        )
    }
}

export default withRouter(CompanyInformation);