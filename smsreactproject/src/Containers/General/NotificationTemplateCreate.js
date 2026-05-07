import React, { Component } from 'react'
import {
    Paper, Box, Grid, Button, Typography, FormControl, TextareaAutosize,
    TextField, FormHelperText
} from '@material-ui/core';
import Swal from 'sweetalert2'
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import PropTypes from 'prop-types';
import { Dropdown } from 'Components/DropDown';

import loadingBar from 'images/loading.gif'
import { getRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL } from 'Includes/urls'
import { Actions } from 'Constants/permissions';
import { isUserHasPermission, getKeyValueMap } from 'Includes/functions';
import { modules, formats } from 'Constants';
import "react-transliterate/dist/index.css";

import ReactTranslatorField from 'Components/ReactTranslatorField'

import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ShowPreviewTemplate from './Components/ShowPreviewTemplate';

function Alert(props) {
    return <MuiAlert elevation={6} variant="filled" {...props} />;
}

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <Typography
            component="div"
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            <Box p={3}>{children}</Box>
        </Typography>
    );
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired,
};


class NotificationTemplateCreate extends Component {
    constructor() {
        super()
        this.state = {
            subjects: [],
            loading: true,
            open: false,
            alertData: '',
            selectedCountry: '',
            subjectDetails: [],
            branch_list: [],
            selected_branch: [],
            fieldError: {},
            tabValue: 0,
            isDialogOpen: false,
            formDetails: {
                message: '', notification_medium: '', title: ''
            },
            theme: 'snow',
            enabled: true,
            readOnly: false,
            text: '',
            submitDisable: false,
            languageList: [],
            langKeyValue: {},
            modules,
            formats,
            notificationMediumList: [],
            mediumKeyValue: {},
            errorContent: ''
        }
    }

    componentDidMount = async () => {
        let params = { is_active: true }
        try {
            const res = await Promise.all([
                getRequest(GET_URL.language.api, params, this.props),
                getRequest(GET_URL.medium.api, params, this.props),
            ]);
            this.getLanguageList(res[0])
            this.getMediumList(res[1])
            if (this.props.location.pathname === Actions.notification_template.update.url) {
                if (this.props.location.state && this.props.location.state.detail) {
                    let id = this.props.location.state.detail
                    this.getTemplateDetails(id);
                }
                else {
                    this.props.history.push(Actions.notification_template.view.url);
                }
            }
            else {
                this.setState({
                    loading: false
                })
            }
        } catch {
            throw Error("Promise failed");
        }
    }

    getTemplateDetails = (id) => {
        let { formDetails } = this.state;
        getRequest(GET_URL.notificationtemplate.api + id + '/', {}, this.props).then((response) => {
            if (response && response.status === 200) {
                let updatedDetails = response.data.data;
                formDetails['message'] = updatedDetails.data
                formDetails['notification_medium'] = updatedDetails.notification_medium
                formDetails['notification_medium_name'] = updatedDetails.notification_medium_name
                formDetails['title'] = updatedDetails.name
                formDetails['id'] = updatedDetails.id
                this.setState({
                    formDetails,
                    loading: false
                })
            }
        });
    }

    getLanguageList = (response) => {
        let languageList = response.data.data
        let langKeyValue = getKeyValueMap(languageList, 'code', 'id')
        this.setState({ languageList, langKeyValue });
    }

    getMediumList = (response) => {
        let notificationMediumList = response.data.data
        let mediumKeyValue = getKeyValueMap(notificationMediumList, 'id', 'name')
        this.setState({ notificationMediumList, mediumKeyValue });
    }


    handleSubmit = () => {
        let { formDetails, langKeyValue } = this.state;
        this.setState({ submitDisable: true })
        let post_data = [{
            data: formDetails.message,
            notification_medium: formDetails.notification_medium,
            name: formDetails.title,
            language: langKeyValue[formDetails.lang],
            id: formDetails?.id
        }]
        let url = POST_URL.notificationtemplate.api;
        let props = { ...this.props };
        props['return_error_message'] = true
        postRequest(url, post_data, props)
            .then((response) => {
                if (response && response.status === 200) {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    })
                    this.props.history.push(Actions.notification_template.view.url)
                }
                else {
                    this.setState({
                        errorContent: response
                    })
                }
                this.setState({ submitDisable: false })
            });
    }

    handleClose = () => {
        this.setState({
            open: false
        })
    }

    handleStateViewButton = () => {
        this.props.history.push(Actions.notification_template.view.url)
    }

    addTag = (value) => {
        const quill = this.quillRef.getEditor()
    };

    onChangeMessage = (e) => {
        let { formDetails } = this.state;
        formDetails.message = e.target.value
        this.setState({
            formDetails
        })
    }

    handleDialogChange = () => {
        this.setState({
            isDialogOpen: !this.state.isDialogOpen
        })
    }

    onEditorChange = (content, delta, source, editor) => {
        let { formDetails, fieldError } = this.state;
        formDetails['message'] = content
        delete fieldError['message']
        this.setState({
            formDetails,
            fieldError
        })
    }

    setText = (value) => {
        const { formDetails, mediumKeyValue } = this.state;
        if (mediumKeyValue[formDetails.notification_medium] !== 'sms') {
            const quill = this.quillRef.getEditor()
            let index = 0
            if (quill?.selection?.savedRange?.index) {
                index = quill.selection.savedRange.index
            }
            quill.insertText(index, value);
        }
        else {
            formDetails['message'] = formDetails['message'] + value
        }
        this.setState({
            formDetails
        })
    }

    handleChange = (e) => {
        let { formDetails, fieldError, mediumKeyValue } = this.state;
        let { name, value } = e.target;
        if (formDetails['message'] !== '' && name === 'notification_medium' && (formDetails['notification_medium_name'] === 'sms' || mediumKeyValue[value] === 'sms')) {
            Swal.fire({
                title: "Are you sure?",
                text: "You want to change the notification medium, the entered message will be erased!",
                showCancelButton: true,
                confirmButtonColor: "#3085d6",
                cancelButtonColor: "#d33",
                confirmButtonText: "Agree",
            }).then(async (result) => {
                if (result.value) {
                    formDetails['message'] = ''
                    formDetails[name] = value
                    formDetails['notification_medium_name'] = mediumKeyValue[formDetails[name]]
                    delete fieldError[name]
                    this.setState({
                        formDetails,
                        fieldError
                    })
                }
                else {
                    return true
                }
            });
        }
        else {
            formDetails[name] = value
            if (name === 'notification_medium') {
                formDetails['notification_medium_name'] = mediumKeyValue[formDetails[name]]
            }
            delete fieldError[name]
            this.setState({
                formDetails,
                fieldError
            })
        }
    }


    validation = () => {
        let { formDetails, fieldError } = this.state;
        fieldError = {}
        let return_test = true
        if (!formDetails.title) {
            fieldError['title'] = 'This field is mandatory'
        }
        if (!formDetails.message) {
            fieldError['message'] = 'This field is mandatory'
        }
        if (!formDetails.notification_medium) {
            fieldError['notification_medium'] = 'This field is mandatory'
        }
        if (Object.keys(fieldError).length > 0) {
            return_test = false
        }
        this.setState({
            fieldError,
            formDetails
        })

        return return_test
    }

    showPreview = () => {
        let validation_test = this.validation()
        if (validation_test) {
            this.setState({
                showPreview: true
            })
        }
    }

    handleDialogChange = () => {
        this.setState({
            showPreview: false
        })
    }

    onChangeLang = (value, name) => {
        let { formDetails } = this.state;
        formDetails['lang'] = value
        formDetails['lang_name'] = name
        this.setState({
            formDetails
        })
    }

    render() {
        const { loading, openSnackBar, submitDisable, alertData, formDetails, modules, formats, showPreview,
            fieldError, notificationMediumList, languageList, mediumKeyValue, errorContent } = this.state;
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Paper className={classNames('paper-background')}>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                Notification Template Create
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12} >
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                {isUserHasPermission('notification_template', 'view') && <Button
                                    variant="contained"
                                    onClick={this.handleStateViewButton}
                                    className='editbutton-view'
                                ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.notification_template.view.label}</Button>}
                            </Box>
                        </Grid>
                    </Grid>
                    <Paper className='mt-20 height-75vh p-20'>
                        <Grid container spacing={4} className='mt-20'>
                            <Grid item md={4} xs={12}>
                                <TextField
                                    variant="outlined"
                                    label='Title'
                                    value={formDetails.title}
                                    onChange={this.handleChange}
                                    name={'title'}
                                    className='w-100'
                                    helperText={fieldError['title'] && fieldError['title']}
                                    error={fieldError['title'] && fieldError['title']}
                                />
                            </Grid>
                            <Grid item md={4} xs={12}>
                                <Dropdown
                                    data={notificationMediumList}
                                    name='notification_medium'
                                    value={formDetails.notification_medium}
                                    onChange={this.handleChange}
                                    label='Notification Medium'
                                    hideSelect={true}
                                    helperText={fieldError['notification_medium'] && fieldError['notification_medium']}
                                    error={fieldError['notification_medium'] && fieldError['notification_medium']}
                                />
                            </Grid>
                            <Grid item md={8} xs={12}>
                                <div className='fs-18 text-blue mb-20'>
                                    Message
                                </div>
                                <ReactTranslatorField
                                    onChange={this.setText}
                                    onChangeLang={this.onChangeLang}
                                    languageList={languageList}
                                />
                                <div className='mt-10'>
                                    <FormControl
                                        fullWidth
                                        error={fieldError.message && (fieldError.message ? true : false)}
                                    >
                                        {mediumKeyValue[formDetails.notification_medium] === 'sms' ?
                                            <TextareaAutosize aria-label="minimum height"
                                                className='text-area-notification '
                                                value={formDetails.message}
                                                maxLength={'10000'}
                                                name={'message'}
                                                onChange={this.handleChange}
                                            />
                                            :
                                            <ReactQuill
                                                ref={(el) => this.quillRef = el}
                                                theme={this.state.theme}
                                                value={formDetails.message}
                                                defaultValue={formDetails.message}
                                                readOnly={false}
                                                onChange={this.onEditorChange}
                                                modules={modules}
                                                formats={formats}
                                                className={'react-quill-min-height'}
                                            />
                                        }
                                        {fieldError.message &&
                                            <FormHelperText>{fieldError.message}</FormHelperText>
                                        }
                                    </FormControl>
                                </div>
                            </Grid>
                            {/* <Chip onClick={() => this.addTag('student_name')} label="Student Name" />
                                    <Chip onClick={() => this.addTag('father_name')} label="Father Name" /> */}
                        </Grid>
                        <Box className="submt-button-float-bottom">
                            <Button variant='contained'
                                color='primary' className='submit'
                                disabled={submitDisable}
                                onClick={this.showPreview}>Preview and submit
                            </Button>
                        </Box>
                    </Paper>
                    {showPreview &&
                        <ShowPreviewTemplate
                            formDetails={formDetails}
                            handleDialogChange={this.handleDialogChange}
                            handleSubmit={this.handleSubmit}
                            errorContent={errorContent}
                            submitDisable={submitDisable}
                        />
                    }
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackBar} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </Paper>
            )
        }
    }
}

export default withRouter(NotificationTemplateCreate)



