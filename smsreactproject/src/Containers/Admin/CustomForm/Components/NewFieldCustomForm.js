import React, { Component } from 'react'
import {
    Box, Button, Dialog, DialogActions, DialogContent, FormControlLabel, FormControl, FormGroup, Checkbox,
    TextField, Grid, Tooltip, TextareaAutosize, FormHelperText, RadioGroup, Radio
} from '@material-ui/core';
import FolderRoundedIcon from '@material-ui/icons/FolderRounded';
import clsx from 'clsx';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import EditTwoToneIcon from '@material-ui/icons/EditTwoTone';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import FiberManualRecordOutlinedIcon from '@material-ui/icons/FiberManualRecordOutlined';
import Swal from 'sweetalert2'
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';
import { makeStyles } from '@material-ui/core/styles';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import Snackbar from '@material-ui/core/Snackbar';

import { file_default_image_view_details, supported_images_types, permission_modes } from 'Containers/VideoTutorials/Constants';
import { putRequest } from 'Includes/api/apicall';
import { PUT_URL } from 'Includes/urls'
import { Dropdown } from 'Components/DropDown';
import { type_list, md_list, className_list, required_list, regex_list } from 'Containers/Admin/CustomForm/Components/Constants';
import BlankPagewithIcon from 'Components/BlankPageWithIcon';
import { nameAndUnderScoreRegex } from 'Constants/regularExpression';
import { Alert } from 'Includes/functions';

const useStyles = makeStyles({
    root: {
        '&:hover': {
            backgroundColor: 'transparent',
        },
    },
    icon: {
        borderRadius: '50%',
        width: 16,
        height: 16,
        boxShadow: 'inset 0 0 0 1px rgba(16,22,26,.2), inset 0 -1px 0 rgba(16,22,26,.1)',
        backgroundColor: '#f5f8fa',
        backgroundImage: 'linear-gradient(180deg,hsla(0,0%,100%,.8),hsla(0,0%,100%,0))',
        '$root.Mui-focusVisible &': {
            outline: '2px auto rgba(19,124,189,.6)',
            outlineOffset: 2,
        },
        'input:hover ~ &': {
            backgroundColor: '#ebf1f5',
        },
        'input:disabled ~ &': {
            boxShadow: 'none',
            background: 'rgba(206,217,224,.5)',
        },
    },
    checkedIcon: {
        backgroundColor: '#137cbd',
        backgroundImage: 'linear-gradient(180deg,hsla(0,0%,100%,.1),hsla(0,0%,100%,0))',
        '&:before': {
            display: 'block',
            width: 16,
            height: 16,
            backgroundImage: 'radial-gradient(#fff,#fff 28%,transparent 32%)',
            content: '""',
        },
        'input:hover ~ &': {
            backgroundColor: '#106ba3',
        },
    },
});

function StyledRadio(props) {
    const classes = useStyles();

    return (
        <Radio
            className={classes.root}
            disableRipple
            color="default"
            checkedIcon={<span className={clsx(classes.icon, classes.checkedIcon)} />}
            icon={<span className={classes.icon} />}
            {...props}
        />
    );
}

export default class ViewFolderDetails extends Component {
    constructor(props) {
        super(props)

        this.state = {
            errorContent: '',
            submitDisable: false,
            isEditDescription: false,
            description: '',
            newDetails: { checkBoxValues: [], dropDownValues: [], radioValues: [] },
            fieldError: {},
            openSnackbar: false,
            alertData: '',
            selectedDropDown: '',
            selectedRadio: '',
            isDialogOpen: false,
            errorText: ''
        }
    }


    handleClose = () => {
        this.setState({
            open: false,
            isEditDescription: false
        })
    }

    handleEdit = () => {
        this.setState({
            isEditDescription: true,
        })
    }

    onChange = (e) => {
        let { name, value } = e.target;
        this.setState({
            [name]: value
        })
    }

    getValidationPostData = () => {
        let { newDetails, fieldError, errorContent } = this.state;
        let return_data = true
        fieldError = {}
        if (!newDetails.name) {
            fieldError['name'] = 'This field is required'
        }
        if (!newDetails.label) {
            fieldError['label'] = 'This field is required'
        }
        if (!newDetails.md) {
            fieldError['md'] = 'This field is required'
        }
        if (!newDetails.className) {
            fieldError['className'] = 'This field is required'
        }
        if ((!newDetails.required && newDetails.required !== false)) {
            fieldError['required'] = 'This field is required'
        }
        if (newDetails.type === 'dropDown' && newDetails.dropDownValues.length === 0) {
            return_data = false
            errorContent = 'Add atleast one option for dropdown'
        }
        this.setState({
            errorContent
        })
        if (Object.keys(fieldError).length > 0) {
            return_data = false
            this.setState({
                fieldError
            })
        }
        return return_data
    }

    submit = () => {
        const { newDetails } = this.state;
        const validate = this.getValidationPostData()
        if (validate) {
            let form_detail = {
                label: newDetails.label,
                name: newDetails.name,
                regex: newDetails.regex ? newDetails.regex : '',
                md: newDetails.md,
                className: newDetails.className,
                required: newDetails.required,
                default: this.getDefaultValue(),
                type: newDetails.type,
                maxLength: newDetails.maxLength,
                list: this.getOptionList(),
                isCustom: true,
                coming_after: newDetails.coming_after,
                form_name: newDetails.form_name,
                sub_section: newDetails.sub_section,
                dependentParent: newDetails?.dependentParent
            }
            this.props.handleNewField(form_detail)
        }
    }

    getDefaultValue = () => {
        let return_data = ''
        const { newDetails } = this.state;
        if (newDetails.type === 'text' || newDetails.type === 'number' || newDetails.type === 'text_area' || newDetails.type === 'switch' || newDetails.type === 'checkbox') {
            return_data = newDetails.default
        }
        else if (newDetails.type === 'dropDown' && newDetails.selectedDropDown) {
            return_data = newDetails.selectedDropDown
        }
        else if (newDetails.type === 'dropDownWithSearch' && newDetails.selectedDropDown) {
            newDetails.dropDownValues.map((data) => {
                if (data['id'] === newDetails.selectedDropDown) {
                    return_data = data
                }
            })
        }
        else if (newDetails.type === 'multiselect') {
            return_data = []
            newDetails.checkBoxValues.map((data) => {
                if (data['value']) {
                    return_data.push(data)
                }
            })
        }
        else if (newDetails.type === 'radio' && newDetails.selectedRadio) {
            return_data = newDetails.selectedRadio
        }
        return return_data
    }

    getOptionList = () => {
        const { newDetails } = this.state;
        let return_data = []
        if (newDetails.type === 'dropDown' || newDetails.type === 'dropDownWithSearch') {
            return_data = newDetails.dropDownValues
        }
        else if (newDetails.type === 'multiselect') {
            return_data = newDetails.checkBoxValues
        }
        else if (newDetails.type === 'radio') {
            return_data = newDetails.radioValues
        }
        return return_data
    }

    handleSearchChange = (e) => {
        let { name, value } = e.target;
        let { newDetails, fieldError } = this.state;
        newDetails[name] = value
        delete fieldError[name]
        if (name === 'type') {
            this.resetNewFieldDetails()
        }
        if (name === 'name') {
            this.props.handleClearText()
        }
        this.setState({
            newDetails,
            fieldError,
            errorContent: ''
        })
    }

    resetNewFieldDetails = () => {
        let { newDetails } = this.state;
        newDetails['default'] = ''
        newDetails['radioValues'] = []
        newDetails['dropDownValues'] = []
        newDetails['checkBoxValues'] = []
        this.setState({
            newDetails
        })
    }

    onBlurTextValidation = () => {
        let { newDetails, fieldError } = this.state;
        if (newDetails.name && !nameAndUnderScoreRegex.value.test(newDetails.name)) {
            fieldError['name'] = nameAndUnderScoreRegex.errorText
        }
        this.setState({
            fieldError
        })
    }

    setDefault = () => {
        let { newDetails } = this.state;
        newDetails['newEnteredValue'] = ''
        this.setState({
            newDetails
        })
    }

    handleAddCheckBox = () => {
        let { newDetails, openSnackbar, alertData } = this.state;
        if (newDetails.newEnteredValue) {
            let duplicate_found_name = false
            newDetails.checkBoxValues.map((temp) => {
                if (newDetails.newEnteredValue && temp.name === newDetails.newEnteredValue) {
                    duplicate_found_name = true
                }
            })
            if (!duplicate_found_name) {
                let newValue = newDetails.newEnteredValue
                let temp = { name: newValue, value: false, id: newValue }
                newDetails.checkBoxValues.push(temp)
                this.setDefault()
            }
            else {
                openSnackbar = true
                alertData = 'Entered Option Value is already present Please Enter New one'
            }
        }
        else {
            openSnackbar = true
            alertData = 'Please Enter Value'
        }
        this.setState({
            newDetails,
            openSnackbar,
            alertData,
        })
    }

    handleAddRadio = () => {
        let { newDetails, openSnackbar, alertData } = this.state;
        if (newDetails.newEnteredValue) {
            let duplicate_found_name = false
            newDetails.radioValues.map((temp) => {
                if (newDetails.newEnteredValue && temp.label === newDetails.newEnteredValue) {
                    duplicate_found_name = true
                }
            })
            if (!duplicate_found_name) {
                let newValue = newDetails.newEnteredValue
                let temp = { label: newValue, value: newValue, id: newValue }
                newDetails.radioValues.push(temp)
                this.setDefault()
            }
            else {
                openSnackbar = true
                alertData = 'Entered Option Value is already present Please Enter New one'
            }
        }
        else {
            openSnackbar = true
            alertData = 'Please Enter Value'
        }
        this.setState({
            newDetails,
            openSnackbar,
            alertData,
        })
    }

    handleAddDropDown = () => {
        let { newDetails, openSnackbar, alertData, fieldError } = this.state;
        if (newDetails.newEnteredValue) {
            let duplicate_found_name = false
            newDetails.dropDownValues.map((temp) => {
                if (newDetails.newEnteredValue && temp.name === newDetails.newEnteredValue) {
                    duplicate_found_name = true
                }
            })
            if (!duplicate_found_name) {
                let newValue = newDetails.newEnteredValue
                let temp = { name: newValue, value: false, id: newValue }
                newDetails.dropDownValues.push(temp)
                this.setDefault()
            }
            else {
                fieldError = 'Entered Option Value is already present Please Enter New one'
            }
        }
        else {
            openSnackbar = true
            alertData = 'Please Enter Value'
        }
        this.setState({
            newDetails,
            openSnackbar,
            alertData,
            fieldError
        })
    }

    handleInputField = (questionType) => {
        let { fieldError, newDetails } = this.state;
        let icon = ''
        let addItem = ''
        let placeholderValue = 'Add Option'

        if (questionType === 'checkbox') {
            icon = <CheckBoxOutlineBlankIcon className='align-self-center' />
            addItem = this.handleAddCheckBox
        }
        else if (questionType === 'radio') {
            icon = <FiberManualRecordOutlinedIcon className='align-self-center' />
            addItem = this.handleAddRadio
        }
        else if (questionType === 'dropDown') {
            icon = ''
            addItem = this.handleAddDropDown
        }
        return (
            <Box className='display-flex margin-top-10'>
                {icon && icon}
                <TextField
                    autoComplete='off'
                    id='withinTime'
                    label={placeholderValue}
                    name='newEnteredValue'
                    value={newDetails.newEnteredValue}
                    className='width-250-px'
                    variant="outlined"
                    inputProps={{ maxLength: 25 }}
                    fullWidth
                    onChange={(e) => this.handleSearchChange(e)}
                    error={fieldError['newEnteredValue'] && (fieldError['newEnteredValue'])}
                    helperText={fieldError['newEnteredValue'] && (fieldError['newEnteredValue'])}
                />
                {addItem &&
                    <Tooltip title={placeholderValue} placement='top-start'>
                        <AddCircleOutlineOutlinedIcon
                            onClick={addItem}
                            className='set-question-add-icon' />
                    </Tooltip>
                }
            </Box>
        )
    }

    deleteCheckBoxValue = (index) => {
        let { newDetails } = this.state;
        newDetails.checkBoxValues.splice(index, 1)
        this.setState({
            newDetails
        })
    }

    deleteRadioValue = (index) => {
        let { newDetails } = this.state;
        newDetails.radioValues.splice(index, 1)
        this.setState({
            newDetails
        })
    }



    deleteDropdownValue = (index) => {
        let { newDetails } = this.state;
        newDetails.dropDownValues.splice(index, 1)
        this.setState({
            newDetails
        })
    }

    handleCheckBoxChange = (index) => {
        let { newDetails } = this.state;
        newDetails.checkBoxValues.map((temp, tempIndex) => {
            if (tempIndex === index) {
                temp.value = !temp.value
            }
        })
        this.setState({
            newDetails
        })
    }

    handleCloseSnackBar = () => {
        this.setState({
            openSnackbar: false
        })
    }

    componentDidMount = () => {
        const { isEditField, editFieldDetails } = this.props;

        if (isEditField) {
            let newDetails = { ...editFieldDetails }
            if (newDetails.type === 'dropDown' || newDetails.type === 'dropDownWithSearch') {
                newDetails['dropDownValues'] = newDetails.list
                newDetails['selectedDropDown'] = newDetails.default
            }
            else if (newDetails.type === 'radio') {
                newDetails['radioValues'] = newDetails.list
                newDetails['selectedRadio'] = newDetails.default
            }
            else if (newDetails.type === 'multiselect') {
                newDetails['checkBoxValues'] = newDetails.list
                newDetails['selectedRadio'] = newDetails.default
            }
            this.setState({
                newDetails,
                isDialogOpen: true,
                isEditField,
            })
        }
        else {
            this.setState({
                isDialogOpen: true,
                newDetails: { checkBoxValues: [], dropDownValues: [], radioValues: [] },
            })
        }
    }


    handleRadioChange = (e, value) => {
        let { newDetails } = this.state;
        // newDetails.radioValues.map((data) => {
        //     data.value = false
        //     if (value === data.label) {
        //         data.value = true
        //     }
        // })
        newDetails['selectedRadio'] = value
        this.setState({
            newDetails
        })
    }

    handleDropDownChange = (e, value) => {
        let { newDetails } = this.state;
        newDetails.dropDownValues.map((data) => {
            data.value = false
            if (value === data.name) {
                data.value = true
            }
        })
        newDetails['selectedDropDown'] = value
        this.setState({
            newDetails
        })
    }

    render() {
        let { alertData, errorContent, submitDisable, newDetails, fieldError, openSnackbar, isDialogOpen } = this.state;
        const { errorText } = this.props;
        return (
            <div>
                <Dialog open={isDialogOpen}
                    className='action-new-custom-form-width'
                    aria-labelledby='form-dialog-title'>
                    <Box className='close-icon-top-end'>
                        <HighlightOffIcon className='end-flex-prop' onClick={this.props.handleClose} />
                    </Box>
                    <DialogContent>
                        <Grid container className='mt-20'>
                            <Grid item md={4} xs={12}>
                                <Dropdown
                                    id='new_custom_form_type'
                                    label='Field Type'
                                    name='type'
                                    data={type_list}
                                    value={newDetails['type']}
                                    hideSelect
                                    required
                                    className={'width-form-90'}
                                    onChange={(e) => this.handleSearchChange(e)}
                                />
                            </Grid>
                        </Grid>
                        {!newDetails['type'] ?
                            <div className='mt-20'>
                                <BlankPagewithIcon data='Select Type' />
                            </div>
                            :
                            <div>
                                <Grid container>
                                    <Grid item md={8} xs={12}>
                                        <Grid container>
                                            <Grid item md={6} xs={12} className='mt-20'>
                                                <TextField
                                                    autoComplete="off"
                                                    id={'new_custom_form_label'}
                                                    label={'Label'}
                                                    name={'label'}
                                                    value={newDetails['label']}
                                                    className={'width-form-90'}
                                                    autoFocus={true}
                                                    onBlur={(e) => { this.onBlurTextValidation(e) }}
                                                    variant='outlined'
                                                    required={true}
                                                    inputProps={{ maxLength: 100 }}
                                                    helperText={fieldError['label'] && fieldError['label']}
                                                    error={fieldError['label'] && fieldError['label']}
                                                    onChange={(e) => this.handleSearchChange(e)}
                                                />
                                            </Grid>
                                            <Grid item md={6} xs={12} className='mt-20'>
                                                <TextField
                                                    autoComplete="off"
                                                    id={'new_custom_form_name'}
                                                    label={'Name'}
                                                    name={'name'}
                                                    value={newDetails['name']}
                                                    className={'width-form-90'}
                                                    onBlur={(e) => { this.onBlurTextValidation(e) }}
                                                    variant='outlined'
                                                    required={true}
                                                    inputProps={{ maxLength: 100 }}
                                                    helperText={fieldError['name'] && fieldError['name']}
                                                    error={fieldError['name'] && fieldError['name']}
                                                    onChange={(e) => this.handleSearchChange(e)}
                                                />
                                            </Grid>
                                            <Grid item md={6} xs={12} className='mt-20'>
                                                <Dropdown
                                                    id='new_custom_form_classname'
                                                    label='Grid md'
                                                    name='md'
                                                    data={md_list}
                                                    value={newDetails['md']}
                                                    hideSelect
                                                    required
                                                    className={'width-form-90'}
                                                    onChange={(e) => this.handleSearchChange(e)}
                                                    helperText={fieldError['md'] && fieldError['md']}
                                                    error={fieldError['md'] && fieldError['md']}
                                                />
                                            </Grid>
                                            <Grid item md={6} xs={12} className='mt-20'>
                                                <Dropdown
                                                    id='new_custom_form_classname'
                                                    label='Class Name'
                                                    name='className'
                                                    data={className_list}
                                                    value={newDetails['className']}
                                                    hideSelect
                                                    required
                                                    className={'width-form-90'}
                                                    onChange={(e) => this.handleSearchChange(e)}
                                                    helperText={fieldError['className'] && fieldError['className']}
                                                    error={fieldError['className'] && fieldError['className']}
                                                />
                                            </Grid>
                                            <Grid item md={6} xs={12} className='mt-20'>
                                                <Dropdown
                                                    id='new_custom_form_required'
                                                    label='Required'
                                                    name='required'
                                                    openError data={required_list}
                                                    value={newDetails['required']}
                                                    hideSelect
                                                    required
                                                    className={'width-form-90'}
                                                    onChange={(e) => this.handleSearchChange(e)}
                                                    helperText={fieldError['required'] && fieldError['required']}
                                                    error={fieldError['required'] && fieldError['required']}
                                                />
                                            </Grid>
                                            {(newDetails['type'] === 'switch' || newDetails['type'] === 'checkbox') &&
                                                <Grid item md={6} xs={12} className='mt-20'>
                                                    <Dropdown
                                                        id='new_custom_form_default'
                                                        label='Default'
                                                        name='default'
                                                        data={required_list}
                                                        value={newDetails['default']}
                                                        className={'width-form-90'}
                                                        onChange={(e) => this.handleSearchChange(e)}
                                                        helperText={fieldError['default'] && fieldError['default']}
                                                        error={fieldError['default'] && fieldError['default']}
                                                    />
                                                </Grid>
                                            }
                                            {newDetails['type'] === 'text' &&
                                                <Grid item md={6} xs={12} className='mt-20'>
                                                    <TextField
                                                        autoComplete="off"
                                                        id={'new_custom_form_default'}
                                                        label={'Default Value'}
                                                        name={'default'}
                                                        value={newDetails['default']}
                                                        className={'width-form-90'}
                                                        onBlur={(e) => { this.onBlurTextValidation(e) }}
                                                        variant='outlined'
                                                        inputProps={{ maxLength: 100 }}
                                                        helperText={fieldError['default'] && fieldError['default']}
                                                        error={fieldError['default'] && fieldError['default']}
                                                        onChange={(e) => this.handleSearchChange(e)}
                                                    />
                                                </Grid>
                                            }
                                            {newDetails['type'] === 'number' &&
                                                <Grid item md={6} xs={12} className='mt-20'>
                                                    <TextField
                                                        autoComplete="off"
                                                        type='number'
                                                        id={'new_custom_form_default'}
                                                        label={'Default Value'}
                                                        name={'default'}
                                                        value={newDetails['default']}
                                                        className={'width-form-90'}
                                                        onBlur={(e) => { this.onBlurTextValidation(e) }}
                                                        variant='outlined'
                                                        onChange={(e) => this.handleSearchChange(e)}
                                                        inputProps={{
                                                            max: 10000000
                                                        }}
                                                        helperText={fieldError['default'] && fieldError['default']}
                                                        error={fieldError['default'] && fieldError['default']}
                                                    />
                                                </Grid>
                                            }
                                            {(newDetails['type'] === 'text' || newDetails['type'] === 'text_area') &&
                                                <Grid item md={6} xs={12} className='mt-20'>
                                                    <Dropdown
                                                        id='new_custom_form_regex'
                                                        label='Regex'
                                                        name='regex'
                                                        data={regex_list}
                                                        value={newDetails['regex']}
                                                        className={'width-form-90'}
                                                        onChange={(e) => this.handleSearchChange(e)}
                                                        helperText={fieldError['regex'] && fieldError['regex']}
                                                        error={fieldError['regex'] && fieldError['regex']}
                                                    />
                                                </Grid>
                                            }
                                            {(newDetails['type'] === 'number' || newDetails['type'] === 'text' || newDetails['type'] === 'text_area') &&
                                                <Grid item md={6} xs={12} className='mt-20'>
                                                    <TextField
                                                        autoComplete="off"
                                                        type='number'
                                                        id={'new_custom_form_maxLength'}
                                                        label={'Maximum Length'}
                                                        name={'maxLength'}
                                                        value={newDetails['maxLength']}
                                                        className={'width-form-90'}
                                                        onBlur={(e) => { this.onBlurTextValidation(e) }}
                                                        variant='outlined'
                                                        onChange={(e) => this.handleSearchChange(e)}
                                                        inputProps={{
                                                            max: 10000000
                                                        }}
                                                        helperText={fieldError['maxLength'] && fieldError['maxLength']}
                                                        error={fieldError['maxLength'] && fieldError['maxLength']}
                                                    />
                                                </Grid>
                                            }
                                        </Grid>
                                    </Grid>
                                    {(newDetails['type'] === 'multiselect') &&
                                        <Grid item md={4} xs={12} className='mt-20'>
                                            <FormControl component="fieldset" >
                                                <FormGroup>
                                                    {newDetails.checkBoxValues.map((temp, index) => {
                                                        return (
                                                            <Box className='radio-options-outer-box' onChange={() => this.handleCheckBoxChange(index)}>
                                                                <Box className='radio-options-box'>
                                                                    <FormControlLabel
                                                                        control={<Checkbox checked={temp.value} name={temp.name} color='primary' />}
                                                                        label={temp.name}
                                                                    />
                                                                </Box>
                                                                <Box className='delete-set-radio-options'
                                                                    onClick={() => this.deleteCheckBoxValue(index)}>
                                                                    <HighlightOffIcon />
                                                                </Box>
                                                            </Box>
                                                        )
                                                    })
                                                    }
                                                    {this.handleInputField('checkbox')}
                                                </FormGroup>
                                            </FormControl>
                                        </Grid>
                                    }
                                    {(newDetails['type'] === 'radio') &&
                                        <Grid item md={4} xs={12} className='mt-20'>
                                            <FormControl component="fieldset">
                                                <RadioGroup value={newDetails.selectedRadio}
                                                    onChange={this.handleRadioChange} name="selectedRadio" aria-label='selectedRadio'>
                                                    {newDetails.radioValues.map((temp, index) => {
                                                        return (
                                                            <Box className='radio-options-outer-box' key={index}>
                                                                <Box className='radio-options-box'>
                                                                    <FormControlLabel value={temp.label} control={<StyledRadio />} label={temp.label} />
                                                                </Box>
                                                                <Box className='delete-set-radio-options'
                                                                    onClick={() => this.deleteRadioValue(index)}>
                                                                    <HighlightOffIcon />
                                                                </Box>
                                                            </Box>
                                                        )
                                                    })
                                                    }
                                                </RadioGroup>
                                            </FormControl>
                                            {this.handleInputField('radio')}
                                        </Grid>
                                    }
                                    {(newDetails['type'] === 'dropDown' || newDetails['type'] === 'dropDownWithSearch') &&
                                        <Grid item md={4} xs={12} className='mt-20'>
                                            <FormControl component="fieldset">
                                                <RadioGroup value={newDetails.selectedDropDown}
                                                    onChange={this.handleDropDownChange} name="selectedRadio" aria-label='selectedRadio'>
                                                    {newDetails.dropDownValues.map((temp, index) => {
                                                        return (
                                                            <Box className='radio-options-outer-box' key={index}>
                                                                <Box className='radio-options-box'>
                                                                    <FormControlLabel value={temp.name} control={<StyledRadio />} label={temp.name} />
                                                                </Box>
                                                                <Box className='delete-set-radio-options'
                                                                    onClick={() => this.deleteDropdownValue(index)}>
                                                                    <HighlightOffIcon />
                                                                </Box>
                                                            </Box>
                                                        )
                                                    })
                                                    }
                                                </RadioGroup>
                                            </FormControl>
                                            {this.handleInputField('dropDown')}
                                        </Grid>
                                    }
                                    {(newDetails['type'] === 'text_area') &&
                                        <Grid item md={4} xs={12} className='mt-20'>
                                            <FormControl
                                                fullWidth
                                                error={fieldError['default'] && (fieldError['default'] ? true : false)}
                                            >
                                                <Box className='apply-leave-label-names'>Default</Box>
                                                <TextareaAutosize aria-label="minimum height"
                                                    id={`new_custom_form_default`}
                                                    className='apply-leave-text-area-auto-size-reason'
                                                    value={newDetails['default']}
                                                    maxLength={1000}
                                                    name={'default'}
                                                    onChange={(e) => this.handleSearchChange(e)}
                                                />
                                                {fieldError['default'] &&
                                                    <FormHelperText>{fieldError['default']}</FormHelperText>
                                                }
                                            </FormControl>


                                        </Grid>
                                    }
                                </Grid>
                            </div>
                        }
                    </DialogContent>
                    <DialogActions>
                        <div className='text-red'>
                            {errorText || errorContent}
                        </div>
                        {newDetails['type'] &&
                            <Button texttransform='none' disabled={submitDisable}
                                onClick={() => this.submit()} color='primary' className='submit'>
                                Submit
                            </Button>
                        }
                    </DialogActions>
                </Dialog>
                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackbar} autoHideDuration={2000} onClose={this.handleCloseSnackBar}>
                    <Alert onClose={this.handleCloseSnackBar} severity="error">
                        {alertData}
                    </Alert>
                </Snackbar>
            </div >
        )
    }
}
