import React from 'react';
import { IconButton, Menu, MenuItem, Button, TextField, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import MoreHorizIcon from '@material-ui/icons/MoreHoriz';
import Swal from 'sweetalert2'

import { putRequest } from 'Includes/api/apicall';
import { PUT_URL } from 'Includes/urls'


const ITEM_HEIGHT = 35;

export default function LeaveActions(props) {


    const { id, name, code, deleteType, updateType, label } = props;
    const [open, setOpen] = React.useState(false);
    const [nameTemp, setleaveName] = React.useState(name)
    const [codeTemp, setLeaveCode] = React.useState(code)
    const [leaveError, setleaveError] = React.useState("")
    const [codeError, setCodeError] = React.useState("")
    const [anchorEl, setAnchorEl] = React.useState(null);
    const openMenu = Boolean(anchorEl);
    const [updateDisable, setUpdateDisable] = React.useState(false)

    const handleClickOpen = () => {
        setleaveName(name);
        setLeaveCode(code);
        setOpen(true);
        handleCloseMenu()
    };



    const handleClose = () => {
        setOpen(false);
    };

    const update = async () => {
        setUpdateDisable(true)
        if (nameTemp === "") {
            setleaveError("Can't be empty")
        }
        else if (codeTemp === "") {
            setCodeError("Code can't be empty")
        }
        if (nameTemp !== "" && codeTemp !== "" && leaveError === "") {
            setUpdateDisable(false);
            setOpen(false);
            handleCloseMenu();
            updateType(id, nameTemp, codeTemp);
        }
    }

    const onchange = (e) => {

        setleaveName(e.target.value)
        var regex = /^[a-zA-Z ]{0,500}$/;
        let test = regex.test(e.target.value);


        if (e.target.value === "") {
            setleaveError("Can't be empty")
        }
        else if (!test) {
            setleaveError("Special case not allowed")
        }
        else {
            setleaveError("")
        }

    }


    const handleClick = event => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };


    const handleDeleteAndClose = () => {

        deleteType(id, name);
        handleCloseMenu();

    }

    return (
        <div>
            <IconButton
                aria-label="more"
                aria-controls="long-menu"
                aria-haspopup="true"
                onClick={handleClick}
            >
                <MoreHorizIcon />
            </IconButton>
            <Menu
                id="long-menu"
                anchorEl={anchorEl}
                keepMounted
                open={openMenu}
                onClose={handleCloseMenu}
                PaperProps={{
                    style: {
                        maxHeight: ITEM_HEIGHT * 4.5,
                        width: 100,
                    },
                }}
            >
                <MenuItem onClick={handleClickOpen}>
                    Edit
          </MenuItem>

                <MenuItem onClick={handleDeleteAndClose}>
                    Delete
          </MenuItem>

            </Menu>
            <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title"></DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please enter {label}
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label={`Update ${label} Name`}
                        type="name"
                        value={nameTemp}
                        onChange={onchange}
                        helperText={leaveError !== "" && leaveError}
                        error={leaveError !== "" && true}
                        fullWidth
                    />
                    {code &&

                        <TextField

                            margin="dense"
                            id="name"
                            label={`Update ${label} Code`}
                            type="name"
                            value={codeTemp}
                            onChange={(e) => {
                                if (e.target.value !== "") {
                                    setCodeError("")
                                }
                                setLeaveCode(e.target.value)
                            }}
                            helperText={codeError !== "" && codeError}
                            error={codeError !== "" && true}
                            fullWidth
                        />
                    }

                </DialogContent>
                <DialogActions>
                    <Button disabled={updateDisable} onClick={update} color="primary">
                        Update
  </Button>
                    <Button onClick={handleClose} color="primary">
                        Close
     </Button>

                </DialogActions>
            </Dialog>
        </div>
    );
}