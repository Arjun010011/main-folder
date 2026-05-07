import React, { Component } from 'react'
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import { withRouter } from 'react-router-dom';
import _ from 'lodash';
import Snackbar from '@material-ui/core/Snackbar';
import Swal from 'sweetalert2'
import {
    Paper, Box, TableContainer, Table, TableHead, TableCell,
    Grid, TableRow, TableBody, Tooltip, Button, Collapse, TextField, ListItem, Switch,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import EditIcon from '@material-ui/icons/Edit';


import loadingBar from 'images/loading.gif'
import { Actions } from 'Constants/permissions';
import { getRequest, postRequest, putRequest } from 'Includes/api/apicall';
import { GET_URL, POST_URL, PUT_URL } from 'Includes/urls';
import { nameWithQuoteRegex } from 'Constants/regularExpression';
import { Alert, dateFormat, getUrlParam, validateDate, isUserHasPermission } from 'Includes/functions';
import NewFieldCustomForm from './Components/NewFieldCustomForm';
import './styles.scss';
import { Forms } from 'Constants/FormDefinition';
import { cloneDeep } from 'lodash';
import { CustomForms } from "Constants/FormDefinition/CustomAdmissionForm";

let user =
  localStorage.getItem("user") != "undefined"
    ? JSON.parse(localStorage.getItem("user"))
    : "";

class AddGpsMachine extends Component {
    constructor(props) {
        super(props)

        this.state = {
            form_details: [],
            gpsDetails: null,
            isEditForm: false,
            loading: true,
            standardList: [],
            checkAll: false,
            fieldError: {},
            openError: false,
            alertData: '',
            gpsmachineID: '',
            header: 'Add',
            handleNewOpen: false,
            editFieldDetails: {},
            isEditField: false,
            custom_form_name: '',
            errorText: false
        }
    }

    async componentDidMount() {
        this.updateForms()
    }

    getCustomFormDetails = () => {
        let { id } = getUrlParam();
        let { custom_form_name, form_index, form_details } = this.state;
        const url = GET_URL.customform.api + id + '/'
        getRequest(url, {}, this.props).then((response) => {
            if (response && response.status === 200) {
                let customDetails = response.data.data
                let index_temp = ''
                let section_temp = ''
                custom_form_name = customDetails['form_name']
                customDetails.field_structure.map((data) => {
                    index_temp = ''
                    if (form_details[form_index]['page_details']['sub_sections'][data['sub_section']]) {
                        form_details[form_index]['page_details']['sub_sections'][data['sub_section']].list.map((dataList, dataIndex) => {
                            if (dataList.name === data['coming_after']) {
                                index_temp = dataIndex
                                section_temp = data['sub_section']
                            }
                        })
                    }
                    if (index_temp !== '' && section_temp !== '') {
                        form_details[form_index]['page_details']['sub_sections'][section_temp]['list'].splice(index_temp + 1, 0, data);
                    }
                })
                this.setState({
                    custom_form_name,
                    form_details,
                    loading: false,
                    editId: id
                })
            }
        });
    }

    updateForms = () => {
        let { form_name, form_label } = getUrlParam();
        if (form_name) {
            let form_details = cloneDeep(Forms)
            let form_index = ''
            form_details.map((parentField, index) => {
                if (parentField['page_details']['form_name'] === form_name) {
                    form_index = index
                }
                if (
                    parentField.page_details.form_name === "admission_form" &&
                    Object.keys(CustomForms).includes(user.institute_details.code)
                  ) {
                    parentField.page_details =
                      CustomForms[user.institute_details.code]["page_details"];
                  }
            })
            this.setState({
                form_name,
                form_label,
                form_details,
                form_index,
            }, () => {
                if (this.props.location.pathname === Actions.custom_form.update.url) {
                    this.getCustomFormDetails()
                }
                else {
                    this.setState({ loading: false })
                }
            })
        }
        else{
            this.props.history.push({
                pathname: Actions.custom_form.view.url,
            });
        }
    }

    getListOptions = (list) => {
        let return_data = []
        if (list) {
            list.map((data) => {
                return_data.push(data.name)
            })
        }
        return return_data.join(',')
    }

    handleChangeNewOpen = (parentIndex, field, index) => {
        let newFieldDetailsPath = { parentIndex: parentIndex, field: field, index: index }
        this.setState({
            handleNewOpen: true,
            isEditField: false,
            newFieldDetailsPath
        })
    }

    handleEditNewOpen = (parentIndex, field, index, data) => {
        let newFieldDetailsPath = { parentIndex: parentIndex, field: field, index: index }
        this.setState({
            handleNewOpen: true,
            newFieldDetailsPath,
            editFieldDetails: data,
            isEditField: true
        })
    }

    handleDeleteField = (parentIndex, field, index) => {
        let { form_details } = this.state;
        form_details[parentIndex]['page_details']['sub_sections'][field]['list'].splice(index, 1);
        this.setState({
            form_details
        })
    }

    handleNewField = (newField) => {
        const { newFieldDetailsPath, form_details, form_name, isEditField } = this.state;
        const { parentIndex, field, index } = newFieldDetailsPath
        let validate = this.getValidateNames(newField, index);
        if (validate) {
            if (isEditField) {
                form_details[parentIndex]['page_details']['sub_sections'][field]['list'][index] = newField;
            }
            else {
                newField['coming_after'] = form_details[parentIndex]['page_details']['sub_sections'][field]['list'][index]['name']
                newField['form_name'] = form_name
                newField['sub_section'] = field
                if (field === 'bpl_details') {
                    newField['dependentParent'] = 'is_bpl'
                }
                form_details[parentIndex]['page_details']['sub_sections'][field]['list'].splice(index + 1, 0, newField);
            }
            this.setState({
                form_details
            }, () => {
                this.handleClose()
            })
        }
    }

    getValidateNames = (newField, index) => {
        let { form_details, newFieldDetailsPath, isEditField } = this.state;
        let duplicate_found = false;
        const { parentIndex } = newFieldDetailsPath;
        Object.keys(form_details[parentIndex]['page_details']['sub_sections']).map((data) => {
            if (!duplicate_found) {
                form_details[parentIndex]['page_details']['sub_sections'][data]['list'].map((list_data, list_index) => {
                    if (list_data.name === newField.name && !duplicate_found && ((isEditField && index !== list_index) || !isEditField)) {
                        duplicate_found = true
                    }
                })
            }
        })
        if (duplicate_found) {
            this.setState({
                errorText: 'name is already exist, please enter different name'
            })
        }
        return !duplicate_found
    }

    handleTableBody = (field) => {
        const { form_details, form_index } = this.state;
        return (
            <React.Fragment>
                <TableRow className='table-row display-flex' >
                    <TableCell component="th" scope="row" className='p-5px form-definition-table-label'>
                        <Box className='section-outer-box'>
                            <Box>
                                {form_details[form_index]['page_details']['sub_sections'][field]['label']}
                            </Box>
                        </Box>
                    </TableCell>
                </TableRow>
                <TableRow>
                    <TableCell colSpan={1} className='p-5px'>
                        <Collapse in={true} timeout="auto" unmountOnExit>
                            <Box margin={1}>
                                <Table size="small" aria-label="purchases">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Actions</TableCell>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Label</TableCell>
                                            <TableCell align="center">Required</TableCell>
                                            <TableCell>Regex</TableCell>
                                            <TableCell>className</TableCell>
                                            <TableCell>Grid md</TableCell>
                                            <TableCell>Field Type</TableCell>
                                            <TableCell>Max Length</TableCell>
                                            <TableCell>Default</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {form_details[form_index]['page_details']['sub_sections'][field]['list'].map((data, index) => (
                                            <>
                                                {!Boolean(form_details[form_index]['page_details']['sub_sections'][field]['hidden']) &&
                                                    <TableRow key={index} className={data.isCustom ? 'custom-form-bg-color custom-form-add' : 'custom-form-add'}>
                                                        <TableCell component="th" scope="row" className='p-5px'>
                                                            <Tooltip title={`Add field after ${data.name}`} enterDelay={400}
                                                                enterNextDelay={100} placement='top-start'
                                                                classes={{ tooltip: 'tooltip-show-data' }}>
                                                                <AddIcon className='add-icon-custom-form' onClick={() => this.handleChangeNewOpen(form_index, field, index)} />
                                                            </Tooltip>
                                                            {data.isCustom &&
                                                                <>
                                                                    <Tooltip title={`Edit field ${data.name}`} enterDelay={400}
                                                                        enterNextDelay={100} placement='top-start'
                                                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                                                        <EditIcon className='edit-icon-custom-form' onClick={() => this.handleEditNewOpen(form_index, field, index, data)} />
                                                                    </Tooltip>
                                                                    <Tooltip title={`Delete field ${data.name}`} enterDelay={400}
                                                                        enterNextDelay={100} placement='top-start'
                                                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                                                        <HighlightOffIcon className='delete-icon-custom-form' onClick={() => this.handleDeleteField(form_index, field, index)} />
                                                                    </Tooltip>
                                                                </>
                                                            }
                                                        </TableCell>
                                                        <TableCell component="th" scope="row" className='p-5px'>
                                                            {data.name}
                                                        </TableCell>
                                                        <TableCell component="th" scope="row" className='p-5px'>
                                                            {data.label}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            {data.required ? 'Yes' : 'No'}
                                                        </TableCell>
                                                        <TableCell className='maxwidth-100-px'>
                                                            {data.isCustom ? data.regex : data.regex?.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            {data.className}
                                                        </TableCell>
                                                        <TableCell>
                                                            {data.md}
                                                        </TableCell>
                                                        <TableCell>
                                                            {data.type}
                                                        </TableCell>
                                                        <TableCell>
                                                            {data.maxLength}
                                                        </TableCell>
                                                        <TableCell>
                                                            {(data.type === 'text' || data.type === 'number' || data.type === 'text_area') &&
                                                                data.default
                                                            }
                                                            {(data.type === 'dropDown' || data.type === 'dropDown') &&
                                                                this.getListOptions(data.list)
                                                            }
                                                        </TableCell>
                                                    </TableRow>
                                                }
                                                <TableRow>
                                                    {Boolean(form_details[form_index]['page_details']['sub_sections'][field]['hidden']) && index === 0 &&
                                                        <TableCell>
                                                            Section will be hidden
                                                        </TableCell>
                                                    }
                                                </TableRow>
                                            </>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            </React.Fragment>
        );
    }

    validatePostFormat = () => {
        let { form_details, form_index, form_name, editId, custom_form_name, fieldError, openError } = this.state;
        let validate = true
        let field_details = []
        let post_data = {}
        Object.keys(form_details[form_index]['page_details']['sub_sections']).map((sub_section) => {
            form_details[form_index]['page_details']['sub_sections'][sub_section].list.map((listData, index) => {
                if (listData.isCustom) {
                    listData['coming_after'] = form_details[form_index]['page_details']['sub_sections'][sub_section].list[index - 1]['name']
                    field_details.push(listData)
                }
            })
        })
        if (!custom_form_name) {
            fieldError['custom_form_name'] = 'This field is mandatory'
            validate = false
            this.setState({
                fieldError
            })
            window.scrollTo(0, 0);
        }
        if (field_details.length === 0) {
            validate = false
            this.setState({
                openError: true,
                alertData: 'Add atleast one custom field'
            })
        }
        if (validate) {
            post_data = {
                form_name: custom_form_name,
                form_for: form_name,
                field_structure: field_details,
                id: editId
            }
            validate = post_data
        }
        return validate
    }

    submit = () => {
        let validate_post_data = this.validatePostFormat();
        if (validate_post_data) {
            let url = POST_URL.customform.api;
            postRequest(url, validate_post_data, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Your Data has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.handleViewCustomForm()
                    }
                    this.setState({ submitDisable: false })
                });
        }
    }

    handleCloseSnackBar = () => {
        this.setState({
            openError: false
        })
    }

    handleClose = () => {
        this.setState({
            handleNewOpen: false
        })
    }

    handleSearchChange = (e) => {
        let { name, value } = e.target;
        this.setState({
            [name]: value
        })
    }


    handleViewCustomForm = () => {
        let { form_name } = this.state;
        let formInformation = {
            form_name: form_name,
        }
        let searchParam = "?" + new URLSearchParams(formInformation).toString()
        this.props.history.push({
            pathname: Actions.custom_form.view.url,
            search: searchParam,
        });
    }

    handleClearText = () => {
        this.setState({
            errorText: ''
        })
    }

    render() {
        let { form_details, loading, openError, alertData, handleNewOpen, form_index, editFieldDetails,
            fieldError, custom_form_name, isEditField, form_label, errorText } = this.state;
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
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={8} xs={12} className='header-align'>
                                <Box className='heading'>
                                    Create Custom Form {form_label}
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('custom_form', 'view') && <Button
                                        variant="contained"
                                        // component={Link} to={Actions.custom_form.view.url}
                                        onClick={this.handleViewCustomForm}
                                        className='editbutton-view'
                                    ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.custom_form.view.label}</Button>
                                    }
                                </Box>
                            </Grid>
                        </Grid>

                        <TextField
                            autoComplete="off"
                            id={'new_custom_form_name_name'}
                            label='Custom Form Name'
                            name='custom_form_name'
                            className='width-300px'
                            value={custom_form_name}
                            autoFocus={true}
                            variant='outlined'
                            required={true}
                            inputProps={{ maxLength: 100 }}
                            helperText={fieldError['custom_form_name'] && fieldError['custom_form_name']}
                            error={fieldError['custom_form_name'] && fieldError['custom_form_name']}
                            onChange={(e) => this.handleSearchChange(e)}
                        />
                        <Paper className='paper-plan-background mt-20'>
                            <TableContainer>
                                <Table size='small' aria-label='simple table'>
                                    <TableBody>
                                        {Object.keys(form_details[form_index]['page_details']['sub_sections']).map((field) => {
                                            return this.handleTableBody(field)
                                        })
                                        }
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                        <Grid item md={12}>
                            <Box display='flex' marginLeft='auto' justifyContent='flex-end'>
                                <Button variant="contained" color="primary"
                                    className='submit'
                                    disabled={this.state.submitDisable}
                                    onClick={this.submit}>
                                    Submit &nbsp;{' '}
                                </Button>
                            </Box>
                        </Grid>
                    </Paper>
                    {handleNewOpen &&
                        <NewFieldCustomForm
                            handleClose={this.handleClose}
                            handleNewField={this.handleNewField}
                            editFieldDetails={editFieldDetails}
                            isEditField={isEditField}
                            errorText={errorText}
                            handleClearText={this.handleClearText}
                        />
                    }
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openError} autoHideDuration={2000} onClose={this.handleCloseSnackBar}>
                        <Alert onClose={this.handleCloseSnackBar} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </div >
            )
        }
    }
}

export default withRouter(AddGpsMachine);
