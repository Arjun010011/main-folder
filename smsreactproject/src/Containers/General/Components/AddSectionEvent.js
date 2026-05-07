import React, { Component } from 'react'
import { Grid, Button, Dialog, DialogActions, DialogContent,  DialogTitle, Paper,  } from '@material-ui/core/';

export default class AddSectionEvent extends Component {
    constructor(props) {
        super(props)

        this.state = {
            open: false
        }
    }

    handleClose = () => {
        this.setState({ open: false })
    }

    render() {
        const { open } = this.state
        return (
            <div>
                <Paper>
                    <Dialog open={open} onClose={this.handleClose} aria-labelledby="form-dialog-title">
                        <DialogTitle id="form-dialog-title"></DialogTitle>
                        <DialogContent>

                            Hiii
                </DialogContent>
                        <DialogActions>
                            <Button onClick={this.handleClose} color="primary">
                                Apply
                    </Button>
                            <Button onClick={this.handleClose} color="primary">
                                Close
                    </Button>
                        </DialogActions>
                    </Dialog>
                </Paper>
            </div>
        )
    }
}
