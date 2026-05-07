import React, { Component } from 'react'
import { Box, Radio, RadioGroup, FormControlLabel, FormControl, Grid, Button, Tooltip, TextField, CircularProgress } from '@material-ui/core';
import clsx from 'clsx';
import { makeStyles } from '@material-ui/core/styles';
import FiberManualRecordOutlinedIcon from '@material-ui/icons/FiberManualRecordOutlined';
import AddCircleOutlineOutlinedIcon from '@material-ui/icons/AddCircleOutlineOutlined';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import FormGroup from '@material-ui/core/FormGroup';
import Checkbox from '@material-ui/core/Checkbox';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import _ from 'lodash';
import * as R from 'ramda'
import DragIndicatorIcon from '@material-ui/icons/DragIndicator';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import Snackbar from '@material-ui/core/Snackbar';

import { Alert, getKeyValueMap } from 'Includes/functions';
import { postRequest, putRequest } from 'Includes/api/apicall';
import { PUT_URL, POST_URL } from 'Includes/urls'
import { maxFileSize } from 'Constants'
import { supported_images_types } from 'Containers/VideoTutorials/Constants';
import { TrainRounded } from '@material-ui/icons';


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

class QuestionType extends Component {

    constructor(props) {
        super(props)

        this.state = {
            questionType: '',
            radioValues: [],
            checkBoxValues: [],
            matchValues: [],
            matchShuffledValues: [],
            newEnteredValue: '',
            selectedRadio: '',
            defaultSelectedRadio: '',
            newEnteredSecondValue: '',
            isMobileScreen: false,
            selectedIndices: [],
            enableUploadIcons: true,
            imagePreview: '',
            largeImagePreview: '',
            openSnackbar: false,
            enableSecondUploadIcons: true,
            secondUploadedId: '',
            secondImagePreview: '',
            secondImageName: '',
            error: {}
        }
    }

    handleChange = (e) => {
        let { name, value } = e.target;
        let { error } = this.state;
        delete error[name]
        this.setState({
            [name]: value,
            error
        }, () => {
            this.updateValues()
        })
    }

    setDefault = () => {
        this.setState({
            newEnteredValue: '',
            newEnteredSecondValue: '',
            uploadedId: '',
            imagePreview: '',
            imageName: '',
            enableUploadIcons: true,
            enableSecondUploadIcons: true,
            secondUploadedId: '',
            secondImagePreview: '',
            secondImageName: ''
        })
    }

    handleAddRadio = () => {
        let { radioValues, newEnteredValue, uploadedId, imagePreview, openSnackbar, alertData, imageName } = this.state;
        if (newEnteredValue || imagePreview) {
            let duplicate_found_name = false
            let duplicate_found_image = false
            let count = 0
            radioValues.map((temp) => {
                if (temp.imagePreview) {
                    count++
                }
                if (newEnteredValue && temp.name.toLowerCase().trim() === newEnteredValue.toLowerCase().trim()) {
                    duplicate_found_name = true
                }
                else if (imagePreview && temp.imageName === imageName) {
                    duplicate_found_image = true
                }
            })
            if (!duplicate_found_name && !duplicate_found_image) {
                let newValue = newEnteredValue.trim()
                let autoLabel = false
                let uploadId = imagePreview ? uploadedId : ''
                if (imagePreview && !newEnteredValue) {
                    newValue = `Image ${count + 1}`
                    autoLabel = true
                }
                let temp = { name: newValue, uploadedId: uploadId, imagePreview: imagePreview, autoLabel: autoLabel, imageName: imageName, value: false }
                radioValues.push(temp)
                this.setDefault()
            }
            else {
                openSnackbar = true
                alertData = duplicate_found_name ? 'Entered Option Value is already present Please Enter New one' : 'Uploaded Image is already present Please upload New one'
            }
        }
        else {
            openSnackbar = true
            alertData = 'Please Enter Value'
        }
        this.setState({
            radioValues,
            openSnackbar,
            alertData,
        }, () => {
            this.updateValues()
        })
    }

    handleAddCheckBox = () => {
        let { checkBoxValues, newEnteredValue, uploadedId, imagePreview, openSnackbar, alertData, imageName } = this.state;
        if (newEnteredValue || imagePreview) {
            let duplicate_found_name = false
            let duplicate_found_image = false
            let count = 0
            checkBoxValues.map((temp) => {
                if (temp.imagePreview) {
                    count++
                }
                if (newEnteredValue && temp.name === newEnteredValue) {
                    duplicate_found_name = true
                }
                else if (imagePreview && temp.imageName === imageName) {
                    duplicate_found_image = true
                }
            })
            if (!duplicate_found_name && !duplicate_found_image) {
                let newValue = newEnteredValue
                let autoLabel = false
                let uploadId = imagePreview ? uploadedId : ''
                if (imagePreview && !newEnteredValue) {
                    newValue = `Image ${count + 1}`
                    autoLabel = true
                }
                let temp = { name: newValue, value: false, uploadedId: uploadId, imagePreview: imagePreview, autoLabel: autoLabel, imageName: imageName }
                checkBoxValues.push(temp)
                this.setDefault()
            }
            else {
                openSnackbar = true
                alertData = duplicate_found_name ? 'Entered Option Value is already present Please Enter New one' : 'Uploaded Image is already present Please upload New one'
            }
        }
        else {
            openSnackbar = true
            alertData = 'Please Enter Value'
        }
        this.setState({
            checkBoxValues,
            openSnackbar,
            alertData,
        }, () => {
            this.updateValues()
        })
    }

    handleAddMatch = () => {
        let { matchValues, newEnteredValue, newEnteredSecondValue, secondImagePreview, uploadedId, imagePreview, openSnackbar,
            alertData, imageName, secondImageName, secondUploadedId } = this.state;
        if ((newEnteredValue || imagePreview) && (newEnteredSecondValue || secondImagePreview)) {
            let duplicate_found_label_name = false
            let duplicate_found_label_image = false
            let duplicate_found_value_name = false
            let duplicate_found_value_image = false
            matchValues.map((temp) => {
                if (newEnteredValue && temp.label.label.toLowerCase().trim() === newEnteredValue.toLowerCase().trim()) {
                    duplicate_found_label_name = true
                }
                else if (imagePreview && temp.label.imageName === imageName) {
                    duplicate_found_label_image = true
                }
                if (newEnteredSecondValue && temp.value.value.toLowerCase().trim() === newEnteredSecondValue.toLowerCase().trim()) {
                    duplicate_found_value_name = true
                }
                else if (secondImageName && temp.value.secondImageName === secondImageName) {
                    duplicate_found_value_image = true
                }
            })
            if (!duplicate_found_label_name && !duplicate_found_label_image && !duplicate_found_value_name && !duplicate_found_value_image) {
                let newValue = newEnteredValue.trim()
                let newSecondValue = newEnteredSecondValue.trim()
                let uploadId = imagePreview ? uploadedId : ''
                let temp = {
                    label: {
                        label: newValue, uploadedId: uploadId, imagePreview: imagePreview, imageName: imageName,
                        key_value: parseInt(matchValues.length) + parseInt(matchValues.length)
                    },
                    value: {
                        value: newSecondValue, secondUploadedId: secondUploadedId, secondImagePreview: secondImagePreview,
                        secondImageName: secondImageName, key_value: parseInt(matchValues.length) + parseInt(matchValues.length) + 1
                    }
                }
                matchValues.push(temp)
                this.setDefault()
            }
            else if (duplicate_found_label_name || duplicate_found_label_image) {
                openSnackbar = true
                alertData = duplicate_found_label_name ? 'Entered Option Label is already present Please Enter New one' : 'Uploaded Image is already present Please upload New one'
            }
            else {
                openSnackbar = true
                alertData = duplicate_found_value_name ? 'Entered Option Value is already present Please Enter New one' : 'Uploaded Image is already present Please upload New one'
            }
        }
        else {
            openSnackbar = true
            alertData = 'Please Enter Value'
        }
        this.setState({
            matchValues,
            openSnackbar,
            alertData,
        }, () => {
            this.updateValues()
            this.shuffleMatchValues();
        })

    }

    shuffleMatchValues = () => {
        let { matchValues, matchShuffledValues } = this.state;
        if (matchValues.length > 1) {
            matchValues.map((temp, index) => {
                temp['label']['key'] = index
                temp['value']['key'] = index
            })
            let value = R.pluck('value', matchValues)
            let shuffledValue = _.shuffle(value)
            matchValues.map((temp, index) => {
                let deletedIndex = 0
                let value = shuffledValue[0]['key'];
                if (shuffledValue.length === 2 && (temp['value']['key'] === shuffledValue[0]['key'] || matchValues[index + 1]['value']['key'] === shuffledValue[1]['key'])) {
                    value = shuffledValue[1]
                    deletedIndex = 1
                }
                else {
                    value = temp['value']['key'] === shuffledValue[0]['key'] ? shuffledValue[1] : shuffledValue[0]
                    deletedIndex = temp['value']['key'] === shuffledValue[0]['key'] ? 1 : 0
                }
                matchShuffledValues[index] = { label: temp.label, value: value }
                shuffledValue.splice(deletedIndex, 1)
            })
        }
        else {
            matchShuffledValues = []
        }
        this.setState({
            matchShuffledValues,
            matchValues
        })

    }


    handleRadioChange = (e, value) => {
        let { radioValues } = this.state;
        radioValues.map((data) => {
            data.value = false
            if (value === data.name) {
                data.value = true
            }
        })
        this.setState({
            selectedRadio: value,
            radioValues
        }, () => {
            this.updateValues()
        })
    }

    handleCheckBoxChange = (index) => {
        let { checkBoxValues } = this.state;
        checkBoxValues.map((temp, tempIndex) => {
            if (tempIndex === index) {
                temp.value = !temp.value
            }
        })
        this.setState({
            checkBoxValues
        })
    }


    deleteRadioValue = (index) => {
        let { radioValues } = this.state;
        radioValues.splice(index, 1)
        let count = 0
        radioValues.map((temp) => {
            if (temp.imagePreview) {
                count++
                if (temp.autoLabel)
                    temp.name = `Image ${count}`
            }
        })
        this.setState({
            radioValues
        })
    }

    deleteCheckBoxValue = (index) => {
        let { checkBoxValues } = this.state;
        checkBoxValues.splice(index, 1)
        this.setState({
            checkBoxValues
        })
    }

    deleteMatchValue = (index) => {
        let { matchValues, matchShuffledValues } = this.state;
        matchValues.splice(index, 1)
        matchShuffledValues.splice(index, 1)
        this.setState({
            matchValues,
            matchShuffledValues
        })
        this.shuffleMatchValues()
    }
    // const error = [gilad, jason, antoine].filter((v) => v).length !== 2;

    handleDragStart = (event, index) => {
        let fromBox = JSON.stringify({ index: index });
        event.dataTransfer.setData("dragContent", fromBox);
        this.setState({ isDragging: true })
    };

    handleDragOver = event => {
        event.preventDefault(); // Necessary. Allows us to drop.
        return false;
    };

    handleDrop = (event, index) => {
        event.preventDefault();
        let fromBox = JSON.parse(event.dataTransfer.getData("dragContent"));
        this.swapBColumns(fromBox.index, index);
        return false;
    };

    onselectSectionB = (index) => {
        let { isMobileScreen, selectedIndices } = this.state;
        if (isMobileScreen && selectedIndices.includes(index)) {
            const ind = selectedIndices.indexOf(index)
            selectedIndices.splice(ind, 1)

            this.setState({ selectedIndices });
        }
        else if (isMobileScreen && selectedIndices.length < 2) {
            selectedIndices.push(index);
            this.setState({ selectedIndices });
        }
        else if (isMobileScreen && selectedIndices.length === 2) {
            selectedIndices[1] = index;
            this.setState({ selectedIndices });
        }
    }

    swapBColumns = (from_index, to_index) => {
        let matchShuffledValues = [...this.state.matchShuffledValues];
        let temp = matchShuffledValues[from_index]['value'];
        matchShuffledValues[from_index]['value'] = matchShuffledValues[to_index]['value']
        matchShuffledValues[to_index]['value'] = temp
        this.setState({ matchShuffledValues, selectedIndices: [], isDragging: false });
    }

    handleImageChange = (event, acceptFileType, isSecondImage) => {
        let { imagePreview, uploadedId, secondUploadedId, secondImagePreview, enableSecondUploadIcons, enableUploadIcons,
            imageName, secondImageName } = this.state
        let fileName = event.target.files[0]['name']
        let file_extension = `${fileName.slice((Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1)}`;
        let is_supported_image_type = true
        is_supported_image_type = supported_images_types.image_type.includes(file_extension.toLowerCase())
        if (event.target.files[0] && is_supported_image_type) {
            if (event.target.files[0].size < maxFileSize[acceptFileType].size) {
                let post = new FormData();
                post.append('file', event.target.files[0])
                let request = postRequest
                let url = POST_URL.uploads.api
                if (isSecondImage === 'second') {
                    if (secondUploadedId) {
                        url = PUT_URL.uploads.api + secondUploadedId + '/'
                        request = putRequest
                    }
                    this.setState({ secondImageUploading: true })
                }
                else {
                    this.setState({ imageUploading: true })
                }
                if (uploadedId && isSecondImage === 'second') {
                    url = PUT_URL.uploads.api + uploadedId + '/'
                    request = putRequest
                }

                request(url, post, this.props).then(response => {
                    if (response && response.status === 200) {
                        if (isSecondImage === 'second') {
                            secondUploadedId = response.data.data.id
                            secondImagePreview = response.data.data.file
                            enableSecondUploadIcons = false
                            secondImageName = fileName
                        }
                        else {
                            uploadedId = response.data.data.id
                            imagePreview = response.data.data.file
                            enableUploadIcons = false
                            imageName = fileName
                        }
                        this.setState({
                            imagePreview,
                            uploadedId,
                            enableUploadIcons,
                            enableSecondUploadIcons,
                            imageName,
                            secondImageName,
                            secondUploadedId,
                            secondImagePreview
                        })
                    }
                    if (isSecondImage) {
                        this.setState({
                            secondImageUploading: false
                        })
                    }
                    else {
                        this.setState({
                            imageUploading: false
                        })
                    }
                })

            }
            else {
                this.setState({
                    openSnackbar: true,
                    alertData: maxFileSize.errorText
                })
            }
        }
        else if (!is_supported_image_type) {
            this.setState({
                alertData: supported_images_types.error,
                openSnackbar: true,
            })
        }

    }

    handleInputField = (questionType) => {
        let { newEnteredValue, newEnteredSecondValue, enableUploadIcons, imagePreview, secondImagePreview, imageUploading, secondImageUploading,
            enableSecondUploadIcons, error } = this.state;
        const { qindex } = this.props;
        let icon = ''
        let addItem = ''
        let placeholderValue = 'Add Option'
        let matchValue = false
        let imageInOption = true

        if (questionType === 'checkBox') {
            icon = <CheckBoxOutlineBlankIcon className='align-self-center' />
            addItem = this.handleAddCheckBox
        }
        else if (questionType === 'radio') {
            icon = <FiberManualRecordOutlinedIcon className='align-self-center' />
            addItem = this.handleAddRadio
        }
        else if (questionType === 'oneWord') {
            placeholderValue = 'Enter one word answer'
            imageInOption = false
        }
        else if (questionType === 'matchValue') {
            matchValue = true
            addItem = this.handleAddMatch
            placeholderValue = 'Add Label'

        }
        return (
            <Box className='display-flex margin-top-10'>
                {icon && icon}
                <TextField
                    autoComplete='off'
                    id='withinTime'
                    label={placeholderValue}
                    name='newEnteredValue'
                    value={newEnteredValue}
                    className='width-250-px'
                    variant="outlined"
                    multiline={true}
                    inputProps={{ maxLength: 250 }}
                    fullWidth
                    onChange={(e) => this.handleChange(e)}
                    error={error['newEnteredValue'] && (error['newEnteredValue'])}
                    helperText={error['newEnteredValue'] && (error['newEnteredValue'])}
                />
                {enableUploadIcons && imagePreview === '' && imageInOption && !imageUploading &&
                    <Tooltip title='Upload Image' placement='top-start'>
                        <label htmlFor={`${qindex}-upload-pic-options`} className='align-self-center'>
                            <Button variant="raised" component='span' className='set-question-upload-image-button '>
                                <Box className='upload-icon'><i class="fa fa-upload" aria-hidden="true"></i></Box>
                            </Button>
                        </label>
                    </Tooltip>
                }
                <input type='file' id={`${qindex}-upload-pic-options`} className='display-none' onChange={(e) => this.handleImageChange(e, 'img')}
                    onClick={e => (e.target.value = null)} />
                {imagePreview && !imageUploading &&
                    <Box className='set-question-image-preview-outer-box'>
                        <Tooltip title='Preview Image' placement='top-start'>
                            <img src={imagePreview} alt='image' className='set-question-uploaded-image' />
                        </Tooltip>
                        <Box onClick={() => this.handleLargePreview(imagePreview)} className='set-question-image-preview-icon'><VisibilityOutlinedIcon /> </Box>
                        <Box className='set-question-delete-image-input'
                            onClick={() => this.deleteUploadedImage()}>
                            <HighlightOffIcon />
                        </Box>
                    </Box>
                }
                {imageUploading &&
                    <Box><CircularProgress className='set-question-upload-image-loading' /> </Box>
                }
                {matchValue &&
                    <TextField
                        autoComplete='off'
                        id='withinTime'
                        label={placeholderValue}
                        name='newEnteredSecondValue'
                        value={newEnteredSecondValue}
                        className='width-250-px'
                        variant="outlined"
                        inputProps={{ maxLength: 25 }}
                        fullWidth
                        onChange={(e) => this.handleChange(e)}
                        error={error['newEnteredSecondValue'] && (error['newEnteredSecondValue'])}
                        helperText={error['newEnteredSecondValue'] && (error['newEnteredSecondValue'])}
                    />
                }
                {enableSecondUploadIcons && secondImagePreview === '' && imageInOption && matchValue && !secondImageUploading &&
                    <Tooltip title='Upload Value Image' placement='top-start'>
                        <label htmlFor='upload-pic-second' className='align-self-center'>
                            <Button variant="raised" component='span' className='set-question-upload-image-button  '>
                                <Box className='upload-icon'><i class="fa fa-upload" aria-hidden="true"></i></Box>
                            </Button>
                        </label>
                    </Tooltip>
                }
                <input type='file' id='upload-pic-second' className='display-none align-self-center' onChange={(e) => this.handleImageChange(e, 'img', 'second')}
                    onClick={e => (e.target.value = null)} />
                {secondImagePreview && !secondImageUploading &&
                    <Box className='set-question-image-preview-outer-box'>
                        <Tooltip title='Preview Image' placement='top-start'>
                            <img src={secondImagePreview} alt='image' className='set-question-uploaded-image' />
                        </Tooltip>
                        <Box onClick={() => this.handleLargePreview(secondImagePreview)} className='set-question-image-preview-icon'><VisibilityOutlinedIcon /> </Box>
                        <Box className='set-question-delete-image-input'
                            onClick={() => this.deleteUploadedImage(true)}>
                            <HighlightOffIcon />
                        </Box>
                    </Box>
                }
                {secondImageUploading &&
                    <Box><CircularProgress className='set-question-upload-image-loading' /> </Box>
                }
                {addItem && !imageUploading &&
                    <Tooltip title={placeholderValue} placement='top-start'>
                        <AddCircleOutlineOutlinedIcon
                            onClick={addItem}
                            className='set-question-add-icon' />
                    </Tooltip>
                }
            </Box>
        )
    }

    deleteUploadedImage = (isSecondImage) => {
        if (!isSecondImage) {
            this.setState({
                imagePreview: '',
                imageName: '',
                enableUploadIcons: true
            })
        }
        else {
            this.setState({
                secondImagePreview: '',
                secondImageName: '',
                enableSecondUploadIcons: true
            })
        }
    }

    handleLargePreview = (image) => {
        this.setState({
            largeImagePreview: image
        })
    }

    handleCloseSnackBar = () => {
        this.setState({
            openSnackbar: false
        })
    }

    handleCloseLargeImage = () => {
        this.setState({
            largeImagePreview: ''
        })
    }

    handleImagePreview = (imagePreview) => {
        return (
            <Tooltip title='Preview Image' placement='top-start'>
                <Box className='set-question-image-preview-outer-box'>
                    <img src={imagePreview} alt='image' className='set-question-uploaded-image' />
                    <Box onClick={() => this.handleLargePreview(imagePreview)} className='set-question-image-preview-icon'><VisibilityOutlinedIcon /> </Box>
                </Box>
            </Tooltip>
        )
    }

    updateValues = () => {
        const { questionType, index } = this.props;
        const { radioValues, selectedRadio, checkBoxValues, newEnteredValue, matchValues, matchShuffledValues } = this.state;;
        let returnValue
        if (questionType === 1) {
            returnValue = { options: [] }
            returnValue['options'] = radioValues
            returnValue['selectedRadio'] = selectedRadio
        }
        else if (questionType === 2) {
            returnValue = checkBoxValues
        }
        else if (questionType === 3) {
            returnValue = newEnteredValue
        }
        else if (questionType === 4) {
            returnValue = {}
            returnValue['correctOptions'] = matchValues
            returnValue['shuffledOptions'] = matchShuffledValues
        }
        this.props.updateValues(returnValue, index)
    }

    updateStateValues = (data) => {
        let { radioValues, selectedRadio, checkBoxValues, newEnteredValue, matchValues, matchShuffledValues } = this.state;;
        this.setState({
            radioValues: [],
            checkBoxValues: [],
            newEnteredValue: '',
            matchValues: [],
            matchShuffledValues: [],
            selectedRadio: '',
        }, () => {
            if (data.questionType === 1) {
                radioValues = data.options
                selectedRadio = data.selectedRadio
            }
            else if (data.questionType === 2) {
                checkBoxValues = data.options
            }
            else if (data.questionType === 3) {
                newEnteredValue = data.options
            }
            else if (data.questionType === 4) {
                matchValues = data.correctOptions
                matchShuffledValues = data.shuffledOptions
            }
            this.setState({
                radioValues,
                checkBoxValues,
                newEnteredValue,
                matchValues,
                matchShuffledValues,
                selectedRadio
            })
        })
    }

    updateErrorDetails = () => {
        let { error } = this.state;
        error.newEnteredValue = 'Enter Answer'
        this.setState({
            error
        }, () => {
            this.handleInputField('oneWord')
        })
    }

    updateChoices = (details) => {
        let { radioValues, selectedRadio, checkBoxValues, newEnteredValue, matchValues, matchShuffledValues } = this.state;
        let temp = {}
        if (details.question_type === 1) {
            details.choice_question.map((data) => {
                temp = {}
                temp['name'] = data['data']
                temp['id'] = data['id']
                temp['uploadedId'] = data['document'] ? data['document']['id'] : ''
                temp['imagePreview'] = data['document'] ? data['document']['file'] : ''
                temp['imageName'] = data['document'] ? data['document']['file_name'] : ''
                if (data['is_answer']) {
                    selectedRadio = data['data']
                }
                radioValues.push(temp)
            })
        }
        else if (details.question_type === 2) {
            details.choice_question.map((data) => {
                temp = {}
                temp['name'] = data['data']
                temp['value'] = data['is_answer']
                temp['id'] = data['id']
                temp['uploadedId'] = data['document'] ? data['document']['id'] : ''
                temp['imagePreview'] = data['document'] ? data['document']['file'] : ''
                temp['imageName'] = data['document'] ? data['document']['file_name'] : ''
                checkBoxValues.push(temp)
            })
        }
        else if (details.question_type === 3) {
            newEnteredValue = details.choice_question[0]['data']
        }
        else if (details.question_type === 4) {
            matchValues = []
            let temp = { label: {}, value: {} }
            let shuffled_temp = { label: {}, value: {} }
            details.choice_question.map((field, index) => {
                if (field.is_answer) {
                    temp['label'] = {}
                    temp['value'] = {}
                    temp['label']['id'] = field.id
                    temp['label']['label'] = field.data
                    temp['label']['uploadedId'] = field['document'] ? field['document']['id'] : ''
                    temp['label']['imagePreview'] = field['document'] ? field['document']['file'] : ''
                    temp['label']['imageName'] = field['document'] ? field['document']['file_name'] : ''
                    temp['label']['key_value'] = index
                    shuffled_temp['label'] = { ...temp['label'] }
                    shuffled_temp['value'] = {}
                    temp['value'] = {}
                    temp['value']['id'] = details.choice_question[field['correct_match_index']].id
                    temp['value']['value'] = details.choice_question[field['correct_match_index']].data
                    temp['value']['uploadedId'] = details.choice_question[field['correct_match_index']].document
                    temp['value']['imagePreview'] = details.choice_question[field['correct_match_index']].document
                    temp['value']['imageName'] = details.choice_question[field['correct_match_index']].document
                    temp['value']['key_value'] = field['correct_match_index']
                    shuffled_temp['value']['value'] = details.choice_question[field['shuffled_match_index']].data
                    shuffled_temp['value']['uploadedId'] = details.choice_question[field['shuffled_match_index']].document
                    shuffled_temp['value']['imagePreview'] = details.choice_question[field['shuffled_match_index']].document
                    shuffled_temp['value']['imageName'] = details.choice_question[field['shuffled_match_index']].document
                    shuffled_temp['value']['key_value'] = field['shuffled_match_index']
                }
                if (Object.keys(temp['label']).length !== 0 && Object.keys(temp['value']).length !== 0) {
                    matchValues.push(temp)
                    matchShuffledValues.push(shuffled_temp)
                    temp = { label: {}, value: {} }
                    shuffled_temp = { label: {}, value: {} }
                }
            })
        }
        this.setState({
            radioValues,
            selectedRadio,
            checkBoxValues,
            newEnteredValue,
            matchValues,
            matchShuffledValues,
        }, () => {
            this.updateValues()
        })
    }

    render() {
        const { questionType } = this.props;
        let { radioValues, selectedRadio, checkBoxValues, matchValues, alertData, matchShuffledValues,
            openSnackbar, enableUploadIcons, largeImagePreview } = this.state;
        return (
            <div>
                {largeImagePreview &&
                    <Box className='set-question-large-image-preview-box'>
                        <img src={largeImagePreview} alt='Image Preview' className='set-question-large-image-preview' />
                        <Tooltip title='Close Image' placement='top-start'>
                            <Box className='set-question-large-image-remove-icon-box'
                                onClick={this.handleCloseLargeImage}>
                                <HighlightOffIcon className='set-question-large-image-remove-icon' />
                            </Box>
                        </Tooltip>
                    </Box>
                }
                {questionType === 1 &&
                    <Box>
                        <FormControl component="fieldset">
                            <RadioGroup value={selectedRadio}
                                onChange={this.handleRadioChange} name="selectedRadio" aria-label='selectedRadio'>
                                {radioValues.map((temp, index) => {
                                    return (
                                        <Box className='radio-options-outer-box' key={index}>
                                            <Box className='radio-options-box'>
                                                <FormControlLabel value={temp.name} control={<StyledRadio />} label={temp.name} />
                                                {temp.imagePreview &&
                                                    <Box>{this.handleImagePreview(temp.imagePreview)}</Box>
                                                }
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
                    </Box>
                }
                {questionType === 2 &&
                    <Box className='margin-top-20'>
                        <FormControl component="fieldset" >
                            <FormGroup>
                                {checkBoxValues.map((temp, index) => {
                                    return (
                                        <Box className='radio-options-outer-box' onChange={() => this.handleCheckBoxChange(index)}>
                                            <Box className='radio-options-box'>
                                                <FormControlLabel
                                                    control={<Checkbox checked={temp.value} name={temp.name} color='primary' />}
                                                    label={temp.name}
                                                />
                                                {temp.imagePreview &&
                                                    <Box>{this.handleImagePreview(temp.imagePreview)}</Box>
                                                }
                                            </Box>
                                            <Box className='delete-set-radio-options'
                                                onClick={() => this.deleteCheckBoxValue(index)}>
                                                <HighlightOffIcon />
                                            </Box>
                                        </Box>
                                    )
                                })
                                }
                                {this.handleInputField('checkBox')}

                            </FormGroup>
                        </FormControl>
                    </Box>
                }
                {questionType === 3 &&
                    <Box>
                        {this.handleInputField('oneWord')}
                    </Box>
                }
                {questionType === 4 &&
                    <Box>
                        <Grid container>
                            <Grid item md={6}>
                                <Box>Correct Answers</Box>
                                {matchValues.map((temp, index) => {
                                    return (
                                        <Box className='match-values-outer-box'>
                                            <Box className='match-values-box-90'>
                                                <Box className='match-value-index'>
                                                    {index + 1}.
                                                </Box>
                                                <Box className='match-values-box'>
                                                    <Box className='match-value-border'>
                                                        {temp.label.label}
                                                        {temp.label.imagePreview &&
                                                            <Box>{this.handleImagePreview(temp.label.imagePreview)}</Box>
                                                        }
                                                    </Box>
                                                    <Box className='match-value-border'>
                                                        {temp.value.secondImagePreview &&
                                                            <Box>{this.handleImagePreview(temp.value.secondImagePreview)}</Box>
                                                        }
                                                        {temp.value.value}
                                                    </Box>
                                                </Box>
                                            </Box>
                                            <Box className='delete-set-radio-options'
                                                onClick={() => this.deleteMatchValue(index)}>
                                                <HighlightOffIcon />
                                            </Box>
                                        </Box>
                                    )
                                })
                                }
                            </Grid>
                            <Grid item md={6}>
                                <Box>Shuffled Answers</Box>
                                {matchShuffledValues.map((temp, index) => {
                                    return (
                                        <Box className='match-values-outer-box'>
                                            <Box className='match-values-box-90'>
                                                <Box className='match-value-index'>
                                                    {index + 1}.
                                                </Box>
                                                <Box className='match-values-box'>
                                                    <Box className='match-value-border'>
                                                        {temp.label.label}
                                                        {temp.label.imagePreview &&
                                                            <Box>{this.handleImagePreview(temp.label.imagePreview)}</Box>
                                                        }
                                                    </Box>
                                                    <Box className='match-value-border cursor-grabbing'
                                                        draggable="true"
                                                        onDragStart={(e) => this.handleDragStart(e, index)}
                                                        onDragOver={(e) => this.handleDragOver(e, index)}
                                                        onDrop={(e) => this.handleDrop(e, index)}
                                                        onClick={() => this.onselectSectionB(index)}
                                                    >
                                                        <Box><DragIndicatorIcon /></Box>
                                                        {temp.value.value}
                                                        {temp.value.secondImagePreview &&
                                                            <Box>{this.handleImagePreview(temp.value.secondImagePreview)}</Box>
                                                        }
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Box>
                                    )
                                })
                                }
                            </Grid>
                        </Grid>
                        {this.handleInputField('matchValue')}
                    </Box>
                }
                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openSnackbar} autoHideDuration='4000' onClose={(e) => this.handleCloseSnackBar(e)}>
                    <Alert onClose={(e) => this.handleCloseSnackBar(e)} severity='error'>
                        {alertData}
                    </Alert>
                </Snackbar>
            </div>
        )
    }
}

export default QuestionType

