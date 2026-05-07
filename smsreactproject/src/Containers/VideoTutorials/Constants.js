import React, { Component } from 'react';
import CreateNewFolderOutlinedIcon from '@material-ui/icons/CreateNewFolderOutlined';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import EditOutlinedIcon from '@material-ui/icons/EditOutlined';
import DeleteOutlinedIcon from '@material-ui/icons/DeleteOutlined';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import InsertDriveFileIcon from '@material-ui/icons/InsertDriveFile';
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline';
import HelpOutlineTwoToneIcon from '@material-ui/icons/HelpOutlineTwoTone';
import PersonAddIcon from '@material-ui/icons/PersonAdd';


export const folderMenu_Global = [
    { icon: <VisibilityOutlinedIcon />, label: 'Open', id: 1, permission_mode: [1, 3, 4] },
    { icon: <InfoOutlinedIcon />, label: 'View Details', id: 2, permission_mode: [1, 3, 4] },
    { icon: <PersonAddIcon />, label: 'Set Permission', id: 6, permission_mode: [3, 4] },
    { icon: <EditOutlinedIcon />, label: 'Rename', id: 3, permission_mode: [3, 4] },
    { icon: <CreateNewFolderOutlinedIcon />, label: 'Move', id: 4, permission_mode: [3, 4] },
    { icon: <DeleteOutlinedIcon />, label: 'Delete', id: 5, permission_mode: [4] },
]

export const fileMenu_Global = [
    { icon: <VisibilityOutlinedIcon />, label: 'Preview', id: 5, permission_mode: [1, 3, 4] },
    { icon: <InfoOutlinedIcon />, label: 'View Details', id: 1, permission_mode: [1, 3, 4] },
    { icon: <EditOutlinedIcon />, label: 'Rename', id: 2, permission_mode: [3, 4] },
    { icon: <CreateNewFolderOutlinedIcon />, label: 'Move', id: 3, permission_mode: [3, 4] },
    { icon: <PersonAddIcon />, label: 'Set Permission', id: 6, permission_mode: [3, 4] },
    { icon: <DeleteOutlinedIcon />, label: 'Delete', id: 4, permission_mode: [4] },
]

export const general_Global = [
    { icon: <CreateNewFolderOutlinedIcon />, label: 'New Folder', id: 1 },
    { icon: <InsertDriveFileIcon />, label: 'New File', id: 2 },
    { icon: <PlayCircleOutlineIcon />, label: 'Upload Video', id: 3 },
]

export const file_default_image = {
    'pdf': { tag: <i class="fa fa-file-pdf-o"></i>, className: 'file-pdf-icon' },
    'txt': { tag: <i class="fa fa-file-text-o"></i>, className: 'file-txt-icon' },
    'docx': { tag: <i class="fa fa-file-word-o"></i>, className: 'file-docx-icon' },
    'doc': { tag: <i class="fa fa-file-word-o"></i>, className: 'file-docx-icon' },
    'odt': { tag: <i class="fa fa-file-word-o"></i>, className: 'file-docx-icon' },
    'pptx': { tag: <i class="fa fa-file-powerpoint-o"></i>, className: 'file-ppt-icon' },
    'ppt': { tag: <i class="fa fa-file-powerpoint-o"></i>, className: 'file-ppt-icon' },
    'csv': { tag: <i class="fa fa-file-excel-o"></i>, className: 'file-excel-icon' },
    'xls': { tag: <i class="fa fa-file-excel-o"></i>, className: 'file-excel-icon' },
    'xlsx': { tag: <i class="fa fa-file-excel-o"></i>, className: 'file-excel-icon' },

    'mp4': { tag: <PlayCircleOutlineIcon className='file-mp4-icon' />, className: '' },
    'wmv': { tag: <PlayCircleOutlineIcon className='file-mp4-icon' />, className: '' },
    'mov': { tag: <PlayCircleOutlineIcon className='file-mp4-icon' />, className: '' },
    'avi': { tag: <PlayCircleOutlineIcon className='file-mp4-icon' />, className: '' },
    'mkv': { tag: <PlayCircleOutlineIcon className='file-mp4-icon' />, className: '' },
    'mpg': { tag: <PlayCircleOutlineIcon className='file-mp4-icon' />, className: '' },

    'png': { tag: <i class="fa fa-file-word-o"></i>, className: 'move-file-docx-icon' },
    'jpg': { tag: <i class="fa fa-file-word-o"></i>, className: 'move-file-docx-icon' },
    'jpeg': { tag: <i class="fa fa-file-word-o"></i>, className: 'move-file-docx-icon' },
}


export const move_file_default_image = {
    'pdf': { tag: <i class="fa fa-file-pdf-o"></i>, className: 'move-file-pdf-icon' },
    'txt': { tag: <i class="fa fa-file-text-o"></i>, className: 'move-file-txt-icon' },
    'doc': { tag: <i class="fa fa-file-word-o"></i>, className: 'move-file-docx-icon' },
    'docx': { tag: <i class="fa fa-file-word-o"></i>, className: 'move-file-docx-icon' },
    'odt': { tag: <i class="fa fa-file-word-o"></i>, className: 'move-file-docx-icon' },
    'pptx': { tag: <i class="fa fa-file-powerpoint-o"></i>, className: 'move-file-ppt-icon' },
    'ppt': { tag: <i class="fa fa-file-powerpoint-o"></i>, className: 'move-file-ppt-icon' },
    'xls': { tag: <i class="fa fa-file-excel-o"></i>, className: 'move-file-excel-icon' },
    'csv': { tag: <i class="fa fa-file-excel-o"></i>, className: 'move-file-excel-icon' },
    'xlsx': { tag: <i class="fa fa-file-excel-o"></i>, className: 'move-file-excel-icon' },

    'png': { tag: <i class="fa fa-file-word-o"></i>, className: 'move-file-docx-icon' },
    'jpg': { tag: <i class="fa fa-file-word-o"></i>, className: 'move-file-docx-icon' },
    'jpeg': { tag: <i class="fa fa-file-word-o"></i>, className: 'move-file-docx-icon' },

    'mp4': { tag: <i class="fa fa-file-word-o"></i>, className: 'move-file-docx-icon' },
    'wmv': { tag: <i class="fa fa-file-word-o"></i>, className: 'move-file-docx-icon' },
    'mov': { tag: <i class="fa fa-file-word-o"></i>, className: 'move-file-docx-icon' },
    'avi': { tag: <i class="fa fa-file-word-o"></i>, className: 'move-file-docx-icon' },
    'mkv': { tag: <i class="fa fa-file-word-o"></i>, className: 'move-file-docx-icon' },
    'mpg': { tag: <i class="fa fa-file-word-o"></i>, className: 'move-file-docx-icon' },
}

export const file_default_image_view_details = {

    'pdf': {
        tag: <i class="fa fa-file-pdf-o"></i>,
        className: 'view-details-file-pdf-icon',
        largeClassName: 'view-details-file-pdf-large-icon',
        name: 'PDF'
    },
    'txt': {
        tag: <i class="fa fa-file-text-o"></i>,
        className: 'view-details-file-txt-icon',
        largeClassName: 'view-details-file-txt-large-icon',
        name: 'TEXT'
    },
    'csv': {
        tag: <i class="fa fa-file-excel-o"></i>,
        className: 'view-details-file-xlsx-icon',
        largeClassName: 'view-details-file-xlsx-large-icon',
        name: 'Excel'
    },
    'doc': {
        tag: <i class="fa fa-file-word-o"></i>,
        className: 'view-details-file-docx-icon',
        largeClassName: 'view-details-file-docx-large-icon',
        name: 'Doc'
    },
    'docx': {
        tag: <i class="fa fa-file-word-o"></i>,
        className: 'view-details-file-docx-icon',
        largeClassName: 'view-details-file-docx-large-icon',
        name: 'Doc'
    },
    'ppt': {
        tag: <i class="fa fa-file-powerpoint-o"></i>,
        className: 'view-details-file-pptx-icon',
        largeClassName: 'view-details-file-pptx-large-icon',
        name: 'Power Point'
    },
    'pptx': {
        tag: <i class="fa fa-file-powerpoint-o"></i>,
        className: 'view-details-file-pptx-icon',
        largeClassName: 'view-details-file-pptx-large-icon',
        name: 'Power Point'
    },
    'xls': {
        tag: <i class="fa fa-file-excel-o"></i>,
        className: 'view-details-file-xlsx-icon',
        largeClassName: 'view-details-file-xlsx-large-icon',
        name: 'Excel'
    },
    'odt': {
        tag: <i class="fa fa-file-excel-o"></i>,
        className: 'view-details-file-xlsx-icon',
        largeClassName: 'view-details-file-xlsx-large-icon',
        name: 'Doc'
    },
    'xlsx': {
        tag: <i class="fa fa-file-excel-o"></i>,
        className: 'view-details-file-xlsx-icon',
        largeClassName: 'view-details-file-xlsx-large-icon',
        name: 'Excel'
    },
    'mp4': {
        tag: <PlayCircleOutlineIcon className='view-details-file-mp4-icon' />,
        largeTag: <PlayCircleOutlineIcon className='view-details-file-mp4-large-icon' />,
        className: '',
        largeClassName: 'view-details-file-mp4-large-box',
        name: 'MP4',
    },
    'wmv': {
        tag: <PlayCircleOutlineIcon className='view-details-file-mp4-icon' />,
        largeTag: <PlayCircleOutlineIcon className='view-details-file-mp4-large-icon' />,
        className: '',
        largeClassName: 'view-details-file-mp4-large-box',
        name: 'WMV',
    },
    'mov': {
        tag: <PlayCircleOutlineIcon className='view-details-file-mp4-icon' />,
        largeTag: <PlayCircleOutlineIcon className='view-details-file-mp4-large-icon' />,
        className: '',
        largeClassName: 'view-details-file-mp4-large-box',
        name: 'MOV',
    },
    'avi': {
        tag: <PlayCircleOutlineIcon className='view-details-file-mp4-icon' />,
        largeTag: <PlayCircleOutlineIcon className='view-details-file-mp4-large-icon' />,
        className: '',
        largeClassName: 'view-details-file-mp4-large-box',
        name: 'AVI',
    },
    'mkv': {
        tag: <PlayCircleOutlineIcon className='view-details-file-mp4-icon' />,
        largeTag: <PlayCircleOutlineIcon className='view-details-file-mp4-large-icon' />,
        className: '',
        largeClassName: 'view-details-file-mp4-large-box',
        name: 'MKV',
    },
    'mpg': {
        tag: <PlayCircleOutlineIcon className='view-details-file-mp4-icon' />,
        largeTag: <PlayCircleOutlineIcon className='view-details-file-mp4-large-icon' />,
        className: '',
        largeClassName: 'view-details-file-mp4-large-box',
        name: 'MPG',
    },
}


export const support_docs_global = { file_types: ['doc', 'docx', 'pptx', 'xlsx'], error: 'Supported Documents doc,docx,pptx,xlsx' }
export const support_docs_upload = {
    file_types: ['doc', 'docx', 'odt', 'txt', 'xls', 'xlsx', 'jpeg', 'jpg', 'pdf', 'png', 'pptx', 'ppt', 'csv'],
    error: 'Supported Documents doc, docx, odt, txt, xls, xlsx, jpeg, jpg, pdf, png, pptx, ppt, csv'
}
export const supported_images_types = { image_type: ['jpeg', 'jpg', 'png'], error: 'Supported Images JPEG, JPG, PNG' }
export const support_videos_global = { video_types: ['mp4', 'mov', 'wmv', 'avi', 'mpg', 'mkv'], error: 'Supported Video Formats mp4 mov wmv mpg avi mkv' }

export const permission_modes = { read: [1, 2, 3, 4], write: [2, 3, 4], allpermission: [4] }