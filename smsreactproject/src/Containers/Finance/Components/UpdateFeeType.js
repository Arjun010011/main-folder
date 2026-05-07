import React from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Box from '@material-ui/core/Box'
import Fab from '@material-ui/core/Fab';
import EditIcon from '@material-ui/icons/Edit';
import put from '../../../actions/API_request/put'
export default function UpdateFeeType(props) {
    const [open, setOpen] = React.useState(false);
    const { id, name, updateType, index } = props;
    const [feeType, setFeeType] = React.useState(name)
    const [error, setError] = React.useState("")
    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const update = async () => {
        if (feeType === "") {
            setError("Can't be empty")
        }
        if (error === "") {
           
            let payload = {
                name: feeType
            }
            let result = await put('finance/addfeetypes', id, payload)
         
            if (result.Result) {
                updateType(index, feeType)
                setOpen(false);

            }
            else
            setError("Error From Backend")
                


        }
    }

    const onchange = (e) => {

        setFeeType(e.target.value)
        var regex = /^[a-zA-Z ]{0,500}$/;
        let test = regex.test(e.target.value);
       

        if (e.target.value === "") {
            setError("Can't be empty")
        }
        else if (!test) {
            setError("Special case not allowed")
        }
        else {
            setError("")
        }

    }

    return (
        <div>
            <Box >

                <Fab color="primary" aria-label="add" onClick={handleClickOpen}>
                    <EditIcon />
                </Fab>
            </Box>
            <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title">{name}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please enter unique FeetypeName
          </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label="Update FeeType"
                        type="name"
                        value={feeType}
                        onChange={onchange}
                        helperText={error === "" ? "" : error}
                        error={error === "" ? false : true}
                        fullWidth
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={update} color="primary">
                        Update
          </Button>

                </DialogActions>
            </Dialog>
        </div>
    );
}