import React from 'react';
import { GET_URL, POST_URL, PUT_URL, DEL_URL } from 'Includes/urls';

import UploadVideo from 'Containers/VideoTutorials/UploadVideo';
import TutorialsView from 'Containers/VideoTutorials/TutorialsView';
import VideosList from 'Containers/VideoTutorials/Components/VideosList';
import DocumentList from 'Containers/VideoTutorials/Components/DocumentList';

const Actions = {
    upload_tutorials: {
        create: {
            codenames: [GET_URL.getfoldercontent.basename, POST_URL.uploads.basename,
            POST_URL.createfolder.basename, POST_URL.createfile.basename,
            GET_URL.tutorialgrouppermission.basename, POST_URL.tutorialgrouppermission.basename,
            GET_URL.tutorialuserpermission.basename, POST_URL.tutorialuserpermission.basename,
            GET_URL.tutorialstandardpermission.basename, POST_URL.tutorialstandardpermission.basename,
            DEL_URL.createfolder.basename, PUT_URL.createfolder.basename, PUT_URL.createfile.basename,
            GET_URL.tutorialstandardsectionpermission.basename, POST_URL.tutorialstandardsectionpermission.basename,
            POST_URL.copypermission.basename,DEL_URL.createfile.basename
            ],
            action_code: 'visible_upload_tutorials_add',
            is_superuser_action: false,
            name: 'Upload Tutorial',
            label: 'Upload Tutorial',
            action: 'sub-menu',
            url: '/tutorial/upload',
            component: <UploadVideo />,
            permission_needed: true,
            associated_urls: []
        },
        name: 'Upload Tutorials',
        type: 'Tutorial',
        old_code: 'upload_tutorials',
    },
    view_tutorials: {
        view: {
            codenames: [GET_URL.getfoldercontentimgvideo.basename],
            action_code: 'visible_view_tutorials_view',
            is_superuser_action: false,
            name: 'View Tutorial',
            label: 'View Tutorial',
            action: 'sub-menu',
            url: '/tutorial/view',
            component: <TutorialsView />,
            permission_needed: true,
            associated_urls: ['/tutorials/videolist', '/tutorials/documentlist'],

        },
        name: 'View Tutorial',
        type: 'Tutorial',
        old_code: 'view_tutorials',
    },
    tutorials_videolist: {
        view: {
            codenames: [],
            action_code: 'visible_tutorials_videolist_view',
            is_superuser_action: false,
            name: 'View Tutorial',
            label: 'View Tutorial',
            action: 'action-url',
            url: '/tutorials/videolist',
            component: <VideosList />,
            permission_needed: false,
        },
        name: 'View Tutorial',
        type: 'Tutorial',
        old_code: 'tutorials_videolist',
    },
    tutorials_documentlist: {
        view: {
            codenames: [],
            action_code: 'visible_tutorials_documentlist_view',
            is_superuser_action: false,
            name: 'View Tutorial',
            label: 'View Tutorial',
            action: 'action-url',
            url: '/tutorials/documentlist',
            component: <DocumentList />,
            permission_needed: false,
        },
        name: 'View Tutorial',
        type: 'Tutorial',
        old_code: 'tutorials_documentlist',
    },
}

export default Actions