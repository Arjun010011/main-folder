import React, { Component } from 'react'
import 'react-datasheet/lib/react-datasheet.css';
import DownloadExcel from 'images/export-excel.png';
import { GET_URL } from 'Includes/urls';
import { getRequest } from 'Includes/api/apicall';
import { Tooltip } from '@material-ui/core';
import fileDownload from 'js-file-download'

const { host } = window.location

export function DownloadFile({ id, filetype = 'xls' }) {

    const download = () => {
        let get_url = GET_URL.bduupload.api + id + '/'
        let prop = {}
        const params = { extn: filetype };
        prop.responseType = 'blob';
        getRequest(get_url, params, prop).then(response => {
            let type = 'application/vnd.ms-excel';
            if (filetype === 'xlsx') {
                type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
            if (response && response.status === 200) {
                const [, filename] = response.headers['content-disposition'].split('filename=');
                fileDownload(response.data, filename)
            }
        })
    }

    return (<div>
        <Tooltip title={"." + filetype + " template"} enterDelay={400}
            enterNextDelay={400} placement='top-start'
            classes={{ tooltip: 'tooltip-show-data' }}>
            <img src={DownloadExcel} alt='download' width="40" height="40" onClick={download} />
        </Tooltip>
    </div>
    )
}
