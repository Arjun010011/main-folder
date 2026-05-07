import React, { Component } from 'react'
import {
    Box, Button, Dialog, DialogActions, DialogContent, TextareaAutosize, DialogTitle, TextField, Grid,
} from '@material-ui/core';
import FolderRoundedIcon from '@material-ui/icons/FolderRounded';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import EditTwoToneIcon from '@material-ui/icons/EditTwoTone';
import Swal from 'sweetalert2'
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';

import { file_default_image_view_details, supported_images_types, permission_modes } from 'Containers/VideoTutorials/Constants';
import { putRequest } from 'Includes/api/apicall';
import { PUT_URL } from 'Includes/urls'



export default class ViewFolderDetails extends Component {
    constructor(props) {
        super(props)

        this.state = {
            open: false,
            errorContent: '',
            submitDisable: false,
            isEditDescription: false,
            description: '',
            selectedDetails: {},
            fieldError: {}
        }
    }

    handleOpen = (status, selectedDetails) => {
        let selectedId = selectedDetails.tree_id
        let description = selectedDetails.description
        let name = selectedDetails.name
        let label;
        if (status === 'folder') {
            label = `${name} folder details`
        }
        else {
            label = `${name} file details`
        }
        this.setState({
            status,
            selectedId,
            name,
            open: true,
            label,
            selectedDetails,
            description
        })
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
            [name]: value,
        })
    }

    submit = () => {
        let { status, selectedId, description, errorContent } = this.state;
        if (description) {
            this.setState({ submitDisable: true })
            let payload = {
                'description': description
            }
            const { folderId } = this.props;
            let url
            if (status === 'folder') {
                url = PUT_URL.createfolder.api + selectedId + '/'
            }
            else {
                url = PUT_URL.createfile.api + selectedId + '/'
            }
            putRequest(url, payload, this.props).then(response => {
                if (response && response.status === 200) {
                    this.handleClose();
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: false,
                        timer: 1500
                    }).then(
                        this.props.getFolderDetails(folderId)
                    )
                }
                this.setState({ submitDisable: false })
            })
        }
        else {
            errorContent = 'Please Enter Description'
            this.setState({
                errorContent
            })
        }
    }

    render() {
        let { open, name, isEditDescription, description, errorContent, submitDisable, status, selectedDetails, fieldError } = this.state;
        let formatType = file_default_image_view_details[`${selectedDetails.file_type}`];
        return (
            <div>
                {status &&
                    <Dialog open={open}
                        className='action-video-tutorial-details-width'
                        onClose={this.handleClose} aria-labelledby='form-dialog-title'>
                        <Box className='close-icon-top-end'>
                            <HighlightOffIcon className='end-flex-prop' onClick={this.handleClose} />
                        </Box>
                        <DialogContent>
                            <Box className='view-details-title'>
                                {status === 'folder' &&
                                    <FolderRoundedIcon className='view-details-folder' />
                                }
                                {!supported_images_types.image_type.includes(selectedDetails.file_type) && status === 'file' &&
                                    <Box className={formatType['className']}>
                                        {formatType['tag']}
                                    </Box>
                                }
                                <Box className='view-details-name'>{name}</Box>
                            </Box>
                            {status === 'folder' &&
                                <Box className='flex-justify-center-flex-prop'>
                                    <FolderRoundedIcon className='view-details-folder-large' />
                                </Box>
                            }
                            {!supported_images_types.image_type.includes(selectedDetails.file_type) ? (status === 'file' &&
                                <Box className={formatType['largeClassName']}>
                                    {formatType['largeTag'] ?
                                        formatType['largeTag'] :
                                        formatType['tag']}
                                </Box>
                            )
                                :
                                <Box className='margin-top-20'>
                                    {supported_images_types.image_type.includes(selectedDetails.file_type) &&
                                        <Box style={{ height: '200px' }}
                                        ><img src={selectedDetails['document_url']['file']} className='file-list-image-height' /></Box>
                                    }
                                </Box>
                            }

                            <Box className='view-details-label-name-value'>
                                <Box className='view-details-label'>
                                    Name:
                                </Box>
                                <Box className='view-details-value'>
                                    {selectedDetails.name}
                                </Box>
                            </Box>
                            <Box className='view-details-label-name-value'>
                                <Box className='view-details-label'>
                                    Owner Name:
                                </Box>
                                <Box className='view-details-value'>
                                    {selectedDetails.created_by_name}
                                </Box>
                            </Box>
                            <Box className='view-details-label-name-value'>
                                <Box className='view-details-label'>
                                    Type:
                                </Box>
                                <Box className='view-details-value'>
                                    {!supported_images_types.image_type.includes(selectedDetails.file_type) ?
                                        selectedDetails.folder_type || formatType['name']
                                        :
                                        <Box>Image </Box>
                                    }
                                </Box>
                            </Box>

                            <Box className='view-details-label-name-value'>
                                <Box className='view-details-label'>
                                    Description:
                                </Box>
                                {selectedDetails.description && !isEditDescription &&
                                    <Box className='view-details-value'>
                                        {selectedDetails.description}
                                    </Box>
                                }
                                {!selectedDetails.description && !isEditDescription &&
                                    <Box className='view-details-add-description'>
                                        Add a description
                                    </Box>
                                }
                                {!isEditDescription && permission_modes.write.includes(selectedDetails.permission) &&
                                    <Box>
                                        <EditTwoToneIcon onClick={this.handleEdit} className='view-details-close-icon' />
                                    </Box>
                                }
                                {isEditDescription &&
                                    <div>
                                        <TextareaAutosize aria-label="minimum height"
                                            className='view-details-description-text-area'
                                            value={description}
                                            name='description'
                                            onChange={this.onChange}
                                            required
                                            maxLength={200}
                                        />
                                        <div className='ml-20 text-blue fs-12'>{description.length > 180 && 'Maximum Of 200 Characters Allowed'}</div>
                                    </div>
                                }
                            </Box>
                            {errorContent &&
                                <Box className='new-file-attache-text'>{errorContent}</Box>
                            }
                        </DialogContent>
                        <DialogActions>
                            {isEditDescription &&
                                <Button texttransform='none' disabled={submitDisable} onClick={() => this.submit()} color='primary'>
                                    update
                                </Button>
                            }
                        </DialogActions>
                    </Dialog>
                }
            </div>
        )
    }
}
