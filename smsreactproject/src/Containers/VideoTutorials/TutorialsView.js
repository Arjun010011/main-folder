import React, { Component } from 'react'
import { Paper, Box, Grid, Button, Tooltip, Breadcrumbs, CircularProgress } from '@material-ui/core';
import HomeOutlinedIcon from '@material-ui/icons/HomeOutlined';
import FolderRoundedIcon from '@material-ui/icons/FolderRounded';
import YouTubeIcon from '@material-ui/icons/YouTube';
import { withRouter } from 'react-router-dom';
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';

import { getRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, DEL_URL } from 'Includes/urls';
import { Dropdown } from 'Components/DropDown';
import loadingBar from 'images/loading.gif';



class TutorialsView extends Component {
    constructor(props) {
        super(props)

        this.state = {
            status: 'folders',
            breadcrumbsList: [],
            folderList: [],
            fileList: [],
            folderLoading: false,
            loading: true,
            isMobileScreen: false,
            getFolderDetails: this.getFolderDetails.bind(this)

        }
    }

    static getDerivedStateFromProps(props, state) {
        if (props.location.state) {
            if (state.folderId && props.location.state.data !== state.folderId) {
                return {
                    model: state.getFolderDetails(props.location.state.data)
                }
            }
        }
    }

    componentDidMount() {
        if (this.props.location.state && this.props.location.state.data) {
            const id = this.props.location.state.data;
            this.getFolderDetails(id);
        }
        else {
            this.getFolderDetails(1);
        }
        this.resize();
    }

    resize() {
        this.setState({ isMobileScreen: window.innerWidth <= 760 });
    }

    getFolderDetails = async (id) => {
        const url = GET_URL.getfoldercontentimgvideo.api + id + '/';
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    folderList: response.data?.folders ?? [],
                    folderAllDetails: response.data,
                    fileList: response.data?.files ?? [],
                    videoList: response.data?.videos ?? [],
                    breadcrumbsList: response.data.breadcrumbs,
                    folderId: id,
                    designType: 'dropDown',
                    loading: false
                })
            }
            this.setState({ folderLoading: false })
        })
    }

    handleVideos = () => {
        const { videoList, folderId, breadcrumbsList } = this.state;
        let folderPath = []
        breadcrumbsList.forEach((data) => {
            folderPath.push(data['name'])
        })
        folderPath = folderPath.join()
        let folder = { id: folderId, videoList: videoList, folderPath: folderPath }
        this.props.history.push({
            pathname: '/tutorials/videolist',
            state: { data: folder }
        })
    }

    handleDocuments = () => {
        const { fileList, folderId, breadcrumbsList } = this.state;
        let folderPath = []
        breadcrumbsList.forEach((data) => {
            folderPath.push(data['name'])
        })
        folderPath = folderPath.join()
        let folder = { id: folderId, fileList: fileList, folderPath: folderPath }
        this.props.history.push({
            pathname: '/tutorials/documentlist',
            state: { data: folder }
        })
    }

    handleOpenFolder = (id) => {
        this.setState({
            folderLoading: true
        })
        this.routeToFolderDetails(id);
    }

    routeToFolderDetails = (id) => {
        const { folderId } = this.state;
        if (folderId !== id) {
            this.props.history.push({
                pathname: '/tutorial/view',
                state: { data: id }
            })
        }
        else {
            this.setState({
                folderLoading: false
            })
        }
    }

    render() {
        let { folderList, fileList, videoList, breadcrumbsList, folderLoading, loading, isMobileScreen } = this.state;
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <Paper className='upload-video-background'>
                    <Box className='heading'>
                        Video Tutorials
                    </Box>
                    <Breadcrumbs maxItems={5} aria-label="breadcrumb">
                        <Button className='breadcrumb' onClick={() => this.handleOpenFolder(1)}>
                            <HomeOutlinedIcon />Home
                        </Button>
                        {breadcrumbsList.map((temp) => {
                            return (
                                <Button className='breadcrumb' onClick={() => this.handleOpenFolder(temp.tree_id)}>
                                    {temp.name}
                                </Button>
                            )
                        })}
                    </Breadcrumbs>
                    {folderLoading &&
                        <Box display='flex' className='custom-menu-height'>
                            <CircularProgress className='loading' />
                        </Box>
                    }
                    {!folderLoading &&
                        <Box className='custom-menu-height'>
                            {folderList.length > 0 &&
                                <Box className='header-align'>Folders</Box>
                            }
                            <Box className='header-align folders-list-box'>
                                {folderList.map((temp, index) => {
                                    return (
                                        <Box key={index} className='folder-box'>
                                            <Box className='handle-width-availability'>
                                                <Button
                                                    ref={`folder_${temp.tree_id}`}
                                                    onDoubleClick={() => !isMobileScreen ? this.handleOpenFolder(temp.tree_id) : ''}
                                                    onClick={() => isMobileScreen ? this.handleOpenFolder(temp.tree_id) : ''}
                                                    className='folder'
                                                >
                                                    <FolderRoundedIcon />
                                                    <Box className='handle-folder-name-overflow'>{temp.name}</Box>
                                                </Button>
                                            </Box>
                                        </Box>
                                    )
                                })}
                            </Box>
                            <Box className='header-align'>Files</Box>
                            <Box className='tutorial-view-videos-doc-folder-position'>
                                <Box
                                    className='tutorials-view-folder-box'
                                    onDoubleClick={() => !isMobileScreen ? this.handleVideos() : ''}
                                    onClick={() => isMobileScreen ? this.handleVideos() : ''}
                                >
                                    <FolderRoundedIcon className='tutorial-view-video-folder' />
                                    <Box>
                                        Videos({videoList.length})
                                    </Box>
                                </Box>
                                <Box
                                    className='tutorials-view-folder-box'
                                    onDoubleClick={() => !isMobileScreen ? this.handleDocuments() : ''}
                                    onClick={() => isMobileScreen ? this.handleDocuments() : ''}
                                >
                                    <FolderRoundedIcon className='tutorial-view-video-folder' />
                                    <Box>
                                        Documents({fileList.length})
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    }
                </Paper>
            )
        }
    }
}

export default withRouter(TutorialsView);

