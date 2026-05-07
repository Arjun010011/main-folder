import React, { Component } from 'react'
import classNames from "classnames";
import { Grid, CircularProgress, TextField, Box, Button, Paper, FormControlLabel, Divider, Switch, Avatar } from '@material-ui/core';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import messages from './../messages';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';


import { Actions } from 'Constants/permissions';


class IsFromApplicationForm extends Component {
    render() {
        const {
            student, fieldErrors, loadingApplicationButton, isApplicationDataRetrieved } = this.props
        return (
            <Grid container className='padding-15'>
                <Grid item md={4} xs={12} sm={12}>
                    <Box className='form-left-heading padding-30'>
                        <FormattedMessage {...messages.applicationNo} />
                    </Box>
                </Grid>
                {!isApplicationDataRetrieved &&
                    <Grid item md={8} xs={12} sm={12}>
                        <Grid container className='padding-15'>
                            <Grid item md={6} xs={12} sm={12}>
                                <TextField
                                    id='outlined-name'
                                    label={<FormattedMessage {...messages.applicationNo} />}
                                    autoComplete="off"
                                    name='application_number'
                                    value={student['application_number']}
                                    autoFocus={true}
                                    onChange={(e) => this.props.onChangeStudent(e)}
                                    margin='normal'
                                    fullWidth
                                    variant='outlined'
                                    helperText={fieldErrors && (fieldErrors.applicationNotFound || fieldErrors.applicationNumberMandatory)}
                                    error={fieldErrors && (fieldErrors.applicationNotFound || fieldErrors.applicationNumberMandatory ? true : false)}
                                    inputProps={{ maxLength: 50 }}
                                />
                                {fieldErrors && fieldErrors.applicationNotFound &&
                                    <Box display='flex' fontSize='14px'>
                                        <Box color='red' mr={1}>
                                            <FormattedMessage {...messages.findApplicationNo} />
                                        </Box>
                                        <a href={Actions.application_student_list.view.url} target="_blank">
                                            <FormattedMessage {...commonMessages.clickHere} />
                                        </a>
                                    </Box>
                                }
                            </Grid>
                            <Grid item md={6} xs={12} sm={12}>
                                {!loadingApplicationButton &&
                                    <Box className='flex-justify-center margin-top-15'>
                                        <Button
                                            variant="contained"
                                            onClick={(e) => this.props.verifyApplication(student['application_number'])}
                                            className='editbutton-view margin-top-10'
                                        >
                                            <FormattedMessage {...messages.verifyApplicationNumber} />
                                        </Button>
                                    </Box>
                                }
                                {loadingApplicationButton &&
                                    <Box className='flex-justify-center margin-top-15'>
                                        <CircularProgress />
                                    </Box>
                                }
                            </Grid>
                        </Grid>
                    </Grid>
                }
                {isApplicationDataRetrieved &&
                    <Grid item md={8}>
                        <Box className='enquiry-number-application-form-box'>
                            <Box className='enquiry-number-application-form'>
                                {student['application_number']}
                            </Box>
                            <HighlightOffIcon className='enquiry-number-close-icon' onClick={this.props.handleCloseEnquiryNumber} />
                        </Box>
                    </Grid>
                }
            </Grid>
        )
    }
}

export default IsFromApplicationForm