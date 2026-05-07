import React, { Component } from 'react'
import {
    Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, Grid,
} from '@material-ui/core';
import Swal from 'sweetalert2'

import { putRequest } from 'Includes/api/apicall';
import { PUT_URL } from 'Includes/urls'
import './styles.scss';


export default class LeaderBoard extends Component {

    constructor(props) {
        super(props)

        this.state = {
            open: false,
            currentTab: 'isTeam',
            radio: '',
            fieldValue: { fileId: '' },
        }
    }

    componentDidMount = () => {
        this.handleOpen()
    }

    handleOpen = () => {
        this.setState({
            open: true,
            radio:'ISR'
        })
    }

    handleClose = () => {
        this.setState({
            open: false,
            existingName: ''
        })
    }

    validate = () => {
        let { fieldValue, fieldError, folderDetails } = this.state;
        let test = true
        folderDetails.forEach((field) => {
            let value = fieldValue[field.name];
            let name = field.name;
            if (field.required && (value === '' || value === null || value === 0)) {
                fieldError[name] = `${field.label} is Mandatory`
                test = false
            }
            else if (field.regex && !field.regex.value.test(value) && value !== '') {
                fieldError[name] = field.regex.errorText;
                test = false
            }
        })
        this.setState({
            fieldError
        })
        return test;
    }

    submit = () => {
        const { status, fieldValue, selectedFolderOrFile } = this.state;
        let test = this.validate();
        if (test) {
            this.setState({ submitDisable: true })
            let payload = {
                name: fieldValue['name']
            }
            const { folderId } = this.props;
            let url
            if (status === 'folder') {
                url = PUT_URL.createfolder.api + selectedFolderOrFile + '/'
            }
            else {
                url = PUT_URL.createfile.api + selectedFolderOrFile + '/'
            }
            putRequest(url, payload, this.props).then(response => {
                if (response && response.status === 200) {
                    this.setState({ submitDisable: false })
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
    }


    changeRadio = (e) => {
        const { name, value } = e.target
        let { fieldValue } = this.state
        fieldValue[name] = value
        this.setState({
            fieldValue
        })
    }

    changeTab = (name) => {
        this.setState({
            currentTab: name
        })
    }

    render() {
        const { open, currentTab, submitDisable, fieldValue } = this.state
        return (
            <Box className='end-flex-prop'>
                <Dialog open={open}
                    className='action-basic-detail-width'
                    onClose={this.handleClose} aria-labelledby='form-dialog-title'>
                    <Grid container>
                        <Grid item xs={12} md={6}>
                            <Box
                                className={currentTab === 'isTeam' ? 'leader-board-selected-radio' : 'leader-board'}
                                onClick={() => this.changeTab('isTeam')}>
                                Team
                                    {currentTab === 'isTeam' &&
                                    <Box className='leader-board-selected-radio-underline' />
                                }
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box
                                className={currentTab === 'isIndividual' ? 'leader-board-selected-radio' : 'leader-board'}
                                onClick={() => this.changeTab('isIndividual')}>
                                Individual
                                {currentTab === 'isIndividual' &&
                                    <Box className='leader-board-selected-radio-underline' />
                                }
                            </Box>
                        </Grid>
                    </Grid>
                    <DialogContent>
                        <DialogContentText className='flex-justify-center-flex-prop'>
                            <Box className='radio-space-around'>
                                <label>
                                    <input type='radio' value='ISR' name='radio'
                                        checked={fieldValue['radio'] === 'ISR'}
                                        onChange={this.changeRadio} /> ISR
                                </label>
                                <br />
                                <label>
                                    <input type='radio' value='field' name='radio'
                                        checked={fieldValue['radio'] === 'field'}
                                        onChange={this.changeRadio} /> Field
                                </label>
                            </Box>
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button disabled={submitDisable} onClick={() => this.handleClose()} color='secondary'>
                            Cancel
                        </Button>
                        <Button texttransform='none' disabled={submitDisable} onClick={() => this.submit()} color='primary'>
                            update
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        )
    }
}
