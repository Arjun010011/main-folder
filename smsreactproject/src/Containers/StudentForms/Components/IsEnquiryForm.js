import React, { Component } from 'react'
import classNames from "classnames";
import { Grid, CircularProgress, TextField, Box, Button, Paper, FormControlLabel, Divider, Switch, Avatar } from '@material-ui/core';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import messages from './../messages';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';

import { Actions } from 'Constants/permissions';

class IsEnquiryForm extends Component {

    render() {
        const { student, fieldErrors, loadingEnquiryButton, isEnquiryDataRetrieved } = this.props
        return (
            <Grid container className={isEnquiryDataRetrieved ? 'align-items-center' : 'align-items-center'}>
                {!isEnquiryDataRetrieved &&
                    <Grid item md={4} xs={12} sm={12} className='mt-20 ml-30'>
                        <FormControlLabel
                            control={<Switch checked={student['isEnquiry'] === "yes" ?
                                true : false}
                                name="isEnquiry"
                                value={(student['isEnquiry'] === "yes") ?
                                    "no" : "yes"}
                                color="primary"
                                onChange={(e) => this.props.onChangeStudent(e)} />}
                            label="Is from Enquiry"
                            className='form-left-heading'
                        />
                    </Grid>
                }
                {isEnquiryDataRetrieved &&
                    <Grid item md={3} xs={12} sm={12} >
                        <Box className='form-left-heading'> Enquiry No.</Box>
                    </Grid>
                }
                {!isEnquiryDataRetrieved &&
                    <Grid item md={7} xs={12} sm={12}>
                        <Grid container className=''>
                            {student['isEnquiry'] !== 'no' &&
                                <Grid item md={6} xs={12} sm={12}>
                                    <TextField
                                        
                                        autoComplete="off"
                                        id='outlined-name'
                                        label='Enquiry No.'
                                        name='enquiry_number'
                                        value={student['enquiry_number']}
                                        onChange={(e) => this.props.onChangeStudent(e)}
                                        margin='normal'
                                        fullWidth
                                        variant='outlined'
                                        helperText={fieldErrors && (fieldErrors.enquiryNotFound || fieldErrors.enquiryNumberMandatory)}
                                        error={fieldErrors && (fieldErrors.enquiryNotFound || fieldErrors.enquiryNumberMandatory ? true : false)}
                                        inputProps={{ maxLength: 50 }}
                                    />
                                    {fieldErrors && fieldErrors.enquiryNotFound &&
                                        <Box display='flex' fontSize='14px'>
                                            <Box color='red' mr={1}>
                                                <FormattedMessage {...messages.forgotEnquiryNumber} />
                                            </Box>
                                            <a href={Actions.enquiry_student_list.view.url} target="_blank">
                                                <FormattedMessage {...commonMessages.clickHere} />
                                            </a>
                                        </Box>
                                    }
                                </Grid>
                            }
                            <Grid item md={6} xs={12} sm={12}>
                                {(student['isEnquiry'] !== 'no' && !loadingEnquiryButton) &&
                                    <Box className='header-align flex-justify-center-flex-prop'>
                                        <Button
                                            variant="contained"
                                            onClick={() => this.props.verifyEnquiry(student['enquiry_number'])}
                                            className='editbutton-view margin-top-10'
                                        >
                                            <FormattedMessage {...messages.verifyEnquiryNumber} />
                                        </Button>
                                    </Box>
                                }
                                {loadingEnquiryButton &&
                                    <Box className='flex-justify-center-flex-prop margin-top-15'>
                                        <CircularProgress />
                                    </Box>
                                }
                            </Grid>
                        </Grid>
                    </Grid>
                }
                {(student['isEnquiry'] !== 'no' && !loadingEnquiryButton) &&
                    <Box mt={3} mb={3}>
                        <Divider />
                    </Box>
                }
                {
                    isEnquiryDataRetrieved &&
                    <Grid item md={8}>
                        <Box className='enquiry-number-application-form-box'>
                            <Box className='enquiry-number-application-form'>
                                {student['enquiry_number']}
                            </Box>
                            <HighlightOffIcon className='enquiry-number-close-icon' onClick={this.props.handleCloseEnquiryNumber} />
                        </Box>
                    </Grid>
                }
            </ Grid >
        )
    }
}


export default IsEnquiryForm