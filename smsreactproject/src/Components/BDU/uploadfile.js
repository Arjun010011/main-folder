import React, { Component } from 'react'
import 'react-datasheet/lib/react-datasheet.css';
import UploadExcel from 'images/upload-excel.jpeg';
import { GET_URL } from 'Includes/urls';
import { Tooltip, Grid, Box } from '@material-ui/core';
import { maxFileSize } from 'Constants';


export class UploadFile extends Component {

    constructor(props) {
        super(props)
        this.state = {
            errorContent: '',
            filename: ''
        }
    }

    handleChangeFile = async (event, acceptFileType) => {
        let file = event.target.files[0]
        if (file) {
            if (file.size < maxFileSize[acceptFileType].size) {
                if (file.type === "application/vnd.ms-excel" ||
                    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
                    this.setState({
                        filename: file.name,
                        errorContent: ''
                    })
                    this.props.isUpload(true, file);
                }
                else {
                    this.setState({
                        filename: '',
                        errorContent: 'allowed file type(s) : .xls or .xlsx'
                    })
                    this.props.isUpload(false);
                }

            }
            else {
                this.setState({
                    filename: '',
                    errorContent: maxFileSize[acceptFileType].errorText
                })
                this.props.isUpload(false);
            }
        }
    }
    render() {
        const { errorContent, filename } = this.state
        return (<div>
            <Grid container>
                <label>Upload file</label>
                <Grid item md={12}>
                    <Tooltip title={".xls or .xlsx files"} enterDelay={400}
                        enterNextDelay={400} placement='top-start'
                        classes={{ tooltip: 'tooltip-show-data' }}>
                        <label for="bdu_file">
                            <img src={UploadExcel} alt='upload' width="40" height="40" />
                            <input type="file" id='bdu_file' className='display-none'
                                onChange={(e) => this.handleChangeFile(e, 'file')}
                                onClick={e => (e.target.value = null)} />
                        </label>
                    </Tooltip>
                </Grid>
                <Box>
                    {filename}
                </Box>
                <Box className='error-content flex-justify-center margin-top-10'>
                    {errorContent}
                </Box>
            </Grid>
        </div>
        )
    }
}
