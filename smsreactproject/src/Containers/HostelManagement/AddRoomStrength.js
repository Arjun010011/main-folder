import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import { Paper, Box, Grid, Button, TextareaAutosize, TextField, FormControl, FormHelperText, CircularProgress, Tooltip } from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import MultiSelect from "react-multi-select-component";
import Snackbar from '@material-ui/core/Snackbar';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';

import { supported_images_types } from 'Containers/VideoTutorials/Constants';
import loadingBar from 'images/loading.gif'
import { maxFileSize } from 'Constants'
import { supported_receipts, image_formats } from 'Containers/Expenses/Constants';
import { Dropdown } from 'Components/DropDown';
import { Divider } from '@material-ui/core';
import { gstinNumberRegex, amountRegexWithDecimals, numberRegex } from 'Constants/regularExpression'
import { getRequest, putRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, POST_URL } from 'Includes/urls'
import { getUrlParam, getKeyValueMap, dateFormat, validateDate, Alert, isUserHasPermission, NumberFormatCustom } from 'Includes/functions';
import './styles.scss';
import { Actions } from 'Constants/permissions';
import MultipleSelectDropdown from "Components/MultipleSelectDropdown";


class AddRoomStrength extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            room_details: { receipt_preview: '', selectedExpenses: null, receipt: '', description: '' },
            fieldErrors: {},
            expensesTypeList: [],
            helperText: {},
            imagesPreview: [],
            selectedAssetDropdown: [],
            imageUploading: false,
            assetList: [],
            loading: true,
            maximumAmount: '',
            enableUploadIcons: true,
            isEnable: {},
            upload_name: 'Upload Receipt',
            openError: false,
            alertData: 'Please clear the errors',
            expenseDetails: {},
            isEdit: false,
            submitDisable: false,
            pageLoading: false,
            isBlankPage: true,
            floors: [],
            largeImagePreview: '',
            imageUploading: false,
            imagesPreview: [],
            deletable_document_list: [],
            deletable_asset_list: [],
            selectedBuilding: '',
            selectedFloor: ''
        }
    }


    componentDidMount = () => {
        if (this.props.location.pathname === Actions.room_strength.update.url) {
            if (this.props.location.state && this.props.location.state.detail) {
                let id = this.props.location.state.detail
                this.getRoomStrengthDetail(id);
            }
            else {
                this.props.history.push(Actions.room_strength.view.url);
            }
        }
        else {
            let { selectedBuilding, selectedFloor, buildingName, floorName } = getUrlParam();
            this.setState({
                selectedBuilding,
                selectedFloor,
                buildingName,
                floorName
            })
            this.getAssetList()
        }
    }

    getAssetList = (id) => {
        const { isEdit } = this.state;
        const url = GET_URL.asset.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                let assetList = []
                let temp = {}
                response.data.data.map((data) => {
                    temp = {}
                    temp['asset'] = data.id
                    temp['name'] = data.name
                    assetList.push(temp)
                })
                this.setState({
                    assetList
                }, () => {
                    if (!isEdit) {
                        this.setState({
                            loading: false
                        })
                    }
                    else {
                        this.updateAllDetails(id)
                    }
                })

            }
        })
    }


    getRoomStrengthDetail = (id) => {
        const url = GET_URL.room.api + id + '/'
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    room_strength_details: response.data.data,
                    isEdit: true,
                }, () => {
                    this.getAssetList(id)
                })
            }
        })
    }

    updateAllDetails = (id) => {
        let { room_strength_details, room_details, imagesPreview, assetList, selectedBuilding, selectedFloor, buildingName, floorName } = this.state;
        let selectedAssetDropdownTemp = []
        let tem_asset_list = [...assetList]
        room_details['id'] = id
        room_details['name'] = room_strength_details.name
        selectedBuilding = room_strength_details.building
        selectedFloor = room_strength_details.floor
        room_details['strength'] = room_strength_details.strength
        room_details['description'] = room_strength_details.description
        room_details['floor'] = room_strength_details.floor
        imagesPreview = room_strength_details.roomdocument_room
        buildingName = room_strength_details.building_name
        floorName = room_strength_details.floor_name
        let temp = {}
        let found = false
        room_strength_details.roomassetmapping_room.map((parent, pIndex) => {
            temp = {}
            found = false
            tem_asset_list.map((data) => {
                if (parent.asset == data.asset) {
                    found = true
                    temp = data
                }
            })
            if (found) {
                temp['number_of_assets'] = parent.number_of_assets
                temp['id'] = parent.id
                selectedAssetDropdownTemp.push(temp)
            }
        })
        this.setState({
            room_details,
            selectedAssetDropdown: [...selectedAssetDropdownTemp],
            imagesPreview,
            loading: false,
            selectedFloor,
            selectedBuilding,
            buildingName,
            floorName
        })
    }

    handleSearchChange = (e) => {
        let { room_details, fieldErrors } = this.state;
        let { name, value } = e.target;
        room_details[name] = value
        if (name === 'strength' && !numberRegex.value.test(value) && value) {
            fieldErrors[name] = numberRegex.errorText
            this.setState({
                fieldErrors,
                room_details
            })
            return
        }
        delete fieldErrors[name]
        this.setState({
            room_details,
            fieldErrors,
        })
    }


    handleChangeFloor = (e, index) => {
        let { fieldErrors, selectedAssetDropdown } = this.state;
        let { name, value } = e.target;
        selectedAssetDropdown[index][name] = value
        if (name === 'number_of_assets' && !numberRegex.value.test(value) && value) {
            fieldErrors[`${name}${index}`] = numberRegex.errorText
            this.setState({
                fieldErrors,
                selectedAssetDropdown
            })
            return
        }
        delete fieldErrors[`${name}${index}`]
        this.setState({
            fieldErrors,
            selectedAssetDropdown
        })
    }

    validation = () => {
        let { openError, room_details, selectedAssetDropdown, fieldErrors, selectedFloor, isEdit, imagesPreview, deletable_asset_list, deletable_document_list } = this.state;
        let returnValue = true
        let asset_list = []
        fieldErrors = {}
        if (!room_details.name) {
            fieldErrors['name'] = 'Enter name'
        }
        if (!room_details.strength) {
            fieldErrors['strength'] = 'Enter strength'
        }
        if (selectedAssetDropdown.length > 0) {
            let temp = {}
            selectedAssetDropdown.map((data, index) => {
                temp = {}
                if (!data.number_of_assets || parseInt(data.number_of_assets) <= 0) {
                    fieldErrors[`number_of_assets${index}`] = 'Enter no of assets'
                    openError = true
                }
                temp['asset'] = data.asset
                temp['number_of_assets'] = data.number_of_assets
                if (data.id) {
                    temp['id'] = data.id
                }
                asset_list.push(temp)
            })
        }
        if (Object.keys(fieldErrors).length > 0 || openError) {
            returnValue = false
            openError = true
        }
        if (returnValue) {
            returnValue = { rooms: [] }
            let temp = {}
            if (isEdit) {
                temp['id'] = room_details.id
                selectedFloor = room_details['floor']
                temp['deletable_asset_list'] = this.gedeletable_asset_list()
                temp['deletable_document_list'] = deletable_document_list
            }
            temp['name'] = room_details.name
            temp['strength'] = room_details.strength
            temp['description'] = room_details.description
            temp['floor'] = selectedFloor
            temp['asset_list'] = asset_list
            temp['document_list'] = imagesPreview
            returnValue.rooms.push(temp)
        }
        this.setState({
            fieldErrors,
            openError
        })

        return returnValue
    }

    gedeletable_asset_list = () => {
        let { selectedAssetDropdown, room_strength_details, deletable_asset_list } = this.state;
        let found = false
        let return_value = []
        room_strength_details.roomassetmapping_room.map((parent) => {
            found = false
            selectedAssetDropdown.map((child) => {
                if (parent.id == child.id) {
                    found = true
                }
            })
            if (!found) {
                deletable_asset_list.push(parent.id)
            }
        })
        this.setState({
            deletable_asset_list
        })
        return_value = deletable_asset_list
        return return_value
    }

    submit = () => {
        let validate_post_data = this.validation();
        if (validate_post_data) {
            this.setState({ submitDisable: true })
            let url = POST_URL.room.api
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
                        this.gotoViewRoomStrength()
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

    onchangeSubject = (e) => {
        const { assetList } = this.state;
        let tempList = [...e]
        let selected_temp = []
        let selected_temp_object = {}
        assetList.map((data) => {
            tempList.map((temp_data) => {
                if (data.asset === temp_data.asset) {
                    selected_temp_object = {}
                    selected_temp_object['asset'] = data.asset
                    selected_temp_object['name'] = data.name
                    selected_temp_object['id'] = data.id
                    selected_temp_object['number_of_assets'] = data.number_of_assets ? data.number_of_assets : ''
                    selected_temp.push(selected_temp_object)
                }
            })
        })

        this.setState({
            selectedAssetDropdown: [...selected_temp],
            updatingDropDown: false,
            fieldErrors: {}
        })
    }

    handleImageChange = (event, acceptFileType) => {
        let { imagesPreview } = this.state
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
                this.setState({ imageUploading: true })
                request(url, post, this.props).then(response => {
                    if (response && response.status === 200) {
                        let uploadedId = response.data.data.id
                        let imagePreview = response.data.data.file
                        let temp = { document: uploadedId, description: imagePreview }
                        imagesPreview.push(temp)
                        this.setState({
                            imagesPreview
                        })
                    }
                    this.setState({
                        imageUploading: false
                    })
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

    handleLargePreview = (image) => {
        this.setState({
            largeImagePreview: image
        })
    }

    handleCloseLargeImage = () => {
        this.setState({
            largeImagePreview: ''
        })
    }

    deleteUploadedImage = (index) => {
        let { imagesPreview, deletable_document_list } = this.state;
        if (imagesPreview[index]['id']) {
            deletable_document_list.push(imagesPreview[index]['id'])
        }
        imagesPreview.splice(index, 1)
        this.setState({
            imagesPreview,
            deletable_document_list
        })
    }

    gotoViewRoomStrength = () => {
        let { selectedBuilding, selectedFloor } = this.state
        let yearInformation = {
            selectedBuilding: selectedBuilding,
            selectedFloor: selectedFloor,
        }
        let searchParam = "?" + new URLSearchParams(yearInformation).toString()
        this.props.history.push({
            pathname: Actions.room_strength.view.url,
            search: searchParam,
        });
    }

    render() {
        const { buildingName, loading, fieldErrors, largeImagePreview, imageUploading, imagesPreview,
            assetList, selectedAssetDropdown, floorName, openError, alertData, submitDisable, room_details } = this.state
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
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={8} xs={12} className='header-align'>
                                <Box className='heading'>
                                    Assign Room Strength
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('hostel', 'view') &&
                                        <Button
                                            variant="contained"
                                            component={Link} onClick={() => this.gotoViewRoomStrength()}
                                            className='editbutton-view'
                                        ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.room_strength.view.label}</Button>
                                    }
                                </Box>

                            </Grid>
                        </Grid>
                        <Box className="year-std-box mr-40">
                            <Box className="academic-std-head "> Building and Floor Name</Box>
                            <Box className=" aca-std-white-background">{buildingName}</Box>
                            <Box className=" aca-std-white-background">:</Box>
                            <Box className=" aca-std-white-background">{floorName}</Box>
                        </Box>
                        <Box>
                            <Grid container spacing={1}>
                                <Grid item md={8} xs={12}>
                                    <Paper className='paper-plain-background header-align'>
                                        <Grid container spacing={2}>
                                            <Grid item md={6} xs={12}>
                                                <TextField
                                                    label='Room Name'
                                                    required={true}
                                                    name='name'
                                                    type='text'
                                                    value={room_details.name}
                                                    className='width-100'
                                                    inputProps={{ maxLength: '50', autoComplete: 'new-password' }}
                                                    fullWidth={true}
                                                    variant="outlined"
                                                    helperText={fieldErrors['name'] ? fieldErrors['name'] : ''}
                                                    error={fieldErrors['name']}
                                                    onChange={(e) => this.handleSearchChange(e)}
                                                />
                                            </Grid>
                                            <Grid item md={6} xs={12}>
                                                <TextField
                                                    label='Room Strength'
                                                    required={true}
                                                    name='strength'
                                                    type='text'
                                                    value={room_details.strength}
                                                    className='width-100'
                                                    inputProps={{ maxLength: '2', autoComplete: 'new-password' }}
                                                    fullWidth={true}
                                                    variant="outlined"
                                                    helperText={fieldErrors['strength'] ? fieldErrors['strength'] : ''}
                                                    error={fieldErrors['strength']}
                                                    onChange={(e) => this.handleSearchChange(e)}
                                                />
                                            </Grid>
                                        </Grid>
                                        <Grid container>
                                            <Grid item md={12}>
                                                <FormControl
                                                    fullWidth
                                                    error={fieldErrors.description && (fieldErrors.description ? true : false)}
                                                >
                                                    <Box className='create-hostel-building-address-label header-align'>Description</Box>
                                                    <TextareaAutosize aria-label="minimum height"
                                                        className='create-expenses-comment-auto-size'
                                                        value={room_details.description}
                                                        name='description'
                                                        onChange={(e) => this.handleSearchChange(e)}
                                                        required
                                                    />
                                                    {fieldErrors.description &&
                                                        <FormHelperText>{fieldErrors.description}</FormHelperText>
                                                    }
                                                </FormControl>
                                            </Grid>
                                            <Grid item md={12}>
                                                <Box className='set-question-uploaded-images-outer-box header-align p-b-20px'>
                                                    <label htmlFor='upload-pic' className={imageUploading ? 'upload-icon-uploading' : ''}>
                                                        <Button variant="raised" component='span' disabled={imageUploading} className='set-question-upload-images-button'>
                                                            Upload Images<Box className='upload-icon'><i class="fa fa-upload" aria-hidden="true"></i></Box>
                                                        </Button>
                                                        <Box className={imageUploading ? 'image-uploading-circular-icon' : 'display-none'}><CircularProgress className='set-question-upload-image-loading' /> </Box>
                                                    </label>
                                                    <input disabled={imageUploading} type='file' id='upload-pic' className='display-none' onChange={(e) => this.handleImageChange(e, 'img')}
                                                        onClick={e => (e.target.value = null)} />
                                                    <Box className='set-question-image-list-box'>
                                                        {imagesPreview.map((temp, index) => {
                                                            return (
                                                                <Box className='set-question-image-preview-outer-box'>
                                                                    <Tooltip title='Preview Image' placement='top-start'>
                                                                        <img src={temp.description} alt='image' className='set-question-uploaded-image' />
                                                                    </Tooltip>
                                                                    <Box onClick={() => this.handleLargePreview(temp.description)} className='set-question-image-preview-icon'><VisibilityOutlinedIcon /> </Box>
                                                                    <Box className='set-question-delete-image-input'
                                                                        onClick={() => this.deleteUploadedImage(index)}>
                                                                        <HighlightOffIcon />
                                                                    </Box>
                                                                </Box>
                                                            )
                                                        })
                                                        }
                                                    </Box>
                                                </Box>
                                            </Grid>
                                        </Grid>

                                    </Paper>
                                </Grid>
                                <Grid item md={4} xs={12}>
                                    <Paper className='header-align hostel-floor-padding'>
                                        {/* <MultiSelect
                                            options={assetList}
                                            value={selectedAssetDropdown}
                                            onChange={(e) => this.onchangeSubject(e)}
                                            style={{ minWidth: '250px', maxWidth: '400px' }}
                                            className="room-strength-add-asset"
                                            overrideStrings={{
                                                selectSomeItems: "select asset",
                                                allItemsAreSelected: "All assets are selected",
                                                selectAll: "Select All",
                                                search: "Search",
                                            }}
                                        /> */}
                                        <MultipleSelectDropdown
                                            data_list={assetList}
                                            selected_list={selectedAssetDropdown}
                                            error={false}
                                            label={'Select Asset'}
                                            onChange={(e) => this.onchangeSubject(e)} 
                                            customId='asset'
                                        />
                                        <Box className='header-align'>
                                            {selectedAssetDropdown.map((data, index) => {
                                                return <Grid container spacing={1}>
                                                    <Grid item md={4} xs={12} className='room-strength-asset-label'>
                                                        <Box>{data.name}</Box>
                                                    </Grid>
                                                    <Grid item md={8} xs={12}>
                                                        <TextField
                                                            label='Number of Assets'
                                                            name='number_of_assets'
                                                            size='small'
                                                            type='text'
                                                            value={data.number_of_assets}
                                                            className='width-100'
                                                            inputProps={{ maxLength: '2', autoComplete: 'new-password' }}
                                                            variant="outlined"
                                                            helperText={fieldErrors[`number_of_assets${index}`] ? fieldErrors[`number_of_assets${index}`] : ''}
                                                            error={fieldErrors[`number_of_assets${index}`]}
                                                            onChange={(e) => this.handleChangeFloor(e, index)}
                                                        />
                                                    </Grid>
                                                </Grid>
                                            })}
                                        </Box>
                                    </Paper>
                                </Grid>
                            </Grid>
                            <Grid item md={12}>
                                <Box display='flex' marginLeft='auto' justifyContent='flex-end' className='header-align'>
                                    <Button variant="contained" color="primary"
                                        className='submit'
                                        disabled={submitDisable}
                                        onClick={this.submit}>
                                        Submit &nbsp;{' '}
                                    </Button>
                                </Box>
                            </Grid>
                        </Box>
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


export default withRouter(AddRoomStrength)