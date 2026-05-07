import React, { Component } from 'react'
import { withRouter } from 'react-router-dom';
import { Grid, Tooltip, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, CircularProgress } from '@material-ui/core';
import 'react-datasheet/lib/react-datasheet.css';
import excel from 'images/uploaddownload.png';
import { DownloadFile } from 'Components/BDU/dowloadfile';
import { UploadFile } from 'Components/BDU/uploadfile';
import { PUT_URL } from 'Includes/urls'
import { putRequest } from 'Includes/api/apicall';
import Swal from 'sweetalert2';
import ErrorHandler from 'Components/ErrorHandler';
import { Actions } from 'Constants/permissions';


class UploadDrawer extends Component {
    constructor(props) {
        super(props)
        this.state = {
            open: false,
            anchorEl: null,
            submitDisable: true,
            displayActionColumn: false,
            showData: '',
            fieldValue: {},
            openMenu: '',
            errorContent: '',
            loadingData: false,
            file: null
        }
    }

    handleClickOpen = () => {
        this.setState({
            open: true,
            errorContent: '',
            submitDisable: true
        })
    };

    handleClose = () => {
        this.setState({
            open: false,
            errorContent: '',
            loadingData: false
        })
    };

    isUpload = (value, file = null) => {
        this.setState({
            submitDisable: !value,
            file
        })
    }

    submit = () => {
        this.setState({
            loadingData: true,
            submitDisable: true
        })
        const { file } = this.state;
        const { id } = this.props;
        let payload = new FormData();
        payload.append('uploads', file)
        const url = PUT_URL.bduupload.api + id + '/';
        putRequest(url, payload, { return_error: true }).then(response => {
            if (response && response.status === 200) {

                this.setState(() => {
                    Swal.fire({
                        position: 'top-end',
                        type: 'success',
                        title: response.data.Reason,
                        showConfirmButton: true,
                        // timer: 1500
                    })
                })
            }
            else if (response && response.status === 400) {
                if (response.data.Reason && response.data.data && response.data.columns) {
                    this.props.history.push({
                        pathname: Actions.bdu_error.update.url,
                        state: { id: id, ...response.data }
                    })
                }
                else {
                    const error = { response }
                    ErrorHandler(error);
                }
            }
            this.handleClose();
        })
    }

    render() {
        const { open, showData, submitDisable, loadingData } = this.state
        const { id } = this.props
        const { isUpload, handleClose, handleClickOpen, submit } = this;
        return (<div>
            <Tooltip title={"Bulk Data upload"} enterDelay={400}
                enterNextDelay={400} placement='top-start'
                classes={{ tooltip: 'tooltip-show-data' }}>
                <img src={excel} alt='excel' width="40" height="40" onClick={handleClickOpen} />
            </Tooltip>
            <Dialog open={open}
                // className={baseClassName}
                // onClose={handleClose}
                 aria-labelledby='form-dialog-title'>
                <DialogTitle id='form-dialog-title'>
                    <DialogContentText>
                        Bdu upload/download
                    </DialogContentText>
                </DialogTitle>
                <Box className={loadingData ? '' : 'display-none'} 
                     style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box ><CircularProgress /></Box>
                </Box>
                <Box >
                    <DialogContent >
                        <Grid container>
                            <Grid item md={12}>
                                <label>Download template</label>
                            </Grid>
                            <Grid item md={4}>
                                <DownloadFile id={id} filetype='xls' />
                            </Grid>
                            <Grid item md={4}>
                                <DownloadFile id={id} filetype='xlsx' />
                            </Grid>
                        </Grid>
                        <Grid container>
                            <Grid item md={12}>
                                <UploadFile
                                    isUpload={isUpload} />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose} color='secondary'>
                            Close
                        </Button>
                        <Button disabled={submitDisable} onClick={submit} color='primary'>
                            Submit
                        </Button>
                    </DialogActions>
                </Box>
            </Dialog>
        </div >
        )
    }
}
export default withRouter(UploadDrawer);
