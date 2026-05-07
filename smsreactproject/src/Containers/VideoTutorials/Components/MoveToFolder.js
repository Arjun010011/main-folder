import React, { Component } from 'react'
import { Popper, Paper, Box, Tooltip, Button } from '@material-ui/core';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import FolderRoundedIcon from '@material-ui/icons/FolderRounded';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import Swal from 'sweetalert2';

import { GET_URL, PUT_URL } from 'Includes/urls';
import { getRequest, putRequest } from 'Includes/api/apicall';
import { move_file_default_image } from 'Containers/VideoTutorials/Constants';




export default class MoveToFolder extends Component {
    constructor(props) {
        super(props)

        this.state = {
            open: false,
            anchorEl: null,
            folderList: [],
            selectedFolder: '',
            previous_id: '',
            fileList: [],
            selectedFolderName: ''
        }
    }

    handleClick = (ref) => {
        let { anchorEl } = this.state;
        anchorEl = anchorEl ? null : ref;
        this.setState({
            anchorEl,
            open: Boolean(anchorEl),
        })
    };


    updateFolderList = (list) => {
        let { fileList, folderList, parentFolderName, moveParentFolder } = this.state;
        let breadcrumbsList = list.breadcrumbs;
        fileList = list.files;
        folderList = list.folders;
        let tempList = [...breadcrumbsList];
        let temp = tempList.pop();
        parentFolderName = 'Home'
        if (temp) {
            parentFolderName = temp.name
            moveParentFolder = temp.tree_id
        }
        else {
            moveParentFolder = 1
        }
        this.setState({
            folderList,
            fileList,
            parentFolderName,
            previous_id: list.previous_parent_id,
            moveParentFolder,
            selectedFolder: ''
        })
    }

    getFolderDetails = async (e, id) => {
        const { parentSelectedFolder } = this.props;
        e.stopPropagation();
        if (parentSelectedFolder !== id) {
            const url = GET_URL.getfoldercontent.api + id + '/';
            getRequest(url, {}, this.props).then(response => {
                if (response && response.status === 200) {
                    this.updateFolderList(response.data)
                }
            })
        }
    }

    handleSelectedFolder = (id, name) => {
        let { selectedFolder, selectedFolderName } = this.state;
        const { parentSelectedFolder } = this.props;
        if (parentSelectedFolder !== id) {
            let selectedId = ''
            if (id !== selectedFolder) {
                selectedId = id
                selectedFolderName = name
            }
            this.setState({
                selectedFolder: selectedId,
                selectedFolderName
            })
        }
    }

    handleMoveFolder = () => {
        this.setState({ submitDisable: true })
        const { selectedFolder, moveParentFolder } = this.state;
        const { parentSelectedFolder } = this.props;
        let folder = selectedFolder === '' ? moveParentFolder : selectedFolder
        let post_data = {
            'parent_id': folder
        }
        const url = PUT_URL.movefolderorfile.api + parentSelectedFolder + '/'

        putRequest(url, post_data, this.props).then(response => {
            if (response && response.status === 200) {
                Swal.fire({
                    position: 'top-end',
                    type: 'success',
                    title: response.data.Reason,
                    showConfirmButton: false,
                    timer: 1500
                })
                this.handleClick();
                this.props.getFolderDetails(folder)
            }
            this.setState({ submitDisable: false })
        })

    }

    render() {
        const { open, anchorEl, parentFolderName, moveParentFolder, moveToFolderName, folderList, previous_id, selectedFolder, fileList,
            submitDisable, selectedFolderName } = this.state;
        const { parentSelectedFolder, parentFolder, selectedName, isMobileScreen } = this.props;
        return (
            <div>
                <Popper open={open} anchorEl={isMobileScreen ? '' : anchorEl} className='move-folder-Popper-align-left'>
                    <Paper className='move-folder-paper-background'>
                        <Box className='move-folder-home-box'>
                            {parentFolderName !== 'Home' &&
                                <ArrowBackIcon onClick={(e) => this.getFolderDetails(e, previous_id)} className='move-folder-close-icon' />
                            }
                            <Box className='parent-folder-name'>
                                {parentFolderName}
                            </Box>
                            <Box className='move-folder-close-button'>
                                <HighlightOffIcon onClick={this.handleClick} className='move-folder-close-icon' />
                            </Box>
                        </Box>
                        <Box className='move-folder-list-height'>
                            {folderList.map((temp, index) => {
                                return (
                                    <Tooltip key={index} title={parentSelectedFolder === temp.tree_id ? 'Cannot move the folder onto itself' : ''} enterDelay={200}
                                        enterNextDelay={300} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <Box
                                            onClick={() => this.handleSelectedFolder(temp.tree_id, temp.name)}
                                            onDoubleClick={(e) => this.getFolderDetails(e, temp.tree_id)}
                                            className={
                                                parentSelectedFolder === temp.tree_id ? 'move-folder-disable move-folder-list-box' :
                                                    selectedFolder === temp.tree_id ? 'move-selectedFolder-name move-folder-list-box' :
                                                        'move-folder-list-box'}>
                                            <Box
                                                className='move-folder-name'>
                                                <FolderRoundedIcon />
                                                <Box className='handle-folder-name-overflow'>{temp.name}</Box>
                                            </Box>
                                            {parentSelectedFolder !== temp.tree_id &&
                                                <Box className='move-folder-next-icon-box'>
                                                    <Box className='move-folder-next-icon'
                                                        onClick={(e) => this.getFolderDetails(e, temp.tree_id)} >
                                                        <ArrowForwardIcon /></Box>
                                                </Box>
                                            }
                                        </Box>
                                    </Tooltip>
                                )
                            })
                            }
                            {fileList && fileList.map((temp, index) => {
                                return (
                                    <Tooltip key={index} title='Cannot move files' enterDelay={200}
                                        enterNextDelay={300} placement='top-start'
                                        classes={{ tooltip: 'tooltip-show-data' }}>
                                        <Box
                                            className='move-folder-name move-folder-disable move-folder-list-box'>
                                            <Box className={move_file_default_image[`${temp.file_type}`]['className']}>
                                                {move_file_default_image[`${temp.file_type}`]['tag']}
                                            </Box>
                                            <Box className='handle-folder-name-overflow'>{temp.name}</Box>
                                        </Box>
                                    </Tooltip>
                                )
                            })
                            }
                        </Box>
                        <Box className='move-folder-buttons-position'>
                            <Box className='move-selected-folder'>
                                Move {selectedName} To {!submitDisable && (selectedFolderName ? selectedFolderName : parentFolderName)}
                            </Box>
                            <Box className='end-flex-prop '>
                                <Tooltip title={parentFolder === (selectedFolder ? selectedFolder : moveParentFolder) ? 'Item is already in this folder' : ''} enterDelay={200}
                                    enterNextDelay={300} placement='top-start'
                                    classes={{ tooltip: 'tooltip-show-data' }}>
                                    <Button
                                        disabled={submitDisable}
                                        className={parentFolder === (selectedFolder ? selectedFolder : moveParentFolder) ? 'move-button-disable' : 'move-folder-button'}
                                        onClick={parentFolder === (selectedFolder ? selectedFolder : moveParentFolder) ? '' : this.handleMoveFolder}
                                    >Move Here</Button>
                                </Tooltip>
                            </Box>
                        </Box>
                    </Paper>
                </Popper>
            </div>
        )
    }
} 
