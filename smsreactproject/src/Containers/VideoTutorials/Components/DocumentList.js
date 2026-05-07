import React, { Component } from 'react'
import { Box, Tooltip, Button, Grid, Icon, Breadcrumbs } from '@material-ui/core';
import HomeOutlinedIcon from '@material-ui/icons/HomeOutlined';
import { withRouter } from 'react-router-dom';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import classNames from 'classnames'
import CloseRoundedIcon from '@material-ui/icons/CloseRounded';

import { SORTOPTIONS } from 'Constants';
import { dateFormat, formatBytes } from 'Includes/functions';
import { file_default_image, support_docs_global, supported_images_types } from 'Containers/VideoTutorials/Constants';
import AllMUIDataTable from 'Components/AllMUIDataTable';



class DocumentList extends Component {
    constructor(props) {
        super(props)

        this.state = {
            documentList: [],
            selectedToggle: 'grid',
            previewType: '',
            previewUrl: '',
            isMobileScreen: false,
            folderPath: [],
            columns: [
                {
                    name: "trr_id",
                    label: "Date Created",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false
                    }
                },
                {
                    name: "document_url",
                    label: "document_url",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        display: false
                    }
                },
                {
                    name: "Serial Number",
                    label: "SL No   ",
                    options: {
                        filter: false,
                        sort: false,
                        search: false,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                tableMeta.rowIndex + 1

                            )
                        }
                    }
                },
                {
                    name: "name",
                    label: "Name",
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return (
                                <Box onClick={() => this.handleDocument(tableMeta.rowData[0], tableMeta.rowData[1].file, tableMeta.rowData[4])} className='video-name-table'>
                                    {value}
                                </Box>
                            )
                        },
                    }
                },

                {
                    name: "file_type",
                    label: "Format",
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "size",
                    label: "Size",
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return formatBytes(value)
                        },
                    }
                },
                {
                    name: "created_by_name",
                    label: "Owner Name",
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                    }
                },
                {
                    name: "date_created",
                    label: "Uploaded Date",
                    options: {
                        filter: true,
                        sort: true,
                        search: true,
                        customBodyRender: (value, tableMeta, updateValue) => {
                            return dateFormat(value, 'DD-MM-YYYY hh:mm A')
                        },
                    }
                },

            ]
        }
    }

    componentDidMount = () => {
        if (this.props.location.state && this.props.location.state.data) {
            let list = this.props.location.state.data.fileList;
            let folderId = this.props.location.state.data.id;
            let folderPath = this.props.location.state.data.folderPath;
            let options = { ...SORTOPTIONS }
            options.rowsPerPageOptions = [10, 15, 20];
            options.rowsPerPage = 10;
            this.setState({
                documentList: list,
                folderId,
                options: options,
                folderPath: folderPath ? folderPath.split(',') : []
            })
        }
        this.resize();
    }

    resize() {
        this.setState({ isMobileScreen: window.innerWidth <= 760 });
    }

    handleViewButton = () => {
        let { folderId } = this.state;
        this.props.history.push({
            pathname: '/tutorial/view',
            state: { data: folderId }
        })
    }
    changeToggle = (value) => {
        if (value !== null) {
            this.setState({
                selectedToggle: value
            })
        }
    }

    handleDocument = (id, url, type) => {
        this.setState({
            openPreview: true,
            previewUrl: url,
            previewType: type
        })
    }

    handleDownloadFile = () => {
        const { previewUrl } = this.state;
        window.open(previewUrl, '_blank')
        this.handleClosePreview()
    }

    handleClosePreview = () => {
        this.setState({
            openPreview: false
        })
    }


    render() {
        const { documentList, folderPath, selectedToggle, columns, options, openPreview,
            previewType, previewUrl, isMobileScreen } = this.state;
        return (
            <div>
                <Grid container>
                    <Grid item md={6} xs={12}>
                        <Box className='heading header-align'>
                            Documents
                        </Box>
                    </Grid>
                    <Grid item md={6} xs={12}>
                        <Box className='header-align end-flex-prop'>
                            <Button
                                variant="contained"
                                onClick={() => this.handleViewButton()}
                                className='editbutton-view'
                            ><VisibilityOutlinedIcon className='visibility-icon' /> Back to Folders</Button>
                        </Box>
                    </Grid>
                    <Grid item md={8} xs={8} className='margin-top-10 '>
                        <Breadcrumbs maxItems={5} aria-label="breadcrumb">
                            <Button className='breadcrumb pointer-event-none'>
                                <HomeOutlinedIcon />Home
                            </Button>
                            {folderPath.map((temp) => {
                                return (
                                    <Button className='breadcrumb pointer-event-none'>
                                        {temp}
                                    </Button>
                                )
                            })}
                        </Breadcrumbs>
                    </Grid>
                    <Grid item md={4} xs={4} className='end-flex-prop margin-top-10 '>
                        <Box className='list-grid-toggle-outer-div header-align'>
                            <Button className={selectedToggle === 'grid' ? 'list-selected-toggle' : 'grid-selected-toggle'}
                                onClick={() => this.changeToggle('grid')}
                                disabled={selectedToggle === 'grid'}>
                                <Box className={selectedToggle === 'grid' ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>Grid View</Box>
                                <Icon className={classNames(selectedToggle === 'grid' ? 'list-selected-toggle-icon' : 'grid-selected-toggle-icon', "fa fa-bars")} />

                            </Button>
                            <Button className={selectedToggle === 'list' ? 'list-selected-toggle' : 'grid-selected-toggle'}
                                onClick={() => this.changeToggle('list')}
                                disabled={selectedToggle === 'list'}>
                                <Box className={selectedToggle === 'list' ? 'list-selected-toggle-text' : 'grid-selected-toggle-text'}>List View</Box>
                                <Icon className={classNames(selectedToggle === 'list' ? 'list-selected-toggle-icon' : 'grid-selected-toggle-icon', "fa fa-th-large")} />
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
                {selectedToggle === 'grid' &&
                    <Box className='header-align'>
                        <Box className='file-outer-box'>
                            {documentList.map((temp, index) => {
                                return (
                                    <Box
                                        key={index}
                                        onClick={() => this.handleDocument(temp.tree_id, temp.document_url.file, temp.file_type)}
                                        className={'file-inner-box'}
                                        ref={`file_${temp.tree_id}`}>

                                        <Box className='file-list-upper-box1'>
                                            <Box className='file-display-block'>
                                                <Box className='file-list-upper-box2'>
                                                    <Box className='file-list-upper-box3'></Box>
                                                    <Box className='file-list-upper-box4'></Box>
                                                    <Box className='file-list-upper-box5'>
                                                        {supported_images_types.image_type.includes(temp.file_type) &&
                                                            <Box className='file-list-image-box'
                                                                onTouchStart={() => this.handleButtonPress('file', temp)}
                                                                onTouchEnd={this.handleButtonRelease}
                                                            ><img src={temp.document_url.file} className='file-list-image-height' /></Box>
                                                        }
                                                        {!supported_images_types.image_type.includes(temp.file_type) &&
                                                            <Box className={file_default_image[`${temp.file_type}`]['className']}
                                                                onTouchStart={() => this.handleButtonPress('file', temp)}
                                                                onTouchEnd={this.handleButtonRelease}
                                                            >
                                                                {file_default_image[`${temp.file_type}`]['tag']}
                                                            </Box>
                                                        }
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Box>
                                        <Tooltip title={temp.name.length > 35 ? temp.name : ''} enterDelay={500}
                                            enterNextDelay={400} placement='top-start'
                                            classes={{ tooltip: 'tooltip-show-data' }}>
                                            <Box className={temp.name.length > 35 ? 'handle-file-name-overflow' : 'file-name'}
                                            >
                                                {temp.name}</Box>
                                        </Tooltip>
                                    </Box>
                                    // <Box
                                    //     key={index}
                                    //     onClick={() => this.handleDocument(temp.tree_id, temp.document_url.file, temp.file_type)}
                                    //     className={'file-inner-box'}
                                    //     ref={`file_${temp.tree_id}`}>
                                    //     <Box className={file_default_image[`${temp.file_type}`]['className']}>
                                    //         {file_default_image[`${temp.file_type}`]['tag']}
                                    //     </Box>
                                    //     <Tooltip title={temp.name.length > 35 ? temp.name : ''} enterDelay={500}
                                    //         enterNextDelay={400} placement='top-start'
                                    //         classes={{ tooltip: 'tooltip-show-data' }}>
                                    //         <Box className={temp.name.length > 35 ? 'handle-file-name-overflow' : 'file-name'}
                                    //         >
                                    //             {temp.name}</Box>
                                    //     </Tooltip>
                                    // </Box>
                                )
                            })}
                        </Box>
                    </Box>
                }
                {selectedToggle === 'list' &&
                    <Box className='header-align'>
                        <AllMUIDataTable
                            title=''
                            data={documentList}
                            columns={columns}
                            options={options}

                        />
                    </Box>
                }
                {openPreview &&
                    <Box className='view-details-preview-background'>
                        <Box className='view-details-preview-close-icon'>
                            <CloseRoundedIcon onClick={this.handleClosePreview} className='view-details-close-icon' />
                        </Box>
                        {support_docs_global.file_types.includes(previewType) &&
                            <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${previewUrl}`} width={isMobileScreen ? '100%' : '90%'} height='100%'>
                            </iframe>
                        }
                        {!support_docs_global.file_types.includes(previewType) &&
                            <Box>
                                {this.handleDownloadFile}
                            </Box>
                        }
                    </Box>

                }
            </div>
        )
    }
}

export default withRouter(DocumentList);